# Business Rules - Unit 2 Ride Offering and Discovery

**Phase**: CONSTRUCTION - Unit 2, Functional Design, Phase 2
**Decisions applied**: FQ3=A (limits), FQ4=B (same area permitted), FQ5=B (public view),
FQ7=C (prefilled search), FQ8=A (confirm before cancel)

Rules numbered `BR-2.n`. Unit 1's rules `BR-1.n` remain in force and are cited where reused.

---

## Ride Creation

### BR-2.1 - The completeness gate is checked before a ride is created
`C6.assertCanAct` (BR-1.9) is called first. A caller without name, phone and home area is
refused with `PROFILE_INCOMPLETE` and directed to their profile.
**Requirements**: FR-6 · **Verified by**: US-04, US-06 · **Reuses**: Unit 1

This is the first of the two call sites BR-1.10 permits. It is also the first point at which
US-04 becomes demonstrable through the interface - in Unit 1 the gate existed but had nothing
to gate.

### BR-2.2 - Ride field validation
| Field | Rule |
|---|---|
| Date and departure time | Combined into one instant; **must be in the future** |
| Origin area | Must be an existing `areas` row |
| Destination area | Must be an existing `areas` row |
| Seats | Integer, **1 to 8 inclusive** (FQ3=A) |
| Note | Optional, at most 280 characters |

**Requirements**: FR-12, FR-14 · **Verified by**: US-06, US-07 · **Source**: FQ3=A

Seat bounds exist so the capacity guarantee means something: a ride with 0 seats could never
be joined, and one with 500 makes FR-31 vacuous.

### BR-2.3 - No cap on how far ahead a ride may be
FQ3=A declined a horizon limit. A ride may be published for any future date.
**Source**: FQ3=A

### BR-2.4 - Origin and destination may be the same area
No rule prevents it. A ride from an area to itself is valid, stored, and will appear in search
results when both filters name that area.
**Source**: FQ4=B - the product owner's decision, taken against the recommendation

Stated as a positive rule so its absence is not later read as a missing validation.

### BR-2.5 - A ride is created as `active` and owned by its creator
`driver_id` is the authenticated caller, never a value from the form. `status` starts `active`.
**Requirements**: FR-12, FR-34 · **Verified by**: US-06

Taking the driver from the session rather than the submission is what makes ride ownership
unforgeable.

### BR-2.6 - Both directions are ordinary rides
A Home-to-Office ride and an Office-to-Home ride differ only in which area id sits in which
column. There is no direction flag and no linkage between an outbound and a return ride.
**Requirements**: FR-11 · **Verified by**: US-06, US-08

### BR-2.7 - Rides are one-off
Each ride carries a single `departs_at`. No recurrence structure exists and no repeating option
is offered.
**Requirements**: FR-13 · **Verified by**: US-06

---

## No Editing

### BR-2.8 - A published ride cannot be modified
There is no update operation on a ride, in any layer, for any field except the single
`status` transition of BR-2.9. A driver corrects a mistake by cancelling and creating a new
ride.
**Requirements**: FR-15 · **Verified by**: US-09

**The absence of the operation is the enforcement.** No permission check is needed for a
capability that does not exist.

---

## Cancellation

### BR-2.9 - A driver may cancel their own upcoming ride
`status` moves from `active` to `cancelled`. Only the ride's owner may do it; anyone else is
refused with `NOT_PERMITTED`, checked in **both** the service and the database policy (NFR-1).
**Requirements**: FR-16 · **Verified by**: US-09

### BR-2.10 - Cancellation requires explicit confirmation
The interface must require a deliberate second step before cancelling.
**Source**: FQ8=A · **Verified by**: US-09

**Why this is a business rule rather than a UI preference**: FR-15 makes cancellation the only
way to correct a ride, so it will be used routinely rather than rarely - and in Unit 3 the same
action will cascade every accepted passenger's seat away (FR-38). A permanent, widening action
reached by a single misplaced tap is a defect waiting to happen.

### BR-2.11 - Cancellation is terminal
A cancelled ride cannot be reactivated. It disappears from search (BR-2.14) and from My Rides.
**Requirements**: FR-16, FR-34 · **Verified by**: US-09

