# Ride Buddy - Requirements

**Project**: Ride Buddy - internal employee carpooling POC
**Phase**: INCEPTION
**Stage**: Requirements Analysis
**Depth**: Standard
**Date**: 2026-09-03
**Status**: Awaiting approval

---

## 1. Intent Analysis Summary

| Attribute | Assessment |
|---|---|
| **User request** | "using ai-dlc let's start the project. Project vision is in vision.md. Tech stack is nodejs for backend, next.js for frontend and supabase sql. Ask question when needed?" |
| **Request type** | New Project (greenfield) |
| **Request clarity** | Clear after clarification; the source vision document was materially incomplete |
| **Scope estimate** | System-wide - full-stack application |
| **Complexity estimate** | Moderate - small surface area, but spans authentication, profiles, ride creation, discovery, and a request/approval state machine with conditional data visibility |
| **Risk level** | Low - local-only POC, no production data, no public exposure |

---

## 2. Source of Authority

`vision.md` is **truncated at line 94**. It stops mid-sentence inside an unclosed code fence.
Its Overview promises ride discovery, seat requests, accept/reject, and post-acceptance
contact details, but the document contains no sections describing any of them, and no
out-of-scope list.

Per **Q1=A**, the answers gathered during interactive Requirements Analysis are
**authoritative**, and this document is the real specification. `vision.md` is retained as
historical context and is not expected to be completed.

Where this document and `vision.md` disagree, **this document wins** - with one exception
called out explicitly in Section 9 (Known Deviations), because it removes a control the
vision treats as mandatory.

**Traceability**: every requirement below cites the question number that decided it. The full
question set with recorded answers is at `requirement-verification-questions.md` (43 of 43
answered).

---

## 3. Personas

### Driver
An employee who has a car and offers spare seats to coworkers. Creates rides, reviews
incoming seat requests, and accepts or rejects them.

### Passenger
An employee who wants a seat in a coworker's car. Searches rides, requests a seat, and waits
for a decision.

**One account covers both.** The `role` field on a profile is a self-declared label only and
does not restrict what a user can do (**Q5=A**). Any signed-in user may both offer rides and
request seats.

---

## 4. Functional Requirements

### 4.1 Authentication and Profile

| ID | Requirement | Source |
|---|---|---|
| FR-1 | Users sign up and sign in with email address and password via Supabase Auth. | Q2=B |
| FR-2 | **No email-domain restriction is enforced.** Any email address may register. See Section 9. | Q3=X |
| FR-3 | A profile is created automatically on first sign-in, holding whatever is known (email). Remaining fields are filled in later. | Q4=B |
| FR-4 | A profile holds: display name, company email, phone number, home/pickup area (reference to the areas table), and role (Driver / Passenger / Both). | vision.md S4 |
| FR-5 | A user may view and update their own profile at any time. | vision.md S4 |
| FR-6 | **Profile completeness gate**: before a user may create a ride or request a seat, their name, phone number, and home area must be present. If any is missing, the action is refused and the user is directed to complete their profile. | Q4=B consequence |
| FR-7 | The role field is informational and grants no permissions. | Q5=A |

**Note on FR-6**: this requirement exists specifically because FR-3 allows incomplete
profiles. Without it, the contact-exchange flow (FR-26) would display blank phone numbers.

### 4.2 Areas Reference Data

| ID | Requirement | Source |
|---|---|---|
| FR-8 | The system holds a **seeded reference table of areas**. Users select from it; they never type a free-text location. | Q8=A |
| FR-9 | The same area table serves both trip ends - a ride's origin and its destination. Office locations are entries in the same table. | Q9=B |
| FR-10 | All area matching is exact equality on the area identifier. No fuzzy or free-text search exists anywhere in the system. | Q8=A, Q10 |

**Design consequence**: because one table serves both ends, "direction" is emergent rather
than a stored enum. A Home to Office ride and an Office to Home ride differ only in which
identifier sits in which column. This satisfies FR-11 at no additional modelling cost.

### 4.3 Rides

| ID | Requirement | Source |
|---|---|---|
| FR-11 | A driver may create rides in **both directions** - Home to Office and Office to Home - each as an independent ride record. | Q6=B |
| FR-12 | A ride holds: date, departure time, origin area, destination area, available seat count, and an optional free-text note. | Q6, Q9, Q29=A |
| FR-13 | Rides are **one-off**. Each carries a single date. No recurrence or repeating patterns. | Q7=A |
| FR-14 | The optional ride note carries practical detail a structured form cannot express, e.g. "no room for large bags", "leaving from the north gate". | Q29=A |
| FR-15 | **A published ride cannot be edited.** A driver corrects a mistake by cancelling it and creating a new one. | Q25=C |
| FR-16 | A driver may **cancel** their own upcoming ride. | Q14=A |
| FR-17 | Once a ride's departure date and time have passed it is excluded from search results and from the My Rides view. Past rides are filtered by date, not deleted. | Q30=A, Q16=A |

