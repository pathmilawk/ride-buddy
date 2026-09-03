# Business Logic Model - Unit 3 Requests and Matching

**Phase**: CONSTRUCTION - Unit 3, Functional Design, Phase 3

---

## Flow 1: Request a Seat

**Stories**: US-14, US-15, US-16, US-17 · **Rules**: BR-3.1 to BR-3.7 · **Requirements**: FR-6, FR-22 to FR-26

| # | Step | Failure |
|---|---|---|
| 1 | Passenger activates the request action on a ride | - |
| 2 | Caller resolved from the session | `NOT_PERMITTED` |
| 3 | **Completeness gate** (reuses BR-1.9) | `PROFILE_INCOMPLETE`, redirect to profile |
| 4 | Ride loaded; confirmed `active` and not departed | `NOT_FOUND` |
| 5 | Caller confirmed not to be the driver | `SELF_REQUEST` |
| 6 | No active request by this passenger on this ride | `DUPLICATE_REQUEST` |
| 7 | A seat is free | `RIDE_FULL` |
| 8 | Request inserted as `pending` | thrown |
| 9 | Appears in the driver's list and the passenger's My Requests | - |

**Step 3 is the second and final gate call site.** BR-1.10 permits exactly two; Unit 2 used the
first. There will be no third.

**Step 5 is enforced here, not in the UI.** Unit 2's own-ride marker suppresses the button; this
step refuses a request submitted directly to the server (BR-3.4).

**Step 7 is a courtesy, not the guarantee.** It stops a passenger being invited to ask for a
full ride. The guarantee lives in Flow 2 - a request is not an acceptance, and nothing about
step 7 needs to be race-free.

**Step 6 relies on a database constraint**, not just this check. Two simultaneous requests from
one passenger would both pass step 6 and the second insert would violate the partial unique
index, which the service translates to `DUPLICATE_REQUEST`.

---

## Flow 2: Accept a Request - the correctness-critical path

**Stories**: US-19, US-22 · **Rules**: BR-3.8 to BR-3.15 · **Requirements**: FR-28, FR-31 to FR-33

| # | Step | Failure |
|---|---|---|
| 1 | Caller resolved from the session | `NOT_PERMITTED` |
| 2 | Request and its ride loaded | `NOT_FOUND` |
| 3 | Caller confirmed to own the ride | `NOT_PERMITTED` |
| 4 | Request confirmed to be `pending` | `INVALID_STATE` |
| 5 | **Guarded acceptance** - lock the ride, count accepted, write only if room | `RIDE_FULL` |
| 6 | Return the accepted request | - |

### Step 5 carries the entire guarantee

The service performs **no capacity check of its own** (BR-3.10). It calls the guarded operation
and surfaces the outcome.

Why steps 1 to 4 are not enough: they are all read-then-act checks, and any of them could be
true when read and false when written. That is tolerable for ownership - a ride's driver does
not change - but not for seat count, which every other acceptance mutates.

**The concurrency contract**: given two simultaneous acceptances against a single remaining
seat, exactly one returns success and the other returns `RIDE_FULL`. Accepted count never
exceeds `seats`, and seats remaining is never negative.

**How the lock delivers it**: the second call blocks at the ride row until the first commits,
then counts the *new* total and correctly finds no room. Without the lock, both would count the
pre-commit total.

### What acceptance does NOT do

- It does not copy contact details anywhere. Contact release is a **consequence of the status**
  (Flow 6, BR-3.25)
- It does not touch a seat counter. Seats remaining is derived, so it follows automatically
- It does not withdraw the passenger's other requests (BR-3.6)
- It cannot be undone (BR-3.15)

---

## Flow 3: Reject a Request

**Stories**: US-19 · **Rules**: BR-3.13, BR-3.14, BR-3.16 · **Requirements**: FR-28

| # | Step | Failure |
|---|---|---|
| 1 | Caller resolved | `NOT_PERMITTED` |
| 2 | Request loaded | `NOT_FOUND` |
| 3 | Caller owns the ride | `NOT_PERMITTED` |
| 4 | Request is `pending` | `INVALID_STATE` |
| 5 | Status set to `rejected`, `decided_at` stamped | thrown |

**No capacity interaction**, since rejection consumes nothing. **No reason field** and **no
notification** - the passenger sees the status when they next look.

---

## Flow 4: Withdraw a Request

**Stories**: US-20 · **Rules**: BR-3.12 · **Requirements**: FR-29

