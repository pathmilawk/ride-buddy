# Code Generation Plan - Unit 2 Ride Offering and Discovery

**Phase**: CONSTRUCTION
**Unit**: Unit 2 - Ride Offering and Discovery
**Stage**: Code Generation, Part 1 - Planning
**Date**: 2026-09-03
**Status**: Awaiting approval

> **This plan is the single source of truth for Code Generation of Unit 2.**

---

## Step 1: Unit Context

### Stories implemented

| Story | Title | Tags | Extent in this unit |
|---|---|---|---|
| US-06 | Offer a ride to the office | `[DEMO PATH]` | Full |
| US-07 | Add a note to my ride | | Full |
| US-08 | Offer a ride home from the office | | Full |
| US-09 | Correct a ride I got wrong | | Full |
| US-10 | Stop seeing rides that have already left | | Full |
| US-11 | Search for a ride | `[DEMO PATH]` | Full |
| US-12 | See enough about a ride to decide | `[DEMO PATH]` | Full except the full-ride marker, which nothing can trigger yet |
| US-13 | Not be able to see contact details I have not earned | `[DEMO PATH]` | **Partial** - search half only |
| US-25 | See the rides I am driving | | **Partial** - no request list |
| US-27 | Have my contact details withheld at the source | | **Partial** - browsing half only |

### Dependencies on other units
**Unit 1**, complete and verified. All seven of its contracts are in place: the completeness
gate, `profiles.id` as the auth user id, areas, `Result`, server-side identity, and
`AreaSelect`.

### Database entities owned by this unit
`rides`, plus a **public profile view** over Unit 1's `profiles`.

### Interfaces this unit must provide to Unit 3
Eight contracts, from `business-logic-model.md`. The three that most shape this unit's code:
1. `rides.seats` authoritative, nothing caching a remaining figure
2. Past rides retained, not deleted, so FR-37 can derive EXPIRED
3. Cancellation as a single `status` transition with a **named insertion point** for FR-38's
   cascade

And the obligation it deliberately does **not** discharge: the public view cannot serve FR-30.

### Design inputs
`functional-design/domain-entities.md` · `business-rules.md` (BR-2.1 to BR-2.32) ·
`business-logic-model.md` (6 flows) · `frontend-components.md` (21 new testids)

---

## Step 2: Code Location

Workspace root, per `aidlc-state.md`. Units do not appear in the tree (UQ6=A), so this unit's
code lands in the established layout.

### Exact paths

**New files**
```
supabase/migrations/0004_rides.sql
supabase/migrations/0005_public_profiles.sql
db/repositories/ride-repository.ts
lib/contact-projection.ts          C10 - PublicProfile type + read path
lib/ride-derivations.ts            pure: seats remaining, full flag, own-ride flag
services/ride-service.ts           C8
features/rides/actions.ts
features/rides/components/RideForm.tsx
features/rides/components/RideCard.tsx
features/rides/components/CancelRideButton.tsx
features/rides/components/MyRidesList.tsx
features/search/components/SearchFilters.tsx
features/search/components/SearchResults.tsx
app/(app)/rides/page.tsx
app/(app)/rides/new/page.tsx
app/(app)/search/page.tsx
tests/unit/ride-derivations.test.ts
tests/unit/ride-schemas.test.ts
tests/unit/contact-projection.test.ts
```

**Modified in place** (never duplicated)
```
lib/types.ts          add Ride, RideStatus, PublicProfile, RideSearch types
lib/schemas.ts        add rideCreateSchema, rideSearchSchema
components/AppNav.tsx add Search and My Rides links
README.md             update status table and setup steps
```

---

## Stated Technical Decisions

Object at the approval gate and I will revise.

| Decision | Choice | Rationale |
|---|---|---|
| Date/time input to storage | Two form fields combined into one UTC instant at the action boundary | FQ1=A stores `departs_at`; BR-2.2 |
| Date filtering | Half-open range `[startOfDay, startOfNextDay)` on `departs_at` | Indexable; avoids `::date` casts that defeat an index |
| Public profile access | A Postgres **view** with `security_invoker` left at its default of **false** | See the correction below - I had this backwards in the approved plan |
| Seats remaining | Derived in a pure function from ride + accepted count | FQ2=A, and keeps it unit-testable |
| Test additions | 3 pure-function suites | Extends the Unit 1 pattern; see the note below |

