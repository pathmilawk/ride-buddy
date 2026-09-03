/**
 * C12 Result - the typed outcome shape services return.
 *
 * AQ6=C: expected business outcomes travel as return values that the caller must handle;
 * unexpected faults (a dropped connection, a schema mismatch, a bug) are thrown. Only
 * outcomes a story describes as normal behaviour appear here.
 */

/**
 * Business outcomes recognised so far.
 *
 * Grown one unit at a time, so no code has ever existed that could return an outcome nothing
 * produced. Units 1 and 2 defined five; Unit 3 added the four the request lifecycle needs.
 */
export type BusinessOutcome =
  | "PROFILE_INCOMPLETE" // BR-1.9 - the completeness gate refused
  | "NOT_PERMITTED" // BR-1.6, BR-1.8 - no session, or someone else's data
  | "NOT_FOUND" // a referenced row does not exist
  | "VALIDATION_FAILED" // BR-1.7 - a schema parse failed
  | "AUTH_FAILED" // BR-1.3 - credentials rejected, reported generically
  // Unit 3 additions. Units 1 and 2 deliberately left these undefined rather than ship
  // outcome codes nothing could return.
  | "SELF_REQUEST" // BR-3.4 - a driver requested a seat on their own ride
  | "DUPLICATE_REQUEST" // BR-3.7 - an active request on that ride already exists
  | "RIDE_FULL" // BR-3.1 courtesy check, and BR-3.9 THE GUARANTEE
  | "INVALID_STATE"; // BR-3.14, BR-3.19 - transition illegal from the current status

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly outcome: BusinessOutcome;
      readonly message: string;
      /** Field-level detail, e.g. which profile fields are missing (BR-1.9). */
      readonly fields?: Readonly<Record<string, string>>;
    };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(
  outcome: BusinessOutcome,
  message: string,
  fields?: Record<string, string>,
): Result<T> {
  return fields ? { ok: false, outcome, message, fields } : { ok: false, outcome, message };
}

export function isOk<T>(r: Result<T>): r is { ok: true; value: T } {
  return r.ok;
}
