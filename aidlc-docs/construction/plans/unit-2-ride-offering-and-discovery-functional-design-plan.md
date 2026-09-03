# Functional Design Plan - Unit 2 Ride Offering and Discovery

**Phase**: CONSTRUCTION
**Unit**: Unit 2 - Ride Offering and Discovery
**Stage**: Functional Design
**Date**: 2026-09-03
**Status**: Awaiting answers to design questions (FQ1-FQ8)

---

## Step 1: Unit Context

**Purpose** (from `unit-of-work.md`): a driver publishes a trip and a passenger finds it -
without any contact details changing hands.

**Stories assigned**

| Story | Title | Tags |
|---|---|---|
| US-06 | Offer a ride to the office | `[DEMO PATH]` |
| US-07 | Add a note to my ride | |
| US-08 | Offer a ride home from the office | |
| US-09 | Correct a ride I got wrong | |
| US-10 | Stop seeing rides that have already left | |
| US-11 | Search for a ride | `[DEMO PATH]` |
| US-12 | See enough about a ride to decide | `[DEMO PATH]` |
| US-13 | Not be able to see contact details I have not earned | `[DEMO PATH]` |
| US-25 | See the rides I am driving | |
| US-27 | Have my contact details withheld at the source | |

**Requirements in scope**: FR-11 to FR-21, FR-34, FR-39, FR-41, NFR-2, and assumptions A-2, A-5

**Components in scope**: C3 RideRepository, C8 RideService, **C10 ContactProjection**,
C11 (ride creation and search schemas), C14 (ride actions), C15 (rides and search features)

**Entity owned by this unit**: `rides`

### Dependencies satisfied by Unit 1

| Needed | Provided |
|---|---|
| An identified driver | C5 AuthService, C13 AuthContext |
| The completeness gate before ride creation (FR-6) | `C6.assertCanAct` |
| Areas for origin and destination (FR-8, FR-9) | C2 AreaRepository, C7 AreaService, `AreaSelect` |
| Driver names for search results (FR-19) | C1 ProfileRepository |
| Typed business outcomes | C12 Result |

All seven of Unit 1's downstream contracts are in place and verified by build.

### Downstream obligations - what Unit 3 will rely on

- `rides` rows with a seat count and a driver id, for the capacity guarantee (FR-31)
- The driver id, so self-requests can be refused (FR-24)
- **C10 ContactProjection** - Unit 3 does not build the disclosure rule, it supplies a
  different linking status to the same function
- Ride cancellation, which Unit 3 extends with the request cascade (FR-38)
- Whatever mechanism makes another employee's profile readable, since Unit 3 must widen it
  further for accepted pairs

### Carried-forward finding

`unit-of-work-story-map.md` records that **US-13, US-25 and US-27 have acceptance criteria
that cannot be satisfied inside this unit**. Their Unit-2 criteria are in scope here; the
remainder complete in Unit 3, which must re-verify all three in full. This is settled and
approved - it is restated so this unit's checkpoint is judged against the right bar.

Specifically out of scope for Unit 2, despite appearing in those stories:
- Requester contact withholding on a driver's pending-request list (no requests exist yet)
- The request list and accept/reject actions on My Rides
- Accepted-request output including contact fields

### A note on seats remaining

With no requests until Unit 3, every ride shows its full seat count. FR-19's "seats remaining
reflects accepted requests" is therefore trivially satisfied but not meaningfully exercised
until Unit 3. Recorded so it is not mistaken for working proof.

---

## DESIGN QUESTIONS

Answer each by filling in a letter after the `[Answer]:` tag.

## Question FQ1
**Domain Model.** How should a ride's departure date and time be stored?

A) One `departs_at timestamptz` column - a single comparison answers "has it departed?", and date filtering becomes a range query

B) Separate `ride_date date` and `departure_time time` columns - date filtering is a plain equality, matching the two form fields the driver fills in

C) Both - `departs_at` plus a generated date column, so each query uses whichever is cheaper

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ2
**Domain Model and Data Flow.** How should "seats remaining" be determined?

A) Derived - count accepted requests and subtract from the ride's seat count. No stored counter

B) Stored - a `seats_remaining` counter column, decremented on acceptance and incremented on withdrawal

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ3
**Business Rules.** What limits should ride creation enforce?

A) Departure must be in the future; seats between 1 and 8; no limit on how far ahead

B) As above, plus a maximum of 30 days ahead

C) Departure must be in the future, and nothing else constrained

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ4
**Business Rules.** May a ride's origin and destination be the same area?

A) No - reject it as a validation error

