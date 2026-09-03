# Business Rules - Unit 3 Requests and Matching

**Phase**: CONSTRUCTION - Unit 3, Functional Design, Phase 2

Rules numbered `BR-3.n`. Units 1 and 2 rules remain in force and are cited where reused.

---

## Requesting a Seat

### BR-3.1 - Five preconditions, checked in order
A seat request is created only when all five pass. Order matters: the cheapest and most
informative checks come first, so a passenger is told the most useful thing.

| # | Precondition | Failure |
|---|---|---|
| 1 | The caller is signed in | `NOT_PERMITTED` |
| 2 | The caller's profile is complete (reuses BR-1.9) | `PROFILE_INCOMPLETE` |
| 3 | The ride exists, is `active`, and has not departed | `NOT_FOUND` |
| 4 | The caller is not the ride's driver | `SELF_REQUEST` |
| 5 | The caller has no active request on this ride | `DUPLICATE_REQUEST` |
| 6 | The ride has a seat free | `RIDE_FULL` |

**Requirements**: FR-6, FR-22, FR-24, FR-26 · **Verified by**: US-14, US-15, US-17

Precondition 2 is the **second** of the two gate call sites BR-1.10 permits. There are now
exactly two, as specified, and no more.

### BR-3.2 - Each request is for exactly one seat
No quantity is offered, stored or accepted.
**Requirements**: FR-22 · **Verified by**: US-14

This is what makes the capacity guarantee a row count rather than a sum, and it should not be
relaxed without revisiting BR-3.8.

### BR-3.3 - Requests carry no message, and rejections carry no reason
No text field exists on either.
**Requirements**: FR-23 · **Verified by**: US-14

### BR-3.4 - A driver may not request a seat on their own ride
Refused **server-side**, not merely hidden in the interface. A request submitted directly to
the server, bypassing the UI, is rejected.
**Requirements**: FR-24 · **Verified by**: US-15

Unit 2 produced the own-ride marker (BR-2.23) so the interface could suppress the action. A
marker is not enforcement; this rule is.

### BR-3.5 - A passenger may hold several requests at once
Pending requests on **different** rides are permitted, including on the same date.
**Requirements**: FR-25 · **Verified by**: US-16

### BR-3.6 - Accepting one request does not withdraw the passenger's others
A passenger may end up accepted on two rides for the same date; they are expected to withdraw
the surplus themselves (BR-3.12).
**Requirements**: FR-25 · **Verified by**: US-16

`requirements.md` records this as explicitly out of scope under Q11=A. Stated as a positive
rule so its absence is not read as a bug.

### BR-3.7 - At most one active request per passenger per ride
Active means `pending` or `accepted`. A terminal earlier request does **not** block a fresh one.
**Requirements**: FR-26, A-1 · **Verified by**: US-17

Enforced by a partial unique constraint, not an application check - a check would leave the
read-then-write window FR-33 rejects, and a duplicate would corrupt the seat arithmetic.

---

## The Capacity Guarantee - correctness critical

### BR-3.8 - Accepted requests must never exceed the ride's seat count
**Requirements**: FR-31 · **Verified by**: US-22

### BR-3.9 - Enforcement is a row-locking database operation
Acceptance locks the ride row, counts accepted requests, and writes only if there is room.
Concurrent acceptances on one ride serialise.
**Requirements**: FR-32, FR-33 · **Verified by**: US-22 · **Source**: FQ2=A

### BR-3.10 - Application-layer checking is not sufficient and is not relied upon
The service performs **no** capacity check of its own. It calls the guarded operation and
surfaces the outcome.
**Requirements**: FR-33 · **Verified by**: US-22

Duplicating the check would recreate the very window FR-33 rejects, and would make it ambiguous
which check is authoritative. One check, in one place, reached through one method.

### BR-3.11 - Exactly one write path sets `accepted`
No other operation in any layer sets a request to `accepted`.
**Requirements**: FR-31 to FR-33 · **Verified by**: US-22

This is what makes BR-3.8 a property of the system rather than a convention.

---

## Answering and Withdrawing

### BR-3.12 - A passenger may withdraw their own request
`pending` or `accepted` moves to `withdrawn`. Withdrawing an accepted request **returns the
seat to the pool** - because seats remaining is derived from the accepted count, this happens
automatically with no counter to adjust.
**Requirements**: FR-29 · **Verified by**: US-20

### BR-3.13 - Only the ride's owner may accept or reject
Checked in the service **and** by a database policy (NFR-1).
**Requirements**: FR-28 · **Verified by**: US-19

### BR-3.14 - Only `pending` requests may be accepted or rejected
Any other current status yields `INVALID_STATE`.
**Requirements**: FR-35 · **Verified by**: US-19

