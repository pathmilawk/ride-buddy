# Unit of Work Plan - Ride Buddy

**Stage**: INCEPTION - Units Generation, Part 1 Planning
**Date**: 2026-09-03
**Sources**: `requirements.md`, `stories.md`, `application-design/`, `plans/execution-plan.md`
**Status**: Awaiting answers to decomposition questions (UQ1-UQ6), then approval

---

## Terminology

Per `units-generation.md`: a **unit of work** is a logical grouping of stories for development
purposes. Because TC-1 fixes this system as a **single deployable Next.js application**, the
units here are **modules** - logical groupings within one service - not independently
deployable services. There is one Service and three Modules.

This distinction matters for what follows: unit boundaries here are about **build sequencing
and review checkpoints**, not deployment, versioning, or network contracts.

---

## Prior Context

The approved execution plan already proposed a three-unit decomposition, and Application
Design already assigned all 15 components to those units. This stage exists to confirm that
decomposition deliberately rather than inherit it by momentum, and to record the artifacts
the rules require.

**Proposed decomposition, carried forward for confirmation:**

| Unit | Name | Stories | Components | Demonstrable at completion |
|---|---|---|---|---|
| 1 | Foundation | US-01 to US-05, US-28 | C1, C2, C5, C6, C7, C11p, C12, C13, C14p, C15p | Sign in, complete profile, areas selectable |
| 2 | Ride Offering and Discovery | US-06 to US-13, US-25 | C3, C8, C10, C11r, C14r, C15r | Publish a ride, search and find it, no contact details shown |
| 3 | Requests and Matching | US-14 to US-24, US-26, US-27 | C4, C9, C14q, C15q | Request, accept or reject, capacity enforced, contacts exchanged |

---

## DECOMPOSITION QUESTIONS

Answer each by filling in a letter after the `[Answer]:` tag.

## Question UQ1
**Story Grouping.** Confirm the decomposition granularity.

A) Three units as proposed above - Foundation, then Ride Offering and Discovery, then Requests and Matching

B) A single unit containing all 28 stories - simplest tracking, no intermediate checkpoints

C) Two units - Foundation plus Rides combined, then Requests

D) Four or more units - split Ride Offering from Ride Discovery, and Requests from Matching

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question UQ2
**Dependencies.** How should the boundaries between units be treated in the codebase?

A) Units are a planning device only - code is shared freely across unit boundaries via ordinary imports, since it is one application

B) Units own their directories and cross-unit access goes through a declared interface, keeping module boundaries enforceable

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question UQ3
**Team Alignment.** Who will build these units?

A) A single developer working through the units sequentially

B) Multiple developers, one per unit, needing clear ownership boundaries

C) Multiple developers working on the same unit simultaneously

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question UQ4
**Technical Considerations.** Do any units have deployment, scaling, or runtime needs that differ from the others?

A) No - one Next.js application and one Supabase project serve all three units identically (consistent with TC-1, TC-4, TC-7)

B) Yes - one or more units need separate deployment or scaling treatment (please describe)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question UQ5
**Business Domain.** Should unit boundaries follow business domains rather than the demo path?

A) No - keep the demo-path grouping, so each completed unit is something you can show working

B) Yes - regroup along domain boundaries: Identity, Geography, Ride Offering, Ride Matching

C) Hybrid - domain-aligned names, demo-path ordering

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question UQ6
**Code Organization.** How should units map onto the directory structure? Note that AQ1=C already fixed the layout: feature folders for UI over a shared `services/`, `db/`, and `lib/` layer.

A) Units do not appear in the directory structure at all - they are a build-sequencing device, and code lands in the AQ1=C layout regardless of which unit introduced it

B) Units become top-level directories, each containing its own features and services

C) Units map onto feature folders where they align, with shared code in the shared layer

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## EXECUTION CHECKLIST (Part 2 - Generation, runs after approval)

### Phase 1: Unit Definition
- [x] 1.1 Confirm unit count and boundaries per the UQ1 answer
- [x] 1.2 Define each unit's name, purpose, and responsibilities
- [x] 1.3 Assign components to each unit, reconciling with Application Design
- [x] 1.4 State what is demonstrable at the end of each unit
- [x] 1.5 Document the code organization strategy per the UQ6 answer (**greenfield requirement**)
- [x] 1.6 Record the deployment model per the UQ4 answer
- [x] 1.7 Write `application-design/unit-of-work.md`

