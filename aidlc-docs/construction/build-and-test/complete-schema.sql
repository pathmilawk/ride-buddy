-- Ride Buddy - complete schema, all nine migrations plus seed data, in order.
-- Generated for one-paste application in the Supabase SQL Editor.
--
-- Run this ONCE on a fresh project. It is not idempotent: the CREATE TYPE and CREATE TABLE
-- statements will error on a second run. Only supabase/seed.sql at the end is re-runnable.
--
-- Source files, applied in this order:
--   supabase/migrations/0001_areas.sql
--   supabase/migrations/0002_profiles.sql
--   supabase/migrations/0003_rls_policies.sql
--   supabase/migrations/0004_rides.sql
--   supabase/migrations/0005_public_profiles.sql
--   supabase/migrations/0006_ride_requests.sql
--   supabase/migrations/0007_accept_request_function.sql
--   supabase/migrations/0008_cancel_ride_cascade_trigger.sql
--   supabase/migrations/0009_accepted_pair_profile_policy.sql
--   supabase/seed.sql


-- ============================================================================
-- supabase/migrations/0001_areas.sql
-- ============================================================================
-- Unit 1 Foundation - areas reference table
-- Requirements: FR-8, FR-9, FR-10
-- Rules: BR-1.12, BR-1.13, BR-1.14, BR-1.15
-- Design: functional-design/domain-entities.md (FQ2=A - one table with a kind field)

create type area_kind as enum ('residential', 'office');

create table areas (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  kind       area_kind   not null,
  created_at timestamptz not null default now()
);

-- BR-1.13: an office is an ordinary row distinguished only by `kind`. The field is a label
-- for grouping and seed identification; it restricts nothing. FR-9 requires offices to live
-- in this same table so a ride's origin and destination can both reference it, which is what
-- makes an Office -> Home ride (FR-11) work with no additional modelling.

-- BR-1.15: read-only at runtime. No application flow inserts, renames, or deletes an area;
-- rows come from supabase/seed.sql (TC-6). `name` is unique so the seed can upsert
-- idempotently by name rather than by a generated id (assumption A-6).

comment on table areas is
  'Seeded location reference data. Serves both ride origin and destination (FR-9).';
comment on column areas.kind is
  'Label only - grouping and seed identification. Grants and restricts nothing (BR-1.13).';


-- ============================================================================
-- supabase/migrations/0002_profiles.sql
-- ============================================================================
-- Unit 1 Foundation - employee profiles
-- Requirements: FR-3, FR-4, FR-5, FR-7
-- Rules: BR-1.4, BR-1.7, BR-1.9
-- Design: functional-design/domain-entities.md (FQ1=A - id is both PK and FK to auth.users)

create type user_role as enum ('driver', 'passenger', 'both');

create table profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  email         text        not null,
  display_name  text,
  phone         text,
  home_area_id  uuid        references areas (id) on delete restrict,
  role          user_role   not null default 'both',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- FQ1=A: `id` is simultaneously the primary key and a foreign key to auth.users.id, so a row
-- shares its UUID with the auth account. This is what lets every ownership policy reduce to
-- `auth.uid() = id` with no join (see 0003_rls_policies.sql).

-- The three nullable columns are deliberate. FR-3 creates a profile automatically on first
-- sign-in, before the employee has supplied anything, so display_name, phone and
-- home_area_id start null. Those same three columns are exactly what the completeness gate
-- (BR-1.9, FR-6) checks before allowing a ride to be offered or a seat requested.

-- `role` is deliberately NOT nullable and NOT gated. It defaults to 'both', which is truthful
-- for every user because FR-7 grants no permissions from it - so the default mislabels nobody.

-- `email` is mirrored from auth.users at creation and never edited by the user (US-02).
-- The duplication is intentional: Unit 2 lists driver names and Unit 3 releases contact
-- details, both reading `profiles`, and joining to the protected auth schema on every such
-- read is awkward and largely unavailable from the client. Residual risk: an email changed
-- directly in auth.users would leave this copy stale. Accepted for the POC - there is no
-- email-change feature.

