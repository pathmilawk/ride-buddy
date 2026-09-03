# Ride Buddy — Chrome demo script

Drive this with the `chrome-devtools` MCP server (registered 2026-09-03, local scope,
`npx -y chrome-devtools-mcp@latest --channel stable`). Requires a Claude Code restart
after registration before the tools are callable.

**Prereq:** dev server running on http://localhost:3000 (`npm run dev`).
**All demo accounts use password:** `RideBuddy123!`

| # | Actor | Action | Assert |
|---|-------|--------|--------|
| 1 | Alan | Sign in `alan@solwr.com` → lands on `/search` | Search prefilled from his home area. One card: Hillevåg → Office, "3 of 3 free", Katherine's note, "Ask for a seat" button. **Katherine's phone must NOT appear.** |
| 2 | Alan | Click "Ask for a seat" | Status flips to "Waiting for the driver". **Phone still withheld — a pending request does not unlock contact details.** |
| 3 | Katherine | Sign out, sign in `katherine@solwr.com` → `/requests` | Request listed from "Alan Turing", Accept / Decline offered. **Alan's phone must NOT appear.** |
| 4 | Katherine | Click Accept | Goes through the capacity-guarded `accept_ride_request()`. Seat count drops 3 → 2. |
| 5 | Both | Katherine's ride view, then re-auth as Alan | Katherine sees `+47 900 11 003`; Alan sees `+47 900 11 004`. Rendered as a tappable `tel:` link. Contact unlocks **only** after acceptance, in both directions. |
| 6 | Noor | Sign in `noor@solwr.com` → try `/rides/new` | FR-6 gate: Noor is seeded with **no phone and no home area** deliberately. Offering a ride must be blocked with a "complete your profile" prompt, not a broken page. |
| 7 | — | Re-check `/search` as Alan | Ride now shows "2 of 3 free". Capacity decrement is visible to other passengers. |

## Notes
- Steps 1–5 were verified server-side against localhost:3000 (real auth tokens, real
  session cookies, server-rendered pages) before Chrome was wired up. They pass.
- Steps 6–7 are sourced from the seed-data comments in `supabase/demo-data.sql`; they
  have **not** been executed yet. Verify, don't assume.
- Screenshot each step for the demo deck.
