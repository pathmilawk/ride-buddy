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
