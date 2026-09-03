import { createSupabaseServerClient } from "@/db/supabase/server";
import * as areaRepository from "@/db/repositories/area-repository";
import * as rideRepository from "@/db/repositories/ride-repository";
import * as requestRepository from "@/db/repositories/ride-request-repository";
import { DuplicateActiveRequestError } from "@/db/repositories/ride-request-repository";
import * as contactProjection from "@/lib/contact-projection";
import * as profileService from "@/services/profile-service";
import { requireUser } from "@/lib/auth-context";
import { fail, ok, type Result } from "@/lib/result";
import { canAccept, canReject, canWithdraw, displayStatus } from "@/lib/request-transitions";
import { isFuture } from "@/lib/ride-derivations";
import type { MyRequestView, RideRequest, RideRequestView } from "@/lib/types";

/**
 * C9 RideRequestService - the seat request lifecycle.
 *
 * There is deliberately NO `cancelRequestsForRide` method (BR-3.22). FR-38's cascade is owned
 * by the `rides_cancel_cascade` trigger, which cannot be forgotten by a future code path.
 */

/**
 * Request a seat (FR-22, Flow 1).
 *
 * Six preconditions, in order - cheapest and most informative first, so a passenger is told the
 * most useful thing (BR-3.1).
 *
 * BR-3.2: exactly one seat per request - there is no quantity to pass.
 * BR-3.3: no message field - there is no text to pass either.
 * BR-3.5 / US-16: nothing here limits a passenger to one ride. The uniqueness rule is scoped
 * per ride, so pending requests on several different rides are permitted, same date included.
 * BR-3.6: accepting one of them does NOT withdraw the others - explicitly out of scope under
 * Q11=A. A passenger accepted on two rides for one date is expected to withdraw the surplus.
 */
export async function requestSeat(rideId: string): Promise<Result<RideRequest>> {
  // 1. Signed in
  const auth = await requireUser();
  if (!auth.ok) return auth;

  // 2. Profile complete. This is the SECOND and final gate call site; BR-1.10 permits exactly
  //    two, and Unit 2's ride creation used the first. There will be no third.
  const gate = await profileService.assertCanAct();
  if (!gate.ok) return gate;

  const supabase = await createSupabaseServerClient();

  // 3. Ride exists, is active, and has not departed
  const ride = await rideRepository.findById(supabase, rideId);
  if (!ride || ride.status !== "active") {
    return fail("NOT_FOUND", "That ride is no longer available.");
  }
  if (!isFuture(ride.departsAt, new Date().toISOString())) {
    return fail("NOT_FOUND", "That ride has already left.");
  }

  // 4. Not your own ride (BR-3.4, FR-24, story US-15). Enforced HERE, not just in the UI -
  //    Unit 2's own-ride marker only suppresses the button. This refuses a request posted
  //    directly to the server, which is what US-15's second criterion requires.
  if (ride.driverId === auth.value.id) {
    return fail("SELF_REQUEST", "That is your own ride.");
  }

  // 5. No active request already (BR-3.7). Advisory: the partial unique index is the real guard,
  //    and it catches the race this check cannot.
  const existing = await requestRepository.findActiveByRideAndPassenger(
    supabase,
    rideId,
    auth.value.id,
  );
  if (existing) {
    return fail("DUPLICATE_REQUEST", "You have already asked to join this ride.");
  }

  // 6. A seat is free. A COURTESY, not the guarantee - it stops a passenger being invited to
  //    ask for a full ride. Nothing about this check needs to be race-free, because a request
  //    is not an acceptance. The guarantee lives in acceptRequest.
  const counts = await rideRepository.countAcceptedByRideIds(supabase, [rideId]);
  if ((counts.get(rideId) ?? 0) >= ride.seats) {
    return fail("RIDE_FULL", "That ride is full.");
  }

  try {
    return ok(await requestRepository.create(supabase, rideId, auth.value.id));
  } catch (error) {
    if (error instanceof DuplicateActiveRequestError) {
      return fail("DUPLICATE_REQUEST", "You have already asked to join this ride.");
    }
    throw error;
  }
}