B) Yes - allow it, since it harms nothing

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question FQ5
**Integration Points.** Unit 1 left `profiles` readable by its owner only. FR-19 needs a driver's **name** visible to any employee browsing search results, and FR-30 will later need phone and email visible to an accepted pair. How should that be opened up?

A) Add an RLS policy letting any authenticated user select any profile row, and rely on the C10 projection in application code to strip contact fields

B) Expose a database view carrying only the public columns (id, display_name, home_area_id) and grant select on that, leaving the base table owner-only - so contact columns never leave the database for a non-owner. Unit 3 then adds a policy for accepted pairs

C) Keep the base table owner-only and read driver names through a service-role path in the server layer

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question FQ6
**Frontend Components.** Where should search results appear?

A) On the same page beneath the filters, driven by URL search parameters and rendered on the server

B) On a separate results page

C) Preload upcoming rides and filter them in the browser

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ7
**Business Scenarios.** What should the search screen show on a first visit, before any filter is chosen?

A) Nothing until the user picks filters and searches

B) Default to today's date with no area filter, listing every upcoming ride

C) Prefill the origin with the employee's own home area and the date with today, then show matching rides immediately

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question FQ8
**Error Handling.** Cancelling a ride is irreversible, and FR-15 rules out editing. How should cancellation be guarded?

A) Require an explicit confirmation step before cancelling

B) Cancel immediately on click

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## EXECUTION CHECKLIST

### Phase 1: Domain Entities
- [x] 1.1 Define the `rides` entity and its fields, per FQ1 and FQ2
- [x] 1.2 Define the ride status concept (ACTIVE, CANCELLED) and what is derived (FR-34)
- [x] 1.3 Define relationships to `profiles` (driver) and `areas` (origin, destination)
- [x] 1.4 Specify how "upcoming" is evaluated, per FQ1 and assumption A-5
- [x] 1.5 Specify how seats remaining is obtained, per FQ2
- [x] 1.6 Specify the profile-visibility mechanism, per FQ5
- [x] 1.7 Note what Unit 3 will add to this entity's surroundings
- [x] 1.8 Write `functional-design/domain-entities.md`

