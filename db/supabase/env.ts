/**
 * Supabase connection settings.
 *
 * Assumption A-3 (amended): the user provisions the Supabase project and supplies these values
 * as environment variables. See .env.example and the README.
 *
 * ---------------------------------------------------------------------------
 * On the key name - amended after Unit 2
 * ---------------------------------------------------------------------------
 * Supabase has moved from the `anon` / `service_role` JWT pair to
 * `sb_publishable_...` / `sb_secret_...` keys. New projects are issued a **publishable key**
 * and no anon key at all.
 *
 * The publishable key occupies exactly the same role the anon key did: it is safe to ship to
 * the browser, it carries no privileges of its own, and every request made with it is subject
 * to the row level security policies in supabase/migrations/. So this is a rename, not an
 * architectural change - NFR-1's database layer is untouched.
 *
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still read as a fallback, because Supabase is mid-migration
 * and an older project may only show the legacy key. The publishable name is the primary, and
 * the error below names it.
 *
 * What is NOT here, deliberately: the secret key (formerly service_role). It bypasses every RLS
 * policy, and nothing in this application needs it - authorization runs as the signed-in user.
 * If one ever becomes necessary it must never carry a NEXT_PUBLIC_ prefix.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in - see README.md.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/**
 * The browser-safe API key.
 *
 * Prefers the current publishable key; falls back to the legacy anon key so a project issued
 * before the migration still works.
 */
export function supabasePublishableKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
