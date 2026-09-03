import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * US-01 - sign out.
 *
 * Minor deviation from frontend-components.md, which listed this as a Client Component: a
 * plain form posting to a Server Action needs no client JavaScript at all, so shipping a
 * client bundle for one button would be waste. Behaviour is identical.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary" data-testid="app-nav-sign-out-button">
        Sign out
      </Button>
    </form>
  );
}
