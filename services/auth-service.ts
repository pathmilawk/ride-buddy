import { createSupabaseServerClient } from "@/db/supabase/server";
import { fail, ok, type Result } from "@/lib/result";
import type { CredentialsInput } from "@/lib/schemas";

/**
 * C5 AuthService - identity.
 *
 * The only component that touches Supabase Auth directly, so there is one place that decides
 * who a caller is.
 */

/**
 * Register a new employee (BR-1.1).
 *
 * FR-2 / BR-1.2: NO email-domain restriction is applied, and no allow-list is consulted.
 *
 * This is a deliberate deviation from vision.md Section 4, which requires that only company
 * employees can use the application. requirements.md Section 9.1 records that the product
 * owner was shown the conflict in full and reaffirmed the open-signup choice.
 *
 * Do not "fix" this by adding a domain check - its absence is a recorded decision, not an
 * oversight. A domain allow-list is BLOCKING before this application is served from any
 * publicly reachable URL.
 */
export async function signUp(input: CredentialsInput): Promise<Result<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) {
    // Registration cannot hide that an address is already taken, so BR-1.3 permits saying so
    // here. Sign-in stays generic.
    return fail("AUTH_FAILED", error.message);
  }
  return ok(null);
}

/**
 * Sign in (BR-1.1).
 *
 * BR-1.3: failures are reported generically. The caller is never told whether the account
 * exists. This costs nothing and avoids compounding BR-1.2 by turning open registration into
 * an account-enumeration tool as well.
 */
export async function signIn(input: CredentialsInput): Promise<Result<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return fail("AUTH_FAILED", "Invalid email or password.");
  }
  return ok(null);
}

/** End the session (BR-1.5). */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
