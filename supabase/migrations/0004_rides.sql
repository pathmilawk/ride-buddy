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
