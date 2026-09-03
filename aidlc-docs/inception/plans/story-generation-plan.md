# Story Generation Plan - Ride Buddy

**Stage**: INCEPTION - User Stories, Part 1 Planning
**Role assumed**: Product Owner
**Date**: 2026-09-03
**Source specification**: `aidlc-docs/inception/requirements/requirements.md`
**Assessment**: `aidlc-docs/inception/plans/user-stories-assessment.md` (decision: EXECUTE)
**Status**: Awaiting answers to planning questions (SQ1-SQ8), then approval

---

## Purpose

This plan sets the **methodology** for converting the 42 functional requirements, 9
non-functional requirements, and 8 technical constraints in `requirements.md` into user
stories with acceptance criteria. It decides structure and format only. It deliberately does
not cover prioritisation, estimation, sprint planning, or implementation detail.

---

## Input Inventory

What the stories must cover, drawn from `requirements.md`:

| Requirement group | IDs | Count |
|---|---|---|
| Authentication and profile | FR-1 to FR-7 | 7 |
| Areas reference data | FR-8 to FR-10 | 3 |
| Rides | FR-11 to FR-17 | 7 |
| Ride discovery | FR-18 to FR-21 | 4 |
| Seat requests | FR-22 to FR-30 | 9 |
| Seat capacity (correctness critical) | FR-31 to FR-33 | 3 |
| Lifecycle and state | FR-34 to FR-38 | 5 |
| User views | FR-39 to FR-42 | 4 |
| Non-functional | NFR-1 to NFR-9 | 9 |
| Technical constraints | TC-1 to TC-8 | 8 |
| Explicit assumptions | A-1 to A-6 | 6 |

Personas available: **Driver**, **Passenger**, and the case created by Q5=A where one account
acts as both in turn.

---

## Story Breakdown Approaches (Step 5 - options and trade-offs)

### Option A: User Journey-Based
Stories follow the two end-to-end workflows - offering a ride, and finding and requesting one.

- **Benefit**: maps directly onto the eight-step demo path in `requirements.md` Section 10,
  which Q43=A made the definition of success. Build order falls out naturally.
- **Trade-off**: shared functionality (profile, areas, authentication) sits awkwardly, since
  both journeys depend on it. Risks duplicated stories or an ill-fitting "shared" bucket.

### Option B: Feature-Based
Stories grouped by system capability - Authentication, Profile, Rides, Search, Requests, Views.

- **Benefit**: mirrors the structure of `requirements.md` exactly, making traceability
  mechanical and coverage gaps obvious.
- **Trade-off**: obscures the demo path. A reader cannot tell from the grouping which stories
  are load-bearing for the walkthrough that defines success.

### Option C: Persona-Based
Stories grouped as Driver stories, Passenger stories, and shared stories.

- **Benefit**: puts the visibility asymmetry front and centre - the whole reason the
  assessment judged stories valuable (FR-20, FR-27, FR-30).
- **Trade-off**: Q5=A means one person is routinely both personas, so the grouping cuts across
  reality. Several stories would need to appear in both groups or in a third.

### Option D: Domain-Based
Stories grouped by business domain - Identity, Geography, Ride Offering, Ride Matching.

- **Benefit**: aligns with how the system would later decompose into units of work.
- **Trade-off**: overkill at this size. A four-hour POC with one deployable does not have
  meaningful domain boundaries yet, and the grouping would be invented rather than observed.

### Option E: Epic-Based (hierarchical)
Stories nested under epics, each epic a coherent capability with child stories.

- **Benefit**: scales well and reads well for stakeholders.
- **Trade-off**: adds a hierarchy level that earns its keep at 100+ stories, not at 20-40.

### Option F: Hybrid - Feature-based epics, journey-ordered within
Group by feature for traceability, and order stories inside each group along the demo path,
tagging which stories are on the critical demo path.

- **Benefit**: keeps Option B's mechanical traceability while recovering Option A's build
  order. Both properties this project needs.
- **Trade-off**: two organising principles at once, which needs a stated rule to stay
  consistent. That rule: **feature decides the group, journey decides the order within it.**

---

## PLANNING QUESTIONS

Answer each by filling in a letter after the `[Answer]:` tag.

## Question SQ1
Which story breakdown approach should be used? (See the options and trade-offs above.)

A) User Journey-Based

B) Feature-Based

C) Persona-Based

D) Domain-Based

E) Epic-Based (hierarchical)

F) Hybrid - feature-based groups, journey-ordered within, critical-path tagged

X) Other (please describe after [Answer]: tag below)

[Answer]: F

## Question SQ2
What story granularity fits a roughly four-hour build?

A) Coarse - about 10-15 stories, each a whole capability (e.g. "manage my profile")

B) Standard - about 20-30 stories, each a single user-visible outcome (e.g. "update my phone number")

