# Domain Entities - Unit 3 Requests and Matching

**Phase**: CONSTRUCTION - Unit 3, Functional Design, Phase 1
**Decisions applied**: FQ1=A (five stored statuses, EXPIRED derived), FQ2=A (row-lock function),
FQ3=A (RLS policy for accepted pairs), FQ4=A (trigger cascade)

---

## Entity: `ride_requests`

One row per seat request. The last entity in the system.

| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `ride_id` | UUID | No | Foreign key to `rides.id` |
| `passenger_id` | UUID | No | Foreign key to `profiles.id` |
| `status` | enum | No | One of five **stored** states. Defaults to `pending` |
| `created_at` | timestamptz | No | When the request was made |
| `decided_at` | timestamptz | **Yes** | When it left `pending`. Null while pending |

**Requirements**: FR-22, FR-23, FR-26, FR-28, FR-29, FR-34, FR-35, FR-38

### What the entity deliberately does NOT have

Four absences, each an enforcement or a recorded decision:

| Absent | Why |
|---|---|
| A `seats` or quantity column | FR-22 fixes every request at exactly one seat. The invariant is a row count against an integer, not a sum - which is what makes the capacity guarantee cheap |
| A `note` or `message` column | FR-23. Neither requests nor rejections carry text (Q28=A) |
| A `rejection_reason` column | Same |
| An `expired` status value | FQ1=A. See below |

### Five stored statuses, one derived (FQ1=A)

FR-35 names six states. Only five are stored:

| State | Stored | How it is reached |
|---|---|---|
| `pending` | Yes | Created (FR-22) |
| `accepted` | Yes | Driver accepts, capacity permitting (FR-28, FR-31) |
| `rejected` | Yes | Driver rejects (FR-28) |
| `withdrawn` | Yes | Passenger withdraws (FR-29) |
| `cancelled` | Yes | Driver cancels the ride - written by the trigger (FR-38) |
| **EXPIRED** | **No - derived** | The request is still `pending` and its ride's `departs_at` has passed (FR-36, FR-37) |

**Why EXPIRED is derived rather than stored.** FR-36 (from Q33=A) forbids expiring a request
early, and TC-7's local-only deployment gives a scheduler nowhere to run. So expiry is not an
event anything performs - it is a **consequence** of the ride departing while the request was
still pending. Storing it would require someone to write it, and the only honest moment to do
so is when someone happens to look, which would make a request's state depend on whether it
was observed.

Derived state costs one join to `rides` on every read of a pending request. At NFR-4's scale
that is free.

`decided_at` is null for a derived-EXPIRED request, correctly: nobody ever decided anything.

### Duplicate prevention (FR-26, A-1)

A passenger may hold **at most one active request per ride**, where active means `pending` or
`accepted`. Terminal statuses do not block a fresh request - US-17's third criterion requires
that someone who withdrew by mistake, or was rejected before a seat freed up, can ask again.

Expressed as a **partial unique constraint** on `(ride_id, passenger_id)` restricted to the two
active statuses. A constraint rather than an application check, because a check would leave the
same read-then-write window FR-33 rejects elsewhere - and a duplicate would corrupt the seat
arithmetic the capacity guarantee depends on.

Note this is deliberately per-ride, not per-date. FR-25 permits a passenger to hold pending
requests on several **different** rides at once, including on the same day (Q11=A).

---

## The capacity guarantee (FQ2=A)

**FR-31 to FR-33, story US-22 - the only correctness-critical requirement in the system.**

### What is constrained
The count of `ride_requests` with status `accepted` for a ride must never exceed that ride's
`rides.seats`.

### The mechanism
A database function that, in one transaction:
1. Locks the ride row (`select ... for update`)
2. Counts accepted requests for that ride
3. Updates the request to `accepted` **only if** the count is below `seats`
4. Otherwise returns a distinguishable full outcome

The row lock is the whole point. A second concurrent acceptance on the same ride blocks at
step 1 until the first commits, then counts the **new** total and correctly finds no room.

### Why the obvious alternatives fail
Recorded because the plan offered them and the reasoning should survive.

| Alternative | Why it fails |
|---|---|
| Check the count in the service, then update | The read-then-write window FR-33 explicitly rejects. Two callers both pass the check, both write |
| A single `UPDATE ... WHERE (subquery) < seats` | **Looks** atomic but is not. Under READ COMMITTED, two updates touching *different* request rows do not conflict, so both evaluate the subquery against the pre-commit state and both succeed |

The second is worth spelling out because it is the plausible mistake - it reads as one
statement, and one statement feels atomic.

### Why enforcement is cheap here
FR-22 fixes every request at one seat, so the invariant is a row count against a stored
integer. Had multi-seat requests been permitted (Q26 offered it), this would be a sum over a
quantity column and every part of the guarantee would be harder.

### The single write path
**No other operation sets a request to `accepted`.** The guarantee therefore cannot be
bypassed by a caller, which is what makes it a property of the system rather than a discipline.

---

## Contact disclosure for accepted pairs (FQ3=A)

**FR-30.** Unit 2's `public_profiles` view carries no contact columns and cannot vary its
column list per row, so it cannot serve this. Unit 3 adds the second path.

