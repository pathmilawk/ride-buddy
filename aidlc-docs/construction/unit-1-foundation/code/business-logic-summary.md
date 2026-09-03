# Business Logic Summary - Unit 1 Foundation

**Plan steps**: 9 (generation), 8 (tests) · **Components**: C5, C6, C7, C11, C12, C13

## Files

| File | Purpose |
|---|---|
| `lib/result.ts` | C12 - `Result<T>` and `BusinessOutcome` (AQ6=C) |
| `lib/schemas.ts` | C11 - `credentialsSchema`, `profileUpdateSchema` per BR-1.7 |
| `lib/types.ts` | Domain types; `Role` derived from the `ROLES` tuple |
| `lib/profile-completeness.ts` | **BR-1.9 - the gate rule, as a pure function** |
| `lib/auth-context.ts` | C13 - `requireUser`, `getOptionalUser` |
| `lib/action-state.ts` | The shape actions return to forms |
| `services/auth-service.ts` | C5 - sign up, sign in, sign out |
| `services/area-service.ts` | C7 - `listAreas` |
| `services/profile-service.ts` | C6 - profile reads/writes and `assertCanAct` |

## Decisions worth recording

**The gate rule was extracted into its own module.** `lib/profile-completeness.ts` has no
framework imports, so it can be unit tested directly. Had the rule lived inside
`profile-service.ts`, testing it would have pulled in `next/headers` and required a request
context - and the rule that both later units depend on would have gone untested.

**`BusinessOutcome` is deliberately incomplete.** Only the five outcomes Unit 1 can actually
produce are defined. `RIDE_FULL`, `DUPLICATE_REQUEST`, `SELF_REQUEST` and `INVALID_STATE`
arrive with the request lifecycle in Unit 3, as `unit-of-work-dependency.md` records. Defining
them now would ship outcome codes nothing can return.

**`Role` is derived from the `ROLES` tuple** rather than declared separately, so `z.enum(ROLES)`
type-checks without a cast and the two cannot drift.

**The absence of a domain check is documented affirmatively** in `auth-service.ts`, citing
FR-2, BR-1.2 and `requirements.md` Section 9.1, with the instruction not to "fix" it and the
blocking condition for public deployment. Stated so an implementer does not add a check
believing it was forgotten.

**`updateMyProfile` checks area existence explicitly** so the caller receives `NOT_FOUND`
rather than a foreign-key violation surfacing as a thrown fault.

**The service-layer ownership check is not redundant** with the RLS policy that also enforces
it. That duplication is NFR-1's defence in depth (BR-1.17).

## Tests

`tests/unit/` - three suites, all pure functions, no database or DOM.

| Suite | Covers |
|---|---|
| `profile-completeness.test.ts` | BR-1.9: each field missing individually and together; whitespace-only treated as missing; **role explicitly not gated**; message wording |
| `schemas.test.ts` | BR-1.7 field rules; role defaulting to `both`; the loose phone rule accepting real-world formats and rejecting unusable ones; **that any email domain is accepted** |
| `result.test.ts` | Success and failure construction, field detail, type narrowing |

The email-domain test asserts the *deviation* on purpose. If someone later adds a domain
allow-list, that test fails loudly rather than the behaviour changing unnoticed.
