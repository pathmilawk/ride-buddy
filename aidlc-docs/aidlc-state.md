# AI-DLC State Tracking

## Project Information
- **Project Name**: Ride Buddy
- **Project Type**: Greenfield
- **Start Date**: 2026-09-03T05:04:58Z
- **Current Phase**: CONSTRUCTION
- **Current Stage**: Notifications feature COMPLETE and VERIFIED LIVE (post-Build-and-Test enhancement).
- **Rule Details Directory**: `.aidlc-rule-details/`

## Workspace State
- **Existing Code**: No
- **Programming Languages**: None found
- **Build System**: None found
- **Project Structure**: Empty (documentation only)
- **Reverse Engineering Needed**: No
- **Workspace Root**: /Users/pathmilak/Documents/AIDLC-training/ride-buddy

## Confirmed Technical Decisions

| Area | Decision | Source |
|---|---|---|
| Architecture | Single Next.js app; API routes / server actions are the Node.js backend | Q17=A |
| Language | TypeScript throughout | Q34 (defaulted) |
| Styling | Tailwind CSS + shadcn/ui | Q35 (defaulted) |
| Database | Supabase cloud (PostgreSQL) | Q36 (defaulted) |
| Schema management | Migration SQL files in `supabase/migrations/` | Q37 (defaulted) |
| Seed data | Yes - sample employees, areas, rides | Q38 (defaulted) |
| Authorization | Defence in depth: RLS policies PLUS server-side checks | Q18=C |
| Authentication | Supabase email + password, NO domain restriction | Q2=B, Q3=X |
| Deployment | Local development only (`npm run dev`) | Q19=A |
| Testing | Minimal - unit tests on seat availability and request state transitions | Q20=A |
| Scale assumption | Under 50 employees, no performance engineering | Q39 (defaulted) |
| Devices | Mobile-first responsive | Q40 (defaulted) |
| Privacy posture | POC level - no self-service deletion | Q41 (defaulted) |
| Locale | English only, single local timezone | Q42 bundle |
| Logging | Console level | Q42 bundle |

## Confirmed Functional Decisions

| Area | Decision | Source |
|---|---|---|
| Vision authority | Interactive answers are authoritative; `vision.md` stays truncated | Q1=A |
| Areas | Seeded reference table of predefined areas; exact matching, no fuzzy search | Q8=A |
| Ride model | `origin_area_id -> destination_area_id` over the shared area table | Q6=B, Q9=B |
| Trip direction | Both Home->Office and Office->Home, as separate independent rides | Q6=B |
| Recurrence | One-off rides only, single date each | Q7=A |
| Ride search | Filter by date + origin area + destination area | Q10=X |
| Profile | Created lazily; completeness enforced before creating or requesting a ride | Q4=B |
| Role field | Informational only - does not gate actions | Q5=A |
| Concurrent requests | A passenger may hold multiple pending requests | Q11=A |
| Seat enforcement | DATABASE level (transaction/constraint) - correctness critical | Q12=A, Q32=A |
| Contact visibility | Name + area public; phone/email only after ACCEPTED | Q13=A |
| Cancellation | Driver cancels rides; passenger withdraws requests | Q14=A |
| Notifications | None - in-app status only | Q15=A |
| History | Upcoming only (filtered by date, not deleted) | Q16=A |
| Out of scope | No payments, ratings, GPS, chat, admin dashboard, native apps | Q21=A |
| Success criteria | Clickable end-to-end demo; polish the happy path | Q43=A |

## Extension Configuration
| Extension | Enabled | Decided At | Answer |
|---|---|---|---|
| Security Baseline | No | Requirements Analysis | Q22 = B (skip) |
| Resiliency Baseline | No | Requirements Analysis | Q23 = B (skip) |
| Property-Based Testing | No | Requirements Analysis | Q24 = C (skip) |

**All three extensions opted OUT.** Per `requirements-analysis.md` Step 5.1 (Deferred Rule
Loading), the full rule files were therefore NEVER loaded - only the lightweight
`*.opt-in.md` prompts were read at workflow start. Files deliberately not loaded:
- `extensions/security/baseline/security-baseline.md`
- `extensions/resiliency/baseline/resiliency-baseline.md`
- `extensions/testing/property-based/property-based-testing.md`

**Consequence for later stages**: no extension rules are enforced. Stage completion messages
do NOT require an extension compliance summary, and no extension finding can block a stage.

**Rationale**: each extension's own opt-in text names PoCs and prototypes as the skip case,
and this is a local-only ~4-hour demo POC (Q19=A, Q20=A, Q43=A). The resiliency baseline
additionally has a stack mismatch - it derives from AWS Well-Architected, and this project
runs on Supabase with no AWS infrastructure.

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Stage Progress

### INCEPTION PHASE
- [x] Workspace Detection - COMPLETE (2026-09-03T05:04:58Z)
- [-] Reverse Engineering - SKIPPED (greenfield, no existing code)
- [x] Requirements Analysis - COMPLETE and APPROVED (43/43 answered)
- [x] User Stories - COMPLETE and APPROVED (28 stories, 2 personas)
- [x] Workflow Planning - COMPLETE and APPROVED
- [x] Application Design - COMPLETE and APPROVED (15 components, 5 artifacts)
- [x] Units Generation - COMPLETE (3 units, 3 artifacts, 28/28 stories assigned)

### CONSTRUCTION PHASE (per-unit loop x3)

