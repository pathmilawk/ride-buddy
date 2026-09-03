import Link from "next/link";
import * as profileService from "@/services/profile-service";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

/**
 * Navigation. A Server Component - it reads the profile during render (AQ2=A) rather than
 * fetching from an endpoint, because no endpoint exists.
 *
 * Shows the display name when set, otherwise the email. Never shows a phone number.
 */
export async function AppNav() {
  const result = await profileService.getOrCreateMyProfile();
  const label = result.ok ? (result.value.displayName ?? result.value.email) : "";

  return (
    <header className="border-b border-border bg-card">
      <nav className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/search" className="text-base font-semibold">
          Ride Buddy
        </Link>

        {/* Unit 2 additions - the only change to a Unit 1 component, and purely additive. */}
        <Link
          href="/search"
          data-testid="app-nav-search-link"
          className="min-h-11 inline-flex items-center px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Find a ride
        </Link>
        <Link
          href="/rides"
          data-testid="app-nav-my-rides-link"
          className="min-h-11 inline-flex items-center px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          My rides
        </Link>

        {/* Unit 3 addition - US-26 gets its own route (FQ6=A). */}
        <Link
          href="/requests"
          data-testid="app-nav-my-requests-link"
          className="min-h-11 inline-flex items-center px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          My requests
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/profile"
            data-testid="app-nav-profile-link"
            className="min-h-11 inline-flex items-center px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {label}
          </Link>
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