### 4.4 Ride Discovery

| ID | Requirement | Source |
|---|---|---|
| FR-18 | A user may search upcoming rides filtered by **date, origin area, and destination area**. | Q10 |
| FR-19 | Search results display driver name, origin area, destination area, date, departure time, seats remaining, and the ride note. | Q13=A, Q29=A |
| FR-20 | Search results **must not** expose the driver's phone number or email address. | Q13=A |
| FR-21 | Cancelled rides and rides whose departure has passed never appear in search results. | Q16=A, Q17, Q30=A |

### 4.5 Seat Requests

| ID | Requirement | Source |
|---|---|---|
| FR-22 | A passenger may request a seat on a ride. Each request is for **exactly one seat**. | Q26=A |
| FR-23 | Requests carry **no message or note field**. Neither do rejections. | Q28=A |
| FR-24 | A user **may not request a seat on their own ride**. Enforced server-side, not merely hidden in the UI. | Q31=A |
| FR-25 | A passenger may hold **multiple pending requests** simultaneously, across different rides, and takes whichever is accepted first. | Q11=A |
| FR-26 | A passenger may not hold more than one active request on the *same* ride. A duplicate request is refused. | Assumption A-1 |
| FR-27 | A driver sees, for each pending request on their ride, the requester's **name and pickup area only**. | Q27=A |
| FR-28 | A driver may **accept** or **reject** a pending request on their own ride. | vision.md S1 |
| FR-29 | A passenger may **withdraw** their own pending request. | Q14=A |
| FR-30 | **Once a request reaches ACCEPTED, both parties can see each other's phone number and email address.** Before that, neither can. | Q13=A, vision.md S1 |

### 4.6 Seat Capacity - Correctness Critical

| ID | Requirement | Source |
|---|---|---|
| FR-31 | The number of accepted requests on a ride **must never exceed** its available seat count. | Q12=A |
| FR-32 | This limit is enforced **at the database level** - within a transaction or via a constraint - so that two concurrent acceptances cannot both succeed against the last seat. The second fails cleanly with a "ride is full" error. | Q12=A, Q32=A |
| FR-33 | Application-layer checking alone is **not sufficient** to satisfy FR-31. | Q32=A |

**Why this is singled out.** This is the only requirement in the system where a plausible
race condition produces a silently wrong result - two passengers each believing they hold the
last seat. Because FR-22 fixes every request at exactly one seat, the enforcement reduces to
keeping a row count below a stored integer, which is expressible as a simple constraint or a
short transaction. It is cheap to do correctly and embarrassing to get wrong in a live demo.

### 4.7 Lifecycle and State

| ID | Requirement | Source |
|---|---|---|
| FR-34 | A ride is either ACTIVE or CANCELLED. PAST and FULL are derived, not stored. | Q14=A, Q30=A |
| FR-35 | A request occupies one of: PENDING, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED, CANCELLED. | Q14, Q30, Q33 |
| FR-36 | Pending requests are **not** expired early. They remain pending until the ride's departure passes. No scheduled job is required. | Q33=A |
| FR-37 | When a ride's departure passes, its still-pending requests are treated as EXPIRED. | Q30=A |
| FR-38 | When a driver cancels a ride, **all** of its requests - pending and already accepted - move to a terminal CANCELLED state, so no passenger is left believing they hold a seat. | Q14=A, resolves open design point |

#### Request state transitions

| From | To | Trigger |
|---|---|---|
| (none) | PENDING | Passenger requests a seat (FR-22) |
| PENDING | ACCEPTED | Driver accepts, seat available (FR-28, FR-32) |
| PENDING | REJECTED | Driver rejects (FR-28) |
| PENDING | WITHDRAWN | Passenger withdraws (FR-29) |
| PENDING | EXPIRED | Ride departure time passes (FR-37) |
| PENDING | CANCELLED | Driver cancels the ride (FR-38) |
| ACCEPTED | CANCELLED | Driver cancels the ride (FR-38) |