-- home_area_id uses ON DELETE RESTRICT rather than CASCADE or SET NULL: deleting an area that
-- employees live in should fail loudly rather than silently null out their home area. Areas
-- are seeded and never deleted at runtime, so this is a safety net, not an operational path.

create index profiles_home_area_id_idx on profiles (home_area_id);

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

comment on table profiles is
  'One row per employee, keyed by the auth user id (FQ1=A).';
comment on column profiles.role is
  'Informational only. Read by nothing for authorization (FR-7).';


-- ============================================================================
-- supabase/migrations/0003_rls_policies.sql
-- ============================================================================
-- Unit 1 Foundation - row level security
-- Requirements: NFR-1 (database layer)
-- Rules: BR-1.8, BR-1.16
-- NFR-1 requires authorization in TWO independent layers. This file is the database layer;
-- the service layer is enforced separately in services/profile-service.ts (BR-1.17).
-- That duplication IS the defence in depth, not redundancy to be optimised away.

-- ---------------------------------------------------------------------------
-- areas: readable by any authenticated user, never written by the application
-- ---------------------------------------------------------------------------
alter table areas enable row level security;

create policy areas_select_authenticated
  on areas for select
  to authenticated
  using (true);

-- No insert, update or delete policy exists for `areas`. With RLS enabled and no policy,
-- those operations are refused for every non-service role. That is BR-1.15 enforced by
-- absence rather than by a check.

-- ---------------------------------------------------------------------------
-- profiles: owner-only in Unit 1
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select_own
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy profiles_insert_own
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy profiles_update_own
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No delete policy. NFR-9 records the POC privacy posture: no self-service deletion.
-- Removing the auth account cascades the profile away (0002_profiles.sql).

-- ---------------------------------------------------------------------------
-- NOTE FOR UNIT 2 - this is not the final state of profiles visibility
-- ---------------------------------------------------------------------------
-- BR-1.16 scopes Unit 1 to owner-only reads. But FR-19 requires a driver's NAME to be visible
-- to any employee browsing search results, and FR-30 requires phone and email to become
-- visible once an accepted request links two people.
--
-- Unit 2 must therefore ADD a policy (or a view) widening select on profiles, paired with the
-- C10 projection that strips contact fields. That change is ADDITIVE - a new migration adding
-- a new policy - and does not alter or drop anything in this file, which is what keeps the
-- migration sequence additive as unit-of-work-dependency.md requires.
--
-- Until Unit 2 lands, owner-only is correct and complete for Unit 1's own stories.


-- ============================================================================
-- supabase/migrations/0004_rides.sql
-- ============================================================================
-- Unit 2 Ride Offering and Discovery - rides
-- Requirements: FR-11 to FR-21, FR-34, FR-39, FR-41
-- Rules: BR-2.2 to BR-2.16, BR-2.31
-- Design: unit-2.../functional-design/domain-entities.md (FQ1=A one departs_at, FQ2=A derived seats)
--
-- ADDITIVE: creates new objects only. Nothing in 0001-0003 is altered or dropped, so Unit 1
-- remains independently correct.

create type ride_status as enum ('active', 'cancelled');

create table rides (
  id                   uuid        primary key default gen_random_uuid(),
  driver_id            uuid        not null references profiles (id) on delete cascade,
  origin_area_id       uuid        not null references areas (id) on delete restrict,
  destination_area_id  uuid        not null references areas (id) on delete restrict,
  departs_at           timestamptz not null,
  seats                integer     not null,
  note                 text,
  status               ride_status not null default 'active',
  created_at           timestamptz not null default now(),

  -- BR-2.2 / FQ3=A. Seat bounds exist so the capacity guarantee means something: a ride with
  -- 0 seats could never be joined, and one with 500 makes FR-31 vacuous.
  constraint rides_seats_range check (seats between 1 and 8),
  constraint rides_note_length check (note is null or char_length(note) <= 280)
);