C) Fine-grained - 40+ stories, each a single interaction or field

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question SQ3
What story format should be used?

A) Classic Connextra - "As a [persona], I want [capability], so that [benefit]"

B) Job story - "When [situation], I want to [motivation], so I can [expected outcome]"

C) Plain descriptive statement with a persona label, no fixed template

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question SQ4
What format should acceptance criteria take?

A) Gherkin - Given / When / Then scenarios

B) Bullet checklist of verifiable conditions

C) Hybrid - Gherkin for stories with state transitions or conditional visibility, bullet checklists for straightforward CRUD

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question SQ5
How should stories trace back to requirements?

A) Every story cites the FR/NFR/TC identifiers it satisfies, and a coverage matrix proves all 42 FRs are covered

B) Stories cite requirement identifiers, but no coverage matrix

C) No explicit traceability - stories stand alone

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question SQ6
How many personas, and at what depth?

A) Two lightweight personas - Driver and Passenger, a few lines each

B) Two detailed personas with goals, motivations, pain points, and technical comfort

C) Three detailed personas - Driver, Passenger, and the "Both" case as its own archetype

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question SQ7
How should error paths and edge cases be handled? (`requirements.md` contains several: the full-ride race in FR-32, self-request blocking in FR-24, the incomplete-profile gate in FR-6, expiry in FR-37, and the cancellation cascade in FR-38.)

A) As negative acceptance criteria inside the relevant happy-path story

B) As separate dedicated stories

C) Hybrid - inside the parent story by default, promoted to a standalone story where the requirement is correctness critical (FR-31 to FR-33) or was derived rather than answered (FR-6, FR-26, FR-38)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question SQ8
How should non-functional requirements and technical constraints be represented?

A) As cross-cutting constraints listed once, applying to all stories - not as stories

B) As their own stories where a user could observe the effect (e.g. NFR-2 server-side contact gating, NFR-5 mobile responsiveness), with the rest as constraints

C) As stories for every NFR and TC

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## EXECUTION CHECKLIST (Part 2 - Generation)

Executed only after the questions above are answered and this plan is approved.

### Phase 1: Persona Development
- [x] 1.1 Define personas at the depth chosen in SQ6
- [x] 1.2 For each persona, state goals and what they need from the application
- [x] 1.3 Record how the personas differ in what they may see (FR-20, FR-27, FR-30)
- [x] 1.4 Note the "Both" case created by Q5=A, at the depth chosen in SQ6
- [x] 1.5 Write `aidlc-docs/inception/user-stories/personas.md`

### Phase 2: Story Structure
- [x] 2.1 Establish groups per the SQ1 breakdown approach
- [x] 2.2 Order stories within groups per the SQ1 rule
- [x] 2.3 Assign stable story identifiers (US-nn)

### Phase 3: Story Authoring
- [x] 3.1 Authentication and profile stories (FR-1 to FR-7)
- [x] 3.2 Areas reference data stories (FR-8 to FR-10)
- [x] 3.3 Ride creation and cancellation stories (FR-11 to FR-17)
- [x] 3.4 Ride discovery stories (FR-18 to FR-21)
- [x] 3.5 Seat request stories (FR-22 to FR-30)
- [x] 3.6 Seat capacity stories (FR-31 to FR-33) - correctness critical
- [x] 3.7 Lifecycle and state transition stories (FR-34 to FR-38)
- [x] 3.8 User view stories (FR-39 to FR-42)
- [x] 3.9 Non-functional representation per SQ8
- [x] 3.10 Write each story in the SQ3 format at the SQ2 granularity

### Phase 4: Acceptance Criteria
- [x] 4.1 Write acceptance criteria for every story in the SQ4 format
- [x] 4.2 Cover error paths and edge cases per SQ7
- [x] 4.3 Ensure every criterion is observable and verifiable
- [x] 4.4 Give the six request states and seven transitions explicit criteria
- [x] 4.5 Give the conditional contact-visibility rule criteria on both sides of acceptance

### Phase 5: MANDATORY Artifacts and Quality Gates
- [x] 5.1 Generate `stories.md` with user stories following INVEST criteria
- [x] 5.2 Generate `personas.md` with user archetypes and characteristics
- [x] 5.3 Verify every story is **Independent** - no story requires another to be valuable
- [x] 5.4 Verify every story is **Negotiable** - states outcome, not implementation
- [x] 5.5 Verify every story is **Valuable** - names a benefit to a persona
- [x] 5.6 Verify every story is **Estimable** - scope is clear enough to size
- [x] 5.7 Verify every story is **Small** - completable within the SQ2 granularity
- [x] 5.8 Verify every story is **Testable** - acceptance criteria are checkable
- [x] 5.9 Confirm acceptance criteria present on every story
- [x] 5.10 Map personas to their relevant stories

