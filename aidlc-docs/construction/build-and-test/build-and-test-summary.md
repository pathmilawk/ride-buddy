# Build and Test Summary

**Date**: 2026-09-03 · **Stage**: CONSTRUCTION - Build and Test

---

## Build Status

| | |
|---|---|
| **Build tool** | Next.js 15.5.25, Node 26.8.1, npm 11.19.0 |
| **Build status** | **SUCCESS** |
| **Build time** | ~3 seconds |
| **Artifacts** | `.next/` (gitignored). Nothing published - TC-7 is local-only |
| **Run with real credentials** | **Yes** - built against the user's actual Supabase project |

```
✓ Compiled successfully
✓ Generating static pages (11/11)
```

| Route | Rendering | Correct? |
|---|---|---|
| `/`, `/register`, `/sign-in` | Static | Yes - no per-request data |
| `/profile`, `/rides`, `/rides/new`, `/requests`, `/search` | Dynamic | Yes - all read the session cookie |

---

## Test Execution Summary

### Unit tests
| | |
|---|---|
| **Total** | **101** |
| **Passed** | **101** |
| **Failed** | 0 |
| **Suites** | 9 |
| **Duration** | under 1 second |
| **Coverage** | Not measured, and no figure claimed - see below |
| **Status** | **PASS** |

No coverage percentage is reported. Q20=A scoped testing to "core business logic only", so
whole-codebase coverage would be low by design and a number would mislead.

### Live runtime verification - what was actually run

Beyond the build, the application was started and exercised against the user's real Supabase
project:

| Check | Result |
|---|---|
| Supabase project reachable with the supplied key | **PASS** - PostgREST answered with structured errors |
| Production server boots | **PASS** - ready in 790 ms |
| BR-1.6 route protection: `/`, `/search`, `/rides`, `/requests`, `/profile` unauthenticated | **PASS** - all 307 to `/sign-in` |
| `/sign-in` and `/register` render | **PASS** - HTTP 200, all form testids present |
| No company-domain claim on the register page (BR-1.2) | **PASS** |
| No secret key or `sb_secret` string in served HTML | **PASS** |

### Schema application - RESOLVED

The user supplied a pooler connection string; all nine migrations applied cleanly and
`npm run db:verify` passes all 24 checks (4 tables, 1 view, 3 functions, 2 triggers, RLS on 4
tables, 4 policy counts, 2 rule-carrying constraints, 2 seed checks).

Note the direct host `db.<ref>.supabase.co` is **IPv6-only** and unusable from an IPv4-only
machine. The pooler (`aws-0-<region>.pooler.supabase.com:5432`, username `postgres.<ref>`) is
required. `scripts/db.mjs` now diagnoses this specifically.

### Integration tests - NOW AUTOMATED AND PASSING
| | |
|---|---|
| **Automated** | `npm run verify:live` - **17 checks, 17 passing** |
| **Manual scenarios written** | 6 |
| **Status** | **PASS** |

Turned from manual procedures into a repeatable, self-cleaning script. It creates fixtures under
a reserved UUID prefix and removes them afterwards, so it never touches demo data.

**The headline result** - FR-31 to FR-33 / US-22, the only correctness-critical requirement:

```
session A accepted the last seat            PASS
session B was refused with RIDE_FULL        PASS
session B BLOCKED on the row lock (>2s)     PASS
accepted requests equals the seat count     PASS
the ride is NOT overbooked                  PASS
```

Two concurrent acceptances against a one-seat ride: A won, B blocked for ~4 seconds on the ride
row lock, then correctly returned `RIDE_FULL`. **The guarantee holds under real concurrency.**

Also passing: contact released to an accepted pair in both directions; contact withheld from a
merely-pending requester; `public_profiles` having no phone column to leak; duplicate-request
refusal; seat bounds; the cancellation cascade; and contact access closing when a ride is
cancelled.

### End-to-end tests
| | |
|---|---|
| **Steps written** | 8, plus 7 follow-on checks |
| **Server-side verification** | **16 checks, 16 passing** |
| **Browser click-through** | Manual, not automated (Q20=A) |
| **Status** | **PASS server-side** |

