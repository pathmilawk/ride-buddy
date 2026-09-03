# Unit of Work Dependencies - Ride Buddy

**Stage**: INCEPTION - Units Generation, Part 2 Generation, Phase 2
**Decisions applied**: UQ2=A (planning device only), UQ3=A (single developer sequential)

---

## Dependency Matrix

`X` means the row unit depends on the column unit.

| depends on -> | Unit 1 | Unit 2 | Unit 3 |
|---|---|---|---|
| **Unit 1** Foundation | | | |
| **Unit 2** Ride Offering and Discovery | X | | |
| **Unit 3** Requests and Matching | X | X | |

**Strictly linear.** Unit 1 → Unit 2 → Unit 3. The matrix is lower-triangular, which is
sufficient proof of acyclicity (checklist 2.5): a unit can only depend on a
lower-numbered one, so no cycle is expressible.

**Topological order**: Unit 1, Unit 2, Unit 3. Exactly one valid ordering exists.

---

## Why each dependency exists

### Unit 2 depends on Unit 1

| Need | Provided by |
|---|---|
| An identified driver to own a ride | C5 AuthService, C13 AuthContext |
| The profile completeness gate before ride creation (FR-6) | C6 `assertCanAct` |
| Areas to select as origin and destination (FR-8, FR-9) | C2 AreaRepository, C7 AreaService |
| A driver name to display in search results (FR-19) | C1 ProfileRepository |
| The Result type for typed business outcomes | C12 Result |

Hard dependency. Ride creation cannot be built or demonstrated without a signed-in user with
a home area.

### Unit 3 depends on Unit 1

| Need | Provided by |
|---|---|
| An identified passenger to own a request | C5, C13 |
| The completeness gate before requesting a seat (FR-6) | C6 `assertCanAct` |
| Requester name and pickup area for the driver's review (FR-27) | C1 ProfileRepository |
| Phone and email revealed after acceptance (FR-30) | C1 ProfileRepository |

### Unit 3 depends on Unit 2

| Need | Provided by |
|---|---|
| A ride to request a seat on | C3 RideRepository |
| The ride's seat count, for the capacity guarantee (FR-31) | C3 RideRepository |
| The ride's driver id, to refuse self-requests (FR-24) | C3 RideRepository |
| **The contact projection function** (FR-27, FR-30) | **C10 ContactProjection** |
| Ride cancellation, which triggers the cascade (FR-38) | C8 RideService |

The C10 dependency is worth noting: Unit 3 does not build the disclosure rule, it *supplies a
different linking status to the same function Unit 2 built*. That is what makes FR-20 and
FR-30 one rule rather than two features.

---

## Build Sequence and Critical Path

```
Unit 1 Foundation  ->  Unit 2 Ride Offering and Discovery  ->  Unit 3 Requests and Matching
   45-60 min                      60-75 min                            75-90 min
```

**Every unit is on the critical path.** With a strictly linear chain there is no slack and no
alternative ordering. Delay in any unit delays the whole build one-for-one.

**Parallelisation opportunities: none** (checklist 2.3). Two reasons, either sufficient:
- UQ3=A puts a single developer on the work, so there is nobody to parallelise with
- The dependency chain is linear, so even with more developers Unit 2 could not start before
  Unit 1 delivered profiles and areas

---

## Shared Resources and Coordination Points

| Shared resource | Introduced in | Extended in | Coordination note |
|---|---|---|---|
| Supabase project and schema | Unit 1 (profiles, areas) | Unit 2 (rides), Unit 3 (ride_requests) | Migrations are additive and ordered; each unit adds tables, none alters an earlier unit's |
| C11 ValidationSchemas | Unit 1 (credentials, profile) | Unit 2 (ride create, search) | New schemas added; existing ones untouched |
| C14 Server Actions | Unit 1 (auth, profile) | Unit 2 (rides), Unit 3 (requests) | New action files per feature; the thin-boundary rule applies throughout |
| C15 Feature UI | Unit 1 (auth, profile) | Unit 2 (rides, search), Unit 3 (requests) | New feature folders; shared layout established in Unit 1 |
| C10 ContactProjection | Unit 2 | Unit 3 supplies new linking statuses | **No change to the function itself in Unit 3** - only new callers |
| C12 Result | Unit 1 | Units 2 and 3 add outcome codes | `RIDE_FULL` and `DUPLICATE_REQUEST` arrive in Unit 3 |

**The one coordination point that matters**: the schema. Each unit adds its own tables and
none modifies a previous unit's, so migrations are strictly additive. This means a unit can be
completed and demonstrated without any later unit forcing a rewrite of its schema - which is
what makes the checkpoints real rather than notional.

---

## Cross-Unit Boundary Treatment (checklist 2.6)

Per UQ2=A, units are a planning device only:

| Aspect | Treatment |
|---|---|
| Imports across unit boundaries | Ordinary imports, unrestricted |
| Declared cross-unit interfaces | None |
| Module boundary enforcement | None |
| Versioning between units | Not applicable - one deployable |
| Network contracts | None - all communication is in-process |
| Directory separation | None, per UQ6=A |

**The honest consequence**: nothing mechanical stops work intended for Unit 3 being written
during Unit 2. The boundary is a discipline maintained by the story map, not a constraint
enforced by the codebase. For a single developer on a POC that is a reasonable trade - the
alternative would fragment the shared layer that Application Design deliberately created.

---

## Rollback Strategy

| Scenario | Recovery |
|---|---|
| A unit's code is wrong | Git revert; no other unit's code depends on the *implementation*, only the interfaces |
| A unit's schema is wrong | Add a corrective migration; earlier units' tables are untouched, so no data migration cascade |
| Mid-sequence abandonment | Units 1 and 2 remain independently demonstrable - Unit 1 alone gives sign-in and profiles, Units 1 and 2 give ride publishing and search |

That last row is the practical value of this decomposition. Against a 4-hour budget, stopping
after Unit 2 still leaves something to show.

---

## Testing Checkpoints

| After | Verify |
|---|---|
| Unit 1 | Registration, sign-in, profile completion, area selection, and the completeness gate refusing action |
| Unit 2 | Ride publishing, search by date and both areas, past-ride exclusion, and **no driver phone number in any output** |
| Unit 3 | Request lifecycle across all six states, **seat capacity under concurrent acceptance**, the cancellation cascade, and contact exchange on acceptance |

Per NFR-6, automated unit tests are scoped to seat availability and request state transitions,
both of which land in Unit 3. Units 1 and 2 are verified by walking their demo paths.

**Note this asymmetry**: the two checkpoints with no automated test coverage come first, and
the unit carrying the one correctness-critical requirement comes last. That ordering is
correct - it is dependency-driven - but it means the highest-risk work happens when the least
time remains. Worth knowing before starting rather than discovering at the 3-hour mark.