### BR-2.12 - Unit 2 cancellation cascades to nothing
No requests exist yet, so cancelling a ride affects only the ride. Unit 3 extends this rule
with FR-38's cascade.
**Requirements**: FR-16 · **Extended by**: Unit 3

Recorded because a reader comparing Unit 2 against FR-38 would otherwise find the cascade
missing. It is not missing; there is nothing yet to cascade to.

---

## Upcoming and Past

### BR-2.13 - "Upcoming" is evaluated at query time
A ride is upcoming when `departs_at` is later than the moment of the query. Nothing is stored
and no job runs.
**Requirements**: FR-17 · **Verified by**: US-10 · **Source**: assumption A-5

### BR-2.14 - Search and My Rides both exclude non-upcoming and cancelled rides
Every listing applies two predicates: `status = active` and `departs_at > now`.
**Requirements**: FR-17, FR-21, FR-41 · **Verified by**: US-10, US-11, US-25

### BR-2.15 - Past rides are retained, not deleted
Rows remain. They are filtered out of listings, which is what allows Unit 3 to derive EXPIRED
for requests against departed rides (FR-37) rather than finding the ride gone.
**Requirements**: FR-17 · **Verified by**: US-10

---

## Search and Matching

### BR-2.16 - Search filters on date, origin area and destination area
All three, combined. Date matches the calendar day of `departs_at`; both areas match by
**exact area id equality**.
**Requirements**: FR-18, FR-10 · **Verified by**: US-11

### BR-2.17 - No fuzzy or text matching exists
Areas are compared by id. There is no name search, partial match, or case-insensitive
comparison anywhere in the system.
**Requirements**: FR-10 · **Verified by**: US-11 · **Reuses**: BR-1.14

### BR-2.18 - The search screen prefills from the employee's own profile
On first load, origin defaults to the employee's `home_area_id` and the date to today, and
results are shown immediately. Every default is overridable.
**Source**: FQ7=C · **Verified by**: US-11

### BR-2.19 - An empty result set is an explicit state
Zero matches renders a clear "no rides found" message, never a blank region.
**Requirements**: FR-18 · **Verified by**: US-11

---

## Result Presentation

### BR-2.20 - Each result carries what a decision needs
Driver name, origin area, destination area, departure date and time, seats remaining, and the
note where one exists.
**Requirements**: FR-19 · **Verified by**: US-12

### BR-2.21 - Seats remaining is derived, never stored
`seats` minus the count of accepted requests. In Unit 2 that count is always zero, so every
ride shows its full seat count.
**Requirements**: FR-19 · **Verified by**: US-12 · **Source**: FQ2=A

### BR-2.22 - A full ride is shown and marked, not hidden
A ride with no seats remaining still appears, clearly marked, with its request action
unavailable.
**Requirements**: FR-19 · **Verified by**: US-12 · **Source**: assumption A-2

Hiding a ride a colleague has mentioned reads as a bug; marking it full explains itself. Not
exercisable in Unit 2, since nothing can consume a seat yet.

### BR-2.23 - The viewer's own rides are marked as such
A result the viewer created is flagged so the interface can suppress its request action.
**Requirements**: FR-24 · **Verified by**: US-12, US-15 · **Completed in**: Unit 3

The marker is produced here; the request action it suppresses arrives in Unit 3.

---

## Contact Disclosure

### BR-2.24 - Contact columns are unreachable for non-owners at the database level
Employees other than the owner read profile data through a view carrying only `id`,
`display_name`, `home_area_id` and `role`. `phone` and `email` are not columns of that view.
The base `profiles` table remains owner-only (BR-1.16).
**Requirements**: FR-20, NFR-1, NFR-2 · **Verified by**: US-13, US-27 · **Source**: FQ5=B

**This is the strongest form of FR-20 available.** A view that does not carry a column cannot
disclose it, regardless of what any query, service or component does. Application-layer
stripping would depend on every read path remembering to strip.

### BR-2.25 - Search results expose driver name only
Name, and the ride's own fields. No phone, no email.
**Requirements**: FR-19, FR-20 · **Verified by**: US-13