### BR-3.15 - Acceptance is irreversible
No operation moves a request from `accepted` back to `pending` or to `rejected`. A driver who
changes their mind has no in-app route.
**Requirements**: FR-35 · **Verified by**: US-19

Deliberate: with no messaging (FR-23) there would be no way to explain a reversal to the
passenger. The passenger can still withdraw (BR-3.12), and both parties have each other's
phone number by then (FR-30).

### BR-3.16 - Rejection carries no reason and no notification
The passenger sees the status when they next open the app.
**Requirements**: FR-23, FR-42 · **Verified by**: US-19

---

## State and Lifecycle

### BR-3.17 - Five stored statuses, EXPIRED derived
`pending`, `accepted`, `rejected`, `withdrawn`, `cancelled` are stored. EXPIRED is computed at
read time: still `pending` **and** the ride has departed.
**Requirements**: FR-34, FR-35, FR-36, FR-37 · **Source**: FQ1=A

### BR-3.18 - Pending requests are never expired early
No mechanism expires a request before its ride departs, and no scheduled job exists.
**Requirements**: FR-36 · **Verified by**: US-23

### BR-3.19 - The complete transition table
Every legal transition, with its guard. Anything absent from this table is illegal.

| From | To | Trigger | Guard |
|---|---|---|---|
| (none) | `pending` | Passenger requests | All six of BR-3.1 |
| `pending` | `accepted` | Driver accepts | Owns the ride; a seat is free (BR-3.9) |
| `pending` | `rejected` | Driver rejects | Owns the ride |
| `pending` | `withdrawn` | Passenger withdraws | Owns the request |
| `accepted` | `withdrawn` | Passenger withdraws | Owns the request |
| `pending` | `cancelled` | Driver cancels the ride | The trigger, automatically |
| `accepted` | `cancelled` | Driver cancels the ride | The trigger, automatically |
| `pending` | *EXPIRED* | Ride departs | Derived, not written |

Seven stored transitions plus the derived one, matching FR-35. `accepted`, `rejected`,
`withdrawn` and `cancelled` are terminal.
**Requirements**: FR-34, FR-35 · **Verified by**: US-19, US-20, US-23, US-24

### BR-3.20 - Cancelling a ride cascades to every non-terminal request
Both `pending` and `accepted` requests move to `cancelled`. No request on a cancelled ride
remains in an active state.
**Requirements**: FR-38 · **Verified by**: US-24

### BR-3.21 - The cascade is enforced by a database trigger
It fires on the `rides` status change itself, so it cannot be bypassed by any code path.
**Requirements**: FR-38 · **Verified by**: US-24 · **Source**: FQ4=A

**Mandatory mitigation**: because a trigger is invisible at the call site, the comment Unit 2
left in `cancelRide` as the cascade's insertion point must be **rewritten to name the trigger**,
not deleted. A reader of the service must still learn that cancelling a ride affects requests.

### BR-3.22 - `C9.cancelRequestsForRide` is not implemented
Application Design listed it. With BR-3.21's trigger it is unnecessary, and calling it too
would double-cancel - harmlessly but confusingly.
**Source**: FQ4=A · **Deviation from**: `application-design/component-methods.md`

Recorded as a deliberate improvement, not an omission: a data-integrity cascade belongs in the
database, where it cannot be forgotten.

---

## Contact Disclosure

### BR-3.23 - Contact details are released only on ACCEPTED, and to both parties
Once a request is `accepted`, the passenger sees the driver's phone and email and the driver
sees the passenger's. In every other status, neither sees the other's.
**Requirements**: FR-30 · **Verified by**: US-21

### BR-3.24 - Release is enforced by a database policy
An RLS policy on `profiles` permits select when an accepted request links caller and subject in
either direction.
**Requirements**: FR-30, NFR-1, NFR-2 · **Verified by**: US-21, US-27 · **Source**: FQ3=A

A bug in application code cannot leak a phone number: the database returns no row.

### BR-3.25 - Disclosure is a consequence of state, never a write
Acceptance copies no contact data anywhere. The fields simply stop being withheld.
**Requirements**: FR-20, FR-30 · **Verified by**: US-21, US-27

This is why FR-20 and FR-30 are one rule rather than two features, and why a rejected or
withdrawn request closes the window again automatically.

### BR-3.26 - A driver sees no contact details before accepting
A pending request shows the requester's name and pickup area only.
**Requirements**: FR-27 · **Verified by**: US-13, US-18

This completes US-13, partially satisfied since Unit 2.

### BR-3.27 - `PublicProfile` is not widened
The accepted-pair path returns a distinct, richer type. "A profile with contact details" and "a
profile without" stay different things in the type system.
**Requirements**: NFR-2 · **Verified by**: US-27

A single type with sometimes-null contact fields would make every call site decide whether to
trust them, which is exactly the diffusion the projection exists to prevent.

---

## Views

