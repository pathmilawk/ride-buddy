# Business Rules - Unit 1 Foundation

**Phase**: CONSTRUCTION - Unit 1, Functional Design, Phase 2
**Decisions applied**: FQ3=A (loose phone), FQ4=A (role optional/defaults), FQ5=A (generic
sign-in errors), FQ8=A (idempotent profile creation)

Rules are numbered `BR-1.n` for Unit 1. Each cites its requirement and the story that
verifies it.

---

## Registration and Authentication

### BR-1.1 - Registration requires an email address and a password
An employee registers with an email address and a password. On success an auth account
exists and a profile row is created (BR-1.4).
**Requirements**: FR-1 · **Verified by**: US-01

### BR-1.2 - No email-domain restriction is applied
**Any** email address may register. No allow-list is consulted and no email confirmation is
required.
**Requirements**: FR-2 · **Verified by**: US-01

> **This is a deliberate deviation, not an omission.** `vision.md` Section 4 requires that
> only company employees can use the application and calls company email verification
> sufficient. `requirements.md` Section 9.1 records that the product owner was shown this
> conflict in full and reaffirmed the open-signup choice. It is stated as a positive rule
> here so that an implementer does not "helpfully" add a domain check, and so that a reviewer
> does not read its absence as an unfinished feature.
>
> **Blocking condition carried forward**: a domain allow-list must be added before this
> application is served from any publicly reachable URL.

### BR-1.3 - Sign-in failures are reported generically
A failed sign-in reports "invalid email or password" without indicating whether an account
exists for that address. A registration attempt on an already-registered address may say so,
since that fact is unavoidable.
**Requirements**: FR-1 · **Verified by**: US-01 · **Source**: FQ5=A

**Rationale**: costs nothing, and avoids compounding BR-1.2 by turning open registration into
an account-enumeration tool as well.

### BR-1.4 - A profile is created on first sign-in, idempotently
On any authenticated request where the user has no profile row, one is created holding the
user id and the email from the auth account. `display_name`, `phone`, and `home_area_id` are
left null; `role` defaults to `both`.

This rule is **idempotent** and evaluated on every profile read, not only at first sign-in. A
profile removed directly in the database is silently recreated.
**Requirements**: FR-3 · **Verified by**: US-01 · **Source**: FQ8=A

**Why idempotent rather than a one-time hook**: it repairs an inconsistent state instead of
locking the user out, and the completeness gate (BR-1.9) then asks for the missing fields, so
the user lands somewhere sensible.

### BR-1.5 - Sign-out ends the session
After sign-out the user reaches only the sign-in and registration screens.
**Requirements**: FR-1 · **Verified by**: US-01

### BR-1.6 - Every screen except sign-in and registration requires a session
An unauthenticated request to any other screen is redirected to sign-in.
**Requirements**: FR-1, NFR-1 · **Verified by**: US-01

---

## Profile Field Validation

### BR-1.7 - Field-level validation rules
Applied by the shared schema (C11) on both client and server; the server-side parse is
authoritative.

| Field | Rule | Source |
|---|---|---|
| `display_name` | Required for completeness. Non-empty after trimming, 2 to 80 characters. | FR-4 |
| `phone` | Required for completeness. Non-empty after trimming, 6 to 20 characters. Digits, spaces, hyphens, parentheses, and a leading `+` permitted. **No format, country code, or locale enforced.** | FQ3=A |
| `home_area_id` | Required for completeness. Must be the id of an existing `areas` row. | FR-8, FR-10 |
| `role` | Optional. One of `driver`, `passenger`, `both`. Defaults to `both`. | FQ4=A |
| `email` | Not editable. Displayed from the auth account. | US-02 |

**On the loose phone rule**: it accepts what colleagues actually type. The honest trade is
that a malformed number passes the completeness gate and only fails the person in step 8 of
the demo, when contact details are exchanged. Accepted for a POC; a real product would
normalise to E.164.

### BR-1.8 - A user may read and write only their own profile
Any attempt to read another employee's profile outside the projection path, or to write it at
all, is refused. Enforced in **both** layers required by NFR-1: a database policy comparing
the session user id against the row id, and an explicit check in the service.
**Requirements**: FR-5, NFR-1 · **Verified by**: US-03

**Note**: reading *parts* of another profile is legitimate and happens constantly - names in
search results, phone numbers after acceptance. That path is the projection (C10), built in
Unit 2. BR-1.8 governs the direct, unprojected path only.

---

## The Completeness Gate