### Test scope note

Q20=A scoped automated testing to "seat availability and request state transitions". **Seat
availability begins here** - `lib/ride-derivations.ts` computes seats remaining and the full
flag - so unlike Unit 1, this unit has work squarely inside the approved scope. The three
suites are: ride derivations, the two new schemas, and the contact projection.

The projection suite is the one I would argue for hardest: it asserts that a `PublicProfile`
carries no contact fields, so if someone later widens the view or the type, a test fails
rather than a phone number quietly appearing in search results.

---

## EXECUTION STEPS

Dependency order, as in Unit 1.

### Step 1 - Database Migration Scripts
*Stories: US-06, US-13 · Rules: BR-2.2, BR-2.24, BR-2.31*
- [x] 1.1 `0004_rides.sql` - `ride_status` enum, `rides` table, FKs (driver cascade, areas restrict), seats check 1-8, indexes for the search predicate
- [x] 1.2 `0004_rides.sql` - RLS: any authenticated user selects `active` rides; a driver selects their own regardless of status; insert only where `driver_id = auth.uid()`; update own row only
- [x] 1.3 `0005_public_profiles.sql` - view exposing `id`, `display_name`, `home_area_id`, `role` **only**, with `security_invoker` left at its default of `false`, granted to authenticated
- [x] 1.4 Record in `0005` that this view **cannot** serve FR-30 and that Unit 3 must add its own path
- [x] 1.5 Verify both migrations are additive - nothing in `0001`-`0003` altered or dropped
- [x] 1.6 Confirm no ride seed data: rides need real `driver_id` values, so they cannot be seeded from SQL for the same reason profiles cannot (Unit 1's seed already records this)

### Step 2 - Repository Layer Generation
*Component: C3 · Rules: BR-2.14, BR-2.16, BR-2.21*
- [x] 2.1 `lib/types.ts` - add `RideStatus`, `Ride`, `RideWithDriver`, `PublicProfile`
- [x] 2.2 `db/repositories/ride-repository.ts` - `create`, `findById`, `markCancelled`, `searchUpcoming`, `listUpcomingByDriver`, `countAcceptedByRideIds`
- [x] 2.3 `countAcceptedByRideIds` returns zero for every ride in Unit 2 and reads `ride_requests` from Unit 3 onward - implement the seam now so Unit 3 changes one function, not every caller
- [x] 2.4 Confirm repositories apply no rules and no projection

### Step 3 - Repository Layer Unit Testing
- [x] 3.1 No repository tests - thin wrappers, no logic, and verification needs a live database (Q20=A). **Deliberate, as in Unit 1.**

### Step 4 - Repository Layer Summary
- [x] 4.1 Write `code/repository-layer-summary.md`

### Step 5 - Business Logic Generation
*Components: C8, C10, C11 · Rules: BR-2.1 to BR-2.32*
- [x] 5.1 `lib/schemas.ts` - add `rideCreateSchema` (future date, seats 1-8, note max 280, **no same-area rule** per BR-2.4) and `rideSearchSchema` (lenient parse per the design)
- [x] 5.2 `lib/ride-derivations.ts` - pure `seatsRemaining`, `isFull`, `isOwnRide`, and the date-range helper
- [x] 5.3 `lib/contact-projection.ts` - C10: `PublicProfile` type and the view read path
- [x] 5.4 `services/ride-service.ts` - C8: `createRide` (calls `assertCanAct` first), `cancelRide` (ownership + **the named cascade insertion point, commented**), `searchRides`, `listMyRides`, `getRideForViewer`
- [x] 5.5 Confirm C8 exposes **no** `updateRide` - FR-15 is enforced by its absence
- [x] 5.6 Confirm no new `BusinessOutcome` codes are added (BR-2.10's table)
- [x] 5.7 Confirm every non-owner profile read goes through C10

### Step 6 - Business Logic Unit Testing
*Requirement: NFR-6 - and unlike Unit 1, squarely inside Q20=A's scope*
- [x] 6.1 `tests/unit/ride-derivations.test.ts` - seats remaining across zero, partial and full; never negative; own-ride flag
- [x] 6.2 `tests/unit/ride-schemas.test.ts` - future-date rejection, seat bounds 1-8, note length, **that a same-area ride is accepted** (BR-2.4), lenient search parsing
- [x] 6.3 `tests/unit/contact-projection.test.ts` - a `PublicProfile` carries no `phone` or `email`, so widening the view or type fails a test

### Step 7 - Business Logic Summary
- [x] 7.1 Write `code/business-logic-summary.md`

### Step 8 - Action Layer Generation
*Component: C14 · Stories: US-06, US-09*
- [x] 8.1 `features/rides/actions.ts` - `createRideAction`, `cancelRideAction`
- [x] 8.2 `createRideAction` combines date and time into one instant before delegating
- [x] 8.3 On `PROFILE_INCOMPLETE`, redirect to `/profile?missing=...` - closing the loop Unit 1 built (BR-1.11)
- [x] 8.4 Confirm both actions are the four-line shape with no business rules
- [x] 8.5 **No search action** - search is a navigation, not a mutation (FQ6=A)

### Step 9 - Action Layer Unit Testing
- [x] 9.1 No action tests. Logic-free by construction; covered through the services. **Deliberate.**

### Step 10 - Action Layer Summary
- [x] 10.1 Write `code/action-layer-summary.md`

### Step 11 - Frontend Components Generation
*Component: C15 · Stories: US-06 to US-13, US-25*
- [x] 11.1 `features/rides/components/RideForm.tsx` - Client; seats as a 1-8 select
- [x] 11.2 `features/rides/components/RideCard.tsx` - Server; `search` and `mine` variants
- [x] 11.3 `features/rides/components/CancelRideButton.tsx` - Client; inline confirm (BR-2.10)
- [x] 11.4 `features/rides/components/MyRidesList.tsx` - Server; list or empty state
- [x] 11.5 `features/search/components/SearchFilters.tsx` - Client; navigates, does not post
- [x] 11.6 `features/search/components/SearchResults.tsx` - Server; list or empty state
- [x] 11.7 `app/(app)/rides/page.tsx` - My Rides
- [x] 11.8 `app/(app)/rides/new/page.tsx` - loads areas
- [x] 11.9 `app/(app)/search/page.tsx` - reads `searchParams`, prefills from profile (BR-2.18)
- [x] 11.10 `components/AppNav.tsx` - add Search and My Rides links (modify in place)
- [x] 11.11 Apply all 21 `data-testid` values, passing distinct `testId` to each `AreaSelect`
- [x] 11.12 Confirm the Unit 1 responsive shell is inherited, not restated

### Step 12 - Frontend Components Unit Testing
- [x] 12.1 No component tests - Q20=A excludes UI testing, no DOM environment configured. **Deliberate.**

### Step 13 - Frontend Components Summary
- [x] 13.1 Write `code/frontend-components-summary.md`

### Step 14 - Documentation
- [x] 14.1 Update `README.md` - status table, the two new migrations, what is now demonstrable

### Step 15 - Deployment Artifacts
- [x] 15.1 No change. No new environment variables and no new dependencies; TC-7 remains local-only. **Deliberate.**

### Step 16 - Verification
- [x] 16.1 Verify all 10 stories have implementing code, to their stated extent
- [x] 16.2 Verify FR-11 to FR-21, FR-34, FR-39, FR-41, NFR-2 are implemented
- [x] 16.3 Verify BR-2.1 to BR-2.32 each have implementing code or a recorded reason
- [x] 16.4 Verify no application code in `aidlc-docs/`
- [x] 16.5 Verify the 8 downstream contracts to Unit 3 are satisfied
- [x] 16.6 Verify Unit 1 files were modified in place, with no duplicates created
- [x] 16.7 **Run `npx tsc --noEmit`, `npx vitest run`, `npx next build` and report actual output**
- [x] 16.8 Verify all 21 new `data-testid` values are present
- [x] 16.9 Confirm Unit 1's 30 tests still pass - no regression

---

## Step 5: Plan Summary

| | |
|---|---|
| Total steps | 16 |
| Sub-steps | 55 |
| New files | 19 |
| Files modified in place | 4 |
| Stories covered | 10, three of them partially by design |
| Business rules | BR-2.1 to BR-2.32 |
| New test files | 3 |
| Steps deliberately generating nothing | 4 (3.1, 9.1, 12.1, 15.1) |

**Verification can actually run this time.** Node 26.8.1 is installed, so step 16.7 will
produce real compiler and test output rather than a blocked note.


---

## CORRECTION to a stated technical decision

**The approved plan said the public profile view should use `security_invoker = true`. That was
wrong, and it would have broken FR-19.**

PostgreSQL semantics: `security_invoker` defaults to `false`, which executes the view with the
**view owner's** privileges, so RLS policies on the underlying table are checked against the
owner rather than the querying user. Setting it to `true` executes the view as the **caller**,
which means Unit 1's owner-only policy on `profiles` (BR-1.16) would apply - and the view would
return **only the caller's own row**.

That is the opposite of what FR-19 needs. A driver's name must be visible to any employee
browsing search results.

**The correct design, now implemented**: leave `security_invoker` at its default of `false`, so
the view reads past the base table's RLS, and grant select on the view to authenticated. This is
safe precisely because of the view's shape - it carries only `id`, `display_name`,
`home_area_id` and `role`. A view that bypasses RLS is a footgun when it exposes sensitive
columns; here the columns it exposes are the non-sensitive ones by construction, and `phone` and
`email` are not among them.

The base `profiles` table keeps its owner-only policies unchanged, so the only route to another
employee's data is this deliberately narrow view.

**Recorded rather than quietly fixed**, because the erroneous decision was in the plan the
product owner approved.


---

## Step 16 Verification Results - actual output

Node 26.8.1 was installed during Unit 1, so this ran for real.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **Clean** |
| `npx vitest run` | **6 files, 73/73 tests passed** (291 ms) |
| `npx next build` | **Compiled successfully in 3.1s**, 10/10 static pages |

Route table: `/`, `/register`, `/sign-in` static; `/profile`, `/rides`, `/rides/new`,
`/search` **dynamic** - correct, all four read cookies. Middleware 92.7 kB.

**16.9 - no regression.** Unit 1's 30 tests still pass; the suite went from 30 to 73.

### Traceability, completed after an initial gap

The first verification pass found citations missing even though the behaviour existed:
7/10 stories, 12/14 requirements and 20/32 business rules were cited in code. Rather than
claim the checks passed, the missing citations were added across eight files - the migration,
the repository, derivations, schemas, the service, `RideCard`, the contact projection and the
My Rides page.

| Check | First pass | Final |
|---|---|---|
| 16.1 Stories cited | 7/10 | **10/10** |
| 16.2 Requirements cited | 12/14 | **14/14** |
| 16.3 Business rules cited | 20/32 | **32/32** |

### Other checks

| Check | Result |
|---|---|
| 16.4 Application code inside `aidlc-docs/` | none |
| 16.5 Unit 3 downstream contracts satisfied | 8/8 |
| 16.6 Duplicate or `_modified` files created | none - Unit 1 files edited in place |
| 16.8 New `data-testid` values present | 21/21 |
| Alias imports resolve | ALL OK |
| Unused imports | none |

### Two type errors found by the compiler

1. **`security_invoker = true` in the approved plan was wrong** - caught while writing the
   migration, not by the compiler, but it belongs in this list. It would have made the public
   profile view return only the caller's own row, breaking FR-19. Corrected to the default of
   `false`, with the reasoning recorded in `0005_public_profiles.sql` and in the plan.
2. **TS2352 x2 in `contact-projection.test.ts`** - casting `PublicProfile` to
   `Record<string, unknown>` was refused because the type has no index signature. Fixed with
   an explicit double cast, and the requirement itself documented in the test: TypeScript will
   not let a caller reach for a field that does not exist, which is the projection's point.
