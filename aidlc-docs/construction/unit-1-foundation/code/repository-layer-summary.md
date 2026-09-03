# Repository Layer Summary - Unit 1 Foundation

**Plan step**: 6 · **Components**: C1 ProfileRepository, C2 AreaRepository

## Files

| File | Purpose |
|---|---|
| `db/supabase/env.ts` | Reads and validates the two env vars; throws a message pointing at the README when missing |
| `db/supabase/server.ts` | Cookie-aware client for Server Components and Actions (FQ7=A) |
| `db/supabase/client.ts` | Browser client, for auth-state reactions only |
| `db/supabase/middleware.ts` | Session refresh, since Server Components cannot write cookies |
| `db/repositories/area-repository.ts` | C2 - `listAll`, `findById`. Read-only (BR-1.15) |
| `db/repositories/profile-repository.ts` | C1 - `findByUserId`, `findManyByUserIds`, `create`, `update` |

## Decisions worth recording

**snake_case to camelCase mapping lives here and nowhere else.** Repositories own the row
types and convert them, so no other layer ever sees a database column name.

**`findManyByUserIds` exists before anything needs it.** Unit 2's search results must load
every referenced driver profile in one query and hand the whole set to the C10 projection at
once, rather than making a per-row disclosure decision. Building the batch shape now is what
makes "every read goes through the projection" practical in list views later.

**Faults throw, they are not returned.** A Supabase error becomes a thrown `Error` with the
operation name. Per AQ6=C only expected business outcomes travel as `Result` values, and a
dropped connection is not an expected outcome.

**No projection and no business rules.** These repositories return raw profile records
including `phone` and `email`. That is correct: deciding whether a phone number may be
disclosed is C10's single responsibility (Unit 2), and duplicating the decision here would
give the rule two homes.

## No tests, deliberately

Plan step 5.1. These are thin database wrappers with no logic to test, and exercising them
requires a live Supabase instance - which Q20=A places out of scope. Recorded as a decision,
not an omission.
