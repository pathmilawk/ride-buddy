# Application Design Plan - Ride Buddy

**Stage**: INCEPTION - Application Design
**Date**: 2026-09-03
**Sources**: `requirements/requirements.md`, `user-stories/stories.md`, `plans/execution-plan.md`
**Status**: Awaiting answers to design questions (AQ1-AQ6), then approval

---

## Purpose and Boundary

This stage identifies **components, their responsibilities, method signatures, the service
layer, and dependencies**. It does **not** design detailed business logic - that happens in
Functional Design, per unit, during CONSTRUCTION.

The execution plan gave a specific reason for executing this stage: TC-1 places all server
logic inside a single Next.js application, where the path of least resistance is to write
business rules directly into route handlers or components. Two rules in particular must not
be scattered:

1. **Seat capacity enforcement** (FR-31 to FR-33) - correctness critical, and FR-33 rules out
   application-layer checking as sufficient
2. **Conditional contact projection** (FR-20, FR-30, NFR-2) - the same phone number must be
   absent from some responses and present in others

Deciding where those two live is the main work of this stage.

---

## Context Analysis (Step 1)

### Business capabilities identified

| Capability | Stories | Requirements |
|---|---|---|
| Identity and profile | US-01 to US-04 | FR-1 to FR-7 |
| Geography reference data | US-05 | FR-8 to FR-10 |
| Ride offering | US-06 to US-10 | FR-11 to FR-17 |
| Ride discovery | US-11 to US-13 | FR-18 to FR-21 |
| Seat request lifecycle | US-14 to US-21, US-23, US-24 | FR-22 to FR-30, FR-34 to FR-38 |
| Capacity enforcement | US-22 | FR-31 to FR-33 |
| Personal views | US-25, US-26 | FR-39 to FR-42 |
| Contact disclosure control | US-13, US-21, US-27 | FR-20, FR-30, NFR-2 |

### Design scope
Single Next.js application (TC-1), TypeScript (TC-2), Supabase Postgres (TC-4), authorization
in two layers (NFR-1). Four persistent entities: profiles, areas, rides, ride requests.

### Complexity note
The component count is small. The complexity sits in two places only - the capacity rule and
the disclosure rule - and both are cross-cutting rather than belonging to a single component.
That shape is what the questions below are about.

---

## DESIGN QUESTIONS

Answer each by filling in a letter after the `[Answer]:` tag.

## Question AQ1
How should the codebase be organised?

A) Layered - top-level folders by technical role: `app/` for routes, `services/` for business logic, `repositories/` for data access, `types/` for shared types

B) Feature-based - a folder per feature (`features/rides/`, `features/requests/`), each containing its own components, services, and data access

C) Hybrid - feature folders for UI, but a single shared `services/` and `db/` layer so the two cross-cutting rules have exactly one home

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question AQ2
How should server-side logic be exposed to the browser? TC-1 says "API routes / server actions" without choosing between them.

A) Server Components for reads, Server Actions for writes - no hand-written HTTP API; reads never produce a JSON endpoint at all

B) Route Handlers forming a REST API, with the client fetching from it

C) Hybrid - Server Components and Actions for the app, plus a few Route Handlers where an addressable endpoint is genuinely useful

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question AQ3
How should components reach the database?

A) A repository layer wrapping Supabase - services never touch the Supabase client directly

B) Services call the Supabase client directly - no repository abstraction

C) Repositories only for the two entities with non-trivial rules (rides, ride requests); direct client access for profiles and areas

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question AQ4
How should input be validated?

A) Zod schemas defined once and shared between client and server, inferring the TypeScript types

B) Manual validation checks written where needed, no schema library

C) Server-side Zod validation only; the client relies on native HTML form validation

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question AQ5
Where should the contact-disclosure rule live? Per NFR-2 and US-27, a phone number must be absent from what the server produces unless an accepted request links the two people.

A) A single projection function that every read passes through - one place to audit, one place to get wrong

B) Each read path applies the rule itself, close to where the data is used

C) Rely on Postgres RLS policies and database views alone, so the rule lives in the database

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question AQ6
How should the service layer report failures? Several stories require distinguishable outcomes - "ride is full" (US-22), "you already have a request on this ride" (US-17), "complete your profile first" (US-04).

A) Typed result objects - services return a success-or-failure value that callers must handle explicitly

B) Thrown exceptions with error subclasses, caught at the route or action boundary

C) Thrown exceptions for unexpected failures, typed results for expected business outcomes

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## EXECUTION CHECKLIST (runs after approval)

### Phase 1: Component Identification
- [x] 1.1 Identify components from the business capabilities table
- [x] 1.2 Define each component's purpose and responsibilities
- [x] 1.3 Define each component's interface boundary
- [x] 1.4 Place the capacity rule (FR-31 to FR-33) in a named component
- [x] 1.5 Place the disclosure rule (NFR-2) per the AQ5 answer
- [x] 1.6 Write `application-design/components.md`

