import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcceptedContact, PublicProfile, Role } from "@/lib/types";

/**
 * C10 ContactProjection - the single place non-owner profile data is read.
 *
 * Implements US-27 ("have my contact details withheld at the source") to its Unit 2 extent.
 * BR-2.27 records that US-27's remaining criteria - pending-request output and
 * accepted-request output - require requests to exist, so Unit 3 must re-verify it in full.
 *
 * Reads the `public_profiles` view, which carries only `id`, `display_name`, `home_area_id`
 * and `role`. It has no `phone` and no `email` column, so this path **cannot** disclose
 * contact details - FR-20 and NFR-2 enforced by the shape of the data rather than by every
 * caller remembering to strip fields (BR-2.24, BR-2.26).
 *
 * Two independent guarantees:
 *   1. The database cannot return contact columns through this view - they are not there
 *   2. `PublicProfile` has no contact fields, so a caller expecting one is a compile error
 *
 * ---------------------------------------------------------------------------
 * TWO PATHS, ONE HOME - completed in Unit 3
 * ---------------------------------------------------------------------------
 * | Case                                   | Path                                        |
 * |----------------------------------------|---------------------------------------------|
 * | Any employee's public data             | `public_profiles` view - no contact columns |
 * | A counterparty on an ACCEPTED request  | `profiles` base table, permitted by RLS     |
 * | Anything else                          | The public path                             |
 *
 * The second path is guarded by `profiles_select_accepted_counterparty`
 * (0009_accepted_pair_profile_policy.sql), so the database - not this module - decides whether
 * a contact row may be returned. A bug here cannot leak a phone number: the query comes back
 * empty.
 *
 * `PublicProfile` was NOT widened (BR-3.27). `AcceptedContact` is a distinct type, so holding
 * one is itself proof that disclosure was authorised. A single type with sometimes-null contact
 * fields would make every call site decide whether to trust them - exactly the diffusion this
 * module exists to prevent.
 */

interface PublicProfileRow {
  id: string;
  display_name: string | null;
  home_area_id: string | null;
  role: Role;
}

const VIEW = "public_profiles";
const COLUMNS = "id, display_name, home_area_id, role";

export function toPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    homeAreaId: row.home_area_id,
    role: row.role,
  };
}

/**
 * Batch read, keyed by id.
 *
 * Batch-shaped on purpose: a listing resolves every driver in one query, so the disclosure
 * decision is made once for the whole set rather than per row. Unit 1 built
 * `profileRepository.findManyByUserIds` for the same reason.
 */
export async function listPublicProfiles(
  db: SupabaseClient,
  ids: string[],
): Promise<Map<string, PublicProfile>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const { data, error } = await db.from(VIEW).select(COLUMNS).in("id", unique);
  if (error) throw new Error(`contactProjection.listPublicProfiles failed: ${error.message}`);

  return new Map((data as PublicProfileRow[]).map((row) => [row.id, toPublicProfile(row)]));
}

export async function findPublicProfile(
  db: SupabaseClient,
  id: string,
): Promise<PublicProfile | null> {
  const { data, error } = await db.from(VIEW).select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`contactProjection.findPublicProfile failed: ${error.message}`);
  return data ? toPublicProfile(data as PublicProfileRow) : null;
}


// ---------------------------------------------------------------------------
// Unit 3 - the accepted-pair path (FR-30, BR-3.23, BR-3.24)
// ---------------------------------------------------------------------------

interface AcceptedContactRow {
  id: string;
  display_name: string | null;
  phone: string | null;
  email: string;
}

const CONTACT_COLUMNS = "id, display_name, phone, email";

/**
 * A counterparty's contact details, or null.
 *
 * Reads the `profiles` BASE TABLE, which is owner-only except where
 * `profiles_select_accepted_counterparty` permits it. **This function performs no acceptance
 * check of its own** - the policy is the check, and duplicating it here would give the rule a
 * second home (the mistake BR-3.10 warns about for capacity).
 *
 * Returning null therefore means one of two things, and the caller need not distinguish them:
 * no such profile, or no accepted request linking the caller to it. Either way, no contact
 * details are disclosed.
 */
export async function findAcceptedContact(
  db: SupabaseClient,
  counterpartyId: string,
): Promise<AcceptedContact | null> {
  const { data, error } = await db
    .from("profiles")
    .select(CONTACT_COLUMNS)
    .eq("id", counterpartyId)
    .maybeSingle();

  if (error) {
    throw new Error(`contactProjection.findAcceptedContact failed: ${error.message}`);
  }
  if (!data) return null;

  const row = data as AcceptedContactRow;
  return {
    id: row.id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
  };
}

/** Batch equivalent, so a list resolves every accepted counterparty in one query. */
export async function listAcceptedContacts(
  db: SupabaseClient,
  counterpartyIds: string[],
): Promise<Map<string, AcceptedContact>> {
  const unique = [...new Set(counterpartyIds)];
  if (unique.length === 0) return new Map();

  const { data, error } = await db.from("profiles").select(CONTACT_COLUMNS).in("id", unique);
  if (error) {
    throw new Error(`contactProjection.listAcceptedContacts failed: ${error.message}`);
  }

  return new Map(
    (data as AcceptedContactRow[]).map((row) => [
      row.id,
      { id: row.id, displayName: row.display_name, phone: row.phone, email: row.email },
    ]),
  );
}