-- FQ1=A: one timestamptz rather than separate date and time columns. "Has it departed?" is the
-- question asked on every search and every My Rides render (FR-17, FR-21), and this makes it a
-- single comparison. Date filtering becomes a half-open range, which stays indexable - a
-- `departs_at::date = $1` predicate would not.

-- BR-2.6 (FR-11): both directions are ordinary rides. A Home->Office ride and an
-- Office->Home ride differ only in which area id sits in which column. There is no
-- direction flag and no linkage between an outbound ride and its return.

-- BR-2.7 (FR-13): rides are one-off. `departs_at` is a single instant and there is no
-- recurrence structure anywhere in this schema - no rrule, no parent ride, no instance
-- table. Recurrence was the largest scope risk avoided (Q7=A).

-- `note` (FR-14, BR-2.2): the driver's optional free-text detail - a meeting point, or a
-- warning about luggage space. The cheapest realism in the build, per FQ described in
-- Unit 2's design.

-- BR-2.4 / FQ4=B: origin and destination MAY be the same area. There is deliberately no check
-- constraint forbidding it. The product owner chose this against the recommendation; its
-- absence is a decision, not an oversight.

-- FQ2=A: there is deliberately NO seats_remaining column. Seats remaining is derived as
-- `seats` minus the count of accepted requests, so Unit 3's capacity guarantee and the number
-- shown to users come from the same count of the same rows and cannot disagree.

-- No updated_at column and no update path beyond the single status transition. FR-15 forbids
-- editing a published ride; the absence of the operation is the enforcement.

-- Covers the FR-18 search predicate: day range on departs_at plus both area equalities.
create index rides_search_idx
  on rides (departs_at, origin_area_id, destination_area_id)
  where status = 'active';

-- Covers My Rides (FR-39).
create index rides_driver_idx on rides (driver_id, departs_at);

-- ---------------------------------------------------------------------------
-- Row level security - BR-2.31, NFR-1 database layer
-- ---------------------------------------------------------------------------
alter table rides enable row level security;

-- Multiple SELECT policies are OR'd, so these two together mean: everyone sees active rides,
-- and a driver additionally sees their own cancelled ones.
create policy rides_select_active
  on rides for select
  to authenticated
  using (status = 'active');

create policy rides_select_own
  on rides for select
  to authenticated
  using (driver_id = auth.uid());

-- BR-2.5: driver_id must be the caller. This is what makes ride ownership unforgeable -
-- there is no form field an attacker could set to claim someone else's ride.
create policy rides_insert_own
  on rides for insert
  to authenticated
  with check (driver_id = auth.uid());

-- BR-2.9: a driver may only touch their own ride. In practice the service only ever writes
-- `status`; this policy is the independent second layer NFR-1 asks for.
create policy rides_update_own
  on rides for update
  to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- No delete policy. Rides are cancelled, never deleted (BR-2.15) - retention is what lets
-- Unit 3 derive EXPIRED for requests against departed rides (FR-37).

comment on table rides is
  'One trip a driver offers. Seats remaining is derived, never stored (FQ2=A).';
comment on column rides.departs_at is
  'Date and departure time as one instant (FQ1=A). PAST is derived from this at query time.';


-- ============================================================================
-- supabase/migrations/0005_public_profiles.sql
-- ============================================================================
-- Unit 2 Ride Offering and Discovery - public profile read model
-- Requirements: FR-19, FR-20, NFR-1, NFR-2
-- Rules: BR-2.24, BR-2.25, BR-2.26
-- Design: unit-2.../functional-design/domain-entities.md (FQ5=B)
--
-- ADDITIVE: a new view over profiles. Unit 1's owner-only policies in 0003_rls_policies.sql
-- are NOT altered. The base table remains unreadable to anyone but its owner.

