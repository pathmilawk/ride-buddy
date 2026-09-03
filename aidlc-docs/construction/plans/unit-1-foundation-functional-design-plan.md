# Functional Design Plan - Unit 1 Foundation

**Phase**: CONSTRUCTION
**Unit**: Unit 1 - Foundation
**Stage**: Functional Design
**Date**: 2026-09-03
**Status**: Awaiting answers to design questions (FQ1-FQ8)

---

## Step 1: Unit Context

**Purpose** (from `unit-of-work.md`): establish an identified employee with a usable profile
and a known home area. Nothing else in the system can be demonstrated without this.

**Stories assigned** (from `unit-of-work-story-map.md`):

| Story | Title | Tags |
|---|---|---|
| US-01 | Sign in to Ride Buddy | `[DEMO PATH]` |
| US-02 | Complete my profile | `[DEMO PATH]` |
| US-03 | Update my profile | |
| US-04 | Be stopped before acting with an incomplete profile | `[PROMOTED]` |
| US-05 | Choose locations from a known list | |
| US-28 | Use Ride Buddy on my phone | cross-cutting |

**Requirements in scope**: FR-1 to FR-10, NFR-5

**Components in scope**: C1 ProfileRepository, C2 AreaRepository, C5 AuthService,
C6 ProfileService, C7 AreaService, C11 ValidationSchemas (credentials, profile),
C12 Result, C13 AuthContext, C14 Server Actions (auth, profile), C15 Feature UI (auth, profile)

**Entities owned by this unit**: `profiles`, `areas`

**Dependencies**: none. Unit 1 is the root of the dependency chain.

**Downstream obligations** - what later units will rely on:
- `C6.assertCanAct` - the completeness gate both Unit 2 and Unit 3 call before acting
- `areas` - referenced by ride origin and destination in Unit 2
- `profiles` - the source of names in Unit 2 search results and of contact details in Unit 3
- `C12 Result` - extended with new outcome codes in Units 2 and 3

**Scope boundary**: technology-agnostic business logic, domain entities, and business rules.
No infrastructure concerns. Concrete SQL and RLS policy text belong to Code Generation; this
stage specifies *what* the rules are.

---

## DESIGN QUESTIONS

Answer each by filling in a letter after the `[Answer]:` tag.

## Question FQ1
**Domain Model.** How should the `profiles` entity relate to Supabase's built-in `auth.users`?

A) `profiles.id` is both primary key and a foreign key to `auth.users.id` - one row per user, sharing the same UUID

B) `profiles` has its own generated id plus a separate `user_id` foreign key to `auth.users.id`

C) No `profiles` table - store name, phone, area, and role in the Supabase user metadata blob

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ2
**Domain Model.** How should the `areas` reference table distinguish an office from a residential area? FR-9 requires offices to be entries in the same table.

A) One flat table with a `kind` field taking `residential` or `office`

B) One flat table of names only, with no distinction - an office is just another area

C) Two separate tables, one for residential areas and one for offices

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ3
**Business Rules.** How strictly should a phone number be validated?

A) Loose - a non-empty string of reasonable length, no format enforcement

B) Strict E.164 - a leading `+` and country code required

C) Norwegian format specifically - 8 digits, optionally `+47` prefixed

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ4
**Business Rules.** FR-6 gates action on name, phone, and home area. What about `role`, which FR-7 makes informational?

A) Role is optional and defaults to `both` - never blocks action

B) Role is required alongside the other three fields

C) Role is optional with no default, displayed as unset until chosen

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ5
**Error Handling.** What should authentication failures tell the user?

A) Generic - "invalid email or password" on sign-in, without revealing whether the account exists

B) Specific - "no account with that email" versus "incorrect password"

C) Specific on registration ("that email is already registered") but generic on sign-in

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ6
**Frontend Components.** How should the completeness gate present itself when it blocks an action?

A) Redirect to a dedicated profile page carrying a message about what is missing and why

B) A modal dialog over the current page, so the user completes their profile without losing context

C) Inject the missing fields inline into whichever form triggered the gate

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ7
**Integration Points and Data Flow.** How should the Supabase session be handled? This matters because AQ2=A puts reads in Server Components, which must be able to identify the user server-side.

A) Cookie-based sessions via `@supabase/ssr`, readable by Server Components, Server Actions, and middleware

B) Client-side session in browser storage, with the user id passed explicitly to server code

C) Custom JWT handling written by hand

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question FQ8
**Business Scenarios.** An authenticated user signs in but has no `profiles` row - perhaps it was never created, or was removed directly in the database. What should happen?

A) Silently create a minimal profile and continue - `getOrCreateMyProfile` is idempotent

B) Show an error and require intervention

C) Treat them as a new user and send them through registration again

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## EXECUTION CHECKLIST

### Phase 1: Domain Entities
- [x] 1.1 Define the `profiles` entity, its fields and their meaning, per FQ1
- [x] 1.2 Define the `areas` entity and its fields, per FQ2
- [x] 1.3 Define the relationship between `profiles` and `auth.users`, per FQ1
- [x] 1.4 Define the relationship between `profiles` and `areas`
- [x] 1.5 State field nullability and which fields the completeness gate reads
- [x] 1.6 Note the entities Units 2 and 3 will reference
- [x] 1.7 Write `functional-design/domain-entities.md`

