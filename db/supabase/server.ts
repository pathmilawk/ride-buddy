import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components and Server Actions.
 *
 * FQ7=A: the session lives in a cookie, so it is readable during server render. This is what
 * makes AQ2=A workable - a browser-only session would be invisible here, leaving the auth
 * context nothing to resolve and forcing the server to trust a client-supplied user id.
 *
 * Because the client carries the user's session, every query it runs is subject to the RLS
 * policies in 0003_rls_policies.sql. That is NFR-1's database layer, working automatically.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // Annotated explicitly: the `cookies` option is a union of the current and deprecated
      // method shapes, so TypeScript cannot contextually infer this parameter.
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the session
          // instead, so ignoring this is correct rather than merely tolerable.
        }
      },
    },
  });
}
