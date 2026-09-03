# Code Generation Plan - Unit 3 Requests and Matching

**Phase**: CONSTRUCTION
**Unit**: Unit 3 - Requests and Matching (**final unit**)
**Stage**: Code Generation, Part 1 - Planning
**Date**: 2026-09-03
**Status**: Awaiting approval

> **This plan is the single source of truth for Code Generation of Unit 3.**

---

## Step 1: Unit Context

### Stories implemented

12 assigned: US-14 to US-24, US-26. Five carry tags - US-14, US-18, US-19, US-21, US-22 are
`[DEMO PATH]`; US-15, US-17, US-22, US-24 are `[PROMOTED]`.

**Plus three carried forward from Unit 2, which this unit must complete and re-verify in full**:

| Story | What completes it here |
|---|---|
| US-13 | A driver's pending-request list shows no requester contact details |
| US-25 | The per-ride request list, and the accept/reject actions |
| US-27 | Pending-request output, and accepted-request output including contact fields |

**With this unit, all 28 stories should be complete.**

### Requirements
FR-22 to FR-38, FR-40, FR-41, FR-42, A-1, and the Unit 2 halves of FR-20, FR-27, FR-30, FR-39

### Entities owned
`ride_requests`

### Interfaces to other units
Consumes all eight of Unit 2's contracts. Provides none - nothing follows this unit.

### Design inputs
`functional-design/domain-entities.md` · `business-rules.md` (BR-3.1 to BR-3.33) ·
`business-logic-model.md` (10 flows) · `frontend-components.md` (16 new testids)

---

## Step 2: Code Location

Workspace root. Units are invisible in the tree (UQ6=A).

### New files
```
supabase/migrations/0006_ride_requests.sql
supabase/migrations/0007_accept_request_function.sql
supabase/migrations/0008_cancel_ride_cascade_trigger.sql
supabase/migrations/0009_accepted_pair_profile_policy.sql
db/repositories/ride-request-repository.ts
lib/request-transitions.ts              pure: legal transitions, guards, derived EXPIRED
services/ride-request-service.ts        C9
features/requests/actions.ts            C14
features/requests/components/RequestSeatButton.tsx
features/requests/components/RideRequestList.tsx
features/requests/components/RequestDecisionButtons.tsx
features/requests/components/WithdrawRequestButton.tsx
features/requests/components/MyRequestsList.tsx
features/requests/components/RequestStatusBadge.tsx
features/requests/components/ContactDetails.tsx
app/(app)/requests/page.tsx
tests/unit/request-transitions.test.ts
tests/unit/request-expiry.test.ts
tests/unit/accepted-contact-projection.test.ts
```

### Modified in place - the seven changes named in the design
```
lib/types.ts                    add RequestStatus, RideRequest, AcceptedContact, request view types
lib/result.ts                   add RIDE_FULL, DUPLICATE_REQUEST, SELF_REQUEST, INVALID_STATE
lib/contact-projection.ts       add the accepted-pair branch and AcceptedContact
db/repositories/ride-repository.ts   countAcceptedByRideIds - replace the seam with a real count
services/ride-service.ts        cancelRide - REWRITE the insertion-point comment to name the trigger
features/rides/components/RideCard.tsx      add RequestSeatButton and ContactDetails
features/rides/components/MyRidesList.tsx   render RideRequestList per ride
components/AppNav.tsx           add a My requests link
README.md                       status table, four new migrations, what is now demonstrable
```

---

## Stated Technical Decisions

Object at the approval gate and I will revise.

| Decision | Choice | Rationale |
|---|---|---|
| Capacity function volatility and security | A `plpgsql` function, **SECURITY INVOKER** (the default) | The caller's RLS policies still apply inside it, so the function cannot be used to bypass ride ownership. A definer function would need its own ownership check, giving the rule two homes |
| How the app calls it | `supabase.rpc('accept_ride_request', ...)` | The only route that sets `accepted` (BR-3.11) |
| Trigger timing | `AFTER UPDATE ... WHEN (old.status <> 'cancelled' AND new.status = 'cancelled')` | Fires once, only on the transition, never on an unrelated update |
| Trigger security | **SECURITY DEFINER** | The cascade must update rows the driver has no direct update policy for - a pending request belongs to a passenger. This is the one place elevated rights are correct, and it is narrow: one statement, one ride |
| Migration granularity | Four files, one concern each | Table, function, trigger, policy. Easier to review and to reason about individually |
| Derived EXPIRED | Computed in a pure function from status + ride departure | Keeps it unit-testable, per FQ1=A |
| New test suites | 3 | Request transitions and expiry are **exactly** what Q20=A named |