**Unit 1 - Foundation**
- [x] Functional Design - COMPLETE and APPROVED (4 artifacts, 17 business rules)
- [-] NFR Requirements - SKIPPED (tech stack fixed by TC-1..TC-8; NFRs already enumerated)
- [-] NFR Design - SKIPPED (dependent; NFR-1 design absorbed into Functional Design BR-1.16/1.17)
- [-] Infrastructure Design - SKIPPED (infrastructure = Supabase cloud + localhost)
- [x] Code Generation - COMPLETE, VERIFIED and APPROVED (43 TS files, 30/30 tests, build passes)

**Unit 2 - Ride Offering and Discovery**
- [x] Functional Design - COMPLETE and APPROVED (4 artifacts, 32 business rules)
- [-] NFR Requirements / NFR Design / Infrastructure Design - SKIPPED (per approved execution plan)
- [x] Code Generation - COMPLETE, VERIFIED and APPROVED (2 migrations, 19 new files, 73/73 tests)

**Unit 3 - Requests and Matching**
- [x] Functional Design - COMPLETE and APPROVED (4 artifacts, 33 business rules)
- [-] NFR Requirements / NFR Design / Infrastructure Design - SKIPPED (per approved execution plan)
- [x] Code Generation - COMPLETE and VERIFIED (4 migrations, 19 new files, 101/101 tests, build passes)

**After all units**
- [x] Build and Test - COMPLETE and VERIFIED LIVE (schema applied, 101/101 unit + 24/24 schema + 17/17 live rules + 16/16 server-side E2E, demo data loaded)

### OPERATIONS PHASE
- [ ] Operations - PLACEHOLDER

## Process Deviations

| Rule | Requirement | Deviation | Authority | Mitigation |
|---|---|---|---|---|
| `common/question-format-guide.md` | Never ask questions in chat; use question files only | Questions asked interactively in chat | Explicit user instruction, 2026-09-03 | Question file retained as canonical record; every answer written back into it with `[Answer]:` tags populated |

## Open Issues

1. **RESOLVED** - all 43 verification questions answered and recorded in
   `requirement-verification-questions.md`. `requirements.md` generated with 42 functional
   requirements, 9 non-functional requirements, 8 technical constraints, and 6 explicit
   assumptions. Verified: 43/43 questions cited in the document, no gaps in requirement IDs.

2. **`vision.md` is truncated at line 94** - ends mid-sentence in an unclosed code fence.
   RESOLVED as a process matter by Q1=A: interactive answers are authoritative and
   `requirements.md` becomes the real specification. `vision.md` is NOT expected to be fixed.

3. **KNOWN DEVIATION - employee-only access not enforced.** `vision.md` Section 4 requires
   that only company employees can use the application and calls company email verification
   sufficient for the POC. Q2=B with Q3=X (no domain restriction) means no company
   affiliation check of any kind exists. Raised as Contradiction 1, presented in full, and
   reaffirmed by the user - a settled decision, not an oversight. Residual risk is low
   because Q19=A keeps the app local-only, and Q13=A plus Q18=C gate contact data.
   **BLOCKING before any public deployment**: a domain allow-list must be added first.

4. **Usability gap - silent cancellation.** Q14=A allows a driver to cancel a ride while
   Q15=A provides no notifications, so an accepted passenger learns of a cancellation only
   by opening the app. Accepted for a POC; to be recorded in `requirements.md` as a known
   limitation.

5. **Design point for Functional Design.** When a driver cancels a ride with already-accepted
   passengers, those requests need a defined terminal state so no passenger is left believing
   they hold a seat. Not yet specified.

## Requirements Analysis Artifacts
- `aidlc-docs/inception/requirements/requirement-verification-questions.md` - 43 questions, all answered
- `aidlc-docs/inception/requirements/requirements.md` - the authoritative specification

## User Stories Stage Assessment
**Decision: EXECUTE.** Matched three of CLAUDE.md's "ALWAYS Execute" high-priority
indicators: new user-facing features and functionality; changes affecting user workflows
and interactions; multiple user types or personas involved (Driver and Passenger, plus the
Both case where one person is each in turn). None of the "SKIP ONLY IF" low-priority
conditions apply - this is not refactoring, a bug fix, infrastructure work, tooling, or
documentation.

Additional justification: the request/approval state machine (FR-34 to FR-38) has six
request states and seven transitions, and the conditional contact-visibility rule
(FR-20/FR-30) behaves differently before and after acceptance. Both are the kind of
behaviour that acceptance criteria express more clearly than prose requirements.

## User Stories Artifacts
- `aidlc-docs/inception/plans/user-stories-assessment.md` - Step 1 mandatory assessment (EXECUTE)
- `aidlc-docs/inception/plans/story-generation-plan.md` - approved methodology, 42/42 checklist steps
- `aidlc-docs/inception/user-stories/personas.md` - 2 detailed personas + the "Both" mode of use
- `aidlc-docs/inception/user-stories/stories.md` - 28 stories, 11 on the demo path, 5 promoted

### Approved Story Methodology (SQ1-SQ8)
Hybrid feature-grouped / journey-ordered breakdown with `[DEMO PATH]` tags (SQ1=F);
standard granularity (SQ2=B); Connextra format (SQ3=A); hybrid Gherkin-and-bullet
acceptance criteria (SQ4=C); requirement citations plus a coverage matrix (SQ5=A);
two detailed personas (SQ6=B); edge cases promoted where correctness-critical or derived
(SQ7=C); NFR stories only where user-observable (SQ8=B).

### Verification Results
28 stories, identifiers contiguous with no gaps or duplicates. All 42 functional
requirements covered. 28/28 stories cite requirements and open in Connextra form. 5/5
promoted stories declare their parent. 14 Gherkin blocks. No dangling story or requirement
references. INVEST: Independent 23 clear / 5 qualified (the promoted edge cases are
independently valuable and testable but not independently deliverable - a deliberate
consequence of SQ7=C, recorded rather than glossed over); all other criteria 28/28.