-- ---------------------------------------------------------------------------
-- The problem this solves
-- ---------------------------------------------------------------------------
-- Unit 1 left `profiles` readable by its owner only (BR-1.16). But FR-19 requires a driver's
-- NAME to be visible to any employee browsing search results.
--
-- The obvious fix - widen the base table's select policy - would expose `phone` and `email`
-- to every authenticated user, leaving the contact rule (FR-20, NFR-2) resting entirely on
-- application code remembering to strip them. One forgotten query would leak every phone
-- number, and `requirements.md` Section 9.1 records that anyone can register.
--
-- Instead: a view that carries only the non-sensitive columns. A view without a `phone` column
-- cannot disclose a phone number, whatever any query, service or component does. That is FR-20
-- enforced by the shape of the data rather than by developer discipline.

create view public_profiles as
  select
    id,
    display_name,
    home_area_id,
    role          -- informational only, grants nothing (FR-7)
  from profiles;

-- ---------------------------------------------------------------------------
-- On security_invoker - deliberately left at its default of FALSE
-- ---------------------------------------------------------------------------
-- PostgreSQL executes a view with `security_invoker = false` (the default) using the VIEW
-- OWNER's privileges, so RLS policies on `profiles` are checked against the owner rather than
-- the querying user. That is exactly what is wanted here: the view reads past Unit 1's
-- owner-only policy and returns every employee's public columns.
--
-- Setting `security_invoker = true` would execute the view as the CALLER, so BR-1.16 would
-- apply and the view would return only the caller's own row - breaking FR-19 entirely.
--
-- A view that bypasses RLS is a footgun when it exposes sensitive columns. It is safe here
-- precisely because of the column list above: `phone` and `email` are not in it, and cannot
-- be selected through this view at all.

grant select on public_profiles to authenticated;

-- No insert, update or delete grant. Profile writes go through the base table, owner only
-- (BR-1.8, unchanged from Unit 1).

comment on view public_profiles is
  'Non-sensitive profile columns, readable by any authenticated employee (FR-19). Deliberately carries no phone or email, so FR-20 is enforced by the view shape rather than by application code.';

-- ---------------------------------------------------------------------------
-- NOTE FOR UNIT 3 - this view deliberately CANNOT serve FR-30
-- ---------------------------------------------------------------------------
-- FR-30 requires phone and email to become visible to BOTH parties once a request reaches
-- ACCEPTED. This view can never do that: the columns are absent by design, and a view cannot
-- vary its column list per row.
--
-- Unit 3 must therefore add its own path for accepted pairs - most naturally an RLS policy on
-- the `profiles` base table of the form:
--
--   using (
--     auth.uid() = id
--     or exists (
--       select 1 from ride_requests r
--       join rides d on d.id = r.ride_id
--       where r.status = 'accepted'
--         and (   (r.passenger_id = auth.uid() and d.driver_id = id)
--              or (d.driver_id     = auth.uid() and r.passenger_id = id))
--     )
--   )
--
-- That policy cannot be written here because `ride_requests` does not exist until Unit 3.
--
-- Recorded so the gap reads as a planned handover rather than an omission: FQ5=B solves
-- Unit 2's disclosure need completely and Unit 3's not at all, by design.


-- ============================================================================
-- supabase/migrations/0006_ride_requests.sql
-- ============================================================================
-- Unit 3 Requests and Matching - ride_requests
-- Requirements: FR-22 to FR-30, FR-34 to FR-38, FR-40, FR-41
-- Rules: BR-3.1 to BR-3.7, BR-3.17, BR-3.32
-- Design: unit-3.../functional-design/domain-entities.md (FQ1=A five stored statuses)
--
-- ADDITIVE: new objects only. Nothing in 0001-0005 is altered or dropped.

