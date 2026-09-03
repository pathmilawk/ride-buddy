# Domain Entities - Unit 2 Ride Offering and Discovery

**Phase**: CONSTRUCTION - Unit 2, Functional Design, Phase 1
**Decisions applied**: FQ1=A (one `departs_at`), FQ2=A (derived seats), FQ3=A (1-8 seats),
FQ4=B (same area permitted), FQ5=B (public-columns view)

**Scope**: technology-agnostic entity definitions. Concrete DDL, indexes and policy text
belong to Code Generation.

---

## Entity: `rides`

One row per trip a driver offers. Owned by this unit.

| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `driver_id` | UUID | No | Foreign key to `profiles.id`. The employee offering the ride |
| `origin_area_id` | UUID | No | Foreign key to `areas.id` |
| `destination_area_id` | UUID | No | Foreign key to `areas.id` |
| `departs_at` | timestamptz | No | Date and departure time in one value (FQ1=A) |
| `seats` | integer | No | Seats offered, 1 to 8 (FQ3=A) |
| `note` | text | **Yes** | Optional free-text detail from the driver (FR-14) |
| `status` | enum | No | `active` or `cancelled`. Defaults to `active` |
| `created_at` | timestamptz | No | Row creation time |

**Requirements**: FR-11, FR-12, FR-13, FR-14, FR-16, FR-34

### Why one `departs_at` rather than separate date and time

FQ1=A. The most frequent question the system asks of a ride is "has it departed?" - FR-17 and
FR-21 both need it, on every search and every My Rides render. With one `timestamptz` that is a
single comparison against now. Date filtering (FR-18) becomes a range query over the day, which
is indexable. NFR-7's single-timezone assumption removes the ambiguity that would otherwise make
"which day is this?" a real question.

The driver still enters a date and a time as two form fields; the two are combined at the
action boundary. Storage shape and input shape are allowed to differ.

### There is no `seats_remaining` column

FQ2=A. Seats remaining is **derived**: the ride's `seats` minus the count of accepted requests
against it. Nothing stores it.

This matters more than it looks. Unit 3's capacity guarantee (FR-31 to FR-33) must enforce that
accepted requests never exceed `seats`. With a derived value, the constraint and the displayed
number come from **the same count of the same rows**, so they cannot disagree. A stored counter
would introduce a second source of truth that the guarantee would then also have to defend.

Because FR-22 fixes every request at exactly one seat, the derivation is a row count against an
integer - not a sum over quantities.

**In Unit 2 there are no requests at all**, so every ride reports its full seat count. That is
correct but untested by anything real; the derivation is only meaningfully exercised in Unit 3.

### There is no `updated_at` and no edit path

FR-15 forbids editing a published ride. The entity has no `updated_at` column because nothing
updates it except the single `status` transition to `cancelled`. **The absence of an update
path is the enforcement**, not a check.

### Status, and what is derived

FR-34: a ride is either `active` or `cancelled`. Two further states that a reader might expect
are **derived, not stored**:

| Apparent state | How it is determined |
|---|---|
| PAST | `departs_at` is earlier than now (assumption A-5, evaluated at query time) |
| FULL | accepted request count equals `seats` (Unit 3) |

Storing either would create a value needing maintenance. PAST would need a scheduled job, which
Q33=A and TC-7 both rule out.

### Origin may equal destination

FQ4=B, chosen by the product owner against the recommendation. A ride whose
`origin_area_id` equals its `destination_area_id` is valid and will be stored. No constraint or
validation rule guards against it. Recorded here so a later reader does not treat its absence
as a missing rule.

---

## Read model: public profile view

**FQ5=B.** Unit 1 left `profiles` readable by its owner only (BR-1.16). FR-19 requires a
driver's **name** to be visible to any employee browsing search results.

Rather than widening the base table, this unit introduces a **view exposing only the public
columns**:

| Column | Exposed |
|---|---|
| `id` | Yes |
| `display_name` | Yes |
| `home_area_id` | Yes |
| `phone` | **No** |
| `email` | **No** |
| `role` | Yes - informational, harmless (FR-7) |

The base `profiles` table stays owner-only. Any authenticated employee may read the view.

