# Action Layer Summary - Unit 1 Foundation

**Plan step**: 12 · **Component**: C14 Server Actions

Under AQ2=A there is no hand-written HTTP API. Server Actions are the write boundary, and this
is the category `code-generation.md` calls "API Layer".

## Files

| File | Actions |
|---|---|
| `features/auth/actions.ts` | `signInAction`, `registerAction`, `signOutAction` |
| `features/profile/actions.ts` | `updateProfileAction` |
| `middleware.ts` | Session refresh and route protection (BR-1.6) |

## The thin-boundary rule, verified

Every action is the same four steps: parse `FormData` with the shared schema, delegate to
exactly one service method, translate the `Result`, return it.

**No business rule lives in any action.** This is not stylistic. A rule placed in an action
could not be reused by another caller, and could not be unit tested without a request
context - which matters directly, because NFR-6 scopes testing to business logic.

## Decisions worth recording

**`field()` reads form values as strings.** A missing field becomes `""` and fails schema
validation with a useful message, rather than reaching Zod as `null` and producing
"Expected string, received null".

**`signInAction` does not interpret the failure.** BR-1.3 has the service generalise the
message already, and the action is not given enough information to distinguish "no such
account" from "wrong password". Recorded because a well-meaning change here could
reintroduce account enumeration.

**Route protection is in middleware, not in each page.** BR-1.6 applies to every screen; a
per-page check would be one forgotten page away from a leak. The middleware also handles the
session refresh that Server Components cannot perform.

## No tests, deliberately

Plan step 11.1. Actions hold no logic by construction, and testing them requires a request
context. Their behaviour is covered through the services in Step 8.
