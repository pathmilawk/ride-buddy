# Functional Design Plan - Unit 3 Requests and Matching

**Phase**: CONSTRUCTION
**Unit**: Unit 3 - Requests and Matching
**Stage**: Functional Design
**Date**: 2026-09-03
**Status**: Awaiting answers to design questions (FQ1-FQ8)

---

## Step 1: Unit Context

**Purpose**: the seat request lifecycle, the capacity guarantee, and the contact exchange that
follows acceptance.

**This is the unit the execution plan called the largest and riskiest.** It carries the only
correctness-critical requirement in the system (FR-31 to FR-33), the six-state machine, and the
conditional disclosure that switches on acceptance.

### Stories assigned

| Story | Title | Tags |
|---|---|---|
| US-14 | Request a seat | `[DEMO PATH]` |
| US-15 | Not be able to request my own ride | `[PROMOTED]` |
| US-16 | Ask several drivers at once | |
| US-17 | Not be able to request the same ride twice | `[PROMOTED]` |
| US-18 | Review who has asked for a seat | `[DEMO PATH]` |
| US-19 | Accept or reject a request | `[DEMO PATH]` |
| US-20 | Withdraw my request | |
| US-21 | Exchange contact details once a seat is agreed | `[DEMO PATH]` |
| US-22 | Never have a ride overbooked | `[PROMOTED]` `[DEMO PATH]` |
| US-23 | Have a request that was never answered come to a close | |
| US-24 | Know where I stand when a driver cancels | `[PROMOTED]` |
| US-26 | See the rides I have asked to join | |

### Stories from Unit 2 that must be RE-VERIFIED IN FULL

Not new work, but this unit's checkpoint is the first at which they can be judged completely.
The approved story map records all three as partially complete until now.

| Story | Criteria that Unit 3 completes |
|---|---|
| US-13 | A driver viewing pending requests sees no requester contact details |
| US-25 | The per-ride request list, and the accept/reject actions on My Rides |
| US-27 | Pending-request output, and accepted-request output including contact fields |

**Requirements in scope**: FR-22 to FR-38, FR-40, FR-41, FR-42, A-1

**Components in scope**: **C4 RideRequestRepository** (carries the capacity guarantee),
C9 RideRequestService, C14 (request actions), C15 (requests feature), and extensions to
**C10 ContactProjection** and C12 `Result`

**Entity owned by this unit**: `ride_requests`

### The eight contracts Unit 2 handed over

| Contract | How Unit 3 uses it |
|---|---|
| `rides.seats` authoritative, nothing caches a remaining figure | The capacity guarantee constrains this column |
| Seats remaining derived by counting accepted requests | The guarantee counts the same rows |
| `rides.driver_id` from the session, unforgeable | Self-request refusal (FR-24), and accept/reject ownership |
| `rides.status` + `departs_at > now` define a joinable ride | Request validity |
| Past rides retained, not deleted | EXPIRED derivation (FR-37) |
| `countAcceptedByRideIds` is a **seam** returning zero | **Replace this one function body** - every caller already routes through it |
| Cancellation has a **named insertion point** for the cascade | FR-38 goes exactly there |
| The public view **cannot serve FR-30** | Unit 3 must add its own path for accepted pairs |

The last two are the ones that shape this unit's design.

### What this unit must also change in existing code

Recorded up front so none of it is discovered late:

1. `countAcceptedByRideIds` - replace the zero-returning body with a real grouped count
2. `cancelRide` - insert the FR-38 cascade at the named point, atomically
3. `C10 ContactProjection` - add the conditional branch for accepted pairs
4. `C12 Result` - add `RIDE_FULL`, `DUPLICATE_REQUEST`, `SELF_REQUEST`, `INVALID_STATE`
5. `profiles` RLS - add a policy releasing contact columns to an accepted pair
6. `RideCard` - add the request action, suppressed on own and full rides
7. `MyRidesList` - add the per-ride request list, completing US-25

**Scope boundary**: technology-agnostic business logic, entities and rules. Concrete SQL,
function bodies and policy text belong to Code Generation.

---

## DESIGN QUESTIONS

## Question FQ1
**Domain Model.** FR-35 names six request states, but FR-36 and FR-37 make expiry a read-time derivation with no scheduled job. How should the states be represented?

A) Five **stored** statuses - pending, accepted, rejected, withdrawn, cancelled - with EXPIRED derived at read time from the ride's departure

B) Six stored statuses, with expired written lazily the first time an expired request is read

C) Six stored statuses maintained by a scheduled job

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ2
**Business Rules - the correctness-critical decision.** FR-33 states that application-layer checking is not sufficient for the seat cap. What mechanism should enforce FR-31?

A) A database function that locks the ride row (`select ... for update`), counts accepted requests, and updates the request only if there is room - so concurrent acceptances on one ride serialise

B) A `seat_ordinal` column on accepted requests with a unique constraint on (ride_id, seat_ordinal), so the seat count is enforced declaratively and the (seats+1)-th acceptance violates uniqueness

