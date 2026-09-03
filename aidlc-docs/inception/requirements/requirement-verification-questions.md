# Ride Buddy - Requirements Verification Questions

**Stage**: INCEPTION - Requirements Analysis
**Created**: 2026-09-03T05:04:58Z
**Depth**: Standard

## How to answer

Fill in a letter after each `[Answer]:` tag. If none of the options fit, choose the
last option (`X) Other`) and type your description right after the tag. Then tell me
you're done and I'll read the file.

## Intent analysis (my reading of your request)

- **Request Type**: New Project (greenfield)
- **Request Clarity**: Mostly clear - but see the gap flagged below
- **Scope Estimate**: System-wide (full-stack application)
- **Complexity Estimate**: Moderate (small surface area, but spans auth, profiles, rides, and a request/approval workflow)
- **Stated Tech Stack**: Node.js backend, Next.js frontend, Supabase (PostgreSQL)

## Important: gap found in vision.md

`vision.md` is **truncated at line 94**. It stops mid-sentence inside an unclosed code
fence at `Home / pickup area -> Office`. The Overview promises these capabilities, but the
document has no sections describing them:

- Find available rides
- Request a seat
- Accept or reject ride requests
- See basic contact details after a request is accepted
- Any explicit out-of-scope list

Questions 1 and 4-16 below are written to close that gap.

---

# Section 1: Filling the vision gap

## Question 1
How should we handle the missing part of `vision.md`?

A) Answer the detailed questions below and treat my answers as the authoritative source

B) I will paste or fix the complete `vision.md` content first, then you re-read it

C) Use your reasonable inference of standard carpooling flows and document them as explicit assumptions

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 2: Authentication and access

## Question 2
Which sign-in method should we use for company email verification?

A) Supabase magic link / email OTP, restricted to the company domain - no passwords to manage

B) Supabase email + password, with a company-domain check at signup

C) Google OAuth (Google Workspace), restricted to the company domain

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
Which email domain(s) count as "company employees"?

A) `solwr.com`

B) A single different domain - name it after the [Answer]: tag

C) Multiple domains - list them after the [Answer]: tag

X) Other (please describe after [Answer]: tag below)

[Answer]: X - Other: no domain restriction for the POC, any email domain accepted (option added during interactive questioning)

## Question 4
When a new employee signs in for the first time, how do we handle their profile?

A) Force profile completion (name, phone, home/pickup area, role) before they can use the app

B) Create a minimal profile automatically and prompt for missing fields only when needed (e.g. before creating or requesting a ride)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5
Does the profile `Role` field (Driver / Passenger / Both) restrict what a user can do?

A) Informational only - any signed-in employee can both offer rides and request seats

B) Role gates actions - only Driver/Both can create rides, only Passenger/Both can request seats

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 3: Rides and matching

## Question 6
Which trip directions must the MVP support?

A) Home -> Office only (morning commute only)

B) Both directions, each created as a separate independent ride

C) One ride record with an optional return leg

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 7
Should rides be repeatable?

A) One-off rides only - each ride has a single specific date

B) Allow a recurring pattern (e.g. every weekday) that generates multiple ride instances

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8
How should "pickup area" be represented? This drives how well matching works.

A) Predefined dropdown list of areas seeded in the database - enables exact matching between drivers and passengers

B) Free-text field the user types - simplest, but matching becomes fuzzy text search

C) Map / geolocation with coordinates and a radius-based search

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 9
How should "destination" work?

A) A single fixed office location, stored as a constant - the driver never types it

B) Chosen per ride from a list or free text, so multiple offices/sites are supported

X) Other (please describe after [Answer]: tag below)

[Answer]: B - chosen per ride from the seeded area list (same reference table as pickup areas, with the office as an entry)

## Question 10
What should the ride search / browse screen offer?

A) A simple list of all upcoming rides with seats available, no filters

B) Filter by date and pickup area

C) Filter by date, pickup area, and a departure time window

X) Other (please describe after [Answer]: tag below)

[Answer]: X - Other: filter by date + origin area + destination area (option added during interactive questioning; extends the file's option B to both ends of the trip, required by the Q6/Q9 origin->destination model)

---

# Section 4: Seat requests, approval, and contact sharing

## Question 11
Can a passenger have several outstanding seat requests at once?

A) Yes - multiple pending requests allowed, the passenger takes whichever gets accepted

B) No - one pending or accepted request per passenger per date, block duplicates

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 12
What happens when a driver tries to accept a request but all seats are already taken?

A) Block the acceptance and show that the ride is full

B) Allow it with a warning (overbooking permitted, driver's judgement)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 13
How much contact information is visible, and when?

A) Name only in listings; phone and email revealed to both parties only after a request is ACCEPTED

B) Name and email visible in listings; phone revealed only after acceptance

C) All contact details visible to any signed-in employee

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 14
Should cancellation be in the MVP?

A) Yes, both - a driver can cancel a ride, and a passenger can withdraw a request

