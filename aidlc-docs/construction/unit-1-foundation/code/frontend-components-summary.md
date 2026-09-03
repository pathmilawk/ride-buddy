# Frontend Components Summary - Unit 1 Foundation

**Plan step**: 15 · **Component**: C15 Feature UI

## Files

| File | Type | Stories |
|---|---|---|
| `app/layout.tsx`, `app/globals.css` | Server | US-28 |
| `app/page.tsx` | Server | US-01 |
| `app/(auth)/layout.tsx`, `sign-in/page.tsx`, `register/page.tsx` | Server | US-01 |
| `app/(app)/layout.tsx`, `profile/page.tsx` | Server | US-02..US-05 |
| `components/AppNav.tsx` | Server | US-01, US-03 |
| `components/ui/*` | Server | 7 primitives |
| `features/auth/components/SignInForm.tsx`, `RegisterForm.tsx` | Client | US-01 |
| `features/auth/components/SignOutButton.tsx` | Server | US-01 |
| `features/profile/components/ProfileForm.tsx` | Client | US-02, US-03 |
| `features/profile/components/AreaSelect.tsx` | Server-compatible | US-05 |
| `features/profile/components/IncompleteBanner.tsx` | Server | US-04 |

Only three components are Client Components, and only because they need form state.

## Deviations from frontend-components.md

Both minor, both recorded rather than silently applied.

1. **`SignOutButton` is not a Client Component.** The design listed it as one, but a plain form
   posting to a Server Action needs no client JavaScript. Shipping a client bundle for one
   button would be waste. Behaviour is identical.
2. **shadcn/ui primitives are hand-written.** `components.json` is present for future CLI use,
   but the seven primitives in `components/ui/` were written directly rather than pulled by the
   shadcn CLI, which needs network access and an interactive prompt. They expose the same
   component API, so a later `shadcn add` can replace them without touching call sites.

## Decisions worth recording

**Email renders as read-only text, not a disabled input.** US-02 requires it not be editable. A
disabled input is merely ignored on submit; text cannot be tampered with at all.

**No stricter client-side phone mask.** FQ3=A made the rule deliberately loose. A client mask
rejecting what the server schema accepts would block valid input with no justification.

**`IncompleteBanner` uses the same message function as the gate**
(`describeMissingFields`), so the banner text cannot drift from the rule it explains.

**The `missing` search parameter is filtered against `GATED_FIELDS`**, so a hand-edited URL
cannot inject arbitrary text into the banner.

**`AreaSelect` takes `testId` as a prop.** Unit 2 reuses this component for ride origin and
destination, and each usage needs its own stable identifier.

## Responsive (NFR-5, US-28)

Viewport meta in the root layout; 44px minimum tap targets (`min-h-11`); 16px inputs
(`text-base`) so iOS Safari does not zoom on focus; `overflow-x: hidden` on body; single-column
forms throughout. Light and dark palettes both defined as tokens.

**Units 2 and 3 add screens inside this shell** rather than restating the responsive rules.

## No tests, deliberately

Plan step 14.1. Q20=A excludes UI testing and no DOM environment is configured. Client-side
validation reuses the schemas already tested in Step 8.

## 15 data-testid values applied

All verified present. Field-level error testids follow `profile-form-{field}-error`.