## Execution Plan Summary
- **Artifact**: `aidlc-docs/inception/plans/execution-plan.md`
- **Risk Level**: LOW (greenfield, local-only, easy rollback, no production data)
- **Total stages completed**: 4 (Workspace Detection, Requirements Analysis, User Stories, Workflow Planning)
- **Stages skipped**: 5 (Reverse Engineering, NFR Requirements, NFR Design, Infrastructure Design, Operations)
- **Stage executions remaining**: 11 (Application Design, Units Generation, then Functional
  Design + Code Generation once per unit for 3 units, then Build and Test)
- **Estimated remaining effort**: 3.5 - 4.5 hours

### Unit Decomposition (proposed, pending approval)
| Unit | Name | Stories | Demonstrable at completion |
|---|---|---|---|
| 1 | Foundation | US-01 to US-05, US-28 | Sign in, complete profile, areas selectable |
| 2 | Ride Offering and Discovery | US-06 to US-13, US-25 | Publish a ride, search and find it |
| 3 | Requests and Matching | US-14 to US-24, US-26, US-27 | Request, accept/reject, capacity enforced, contacts exchanged |

Dependencies strictly linear: Unit 1 -> Unit 2 -> Unit 3. No parallelisation (single developer).

### Why NFR Design is skipped without losing the security design
NFR-1 (two-layer authorization) and NFR-2 (server-side contact projection) carry real design
work. Skipping NFR Design does NOT discard them - both are absorbed into Functional Design,
where the RLS policies and API response contracts are designed anyway. Recorded so that a
later reader does not find NFR Design skipped and conclude the security design was never done.

## Application Design Artifacts
- `aidlc-docs/inception/plans/application-design-plan.md` - AQ1-AQ6 answered, 31/31 steps [x]
- `aidlc-docs/inception/application-design/components.md` - 15 components
- `aidlc-docs/inception/application-design/component-methods.md` - signatures + rule ownership table
- `aidlc-docs/inception/application-design/services.md` - orchestration + transaction boundaries
- `aidlc-docs/inception/application-design/component-dependency.md` - matrix, acyclicity, data flow
- `aidlc-docs/inception/application-design/application-design.md` - consolidated

### Approved Design Decisions (AQ1-AQ6)
AQ1=C hybrid (feature UI, shared services/db) | AQ2=A Server Components read + Server Actions
write | AQ3=A repository layer | AQ4=A shared Zod schemas | AQ5=A single contact-projection
function | AQ6=C typed results for business outcomes, throw for faults.

### The Two Cross-Cutting Rules and Their Homes
| Rule | Home |
|---|---|
| Seat capacity never exceeded (FR-31..FR-33) | `C4.acceptWithCapacityGuarantee` - single atomic DB operation; no other method sets ACCEPTED |
| Contact disclosure (FR-20, FR-30, NFR-2) | `C10.projectProfile` / `projectMany` - pure function, every read routes through it |

### Transaction Boundaries Identified (constrain Functional Design)
1. **Accept a request** - FR-31..FR-33, check and write inseparable
2. **Cancel a ride** - FR-38, ride status and request cascade must not diverge

All other writes are single statements.

### Component-to-Unit Assignment
Unit 1: C1, C2, C5, C6, C7, C11(partial), C12, C13, C14(auth/profile), C15(auth/profile)
Unit 2: C3, C8, **C10**, C11(ride schemas), C14(ride actions), C15(rides/search)
Unit 3: C4, C9, C14(request actions), C15(requests)

C10 is in Unit 2 rather than Unit 3 because ride search must withhold driver contact details
(US-13, FR-20) before any request exists.

## Units Generation Artifacts
- `aidlc-docs/inception/plans/unit-of-work-plan.md` - UQ1-UQ6 answered, 30/30 steps [x]
- `aidlc-docs/inception/application-design/unit-of-work.md` - 3 unit definitions + code organization strategy
- `aidlc-docs/inception/application-design/unit-of-work-dependency.md` - matrix, sequence, rollback
- `aidlc-docs/inception/application-design/unit-of-work-story-map.md` - 28/28 stories assigned

### Confirmed Unit Decomposition
One Service, three Modules (TC-1 single deployable). Strictly linear: Unit 1 -> Unit 2 -> Unit 3.

| Unit | Stories | Key components | Est. |
|---|---|---|---|
| 1 Foundation | 6 (US-01..05, US-28) | C1, C2, C5, C6, C7, C11p, C12, C13 | 45-60 min |
| 2 Ride Offering and Discovery | 10 (US-06..13, US-25, US-27) | C3, C8, **C10** | 60-75 min |
| 3 Requests and Matching | 12 (US-14..24, US-26) | **C4**, C9 | 75-90 min |

### Open Finding Carried into CONSTRUCTION
**Three stories have acceptance criteria spanning a unit boundary**: US-13, US-25, US-27 are
assigned to Unit 2 but each has criteria that cannot be satisfied until Unit 3 exists (driver
viewing pending requests; the request list and accept/reject actions on My Rides;
pending- and accepted-request output). They are **partially complete** at Unit 2's checkpoint
and **fully complete** at Unit 3's. Unit 3's checkpoint must therefore re-verify all three in
full, not only its own twelve stories.

### Also Recorded
- **US-24 is separated from its parent US-09** (Unit 3 vs Unit 2). Unavoidable - there are no
  requests to cascade to until Unit 3. Both intermediate states are internally consistent.