**Why this shape.** NFR-2 requires that contact details be absent from what the server
produces, not merely hidden by the interface. A view that does not carry `phone` or `email`
**cannot** leak them, whatever a query or a component does. That is the rule enforced by the
database rather than by developer discipline - and given that `requirements.md` Section 9.1
records the deliberate absence of any company-domain check, having the strongest available
enforcement on contact data is the right trade.

### What this means for C10 ContactProjection

Application Design placed C10 in Unit 2 because search must withhold contact details before any
request exists. FQ5=B moves that enforcement into the database, so C10's Unit 2 role is thinner
than originally envisaged:

- **Unit 2**: C10 owns the read path through the view and defines the `PublicProfile` type, so
  "a profile without contact fields" is a distinct thing in the type system rather than a
  convention.
- **Unit 3**: C10 becomes substantive - it gains the conditional branch releasing phone and
  email to an accepted pair (FR-30), which a fixed view cannot express.

The disclosure rule still has exactly one home in application code. The database now
independently guarantees the Unit 2 half of it, which is NFR-1's two layers working as intended.

---

## Relationships

| From | To | Cardinality | On delete |
|---|---|---|---|
| `rides.driver_id` | `profiles.id` | many:1 | Cascade - removing an employee removes their rides |
| `rides.origin_area_id` | `areas.id` | many:1 | Restrict |
| `rides.destination_area_id` | `areas.id` | many:1 | Restrict |

**Restrict on both area references**, matching Unit 1's choice for `profiles.home_area_id`:
deleting an area that rides refer to should fail loudly rather than silently orphan them. Areas
are seeded and never deleted at runtime, so this is a safety net.

**Cascade on the driver**: a ride with no driver is meaningless. Note that Unit 1 already
cascades `profiles` from `auth.users`, so deleting an auth account removes the profile and now
the rides too - a single chain.

---

## Migration additivity

Unit 2's schema changes are **strictly additive**, as `unit-of-work-dependency.md` requires:

| Change | Alters Unit 1? |
|---|---|
| `ride_status` enum, `rides` table | No - new objects |
| RLS policies on `rides` | No - new objects |
| The public profile view and its grant | **No** - a new view over `profiles`; the base table's owner-only policies from `0003_rls_policies.sql` are untouched |

Nothing in Unit 1's three migrations is modified or dropped. Unit 1 remains independently
correct, which is what keeps its checkpoint meaningful.

---

## What Unit 3 will add around this entity

| Need | Why |
|---|---|
| `ride_requests` referencing `rides.id` and `profiles.id` | The request lifecycle |
| A database-level capacity guarantee over `rides.seats` | FR-31 to FR-33 |
| Read of `rides.driver_id` | To refuse self-requests (FR-24) |
| A policy or path releasing `phone` and `email` to an accepted pair | FR-30 - **the public view deliberately cannot serve this** |
| Extension of the cancellation flow with the request cascade | FR-38 |

The fourth row is the one to carry forward deliberately: FQ5=B solves Unit 2's disclosure need
completely and Unit 3's not at all, by design.

---

## Story and Requirement Coverage

| Story | Entities involved |
|---|---|
| US-06, US-08 | `rides` (create), `areas` |
| US-07 | `rides.note` |
| US-09 | `rides.status` |
| US-10 | `rides.departs_at`, evaluated at query time |
| US-11, US-12 | `rides`, `areas`, public profile view |
| US-13, US-27 | **public profile view** - the Unit 2 half |
| US-25 | `rides` filtered by `driver_id` |

| Requirement | Entity support |
|---|---|
| FR-11 | `origin_area_id` and `destination_area_id` over one shared area table |
| FR-12 | All `rides` fields |
| FR-13 | Single `departs_at`; no recurrence structure exists |
| FR-14 | `rides.note` |
| FR-15 | Enforced by the absence of an update path |
| FR-16 | `rides.status` |
| FR-17, FR-21 | `departs_at` and `status`, both query-time predicates |
| FR-18 | `departs_at` range plus two area equalities |
| FR-19 | `rides.seats` minus accepted count; driver name from the view |
| FR-20, NFR-2 | The public view carries no contact columns |
| FR-34 | `rides.status`, with PAST and FULL derived |
| FR-39, FR-41 | `driver_id` filter plus the upcoming predicate |
