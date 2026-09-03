import { createSupabaseServerClient } from "@/db/supabase/server";
import * as profileRepository from "@/db/repositories/profile-repository";
import * as areaRepository from "@/db/repositories/area-repository";
import { requireUser } from "@/lib/auth-context";
import {
  describeMissingFields,
  missingProfileFields,
  type GatedField,
} from "@/lib/profile-completeness";
import { fail, ok, type Result } from "@/lib/result";
import type { ProfileUpdateInput } from "@/lib/schemas";
import type { Profile } from "@/lib/types";

/**
 * C6 ProfileService - profiles, and the completeness gate that later units depend on.
 */

/**
 * The current user's profile, created if absent (BR-1.4, FR-3).
 *
 * FQ8=A: idempotent, and evaluated on every read rather than only at first sign-in. An
 * authenticated user whose profile row was deleted directly in the database gets a fresh
 * empty one and is then walked through the gate, instead of being locked out. That matters
 * during POC development, where rows do get edited by hand in the Supabase console.
 */
export async function getOrCreateMyProfile(): Promise<Result<Profile>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const existing = await profileRepository.findByUserId(supabase, auth.value.id);
  if (existing) return ok(existing);

  const created = await profileRepository.create(
    supabase,
    auth.value.id,
    auth.value.email ?? "",
  );
  return ok(created);
}

/**
 * Update the caller's own profile (FR-5, BR-1.8).
 *
 * The ownership check here is not redundant with the RLS policy that also enforces it. That
 * duplication IS the defence in depth NFR-1 asks for (BR-1.17).
 */
export async function updateMyProfile(
  input: ProfileUpdateInput,
): Promise<Result<Profile>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();

  // BR-1.7: the referenced area must exist. Checked explicitly so the caller gets NOT_FOUND
  // rather than a foreign-key violation surfacing as a thrown fault.
  const area = await areaRepository.findById(supabase, input.homeAreaId);
  if (!area) return fail("NOT_FOUND", "That area no longer exists. Pick another.");

  const updated = await profileRepository.update(supabase, auth.value.id, {
    displayName: input.displayName,
    phone: input.phone,
    homeAreaId: input.homeAreaId,
    role: input.role,
  });

  return ok(updated);
}

/**
 * THE COMPLETENESS GATE (BR-1.9, BR-1.10, FR-6).
 *
 * Called by Unit 2 before creating a ride and by Unit 3 before requesting a seat - and
 * nowhere else (BR-1.10). Browsing, searching, viewing one's own profile and signing out are
 * all permitted with an incomplete profile.
 *
 * Returns PROFILE_INCOMPLETE with the missing field names, which is what lets the caller
 * redirect to the profile page with a message naming them (BR-1.11, FQ6=A).
 *
 * The rule itself is the pure function in lib/profile-completeness.ts; this wrapper only
 * supplies the profile.
 */
export async function assertCanAct(): Promise<Result<Profile>> {
  const profile = await getOrCreateMyProfile();
  if (!profile.ok) return profile;

  const missing: GatedField[] = missingProfileFields(profile.value);
  if (missing.length > 0) {
    return fail(
      "PROFILE_INCOMPLETE",
      describeMissingFields(missing),
      Object.fromEntries(missing.map((f) => [f, "Required before offering or requesting a ride"])),
    );
  }

  return ok(profile.value);
}
