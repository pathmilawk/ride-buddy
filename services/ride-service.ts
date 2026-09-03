import { createSupabaseServerClient } from "@/db/supabase/server";
import * as areaRepository from "@/db/repositories/area-repository";
import * as rideRepository from "@/db/repositories/ride-repository";
import * as contactProjection from "@/lib/contact-projection";
import * as requestRepository from "@/db/repositories/ride-request-repository";
import { displayStatus } from "@/lib/request-transitions";
import * as profileService from "@/services/profile-service";
import { requireUser } from "@/lib/auth-context";
import { fail, ok, type Result } from "@/lib/result";
import type { RideCreateInput } from "@/lib/schemas";
import {
  combineDateAndTime,
  dayRange,
  isFull,
  isFuture,
  isOwnRide,
  seatsRemaining,
} from "@/lib/ride-derivations";
import type { Area, Ride, RideListItem, RideSearchCriteria } from "@/lib/types";

/**
 * C8 RideService - ride offering and discovery.
 *
 * There is deliberately NO `updateRide` method. FR-15 forbids editing a published ride, and
 * the absence of the operation is the enforcement - no permission check is needed for a
 * capability that does not exist (BR-2.8).
 */

/** Build the derived fields a listing needs, resolving names and the driver's public profile. */
async function toListItems(
  rides: Ride[],
  viewerId: string,
  areas: Area[],
): Promise<RideListItem[]> {
  if (rides.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const areaNames = new Map(areas.map((a) => [a.id, a.name]));

  const acceptedCounts = await rideRepository.countAcceptedByRideIds(
    supabase,
    rides.map((r) => r.id),
  );

  // Every driver resolved in ONE read, through C10's view. Batch-shaped so the disclosure
  // decision is made once for the whole set rather than per row (BR-2.24).
  const drivers = await contactProjection.listPublicProfiles(
    supabase,
    rides.map((r) => r.driverId),
  );

  // Unit 3: the viewer's own request per ride, so a listing can show "you have already asked"
  // rather than a button that would be refused with DUPLICATE_REQUEST (BR-3.7).
  const myRequests = await requestRepository.listByRideIdsForPassenger(
    supabase,
    rides.map((r) => r.id),
    viewerId,
  );

  // Contact details only where the viewer's own request is ACCEPTED (FR-30). The RLS policy
  // decides whether each row comes back; this code does not re-check acceptance (BR-3.24).
  const acceptedDriverIds = rides
    .filter((r) => myRequests.get(r.id)?.status === "accepted")
    .map((r) => r.driverId);
  const driverContacts = await contactProjection.listAcceptedContacts(supabase, acceptedDriverIds);

  const nowIso = new Date().toISOString();

  return rides.map((ride) => {
    const accepted = acceptedCounts.get(ride.id) ?? 0;
    const mine = myRequests.get(ride.id) ?? null;
    return {
      ride,
      seatsRemaining: seatsRemaining(ride.seats, accepted),
      isFull: isFull(ride.seats, accepted),
      isOwnRide: isOwnRide(ride, viewerId),
      driver: drivers.get(ride.driverId) ?? null,
      originName: areaNames.get(ride.originAreaId) ?? "Unknown area",
      destinationName: areaNames.get(ride.destinationAreaId) ?? "Unknown area",
      myRequest: mine
        ? {
            id: mine.id,
            status: mine.status,
            displayStatus: displayStatus(mine.status, ride.departsAt, nowIso),
          }
        : null,
      driverContact:
        mine?.status === "accepted" ? (driverContacts.get(ride.driverId) ?? null) : null,
    };
  });
}

/**
 * Publish a ride (FR-12, Flow 1).
 *
 * The completeness gate is checked before anything is written (BR-2.1) - the first of the two
 * call sites BR-1.10 permits, and the first point at which US-04 becomes visible to a user.
 */
export async function createRide(input: RideCreateInput): Promise<Result<Ride>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  // BR-2.1: refuse before writing, and propagate PROFILE_INCOMPLETE with its field list so
  // the action can redirect to the profile page naming what is missing (BR-1.11).
  const gate = await profileService.assertCanAct();
  if (!gate.ok) return gate;

  const departsAt = combineDateAndTime(input.date, input.time);
  if (!departsAt) {
    return fail("VALIDATION_FAILED", "That date and time could not be understood.");
  }

  // BR-2.2: departure must be in the future. Checked here rather than in the schema because
  // it depends on the current instant.
  if (!isFuture(departsAt, new Date().toISOString())) {
    return fail("VALIDATION_FAILED", "Pick a departure time in the future.", {
      time: "Must be in the future",
    });
  }

  const supabase = await createSupabaseServerClient();
  const [origin, destination] = await Promise.all([
    areaRepository.findById(supabase, input.originAreaId),
    areaRepository.findById(supabase, input.destinationAreaId),
  ]);
  if (!origin || !destination) {
    return fail("NOT_FOUND", "One of those areas no longer exists. Pick again.");
  }

  // BR-2.4 / FQ4=B: origin may equal destination. No check, deliberately.

  // BR-2.5: driver_id comes from the session, never from the form, which is what makes ride
  // ownership unforgeable. The rides_insert_own policy rejects any other value independently.
  const ride = await rideRepository.create(supabase, {
    driverId: auth.value.id,
    originAreaId: input.originAreaId,
    destinationAreaId: input.destinationAreaId,
    departsAt,
    seats: input.seats,
    note: input.note,
  });

  return ok(ride);
}