ACCEPTED, REJECTED, WITHDRAWN, EXPIRED and CANCELLED are terminal. An accepted request is
**not** reversible by the driver - there is no un-accept - because Q28=A removed the
messaging that would make such a reversal explainable to the passenger.

### 4.8 User Views

| ID | Requirement | Source |
|---|---|---|
| FR-39 | **My Rides** lists the signed-in user's upcoming rides as driver, each with its requests and their statuses. | Q16=A |
| FR-40 | **My Requests** lists the signed-in user's upcoming seat requests as passenger, each with its current status. | Q16=A |
| FR-41 | Both views show upcoming items only. No history section. | Q16=A |
| FR-42 | Status is communicated in-app, with an in-app notification bell, unread badge and list, plus OS-level browser notifications. **No email.** *(Amended 2026-09-03 - see below.)* | Q15=A, amended |

---

## 5. Non-Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| NFR-1 | **Authorization is defence in depth**: PostgreSQL Row Level Security policies AND explicit checks in the Next.js server layer. A missed check in one layer must not by itself expose data. | Q18=C |
| NFR-2 | The conditional contact-detail rule (FR-20, FR-30) is enforced **server-side**. Phone and email must be absent from API responses for non-accepted pairs - hiding them only in the browser would leave them readable in the network response. | Q13=A, Q18=C |
| NFR-3 | Seat capacity is enforced in the database (FR-32). | Q12=A |
| NFR-4 | The design assumes **fewer than 50 employees** and a handful of concurrent users. No performance engineering, caching, or load testing is required. | Q39 |
| NFR-5 | The UI is **mobile-first responsive** and usable on both phone and desktop. | Q40 |
| NFR-6 | Unit tests cover **seat availability and request state transitions**. Broader integration and end-to-end testing is out of scope. | Q20=A |
| NFR-7 | English only. A single local timezone. No localisation. | Q42 bundle |
| NFR-8 | Console-level logging. No observability platform, metrics, or tracing. | Q42 bundle |
| NFR-9 | **POC privacy posture**: personal data (phone, email) is stored and its visibility restricted per FR-20/FR-30, but there is no self-service deletion, no retention period, and no automatic purging. See Section 9. | Q41 |

---

## 6. Technical Constraints

| ID | Constraint | Source |
|---|---|---|
| TC-1 | **Single Next.js application.** Its API routes / server actions serve as the Node.js backend. One deployable, not two. | Q17=A |
| TC-2 | TypeScript throughout, including a typed Supabase client. | Q34 |
| TC-3 | Tailwind CSS with shadcn/ui components. | Q35 |
| TC-4 | Supabase cloud (PostgreSQL) for database and authentication. | Q36 |
| TC-5 | Schema is created and versioned as **migration SQL files checked into the repository** under `supabase/migrations/`. | Q37 |
| TC-6 | A **seed script** provides sample employees, areas, and rides for demonstration. | Q38 |
| TC-7 | **Local development only** - `npm run dev` against the Supabase cloud project. No public hosting, no Vercel configuration. | Q19=A |
| TC-8 | Application code lives at the workspace root. `aidlc-docs/` holds documentation only. | CLAUDE.md |

**Note on TC-1**: the original request named "nodejs for backend, next.js for frontend",
which could have meant two separate services. Q17=A resolved this to a single Next.js
application whose server-side code *is* the Node.js backend. This is the interpretation that
fits the roughly four-hour build target.

**Note on TC-6**: seed data is the only route to demo content, because Q21=A rules out an
admin interface. It is therefore a requirement, not a convenience.

---

## 7. Explicit Assumptions

Q42=A applied a defaults bundle covering the technical and non-functional questions. Those
defaults are recorded as requirements above (NFR-4 to NFR-9, TC-2 to TC-6) rather than
repeated here. The assumptions below are additional - points that no question settled, where
a decision was needed to make the specification complete.

**Every assumption here is overturnable at the approval gate.**

| ID | Assumption | Rationale |
|---|---|---|
| A-1 | A passenger may not hold more than one active request on the same ride; a duplicate is refused (FR-26). | Q11=A permits multiple pending requests across *different* rides. Allowing repeats on one ride serves no purpose and would corrupt the seat arithmetic in FR-31. |
| A-2 | Search results include rides with zero seats remaining, marked as full, with the request action disabled - rather than hiding them. | Q10 did not specify. Showing them explains why a known ride is unavailable; hiding them looks like a bug. |
| A-3 | The Supabase cloud project is created by the user, who supplies the project URL and the browser-safe **publishable key** as environment variables. **No secret key is required.** *(Amended 2026-09-03 - see below.)* | The Q42 bundle specified "Supabase cloud" without settling who provisions it. Account creation cannot be automated. |
| A-4 | Current Node.js LTS with npm as the package manager. | Never asked - deliberately, as a default carries no real risk here. |
| A-5 | "Upcoming" means departure date and time later than the current moment, evaluated at query time. | Q16/Q30 established upcoming-only filtering without defining the boundary. Query-time evaluation avoids the scheduled job that Q33=A rules out. |
| A-6 | Seed areas comprise a small set of residential areas plus at least one office entry. | Required to make FR-8/FR-9 demonstrable; exact contents are not requirements-level detail. |


