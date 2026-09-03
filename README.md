# Ride Buddy

An internal carpooling proof of concept. An employee going to the office offers spare seats in
their car; a colleague from the same area requests one; the driver accepts; the two then see
each other's contact details.

Built with the AI-DLC workflow. The full decision trail lives in [`aidlc-docs/`](aidlc-docs/).

---

## Status

**All three units are implemented.**

| Unit | Scope | State |
|---|---|---|
| 1 Foundation | Registration, sign-in, profiles, areas, the completeness gate | **Done** |
| 2 Ride Offering and Discovery | Publish a ride, cancel it, search, contact withholding | **Done** |
| 3 Requests and Matching | Seat requests, accept/reject, capacity guarantee, contact exchange | **Done** |
| + Notifications | In-app bell, unread badge, list, OS toasts, live over Realtime | **Done** |

The full flow works: register, complete your profile, publish a ride, find a colleague's ride,
ask for a seat, accept or decline, and exchange phone numbers once a seat is agreed.

### Notifications

A bell in the header with an unread badge and a dropdown list, plus OS-level browser
notifications when the tab is not focused. Four events notify:

| Event | Who is told |
|---|---|
| Someone asks for a seat | the **driver** |
| Request accepted | the **passenger** |
| Request declined | the **passenger** |
| Ride cancelled | **every** passenger who held a seat |

A withdrawal notifies nobody - the passenger did it themselves.

Two things worth knowing about how it works:

- **Notifications are created by database triggers**, not application code, for the same reason
  the capacity guarantee and the cancellation cascade are: a future code path cannot forget to
  notify. The table has no insert policy for users, so nobody can fabricate one for someone else.
- **The badge is server-rendered**, so it is correct on first paint with no JavaScript. Supabase
  Realtime only carries what arrives afterwards.

The OS permission prompt appears on your **first click of the bell**, never on page load, and a
desktop toast only fires when the tab is not visible - a notification for something already on
screen is just noise.

This amends FR-42, which originally chose no notifications at all. It closes the gap
`requirements.md` §9.2 recorded: a passenger used to learn of a cancellation only by looking.

### What has been proven

Verified against a live Supabase project, not just in principle:

| Check | Result |
|---|---|
| Type check, unit tests, production build | Clean, **113/113**, 11/11 pages |
| Schema applied and verified | All 10 migrations; 24 object/policy/constraint checks pass |
| **Seat capacity under concurrent acceptance** | **PASS** — two simultaneous acceptances against one seat: one wins, the other blocks on the row lock then gets `RIDE_FULL`. The ride is not overbooked |
| **Contact released only to an accepted pair, both directions** | **PASS**, as real authenticated users |
| **Contact withheld from everyone else** | **PASS** — `public_profiles` has no phone column to leak |
| **Cancellation cascades to every request** | **PASS**, and contact access closes with it |
| Duplicate requests, seat bounds | **PASS** |
| **Notifications - all four events, RLS, no fabrication** | **PASS** |
| Authenticated pages render real data | **PASS** — 16 checks, including no phone number on search and the phone present for an accepted pair |

Re-run the database half any time with `npm run verify:live` (26 checks, self-cleaning).

### What has not

- **No automated browser tests.** The eight-step demo path is written up in
  `aidlc-docs/construction/build-and-test/e2e-test-instructions.md` and has been walked
  server-side, but clicking through it is still manual.
- **A driver can overbook their own ride** by calling the REST API directly, bypassing the
  capacity function. Only the ride's own driver can do it, only to their own ride. Documented in
  `security-test-instructions.md` check 3, with the fix noted.
- **Anyone can register.** See below.

---

## Prerequisites