-- FQ1=A: FIVE stored statuses. There is deliberately no 'expired' value.
--
-- FR-36 (Q33=A) forbids expiring a request early, and TC-7's local-only deployment gives a
-- scheduler nowhere to run. So EXPIRED is not an event anything performs - it is a CONSEQUENCE
-- of the ride departing while the request was still pending, derived at read time in
-- lib/request-transitions.ts. Storing it would require someone to write it, and the only
-- honest moment would be when someone happened to look, making a request's state depend on
-- whether it was observed.
create type request_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'cancelled');

create table ride_requests (
  id            uuid           primary key default gen_random_uuid(),
  ride_id       uuid           not null references rides (id) on delete cascade,
  passenger_id  uuid           not null references profiles (id) on delete cascade,
  status        request_status not null default 'pending',
  created_at    timestamptz    not null default now(),
  -- Null while pending, and null forever for a derived-EXPIRED request: nobody decided anything.
  decided_at    timestamptz
);

-- What this table deliberately LACKS, each an enforcement or a recorded decision:
--
--   * no seats/quantity column - BR-3.2 / FR-22 fixes every request at exactly one seat, which is what
--     makes the capacity guarantee a row count against an integer rather than a sum. Do not add
--     one without revisiting 0007_accept_request_function.sql.
--   * no note or message column - BR-3.3 / FR-23 (Q28=A). Requests carry no text.
--   * no rejection_reason column - BR-3.3, same rule.
--   * no 'expired' status - see above.

-- BR-3.7 / FR-26 / A-1: at most ONE ACTIVE request per passenger per ride.
--
-- A partial unique index rather than an application check, because a check would leave the same
-- read-then-write window FR-33 rejects elsewhere - and a duplicate would corrupt the seat
-- arithmetic the capacity guarantee depends on.
--
-- Restricted to the two ACTIVE statuses on purpose. US-17's third criterion requires that a
-- passenger who withdrew by mistake, or was rejected before a seat freed up, can ask again.
--
-- Note the scope: per RIDE, not per date. BR-3.5 / FR-25 permits pending requests on several
-- different rides at once, including on the same day (Q11=A) - story US-16.
create unique index ride_requests_one_active_per_ride
  on ride_requests (ride_id, passenger_id)
  where status in ('pending', 'accepted');

-- Serves the driver's per-ride list and the accepted count the guarantee reads.
create index ride_requests_ride_status_idx on ride_requests (ride_id, status);

