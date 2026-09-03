import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ride, RideStatus } from "@/lib/types";

/**
 * C3 RideRepository - data access for rides.
 *
 * Applies no business rules and no projection. Every listing method applies the two predicates
 * BR-2.14 requires - `status = active` and `departs_at > now` - because "upcoming" is a
 * query-time predicate (BR-2.13, assumption A-5) and no scheduled job exists to maintain it.
 *
 * BR-2.17 (FR-10): areas are compared by id equality only. There is no name search, no
 * partial match and no case-insensitive comparison anywhere in this file - which is what
 * choosing a seeded area list (Q8=A) bought.
 *
 * US-10: past rides are excluded here rather than deleted (BR-2.15). Retention is what lets
 * Unit 3 derive EXPIRED for requests against departed rides (FR-37).
 */

interface RideRow {
  id: string;
  driver_id: string;
  origin_area_id: string;
  destination_area_id: string;
  departs_at: string;
  seats: number;
  note: string | null;
  status: RideStatus;
}

const COLUMNS =
  "id, driver_id, origin_area_id, destination_area_id, departs_at, seats, note, status";

function toRide(row: RideRow): Ride {
  return {
    id: row.id,
    driverId: row.driver_id,
    originAreaId: row.origin_area_id,
    destinationAreaId: row.destination_area_id,
    departsAt: row.departs_at,
    seats: row.seats,
    note: row.note,
    status: row.status,
  };
}

export interface CreateRideInput {
  driverId: string;
  originAreaId: string;
  destinationAreaId: string;
  departsAt: string;
  seats: number;
  note: string | null;
}

/**
 * Insert a ride (FR-12).
 *
 * `driverId` comes from the caller's session, never from a form field - see BR-2.5 and the
 * `rides_insert_own` policy, which independently rejects any other value.
 */
export async function create(db: SupabaseClient, input: CreateRideInput): Promise<Ride> {
  const { data, error } = await db
    .from("rides")
    .insert({
      driver_id: input.driverId,
      origin_area_id: input.originAreaId,
      destination_area_id: input.destinationAreaId,
      departs_at: input.departsAt,
      seats: input.seats,
      note: input.note,
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(`rideRepository.create failed: ${error.message}`);
  return toRide(data as RideRow);
}

export async function findById(db: SupabaseClient, id: string): Promise<Ride | null> {
  const { data, error } = await db.from("rides").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`rideRepository.findById failed: ${error.message}`);
  return data ? toRide(data as RideRow) : null;
}

/**
 * Cancel a ride (FR-16, BR-2.9).
 *
 * The only update this repository performs. There is no method that changes any other field,
 * because FR-15 forbids editing a published ride - the absence is the enforcement.
 */
export async function markCancelled(db: SupabaseClient, id: string): Promise<Ride> {
  const { data, error } = await db
    .from("rides")
    .update({ status: "cancelled" satisfies RideStatus })
    .eq("id", id)
    .select(COLUMNS)
    .single();

  if (error) throw new Error(`rideRepository.markCancelled failed: ${error.message}`);
  return toRide(data as RideRow);
}

export interface SearchParams {
  /** Inclusive start of the departure day, ISO. */
  from: string;
  /** Exclusive end of the departure day, ISO. */
  to: string;
  originAreaId: string;
  destinationAreaId: string;
  /** Now, so a ride earlier today is excluded (BR-2.14). */
  nowIso: string;
}

/**
 * Ride discovery (FR-18, FR-21).
 *
 * The day is expressed as a half-open range rather than a `departs_at::date = $1` predicate,
 * because a cast on the column would defeat `rides_search_idx`.
 */
export async function searchUpcoming(
  db: SupabaseClient,
  params: SearchParams,
): Promise<Ride[]> {
  const { data, error } = await db
    .from("rides")
    .select(COLUMNS)
    .eq("status", "active")
    .eq("origin_area_id", params.originAreaId)
    .eq("destination_area_id", params.destinationAreaId)
    .gte("departs_at", params.from)
    .lt("departs_at", params.to)
    .gt("departs_at", params.nowIso)
    .order("departs_at", { ascending: true });

  if (error) throw new Error(`rideRepository.searchUpcoming failed: ${error.message}`);
  return (data as RideRow[]).map(toRide);
}

/** My Rides (FR-39, FR-41). */
export async function listUpcomingByDriver(
  db: SupabaseClient,
  driverId: string,
  nowIso: string,
): Promise<Ride[]> {
  const { data, error } = await db
    .from("rides")
    .select(COLUMNS)
    .eq("driver_id", driverId)
    .eq("status", "active")
    .gt("departs_at", nowIso)
    .order("departs_at", { ascending: true });

  if (error) throw new Error(`rideRepository.listUpcomingByDriver failed: ${error.message}`);
  return (data as RideRow[]).map(toRide);
}

/**
 * Accepted request counts per ride, for the seats-remaining derivation (FR-19, FQ2=A).
 *
 * Unit 2 built this as a SEAM returning zero, because `ride_requests` did not exist yet. Unit 3
 * has now replaced the body with a real count - and because every caller already routed through
 * this one function, seats remaining became real across search, My Rides and the capacity
 * guarantee at once, with no call site changed.
 *
 * The number returned here is the same count of the same rows that
 * `accept_ride_request` constrains, so the figure shown to a user and the figure the database
 * enforces cannot disagree.
 *
 * Counted in application code rather than with a grouped SQL aggregate: at NFR-4's scale
 * (under 50 employees) the row set is tiny, and it avoids a second database function for
 * something this simple.
 */
export async function countAcceptedByRideIds(
  db: SupabaseClient,
  rideIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(rideIds.map((id) => [id, 0]));
  if (rideIds.length === 0) return counts;

  const { data, error } = await db
    .from("ride_requests")
    .select("ride_id")
    .in("ride_id", rideIds)
    .eq("status", "accepted");

  if (error) {
    throw new Error(`rideRepository.countAcceptedByRideIds failed: ${error.message}`);
  }

  for (const row of data as { ride_id: string }[]) {
    counts.set(row.ride_id, (counts.get(row.ride_id) ?? 0) + 1);
  }
  return counts;
}