- **US-28 (mobile responsive) is cross-cutting.** Assigned to Unit 1 where the layout is
  established, but its criteria apply to every screen in every unit.
- **Highest-risk work comes last.** Unit 3 carries the only correctness-critical requirement
  (seat capacity) and the only automated test coverage (NFR-6). The ordering is
  dependency-driven and correct, but it means the riskiest work happens when the least time
  remains.

### DEVIATION Recorded: greenfield structure pattern not followed
`construction/code-generation.md` specifies `src/{unit-name}/`, `tests/{unit-name}/` for
greenfield multi-unit monoliths. Not used here. Reasons, in order of weight: (1) UQ6=A
explicitly chose units invisible in the tree; (2) it would fragment the AQ1=C shared layer
across three directories, leaving the seat-capacity and contact-disclosure rules without a
single home and undoing the purpose of Application Design; (3) Next.js App Router requires
`app/` at root or under `src/`; (4) the pattern targets units that are genuine modules, whereas
UQ2=A made these a planning device with no codebase representation. **Retained absolutely**:
application code at workspace root, documentation in `aidlc-docs/`, never application code in
`aidlc-docs/`.

## Unit 1 Foundation - Functional Design Artifacts
- `aidlc-docs/construction/plans/unit-1-foundation-functional-design-plan.md` - FQ1-FQ8, 40/40 steps [x]
- `aidlc-docs/construction/unit-1-foundation/functional-design/domain-entities.md`
- `aidlc-docs/construction/unit-1-foundation/functional-design/business-rules.md` - BR-1.1 to BR-1.17
- `aidlc-docs/construction/unit-1-foundation/functional-design/business-logic-model.md` - 6 flows
- `aidlc-docs/construction/unit-1-foundation/functional-design/frontend-components.md`

### Unit 1 Design Decisions (FQ1-FQ8)
FQ1=A `profiles.id` = `auth.users.id` | FQ2=A one `areas` table with `kind` field |
FQ3=A loose phone validation | FQ4=A `role` optional, defaults to `both` |
FQ5=A generic sign-in errors | FQ6=A gate redirects to profile page |
FQ7=A cookie sessions via `@supabase/ssr` | FQ8=A idempotent profile creation

### Unit 1 Downstream Interface Contract (breaking change if altered)
1. Gate returns pass or `PROFILE_INCOMPLETE`; checks exactly `display_name`, `phone`, `home_area_id`
2. `profiles.id` equals the auth user id
3. `profiles.display_name` readable for any employee through a projection
4. `profiles.phone` and `profiles.email` exist and are conditionally readable
5. `areas.id` values stable across seed runs
6. Server-side identity resolvable in any Server Component or Action
7. `Result` carries a business outcome code, extensible with new codes

### Unit 1 Checkpoint Limitation Recorded
US-04's gate logic, outcome, and redirect are all built in Unit 1 and are directly testable,
but BR-1.10 places its only two call sites in Units 2 and 3. At Unit 1's checkpoint the gate
therefore cannot be demonstrated through the UI - there is no gated action yet.

## Unit 1 Foundation - Code Generation

**Artifacts**: `aidlc-docs/construction/plans/unit-1-foundation-code-generation-plan.md`
(66/67 steps [x]) and four layer summaries under
`aidlc-docs/construction/unit-1-foundation/code/`.

**Application code**: 43 TypeScript/TSX files at the workspace root, 3 migrations, 1 seed
script, 3 unit test suites, README, .env.example.

### BLOCKER RESOLVED - build and tests verified
Node.js was absent; the user asked for it to be installed. `brew install node` gave **Node
26.8.1 / npm 11.19.0**, and verification then ran for real.

| Command | Result |
|---|---|
| `npm install` | 156 packages |
| `npx tsc --noEmit` | **Clean** |
| `npx vitest run` | **30/30 tests passed** (3 files) |
| `npx next build` | **Compiled successfully**, 7/7 pages |

Routes: `/`, `/sign-in`, `/register` static; `/profile` dynamic (correct - reads cookies);
middleware 92.7 kB.

**Runtime behaviour against a real Supabase project is still unexercised** - that needs the
user's project credentials (assumption A-3).

### Five defects found and fixed during verification
Static checks caught three; the real compiler caught two more, which is why the run mattered.
1. `React.ReactNode` used in three module files without importing React - UMD globals are
   unavailable in modules, so all three layouts would have failed to compile
2. Unused `React` namespace import in `components/ui/radio-group.tsx`
3. FR-2 had no code citation, failing traceability check 18.2
4. **TS7006 in `db/supabase/server.ts` and `db/supabase/middleware.ts`** - `cookiesToSet`
   implicitly `any`, because `createServerClient`'s `cookies` option is a union of current and
   deprecated shapes so the parameter cannot be contextually inferred. Annotated explicitly
   using `CookieOptions` from `@supabase/ssr`.
5. `vitest.config.ts` used ESM syntax in a CJS-loaded file (warning now, error in a future
   Vite major). Renamed to `.mts`, `__dirname` replaced with `import.meta.url`.

### Dependency security
`npm install` reported 7 vulnerabilities, **all in dev dependencies** - nothing shipped to a
user. Bumping `vitest` 2.1 to 4.1 and `postcss` 8.4 to 8.5.26 cleared 5; tests and build were
re-run and still pass.

**2 remain, deliberately unfixed**: a high-severity postcss advisory reached through `next`'s
own bundled tree. Clearing it needs Next 16, a major upgrade that would change the approved
tech stack (TC-1) for a build-time CSS processor handling only our own CSS on a local-only POC.
**Recommended as follow-up work.**