C) A single conditional `UPDATE ... WHERE (subquery count) < seats`

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ3
**Integration Points.** FR-30 requires phone and email to become visible to both parties once a request is ACCEPTED. Unit 2's public view deliberately cannot serve this. What should?

A) An RLS policy on `profiles` permitting select when an accepted request links the two people, with C10 reading the base table for that case only

B) A security-definer database function returning the counterparty's contact details, called after the service has verified acceptance

C) A service-role read in the server layer, after the service has verified acceptance

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ4
**Business Logic Modeling.** FR-38 requires that cancelling a ride moves every request on it to CANCELLED, and the design named these as writes that must not diverge. How should that be guaranteed?

A) A database trigger on `rides` that cascades whenever status becomes cancelled - unbypassable, so no future code path can forget it

B) A database function performing both writes in one transaction, called by the service

C) Two sequential writes from the service, accepting a brief window where they disagree

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ5
**Frontend Components.** Where should a driver review and answer requests?

A) Inline on each ride in My Rides, which is what US-25's acceptance criteria describe

B) On a separate page listing every request across all the driver's rides

C) Both

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ6
**Frontend Components.** Where should a passenger see their own requests (US-26)?

A) A separate route, alongside Find a ride and My rides

B) A section on the My Rides page, so one screen shows both sides

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ7
**Error Handling.** A driver accepts a request, but the last seat has just gone. What should they see?

A) An inline error on that request, with the list refreshed to show the true current state

B) A redirect carrying a message

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ8
**Business Scenarios.** Which requests should a driver see on their ride?

A) All of them, with terminal ones (rejected, withdrawn, expired, cancelled) visually separated or collapsed - which is what US-25's criteria list

B) Only pending and accepted; terminal requests hidden entirely

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## EXECUTION CHECKLIST

### Phase 1: Domain Entities
- [x] 1.1 Define `ride_requests` and its fields, per FQ1
- [x] 1.2 Define the status representation and which states are derived, per FQ1
- [x] 1.3 Define relationships to `rides` and `profiles`
- [x] 1.4 Specify the uniqueness rule preventing a duplicate active request (FR-26, A-1)
- [x] 1.5 Specify what the capacity guarantee constrains, per FQ2
- [x] 1.6 Specify the FR-30 contact access mechanism, per FQ3
- [x] 1.7 Confirm migrations remain additive - nothing in 0001-0005 altered, only added to
- [x] 1.8 Write `functional-design/domain-entities.md`

### Phase 2: Business Rules
- [x] 2.1 Seat request creation rules, including all five preconditions (FR-6, FR-22 to FR-26)
- [x] 2.2 **The capacity guarantee in full** (FR-31 to FR-33), per FQ2
- [x] 2.3 Accept and reject rules, including ownership (FR-28)
- [x] 2.4 Withdrawal rules, including the seat returning to the pool (FR-29)
- [x] 2.5 The complete state machine - every transition and its guard (FR-34, FR-35)
- [x] 2.6 Expiry derivation rules (FR-36, FR-37), per FQ1
- [x] 2.7 The cancellation cascade (FR-38), per FQ4
- [x] 2.8 **Contact disclosure on acceptance** (FR-30), per FQ3
- [x] 2.9 My Requests rules (FR-40, FR-41, FR-42)
- [x] 2.10 Authorization rules for both layers (NFR-1)
- [x] 2.11 The four new `BusinessOutcome` codes and when each is raised
- [x] 2.12 Write `functional-design/business-rules.md`

### Phase 3: Business Logic Model
- [x] 3.1 Model requesting a seat, with every precondition in order
- [x] 3.2 **Model acceptance, naming exactly where the guarantee sits**
- [x] 3.3 Model rejection and withdrawal
- [x] 3.4 Model the cancellation cascade, per FQ4
- [x] 3.5 Model expiry derivation at read time
- [x] 3.6 Model the contact exchange, showing it as a consequence of state rather than a write
- [x] 3.7 Model the driver's request review, and the passenger's My Requests
- [x] 3.8 Model the changes to existing Unit 1 and Unit 2 code
- [x] 3.9 Map each flow to its stories and requirements
- [x] 3.10 Write `functional-design/business-logic-model.md`

### Phase 4: Frontend Components
- [x] 4.1 Define the component hierarchy for the requests feature, per FQ5 and FQ6
- [x] 4.2 Define props and state per component
- [x] 4.3 Define user interaction flows, including the FQ7 failure path
- [x] 4.4 Define which requests are shown and how, per FQ8
- [x] 4.5 Define the additions to `RideCard` and `MyRidesList`
- [x] 4.6 Record `data-testid` naming
- [x] 4.7 Confirm the Unit 1 shell is inherited (NFR-5)
- [x] 4.8 Write `functional-design/frontend-components.md`