### BR-3.28 - A driver's ride shows all its requests, terminal ones separated
Pending and accepted prominent; rejected, withdrawn and cancelled visually separated or
collapsed.
**Requirements**: FR-39 · **Verified by**: US-25 · **Source**: FQ8=A

Completes US-25, partially satisfied since Unit 2.

> **CORRECTION, made during Build and Test.** This rule originally said "all six statuses
> appear". **Only five can.** Every view filters to upcoming rides (FR-41, Q16=A), so a request
> whose ride has departed is never on screen - and a derived-EXPIRED request is *by definition*
> one whose ride has departed.
>
> The requirements are self-consistent: US-23's own criteria say an expired request "is not shown
> among my upcoming requests". It was this rule's summary that overstated it.
>
> **Consequence, deliberately left as-is**: `displayStatus`'s expired branch and
> `RequestStatusBadge`'s "Ride left before this was answered" label are correct, unit-tested,
> and unreachable through the UI as the views are currently scoped. They become reachable the
> moment a history view is added - which Q16=A put out of scope. Removing them would mean
> deleting correct logic that the next feature needs.

### BR-3.29 - My Requests lists the caller's own requests on upcoming rides
With the ride's details, the driver's name, and the current status - including derived EXPIRED.
**Requirements**: FR-40, FR-41 · **Verified by**: US-26

### BR-3.30 - Status is discoverable only in the app
Nothing is emailed or pushed, on any transition.
**Requirements**: FR-42 · **Verified by**: US-19, US-26

Known limitation, recorded in `requirements.md` Section 9.2: an accepted passenger learns of a
cancellation only by opening the app. BR-3.20 guarantees the status they eventually see is
correct, not that they see it promptly.

### BR-3.31 - Both views are reachable regardless of role
`role` gates nothing (FR-7).
**Requirements**: FR-7 · **Reuses**: BR-2.30

---

## Authorization (both layers, NFR-1)

### BR-3.32 - Database layer
| Object | Read | Write |
|---|---|---|
| `ride_requests` | The passenger who made it, or the driver of its ride | Insert where `passenger_id` is the caller; update own request (withdraw) or a request on own ride (accept/reject) |
| `profiles` | Owner, **or an accepted-pair counterparty** (BR-3.24) | Owner only, unchanged |
| `public_profiles` | Any authenticated employee, unchanged | None |
| `rides` | Unchanged from Unit 2 | Unchanged, plus the cascade trigger |

### BR-3.33 - Service layer
Every method resolves the caller through C13 and re-checks ownership before acting, even where
a policy also enforces it. That duplication is NFR-1's defence in depth.
**Reuses**: BR-1.17, BR-2.32

---

## New Failure Outcomes

Unit 3 adds the four codes Units 1 and 2 deliberately left undefined.

| Outcome | Raised when | Rule |
|---|---|---|
| `SELF_REQUEST` | A driver requests a seat on their own ride | BR-3.4 |
| `DUPLICATE_REQUEST` | An active request on that ride already exists | BR-3.7 |
| `RIDE_FULL` | No seat is free, at request time or acceptance time | BR-3.1, BR-3.9 |
| `INVALID_STATE` | A transition is not legal from the current status | BR-3.14, BR-3.19 |

`RIDE_FULL` is raised in two places with different weight. At request time it is a courtesy so
a passenger is not invited to ask for a full ride. **At acceptance time it is the guarantee** -
and that is the one that must be a database outcome rather than an application check.

---

## Rule Coverage

| Requirement | Rules |
|---|---|
| FR-22 | BR-3.1, BR-3.2 |
| FR-23 | BR-3.3, BR-3.16 |
| FR-24 | BR-3.4 |
| FR-25 | BR-3.5, BR-3.6 |
| FR-26 | BR-3.7 |
| FR-27 | BR-3.26 |
| FR-28 | BR-3.13, BR-3.14 |
| FR-29 | BR-3.12 |
| FR-30 | BR-3.23, BR-3.24, BR-3.25 |
| FR-31 | BR-3.8, BR-3.11 |
| FR-32 | BR-3.9 |
| FR-33 | BR-3.9, BR-3.10 |
| FR-34, FR-35 | BR-3.17, BR-3.19 |
| FR-36 | BR-3.18 |
| FR-37 | BR-3.17 |
| FR-38 | BR-3.20, BR-3.21, BR-3.22 |
| FR-39 | BR-3.28 |
| FR-40, FR-41 | BR-3.29 |
| FR-42 | BR-3.30 |
| FR-6 | BR-3.1 |
| FR-7 | BR-3.31 |
| FR-20 | BR-3.25, BR-3.26 |
| NFR-1 | BR-3.32, BR-3.33 |
| NFR-2 | BR-3.24, BR-3.27 |
| A-1 | BR-3.7 |

All requirements in Unit 3's scope have at least one governing rule.