### On the SECURITY DEFINER trigger

Worth stating plainly, since elevated rights deserve scrutiny. The cascade must set a
**passenger's** request to `cancelled` when the **driver** cancels the ride. No policy grants a
driver update rights over a passenger's request row, and adding one would be far broader than
the cascade needs - it would let a driver alter a passenger's request at any time.

A definer trigger scoped to one statement on one ride is the narrower choice. It cannot be
invoked directly; it fires only on the ride status transition, which is itself already guarded
by `rides_update_own`.

---

## EXECUTION STEPS

### Step 1 - Database Migrations
*Rules: BR-3.7, BR-3.9, BR-3.21, BR-3.24, BR-3.32*
- [x] 1.1 `0006` - `request_status` enum (five values, **no `expired`**), `ride_requests` table, FKs cascading, `decided_at` nullable
- [x] 1.2 `0006` - **partial unique index** on (ride_id, passenger_id) where status in (pending, accepted), for FR-26 / A-1
- [x] 1.3 `0006` - indexes for the two listing queries
- [x] 1.4 `0006` - RLS: passenger or ride's driver may select; passenger inserts own; passenger updates own (withdraw); driver updates requests on own ride (accept/reject)
- [x] 1.5 `0007` - **the capacity function**: lock the ride, count accepted, update only if room, return a distinguishable outcome. SECURITY INVOKER. Comment why the two rejected alternatives fail
- [x] 1.6 `0008` - the cascade trigger, SECURITY DEFINER, firing only on the transition to cancelled
- [x] 1.7 `0009` - the accepted-pair select policy on `profiles`, alongside (not replacing) `profiles_select_own`
- [x] 1.8 Verify all four are additive - nothing in 0001-0005 altered or dropped
- [x] 1.9 Confirm no request seed data - requests need real passenger ids, same constraint as profiles and rides

### Step 2 - Repository Layer
*Component: C4*
- [x] 2.1 `lib/types.ts` - add `RequestStatus` (five stored), `DisplayStatus` (six, including EXPIRED), `RideRequest`, `AcceptedContact`, `RideRequestView`
- [x] 2.2 `db/repositories/ride-request-repository.ts` - create, findById, findActiveByRideAndPassenger, **acceptWithCapacityGuarantee** (via rpc), markRejected, markWithdrawn, listByRide, listByRideIds, listUpcomingByPassenger
- [x] 2.3 **Replace `countAcceptedByRideIds`** in `ride-repository.ts` with a real grouped count
- [x] 2.4 Confirm `acceptWithCapacityGuarantee` is the only path that sets `accepted`
- [x] 2.5 Confirm no `cancelAllForRide` method - the trigger owns the cascade (BR-3.22)

### Step 3 - Repository Layer Unit Testing
- [x] 3.1 No repository tests. **Deliberate, and worth restating here**: the capacity guarantee's correctness lives in SQL, so proving it needs a live database and two concurrent transactions - out of scope per Q20=A. The *pure* parts (transition legality, expiry) are tested in Step 6. Recorded in Build and Test as the highest-value manual check

### Step 4 - Repository Layer Summary
- [x] 4.1 Write `code/repository-layer-summary.md`

