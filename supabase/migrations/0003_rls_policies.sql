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
