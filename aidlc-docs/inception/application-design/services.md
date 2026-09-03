# Services - Ride Buddy

**Stage**: INCEPTION - Application Design, Phase 3
**Decisions applied**: AQ2=A (Server Components read, Server Actions write), AQ3=A
(repositories), AQ6=C (typed business results)

This document covers **how services are invoked and how they orchestrate**. Method
signatures are in `component-methods.md`; detailed rule logic is deferred to Functional
Design.

---

## Service Inventory

| Service | Responsibility | Owns |
|---|---|---|
| **C5 AuthService** | Identity - who is calling | Sign-up, sign-in, sign-out, session read |
| **C6 ProfileService** | Employee profiles and the completeness gate | FR-6 gate |
| **C7 AreaService** | Reference data for selection controls | - |
| **C8 RideService** | Ride offering and discovery | Ride ownership checks |
| **C9 RideRequestService** | Seat request lifecycle | State transitions, cascade, expiry |

Services are stateless. Each call resolves the current user through C13 rather than holding
a session, so a service method behaves identically whether invoked from a Server Component
render or a Server Action.

---

## Invocation Model (AQ2=A)

Two entry paths, and only two:

| Path | Used for | Shape |
|---|---|---|
| **Server Component** | All reads | Component calls a service method during render; data never crosses the wire as JSON |
| **Server Action** | All writes | Form submits to an action; the action parses, delegates, and returns a `Result` |

There is no hand-written HTTP API and no client-side data fetching.

**A consequence worth stating.** Because reads happen during server render, there is no JSON
endpoint an authenticated stranger can enumerate - which strengthens NFR-2. It does **not**
remove the obligation: rendered server output is still serialised to the browser, so a phone
number included in a Server Component's data is still on the wire. **US-27 applies unchanged**,
which is exactly why every read path routes through C10 rather than relying on the transport.

---

## Orchestration: Request a Seat

The most rule-dense write path. Five preconditions before anything is written.

| # | Step | Component | Failure outcome |
|---|---|---|---|
| 1 | Parse form input | C14 action + C11 schema | validation error to the form |
| 2 | Resolve current user | C13.requireUser | `NOT_PERMITTED` |
| 3 | Check profile completeness | C6.assertCanAct | `PROFILE_INCOMPLETE` |
| 4 | Load the ride | C3.findById | `NOT_FOUND` |
| 5 | Reject self-request | C9 against ride's driver id | `SELF_REQUEST` |
| 6 | Reject duplicate active request | C4.findActiveByRideAndPassenger | `DUPLICATE_REQUEST` |
| 7 | Confirm a seat is available | C3.countAcceptedRequests | `RIDE_FULL` |
| 8 | Insert PENDING request | C4.create | throws on fault |

Step 7 is an early courtesy check so a passenger is not invited to request a full ride. It is
**not** the capacity guarantee - a request is not an acceptance, and requests are permitted to
exceed seats. The guarantee belongs to acceptance.

---

## Orchestration: Accept a Request

The correctness-critical path.

| # | Step | Component | Failure outcome |
|---|---|---|---|
| 1 | Resolve current user | C13.requireUser | `NOT_PERMITTED` |
| 2 | Load the request and its ride | C4.findById, C3.findById | `NOT_FOUND` |
| 3 | Confirm caller owns the ride | C9 | `NOT_PERMITTED` |
| 4 | Confirm request is PENDING | C9 | `INVALID_STATE` |
| 5 | **Accept under capacity guarantee** | **C4.acceptWithCapacityGuarantee** | `RIDE_FULL` |
| 6 | Return the accepted request | C9 | - |

**Step 5 carries the whole guarantee.** C9 performs no capacity check of its own. Duplicating
the check in the service would create the read-then-write window that FR-33 explicitly rules
out as insufficient, and having two checks would make it ambiguous which one is authoritative.
One check, in the database, reached through one method.

After acceptance, contact details become visible to both parties (FR-30) - not by any write,
but because C10 now sees an ACCEPTED link and stops stripping the fields. **The disclosure
is a consequence of state, not a separate action.** Nothing copies a phone number anywhere.