B) Passenger can withdraw a pending request only - no driver-side ride cancellation

C) No cancellation in the MVP

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 15
How should users find out about new requests and accept/reject decisions?

A) No notifications - users see status when they open the app

B) In-app only - a notifications list or unread badge inside the app

C) Email notifications sent on request received and on accept/reject

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 16
What should "My Rides" / "My Requests" show?

A) Upcoming only - rides I'm driving and requests I've made, future dates only

B) Upcoming plus past history

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 5: Architecture and deployment

## Question 17
You said Node.js for backend and Next.js for frontend. How should those relate concretely?

A) One Next.js app where API routes / server actions are the Node.js backend - fewest moving parts, fastest to build

B) A separate Node.js API service (Express or Fastify) plus a Next.js frontend that calls it - two deployables, clean separation

C) Next.js frontend talking directly to Supabase via its client SDK with RLS doing authorization - minimal custom backend code

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 18
Where should authorization be enforced (who may see or change which rows)?

A) Supabase Row Level Security policies as the primary enforcement

B) Backend application code using the Supabase service-role key

C) Both - RLS policies plus backend checks (defence in depth)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 19
What is the deployment target for this POC?

A) Local development only - `npm run dev` against a Supabase cloud project

B) Frontend on Vercel + Supabase cloud

C) Both frontend and a separate backend deployed to cloud hosting - name the host after the [Answer]: tag

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 20
How much automated testing do you want, given the ~4 hour build target?

A) Minimal - unit tests on core business logic only (seat availability, request state transitions)

B) Standard - unit tests plus integration tests over the API endpoints

C) Comprehensive - unit, integration, and end-to-end browser tests

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 6: Scope boundaries

## Question 21
Confirm what is explicitly OUT of scope for the MVP.

A) All of these are out of scope: payments and cost-splitting, ratings and reviews, live GPS tracking, in-app chat, admin dashboard, native mobile apps

B) All of the above are out of scope EXCEPT a basic admin view (e.g. see all users and rides)

C) All of the above are out of scope EXCEPT in-app chat between matched driver and passenger

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 7: Extension opt-ins

These three questions come from AI-DLC extensions found in `.aidlc-rule-details/extensions/`.
Your answers decide whether each extension's rules become **blocking constraints** for every
later stage. Extensions you opt out of are never loaded.

## Question 22: Security Extensions
Should security extension rules be enforced for this project?

A) Yes - enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No - skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 23: Resiliency Extensions
Should the resiliency baseline be applied to this project?

**What this extension is.** Enabling it applies a set of **directional, design-time best practices** for building resilient systems, derived from the **AWS Well-Architected Framework (Reliability Pillar)** and resilience-review guidance. It steers requirements, design, and code toward fault tolerance, high availability, observability, and recoverability - covering 15 practice areas across business goals, change management, observability, high availability, disaster recovery, and continuous improvement.

**What this extension is NOT.** Enabling it does **not** make your workload production-ready, nor does it certify or guarantee any availability, RTO, or RPO target. It is a **starting point** that scaffolds good resiliency decisions early - it is not a substitute for a formal **AWS Well-Architected Review** of the built system.

Treat the output as a well-grounded **first draft of your resiliency posture** to build on and validate - not a finished, production-certified result.

A) Yes - apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No - skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 24: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes - enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial - enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No - skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---
---

# ROUND 2: Gaps found on re-audit

**Added**: 2026-09-03T05:04:58Z

I re-checked my first 24 questions against the six mandatory completeness areas in
`requirements-analysis.md` Step 5. Round 1 covered **Functional Requirements** and parts of
**Technical Context** well, but left real gaps in **Non-Functional Requirements**,
**User Scenarios / edge cases**, **Business Context**, and **Quality Attributes**.
Questions 25-43 close those gaps.

**Shortcut available:** if you'd rather not answer the non-functional and technical
sections one by one, answer **Question 42** first - it lets me apply sensible POC defaults
to Sections 10-11 in one go, and I'll write every default into `requirements.md` as an
explicit, reviewable assumption.

---

# Section 8: Functional details not yet covered

## Question 25
After publishing a ride, can the driver edit it (time, seats, area)?

A) Yes - fully editable while the ride is upcoming; pending requests stay pending, accepted passengers are simply shown the new details

B) Yes, but editing a ride that already has accepted passengers is blocked - the driver must cancel and recreate

C) No editing in the MVP - cancel and create a new ride instead

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 26
How many seats can a passenger ask for in a single request?

A) Exactly one seat per request - simplest

B) The passenger chooses a seat count (e.g. 2, bringing a colleague), capped at seats available

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 27
What can a driver see about a requester *before* deciding to accept?

A) Name and pickup area only - phone and email stay hidden until they accept

B) Name, pickup area, and the requester's role

C) Everything including phone and email, so the driver can call before deciding

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 28
Should requests and rejections carry free-text messages?

