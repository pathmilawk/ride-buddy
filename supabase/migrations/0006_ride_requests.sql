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
