import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/db/supabase/server";
import { fail, ok, type Result } from "@/lib/result";

/**
 * C13 AuthContext - resolve the current user server-side, so no call site re-derives it.
 *
 * Server-only. Wraps C5 AuthService's session read. FQ7=A's cookie session is what makes this
 * possible during a Server Component render.
 */

export async function getOptionalUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * The current user, or NOT_PERMITTED (BR-1.6).
 *
 * Every service method that touches user data begins here, which is the service half of
 * NFR-1's two-layer authorization. The RLS policies are the other half and run regardless.
 */
export async function requireUser(): Promise<Result<User>> {
  const user = await getOptionalUser();
  return user ? ok(user) : fail("NOT_PERMITTED", "You need to be signed in to do that.");
}