-- Serves My Requests (FR-40).
create index ride_requests_passenger_idx on ride_requests (passenger_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security - BR-3.32, NFR-1 database layer
-- ---------------------------------------------------------------------------
alter table ride_requests enable row level security;

-- A request is visible to the passenger who made it and to the driver of its ride - nobody else.
create policy ride_requests_select_involved
  on ride_requests for select
  to authenticated
  using (
    passenger_id = auth.uid()
    or exists (
      select 1 from rides d
      where d.id = ride_requests.ride_id and d.driver_id = auth.uid()
    )
  );

-- BR-3.1: the passenger is the caller, never a form value. Ownership is unforgeable.
-- Note this policy does NOT enforce the self-request refusal (BR-3.4) or the seat check - those
-- are service preconditions. It enforces only that you cannot request on someone else's behalf.
create policy ride_requests_insert_own
  on ride_requests for insert
  to authenticated
  with check (passenger_id = auth.uid());

-- BR-3.12: the passenger may update their own request (withdraw).
create policy ride_requests_update_own
  on ride_requests for update
  to authenticated
  using (passenger_id = auth.uid())
  with check (passenger_id = auth.uid());

-- BR-3.13: the ride's driver may update requests on their ride (accept, reject).
--
-- This policy is also what lets the SECURITY INVOKER capacity function in 0007 do its work as
-- the driver - and it is why a non-driver calling that function fails safely rather than
-- accepting someone else's passenger.
create policy ride_requests_update_as_driver
  on ride_requests for update
  to authenticated
  using (
    exists (
      select 1 from rides d
      where d.id = ride_requests.ride_id and d.driver_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from rides d
      where d.id = ride_requests.ride_id and d.driver_id = auth.uid()
    )
  );

-- No delete policy. Requests reach a terminal status and are retained - deletion happens only
-- via the cascading foreign keys when a ride or profile row is genuinely removed, which no
-- application flow does.

comment on table ride_requests is
  'One seat request. Exactly one seat each (FR-22). EXPIRED is derived, never stored (FQ1=A).';


-- ============================================================================
-- supabase/migrations/0007_accept_request_function.sql
-- ============================================================================
-- Unit 3 - THE CAPACITY GUARANTEE
-- Requirements: FR-31, FR-32, FR-33 · Story: US-22
-- Rules: BR-3.8, BR-3.9, BR-3.10, BR-3.11
-- Design: unit-3.../functional-design/domain-entities.md (FQ2=A row-locking function)
--
-- This is the only correctness-critical requirement in the system: the only place where a
-- plausible race condition produces a silently wrong result - two passengers each believing
-- they hold the last seat.

-- ---------------------------------------------------------------------------
-- Why a function that locks, rather than the two obvious alternatives
-- ---------------------------------------------------------------------------
-- REJECTED 1: check the count in the service, then update.
--   The read-then-write window FR-33 explicitly rejects. Two callers both pass the check and
--   both write.
--
-- REJECTED 2: a single `update ... where (select count(*) ...) < seats`.
--   This is the plausible mistake, because it reads as one statement and one statement FEELS
--   atomic. It is not. Under READ COMMITTED, two updates touching DIFFERENT request rows do not
--   conflict, so both evaluate the subquery against the pre-commit state, both find room, and
--   both commit. The ride is overbooked.
--
-- CHOSEN: lock the ride row first. A second concurrent acceptance blocks at that lock until the
--   first commits, then counts the NEW total and correctly finds no room. The lock on the RIDE
--   (not the request) is what serialises acceptances that touch different request rows.

-- SECURITY INVOKER (the default, stated explicitly for the reader): the caller's RLS policies
-- apply inside this function, so it cannot be used to bypass ride ownership. A non-driver's
-- `for update` on the ride finds no row - PostgreSQL requires both SELECT and UPDATE policies
-- to pass for a row lock - and the function returns NOT_FOUND. Ownership is also checked in the
-- service (BR-3.33); this is the independent second layer.
--
-- A SECURITY DEFINER function would have needed its own ownership check, giving that rule two
-- homes - exactly what this design avoids everywhere else.

create or replace function accept_ride_request(p_request_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ride_id  uuid;
  v_status   request_status;
  v_seats    integer;
  v_accepted integer;
begin
  select r.ride_id, r.status
    into v_ride_id, v_status
    from ride_requests r
   where r.id = p_request_id;

  if v_ride_id is null then
    return 'NOT_FOUND';
  end if;

  -- BR-3.14: only a pending request may be accepted.
  if v_status <> 'pending' then
    return 'INVALID_STATE';
  end if;

  -- THE LOCK. Everything above is a read-then-act check, tolerable for facts that do not change
  -- (a ride's driver) but not for the seat count, which every other acceptance mutates.
  select d.seats
    into v_seats
    from rides d
   where d.id = v_ride_id
     for update;

  -- Null here means either the ride vanished or the caller is not its driver, since a row lock
  -- requires the UPDATE policy to pass. Both are correctly reported as not found.
  if v_seats is null then
    return 'NOT_FOUND';
  end if;

  select count(*)
    into v_accepted
    from ride_requests
   where ride_id = v_ride_id
     and status = 'accepted';

  -- FR-31. Because FR-22 fixes each request at one seat, this is a row count against an
  -- integer - not a sum over quantities.
  if v_accepted >= v_seats then
    return 'RIDE_FULL';
  end if;

  update ride_requests
     set status = 'accepted',
         decided_at = now()
   where id = p_request_id
     and status = 'pending';

  if not found then
    return 'INVALID_STATE';
  end if;

  return 'OK';
end;
$$;

grant execute on function accept_ride_request(uuid) to authenticated;

comment on function accept_ride_request(uuid) is
  'BR-3.11: the ONLY path that sets a request to accepted. Locks the ride row so concurrent acceptances serialise (FR-31 to FR-33).';


-- ============================================================================
-- supabase/migrations/0008_cancel_ride_cascade_trigger.sql
-- ============================================================================
-- Unit 3 - the cancellation cascade
-- Requirement: FR-38 · Story: US-24
-- Rules: BR-3.20, BR-3.21, BR-3.22
-- Design: unit-3.../functional-design/domain-entities.md (FQ4=A trigger)
--
-- ADDITIVE: attaches a trigger to Unit 2's `rides` table. Its columns, constraints and policies
-- are untouched.

-- ---------------------------------------------------------------------------
-- Why a trigger rather than a service call
-- ---------------------------------------------------------------------------
-- FR-38 exists to prevent a passenger believing they hold a seat on a cancelled ride - and that
-- failure is exactly the kind a forgotten call site produces. A trigger cannot be forgotten: any
-- code path that cancels a ride, now or later, cascades.
--
-- It also makes the two writes atomic for free. `application-design/services.md` named "cancel a
-- ride" as a required transaction boundary; the trigger runs inside the same statement's
-- transaction, so a ride cannot be cancelled with its requests left active.
--
-- THE COST, stated plainly: a trigger is invisible at the call site. Someone reading
-- `cancelRide` in services/ride-service.ts sees one status update and no cascade. That is why
-- BR-3.21 makes the comment there MANDATORY rather than optional - it names this trigger.
--
-- CONSEQUENCE: `C9.cancelRequestsForRide`, which application-design/component-methods.md listed
-- as a service method, is deliberately NOT implemented (BR-3.22). Calling it as well would
-- double-cancel - harmlessly, but confusingly.

-- SECURITY DEFINER, and here is the justification, because elevated rights deserve scrutiny:
--
-- The cascade must set a PASSENGER's request to cancelled when the DRIVER cancels the ride. No
-- policy grants a driver update rights over a passenger's own request row, and adding one would
-- be far broader than this needs - it would let a driver alter a passenger's request at any
-- time, for any reason.
--
-- A definer trigger scoped to one statement on one ride is the narrower choice. It cannot be
-- invoked directly; it fires only on the ride's status transition, which `rides_update_own`
-- already restricts to the ride's own driver.
--
-- `set search_path` is pinned, as it must be on any definer function, so the body cannot be
-- redirected by a caller's search_path.
create or replace function cascade_cancel_ride_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- BR-3.20: every NON-TERMINAL request. Terminal ones are left alone - a request already
  -- rejected or withdrawn was not affected by the cancellation and rewriting its history would
  -- be a lie.
  update ride_requests
     set status = 'cancelled',
         decided_at = now()
   where ride_id = new.id
     and status in ('pending', 'accepted');

  return null;  -- AFTER trigger; the return value is ignored.
end;
$$;

-- Fires once, only on the transition INTO cancelled, and never on an unrelated update.
-- `is distinct from` rather than `<>` so a null old status would still be handled correctly.
create trigger rides_cancel_cascade
  after update on rides
  for each row
  when (old.status is distinct from 'cancelled' and new.status = 'cancelled')
  execute function cascade_cancel_ride_requests();

comment on function cascade_cancel_ride_requests() is
  'FR-38: cascades a ride cancellation to every non-terminal request. Unbypassable by design (BR-3.21).';


-- ============================================================================
-- supabase/migrations/0009_accepted_pair_profile_policy.sql
-- ============================================================================
-- Unit 3 - contact disclosure for accepted pairs
-- Requirement: FR-30 · Stories: US-21, US-27
-- Rules: BR-3.23, BR-3.24, BR-3.25
-- Design: unit-3.../functional-design/domain-entities.md (FQ3=A RLS policy)
--
-- ADDITIVE: adds a policy to Unit 1's `profiles` table. `profiles_select_own` from
-- 0003_rls_policies.sql is NOT altered or dropped - multiple SELECT policies are OR'd, so this
-- one only ever widens access, never narrows it.
--
-- 0003 and 0005 both recorded that a later unit would need to do exactly this. This is that.

-- ---------------------------------------------------------------------------
-- Why the public view could not serve FR-30
-- ---------------------------------------------------------------------------
-- Unit 2's `public_profiles` view carries no phone or email column, which is what makes FR-20
-- unbreakable. But a view cannot vary its column list per row, so it can never release contact
-- details to one viewer and withhold them from another.
--
-- FR-30 needs exactly that: phone and email visible to BOTH parties of an accepted request, and
-- to nobody else. So it belongs in a row-level policy on the base table, where the condition can
-- depend on the relationship between the caller and the row.

-- ---------------------------------------------------------------------------
-- BR-3.25: disclosure is a CONSEQUENCE OF STATE, never a write
-- ---------------------------------------------------------------------------
-- Acceptance copies no contact data anywhere. It changes a status, and this policy then permits
-- a row it previously refused. That is why a rejected, withdrawn or cancelled request closes the
-- window again automatically - it stops satisfying the condition below. Nothing has to un-share
-- anything.
create policy profiles_select_accepted_counterparty
  on profiles for select
  to authenticated
  using (
    exists (
      select 1
        from ride_requests req
        join rides d on d.id = req.ride_id
       where req.status = 'accepted'
         and (
           -- I am the passenger; this row is my driver.
           (req.passenger_id = auth.uid() and d.driver_id = profiles.id)
           -- I am the driver; this row is my accepted passenger.
           or (d.driver_id = auth.uid() and req.passenger_id = profiles.id)
         )
    )
  );

-- Both directions are needed. FR-30 releases details to BOTH parties, not just the passenger.

-- No recursion risk: this policy reads `ride_requests` and `rides`; their policies reference
-- only `auth.uid()` and `rides.driver_id`, and neither reads `profiles`. The chain terminates.

-- Still NOT permitted by this policy, deliberately:
--   * a pending request - a driver reviewing requests sees name and pickup area only (FR-27,
--     BR-3.26), which is why the driver's list reads the public view, not this table
--   * a rejected, withdrawn, expired or cancelled request
--   * any employee with no accepted request linking you
--
-- And unchanged: no insert, update or delete widening. Profile writes stay owner-only (BR-1.8).

comment on policy profiles_select_accepted_counterparty on profiles is
  'FR-30: releases contact columns to both parties of an ACCEPTED request. Disclosure follows state; nothing is copied (BR-3.25).';


-- ============================================================================
-- supabase/seed.sql
-- ============================================================================
-- Ride Buddy - demo seed data
-- Requirement: TC-6 (seed script is a requirement, not a convenience - Q21=A rules out any
-- admin interface, so this is the only route to demo content)
-- Assumption: A-6 (a small set of residential areas plus at least one office)
-- Rules: BR-1.13, BR-1.15
--
-- Idempotent: upserts by the unique `name` column, so re-running is safe (A-6).

insert into areas (name, kind) values
  ('Sandnes Centre',      'residential'),
  ('Stavanger East',      'residential'),
  ('Stavanger West',      'residential'),
  ('Hillevag',            'residential'),
  ('Forus',               'residential'),
  ('Randaberg',           'residential'),
  ('Solwr Head Office',   'office')
on conflict (name) do update
  set kind = excluded.kind;

-- Employee profiles are NOT seeded here.
--
-- A profile row is keyed by auth.users.id (FQ1=A), so seeding profiles would require first
-- creating auth accounts, which cannot be done from plain SQL against the protected auth
-- schema. Register demo employees through the application's own registration screen instead -
-- FR-3 creates their profile automatically on first sign-in, and the completeness gate then
-- walks them through filling it in.
--
-- Recorded here so the absence reads as a constraint of Supabase Auth rather than an
-- oversight in the seed script.

