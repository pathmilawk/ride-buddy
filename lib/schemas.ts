import { z } from "zod";
import { ROLES } from "@/lib/types";

/**
 * C11 ValidationSchemas - defined once, used on both sides (AQ4=A).
 *
 * The server-side parse is authoritative; the client parse exists only for immediate
 * feedback. Types are inferred from the schemas so a schema change propagates rather than
 * requiring a parallel type edit.
 *
 * Field rules are BR-1.7's.
 */

export const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

/**
 * BR-1.7 phone rule, FQ3=A: loose on purpose.
 *
 * Non-empty, 6 to 20 characters, digits with common separators and an optional leading plus.
 * No format, country code, or locale is imposed.
 *
 * The honest trade: a malformed number passes the completeness gate and only fails the person
 * at step 8 of the demo, when contact details are exchanged. Accepted for a POC; a real
 * product would normalise to E.164.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(6, "Phone number looks too short")
  .max(20, "Phone number looks too long")
  .regex(/^\+?[\d\s()-]+$/, "Use digits, spaces, brackets, hyphens or a leading +");

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or fewer"),
  phone: phoneSchema,
  homeAreaId: z.string().uuid("Select your home area"),
  // FQ4=A: optional with a default, and never gated. FR-7 makes role informational.
  role: z.enum(ROLES).default("both"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Flatten a Zod error into the field map the Result type carries. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Unit 2 - Ride Offering and Discovery
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^\d{2}:\d{2}$/;

/**
 * Ride creation (BR-2.2).
 *
 * Date and time are captured separately, as the driver thinks of them, and combined into one
 * instant at the action boundary (FQ1=A).
 *
 * Note what is deliberately absent: **no rule forbidding origin from equalling destination**.
 * FQ4=B permits a same-area ride (BR-2.4) - the product owner's decision, taken against the
 * recommendation. Its absence here is intentional, not an oversight.
 *
 * The future-date check also lives outside this schema, in the service, because it depends on
 * the current instant and a schema should stay a pure shape check.
 *
 * BR-2.3: there is no cap on how far ahead a ride may be published. FQ3=A declined a horizon
 * limit, so no maximum-date rule appears here.
 */
export const rideCreateSchema = z.object({
  date: z.string().regex(ISO_DATE, "Pick a date"),
  time: z.string().regex(HH_MM, "Pick a departure time"),
  originAreaId: z.string().uuid("Select where the ride starts"),
  destinationAreaId: z.string().uuid("Select where the ride is going"),
  // FQ3=A / BR-2.2: bounds keep the capacity guarantee meaningful.
  seats: z.coerce
    .number()
    .int("Seats must be a whole number")
    .min(1, "Offer at least one seat")
    .max(8, "Offer at most eight seats"),
  note: z
    .string()
    .trim()
    .max(280, "Keep the note under 280 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type RideCreateInput = z.infer<typeof rideCreateSchema>;

/**
 * Ride search (FR-18).
 *
 * Parsed **leniently**: every field is optional and `.catch(undefined)` turns an unparseable
 * value into an absent one. A hand-edited, stale or shared URL should fall back to the
 * prefilled defaults (BR-2.18) rather than show an error page - a search is a read, and a bad
 * read has a sensible fallback.
 */
export const rideSearchSchema = z.object({
  date: z.string().regex(ISO_DATE).optional().catch(undefined),
  originAreaId: z.string().uuid().optional().catch(undefined),
  destinationAreaId: z.string().uuid().optional().catch(undefined),
});

export type RideSearchParams = z.infer<typeof rideSearchSchema>;
