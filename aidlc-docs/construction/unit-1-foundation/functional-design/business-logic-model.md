# Business Logic Model - Unit 1 Foundation

**Phase**: CONSTRUCTION - Unit 1, Functional Design, Phase 3
**Decisions applied**: FQ6=A (gate redirects to profile page), FQ7=A (cookie sessions),
FQ8=A (idempotent profile creation)

Flows are technology-agnostic. Each cites its stories, rules, and requirements.

---

## Flow 1: Registration and First Sign-In

**Stories**: US-01, US-02 · **Rules**: BR-1.1, BR-1.2, BR-1.4 · **Requirements**: FR-1, FR-2, FR-3

| # | Step | Outcome on failure |
|---|---|---|
| 1 | Employee submits email and password | Validation failure returned to the form |
| 2 | Credentials schema parses the input | Validation failure |
| 3 | Auth account created; **no domain check applied** (BR-1.2) | Email already registered - reported plainly |
| 4 | Session established as a cookie readable server-side (FQ7=A) | Auth failure |
| 5 | Profile row created: user id, email from the auth account, `role` = `both`, three fields null (BR-1.4) | Thrown - a fault, not a business outcome |
| 6 | Completeness gate evaluated on the next gated action | - |

**Note on step 5**: this is a *get-or-create*, evaluated on every profile read rather than
only here. Step 5 is simply the first time it runs.

---

## Flow 2: Returning Sign-In

**Stories**: US-01 · **Rules**: BR-1.3, BR-1.4, BR-1.6 · **Requirements**: FR-1, FR-3

| # | Step | Outcome on failure |
|---|---|---|
| 1 | Employee submits email and password | Validation failure |
| 2 | Credentials verified | **Generic** "invalid email or password" (BR-1.3) |
| 3 | Session cookie established | Auth failure |
| 4 | Profile fetched; created if absent (BR-1.4, FQ8=A) | Thrown |
| 5 | Employee reaches the application | - |

**The FQ8=A path in practice**: an authenticated user whose profile row was deleted directly
in the database signs in normally at step 4, gets an empty profile, and is then sent to
complete it by Flow 4. They are never locked out. Worth stating because during POC
development rows *will* be edited by hand in the Supabase console.

---

## Flow 3: Complete or Update a Profile

**Stories**: US-02, US-03 · **Rules**: BR-1.7, BR-1.8 · **Requirements**: FR-4, FR-5, FR-7

| # | Step | Outcome on failure |
|---|---|---|
| 1 | Employee opens their profile | `NOT_PERMITTED` if no session (BR-1.6) |
| 2 | Current values loaded; areas list loaded for selection | Thrown |
| 3 | Employee edits name, phone, home area, role. Email is displayed read-only | - |
| 4 | Profile schema parses the submission (BR-1.7) | Validation failure, field by field |
| 5 | Service confirms the caller owns this profile (BR-1.8, BR-1.17) | `NOT_PERMITTED` |
| 6 | Area id confirmed to exist | `NOT_FOUND` |
| 7 | Row updated; `updated_at` set | Thrown |
| 8 | Updated profile returned | - |

**Step 5 is not redundant** with the database policy that also enforces ownership. The
duplication is the defence in depth NFR-1 requires.

---

## Flow 4: The Completeness Gate

**Stories**: US-04 · **Rules**: BR-1.9, BR-1.10, BR-1.11 · **Requirements**: FR-6

This is the flow later units depend on. Invoked at exactly two points, both outside Unit 1:
before ride creation (Unit 2) and before a seat request (Unit 3).

| # | Step | Result |
|---|---|---|
| 1 | A gated action is attempted | - |
| 2 | Caller's profile fetched (created if absent, BR-1.4) | - |
| 3 | `display_name`, `phone`, `home_area_id` each tested for presence | - |
| 4a | All three present | Gate passes; the action proceeds |
| 4b | Any missing | `PROFILE_INCOMPLETE` returned, naming the missing fields |
| 5 | On refusal, the user is redirected to the profile page with that message (FQ6=A) | - |
| 6 | Employee completes the fields via Flow 3 | - |
| 7 | Employee retries the original action; it now succeeds (BR-1.11) | - |