/**
 * Cancel a ride (FR-16, US-09, Flow 2).
 *
 * BR-2.11: cancellation is terminal. A cancelled ride cannot be reactivated - there is no
 * method that moves `status` back to 'active'. The driver creates a new ride instead, which
 * together with FR-15's ban on editing makes cancel-and-recreate the only correction path.
 *
 * The ownership check here is not redundant with the `rides_update_own` policy that also
 * enforces it - that duplication is NFR-1's defence in depth (BR-2.32).
 */
export async function cancelRide(rideId: string): Promise<Result<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const ride = await rideRepository.findById(supabase, rideId);
  if (!ride) return fail("NOT_FOUND", "That ride no longer exists.");

  if (ride.driverId !== auth.value.id) {
    return fail("NOT_PERMITTED", "You can only cancel a ride you created.");
  }
  if (ride.status === "cancelled") {
    return ok(null); // Idempotent - cancelling twice is not an error worth surfacing.
  }

  await rideRepository.markCancelled(supabase, rideId);

  // -------------------------------------------------------------------------
  // THE FR-38 CASCADE HAPPENS HERE - in a database trigger, not in this function
  // -------------------------------------------------------------------------
  // The `markCancelled` update above fires `rides_cancel_cascade`
  // (supabase/migrations/0008_cancel_ride_cascade_trigger.sql), which moves EVERY non-terminal
  // request on this ride to `cancelled`. So no passenger is left believing they hold a seat
  // (FR-38, BR-3.20), and their contact access closes automatically because
  // `profiles_select_accepted_counterparty` stops matching.
  //
  // This comment is REQUIRED, not decorative (BR-3.21). Unit 2 left an insertion point here
  // expecting a service call; Unit 3 chose a trigger instead, because a trigger cannot be
  // forgotten by a future code path and makes the two writes atomic for free. The cost of a
  // trigger is that it is invisible at the call site - so a reader of this function would
  // otherwise conclude the cascade was never implemented.
  //
  // Do NOT add a `cancelRequestsForRide` call here. It would double-cancel: harmless, but it
  // would obscure which mechanism actually owns the rule (BR-3.22).
  // -------------------------------------------------------------------------

  return ok(null);
}

/** Ride discovery (FR-18, Flow 3). */
export async function searchRides(
  criteria: RideSearchCriteria,
): Promise<Result<RideListItem[]>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const range = dayRange(criteria.date);
  if (!range) return fail("VALIDATION_FAILED", "That date could not be understood.");

  const supabase = await createSupabaseServerClient();
  const [rides, areas] = await Promise.all([
    rideRepository.searchUpcoming(supabase, {
      from: range.from,
      to: range.to,
      originAreaId: criteria.originAreaId,
      destinationAreaId: criteria.destinationAreaId,
      nowIso: new Date().toISOString(),
    }),
    areaRepository.listAll(supabase),
  ]);

  return ok(await toListItems(rides, auth.value.id, areas));
}

/** My Rides (FR-39, FR-41, Flow 5). */
export async function listMyRides(): Promise<Result<RideListItem[]>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const [rides, areas] = await Promise.all([
    rideRepository.listUpcomingByDriver(supabase, auth.value.id, new Date().toISOString()),
    areaRepository.listAll(supabase),
  ]);

  return ok(await toListItems(rides, auth.value.id, areas));
}

/** One ride, with everything a listing shows. Used where a single ride is displayed. */
export async function getRideForViewer(rideId: string): Promise<Result<RideListItem>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const ride = await rideRepository.findById(supabase, rideId);
  if (!ride) return fail("NOT_FOUND", "That ride no longer exists.");

  const areas = await areaRepository.listAll(supabase);
  const [item] = await toListItems([ride], auth.value.id, areas);
  return ok(item);
}
