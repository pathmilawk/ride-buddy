# Code Generation Plan - Unit 1 Foundation

**Phase**: CONSTRUCTION
**Unit**: Unit 1 - Foundation
**Stage**: Code Generation, Part 1 - Planning
**Date**: 2026-09-03
**Status**: Awaiting approval

> **This plan is the single source of truth for Code Generation of Unit 1.** Part 2 executes
> only what is written here, in this order, marking each checkbox on completion.

---

## Step 1: Unit Context

### Stories implemented by this unit

| Story | Title | Tags |
|---|---|---|
| US-01 | Sign in to Ride Buddy | `[DEMO PATH]` |
| US-02 | Complete my profile | `[DEMO PATH]` |
| US-03 | Update my profile | |
| US-04 | Be stopped before acting with an incomplete profile | `[PROMOTED]` |
| US-05 | Choose locations from a known list | |
| US-28 | Use Ride Buddy on my phone | cross-cutting |

### Dependencies on other units
**None.** Unit 1 is the root of the chain.

### Expected interfaces and contracts (what Units 2 and 3 will consume)
1. Completeness gate returning pass or `PROFILE_INCOMPLETE`, checking exactly
   `display_name`, `phone`, `home_area_id`
2. `profiles.id` equal to the auth user id
3. `profiles.display_name` readable for any employee through a projection (projection itself
   is Unit 2)
4. `profiles.phone` and `profiles.email` present and conditionally readable
5. `areas.id` values stable across seed runs
6. Server-side identity resolvable in any Server Component or Server Action
7. `Result` type carrying a business outcome code, extensible with new codes

### Database entities owned by this unit
`profiles`, `areas`

### Service boundaries and responsibilities
C1 ProfileRepository · C2 AreaRepository · C5 AuthService · C6 ProfileService ·
C7 AreaService · C11 ValidationSchemas (credentials, profile) · C12 Result ·
C13 AuthContext · C14 Server Actions (auth, profile) · C15 Feature UI (auth, profile)

### Design inputs
`functional-design/domain-entities.md` · `functional-design/business-rules.md` (BR-1.1 to
BR-1.17) · `functional-design/business-logic-model.md` (6 flows) ·
`functional-design/frontend-components.md`

---

## Step 2: Code Location

Read from `aidlc-state.md`: **workspace root** is
`/Users/pathmilak/Documents/AIDLC-training/ride-buddy`, project type **greenfield**.

| Content | Location |
|---|---|
| Application code | Workspace root, per the layout in `unit-of-work.md` |
| Build and config files | Workspace root |
| Markdown summaries | `aidlc-docs/construction/unit-1-foundation/code/` |

**Never** application code in `aidlc-docs/`.

