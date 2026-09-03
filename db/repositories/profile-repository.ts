import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileUpdate, Role } from "@/lib/types";

/**
 * C1 ProfileRepository - data access for employee profiles.
 *
 * Returns raw profile records. Applies no business rules and performs no contact filtering:
 * deciding whether a phone number may be disclosed belongs to the C10 projection, built in
 * Unit 2. Keeping that decision out of this layer is what allows it to have exactly one home.
 */

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  home_area_id: string | null;
  role: Role;
}

const COLUMNS = "id, email, display_name, phone, home_area_id, role";

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone,
    homeAreaId: row.home_area_id,
    role: row.role,
  };
}

export async function findByUserId(
  db: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select(COLUMNS).eq("id", userId).maybeSingle();

  if (error) throw new Error(`profileRepository.findByUserId failed: ${error.message}`);
  return data ? toProfile(data as ProfileRow) : null;
}

/**
 * Batch read.
 *
 * Exists so list views can load every referenced profile in one query and then hand the whole
 * set to the projection at once, rather than making a per-row disclosure decision. Unit 2's
 * search results depend on this shape.
 */
export async function findManyByUserIds(
  db: SupabaseClient,
  userIds: string[],
): Promise<Profile[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await db.from("profiles").select(COLUMNS).in("id", userIds);

  if (error) throw new Error(`profileRepository.findManyByUserIds failed: ${error.message}`);
  return (data as ProfileRow[]).map(toProfile);
}

/**
 * Create the minimal profile that FR-3 requires on first sign-in.
 *
 * display_name, phone and home_area_id are left null; role defaults to 'both' in the schema.
 * The completeness gate (BR-1.9) is what later asks the employee to fill them in.
 */
export async function create(
  db: SupabaseClient,
  userId: string,
  email: string,
): Promise<Profile> {
  const { data, error } = await db
    .from("profiles")
    .insert({ id: userId, email })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(`profileRepository.create failed: ${error.message}`);
  return toProfile(data as ProfileRow);
}

export async function update(
  db: SupabaseClient,
  userId: string,
  fields: ProfileUpdate,
): Promise<Profile> {
  const { data, error } = await db
    .from("profiles")
    .update({
      display_name: fields.displayName,
      phone: fields.phone,
      home_area_id: fields.homeAreaId,
      role: fields.role,
    })
    .eq("id", userId)
    .select(COLUMNS)
    .single();

  if (error) throw new Error(`profileRepository.update failed: ${error.message}`);
  return toProfile(data as ProfileRow);
}