---

## Orchestration: Cancel a Ride

Two services cooperate, and the cascade is the point.

| # | Step | Component | Failure outcome |
|---|---|---|---|
| 1 | Resolve current user | C13.requireUser | `NOT_PERMITTED` |
| 2 | Load the ride | C3.findById | `NOT_FOUND` |
| 3 | Confirm caller owns the ride | C8 | `NOT_PERMITTED` |
| 4 | Mark the ride CANCELLED | C3.markCancelled | throws on fault |
| 5 | **Cascade every request to CANCELLED** | C9.cancelRequestsForRide via C4.cancelAllForRide | throws on fault |

**Steps 4 and 5 must not be separable in effect.** FR-38 requires that no request on a
cancelled ride remains PENDING or ACCEPTED. A ride cancelled with its accepted requests left
untouched is the failure mode this requirement exists to prevent - a passenger still believing
they hold a seat. Functional Design must make these two writes atomic.

Note the ordering dependency: C8 delegates to C9, while C9 does not call C8. This keeps the
dependency acyclic (see `component-dependency.md`).

**Known limitation, carried forward**: no notification is sent (FR-42). The cascade guarantees
the passenger sees *correct* status, not that they see it *promptly*.
`requirements.md` Section 9.2 records this.

---

## Orchestration: Search and Discovery (read path)

| # | Step | Component |
|---|---|---|
| 1 | Server Component renders search form with areas | C7.listAreas |
| 2 | Search input parsed | C11 rideSearchSchema |
| 3 | Query upcoming rides matching date and both areas | C3.searchUpcoming |
| 4 | Compute seats remaining per ride | C3.countAcceptedRequests |
| 5 | Batch-load driver profiles | C1.findManyByUserIds |
| 6 | **Project driver contact fields out** | **C10.projectMany** |
| 7 | Mark full rides and own rides | C8 |
| 8 | Render | C15 |

Step 5 is a batch read specifically so step 6 can be a single projection call over the set,
rather than a per-row decision. Making the projection batch-shaped is what keeps "every read
goes through C10" practical in list views.

---

## Service Interaction Rules

Four rules govern how services relate. Each exists to prevent a specific failure.

1. **A service may call repositories, other services, and cross-cutting components.**
2. **A repository may never call a service.** Data access stays free of orchestration.
3. **Only one service pair calls across**: C8 calls C9 for the cancellation cascade, and C8
   and C9 both call C6 for the completeness gate. C9 never calls C8. This asymmetry is
   deliberate and is what keeps the graph acyclic.
4. **Every read that returns another employee's data ends with a C10 call.** Not "should" -
   this is the enforcement point for NFR-2, and checklist item 5.4 required it to have exactly
   one home.

---

## Transaction Boundaries

Identified now because they constrain Functional Design.

| Operation | Requires atomicity | Why |
|---|---|---|
| Accept a request | **Yes - critical** | FR-31 to FR-33. Check and write cannot be separated, or concurrent acceptances both succeed. |
| Cancel a ride | **Yes** | FR-38. Ride status and request cascade must not diverge, or a passenger keeps a phantom seat. |
| Create a ride | No | Single insert. |
| Request a seat | No | Single insert; preceding checks are advisory and a duplicate is caught by the FR-26 rule. |
| Update a profile | No | Single update. |
| Withdraw a request | No | Single status update; seats remaining is derived, not stored. |

Two operations need transactions. Both are named. Everything else is a single write.

---

## Testability Consequence

NFR-6 requires unit tests over seat availability and request state transitions, and this
service design is what makes that cheap:

- **Seat availability** concentrates in `C4.acceptWithCapacityGuarantee`, one method with one
  contract, testable including the concurrent case
- **State transitions** concentrate in C9, where each transition is a method with explicit
  precondition failures
- **C10** is pure with no I/O, so the disclosure rule is testable by calling a function
- **C14 actions hold no logic**, so nothing requiring a request context needs testing