### Amendment to A-3 - 2026-09-03

**Original wording**: the user supplies the project URL, **anon key, and service-role key**.

**Amended to**: the user supplies the project URL and the **publishable key**. No secret key is
required.

**Why**: Supabase has retired the `anon` / `service_role` JWT pair in favour of
`sb_publishable_...` / `sb_secret_...` keys. A newly created project is issued a publishable key
and no anon key at all, so the original wording named a credential that no longer exists.

**Scope of the change**: naming and configuration only. The publishable key occupies exactly the
role the anon key did - browser-safe, no privileges of its own, every request subject to row
level security. **NFR-1's database layer, the RLS policies, and every design decision that rests
on them are unaffected.**

**A correction to the original assumption, beyond the rename**: it listed a service-role key as
something the user must supply. That was wrong even at the time - nothing in this application
ever needed one, because authorization runs as the signed-in user against RLS policies. The
amended wording drops it and `.env.example` now states explicitly that a secret key must not be
added, since it would bypass every policy.

**Raised by**: the product owner, on finding their Supabase project offered no anon key.


### Amendment to FR-42 - 2026-09-03

**Original wording**: status is communicated in-app only; there are no notifications of any kind
(Q15=A).

**Amended to**: an in-app notification bell with an unread badge and a dropdown list, plus
OS-level browser notifications via the Web Notifications API. Still **no email** - that was the
part of Q15=C nobody asked for.

**Why**: the product owner asked for it directly. What has been built is essentially **Q15=B**
("in-app notification/badge list only") plus the OS-toast half, delivered live over Supabase
Realtime.

**What this closes**: section 9.2 recorded that a passenger learns of a cancellation only by
opening the app, and called it a real usability gap accepted for a POC. **That gap is now
closed** - the cancellation cascade fires a notification to every affected passenger.

**Scope of the change**:
- New: `notifications` table, four notification kinds, two triggers on `ride_requests`,
  Realtime on the new table, a bell component in the shared layout
- Unchanged: every other requirement. No existing table, policy, function or trigger was
  altered. The notification triggers *compose* with the FR-38 cascade rather than replacing it