### Step 5 - Business Logic
*Components: C9, C10 extension, C12 extension*
- [x] 5.1 `lib/result.ts` - add the four outcome codes
- [x] 5.2 `lib/request-transitions.ts` - pure: `canAccept`, `canReject`, `canWithdraw`, `isTerminal`, `displayStatus` (derived EXPIRED)
- [x] 5.3 `lib/contact-projection.ts` - add `findAcceptedContact` and the `AcceptedContact` type; **do not widen `PublicProfile`** (BR-3.27)
- [x] 5.4 `services/ride-request-service.ts` - C9: requestSeat (six preconditions in order), acceptRequest, rejectRequest, withdrawRequest, listRequestsForMyRide, listRequestsForRideIds, listMyRequests
- [x] 5.5 Confirm `acceptRequest` performs **no capacity check of its own** (BR-3.10)
- [x] 5.6 **Rewrite the `cancelRide` comment** in `ride-service.ts` to name the trigger (BR-3.21) - mandatory mitigation, not optional
- [x] 5.7 Confirm `C9.cancelRequestsForRide` is absent, with the reason in a comment (BR-3.22)

### Step 6 - Business Logic Unit Testing
*Q20=A named request state transitions explicitly - this is the core of it*
- [x] 6.1 `tests/unit/request-transitions.test.ts` - every legal transition from BR-3.19's table permitted; **every illegal one refused**; terminality; accept/reject/withdraw guards distinguished
- [x] 6.2 `tests/unit/request-expiry.test.ts` - pending + departed = EXPIRED; pending + future = pending; every terminal status unaffected by departure
- [x] 6.3 `tests/unit/accepted-contact-projection.test.ts` - `AcceptedContact` carries phone and email; `PublicProfile` still does not; the two remain distinct types

### Step 7 - Business Logic Summary
- [x] 7.1 Write `code/business-logic-summary.md`

### Step 8 - Action Layer
*Component: C14*
- [x] 8.1 `features/requests/actions.ts` - requestSeatAction, acceptRequestAction, rejectRequestAction, withdrawRequestAction
- [x] 8.2 `requestSeatAction` redirects to `/profile?missing=...` on `PROFILE_INCOMPLETE`, matching Unit 2's pattern
- [x] 8.3 Revalidate `/rides`, `/requests` and `/search` where a status change affects them
- [x] 8.4 Confirm the four-line shape, no business rules

### Step 9 - Action Layer Unit Testing
- [x] 9.1 No action tests. Logic-free by construction. **Deliberate.**

### Step 10 - Action Layer Summary
- [x] 10.1 Write `code/action-layer-summary.md`

### Step 11 - Frontend Components
*Component: C15*
- [x] 11.1 `RequestStatusBadge.tsx` - six statuses, distinct wording per status
- [x] 11.2 `ContactDetails.tsx` - deliberately dumb; phone as a `tel:` link
- [x] 11.3 `RequestSeatButton.tsx` - Client; disabled reason from props; inline `RIDE_FULL` error (FQ7=A)
- [x] 11.4 `RequestDecisionButtons.tsx` - Client; **no confirmation** on accept or reject, per the design's stated asymmetry
- [x] 11.5 `WithdrawRequestButton.tsx` - Client; confirms **only** when the request was accepted
- [x] 11.6 `RideRequestList.tsx` - Server; pending, then accepted, then a separated terminal group (FQ8=A)
- [x] 11.7 `MyRequestsList.tsx` - Server; list or empty state
- [x] 11.8 `app/(app)/requests/page.tsx` - My Requests
- [x] 11.9 **Modify `RideCard.tsx`** - add RequestSeatButton (suppressed on own and full) and ContactDetails
- [x] 11.10 **Modify `MyRidesList.tsx`** - render RideRequestList per ride, completing US-25
- [x] 11.11 **Modify `AppNav.tsx`** - add the My requests link
- [x] 11.12 Apply all 16 new `data-testid` values
- [x] 11.13 Confirm the Unit 1 shell is inherited

### Step 12 - Frontend Components Unit Testing
- [x] 12.1 No component tests. **Deliberate**, per Q20=A.

### Step 13 - Frontend Components Summary
- [x] 13.1 Write `code/frontend-components-summary.md`

### Step 14 - Documentation
- [x] 14.1 Update `README.md` - all three units done, four new migrations, the full demo path

### Step 15 - Deployment Artifacts
- [x] 15.1 No change. No new environment variables and no new dependencies. **Deliberate.**

