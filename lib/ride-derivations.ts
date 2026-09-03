import type { Ride } from "@/lib/types";

/**
 * Pure derivations for rides. No framework imports and no I/O, so this module is directly
 * unit testable (NFR-6) - and unlike Unit 1's tests, this is squarely inside the scope Q20=A
 * approved, since seat availability begins here.
 */

/**
 * Seats still free on a ride (FR-19, BR-2.21, FQ2=A).
 *
 * Derived, never stored. Unit 3's capacity guarantee (FR-31 to FR-33) constrains the same
 * count of the same rows, so the number shown to a user and the number the database enforces
 * cannot disagree.
 *
 * Clamped at zero. A negative value should be impossible - the guarantee exists to make it so -
 * but if data ever went bad, showing "-1 seats free" would be worse than showing none.
 */
export function seatsRemaining(seats: number, acceptedCount: number): number {
  return Math.max(0, seats - acceptedCount);
}

/** BR-2.22 - a full ride is shown and marked, not hidden. */
export function isFull(seats: number, acceptedCount: number): boolean {
  return seatsRemaining(seats, acceptedCount) === 0;
}

/**
 * BR-2.23 - the viewer created this ride.
 *
 * Unit 2 uses it to suppress a request action that does not exist yet; Unit 3 pairs it with
 * the server-side refusal FR-24 requires. A UI marker alone is not enforcement.
 */
export function isOwnRide(ride: Pick<Ride, "driverId">, viewerId: string): boolean {
  return ride.driverId === viewerId;
}

/**
 * The half-open instant range covering one calendar day, for the FR-18 date filter.
 *
 * Returned as `[from, to)` rather than a date equality so the query stays indexable - a
 * `departs_at::date = $1` predicate cannot use `rides_search_idx`.
 *
 * Boundaries are local-time midnight, which NFR-7's single-timezone assumption makes
 * unambiguous. `setDate` is used rather than adding 24 hours, so a day that gains or loses an
 * hour to a daylight-saving change still spans exactly one calendar day.
 */
export function dayRange(date: string): { from: string; to: string } | null {
  const from = new Date(`${date}T00:00:00`);
  if (Number.isNaN(from.getTime())) return null;

  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Combine the two form fields a driver fills in into the single instant the database stores
 * (FQ1=A, BR-2.2).
 *
 * Input shape and storage shape differ deliberately: a person thinks in a date and a time,
 * while every query the system runs asks "has it departed?".
 *
 * Returns null on an unparseable combination, so the caller reports a validation failure
 * rather than storing an Invalid Date.
 */
export function combineDateAndTime(date: string, time: string): string | null {
  const instant = new Date(`${date}T${time}`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** BR-2.2 - departure must be in the future. */
export function isFuture(iso: string, nowIso: string): boolean {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  return !Number.isNaN(then) && !Number.isNaN(now) && then > now;
}
