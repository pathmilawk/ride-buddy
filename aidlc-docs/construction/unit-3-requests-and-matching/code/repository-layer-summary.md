# Repository Layer Summary - Unit 3

**Plan steps**: 1 (migrations), 2 (repository), 4 (this summary) · **Component**: C4

## Files

| File | Purpose |
|---|---|
| `0006_ride_requests.sql` | `request_status` enum (five values), table, **partial unique index**, four RLS policies |
| `0007_accept_request_function.sql` | **The capacity guarantee** - a row-locking function |
| `0008_cancel_ride_cascade_trigger.sql` | FR-38's cascade, as a trigger |
| `0009_accepted_pair_profile_policy.sql` | FR-30's contact release, as an RLS policy |
| `db/repositories/ride-request-repository.ts` | C4 |
| `db/repositories/ride-repository.ts` | **Modified** - the seam replaced with a real count |

## The capacity guarantee

`accept_ride_request` locks the ride row, counts accepted requests, and writes only if there is
room. Both rejected alternatives are documented in the migration itself, including *why* the
plausible one fails: a single `UPDATE ... WHERE (subquery) < seats` reads as one statement and
therefore feels atomic, but under READ COMMITTED two updates on different request rows do not
conflict, so both see the pre-commit count and both commit.

**SECURITY INVOKER**, stated explicitly for the reader. The caller's policies apply inside it, so
a non-driver's row lock finds nothing - PostgreSQL requires both SELECT and UPDATE policies to
pass for `FOR UPDATE` - and the function returns `NOT_FOUND`. Ownership is checked in the service
too; three layers in total, deliberately.

`acceptWithCapacityGuarantee` is **the only path that sets `accepted`** (BR-3.11).

## The cascade trigger, and its one elevated privilege

`rides_cancel_cascade` is **SECURITY DEFINER**, and the migration justifies it at length. The
cascade must set a *passenger's* request to cancelled when the *driver* cancels the ride, and no
policy grants a driver that right. Adding one would be far broader than the cascade needs - it
would let a driver alter a passenger's request at any time. A definer trigger scoped to one
statement on one ride is narrower, cannot be invoked directly, and fires only on a transition
`rides_update_own` already restricts to the ride's own driver. `search_path` is pinned.

It also makes the two writes atomic for free, satisfying a transaction boundary
`application-design/services.md` named, without the service orchestrating anything.

## The seam paid off

`countAcceptedByRideIds` returned zero throughout Unit 2. Replacing **one function body** made
seats remaining real across search, My Rides and the guarantee at once, with **no call site
changed**. The number it returns is the same count of the same rows `accept_ride_request`
constrains, so display and enforcement cannot disagree.

## Other decisions worth recording

**`DuplicateActiveRequestError`** translates a `23505` unique violation into a business outcome.
The service's duplicate check is advisory; the partial unique index catches the race the check
cannot, and the error type is how that reaches the caller as `DUPLICATE_REQUEST` rather than a
crash.

**`listByRideIdsForPassenger` prefers an active request** over terminal ones, because a ride can
hold several of one passenger's requests over time (BR-3.7 permits a fresh request after a
rejection).

**No `cancelAllForRide` method** (BR-3.22). Documented in the file so its absence reads as a
decision.

## No tests, deliberately - and this one matters

Plan step 3.1. **The capacity guarantee's correctness lives in SQL**, so proving it needs a live
database and two concurrent transactions - out of scope per Q20=A. The pure parts (transition
legality, expiry derivation) are tested; the concurrency contract is not.

Carried into Build and Test as the **single highest-value manual check**.