| # | Step | Failure |
|---|---|---|
| 1 | Caller resolved | `NOT_PERMITTED` |
| 2 | Request loaded | `NOT_FOUND` |
| 3 | Caller owns the **request** - not the ride | `NOT_PERMITTED` |
| 4 | Status is `pending` or `accepted` | `INVALID_STATE` |
| 5 | Status set to `withdrawn` | thrown |

**Withdrawing an accepted request returns the seat automatically.** Because seats remaining is
derived from the accepted count (Unit 2's FQ2=A), there is no counter to increment and no
chance of the two disagreeing. The seat is free the instant the status changes.

**Step 3 checks a different ownership** from accept and reject. Getting these two confused
would let a driver withdraw a passenger's request, or a passenger accept their own - which is
why the checks are stated per flow rather than shared.

---

## Flow 5: Cancel a Ride - the cascade

**Stories**: US-24, US-09 · **Rules**: BR-3.20, BR-3.21 · **Requirements**: FR-16, FR-38

Extends Unit 2's Flow 2 at the point it reserved.

| # | Step | Owner |
|---|---|---|
| 1-5 | Unchanged from Unit 2 - resolve caller, load ride, confirm ownership, set `status` to `cancelled` | C8 |
| 6 | **Every non-terminal request on the ride moves to `cancelled`** | **The trigger** |
| 7 | Ride leaves search and My Rides; requests show as cancelled | - |

### The insertion point is filled by a trigger, not a call

Unit 2 left a comment saying `cancelRequestsForRide` belonged at step 6. FQ4=A replaced that
with a trigger on `rides`, which fires on the status change itself.

**Steps 5 and 6 are therefore atomic for free** - the trigger runs inside the same statement's
transaction, so a ride cannot be cancelled with its requests left active. That was named as a
required transaction boundary in `application-design/services.md`, and a trigger satisfies it
without the service orchestrating anything.

**Two consequences, both mandatory:**
1. The comment in `cancelRide` must be **rewritten to name the trigger**, not removed. A reader
   of the service must still learn that cancelling a ride affects requests (BR-3.21)
2. `C9.cancelRequestsForRide` is **not implemented** - a recorded deviation from Application
   Design (BR-3.22)

**Known limitation** (`requirements.md` Section 9.2): nothing notifies the passenger. The
cascade guarantees the status they eventually see is correct, not that they see it promptly.

---

## Flow 6: Contact Exchange

**Stories**: US-21, US-13, US-27 · **Rules**: BR-3.23 to BR-3.27 · **Requirements**: FR-20, FR-30

**Not a flow anyone performs.** It is what the other flows cause, and stating it that way is the
point.

| Situation | What each party sees |
|---|---|
| Request `pending` | Driver: requester's name and pickup area. Passenger: driver's name |
| Request `accepted` | **Both**: the other's phone and email, in addition |
| Request `rejected`, `withdrawn`, `cancelled`, or EXPIRED | Neither sees the other's contact details |

### How it works, and why nothing is written

C10 chooses between two read paths:

| Case | Path |
|---|---|
| Any employee's public data | The `public_profiles` view - contact columns do not exist on it |
| An accepted-pair counterparty | The `profiles` base table, permitted by the new RLS policy |

**Acceptance writes no contact data.** It changes a status; the policy then permits a row it
previously refused. That is why the third row of the table above needs no separate mechanism -
a rejected or withdrawn request stops satisfying the policy and the window closes by itself.

**Two independent guarantees**: the policy decides what the database will return; the return
type decides what a caller may read. `PublicProfile` is not widened (BR-3.27), so the two cases
stay distinguishable at compile time.

---

## Flow 7: Expiry Derivation

**Stories**: US-23 · **Rules**: BR-3.17, BR-3.18 · **Requirements**: FR-36, FR-37

| Condition | Reported status |
|---|---|
| `pending`, ride not departed | `pending` |
| `pending`, ride departed | **EXPIRED** (derived) |
| Any stored terminal status | That status, regardless of departure |

Evaluated on every read that presents a request. **Nothing writes it, and no job runs** - which
is what Q33=A and TC-7 between them require.

`decided_at` stays null for a derived-EXPIRED request, correctly: nobody decided anything.

This depends on Unit 2's contract that **past rides are retained, not deleted**. Had rides been
purged, an expired request would have no ride to compare against.

---

## Flow 8: The Driver's Request Review

**Stories**: US-18, US-25, US-13 · **Rules**: BR-3.26, BR-3.28 · **Requirements**: FR-27, FR-39

| # | Step |
|---|---|
| 1 | Caller resolved; their upcoming rides loaded (Unit 2's flow) |
| 2 | Requests loaded per ride |
| 3 | Requester profiles read in one batch through the **public view** |
| 4 | Derived EXPIRED applied to pending requests on departed rides |
| 5 | Accepted counterparties additionally resolved via the accepted-pair path |
| 6 | Rendered: pending and accepted prominent, terminal ones separated |

**Step 3 completes US-13.** A pending request shows name and pickup area, and cannot show a
phone number - the view has no such column.

**Step 5 is the only place two paths are used in one render**: public data for pending
requesters, full contact for accepted ones. C10 makes the choice; no caller decides.

---

## Flow 9: My Requests

**Stories**: US-26 · **Rules**: BR-3.29, BR-3.30, BR-3.31 · **Requirements**: FR-40 to FR-42

| # | Step |
|---|---|
| 1 | Caller resolved |
| 2 | Their requests on upcoming rides loaded |
| 3 | Derived EXPIRED applied |
| 4 | Driver contact resolved via the accepted-pair path for accepted requests only |
| 5 | Withdraw action offered on pending and accepted |
| 6 | Reachable regardless of `role` |

Status is discoverable **only** here - nothing is emailed or pushed (BR-3.30).

---

## Flow 10: Changes to Existing Code

The seven changes named in the plan, with where each lands.

| # | Change | Where |
|---|---|---|
| 1 | `countAcceptedByRideIds` - replace the zero-returning seam with a real grouped count | C3, one function body |
| 2 | `cancelRide` - **rewrite** the insertion-point comment to name the trigger | C8, comment only; no call added |
| 3 | C10 - add the accepted-pair branch and its richer return type | C10 |
| 4 | `Result` - add the four new outcome codes | C12 |
| 5 | `profiles` RLS - add the accepted-pair select policy | Migration, additive |
| 6 | `RideCard` - add the request action, suppressed on own and full rides | C15 |
| 7 | `MyRidesList` - add the per-ride request list | C15 |

**Change 1 is why Unit 2 built a seam.** Every caller already routes through that function, so
seats remaining becomes real across search, My Rides and the capacity guarantee at once - and
the number displayed is the same count the guarantee constrains.

**Change 2 adds no call.** The trigger does the work. The comment changes so a reader still
learns the cascade exists.

---

## Flow-to-Story Coverage

| Story | Flows | Complete |
|---|---|---|
| US-14 Request a seat | 1 | Yes |
| US-15 No self-request | 1 | Yes |
| US-16 Several at once | 1 | Yes |
| US-17 No duplicate | 1 | Yes |
| US-18 Review requests | 8 | Yes |
| US-19 Accept or reject | 2, 3 | Yes |
| US-20 Withdraw | 4 | Yes |
| US-21 Contact exchange | 6 | Yes |
| US-22 Never overbooked | 2 | Yes |
| US-23 Expiry | 7 | Yes |
| US-24 Cancellation cascade | 5 | Yes |
| US-26 My Requests | 9 | Yes |
| **US-13** carried from Unit 2 | 6, 8 | **Yes - now complete** |
| **US-25** carried from Unit 2 | 8 | **Yes - now complete** |
| **US-27** carried from Unit 2 | 6 | **Yes - now complete** |

All 12 assigned stories, plus the three Unit 2 carried forward. **With this unit designed, all
28 stories are covered in full.**

---

## The Eight-Step Demo Path, Complete

`requirements.md` Section 10 defines success. Every step now has an owner.

| # | Step | Unit | Flow |
|---|---|---|---|
| 1 | Sign in | 1 | Unit 1 Flow 2 |
| 2 | Complete profile | 1 | Unit 1 Flow 3 |
| 3 | Create a ride | 2 | Unit 2 Flow 1 |
| 4 | Second employee searches and finds it | 2 | Unit 2 Flow 3 |
| 5 | Requests a seat, no contact details | **3** | **Flow 1** |
| 6 | Driver sees name and area only | **3** | **Flow 8** |
| 7 | Driver accepts, capacity enforced in the database | **3** | **Flow 2** |
| 8 | Both see phone and email | **3** | **Flow 6** |

Steps 5 to 8 - half the demo, and the half carrying the concurrency contract and the
conditional disclosure - all belong to this unit. That is why the execution plan made it
largest and put it last.