- Out of scope still: email, and a notification for a withdrawal (the "everything including
  withdrawals" option was offered and declined)

**Design note**: notifications are created by **database triggers**, not application code, for
the same reason the capacity guarantee and the cancellation cascade are - a future code path
cannot forget to notify. The table has no insert policy for users, so nobody can fabricate a
notification for someone else.

**Raised by**: the product owner.

---

## 8. Out of Scope

Explicitly excluded from the MVP per **Q21=A**:

- Payments, fare calculation, and cost-splitting
- Ratings, reviews, and reputation
- Live GPS tracking or route display
- In-app chat or messaging between users
- Admin dashboard or any administrative interface
- Native mobile applications

Excluded by other decisions:

- Recurring or repeating rides (Q7=A)
- Editing a published ride (Q25=C)
- Email, push, or any out-of-app notification (Q15=A)
- Past ride and request history views (Q16=A)
- Request or rejection messages (Q28=A)
- Multi-seat requests (Q26=A)
- Early expiry of pending requests, and any scheduled job (Q33=A)
- Free-text or map-based location entry (Q8=A)
- Integration tests and end-to-end browser tests (Q20=A)
- Public deployment (Q19=A)

---

## 9. Known Deviations and Limitations

These are **deliberate, recorded decisions**, not oversights. Each was raised, discussed, and
confirmed.

### 9.1 DEVIATION - employee-only access is not enforced

**`vision.md` Section 4 requires**: "Employees sign in using their company email address.
Only company employees should be able to use the application. For the POC, company email
verification is sufficient."

**What is being built instead** (FR-1, FR-2): email and password authentication with **no
domain allow-list and no email confirmation**. No company affiliation check of any kind
exists. Any email address can register.

**How this was decided**: flagged as Contradiction 1 during Requirements Analysis, presented
with its consequences in full, and reaffirmed by the user. Settled - not to be re-litigated
in later stages.

**Consequence**: any person who can reach the running application can register and then read
every employee's name and pickup area, and any phone number exposed to them through an
accepted request.

**Residual risk: LOW, conditional on remaining local.** Three factors contain it:
- TC-7 keeps the application on localhost, so access requires the developer's machine
- FR-20/FR-30 restrict contact data to accepted request pairs
- NFR-1 enforces authorization in two independent layers

**BLOCKING CONDITION**: an email-domain allow-list **must** be added before this application
is served from any publicly reachable URL. This is the single highest-priority item in any
follow-up work.

### 9.2 ~~LIMITATION - cancellations are silent~~ RESOLVED 2026-09-03

**This limitation no longer applies.** It originally read: a driver can cancel a ride, FR-42
provides no notifications, so an accepted passenger discovers it only by opening the app.

The FR-42 amendment closed it. Cancelling a ride cascades every request to `cancelled`
(FR-38), and the notification trigger fires once per affected request - so every passenger who
held a seat is told, in-app and, if the tab is not focused, as an OS notification.

Retained here rather than deleted, because the reasoning is worth keeping: the gap was
identified during Requirements Analysis, accepted deliberately, and then closed when the
product owner decided the trade was no longer worth making.

### 9.3 LIMITATION - no data deletion path

NFR-9 stores phone numbers and email addresses with no self-service deletion and no retention
policy. If the company is subject to GDPR, a production version needs a deletion route, a
stated retention period, and purging of stale rides and requests.

### 9.4 LIMITATION - no security or resiliency review was enforced

All three AI-DLC extensions were opted out (Q22=B, Q23=B, Q24=C), so their rule files were
never loaded and no extension rule is enforced anywhere in this project. The rationale is
sound - each extension's own text names PoCs as the skip case, and the resiliency baseline
derives from AWS Well-Architected while this project runs on Supabase. The combined effect is
nonetheless worth stating plainly: **this POC has had no enforced security review and no
company-affiliation check.** Both are appropriate for a local demo and both need revisiting
before the code goes anywhere near production.

---

## 10. Success Criteria

Per **Q43=A**, success is **a clickable end-to-end demo**. Effort favours a polished happy
path over structural depth, and this is the tiebreaker for later design decisions: where a
choice lies between engineering purity and a working demo path, the demo path wins.

The demonstrable path is:

1. Employee signs in (FR-1)
2. Completes their profile (FR-5, FR-6)
3. Creates a ride from their home area to the office (FR-11, FR-12)
4. A second employee searches by date and both areas, and finds it (FR-18, FR-19)
5. Requests a seat, seeing no contact details yet (FR-22, FR-20)
6. The driver sees the request with name and area only (FR-27)
7. The driver accepts; seat capacity is enforced in the database (FR-28, FR-32)
8. Both now see each other's phone number and email (FR-30)

Every step must work without a rough edge. That is the bar.

---

## 11. Requirements Coverage

| Area | Requirements | Questions |
|---|---|---|
| Authentication and profile | FR-1 to FR-7 | Q2, Q3, Q4, Q5 |
| Areas reference data | FR-8 to FR-10 | Q8, Q9, Q10 |
| Rides | FR-11 to FR-17 | Q6, Q7, Q12, Q14, Q25, Q29, Q30 |
| Ride discovery | FR-18 to FR-21 | Q10, Q13, Q16 |
| Seat requests | FR-22 to FR-30 | Q11, Q13, Q14, Q26, Q27, Q28, Q31 |
| Seat capacity | FR-31 to FR-33 | Q12, Q32 |
| Lifecycle and state | FR-34 to FR-38 | Q14, Q30, Q33 |
| User views | FR-39 to FR-42 | Q15, Q16 |
| Non-functional | NFR-1 to NFR-9 | Q13, Q18, Q20, Q39, Q40, Q41, Q42 |
| Technical constraints | TC-1 to TC-8 | Q17, Q19, Q34 to Q38 |
| Out of scope | Section 8 | Q7, Q8, Q15, Q16, Q19, Q20, Q21, Q25, Q26, Q28, Q33 |
| Deviations | Section 9 | Q2, Q3, Q22, Q23, Q24, Q41 |
| Success criteria | Section 10 | Q43 |

**All 43 questions are accounted for.** 42 requirements, 9 non-functional requirements,
8 technical constraints, 6 assumptions.