### Phase 5: Validation
- [x] 5.1 Verify all 12 assigned stories are covered
- [x] 5.2 **Verify US-13, US-25 and US-27 are now covered in full**
- [x] 5.3 Verify FR-22 to FR-38, FR-40 to FR-42 and A-1 are addressed
- [x] 5.4 Verify all six request states and all seven transitions have rules
- [x] 5.5 Verify the eight Unit 2 contracts are consumed and none is broken
- [x] 5.6 Verify the seven changes to existing code are all specified
- [x] 5.7 Verify no infrastructure concerns have leaked in
- [x] 5.8 Check story and requirement references programmatically
- [x] 5.9 Validate any diagrams per `common/content-validation.md`

### Phase 6: Completion
- [x] 6.1 Update `aidlc-docs/aidlc-state.md`
- [x] 6.2 Log the approval prompt in `audit.md` with an ISO 8601 timestamp
- [x] 6.3 Present the completion message per `functional-design.md` Step 7

---

## Out of Scope

- Concrete SQL, function bodies and policy text (Code Generation)
- Notifications of any kind (FR-42, Q15=A)
- Auto-withdrawing a passenger's other requests on acceptance - `requirements.md` records this
  as explicitly out of scope under Q11=A

---

## RESOLVED DESIGN DECISIONS (answers to FQ1-FQ8)

| Q | Decision | Consequence |
|---|---|---|
| FQ1 = A | Five stored statuses; **EXPIRED derived at read time** | Honest about fact versus consequence. No job, which TC-7 gives nowhere to run. |
| FQ2 = A | **Row-lock database function** - lock the ride, count accepted, update only if there is room | Concurrent acceptances on one ride serialise, so exactly one wins the last seat. Satisfies FR-33's rejection of application-layer checking. |
| FQ3 = A | **RLS policy on `profiles`** releasing contact columns to an accepted pair | The rule lives in the database, so a bug in C10 cannot leak. Same reasoning that made Unit 2's view correct. |
| FQ4 = A | **Database trigger on `rides`** cascading when status becomes cancelled | Unbypassable - no future code path can forget it. See the consequence below. |
| FQ5 = A | Requests inline on each ride in My Rides | Completes US-25, partially satisfied since Unit 2. |
| FQ6 = A | My Requests on its own route | US-26 gets its own view and empty state. |
| FQ7 = A | Inline error on the request, list refreshed | The visible face of US-22's race condition. |
| FQ8 = A | All six statuses shown, terminal ones separated | US-25's criteria name all six. |

### A pattern worth naming

All four of the consequential decisions - FQ1, FQ2, FQ3, FQ4 - put the rule **in the database**
rather than in application code. Combined with Unit 2's public view, the four hardest rules in
the system are now each enforced by a mechanism that application code cannot bypass:

| Rule | Enforced by |
|---|---|
| Contact hidden from non-owners (FR-20) | A view with no contact columns |
| Contact released to an accepted pair (FR-30) | An RLS policy checking for an accepted request |
| Seat capacity never exceeded (FR-31) | A row-locking function |
| Cancellation cascades to all requests (FR-38) | A trigger |

That consistency is worth stating, because it is what makes NFR-1's "defence in depth" a real
property rather than a slogan.

### CONSEQUENCE of FQ4=A - the insertion point is now filled by a trigger, not a call

Unit 2 deliberately left a **named insertion point** in `cancelRide`, a comment saying Unit 3's
`rideRequestService.cancelRequestsForRide(rideId)` call belongs exactly there.

FQ4=A changes that. A trigger fires on the `rides` update itself, so **no service call is
needed** - and adding one would double-cancel, harmlessly but confusingly.

Two things follow, recorded so a future reader does not conclude the cascade was forgotten:

1. **The comment in `cancelRide` must be rewritten**, not deleted. It should say the cascade is
   handled by the trigger, and name the trigger, so someone reading the service still learns
   that cancelling a ride affects requests.
2. **`C9.cancelRequestsForRide` will not be implemented.** Application Design's
   `component-methods.md` listed it as a C9 method. A trigger is the better home for a
   data-integrity cascade - it cannot be bypassed - but this is a **deviation from the approved
   Application Design** and is recorded as such rather than quietly dropped.

The trade FQ4=A accepts is that a trigger is invisible at the call site. That is why point 1 is
mandatory rather than optional.

### Step 5 Ambiguity Analysis - MANDATORY, Result: PASS

- **Vague or ambiguous responses**: none. All eight single explicit letters.
- **Undefined criteria or terms**: none. No hybrids selected.
- **Contradictory answers**: none. Cross-checks:
  - FQ1=A with FQ8=A - EXPIRED is derived at read time and then displayed among the six; a
    derived state is perfectly displayable
  - FQ2=A with FQ7=A - the locking function returns a distinguishable full outcome, which is
    what an inline error needs
  - FQ1=A with FQ4=A - the trigger writes the stored `cancelled` status, so it interacts with
    stored state only and never with the derived one
  - FQ3=A with Unit 2's view - complementary rather than conflicting: the view serves the
    public case, the policy serves the accepted-pair case, and C10 branches between them
  - FQ5=A with FQ8=A - one place showing all six statuses, consistent with US-25's criteria
- **Missing design details**: none, once the FQ4 consequence above is written down.

**No follow-up questions required.**
