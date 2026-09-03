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
