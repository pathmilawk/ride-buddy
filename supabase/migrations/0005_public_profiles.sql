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