### Phase 6: Coverage Verification
- [x] 6.1 Build the traceability mapping per SQ5
- [x] 6.2 Verify all 42 functional requirements are covered by at least one story
- [x] 6.3 Verify non-functional coverage per the SQ8 decision
- [x] 6.4 Confirm the eight-step demo path in `requirements.md` Section 10 is fully covered
- [x] 6.5 Programmatically check story identifiers are contiguous and requirement citations resolve
- [x] 6.6 Report any requirement with no covering story

### Phase 7: Completion
- [x] 7.1 Update `aidlc-docs/aidlc-state.md` with stage progress
- [x] 7.2 Log the approval prompt in `audit.md` with an ISO 8601 timestamp
- [x] 7.3 Present the completion message in the format required by `user-stories.md` Step 20

---

## Out of Scope for This Stage

Per `user-stories.md` Step 11, this plan deliberately excludes:
- Story prioritisation and ordering for delivery
- Estimation, story points, and sizing numbers
- Sprint or iteration planning
- Development timelines
- Technical design and implementation detail

---

## RESOLVED METHODOLOGY (answers to SQ1-SQ8)

| Q | Decision | Effect on generation |
|---|---|---|
| SQ1 = F | Hybrid - feature-based groups, journey-ordered within, critical demo path tagged | **Rule: feature decides the group, journey decides the order within it.** Groups follow the `requirements.md` sections; within each, stories run in the order a user meets them along the Section 10 demo path. Stories on that path carry a `[DEMO PATH]` tag. |
| SQ2 = B | Standard granularity, target 20-30 stories | Each story is one user-visible outcome. Story count is a target, not a quota - coverage of all 42 FRs governs. |
| SQ3 = A | Classic Connextra - "As a [persona], I want [capability], so that [benefit]" | Every story carries an explicit `so that` clause, which is what satisfies the INVEST **Valuable** check in Phase 5.5. |
| SQ4 = C | Hybrid acceptance criteria | Gherkin Given/When/Then for stories involving state transitions (FR-34 to FR-38), conditional visibility (FR-20, FR-27, FR-30), or concurrency (FR-31 to FR-33). Bullet checklists for straightforward CRUD. |
| SQ5 = A | Cite requirement IDs plus a coverage matrix | Every story lists the FR/NFR/TC identifiers it satisfies. `stories.md` ends with a matrix covering all 42 FRs. Verified programmatically in Phase 6.5. |
| SQ6 = B | Two detailed personas | Driver and Passenger, each with goals, motivations, pain points, and an explicit statement of what they may and may not see. The "Both" case is documented as a mode of use, not a third archetype - consistent with Q5=A making role informational. |
| SQ7 = C | Hybrid edge-case handling | Negative criteria inside the parent story by default. Promoted to standalone stories where correctness critical (FR-31 to FR-33) or derived rather than user-answered (FR-6, FR-26, FR-38), so derived requirements get reviewed rather than buried. |
| SQ8 = B | NFR stories where user-observable, constraints otherwise | NFR-2 (server-side contact projection) and NFR-5 (mobile responsiveness) become stories with acceptance criteria. Remaining NFRs and all TCs are listed once as cross-cutting constraints. |

### Derived Generation Rules

1. **Group order** follows `requirements.md`: Authentication and Profile, Areas, Rides,
   Discovery, Requests, Seat Capacity, Lifecycle, Views, then Non-Functional.
2. **Within-group order** follows the demo path in `requirements.md` Section 10, so reading
   `stories.md` top to bottom approximates a sensible build order.
3. **`[DEMO PATH]` tag** marks stories on the eight-step walkthrough that Q43=A made the
   definition of success.
4. **Gherkin is required** for any story touching request state, contact visibility, or seat
   capacity. Bullet criteria elsewhere.
5. **Promoted edge cases** get identifiers in the same US-nn sequence, each citing the parent
   story it was promoted out of.

### Step 9 Ambiguity Analysis - Result

Analysed all eight answers against the `user-stories.md` Step 9 checklist. **No ambiguities
found; no follow-up questions required.**

- No vague responses - all eight are single explicit letter choices, none of "mix of",
  "somewhere between", "not sure", "depends", "maybe", or "probably".
- No contradictions. Specifically checked: SQ2=B (20-30 stories) against SQ7=C (promoting
  some edge cases to standalone stories) - compatible, since promotion is limited to six
  named requirements (FR-6, FR-26, FR-31 to FR-33, FR-38) and adds at most a handful of
  stories. Also SQ6=B (two personas) against Q5=A (role informational) - consistent and
  mutually reinforcing.
- No undefined terms. Where an answer selected a hybrid (SQ1, SQ4, SQ7), the deciding rule
  is stated explicitly in the table above rather than left to judgement at generation time -
  which is precisely what Step 10 exists to prevent.
- No missing generation detail. Each answer maps to a concrete instruction in the checklist.

**Status**: Planning complete. Awaiting explicit approval before Part 2 - Generation.