### Phase 2: Component Methods
- [x] 2.1 Define method signatures for each component, per the AQ1 and AQ3 answers
- [x] 2.2 State each method's high-level purpose
- [x] 2.3 State input and output types, per the AQ4 answer
- [x] 2.4 State failure outcomes, per the AQ6 answer
- [x] 2.5 Confirm no detailed business logic has crept in - that belongs to Functional Design
- [x] 2.6 Write `application-design/component-methods.md`

### Phase 3: Service Layer
- [x] 3.1 Define services and their responsibilities
- [x] 3.2 Define orchestration for the request lifecycle (FR-34 to FR-38)
- [x] 3.3 Define orchestration for acceptance, where capacity is enforced (US-22)
- [x] 3.4 Define how services are invoked, per the AQ2 answer
- [x] 3.5 Write `application-design/services.md`

### Phase 4: Dependencies
- [x] 4.1 Build a component dependency matrix
- [x] 4.2 Define communication patterns between components
- [x] 4.3 Document data flow for the eight-step demo path
- [x] 4.4 Verify no circular dependencies exist
- [x] 4.5 Write `application-design/component-dependency.md`

### Phase 5: Consolidation and Validation
- [x] 5.1 Write `application-design/application-design.md` consolidating the four documents
- [x] 5.2 Verify every component traces to at least one requirement
- [x] 5.3 Verify all 8 capabilities from the context analysis have an owning component
- [x] 5.4 Verify the two cross-cutting rules each have exactly one designated home
- [x] 5.5 Validate any diagrams per `common/content-validation.md`
- [x] 5.6 Check design consistency and completeness programmatically

### Phase 6: Completion
- [x] 6.1 Update `aidlc-docs/aidlc-state.md`
- [x] 6.2 Log the approval prompt in `audit.md` with an ISO 8601 timestamp
- [x] 6.3 Present the completion message per `application-design.md` Step 12

---

## Out of Scope for This Stage

- Detailed business logic and business rules (Functional Design, per unit)
- Concrete SQL, table definitions, and RLS policy text (Functional Design)
- UI layout and component styling
- Prioritisation, estimation, and sequencing (already settled in the execution plan)

---

## RESOLVED DESIGN DECISIONS (answers to AQ1-AQ6)

| Q | Decision | Consequence for the design |
|---|---|---|
| AQ1 = C | Hybrid - feature folders for UI, one shared `services/` and `db/` layer | Gives the capacity rule and the disclosure rule exactly one home each, which was the stated reason for running this stage. |
| AQ2 = A | Server Components for reads, Server Actions for writes | No hand-written HTTP API. Reads produce no JSON endpoint. Server Actions are still addressable, so server-side checks (US-15, US-27) remain necessary and testable. |
| AQ3 = A | Repository layer; services never touch the Supabase client directly | The capacity-enforcing database operation lives behind a single repository method rather than being re-implemented per call site. |
| AQ4 = A | Shared Zod schemas, TypeScript types inferred | Server Actions receive untyped `FormData`; Zod handles parsing and typing in one step. |
| AQ5 = A | A single contact-projection function every read passes through | One place to audit for NFR-2 compliance. Given the accepted open-signup deviation, this is the principal control over employee contact data. |
| AQ6 = C | Typed results for expected business outcomes; throw for unexpected faults | "Ride is full" (US-22), "already requested" (US-17) and "complete your profile" (US-04) are normal outcomes, not errors. Server Actions return values to forms naturally. |

### Step 8 Ambiguity Analysis - MANDATORY, Result: PASS

Analysed all six answers against the Step 8 criteria.

- **Vague or ambiguous responses**: none. All six are single explicit letter choices.
- **Undefined criteria or terms**: none. AQ1=C is a hybrid, which Step 9 warns about, but the
  dividing line is explicit and structural rather than judgemental: **UI is organised by
  feature; services, repositories, validation schemas, and the projection function are
  shared.** There is no case-by-case decision left to make at generation time.
- **Contradictory answers**: none. Verified as mutually reinforcing:
  - AQ1=C, AQ3=A and AQ5=A all place cross-cutting code in the shared layer - the same
    decision viewed three ways
  - AQ2=A and AQ4=A fit together directly: Server Actions receive `FormData`, and Zod is what
    parses it
  - AQ2=A and AQ6=C fit together: Server Actions return values to the calling form, which is
    exactly what a typed business result needs
- **Missing design details**: none. Each answer maps to concrete checklist instructions.
- **Answers combining options without a rule**: none, per the AQ1 note above.

**No follow-up questions required.** Proceeding to Step 10, artifact generation.
