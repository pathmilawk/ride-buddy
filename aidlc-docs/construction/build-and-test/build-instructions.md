# Build Instructions

## Prerequisites

| | |
|---|---|
| **Runtime** | Node.js 20 or newer. Verified against **Node 26.8.1 / npm 11.19.0** |
| **Build tool** | Next.js 15.5.25 via npm scripts |
| **Dependencies** | 156 packages; `@supabase/ssr`, `@supabase/supabase-js`, `next`, `react`, `zod`, `tailwindcss`, `vitest` |
| **Environment** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` |
| **System** | Any OS Node supports. Build peaks well under 1 GB; no Docker required (TC-7 is local-only) |
| **External** | A Supabase cloud project (assumption A-3 - the user provisions it) |

## Build Steps

### 1. Install dependencies

```bash
npm install
```

Expect roughly `added 156 packages`. See Troubleshooting for the audit warnings.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set the two values from **Supabase → Project Settings → API Keys**:
the project URL, and the **publishable key** (starts `sb_publishable_`).

> **`.env.local`, not `.env.example`.** Next.js reads `.env.local`; `.env.example` is a committed
> template. Putting real values in the template both fails to configure the app and risks
> committing credentials.

No secret key is needed. Authorization runs as the signed-in user against RLS policies.

### 3. Apply the database schema

**This step cannot be automated with the publishable key** - creating tables, functions,
triggers and policies requires elevated access. The publishable key maps to the `anon` role,
which has no DDL rights.

**Easiest route, if you can supply a database password**:

```bash
# add SUPABASE_DB_URL to .env.local, then
npm run db:setup     # push + seed + verify
```

`scripts/db.mjs` applies each migration through `psql` with `ON_ERROR_STOP=1`, so it halts at
the first failure rather than leaving a silently half-applied schema. `npm run db:verify` then
checks every table, view, function, trigger, RLS flag, policy count and rule-carrying constraint.

**Without storing a database password**: open `complete-schema.sql` in this directory, paste the
whole file into the Supabase **SQL Editor**, and run it once. It concatenates all nine migrations
plus the seed data in order.

**Or apply them individually**, in this order:

| # | File | Creates |
|---|---|---|
| 1 | `supabase/migrations/0001_areas.sql` | `area_kind` enum, `areas` |
| 2 | `supabase/migrations/0002_profiles.sql` | `user_role` enum, `profiles`, `updated_at` trigger |
| 3 | `supabase/migrations/0003_rls_policies.sql` | RLS on `areas` and `profiles` |
| 4 | `supabase/migrations/0004_rides.sql` | `ride_status` enum, `rides`, indexes, 4 policies |
| 5 | `supabase/migrations/0005_public_profiles.sql` | `public_profiles` view + grant |
| 6 | `supabase/migrations/0006_ride_requests.sql` | `request_status` enum, `ride_requests`, partial unique index, 4 policies |
| 7 | `supabase/migrations/0007_accept_request_function.sql` | `accept_ride_request` - **the capacity guarantee** |
| 8 | `supabase/migrations/0008_cancel_ride_cascade_trigger.sql` | `rides_cancel_cascade` trigger |
| 9 | `supabase/migrations/0009_accepted_pair_profile_policy.sql` | Accepted-pair contact policy |
| 10 | `supabase/seed.sql` | 7 demo areas |

**Order matters.** Each file references objects the earlier ones create. Only `seed.sql` is
re-runnable; the rest error on a second run because the types and tables already exist.

**Employee accounts are not seeded** - a profile is keyed by `auth.users.id`, which plain SQL
cannot create. Register demo employees through the app's own screen; FR-3 creates their profile
automatically.

### 4. Type-check and build

```bash
npm run typecheck   # tsc --noEmit
npm run build
```

### 5. Verify build success

**Expected output:**

```
✓ Compiled successfully
✓ Generating static pages (11/11)
```

**Expected route table** - three static, five dynamic:

| Route | Rendering | Why |
|---|---|---|
| `/`, `/register`, `/sign-in` | Static | No per-request data |
| `/profile`, `/rides`, `/rides/new`, `/requests`, `/search` | **Dynamic** | All read cookies for the session |

If a route that should be dynamic prerenders as static, something has stopped reading the
session - which would break authorization. Treat it as a failure, not a warning.

**Artifacts**: `.next/` (gitignored). Nothing is published; TC-7 is local-only.

### 6. Run it

```bash
npm run dev      # http://localhost:3000
```

## Troubleshooting

### `Missing environment variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Cause**: no `.env.local`, or the values were put in `.env.example` by mistake.
- **Solution**: create `.env.local` as in step 2. The accessor also reads a legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a fallback if your project predates Supabase's key
  migration.

### `Could not find the table 'public.areas' in the schema cache`
- **Cause**: step 3 was skipped. The app builds fine without a schema, because every query
  happens at request time.
- **Solution**: apply the schema. This is the most likely first-run failure.

### `npm audit` reports vulnerabilities
- **Current state**: 2 remain, both reached through `next`'s own bundled `postcss`.
- **Assessment**: build-time only, processing this project's own CSS, on a local-only
  deployment. Clearing them requires Next 16, a major upgrade that changes the approved tech
  stack (TC-1).
- **Solution**: recorded as follow-up work, deliberately not applied.

### Build fails with TypeScript errors
- **Cause**: `next build` type-checks, so `npm run typecheck` fails the same way and faster.
- **Solution**: run `npm run typecheck` first; it names the file and line.