/**
 * Accept a request (FR-28, FR-31 to FR-33, Flow 2) - the correctness-critical path.
 *
 * **This function performs no capacity check of its own** (BR-3.10). It calls the guarded
 * operation and surfaces the outcome. Adding a check here would recreate the read-then-write
 * window FR-33 rejects, and would make it ambiguous which check is authoritative.
 */
export async function acceptRequest(requestId: string): Promise<Result<RideRequest>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const request = await requestRepository.findById(supabase, requestId);
  if (!request) return fail("NOT_FOUND", "That request no longer exists.");

  const ride = await rideRepository.findById(supabase, request.rideId);
  if (!ride) return fail("NOT_FOUND", "That ride no longer exists.");

  // BR-3.13. Also enforced by `ride_requests_update_as_driver` and, inside the function, by the
  // row lock requiring the ride's UPDATE policy to pass. Three layers, deliberately.
  if (ride.driverId !== auth.value.id) {
    return fail("NOT_PERMITTED", "You can only answer requests on your own rides.");
  }
  if (!canAccept(request.status)) {
    return fail("INVALID_STATE", "That request has already been answered.");
  }

  // THE GUARANTEE. Everything above is a read-then-act check - fine for a ride's driver, which
  // does not change, but not for the seat count, which every other acceptance mutates.
  const outcome = await requestRepository.acceptWithCapacityGuarantee(supabase, requestId);

  switch (outcome) {
    case "OK":
      break;
    case "RIDE_FULL":
      return fail("RIDE_FULL", "This ride is now full - the last seat has just gone.");
    case "INVALID_STATE":
      return fail("INVALID_STATE", "That request has already been answered.");
    case "NOT_FOUND":
      return fail("NOT_FOUND", "That request no longer exists.");
  }

  const accepted = await requestRepository.findById(supabase, requestId);
  if (!accepted) return fail("NOT_FOUND", "That request no longer exists.");

  // Note what does NOT happen here: no contact details are copied anywhere (BR-3.25). The status
  // changed, and `profiles_select_accepted_counterparty` now permits a row it previously
  // refused. Disclosure follows state.
  return ok(accepted);
}

/**
 * Reject a request (FR-28, Flow 3). Consumes no seat, so no capacity interaction.
 *
 * BR-3.16: no reason is recorded and nothing is sent. The passenger sees the status when they
 * next open the app (FR-42), which is why RequestStatusBadge distinguishes "declined by the
 * driver" from "ride left before this was answered".
 */
export async function rejectRequest(requestId: string): Promise<Result<RideRequest>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const request = await requestRepository.findById(supabase, requestId);
  if (!request) return fail("NOT_FOUND", "That request no longer exists.");

  const ride = await rideRepository.findById(supabase, request.rideId);
  if (!ride) return fail("NOT_FOUND", "That ride no longer exists.");
  if (ride.driverId !== auth.value.id) {
    return fail("NOT_PERMITTED", "You can only answer requests on your own rides.");
  }
  if (!canReject(request.status)) {
    return fail("INVALID_STATE", "That request has already been answered.");
  }

  const rejected = await requestRepository.markRejected(supabase, requestId);
  if (!rejected) return fail("INVALID_STATE", "That request has already been answered.");
  return ok(rejected);
}

/**
 * Withdraw a request (FR-29, Flow 4).
 *
 * Note the ownership check is on the REQUEST, not the ride - the opposite of accept and reject.
 * Confusing the two would let a driver withdraw a passenger's request, or a passenger answer
 * their own, which is why each flow states its own check rather than sharing one.
 */
export async function withdrawRequest(requestId: string): Promise<Result<RideRequest>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const request = await requestRepository.findById(supabase, requestId);
  if (!request) return fail("NOT_FOUND", "That request no longer exists.");

  if (request.passengerId !== auth.value.id) {
    return fail("NOT_PERMITTED", "You can only withdraw your own request.");
  }
  if (!canWithdraw(request.status)) {
    return fail("INVALID_STATE", "That request can no longer be withdrawn.");
  }

  // Withdrawing an accepted request frees the seat instantly, with no counter to adjust:
  // seats remaining is derived from the accepted count (Unit 2's FQ2=A).
  const withdrawn = await requestRepository.markWithdrawn(supabase, requestId);
  if (!withdrawn) return fail("INVALID_STATE", "That request can no longer be withdrawn.");
  return ok(withdrawn);
}