### Notable implementation decisions
- The gate rule was extracted to `lib/profile-completeness.ts` with no framework imports, so
  it is unit-testable without a request context. Both later units depend on it.
- `BusinessOutcome` defines only the five outcomes Unit 1 can produce; Unit 3 extends it.
- The open-signup deviation is documented affirmatively in `services/auth-service.ts` and
  asserted by a test, so adding a domain check later fails loudly rather than silently.
- Two minor deviations from `frontend-components.md`: `SignOutButton` is a Server Component
  (a form posting to a Server Action needs no client JS), and the seven `components/ui/`
  primitives are hand-written rather than pulled by the shadcn CLI, which needs network access.

## Unit 2 - Functional Design Artifacts
- `aidlc-docs/construction/plans/unit-2-ride-offering-and-discovery-functional-design-plan.md` - FQ1-FQ8, 46/46 steps [x]
- `.../unit-2-ride-offering-and-discovery/functional-design/domain-entities.md`
- `.../business-rules.md` - BR-2.1 to BR-2.32
- `.../business-logic-model.md` - 6 flows
- `.../frontend-components.md` - 21 new data-testids

### Unit 2 Design Decisions (FQ1-FQ8)
FQ1=A one `departs_at timestamptz` | FQ2=A seats remaining **derived**, no stored counter |
FQ3=A future date, 1-8 seats, no horizon cap | **FQ4=B origin may equal destination** |
FQ5=B **public-columns view**, base table stays owner-only | FQ6=A same page, URL-driven search |
FQ7=C search prefilled from the employee's home area and today | FQ8=A cancellation requires confirmation

### Two decisions worth carrying forward

**FQ4=B was chosen against the recommendation.** I advised rejecting a ride whose origin equals
its destination; the product owner chose to allow it. Settled, recorded as BR-2.4 as a positive
rule so its absence is not later read as missing validation. Not to be raised again.

**FQ5=B changed C10 ContactProjection's role, for the better.** Application Design put C10 in
Unit 2 to withhold driver contact details in search. FQ5=B moves that enforcement into the
database - a view carrying no `phone`/`email` column cannot leak them, whatever the code does.
So C10 is thin in Unit 2 (read path + `PublicProfile` type) and becomes substantive in Unit 3,
where it gains the conditional branch for accepted pairs. Strictly stronger than planned;
recorded rather than quietly narrowed.

### Unit 3 Downstream Obligations (8 contracts)
Most important: **the public view deliberately cannot serve FR-30.** Unit 3 must add its own
path releasing phone and email to an accepted pair. FQ5=B solves Unit 2's disclosure need
completely and Unit 3's not at all, by design.