### Phase 2: Dependency Analysis
- [x] 2.1 Build the unit dependency matrix
- [x] 2.2 Determine build sequence and identify the critical path
- [x] 2.3 Assess parallelisation opportunities per the UQ3 answer
- [x] 2.4 Identify shared resources and coordination points
- [x] 2.5 Verify no circular dependencies between units
- [x] 2.6 Record cross-unit boundary treatment per the UQ2 answer
- [x] 2.7 Write `application-design/unit-of-work-dependency.md`

### Phase 3: Story Mapping
- [x] 3.1 Assign every one of the 28 stories to exactly one unit
- [x] 3.2 Verify no story is unassigned and none is assigned twice
- [x] 3.3 Map the 11 `[DEMO PATH]` stories across units
- [x] 3.4 Map the 5 promoted stories, keeping each with its parent's unit where sensible
- [x] 3.5 Carry requirement coverage through to unit level
- [x] 3.6 Write `application-design/unit-of-work-story-map.md`

### Phase 4: Validation
- [x] 4.1 Verify unit boundaries are coherent - each unit delivers something meaningful
- [x] 4.2 Verify all 28 stories are assigned
- [x] 4.3 Verify all 42 functional requirements are reachable through the unit assignments
- [x] 4.4 Verify all 15 components are assigned to a unit
- [x] 4.5 Verify the dependency graph is acyclic
- [x] 4.6 Check programmatically that story, requirement, and component references resolve
- [x] 4.7 Validate any diagrams per `common/content-validation.md`

### Phase 5: Completion
- [x] 5.1 Update `aidlc-docs/aidlc-state.md`
- [x] 5.2 Log the approval prompt in `audit.md` with an ISO 8601 timestamp
- [x] 5.3 Present the completion message per `units-generation.md` Step 16

---

## Out of Scope for This Stage

- Detailed design within any unit (Functional Design, per unit, CONSTRUCTION)
- Code generation (CONSTRUCTION)
- Estimation and scheduling beyond the ordering already fixed in the execution plan

---

## RESOLVED DECOMPOSITION DECISIONS (answers to UQ1-UQ6)

| Q | Decision | Consequence |
|---|---|---|
| UQ1 = A | Three units - Foundation, Ride Offering and Discovery, Requests and Matching | Confirms the execution plan's proposal. Three per-unit design and code cycles, three demonstrable checkpoints. |
| UQ2 = A | Units are a planning device only; code shared freely via ordinary imports | No module-boundary enforcement, no declared cross-unit interfaces. Keeps the AQ1=C shared layer intact. |
| UQ3 = A | Single developer working sequentially | No ownership boundaries, no coordination protocol, no parallelisation. Matches the linear dependency chain. |
| UQ4 = A | Identical deployment for all three units | One Next.js application, one Supabase project. Consistent with TC-1, TC-4, TC-7. Confirms Infrastructure Design was rightly skipped. |
| UQ5 = A | Keep demo-path grouping rather than domain boundaries | Each completed unit is demonstrable, which is what Q43=A requires. |
| UQ6 = A | Units do not appear in the directory structure | Code lands in the AQ1=C layout regardless of introducing unit. The shared `services/`, `db/`, `lib/` layer stays whole, so the seat-capacity and contact-disclosure rules keep their single homes. |

### Step 7 Ambiguity Analysis - MANDATORY, Result: PASS

Analysed all six answers against the Step 7 criteria.

- **Vague or ambiguous responses**: none. All six are single explicit letter choices, and all
  six selected option A.
- **Undefined criteria or terms**: none. No hybrid options were chosen, so there is no
  case-by-case rule left to define.
- **Contradictory answers**: none. Verified as mutually reinforcing:
  - UQ2=A and UQ6=A are the same decision from two angles - if units are only a planning
    device, they have no reason to appear in the tree
  - UQ3=A and UQ1=A fit: a single developer working sequentially matches a strictly linear
    three-unit chain, and confirms UQ2's parallelisation question is moot
  - UQ4=A confirms the execution plan's decision to skip Infrastructure Design; had the answer
    been B, that skip would have needed revisiting
  - UQ5=A and UQ1=A are consistent: the three proposed units *are* the demo-path grouping
- **Missing generation details**: none. Each answer maps to concrete checklist instructions.
- **Answers combining options**: none.

**No follow-up questions required.**

### One consequence worth recording

UQ2=A and UQ6=A together mean the units have **no representation in the codebase at all**.
That is the right call for a single-developer, single-deployable POC, but it has a practical
implication for CONSTRUCTION: nothing structural will stop code intended for Unit 3 being
written during Unit 2. The unit boundary is a discipline, not a constraint. The story map in
`unit-of-work-story-map.md` is therefore the only record of which work belongs where, which
makes it the artifact to check when deciding whether a unit is actually complete.

**Status**: Planning complete. Awaiting explicit approval before Part 2 - Generation.