Drove the running application with a real session cookie built from a genuine auth token, as
Alan Turing. Confirmed: search renders ride cards with driver names and notes and an actionable
request button; **no phone number anywhere on the search page**; My Requests shows the accepted
ride's contact details **with the phone present**; all authenticated routes render.

### Performance tests
**N/A by requirement.** NFR-4 and Q39=A specify no performance work; TC-7 leaves nothing
deployed to load. Recorded rather than left unanswered. Indexes were added for the known query
shapes.

### Contract tests
**N/A.** TC-1 is a single deployable with no inter-service contracts. All communication is
in-process.

### Security tests
| | |
|---|---|
| **Checks written** | 5 |
| **Checks run** | **5 of 5** |
| **Status** | **4 PASS, 1 known limitation** |
| **Enforced security review** | **None** - Q22=B opted out of the Security Baseline |

Check 1 (contact data unreadable without acceptance) and check 2 (ownership unforgeable) both
pass, verified as real authenticated users and through the live REST API. Check 3 is the known
capacity-bypass limitation below. Checks 4 and 5 pass.

**A second instance of the same class as check 3, found live**: a driver can `POST` a seat
request on their *own* ride through the REST API (HTTP 201). The insert policy only checks
`passenger_id = auth.uid()`, so the self-request refusal (FR-24) is enforced by the **service**,
not the database. This is exactly why US-15 was promoted to its own story - and it confirms the
general point that RLS policies are necessarily broader than the business rules they support.

---

## FINDING - BR-3.11's "only path" claim is overstated

Found while writing `security-test-instructions.md`, not by a test.

**The claim**: BR-3.11 states that "no other operation in any layer sets a request to
`accepted`", making the capacity guarantee unbypassable.

**Reality**: `ride_requests_update_as_driver` permits a ride's driver to update requests on their
own ride. A driver can therefore `PATCH` a request to `accepted` directly, skipping
`accept_ride_request`, and overbook their own ride.

**Severity: low.** Only the ride's own driver can do it, only to their own ride, and it harms
only themselves and passengers they are in direct contact with. It requires deliberately
bypassing the UI. The application code claim holds - `acceptWithCapacityGuarantee` is the only
route the app uses.

**But the rule as written is absolute, and it is not.** The accurate statement is: *no
application code path* sets `accepted` except through the guarantee.

**Not fixed.** A fix is a BEFORE-UPDATE trigger on `ride_requests` validating capacity on any
transition into `accepted` - roughly 15 lines, and consistent with this design's posture of
putting rules where code cannot bypass them. Left as a decision for the product owner rather
than added unilaterally during a verification stage.

**Recorded in** `security-test-instructions.md` check 3.

---

## Overall Status

| | |
|---|---|
| **Build** | **SUCCESS** |
| **Unit tests** | **PASS** - 101/101 |
| **Schema applied and verified** | **PASS** - 24/24 checks |
| **Live rule verification** | **PASS** - 17/17, including the concurrency guarantee |
| **Server-side E2E** | **PASS** - 16/16 |
| **Security checks** | 4 PASS, 1 documented limitation |
| **Demo data** | Loaded - 6 employees, 8 rides, 7 requests, working sign-in |
| **Ready for Operations** | **Yes, with two caveats below** |

### Caveats

1. **Anyone can register** (`requirements.md` §9.1). Accepted for a local POC; **BLOCKING before
   any public deployment.**
2. **A driver can overbook their own ride** via the REST API, bypassing the capacity function.
   Low severity - only their own ride - and documented with the fix in
   `security-test-instructions.md` check 3.

Neither blocks a demo. Both should be closed before this leaves POC scope.

---

## Next Steps

**Not ready for Operations.** Operations is a placeholder stage in this workflow and TC-7 keeps
the project local, so there is nothing to deploy - but the honest blocker is that the schema has
never been applied and no scenario has been run.

Before any public deployment, independently of the above: **add an email-domain allow-list**
(`requirements.md` §9.1, flagged BLOCKING).