**`role` is not tested at step 3.** FR-7 makes it informational and FQ4=A defaults it.

**Step 7 is a manual retry.** The design deliberately does not resume the interrupted action
automatically. US-04's criteria require that retrying succeeds, not that the app remembers
what was being attempted. Recorded so an implementer does not build a resume mechanism that
was never asked for.

---

## Flow 5: Area Selection

**Stories**: US-05 · **Rules**: BR-1.12, BR-1.13, BR-1.14, BR-1.15 · **Requirements**: FR-8, FR-9, FR-10

| # | Step |
|---|---|
| 1 | A form needing a location renders |
| 2 | Full areas list read (read-only, BR-1.15) |
| 3 | Presented as a selection control, optionally grouped by `kind` (BR-1.13) |
| 4 | Employee selects one; the area **id** is submitted, never its name |
| 5 | The id is validated as existing and stored as a foreign key |

**No free-text path exists** at any step (BR-1.12). This same flow serves ride origin and
destination in Unit 2 unchanged.

---

## Flow 6: Server-Side Identity

**Rules**: BR-1.6, BR-1.17 · **Requirements**: FR-1, NFR-1 · **Source**: FQ7=A

Not a user-facing flow, but the mechanism every other flow depends on.

| # | Step | On failure |
|---|---|---|
| 1 | Request arrives carrying the session cookie | - |
| 2 | Session read server-side, in a Server Component or Server Action | No session |
| 3 | User id resolved through C13 `requireUser` | `NOT_PERMITTED` |
| 4 | The same identity is available to database policies as the session user id | - |
| 5 | Service and database both evaluate ownership against it | `NOT_PERMITTED` |

**Why cookie-based sessions are not optional here.** AQ2=A puts every read in a Server
Component. A session held only in browser storage would be invisible during server render, so
C13 would have nothing to resolve and every read would have to trust a client-supplied user
id - which would defeat NFR-1's server-side layer entirely. FQ7=A is therefore a consequence
of AQ2=A rather than an independent preference.

---

## Flow-to-Story Coverage

| Story | Flows | Fully covered in Unit 1 |
|---|---|---|
| US-01 Sign in | 1, 2, 6 | Yes |
| US-02 Complete my profile | 1, 3, 5 | Yes |
| US-03 Update my profile | 3, 5 | Yes |
| US-04 Completeness gate | 4 | **The rule and the redirect, yes. Its two call sites arrive in Units 2 and 3.** |
| US-05 Choose locations from a list | 5 | Yes |
| US-28 Mobile responsive | presentation | See `frontend-components.md` |

**On US-04**: the gate logic, its outcome, and the redirect are all built in Unit 1 and are
independently testable by calling the gate directly. But BR-1.10 places its only two call
sites in later units, so at Unit 1's checkpoint the gate cannot be *demonstrated* through the
UI - there is no gated action yet. This is a real limitation of Unit 1's checkpoint and is
recorded rather than glossed over.

---

## Downstream Interface Contract

What Units 2 and 3 may rely on from Unit 1. Changing any of these later is a breaking change.

| Contract | Consumer |
|---|---|
| The gate returns pass or `PROFILE_INCOMPLETE`, and checks exactly `display_name`, `phone`, `home_area_id` | Unit 2 ride creation, Unit 3 seat request |
| `profiles.id` equals the auth user id | Unit 2 ride ownership, Unit 3 request ownership |
| `profiles.display_name` is readable for any employee through a projection | Unit 2 search results, Unit 3 request lists |
| `profiles.phone` and `profiles.email` exist and are conditionally readable | Unit 3 contact exchange |
| `areas.id` values are stable across seed runs | Unit 2 ride origin and destination |
| Server-side identity is resolvable in any Server Component or Action | Both later units |
| `Result` carries a business outcome code, extensible with new codes | Both later units |