A) Neither - status changes only, no message fields

B) The passenger can add an optional note when requesting

C) Both - passenger note on request, and optional reason on rejection

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 29
Should a ride carry an optional free-text note from the driver (e.g. "no room for large bags", "leaving from the north gate")?

A) Yes - one optional notes field on the ride

B) No - keep the ride to structured fields only

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 30
What happens to a ride once its departure date and time have passed?

A) Automatically excluded from search results, and any still-pending requests are treated as expired

B) Automatically excluded from search, but pending requests keep their pending status

C) Driver must manually mark the ride complete or closed

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 31
Should the system stop a driver from requesting a seat on their own ride?

A) Yes - block it, and hide the request button on your own rides

B) Not needed - it won't happen in practice, don't spend time on it

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 9: Edge cases and race conditions

## Question 32
Two passengers request the last seat, and the driver accepts both in quick succession. How should the system behave?

A) Enforce it in the database (transaction or constraint) so the second acceptance fails cleanly with "ride is full"

B) Check seats in application code before accepting - a rare race is acceptable in a POC

C) Not a concern - the driver sorts it out with the passengers directly

X) Other (please describe after [Answer]: tag below)

[Answer]: A (answered together with Q12 - database-level enforcement covers both the seat cap and the concurrent-acceptance race)

## Question 33
A driver never responds to a pending request. What then?

A) Nothing - it stays pending until the ride's departure time passes

B) Auto-expire pending requests some hours before departure (give a letter plus your preferred window)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# Section 10: Technical context

## Question 34
TypeScript or JavaScript?

A) TypeScript throughout - typed Supabase client, fewer runtime surprises

B) Plain JavaScript - less setup

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

## Question 35
How should the UI be styled?

A) Tailwind CSS plus shadcn/ui components - fast to assemble, looks finished

B) Tailwind CSS only, hand-rolled components

C) A component library such as MUI or Chakra

D) Plain CSS or CSS Modules, no framework

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

## Question 36
What Supabase environment are we building against?

A) A new Supabase cloud project that I will create and give you the keys for

B) A new Supabase cloud project that you should set up (I'll run the CLI commands you give me)

C) Local Supabase via the Supabase CLI and Docker, for offline development

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

## Question 37
How should the database schema be created and versioned?

A) Supabase migration SQL files checked into the repo (`supabase/migrations/`) - versioned and repeatable

B) A single `schema.sql` I paste into the Supabase SQL editor

C) An ORM owning the schema (Prisma or Drizzle) with generated migrations

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

## Question 38
Do you want seed data for demoing?

A) Yes - a seed script with sample employees, pickup areas, and a handful of rides

B) No - I'll create real data by hand while testing

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

---

# Section 11: Non-functional requirements

## Question 39
What scale should the design assume?

A) Small internal POC - under 50 employees, a handful of concurrent users, no performance work needed

B) Whole office - a few hundred employees, basic indexing and pagination expected

C) Multi-site rollout - low thousands of employees, performance treated as a real requirement

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

## Question 40
Which devices and viewports must the UI support?

A) Mobile-first responsive, working on both phone and desktop - people book rides on their phones

B) Desktop only - this is demoed on a laptop

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

## Question 41
Profiles hold phone numbers and email addresses, which is personal data. What posture should the MVP take? (Relevant if the company falls under GDPR.)

A) POC posture - store the data, restrict visibility per Question 13, add no deletion or retention features; note the gap in the docs as follow-up work

B) Add basic data rights now - a user can delete their own profile and data from within the app

C) Full posture - self-service deletion, a documented retention period, and automatic purging of old rides and requests

X) Other (please describe after [Answer]: tag below)

[Answer]: A (defaulted via Q42)

---

# Section 12: Business context and defaults

## Question 42
Rather than answering Sections 10-11 individually, would you like me to apply POC defaults?

If you pick A, I will assume: TypeScript, Tailwind + shadcn/ui, Supabase cloud with checked-in
migration files, seed data included, small scale (under 50 users, no performance work),
mobile-first responsive, English only, a single local timezone, POC-level privacy posture,
and console-level logging. Every one of these goes into `requirements.md` as an explicit
assumption you can overturn at the review gate.

A) Yes - apply those defaults, and I'll skip Questions 34-41

B) No - I'll answer Questions 34-41 myself

C) Mostly - I'll answer only the questions in 34-41 I care about, you default the rest

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 43
What does success look like for this POC? This tells me where to spend the limited build time.

A) A working demo I can click through end to end in front of colleagues - polish the happy path

B) A foundation we will extend into a real product - prioritise clean structure and correctness over polish

C) A learning exercise in AI-DLC itself - the documentation trail matters as much as the code

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

**43 questions total** (24 from Round 1, 19 added in Round 2).

Answer what you can and tell me you're done. Questions 1, 8, 17, and 42 are the ones that
most change what gets built - if you only have time for a few, start there.