### Step 16 - Verification
- [x] 16.1 Verify all 12 assigned stories have implementing code
- [x] 16.2 **Verify US-13, US-25 and US-27 are now complete** - the carried-forward finding closed
- [x] 16.3 Verify FR-22 to FR-38, FR-40 to FR-42 implemented
- [x] 16.4 Verify BR-3.1 to BR-3.33 each cited in code or with a recorded reason
- [x] 16.5 Verify all seven changes to existing code were made **in place**, no duplicates
- [x] 16.6 Verify no application code in `aidlc-docs/`
- [x] 16.7 **Run `tsc --noEmit`, `vitest run`, `next build`; report actual output**
- [x] 16.8 Verify all 16 new `data-testid` values present, 52 project-wide
- [x] 16.9 Confirm Units 1 and 2 tests still pass - no regression
- [x] 16.10 **Verify all 28 stories are now covered project-wide**

---

## Step 5: Plan Summary

| | |
|---|---|
| Steps / sub-steps | 16 / 60 |
| New files | 19 (4 migrations, 12 source, 3 tests) |
| Files modified in place | 9 |
| Stories | 12 assigned + 3 completed from Unit 2 |
| Business rules | BR-3.1 to BR-3.33 |
| New test suites | 3 |
| Steps deliberately generating nothing | 4 (3.1, 9.1, 12.1, 15.1) |

**The honest limit, stated up front**: the capacity guarantee's correctness lives in SQL and
needs two concurrent transactions against a live database to prove. Step 3.1 records that this
is out of scope for automated testing per Q20=A, and it will be carried into Build and Test as
the single highest-value manual check. **The unit tests here cover the pure transition and
expiry logic, not the concurrency contract.**


---

## Step 16 Verification Results - actual output

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **Clean** |
| `npx vitest run` | **9 files, 101/101 tests passed** |
| `npx next build` | **Compiled successfully in 2.9s**, 11/11 static pages |

Routes: `/`, `/register`, `/sign-in` static; `/profile`, `/requests`, `/rides`, `/rides/new`,
`/search` dynamic. Middleware 92.7 kB.

**16.9 - no regression.** Units 1 and 2's 73 tests still pass; the suite grew 73 to 101.

### Traceability, completed after a gap

| Check | First pass | Final |
|---|---|---|
| 16.1 Unit 3 stories cited | 10/12 | **12/12** |
| 16.2 Carried stories (US-13, US-25, US-27) | 3/3 | **3/3** |
| 16.3 Requirements cited | 20/20 | 20/20 |
| 16.4 Business rules BR-3.1 to BR-3.33 | 25/33 | **33/33** |
| **16.10 ALL 28 project stories cited** | 26/28 | **28/28** |

US-15, US-16 and eight business rules had implementing behaviour but no citation. Added across
four files.

### Three checker false positives, investigated rather than accepted

The verification script reported three of the seven required code changes as missing. All three
were flaws in the checks:

1. **`countAcceptedByRideIds` "not a real count"** - the regex used the wrong quote escaping.
   The function does read `ride_requests` filtered to `status = 'accepted'`.
2. **`MyRidesList` "has no request list"** - it passes `requestViews` to `RideCard`, which
   renders `RideRequestList`. The check looked one hop from where the render happens.
3. **`cancelRequestsForRide` "still present"** - it appears in two comments, both documenting
   its deliberate absence per BR-3.22. No definition exists anywhere.

Each was verified by grep before being dismissed. The checks were wrong; the code was right.

### Other checks

| Check | Result |
|---|---|
| 16.5 Seven changes made in place, no duplicates | 7/7, none duplicated |
| 16.6 Application code inside `aidlc-docs/` | none |
| 16.8 New `data-testid` values | 16/16; **53 project-wide** |
| Alias imports resolve | ALL OK |
| Unused imports | none |

### The honest limit, restated

**The capacity guarantee is not covered by automated tests.** Its correctness lives in
`0007_accept_request_function.sql` and requires two concurrent transactions against a live
database to demonstrate. The 101 tests cover the pure transition and expiry logic.

Nothing in this project has yet run against a live Supabase project. Carried into Build and Test
as the highest-priority verification.
