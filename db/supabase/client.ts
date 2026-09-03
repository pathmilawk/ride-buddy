import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Supabase client for Client Components.
 *
 * Used only where the browser must react to auth state. All data reads happen in Server
 * Components and all writes go through Server Actions (AQ2=A), so this client is not a
 * general-purpose data path.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