### The mechanism
An **RLS policy on the `profiles` base table** permitting select when either:
- the caller owns the row (unchanged from Unit 1, BR-1.8), or
- an `accepted` request links the caller and the row's owner in either direction - the caller
  is the passenger and the row is the driver, or the caller is the driver and the row is the
  passenger

### Why in the database rather than in the service
The same reasoning that made Unit 2's view correct. `requirements.md` Section 9.1 records that
no company-domain check exists, so contact data deserves the strongest available enforcement.
With this policy, a bug in C10 cannot leak a phone number - the database simply returns no row.

### What this means for C10
C10 gains a **branch**, and the disclosure rule keeps exactly one home in application code:

| Case | Path |
|---|---|
| Any employee's public data | `public_profiles` view - no contact columns exist |
| A counterparty on an ACCEPTED request | `profiles` base table, permitted by the new policy |
| Anything else | The public path, so contact fields are absent |

Two independent guarantees again: the policy decides what the database will return, and the
return type decides what a caller may read.

**`PublicProfile` is not widened.** The accepted-pair path returns a distinct richer type, so
"a profile with contact details" and "a profile without" remain different things in the type
system rather than one type with sometimes-null fields.

---

## The cancellation cascade (FQ4=A)

**FR-38.** When a ride is cancelled, every request on it - `pending` and `accepted` alike -
moves to `cancelled`.

### The mechanism
A **trigger on `rides`**, firing after an update that sets `status` to `cancelled`. It updates
every non-terminal request for that ride.

### Why a trigger
It cannot be bypassed. A future code path that cancels a ride by some other route still
cascades. FR-38 exists to prevent a passenger believing they hold a seat on a cancelled ride,
and that failure is exactly the kind a forgotten call site produces.

### The cost, stated plainly
A trigger is invisible at the call site. Someone reading `cancelRide` sees one status update
and no cascade. **Mitigation is mandatory, not optional**: the comment Unit 2 left as the
cascade's insertion point must be rewritten to name the trigger, so a reader of the service
still learns that cancelling a ride affects requests.

### Deviation from Application Design, recorded
`application-design/component-methods.md` listed `C9.cancelRequestsForRide` as a service
method. With a trigger it is unnecessary, and calling it as well would double-cancel -
harmlessly, but confusingly. **It will not be implemented.** A data-integrity cascade belongs
in the database; this is a deliberate improvement on the approved design, not an omission.

---

## Relationships

| From | To | Cardinality | On delete |
|---|---|---|---|
| `ride_requests.ride_id` | `rides.id` | many:1 | Cascade |
| `ride_requests.passenger_id` | `profiles.id` | many:1 | Cascade |

Both cascade: a request without a ride or without a passenger is meaningless. Note the chain
this completes - deleting an auth account removes the profile (Unit 1), the rides (Unit 2), and
now the requests.

**Cancelling a ride does not delete its requests** - they are cascaded to `cancelled` status by
the trigger (FR-38) and retained. Deletion happens only when a ride row is genuinely removed,
which no application flow does.

---

## Migration additivity

Unit 3's changes are additive to Units 1 and 2, with one qualification stated honestly.

| Change | Alters earlier units? |
|---|---|
| `request_status` enum, `ride_requests` table, its policies | No - new objects |
| The capacity function | No - new object |
| The cascade trigger on `rides` | **Attaches to** Unit 2's table; does not alter its columns, constraints or policies |
| The accepted-pair policy on `profiles` | **Adds a policy to** Unit 1's table; does not alter or drop `profiles_select_own` |

The last two attach to existing tables. That is the additive pattern
`unit-of-work-dependency.md` anticipated - "each unit adds its own tables and none modifies a
previous unit's" - and `0003_rls_policies.sql` already recorded that Unit 2 or 3 would add a
widening policy to `profiles`. Nothing is dropped or redefined, so Units 1 and 2 remain
independently correct.

---

## Story and Requirement Coverage

| Story | Entities involved |
|---|---|
| US-14, US-16 | `ride_requests` (create) |
| US-15 | `rides.driver_id` compared to the caller |
| US-17 | The partial unique constraint |
| US-18, US-25 | `ride_requests` by ride, joined to `public_profiles` |
| US-19 | The capacity function |
| US-20 | `status` to `withdrawn` |
| US-21, US-13, US-27 | The accepted-pair policy on `profiles` |
| US-22 | The capacity function |
| US-23 | Derived EXPIRED from `rides.departs_at` |
| US-24 | The cascade trigger |
| US-26 | `ride_requests` by passenger |

| Requirement | Support |
|---|---|
| FR-22, FR-23 | No quantity and no message columns exist |
| FR-24 | `rides.driver_id` |
| FR-25 | Uniqueness scoped per ride, not per date |
| FR-26, A-1 | Partial unique constraint on active statuses |
| FR-27 | `public_profiles` join - no contact columns |
| FR-28 | The capacity function, plus a reject transition |
| FR-29 | The withdrawn transition |
| FR-30 | The accepted-pair RLS policy |
| FR-31 to FR-33 | The row-locking capacity function |
| FR-34, FR-35 | Five stored statuses plus derived EXPIRED |
| FR-36, FR-37 | Derived EXPIRED, no stored value and no job |
| FR-38 | The cascade trigger |
| FR-40, FR-41 | `passenger_id` filter plus the upcoming predicate |
| FR-42 | Nothing - no notification mechanism exists, by design |
