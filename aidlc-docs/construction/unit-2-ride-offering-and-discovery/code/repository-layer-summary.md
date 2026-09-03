# Repository Layer Summary - Unit 2

**Plan steps**: 1 (migrations), 2 (repository), 4 (this summary) · **Component**: C3

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/0004_rides.sql` | `ride_status` enum, `rides` table, constraints, two indexes, four RLS policies |
| `supabase/migrations/0005_public_profiles.sql` | The public profile view and its grant |
| `db/repositories/ride-repository.ts` | C3 - create, findById, markCancelled, searchUpcoming, listUpcomingByDriver, countAcceptedByRideIds |
| `lib/types.ts` | Extended in place with `Ride`, `RideStatus`, `PublicProfile`, `RideListItem`, `RideSearchCriteria` |

## A correction to the approved plan

The plan specified the public profile view with `security_invoker = true`. **That was wrong and
would have broken FR-19.** With `security_invoker = true` a view executes as the *caller*, so
Unit 1's owner-only policy on `profiles` would apply and the view would return only the
caller's own row - no driver names in search results.

The default of `false` executes the view with the view owner's privileges, reading past the
base table's RLS. That is what is wanted, and it is safe **because of the view's column list**:
`phone` and `email` are simply not selectable through it.

Recorded rather than quietly fixed, because the erroneous decision was in a plan that had
already been approved.

## Decisions worth recording

**`countAcceptedByRideIds` is a seam, not a stub.** It returns zero for every ride, which is
correct today - no requests exist. Unit 3 replaces the body with a grouped count over
`ride_requests`. Because every caller already routes through it, Unit 3 changes one function
rather than every call site, and the number it returns is the same count of the same rows that
the capacity guarantee constrains.

**Date filtering uses a half-open range**, not a `departs_at::date = $1` predicate, because a
cast on the column would defeat `rides_search_idx`.

**No delete policy on `rides`.** Rides are cancelled, never deleted. Retention is what lets
Unit 3 derive EXPIRED for requests against departed rides (FR-37).

**Four things the schema deliberately lacks**, each an enforcement by absence: no
`seats_remaining` column (derived), no `updated_at` and no update path beyond the status
transition (FR-15), no same-area check constraint (FQ4=B), and no recurrence structure (FR-13).

## Migrations are additive

`0004` and `0005` create new objects only. Nothing in `0001`-`0003` is altered or dropped, so
Unit 1 remains independently correct and its checkpoint stays meaningful.

## No tests, deliberately

Plan step 3.1. Thin wrappers with no logic; verification needs a live database, which Q20=A
places out of scope.