### Phase 2: Business Rules
- [x] 2.1 Ride creation rules, per FQ3 and FQ4
- [x] 2.2 The completeness gate call before creation (FR-6, reusing Unit 1's gate)
- [x] 2.3 The absence of any edit path (FR-15)
- [x] 2.4 Cancellation rules and ownership, per FQ8
- [x] 2.5 Past-ride exclusion rules (FR-17, FR-21)
- [x] 2.6 Search and matching rules (FR-18, FR-10 exact matching)
- [x] 2.7 Result presentation rules including the full marker and own-ride marker (FR-19, A-2, FR-24)
- [x] 2.8 **The contact disclosure rule as C10 implements it** (FR-20, NFR-2)
- [x] 2.9 Authorization rules for both layers (NFR-1), per FQ5
- [x] 2.10 Failure outcomes, and any new `BusinessOutcome` codes this unit adds
- [x] 2.11 Write `functional-design/business-rules.md`

### Phase 3: Business Logic Model
- [x] 3.1 Model ride creation, including the gate call
- [x] 3.2 Model ride cancellation, per FQ8, noting where Unit 3 inserts the cascade
- [x] 3.3 Model search and discovery, per FQ6 and FQ7
- [x] 3.4 Model the batch profile read and projection path (FR-19, FR-20)
- [x] 3.5 Model My Rides, scoped to what Unit 2 can satisfy of US-25
- [x] 3.6 Model past-ride exclusion at query time
- [x] 3.7 Map each flow to its stories and requirements
- [x] 3.8 Write `functional-design/business-logic-model.md`

### Phase 4: Frontend Components
- [x] 4.1 Define the component hierarchy for the rides and search features
- [x] 4.2 Define props and state per component
- [x] 4.3 Define user interaction flows, per FQ6 and FQ7
- [x] 4.4 Define form validation rules and where they run
- [x] 4.5 Define which Server Action or service each component uses
- [x] 4.6 Record `data-testid` naming, including the reused `AreaSelect` identifiers
- [x] 4.7 Confirm the Unit 1 responsive shell is inherited rather than restated (NFR-5)
- [x] 4.8 Write `functional-design/frontend-components.md`

### Phase 5: Validation
- [x] 5.1 Verify all 10 assigned stories are covered, and that US-13, US-25 and US-27 are covered only to their Unit 2 extent
- [x] 5.2 Verify FR-11 to FR-21, FR-34, FR-39, FR-41 and NFR-2 are addressed
- [x] 5.3 Verify the five downstream obligations to Unit 3 are specified
- [x] 5.4 Verify Unit 1's contracts are consumed and none is broken
- [x] 5.5 Verify migrations remain additive - nothing alters a Unit 1 table
- [x] 5.6 Verify no infrastructure concerns have leaked in
- [x] 5.7 Check story and requirement references programmatically
- [x] 5.8 Validate any diagrams per `common/content-validation.md`

### Phase 6: Completion
- [x] 6.1 Update `aidlc-docs/aidlc-state.md`
- [x] 6.2 Log the approval prompt in `audit.md` with an ISO 8601 timestamp
- [x] 6.3 Present the completion message per `functional-design.md` Step 7

---

## Out of Scope for This Stage

- Concrete SQL, migration files, and RLS policy text (Code Generation)
- Anything in Unit 3 - seat requests, the capacity guarantee, the cancellation cascade, contact exchange
- Deployment and infrastructure

---

## RESOLVED DESIGN DECISIONS (answers to FQ1-FQ8)

| Q | Decision | Consequence |
|---|---|---|
| FQ1 = A | One `departs_at timestamptz` column | FR-17's past-ride check is a single comparison; date filtering is an indexable range query. Single timezone (NFR-7) removes ambiguity. |
| FQ2 = A | Seats remaining is **derived** by counting accepted requests | No stored counter, so no drift. Since FR-22 fixes each request at one seat, Unit 3's database constraint counts the same rows from the same source. |
| FQ3 = A | Departure must be future; seats 1 to 8; no horizon cap | Seat bounds keep the capacity guarantee meaningful. |
| FQ4 = **B** | Origin and destination **may** be the same area | See the note below. |
| FQ5 = B | A public-columns view; base table stays owner-only | Contact columns never leave the database for a non-owner - NFR-2 enforced by the database rather than by discipline. Changes C10's role, see below. |
| FQ6 = A | Filters and results on one page, state in URL search params, server-rendered | No client-side state; a search is a shareable link. Fits AQ2=A. |
| FQ7 = C | Prefill origin from the employee's home area, date from today | Uses profile data Unit 1 already collects; the screen is useful on first load. |
| FQ8 = A | Cancellation requires an explicit confirmation step | Cancellation is permanent, and in Unit 3 it will also cascade accepted passengers' seats away. |

### Note on FQ4 = B, chosen against the recommendation

I recommended rejecting a same-area ride on the grounds that a Forus-to-Forus trip carries
nobody anywhere and both selects draw from one list, so it is an easy slip. The product owner
chose to allow it. **That is their decision and it is settled - it will not be raised again.**

Recorded consequence, so nobody later reads this as an oversight: a ride whose origin equals
its destination is valid, will be stored, and will appear in search results when both filters
name that area. No validation rule guards against it.

### Note on FQ5 = B changing C10's role in this unit

Application Design placed C10 ContactProjection in Unit 2 on the grounds that ride search must
withhold driver contact details before any request exists. FQ5=B moves that enforcement into
the database: a view that does not carry `phone` or `email` cannot leak them, whatever the
application does.

**This is strictly stronger than the original plan**, and worth stating plainly rather than
quietly narrowing C10's scope:

- **In Unit 2**, C10 becomes the read path through the public view plus the `PublicProfile`
  type that makes "a profile without contact fields" a distinct thing in the type system.
  It is thin, because the database is doing the work.
- **In Unit 3**, C10 becomes substantive: it gains the conditional branch that releases phone
  and email when an accepted request links two people (FR-30), which no view can express on
  its own.

The rule still has exactly one home in application code. What changed is that the database now
independently guarantees the Unit 2 half of it - which is what NFR-1's two layers are for.

### Step 5 Ambiguity Analysis - MANDATORY, Result: PASS

- **Vague or ambiguous responses**: none. All eight are single explicit letter choices.
- **Undefined criteria or terms**: none. No hybrid options selected.
- **Contradictory answers**: none. Cross-checks:
  - FQ1=A with FQ7=C - a `timestamptz` and a default of "today" compose directly as a range
  - FQ2=A with Unit 3's capacity guarantee - mutually reinforcing; both count the same rows
  - FQ5=B with FR-30 - not a conflict but a **downstream obligation**: Unit 3 must add a policy
    or path for accepted pairs, because the public view deliberately cannot serve FR-30
  - FQ6=A with FQ7=C - prefilling is expressing defaults as search params, the same mechanism
  - FQ8=A with FR-15 - consistent; cancellation being the only correction path is exactly why
    it deserves a confirmation step
  - FQ4=B with FQ3=A - no interaction; seat bounds and area equality are independent
- **Missing design details**: none.

**No follow-up questions required.** Proceeding to Step 6, artifact generation.