/** Build the driver-facing view of a set of requests (Flow 8). */
async function toRequestViews(
  requests: RideRequest[],
  rideDepartsAt: string,
): Promise<RideRequestView[]> {
  if (requests.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  // Pending requesters: the PUBLIC path only. A driver reviewing requests sees name and pickup
  // area, and cannot see a phone number - the view has no such column (FR-27, BR-3.26).
  const requesters = await contactProjection.listPublicProfiles(
    supabase,
    requests.map((r) => r.passengerId),
  );

  // Accepted requesters additionally get the contact path. The RLS policy decides whether each
  // row comes back; this code does not re-check acceptance (BR-3.24).
  const acceptedIds = requests.filter((r) => r.status === "accepted").map((r) => r.passengerId);
  const contacts = await contactProjection.listAcceptedContacts(supabase, acceptedIds);

  return requests.map((request) => ({
    request,
    displayStatus: displayStatus(request.status, rideDepartsAt, nowIso),
    requester: requesters.get(request.passengerId) ?? null,
    contact:
      request.status === "accepted" ? (contacts.get(request.passengerId) ?? null) : null,
  }));
}

/** Requests on one of the caller's rides (FR-27, FR-39). */
export async function listRequestsForMyRide(
  rideId: string,
): Promise<Result<RideRequestView[]>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const ride = await rideRepository.findById(supabase, rideId);
  if (!ride) return fail("NOT_FOUND", "That ride no longer exists.");
  if (ride.driverId !== auth.value.id) {
    return fail("NOT_PERMITTED", "You can only see requests on your own rides.");
  }

  const requests = await requestRepository.listByRide(supabase, rideId);
  return ok(await toRequestViews(requests, ride.departsAt));
}

/**
 * Requests for several of the caller's rides at once, so My Rides renders in one pass.
 *
 * Completes US-25, partially satisfied since Unit 2.
 */
export async function listRequestsForRideIds(
  rides: { id: string; departsAt: string; driverId: string }[],
): Promise<Result<Map<string, RideRequestView[]>>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const mine = rides.filter((r) => r.driverId === auth.value.id);
  if (mine.length === 0) return ok(new Map());

  const supabase = await createSupabaseServerClient();
  const grouped = await requestRepository.listByRideIds(
    supabase,
    mine.map((r) => r.id),
  );

  const views = new Map<string, RideRequestView[]>();
  for (const ride of mine) {
    views.set(ride.id, await toRequestViews(grouped.get(ride.id) ?? [], ride.departsAt));
  }
  return ok(views);
}

/** My Requests (FR-40, FR-41, Flow 9). */
export async function listMyRequests(): Promise<Result<MyRequestView[]>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const [rows, areas] = await Promise.all([
    requestRepository.listUpcomingByPassenger(supabase, auth.value.id, nowIso),
    areaRepository.listAll(supabase),
  ]);
  if (rows.length === 0) return ok([]);

  const areaNames = new Map(areas.map((a) => [a.id, a.name]));

  const drivers = await contactProjection.listPublicProfiles(
    supabase,
    rows.map((r) => r.ride.driverId),
  );
  const acceptedDriverIds = rows
    .filter((r) => r.request.status === "accepted")
    .map((r) => r.ride.driverId);
  const contacts = await contactProjection.listAcceptedContacts(supabase, acceptedDriverIds);

  return ok(
    rows.map(({ request, ride }) => ({
      request,
      displayStatus: displayStatus(request.status, ride.departsAt, nowIso),
      ride,
      originName: areaNames.get(ride.originAreaId) ?? "Unknown area",
      destinationName: areaNames.get(ride.destinationAreaId) ?? "Unknown area",
      driver: drivers.get(ride.driverId) ?? null,
      contact:
        request.status === "accepted" ? (contacts.get(ride.driverId) ?? null) : null,
    })),
  );
}
