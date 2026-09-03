import type { DisplayStatus, RequestStatus } from "@/lib/types";

/**
 * The request state machine as pure functions (BR-3.17, BR-3.19).
 *
 * No framework imports and no I/O, so it is directly unit testable - and request state
 * transitions are one of the two things Q20=A named as worth testing.
 *
 * The transition table from BR-3.19, for reference:
 *
 *   (none)    -> pending      passenger requests, all six preconditions
 *   pending   -> accepted     driver accepts, capacity permitting
 *   pending   -> rejected     driver rejects
 *   pending   -> withdrawn    passenger withdraws
 *   accepted  -> withdrawn    passenger withdraws
 *   pending   -> cancelled    driver cancels the ride (trigger)
 *   accepted  -> cancelled    driver cancels the ride (trigger)
 *   pending   -> EXPIRED      ride departs - DERIVED, never written
 *
 * Anything absent from that table is illegal.
 */

/**
 * Statuses from which nothing further can happen.
 *
 * Note `accepted` is **not** here. It is irreversible *by the driver* (BR-3.15 - there is no
 * un-accept), but the passenger may still withdraw (BR-3.12). Treating it as terminal would
 * silently remove the passenger's only way out of a ride they no longer need.
 */
const TERMINAL: readonly RequestStatus[] = ["rejected", "withdrawn", "cancelled"] as const;

export function isTerminal(status: RequestStatus): boolean {
  return TERMINAL.includes(status);
}

/** BR-3.14 - only a pending request may be accepted. */
export function canAccept(status: RequestStatus): boolean {
  return status === "pending";
}

/** BR-3.14 - only a pending request may be rejected. */
export function canReject(status: RequestStatus): boolean {
  return status === "pending";
}

/** BR-3.12 - a passenger may withdraw while pending or accepted. */
export function canWithdraw(status: RequestStatus): boolean {
  return status === "pending" || status === "accepted";
}

/**
 * The status a user is shown, which is not always the status stored (FQ1=A, FR-36, FR-37).
 *
 * A request still `pending` when its ride departs is reported as `expired`. Nothing writes
 * that - it is a consequence of the ride departing, computed here on every read.
 *
 * BR-3.18: a pending request is NEVER expired early. Only actual departure changes what this
 * reports, and no scheduled job exists to do it sooner (Q33=A, TC-7).
 *
 * Every stored terminal status is returned unchanged regardless of departure: a request that
 * was rejected before the ride left was rejected, not expired, and rewriting that history
 * would be a lie.
 */
export function displayStatus(
  status: RequestStatus,
  rideDepartsAt: string,
  nowIso: string,
): DisplayStatus {
  if (status !== "pending") return status;

  const departs = new Date(rideDepartsAt).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(departs) || Number.isNaN(now)) return status;

  return departs <= now ? "expired" : "pending";
}

/** Ordering for display: actionable first, then confirmed, then the terminal group (FQ8=A). */
export function displayGroup(status: DisplayStatus): "pending" | "accepted" | "terminal" {
  if (status === "pending") return "pending";
  if (status === "accepted") return "accepted";
  return "terminal";
}