- Node.js 20 or newer, and npm
- A Supabase project (free tier is fine)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create one at [supabase.com](https://supabase.com). From **Project Settings -> API Keys**, copy
the project URL and the **publishable key** (it starts `sb_publishable_`).

That key is safe to put in the browser: it carries no privileges of its own, and every request
made with it is subject to the row level security policies you apply in the next step.

If your project predates Supabase's key migration and shows an "anon public" key instead, use
`NEXT_PUBLIC_SUPABASE_ANON_KEY` - the app reads it as a fallback.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

No secret key (formerly `service_role`) is required, and none should be added - it bypasses
every RLS policy. Authorization runs as the signed-in user against row level security policies,
which is one of the two layers NFR-1 asks for.

### 4. Apply the schema

**With the scripts** - add your database password to `.env.local` first:

```
SUPABASE_DB_URL=postgresql://postgres:YOUR-DB-PASSWORD@db.your-project-ref.supabase.co:5432/postgres
```

Then:

```bash
npm run db:setup     # push all migrations, seed, then verify
```

Requires the `psql` client (`brew install libpq` or `brew install postgresql`). The application
never reads `SUPABASE_DB_URL`, and it carries no `NEXT_PUBLIC_` prefix, so it never reaches the
browser.

**Without storing a database password**: paste
`aidlc-docs/construction/build-and-test/complete-schema.sql` into the Supabase **SQL Editor** and
run it once. It concatenates all nine migrations plus the seed, in order.

Either way, check it landed:

```bash
npm run db:status    # needs only the publishable key
npm run db:verify    # full check: tables, views, functions, triggers, RLS, policies, constraints
```

> **Employee accounts are not seeded.** A profile row is keyed by `auth.users.id`, which plain
> SQL cannot create. Register demo employees through the app's own registration screen - a
> profile is created automatically on first sign-in.

### 5. Load demo data (optional, but do it for a demo)

```bash
npm run db:demo
```

Creates 6 employees, 8 rides and 7 requests covering every state the UI can show. Re-runnable:
each row has a fixed UUID and the script deletes exactly those before reinserting, so it never
touches an account you registered yourself.

**Every demo account uses the password `RideBuddy123!`**

| Sign in as | Who | Home area | Good for showing |
|---|---|---|---|
| `alan@solwr.com` | Alan Turing | Hillevåg | **Start here.** His prefilled search finds a ride departing today with a free seat, and he already has an accepted ride so contact details are on screen |
| `ada@solwr.com` | Ada Lovelace | Sandnes Centre | The driver side: three rides, one with a pending request to accept or decline, plus a cancelled one |
| `linus@solwr.com` | Linus Berg | Randaberg | A **full** ride, and one that has already departed |
| `grace@solwr.com` | Grace Hopper | Stavanger East | A pending request, a withdrawn one, and a cancelled one |
| `katherine@solwr.com` | Katherine Johnson | Forus | Both sides at once - drives one ride, accepted on another |
| `noor@solwr.com` | Noor Hansen | **none** | **The completeness gate.** No phone or home area, so offering or requesting a ride refuses and redirects to her profile |

A suggested two-minute walkthrough: sign in as Alan, look at the prefilled search, ask for a
seat on the Hillevåg ride, then sign in as Katherine (its driver) and accept it — contact details
appear for both of you. Then sign in as Noor and try to offer a ride.

### 6. Run it

```bash
npm run dev
```

Open <http://localhost:3000>. You will be sent to sign-in; register an account and you will be
prompted to complete your profile.

---

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm test` | Run the unit tests |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:status` | What exists in the project right now (publishable key only) |
| `npm run db:push` | Apply any **pending** migrations in order, tracked in a ledger so it is safe to re-run |
| `npm run db:seed` | Apply the seed data (re-runnable) |
| `npm run db:verify` | Check tables, views, functions, triggers, RLS, policies and constraints |
| `npm run db:setup` | push, then seed, then verify |
| `npm run db:demo` | Load demo employees, rides and requests (re-runnable) |
| `npm run db:reset` | Drop everything this project created, then set up again |
| `npm run verify:live` | Prove the four database-enforced rules against the live project, including the concurrency guarantee |

`db:push`, `db:seed`, `db:verify` and `db:reset` need `SUPABASE_DB_URL` and the `psql` client.
`db:status` needs neither.

---

## Testing scope

Automated testing is deliberately narrow. The project scoped it to core business logic only,
which for this unit means three pure-function suites: the profile completeness gate, the
validation schemas, and the result type.

There are no repository, action, or component tests. Repositories are thin database wrappers
with no logic; actions hold no business rules by construction; and no DOM test environment is
configured.

113 tests across 10 suites: the completeness gate, validation schemas, the result type, ride
derivations, ride schemas, the contact projection, request transitions, request expiry, the
accepted-contact type boundary, and notification wording.

Three assert *decisions* rather than behaviour, so a later change fails loudly instead of
silently reversing a choice: that any email domain registers, that a same-area ride is accepted,
and that a `PublicProfile` can never carry contact details.

**What the tests do not cover**: the seat-capacity guarantee under concurrent acceptance. That
correctness lives in SQL and needs two simultaneous transactions against a live database. It is
the highest-value manual check.

---

## Anyone can register - this is deliberate

**There is no company email-domain restriction.** Any email address can create an account.

The product vision asked for employee-only access, and that requirement was consciously set
aside for this proof of concept. It is recorded in
[`aidlc-docs/inception/requirements/requirements.md`](aidlc-docs/inception/requirements/requirements.md)
section 9.1, along with the reasoning.

It is safe as things stand because the app is meant to run locally, contact details are
withheld unless an accepted request links two people, and authorization is enforced in two
independent layers.

**Before this is ever served from a public URL, add a domain allow-list.** That is the single
highest-priority item in any follow-up work. Please do not remove the open-signup behaviour
without also reading section 9.1 - its absence is a decision, not an oversight.

---

## Project structure

```
app/                   Next.js App Router - routes and layouts
features/              UI by feature; actions.ts is the write boundary
  auth/  profile/
services/              Business logic (shared)
db/
  repositories/        Data access (shared)
  supabase/            Cookie-aware Supabase clients
lib/                   Cross-cutting: schemas, result type, auth context, the gate rule
supabase/
  migrations/          Versioned schema
  seed.sql             Demo areas
tests/unit/            Pure-function unit tests
aidlc-docs/            Documentation only - never application code
```

Units do not appear in this tree. They are a build-sequencing device, so the shared
`services/`, `db/` and `lib/` layers stay whole - which is what gives the seat-capacity and
contact-disclosure rules a single home each.