### Phase 2: Business Rules
- [x] 2.1 Registration and sign-in rules, including the deliberate absence of a domain check (FR-2)
- [x] 2.2 Profile field validation rules, per FQ3 and FQ4
- [x] 2.3 The completeness gate rule in full, per FR-6 and FQ4
- [x] 2.4 Ownership rules - a user reads and writes only their own profile (FR-5)
- [x] 2.5 Area selection rules, per FQ2 and FR-10
- [x] 2.6 Authorization rules for both layers required by NFR-1
- [x] 2.7 Error and failure outcomes, per FQ5 and FQ8
- [x] 2.8 Write `functional-design/business-rules.md`

### Phase 3: Business Logic Model
- [x] 3.1 Model the registration and first-sign-in flow, per FQ8
- [x] 3.2 Model the profile completion flow, per FQ6
- [x] 3.3 Model the profile update flow
- [x] 3.4 Model the completeness gate as invoked by later units
- [x] 3.5 Model session establishment and server-side identity, per FQ7
- [x] 3.6 Map each flow to its stories and requirements
- [x] 3.7 Write `functional-design/business-logic-model.md`

### Phase 4: Frontend Components
- [x] 4.1 Define the component hierarchy for the auth and profile features
- [x] 4.2 Define props and state per component
- [x] 4.3 Define user interaction flows
- [x] 4.4 Define form validation rules and where they run
- [x] 4.5 Define which Server Action or service each component uses
- [x] 4.6 Record `data-testid` naming, required by the code-generation automation rules
- [x] 4.7 Record responsive behaviour for NFR-5 and US-28
- [x] 4.8 Write `functional-design/frontend-components.md`

### Phase 5: Validation
- [x] 5.1 Verify all 6 assigned stories are covered by the design
- [x] 5.2 Verify FR-1 to FR-10 and NFR-5 are addressed
- [x] 5.3 Verify every acceptance criterion of the 6 stories has a design answer
- [x] 5.4 Verify no infrastructure concerns have leaked in
- [x] 5.5 Verify the downstream obligations to Units 2 and 3 are specified
- [x] 5.6 Check story and requirement references programmatically
- [x] 5.7 Validate any diagrams per `common/content-validation.md`

### Phase 6: Completion
- [x] 6.1 Update `aidlc-docs/aidlc-state.md`
- [x] 6.2 Log the approval prompt in `audit.md` with an ISO 8601 timestamp
- [x] 6.3 Present the completion message per `functional-design.md` Step 7

---

## Out of Scope for This Stage

- Concrete SQL, migration files, and RLS policy text (Code Generation)
- Anything belonging to Units 2 or 3 - rides, requests, the capacity rule, the contact projection
- Deployment and infrastructure (Infrastructure Design was skipped; infrastructure is Supabase cloud plus localhost)

---

## RESOLVED DESIGN DECISIONS (answers to FQ1-FQ8)

| Q | Decision | Consequence |
|---|---|---|
| FQ1 = A | `profiles.id` is both PK and FK to `auth.users.id` | RLS policies read as `auth.uid() = id`. One row per user, same UUID. |
| FQ2 = A | One `areas` table with a `kind` field (`residential` / `office`) | Satisfies FR-9 and the shared origin/destination model, while letting seed data mark the office and the UI group entries. |
| FQ3 = A | Loose phone validation - non-empty, reasonable length | No locale hardcoded. Accepts what colleagues actually type. |
| FQ4 = A | `role` optional, defaults to `both`, never gates action | Consistent with FR-7. `both` is the truthful default since every user can do either, so the default mislabels nobody. |
| FQ5 = A | Generic sign-in failure message | Avoids turning the open-signup deviation into an account-enumeration tool as well. |
| FQ6 = A | Completeness gate redirects to the profile page with a message | Matches FR-6's wording. No modal state machine. US-04 requires the blocked action to be retryable afterwards. |
| FQ7 = A | Cookie-based sessions via `@supabase/ssr` | Effectively required by AQ2=A - Server Components cannot read a browser-only session, so C13 would have no identity to resolve. |
| FQ8 = A | Missing profile row is silently recreated (idempotent get-or-create) | Matches FR-3. The completeness gate then asks for the missing fields, so the user lands somewhere sensible rather than stuck. |

### Step 5 Ambiguity Analysis - MANDATORY, Result: PASS

- **Vague or ambiguous responses**: none. All eight are single explicit letter choices; no
  "depends", "maybe", "not sure", "mix of", or "somewhere between".
- **Undefined criteria or terms**: none. No hybrid options were selected, so there is no
  case-by-case rule left to define.
- **Contradictory answers**: none. Cross-checks performed:
  - FQ1=A and FQ7=A reinforce each other - a cookie session gives `auth.uid()` server-side,
    which is exactly what a policy of the form `auth.uid() = id` needs
  - FQ4=A and FQ6=A are consistent - the gate reads three fields and role is not among them,
    so defaulting role cannot interact with the gate
  - FQ8=A and FQ6=A compose cleanly - a silently recreated profile is empty, so the gate
    immediately redirects the user to fill it in
  - FQ3=A and FQ4=A both reduce onboarding friction, consistent with FQ6=A's single redirect
- **Missing design details**: none.
- **Answers combining options**: none.

**No follow-up questions required.** Proceeding to Step 6, artifact generation.