### BR-2.26 - C10 owns the read path and the public profile type
All non-owner profile reads go through C10, which reads the view and returns a `PublicProfile` -
a type with no contact fields.
**Requirements**: FR-20, NFR-2 · **Verified by**: US-27

Thin in this unit because the database is doing the enforcing. Unit 3 gives it the conditional
branch that releases contact details to an accepted pair (FR-30), which no fixed view can
express.

### BR-2.27 - Unit 2 cannot satisfy the request-related halves of US-13 and US-27
Their criteria covering a driver's pending-request list, and accepted-request output, require
requests to exist. Unit 3 must re-verify both stories in full.
**Source**: `unit-of-work-story-map.md` finding, approved

---

## My Rides

### BR-2.28 - My Rides lists the caller's own upcoming rides
Filtered by `driver_id` equal to the caller, with BR-2.14's predicates applied. Each entry
shows date, time, both areas, seats, status and note, with a cancel action.
**Requirements**: FR-39, FR-41, FR-34 · **Verified by**: US-25

### BR-2.29 - My Rides carries no request list in Unit 2
US-25's criteria covering per-ride request lists and accept/reject actions are satisfied in
Unit 3.
**Source**: story map finding, approved · **Completed in**: Unit 3

### BR-2.30 - Both listing views are reachable regardless of role
`role` gates nothing (FR-7). No view checks it.
**Requirements**: FR-7, FR-39 · **Verified by**: US-25 · **Reuses**: BR-1.9's exclusion of role

---

## Authorization (both layers, NFR-1)

### BR-2.31 - Database layer
| Object | Read | Write |
|---|---|---|
| `rides` | Any authenticated employee may read `active` rides; a driver may read their own regardless of status | Insert only where `driver_id` is the caller; update only own row, and only `status` |
| public profile view | Any authenticated employee | No write path |
| `profiles` base table | Owner only (unchanged from Unit 1) | Owner only (unchanged) |

### BR-2.32 - Service layer
Every ride service method resolves the caller through C13 `requireUser` and re-checks ownership
before a cancellation, even though a database policy also enforces it. That duplication is
NFR-1's defence in depth.
**Requirements**: NFR-1 · **Reuses**: BR-1.17

---

## Failure Outcomes

Unit 2 adds **no new `BusinessOutcome` codes**. Everything it can fail with already exists from
Unit 1:

| Outcome | Raised when |
|---|---|
| `PROFILE_INCOMPLETE` | The gate refuses ride creation (BR-2.1) |
| `NOT_PERMITTED` | No session, or cancelling someone else's ride (BR-2.9) |
| `NOT_FOUND` | A referenced area or ride does not exist |
| `VALIDATION_FAILED` | A ride form fails BR-2.2 |

`RIDE_FULL`, `DUPLICATE_REQUEST`, `SELF_REQUEST` and `INVALID_STATE` remain undefined until
Unit 3, as planned.

---

## Rule Coverage

| Requirement | Rules |
|---|---|
| FR-11 | BR-2.6 |
| FR-12 | BR-2.2, BR-2.5 |
| FR-13 | BR-2.7 |
| FR-14 | BR-2.2 |
| FR-15 | BR-2.8 |
| FR-16 | BR-2.9, BR-2.11, BR-2.12 |
| FR-17 | BR-2.13, BR-2.14, BR-2.15 |
| FR-18 | BR-2.16, BR-2.19 |
| FR-19 | BR-2.20, BR-2.21, BR-2.22 |
| FR-20 | BR-2.24, BR-2.25, BR-2.26 |
| FR-21 | BR-2.14 |
| FR-24 | BR-2.23 (marker only; enforcement in Unit 3) |
| FR-34 | BR-2.5, BR-2.11, BR-2.28 |
| FR-39, FR-41 | BR-2.14, BR-2.28 |
| FR-6 | BR-2.1 |
| FR-7 | BR-2.30 |
| FR-10 | BR-2.16, BR-2.17 |
| NFR-1 | BR-2.31, BR-2.32 |
| NFR-2 | BR-2.24, BR-2.26 |
| A-2 | BR-2.22 |
| A-5 | BR-2.13 |

All requirements in Unit 2's scope have at least one governing rule.