Also: `rides.seats` is authoritative with nothing caching a remaining figure; seats remaining is
derived by counting accepted requests (so Unit 3's constraint counts the same rows); past rides
are retained not deleted (so FR-37 can derive EXPIRED); and cancellation has a **named insertion
point** between the status write and the listing refresh, where FR-38's cascade belongs.

### Unit 2 Verification
10/10 stories covered, 14/14 required FRs addressed, NFR-1/NFR-2/A-2/A-5 all addressed, all FR
and US references resolve, BR-2.1..BR-2.32 contiguous, no infrastructure leakage, no diagrams
needing validation.

## Unit 2 - Code Generation COMPLETE and VERIFIED

**Artifacts**: plan (55/55 steps [x]) plus four layer summaries under
`aidlc-docs/construction/unit-2-ride-offering-and-discovery/code/`.

**Code**: 2 migrations (`0004_rides.sql`, `0005_public_profiles.sql`), 19 new TypeScript files,
4 Unit 1 files modified in place, 3 new test suites. 60 TS/TSX files and 6 SQL files in total.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `npx vitest run` | **73/73 passed** (was 30 after Unit 1 - no regression) |
| `npx next build` | Compiled successfully, 10/10 pages |

Routes: `/profile`, `/rides`, `/rides/new`, `/search` dynamic; `/`, `/register`, `/sign-in` static.

### A correction to an APPROVED plan decision
The approved plan specified the public profile view with `security_invoker = true`. **That was
wrong.** With it, the view executes as the caller, so Unit 1's owner-only policy applies and the
view returns only the caller's own row - breaking FR-19 entirely. Corrected to the PostgreSQL
default of `false`, which reads past the base table's RLS. Safe precisely because of the view's
column list: `phone` and `email` are not selectable through it. Recorded in
`0005_public_profiles.sql`, the plan, and audit.md rather than quietly fixed.

### Traceability completed after an initial gap
First verification pass: 7/10 stories, 12/14 requirements, 20/32 business rules cited in code.
Citations added across eight files. **Final: 10/10, 14/14, 32/32.**

### Two tests that assert decisions rather than behaviour
So a later change fails loudly instead of silently reversing a choice:
- **any email domain registers** (Unit 1) - the recorded Section 9.1 deviation
- **a same-area ride is accepted** (Unit 2) - FQ4=B, chosen against the recommendation
- plus a contaminated-row test proving the projection is an allow-list, so widening the view
  cannot leak contact fields through C10

### Unit 3 handover - 8 contracts verified in place
`countAcceptedByRideIds` is a **seam** returning zero today; Unit 3 replaces one function body
rather than every call site. The **FR-38 cascade insertion point is a named comment** in
`cancelRide`. No delete policy on `rides`, so past rides are retained for FR-37's EXPIRED
derivation. And `0005_public_profiles.sql` records in full why the view **cannot serve FR-30**,
including the RLS policy shape Unit 3 will need.

## Unit 3 - Functional Design COMPLETE

**Artifacts**: plan (50/50 steps [x]) plus four artifacts under
`aidlc-docs/construction/unit-3-requests-and-matching/functional-design/`.
33 business rules, BR-3.1 to BR-3.33.

### Unit 3 Design Decisions (FQ1-FQ8) - all four consequential ones put the rule in the DATABASE
FQ1=A five stored statuses, **EXPIRED derived at read time** | FQ2=A **row-locking database
function** for the capacity guarantee | FQ3=A **RLS policy on `profiles`** for accepted-pair
contact release | FQ4=A **trigger on `rides`** for the cancellation cascade | FQ5=A requests
inline on My Rides | FQ6=A My Requests on its own route | FQ7=A inline error on a full ride |
FQ8=A all six statuses shown, terminal ones separated

### The pattern this completes
The four hardest rules in the system are each now enforced by a mechanism application code
cannot bypass:
| Rule | Enforced by |
|---|---|
| Contact hidden from non-owners (FR-20) | A view with no contact columns (Unit 2) |
| Contact released to an accepted pair (FR-30) | An RLS policy checking for an accepted request |
| Seat capacity never exceeded (FR-31) | A row-locking function |
| Cancellation cascades to all requests (FR-38) | A trigger |

### DEVIATION recorded: `C9.cancelRequestsForRide` will NOT be implemented
`application-design/component-methods.md` listed it as a C9 method, and Unit 2 deliberately left
a **named insertion point** in `cancelRide` for the call. FQ4=A's trigger makes the call
unnecessary - and calling it too would double-cancel, harmlessly but confusingly.

**Mandatory mitigation** (BR-3.21): the comment Unit 2 left must be **rewritten to name the
trigger**, not deleted, so a reader of `cancelRide` still learns that cancelling a ride affects
requests. A trigger's cost is invisibility at the call site; documenting it is not optional.

### Two failure modes explicitly ruled out, with reasoning preserved
1. Service-layer capacity check then update - the read-then-write window FR-33 rejects
2. A single `UPDATE ... WHERE (subquery count) < seats` - **looks** atomic but is not: under
   READ COMMITTED two updates on different request rows do not conflict, so both evaluate the
   subquery against pre-commit state and both succeed. This is the plausible mistake, recorded
   so the reasoning survives into Code Generation.

### Verification
12/12 assigned stories covered; **3/3 Unit 2 carried-forward stories (US-13, US-25, US-27) now
covered in full**; 20/20 requirements addressed; all six states and **7 stored transitions plus
1 derived** specified, matching FR-35; all seven changes to existing code specified;
BR-3.1..BR-3.33 contiguous; all references resolve; no infrastructure leakage.

**With this unit designed, all 28 stories are covered and the full eight-step demo path has an
owner.** Steps 5-8 - half the demo, including the concurrency contract and the conditional
disclosure - all belong to Unit 3.

## CHANGE REQUEST APPLIED - 2026-09-03: Supabase anon key retired

**Raised by**: the product owner, on finding their Supabase project offers no anon key.

**What changed**: Supabase has retired the `anon` / `service_role` JWT pair in favour of
`sb_publishable_...` / `sb_secret_...`. A new project is issued a **publishable key** and no
anon key at all, so assumption A-3 named a credential that no longer exists.

### Scope: configuration and naming only
The publishable key occupies exactly the role the anon key did - browser-safe, no privileges of
its own, every request subject to RLS. **No design decision changed.** NFR-1's database layer,
the RLS policies, Unit 2's public view, and Unit 3's planned capacity function, accepted-pair
policy and cascade trigger are all unaffected. `@supabase/ssr` takes the key as an opaque
string, so no library change was needed either.

### Files changed (7)
| File | Change |
|---|---|
| `db/supabase/env.ts` | `supabaseAnonKey` -> `supabasePublishableKey`, reading `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with a fallback to the legacy name |
| `db/supabase/server.ts`, `client.ts`, `middleware.ts` | Call sites updated |
| `.env.example` | Publishable key primary; legacy documented as a commented fallback |
| `README.md` | Setup step now says Project Settings -> API Keys and the publishable key |
| `requirements.md` | **Assumption A-3 amended, with a visible amendment section** rather than a silent rewrite |
| `unit-1-foundation-code-generation-plan.md` | Step 17.1 annotated with the amendment |

### A correction beyond the rename
A-3 originally listed a **service-role key** as something the user must supply. That was wrong
even when written - nothing in this application ever needed one, because authorization runs as
the signed-in user against RLS policies. The amended assumption drops it, and `.env.example` now
states explicitly that a secret key must not be added and must never carry a `NEXT_PUBLIC_`
prefix, since it bypasses every policy.

### Verified, not assumed
| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `npx vitest run` | 73/73 pass |
| `npx next build` with **publishable key only** | Compiled, 10/10 pages |
| `npx next build` with **legacy anon key only** | Compiled, 10/10 pages - fallback works |
| Accessor with both set | Publishable wins |
| Accessor with neither | Throws, naming `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

The fallback was tested rather than merely claimed - both build paths were run.

**Unit 3's Functional Design is unaffected by this change** and remains complete, awaiting
approval.

## Unit 3 - Code Generation COMPLETE and VERIFIED / ALL THREE UNITS BUILT

**Code**: 4 migrations, 12 new source files, 3 new test suites, 9 files modified in place.
Project totals: 75 TS/TSX files, 10 SQL files, 101 tests, 53 data-testids.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `npx vitest run` | **101/101 passed** (73 after Unit 2 - no regression) |
| `npx next build` | Compiled successfully, 11/11 pages |

### The carried-forward finding is CLOSED
US-13, US-25 and US-27 were partially complete from Unit 2. All three are now complete:
`RideRequestList` shows requester name and area with no contact column available (US-13),
`MyRidesList` renders per-ride requests with accept/reject (US-25), and the two disclosure paths
are wired with `AcceptedContact` kept distinct from `PublicProfile` (US-27).

**All 28 stories are cited in code (28/28) and all 33 Unit 3 business rules (33/33).**

### The seam paid off exactly as intended
Replacing **one function body** - `countAcceptedByRideIds` - made seats remaining real across
search, My Rides and the capacity guarantee at once, with **no call site changed**.

### Four rules now enforced by mechanisms application code cannot bypass
| Rule | Enforced by |
|---|---|
| Contact hidden from non-owners (FR-20) | `public_profiles` view - no contact columns |
| Contact released to an accepted pair (FR-30) | `profiles_select_accepted_counterparty` policy |
| Seat capacity never exceeded (FR-31) | `accept_ride_request` - locks the ride row |
| Cancellation cascades (FR-38) | `rides_cancel_cascade` trigger |

### One elevated privilege, justified
`rides_cancel_cascade` is SECURITY DEFINER because the cascade must set a *passenger's* request
to cancelled when the *driver* cancels, and no policy grants a driver that right. Granting one
would be far broader. The trigger is scoped to one statement on one ride, cannot be invoked
directly, fires only on a transition `rides_update_own` already restricts, and pins `search_path`.
The capacity function is SECURITY INVOKER by contrast, so the caller's policies still apply.

### THE HONEST LIMIT - carried into Build and Test as top priority
**The capacity guarantee is not covered by automated tests.** Its correctness lives in
`0007_accept_request_function.sql` and needs two concurrent transactions against a live database.
The 101 tests cover the pure transition and expiry logic only.

**Nothing in this project has ever run against a live Supabase project.** No migration applied,
no screen opened. The user offered credentials at the end of Unit 2; the offer stands and is now
the single most valuable outstanding action.

## Build and Test COMPLETE

**Artifacts** in `aidlc-docs/construction/build-and-test/`: build-instructions.md,
unit-test-instructions.md, integration-test-instructions.md, performance-test-instructions.md,
e2e-test-instructions.md, security-test-instructions.md, build-and-test-summary.md, and
**complete-schema.sql** (all 9 migrations + seed concatenated in order, 40 statements, one paste).

### Verified for real
| Check | Result |
|---|---|
| `npx next build` with the user's real credentials | SUCCESS, 11/11 pages |
| `npx vitest run` | 101/101 PASS |
| Supabase project reachable with the supplied key | PASS |
| Production server boots | PASS, 790 ms |
| BR-1.6 route protection (5 routes unauthenticated) | PASS - all 307 to /sign-in |
| Sign-in and register pages render with their testids | PASS |
| No secret key in served HTML | PASS |

### NOT verified - blocked
**All nine migrations are unapplied.** Probed live: `areas`, `profiles`, `rides`,
`ride_requests`, `public_profiles` all HTTP 404; `accept_ride_request` PGRST202. **I cannot apply
them** - DDL needs elevated access and the publishable key maps to the `anon` role.

Consequently 0 of 6 integration scenarios, 0 of 8 E2E steps, and 2 of 5 security checks have run.
Every data operation in the project is unverified.

### CREDENTIAL HANDLING ISSUE FOUND AND FIXED
The user placed the real URL and publishable key in `.env.example` - a committed template, and
**not a file Next.js reads**. Moved to `.env.local` (gitignored), `.env.example` restored to
placeholders, verified no real value survives elsewhere. Values never printed to the transcript.

### NEW FINDING - BR-3.11's "only path" claim is overstated
`ride_requests_update_as_driver` permits a ride's driver to PATCH a request to `accepted`
directly, bypassing `accept_ride_request` and overbooking their own ride.

**Severity low** - only the ride's own driver, only their own ride, harming only themselves and
passengers they are in direct contact with. The application-code claim holds.

**But the rule as written is absolute and it is not.** Accurate statement: no *application code
path* sets `accepted` except through the guarantee.

**Not fixed** - a BEFORE-UPDATE trigger validating capacity would close it, ~15 lines, consistent
with this design's posture. Left as a product-owner decision rather than added unilaterally
during a verification stage. Recorded in security-test-instructions.md check 3.

## SCHEMA APPLIED AND VERIFIED LIVE - blocker cleared

The user supplied a pooler connection string. All nine migrations applied cleanly.

### Root cause of the earlier failure, diagnosed not guessed
`db.<ref>.supabase.co` publishes **only an AAAA record** and this machine has **no global
IPv6**, so the direct host is unreachable whatever the password. The **pooler** is required:
`aws-0-<region>.pooler.supabase.com:5432`, username `postgres.<ref>`. Region was
`ap-southeast-2`, which could not be inferred from here - `cf-ray` shows the Cloudflare edge,
not the database region. `scripts/db.mjs` now diagnoses this case specifically.

### Everything now verified against the live project
| Layer | Result |
|---|---|
| Type check | Clean |
| Unit tests | **101/101** |
| Production build | 11/11 pages |
| Schema objects, policies, constraints | **24/24** (`npm run db:verify`) |
| **Live database rules** | **17/17** (`npm run verify:live`) |
| Server-side E2E with a real session | **16/16** |
| Demo sign-in for all 6 accounts | PASS against the live auth API |

### THE HEADLINE RESULT - the capacity guarantee holds under real concurrency
Two simultaneous acceptances against a **one-seat** ride:
- session A returned `OK`
- session B **blocked for ~4 seconds** on the ride row lock, then returned `RIDE_FULL`
- exactly one accepted request; the ride is not overbooked

This is FR-31 to FR-33 / US-22, the only correctness-critical requirement in the system, and the
one no unit test could reach. **Proven, not asserted.**

Also proven live, as real authenticated users: contact released to an accepted pair in both
directions; withheld from a merely-pending requester; `public_profiles` having no phone column to
leak; duplicate-request refusal; seat bounds; the cancellation cascade; and contact access
closing when a ride is cancelled.

## DEMO DATA LOADED
`supabase/demo-data.sql` + `npm run db:demo`: 6 employees, 8 rides, 7 requests. Idempotent by
fixed UUID, so it never touches a real account. **All accounts sign in with `RideBuddy123!`** -
verified against the live auth API.

Covers every state the UI can show: both trip directions, a full ride, a departed ride, a
cancelled ride with a cascaded request, requests in five statuses, and **one employee
(noor@solwr.com) with a deliberately incomplete profile** to demo the FR-6 gate.

### A GoTrue trap worth remembering
Manually inserted `auth.users` rows fail every sign-in with "Database error querying schema" if
`confirmation_token`, `recovery_token`, `email_change` or `email_change_token_new` are left NULL -
GoTrue scans them into non-nullable Go strings. The error names the schema, not the column. Fixed
by setting them to `''`, with the reason recorded in `demo-data.sql`.

## NEW SCRIPTS
`db:status` `db:push` `db:seed` `db:demo` `db:verify` `db:reset` `db:setup` `verify:live`

## FINDING - BR-3.28's "all six statuses appear" was WRONG, now corrected
Only **five** can. Every view filters to upcoming rides (FR-41, Q16=A), so a request whose ride
has departed is never on screen - and a derived-EXPIRED request is by definition one whose ride
has departed.

The requirements are self-consistent: US-23's own criteria say an expired request "is not shown
among my upcoming requests". It was BR-3.28's summary that overstated it. Corrected in the Unit 3
business rules with the reasoning.

`displayStatus`'s expired branch and the badge label are correct, unit-tested and currently
unreachable through the UI. **Deliberately left in place** - they become reachable the moment a
history view is added, which Q16=A put out of scope. Deleting correct logic the next feature
needs would be the wrong call.

## SECOND INSTANCE OF THE POLICY-BREADTH LIMITATION, found live
A driver can `POST` a seat request on their **own** ride through the REST API (HTTP 201): the
insert policy only checks `passenger_id = auth.uid()`, so FR-24's self-request refusal is
enforced by the **service**, not the database. Same class as the capacity bypass in
`security-test-instructions.md` check 3, and exactly why US-15 was promoted to its own story.

General point worth carrying forward: **RLS policies are necessarily broader than the business
rules they support**, so some rules are service-only. Both instances are documented rather than
silently relied upon.

## FEATURE ADDED - Notifications (amends FR-42)

**Requested after Build and Test.** In-app bell with unread badge and dropdown list, plus
OS-level browser notifications, delivered live over Supabase Realtime.

### Amends an approved decision
FR-42 / Q15=A chose "no notifications of any kind"; section 9.2 recorded silent cancellation as
an accepted consequence. Both amended **visibly** - FR-42 carries an *(Amended)* marker plus a
full amendment section, and **section 9.2 is marked RESOLVED** with its original text kept,
because the reasoning is worth preserving.

Effectively Q15=B, which was declined at the time, plus the OS-toast half.

### Four events
| Event | Recipient |
|---|---|
| Seat request created | the driver |
| Request accepted | the passenger |
| Request declined | the passenger |
| Ride cancelled | every passenger who held a seat |

A withdrawal notifies nobody - deliberate; "everything including withdrawals" was declined.

### Built consistently with the existing posture
- **Triggers create notifications**, not application code - a code path cannot forget to notify
- **No insert policy for users**, so nobody can fabricate one for someone else (verified refused)
- **Composes with 0008**: the cancellation cascade updates each request, firing the notify
  trigger per affected passenger. No ride-level notification needed
- **Message text is not stored** - only `kind` and ids; wording is a pure, unit-tested function
- **Badge is server-rendered**, correct on first paint without JS
- **OS permission on first bell click**, never on page load; toast only when the tab is hidden

### New files
`supabase/migrations/0010_notifications.sql` · `lib/notification-text.ts` ·
`db/repositories/notification-repository.ts` · `services/notification-service.ts` ·
`features/notifications/actions.ts` ·
`features/notifications/components/NotificationBell.tsx` ·
`tests/unit/notification-text.test.ts`. `components/AppNav.tsx` modified in place.

## TOOLING FLAW FIXED - db:push had no migration ledger
It re-ran every migration every time, so adding a tenth failed on "type already exists" and the
schema could not be extended without a full reset. Added `_ride_buddy_migrations` with a
sentinel query per migration, so an existing database is recognised rather than re-applied.
Verified: detected 9 applied, ran only the new one, and re-running is a clean no-op.

## Final verified state
| Check | Result |
|---|---|
| Type check | Clean |
| Unit tests | **113/113** (10 suites) |
| Production build | 11/11 pages |
| Schema | Verified, 10 migrations |
| Live rules + notifications | **26/26** (`npm run verify:live`) |
| `db:push` idempotency | Confirmed |

### Remaining known items, unchanged
1. **Anyone can register** (§9.1) - BLOCKING before public deployment
2. **A driver can overbook their own ride** via the REST API, bypassing the capacity function -
   low severity, documented with the fix in `security-test-instructions.md` check 3
3. **Self-request refusal is service-enforced**, not database-enforced - same class as (2)
4. Users cannot delete a notification, only mark it read - intended, no delete policy
