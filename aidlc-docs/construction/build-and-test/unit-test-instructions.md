# Unit Test Execution

## Run

```bash
npm test           # vitest run
npm run test:watch # during development
```

## Expected result

```
Test Files  9 passed (9)
     Tests  101 passed (101)
```

**101 tests, 0 failures.** No database or browser is required - every suite is pure functions,
so they run in well under a second and need no `.env.local`.

## What is covered

| Suite | Unit | Covers |
|---|---|---|
| `profile-completeness.test.ts` | 1 | BR-1.9 - the gate; each field missing individually and together; whitespace treated as missing; **role explicitly not gated** |
| `schemas.test.ts` | 1 | BR-1.7 field rules; role defaulting; the loose phone rule; **that any email domain is accepted** |
| `result.test.ts` | 1 | Success/failure construction, field detail, type narrowing |
| `ride-derivations.test.ts` | 2 | Seats remaining at zero/partial/full/beyond; never negative; day-range boundaries incl. month rollover and a DST date; date+time combination; strict future comparison |
| `ride-schemas.test.ts` | 2 | Seat bounds 1-8 incl. form-string coercion; note length; **that a same-area ride is accepted** |
| `contact-projection.test.ts` | 2 | `PublicProfile` has exactly four keys; **contact fields dropped even when the input row carries them** |
| `request-transitions.test.ts` | 3 | Every legal transition permitted, **every illegal one refused**; `accepted` not terminal; guards proven non-interchangeable |
| `request-expiry.test.ts` | 3 | Pending+departed = expired at the instant; terminal statuses unchanged by departure; **the same row reporting differently as time passes with nothing having run** |
| `accepted-contact-projection.test.ts` | 3 | `AcceptedContact` carries contact fields, `PublicProfile` still does not, and the two are not assignable |

## Four tests assert decisions, not behaviour

These exist so a later change fails loudly rather than silently reversing something that was
chosen deliberately:

| Test | Guards |
|---|---|
| any email domain registers | The recorded deviation in `requirements.md` §9.1 |
| a same-area ride is accepted | FQ4=B, chosen against the recommendation |
| a contaminated row loses contact fields | That the projection is an allow-list |
| `PublicProfile` is not assignable to `AcceptedContact` | BR-3.27's type boundary |

If one of these fails, do not "fix" the test before reading the decision it cites.

## Coverage

No coverage threshold is configured, and no percentage is claimed. Q20=A scoped testing to
"core business logic only (seat availability, request state transitions)", so coverage of the
codebase as a whole would be low by design and a number would mislead.

## WHAT THESE TESTS DO NOT COVER

Stated plainly, because 101 passing tests could otherwise imply more than they do:

- **The seat-capacity guarantee under concurrency.** Its correctness lives in
  `0007_accept_request_function.sql`. These tests cover the arithmetic; they cannot exercise
  two simultaneous acceptances. See `integration-test-instructions.md`.
- **Any RLS policy.** The contact-disclosure boundary spans a view, a policy and a type. Only
  the type half is tested here.
- **The cancellation cascade trigger.**
- **Every repository, action and component.** No database, request context or DOM environment
  is configured - each a recorded decision, not an oversight.

## If tests fail

1. `npm test` prints the file, test name and assertion.
2. All suites are pure - a failure is in the logic or the expectation, never in the environment.
3. If the failing test is one of the four decision tests above, read the cited rule first.