### BR-1.9 - Three fields must be present before a user may offer or request a ride
The gate passes only when `display_name`, `phone`, and `home_area_id` are all non-null and
non-empty. Otherwise the action is refused with the outcome `PROFILE_INCOMPLETE`, and the
message names which fields are missing.

**`role` is not checked**, because FR-7 makes it informational and FQ4=A gives it a default.
Gating on a field that grants no permission would add friction with no functional effect.
**Requirements**: FR-6 · **Verified by**: US-04 · **Source**: FQ4=A

### BR-1.10 - The gate is checked at exactly two points
Before creating a ride, and before requesting a seat. Nowhere else. Browsing, searching,
viewing one's own profile, and signing out are all permitted with an incomplete profile.
**Requirements**: FR-6 · **Verified by**: US-04

**Why only two points**: those are the two actions whose downstream flows depend on the
fields. A ride needs a driver name to display and a phone to release on acceptance; a request
needs the same of the passenger. Gating anything else would be friction without purpose.

### BR-1.11 - A blocked action is retryable after completion
When the gate refuses, the user is redirected to the profile page with a message. Once the
missing fields are saved, retrying the original action succeeds.
**Requirements**: FR-6 · **Verified by**: US-04 · **Source**: FQ6=A

**Note for implementation**: US-04's acceptance criteria require the retry to succeed. The
design does not require the *original* action to resume automatically - the user may navigate
back and repeat it. Recorded so an implementer does not over-build a resume mechanism, and so
a reviewer does not expect one.

---

## Areas

### BR-1.12 - Areas are selected, never typed
Every location input - profile home area, and later ride origin and destination - is a
selection from the seeded `areas` list. No free-text location entry exists anywhere.
**Requirements**: FR-8, FR-10 · **Verified by**: US-05

### BR-1.13 - Offices are ordinary entries in the same list
An office is an `areas` row with `kind = office`. The `kind` field is a label for grouping
and defaulting only; it restricts nothing.
**Requirements**: FR-9 · **Verified by**: US-05 · **Source**: FQ2=A

### BR-1.14 - Area matching is exact equality on id
No fuzzy, partial, or case-insensitive text matching is used to relate two areas.
**Requirements**: FR-10 · **Verified by**: US-05

### BR-1.15 - Areas are read-only at runtime
No application flow creates, renames, or deletes an area. Rows come from the seed script.
**Requirements**: FR-8 · **Source**: TC-6

---

## Authorization (both layers, per NFR-1)

### BR-1.16 - Database layer
| Table | Read | Write |
|---|---|---|
| `profiles` | The owner may read their own row. Other employees' rows are reachable only through the projection path built in Unit 2. | Owner only, and only their own row. |
| `areas` | Any authenticated user may read all rows. | No application write path. |

### BR-1.17 - Service layer
Every service method resolves the caller through C13 `requireUser` and refuses with
`NOT_PERMITTED` when there is no session. Ownership is re-checked in the service even where a
database policy already covers it - that duplication **is** the defence in depth NFR-1 asks
for, not redundancy to be optimised away.
**Requirements**: NFR-1 · **Verified by**: US-03

---

## Failure Outcomes

Per AQ6=C, expected business outcomes are returned as typed results; unexpected faults are
thrown.

| Outcome | Raised when | Rule |
|---|---|---|
| `PROFILE_INCOMPLETE` | The gate finds a missing field | BR-1.9 |
| `NOT_PERMITTED` | No session, or an attempt to touch another user's profile | BR-1.6, BR-1.8 |
| `NOT_FOUND` | A referenced area id does not exist | BR-1.7 |
| Validation failure | A schema parse fails | BR-1.7 |
| Auth failure | Wrong credentials, reported generically | BR-1.3 |

**Thrown, not returned**: database connectivity faults, schema mismatches, and any state the
rules above do not describe as normal.

---

## Rule Coverage

| Requirement | Rules |
|---|---|
| FR-1 | BR-1.1, BR-1.3, BR-1.5, BR-1.6 |
| FR-2 | BR-1.2 |
| FR-3 | BR-1.4 |
| FR-4 | BR-1.7 |
| FR-5 | BR-1.7, BR-1.8 |
| FR-6 | BR-1.9, BR-1.10, BR-1.11 |
| FR-7 | BR-1.9 (role deliberately excluded) |
| FR-8 | BR-1.7, BR-1.12, BR-1.15 |
| FR-9 | BR-1.13 |
| FR-10 | BR-1.12, BR-1.14 |
| NFR-1 | BR-1.6, BR-1.8, BR-1.16, BR-1.17 |
| NFR-5 | Presentation only - see `frontend-components.md` |

All 10 functional requirements in Unit 1's scope have at least one governing rule.
