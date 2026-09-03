import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestStatus, Ride, RideRequest } from "@/lib/types";

/**
 * C4 RideRequestRepository - data access for seat requests.
 *
 * Contains the single most important operation in the system,
 * `acceptWithCapacityGuarantee`, and no business rules beyond it.
 */

interface RideRequestRow {
  id: string;
  ride_id: string;
  passenger_id: string;
  status: RequestStatus;
  created_at: string;
  decided_at: string | null;
}

const COLUMNS = "id, ride_id, passenger_id, status, created_at, decided_at";

function toRequest(row: RideRequestRow): RideRequest {
  return {
    id: row.id,
    rideId: row.ride_id,
    passengerId: row.passenger_id,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

export async function create(
  db: SupabaseClient,
  rideId: string,
  passengerId: string,
): Promise<RideRequest> {
  const { data, error } = await db
    .from("ride_requests")
    .insert({ ride_id: rideId, passenger_id: passengerId })
    .select(COLUMNS)
    .single();

  if (error) {
    // BR-3.7: the partial unique index is the real guard against a duplicate active request.
    // Two simultaneous requests from one passenger both pass the service's check, and the
    // second insert lands here. Translated to a business outcome rather than thrown, because
    // it is an expected race, not a fault. 23505 is unique_violation.
    if (error.code === "23505") {
      throw new DuplicateActiveRequestError();
    }
    throw new Error(`rideRequestRepository.create failed: ${error.message}`);
  }
  return toRequest(data as RideRequestRow);
}

/** Signals the partial unique index firing, so the service can return DUPLICATE_REQUEST. */
export class DuplicateActiveRequestError extends Error {
  constructor() {
    super("An active request already exists for this passenger on this ride");
    this.name = "DuplicateActiveRequestError";
  }
}

export async function findById(
  db: SupabaseClient,
  id: string,
): Promise<RideRequest | null> {
  const { data, error } = await db
    .from("ride_requests")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`rideRequestRepository.findById failed: ${error.message}`);
  return data ? toRequest(data as RideRequestRow) : null;
}

/** BR-3.7 - the service's advisory duplicate check. The index is the actual guard. */
export async function findActiveByRideAndPassenger(
  db: SupabaseClient,
  rideId: string,
  passengerId: string,
): Promise<RideRequest | null> {
  const { data, error } = await db
    .from("ride_requests")
    .select(COLUMNS)
    .eq("ride_id", rideId)
    .eq("passenger_id", passengerId)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (error) {
    throw new Error(`rideRequestRepository.findActiveByRideAndPassenger failed: ${error.message}`);
  }
  return data ? toRequest(data as RideRequestRow) : null;
}

/** Outcomes the capacity function can return. Mirrors 0007_accept_request_function.sql. */
export type AcceptOutcome = "OK" | "RIDE_FULL" | "INVALID_STATE" | "NOT_FOUND";

/**
 * THE CAPACITY GUARANTEE (FR-31 to FR-33, US-22, BR-3.9).
 *
 * Delegates to the `accept_ride_request` database function, which locks the ride row before
 * counting and writing, so concurrent acceptances on one ride serialise.
 *
 * **This is the ONLY path in the entire codebase that sets a request to `accepted`** (BR-3.11).
 * That is what makes the guarantee a property of the system rather than a discipline - there is
 * no other write to bypass it with.
 *
 * Do not add a capacity check in the caller. FR-33 rules out application-layer checking, and a
 * second check would make it ambiguous which one is authoritative (BR-3.10).
 */
export async function acceptWithCapacityGuarantee(
  db: SupabaseClient,
  requestId: string,
): Promise<AcceptOutcome> {
  const { data, error } = await db.rpc("accept_ride_request", { p_request_id: requestId });

  if (error) {
    throw new Error(`rideRequestRepository.acceptWithCapacityGuarantee failed: ${error.message}`);
  }
  return data as AcceptOutcome;
}

async function transition(
  db: SupabaseClient,
  id: string,
  to: Exclude<RequestStatus, "pending" | "accepted">,
  from: RequestStatus[],
): Promise<RideRequest | null> {
  const { data, error } = await db
    .from("ride_requests")
    .update({ status: to, decided_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", from)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw new Error(`rideRequestRepository.transition to ${to} failed: ${error.message}`);
  // Null means the row was not in an allowed source status - the caller reports INVALID_STATE.
  return data ? toRequest(data as RideRequestRow) : null;
}

/** BR-3.14 - pending only. */
export async function markRejected(db: SupabaseClient, id: string) {
  return transition(db, id, "rejected", ["pending"]);
}

/** BR-3.12 - pending or accepted. Withdrawing an accepted request frees the seat automatically,
 *  because seats remaining is derived from the accepted count (Unit 2's FQ2=A). */
export async function markWithdrawn(db: SupabaseClient, id: string) {
  return transition(db, id, "withdrawn", ["pending", "accepted"]);
}

/**
 * NOTE: there is deliberately NO `cancelAllForRide` method (BR-3.22).
 *
 * application-design/component-methods.md listed one, but FR-38's cascade is owned by the
 * `rides_cancel_cascade` trigger in 0008_cancel_ride_cascade_trigger.sql. A trigger cannot be
 * forgotten by a future code path; a method can. Adding one here as well would double-cancel -
 * harmlessly, but confusingly.
 */

export async function listByRide(db: SupabaseClient, rideId: string): Promise<RideRequest[]> {
  const { data, error } = await db
    .from("ride_requests")
    .select(COLUMNS)
    .eq("ride_id", rideId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`rideRequestRepository.listByRide failed: ${error.message}`);
  return (data as RideRequestRow[]).map(toRequest);
}

/** Batch equivalent, so My Rides resolves every ride's requests in one query. */
export async function listByRideIds(
  db: SupabaseClient,
  rideIds: string[],
): Promise<Map<string, RideRequest[]>> {
  if (rideIds.length === 0) return new Map();

  const { data, error } = await db
    .from("ride_requests")
    .select(COLUMNS)
    .in("ride_id", rideIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`rideRequestRepository.listByRideIds failed: ${error.message}`);

  const grouped = new Map<string, RideRequest[]>();
  for (const id of rideIds) grouped.set(id, []);
  for (const row of data as RideRequestRow[]) {
    grouped.get(row.ride_id)?.push(toRequest(row));
  }
  return grouped;
}

interface RideRow {
  id: string;
  driver_id: string;
  origin_area_id: string;
  destination_area_id: string;
  departs_at: string;
  seats: number;
  note: string | null;
  status: Ride["status"];
}

/**
 * My Requests (FR-40, FR-41).
 *
 * Embeds the ride so the upcoming predicate can be applied in one query, and so the view has
 * the ride details it renders. `!inner` makes the join required, which is what filters out
 * requests whose ride has departed.
 */
export async function listUpcomingByPassenger(
  db: SupabaseClient,
  passengerId: string,
  nowIso: string,
): Promise<{ request: RideRequest; ride: Ride }[]> {
  const { data, error } = await db
    .from("ride_requests")
    .select(
      `${COLUMNS}, rides!inner(id, driver_id, origin_area_id, destination_area_id, departs_at, seats, note, status)`,
    )
    .eq("passenger_id", passengerId)
    .gt("rides.departs_at", nowIso)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`rideRequestRepository.listUpcomingByPassenger failed: ${error.message}`);
  }

  return (data as unknown as (RideRequestRow & { rides: RideRow })[]).map((row) => ({
    request: toRequest(row),
    ride: {
      id: row.rides.id,
      driverId: row.rides.driver_id,
      originAreaId: row.rides.origin_area_id,
      destinationAreaId: row.rides.destination_area_id,
      departsAt: row.rides.departs_at,
      seats: row.rides.seats,
      note: row.rides.note,
      status: row.rides.status,
    },
  }));
}

/**
 * The caller's own requests across a set of rides.
 *
 * Lets a listing suppress a request button that would only be refused (BR-3.7), and resolve
 * contact details where the viewer's request was accepted.
 */
export async function listByRideIdsForPassenger(
  db: SupabaseClient,
  rideIds: string[],
  passengerId: string,
): Promise<Map<string, RideRequest>> {
  if (rideIds.length === 0) return new Map();

  const { data, error } = await db
    .from("ride_requests")
    .select(COLUMNS)
    .in("ride_id", rideIds)
    .eq("passenger_id", passengerId);

  if (error) {
    throw new Error(`rideRequestRepository.listByRideIdsForPassenger failed: ${error.message}`);
  }

  const byRide = new Map<string, RideRequest>();
  for (const row of data as RideRequestRow[]) {
    const request = toRequest(row);
    const existing = byRide.get(request.rideId);
    // A ride can hold several of the caller's requests over time (one active plus terminal
    // ones, per BR-3.7). Prefer the active one; otherwise keep the most recent.
    if (!existing) byRide.set(request.rideId, request);
    else if (request.status === "pending" || request.status === "accepted") {
      byRide.set(request.rideId, request);
    } else if (existing.createdAt < request.createdAt && !["pending", "accepted"].includes(existing.status)) {
      byRide.set(request.rideId, request);
    }
  }
  return byRide;
}
