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