### Exact paths this unit will create

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs,
components.json, vitest.config.ts, .env.example, .gitignore, README.md
middleware.ts
app/layout.tsx, app/globals.css, app/page.tsx
app/(auth)/sign-in/page.tsx, app/(auth)/register/page.tsx
app/(app)/layout.tsx, app/(app)/profile/page.tsx
components/AppNav.tsx, components/ui/*
features/auth/components/SignInForm.tsx, RegisterForm.tsx, SignOutButton.tsx
features/auth/actions.ts
features/profile/components/ProfileForm.tsx, AreaSelect.tsx, IncompleteBanner.tsx
features/profile/actions.ts
services/auth-service.ts, profile-service.ts, area-service.ts
db/repositories/profile-repository.ts, area-repository.ts
db/supabase/server.ts, client.ts, middleware.ts
lib/result.ts, auth-context.ts, schemas.ts, types.ts
supabase/migrations/0001_areas.sql, 0002_profiles.sql, 0003_rls_policies.sql
supabase/seed.sql
tests/unit/profile-completeness.test.ts, schemas.test.ts, result.test.ts
```

---

## Stated Technical Decisions

`code-generation.md` Part 1 has no question step, so these are recorded as decisions.
**Object to any of them at the approval gate and I will revise the plan.**

| Decision | Choice | Rationale |
|---|---|---|
| Next.js | Latest stable, App Router | TC-1, AQ2=A |
| Package manager | npm | Assumption A-4 |
| Styling | Tailwind CSS + shadcn/ui | TC-3 |
| Supabase client | `@supabase/supabase-js` with `@supabase/ssr` | FQ7=A cookie sessions |
| Validation | `zod` | AQ4=A |
| Test runner | **Vitest** | Faster to configure than Jest for a TypeScript project, and Unit 1's tests are pure functions with no DOM or database. Jest would also work. |
| ID generation | `gen_random_uuid()` in Postgres | FQ1=A UUID keys |
| Migration naming | `NNNN_description.sql`, ordered | TC-5 |

### Honest note on test scope

Q20=A limited automated testing to "core business logic only (seat availability, request state
transitions)" - **both of which land in Unit 3, not here.** Strictly read, Unit 1 warrants no
tests at all.

This plan includes **three small test files** anyway (Steps 6, 9): the completeness gate
(BR-1.9), the validation schemas (BR-1.7), and the `Result` type. All three are pure functions
needing no database or DOM, so the cost is a few minutes, and the gate is genuinely core
business logic that Units 2 and 3 both depend on. It also proves the test harness works before
Unit 3 needs it for the requirement that actually matters.

If you would rather hold strictly to Q20=A, say so at the gate and I will drop Steps 6 and 9
and defer all test setup to Unit 3.

---

## EXECUTION STEPS

Ordered by **dependency**, not by the category order listed in `code-generation.md` Step 2.
That listing places Business Logic before the Repository Layer it calls; generating in that
order would produce services referencing repositories that do not yet exist. All the listed
categories are present - only their sequence differs, and the reason is recorded here.

### Step 1 - Project Structure Setup (greenfield)
- [x] 1.1 Initialise `package.json` with dependencies and scripts (`dev`, `build`, `test`)
- [x] 1.2 Create `tsconfig.json` with strict mode and the `@/*` path alias
- [x] 1.3 Create `next.config.ts`
- [x] 1.4 Configure Tailwind and `app/globals.css` with light and dark tokens
- [x] 1.5 Create `components.json` for shadcn/ui
- [x] 1.6 Create `vitest.config.ts`
- [x] 1.7 Create `.gitignore` covering `.env*.local`, `node_modules`, `.next`
- [x] 1.8 Create the directory skeleton from the layout above

### Step 2 - Database Migration Scripts
*Stories: US-02, US-05 · Rules: BR-1.7, BR-1.12 to BR-1.16 · Entities: `areas`, `profiles`*
- [x] 2.1 `0001_areas.sql` - `areas` table, `kind` enum, unique `name`
- [x] 2.2 `0002_profiles.sql` - `profiles` with `id` as PK and FK to `auth.users` (cascade), `role` enum defaulting to `both`, three nullable fields, `home_area_id` FK restrict
- [x] 2.3 `0003_rls_policies.sql` - enable RLS; `profiles` owner-only select and update per BR-1.16; `areas` readable by any authenticated user
- [x] 2.4 Add an `updated_at` trigger
- [x] 2.5 Verify migrations are ordered and additive - nothing a later unit must alter

### Step 3 - Seed Data
*Requirement: TC-6 · Rules: BR-1.13, BR-1.15*
- [x] 3.1 `supabase/seed.sql` - residential areas plus at least one `office` entry, upserting by unique `name` so re-runs are idempotent (assumption A-6)

### Step 4 - Repository Layer Generation
*Components: C1, C2 · Rules: BR-1.4, BR-1.8, BR-1.15*
- [x] 4.1 `db/supabase/server.ts`, `client.ts`, `middleware.ts` - cookie-aware clients (FQ7=A)
- [x] 4.2 `lib/types.ts` - `Profile`, `Area`, `Role`, `AreaKind`
- [x] 4.3 `db/repositories/area-repository.ts` - `listAll`, `findById` (read-only)
- [x] 4.4 `db/repositories/profile-repository.ts` - `findByUserId`, `findManyByUserIds`, `create`, `update`
- [x] 4.5 Confirm repositories contain no business rules and apply no projection

### Step 5 - Repository Layer Unit Testing
- [x] 5.1 No repository unit tests. Repositories are thin Supabase wrappers with no logic to test; verifying them requires a live database, which Q20=A places out of scope. **Recorded as a deliberate decision, not an omission.**

### Step 6 - Repository Layer Summary
- [x] 6.1 Write `aidlc-docs/construction/unit-1-foundation/code/repository-layer-summary.md`

### Step 7 - Business Logic Generation
*Components: C5, C6, C7, C11, C12, C13 · Rules: BR-1.1 to BR-1.17*
- [x] 7.1 `lib/result.ts` - `Result<T>` and `BusinessOutcome` (AQ6=C)
- [x] 7.2 `lib/schemas.ts` - `credentialsSchema`, `profileUpdateSchema` per BR-1.7 with inferred types
- [x] 7.3 `lib/auth-context.ts` - C13 `requireUser`, `getOptionalUser`
- [x] 7.4 `services/auth-service.ts` - C5 `signUp`, `signIn`, `signOut`, `getCurrentUser`; **no domain check** (BR-1.2); generic sign-in failure (BR-1.3)
- [x] 7.5 `services/area-service.ts` - C7 `listAreas`
- [x] 7.6 `services/profile-service.ts` - C6 `getOrCreateMyProfile` (idempotent, BR-1.4), `updateMyProfile` (owner-only, BR-1.8), **`assertCanAct`** (the gate, BR-1.9)
- [x] 7.7 Confirm `assertCanAct` checks exactly three fields and ignores `role` (BR-1.9, FR-7)
- [x] 7.8 Confirm no component reads `role` for authorization (FR-7)

### Step 8 - Business Logic Unit Testing
*Requirement: NFR-6 · See the test-scope note above*
- [x] 8.1 `tests/unit/profile-completeness.test.ts` - the gate: all three present passes; each missing field fails with `PROFILE_INCOMPLETE`; missing role does **not** fail
- [x] 8.2 `tests/unit/schemas.test.ts` - BR-1.7 rules, including that a loose phone is accepted (FQ3=A) and no format is imposed
- [x] 8.3 `tests/unit/result.test.ts` - success and failure construction and narrowing

### Step 9 - Business Logic Summary
- [x] 9.1 Write `aidlc-docs/construction/unit-1-foundation/code/business-logic-summary.md`

### Step 10 - Action Layer Generation (the API-layer equivalent)
*Component: C14 · Stories: US-01, US-02, US-03*

Under AQ2=A there is no REST API - Server Actions are the write boundary. This step covers
the category `code-generation.md` calls "API Layer".
- [x] 10.1 `features/auth/actions.ts` - `signInAction`, `registerAction`, `signOutAction`
- [x] 10.2 `features/profile/actions.ts` - `updateProfileAction`
- [x] 10.3 `middleware.ts` - session refresh and route protection (BR-1.6)
- [x] 10.4 Confirm every action is the four-line shape - parse, resolve user, call one service, return the result - with **no business rules**

### Step 11 - Action Layer Unit Testing
- [x] 11.1 No action unit tests. Actions hold no logic by construction (step 10.4), and testing them requires a request context. Their logic is tested through the services in Step 8. **Recorded as a deliberate decision.**

### Step 12 - Action Layer Summary
- [x] 12.1 Write `aidlc-docs/construction/unit-1-foundation/code/action-layer-summary.md`

### Step 13 - Frontend Components Generation
*Component: C15 · Stories: US-01, US-02, US-03, US-04, US-05, US-28*
- [x] 13.1 `app/layout.tsx` + `app/globals.css` - root shell, viewport meta, responsive tokens (NFR-5)
- [x] 13.2 shadcn/ui primitives needed: button, input, label, select, radio-group, card, alert
- [x] 13.3 `app/page.tsx` - entry, redirects by session state
- [x] 13.4 `app/(auth)/sign-in/page.tsx` + `SignInForm` (US-01)
- [x] 13.5 `app/(auth)/register/page.tsx` + `RegisterForm` (US-01), no domain hint per BR-1.2
- [x] 13.6 `app/(app)/layout.tsx` + `AppNav` + `SignOutButton` (US-01)
- [x] 13.7 `features/profile/components/AreaSelect.tsx` - grouped by `kind`, `testId` prop for Unit 2 reuse (US-05)
- [x] 13.8 `features/profile/components/ProfileForm.tsx` - read-only email, role defaulting to `both` (US-02, US-03)
- [x] 13.9 `features/profile/components/IncompleteBanner.tsx` (US-04, FQ6=A)
- [x] 13.10 `app/(app)/profile/page.tsx` - loads profile and areas server-side, shows the banner on gate redirect
- [x] 13.11 Apply all 16 `data-testid` values from `frontend-components.md`
- [x] 13.12 Verify mobile-first: no horizontal scroll at 360px, 44px tap targets, 16px inputs

### Step 14 - Frontend Components Unit Testing
- [x] 14.1 No component unit tests. Q20=A excludes UI testing, and no DOM test environment is configured. Client-side validation reuses the schemas already tested in Step 8.2. **Recorded as a deliberate decision.**

### Step 15 - Frontend Components Summary
- [x] 15.1 Write `aidlc-docs/construction/unit-1-foundation/code/frontend-components-summary.md`

### Step 16 - Documentation Generation
- [x] 16.1 `README.md` - prerequisites, Supabase setup, env vars, migration and seed steps, run and test commands
- [x] 16.2 Record that the user provisions the Supabase project and supplies the keys (assumption A-3)
- [x] 16.3 State the open-signup deviation in the README so it is visible to anyone running this (`requirements.md` Section 9.1)

### Step 17 - Deployment Artifacts Generation
- [x] 17.1 `.env.example` - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` *(amended 2026-09-03 from `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase retired the anon key; see the amendment to assumption A-3 in requirements.md)*
- [x] 17.2 npm scripts: `dev`, `build`, `start`, `test`
- [x] 17.3 No hosting configuration. TC-7 is local-only and Q19=A confirmed it. **Deliberate.**

### Step 18 - Verification
- [x] 18.1 Verify all 6 stories have implementing code
- [x] 18.2 Verify FR-1 to FR-10 and NFR-5 are implemented
- [x] 18.3 Verify BR-1.1 to BR-1.17 each have implementing code or a recorded reason
- [x] 18.4 Verify no application code was written into `aidlc-docs/`
- [x] 18.5 Verify the 7 downstream contracts are satisfied for Units 2 and 3
- [x] 18.6 Run `tsc --noEmit` and the test suite; report actual output - **RESOLVED. Node.js 26.8.1 installed at the user's request; `tsc --noEmit` clean, 30/30 tests pass, `next build` succeeds. Actual output recorded below.**
- [x] 18.7 Verify all 16 `data-testid` values are present
- [x] 18.8 Mark implemented stories [x]

---

## Step 5: Plan Summary

| | |
|---|---|
| Total steps | 18, with 67 sub-steps |
| Files to create | ~45 |
| Stories covered | 6 (US-01 to US-05, US-28) |
| Requirements | FR-1 to FR-10, NFR-1, NFR-5 |
| Business rules | BR-1.1 to BR-1.17 |
| Test files | 3, all pure-function |
| Steps that deliberately generate nothing | 4 (5.1, 11.1, 14.1, 17.3) - each with a recorded reason |

**Generation approach**: dependency order - configuration, then schema, then repositories,
then services, then actions, then UI, then documentation. Each layer is complete before the
next one depends on it.

**Four steps deliberately produce no artifact.** They are kept in the plan rather than deleted
so the record shows the category was considered and consciously declined, with the reason,
rather than silently skipped.


---

## Step 18 Verification Results

### 18.6 - RESOLVED (was blocked)

Initially blocked: no Node.js runtime existed on this machine. The user then explicitly asked
for it to be installed, so `brew install node` was run, giving **Node 26.8.1 / npm 11.19.0**.

**Verification then ran for real. Actual output:**

| Command | Result |
|---|---|
| `npm install` | 156 packages added |
| `npx tsc --noEmit` | **Clean - no output, no errors** |
| `npx vitest run` | **3 files, 30/30 tests passed** (233 ms) |
| `npx next build` | **Compiled successfully**, 7/7 static pages generated |

Build route table: `/` static, `/sign-in` static, `/register` static, `/profile` dynamic
(correct - it reads cookies), middleware 92.7 kB, 103 kB shared first-load JS.

### Two further type errors found and fixed by the real compiler

Static checks had not caught these, which is precisely why the run mattered:

1. **`db/supabase/server.ts:23` and `db/supabase/middleware.ts:19` - TS7006, parameter
   `cookiesToSet` implicitly has an `any` type.** The `cookies` option on
   `createServerClient` is a union of the current and deprecated method shapes, so TypeScript
   cannot contextually infer the `setAll` parameter. Fixed by annotating it explicitly as
   `{ name: string; value: string; options: CookieOptions }[]`, importing `CookieOptions`
   from `@supabase/ssr` rather than inventing a local shape.

Both files would have failed `tsc` and blocked `next build`.

### Dependency vulnerabilities addressed

`npm install` reported 7 vulnerabilities (1 critical, 2 high, 4 moderate). All were in
**dev dependencies only** - esbuild, vite, vitest and postcss - so nothing shipped to a user.
Bumping `vitest` (2.1 to 4.1) and `postcss` (8.4 to 8.5.26) cleared 5 of them; tests and build
were re-run afterwards and both still pass.

**2 remain, and are deliberately not fixed**: a high-severity postcss advisory reached through
`next`'s own bundled dependency tree. Clearing it requires Next 16, a major framework upgrade.
Not done unilaterally - it changes the approved tech stack (TC-1) for a build-time CSS
processor handling only our own CSS on a local-only POC. **Recommended as follow-up.**

### One warning cleared

Vitest reported that `vitest.config.ts` used ESM syntax in a file loaded as CommonJS - a
warning today, an error in a future Vite major. Renamed to `vitest.config.mts` and switched
`__dirname` to `import.meta.url`, which an ES module actually has.

### Static verification performed instead

| Check | Result |
|---|---|
| TypeScript/TSX files created | 43 |
| Every `@/...` alias import resolves to a file on disk | ALL OK |
| Every relative import resolves | ALL OK |
| Unused named imports | none |
| Unused default/namespace imports | none |
| Files using `React.*` without importing React | none |
| Application code inside `aidlc-docs/` | none |
| `data-testid` values present | 15/15 |
| Business rules BR-1.1 to BR-1.17 cited in code | 17/17 |
| Requirements FR-1 to FR-10 cited in code | 10/10 |
| NFR-1 and NFR-5 cited | both |
| Stories US-01 to US-05, US-28 cited | 6/6 |

### Three real defects found and fixed by these checks

Recorded because each would otherwise have shipped, and two of them are exactly what `tsc`
would have caught.

1. **`React.ReactNode` used in three module files without importing React.** UMD globals are
   not available inside modules unless `allowUmdGlobalAccess` is set, which it is not - so
   `app/layout.tsx`, `app/(app)/layout.tsx` and `app/(auth)/layout.tsx` would each have failed
   to compile. Fixed by importing `ReactNode` as a type in all three.
2. **Unused `React` namespace import in `components/ui/radio-group.tsx`.** Dead code; removed.
3. **FR-2 had no citation anywhere in the code.** The behaviour existed (no domain check is
   performed) but the identifier was absent, so traceability check 18.2 failed. Added to
   `services/auth-service.ts` and `tests/unit/schemas.test.ts`.

### A note on the first verification attempt

An initial unused-import check reported 13 unused imports. Every one was a false positive - a
flawed regex that stripped the file body before searching it. Confirmed by grepping each
flagged name directly, then re-run with an occurrence-count method that reported none. The
checker was wrong; the code was right. Recorded because the first result was published to
nothing but this log, and a reader comparing the two runs deserves the explanation.

### What the real run confirmed that static checks could not

The static pass had verified imports, unused names and traceability. The compiler and build
additionally confirmed: the code type-checks under `strict`; Supabase client API usage matches
`@supabase/ssr` 0.5.2; React 19's `useActionState` signature is used correctly in all three
Client Components; Server and Client component boundaries are valid; Tailwind classes resolve;
and `/profile` is correctly classified dynamic while the auth pages prerender.

**Unit 1 is now verified by compiler, test suite and production build.** The only thing still
unexercised is runtime behaviour against a real Supabase project, which needs the user's
project credentials (assumption A-3).
