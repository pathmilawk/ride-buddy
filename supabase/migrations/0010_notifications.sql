-- Notifications - in-app bell, badge and list, plus OS-level browser toasts
--
-- AMENDS a recorded decision. FR-42 / Q15=A chose "in-app status only, no notifications", and
-- requirements.md section 9.2 logged silent cancellation as an accepted consequence. The product
-- owner has since asked for notifications, choosing what was Q15=B ("in-app notification/badge
-- list") plus OS toasts. See the amendment to FR-42 in requirements.md.
--
-- ADDITIVE: new objects plus two triggers attached to ride_requests. Nothing in 0001-0009 is
-- altered or dropped.

create type notification_kind as enum (
  'request_received',   -- to the DRIVER: someone asked for a seat
  'request_accepted',   -- to the PASSENGER: you have a seat
  'request_declined',   -- to the PASSENGER: the driver said no
  'ride_cancelled'      -- to the PASSENGER: the ride is off
);

create table notifications (
  id          uuid              primary key default gen_random_uuid(),
  -- The RECIPIENT. Not the actor - a notification belongs to the person being told.
  user_id     uuid              not null references profiles (id) on delete cascade,
  kind        notification_kind not null,
  ride_id     uuid              not null references rides (id) on delete cascade,
  request_id  uuid              references ride_requests (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz       not null default now()
);

-- Deliberately NOT stored: the message text.
--
-- Only `kind` plus the two ids are persisted, and the wording is built in a pure function
-- (lib/notification-text.ts). That keeps the copy editable without a data migration, and keeps
-- it unit-testable. The trade is one join to render a list, which at NFR-4's scale is free.

-- Unread badge and the dropdown list both read this.
create index notifications_user_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

create index notifications_user_recent_idx on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security - NFR-1 database layer
-- ---------------------------------------------------------------------------
alter table notifications enable row level security;

create policy notifications_select_own
  on notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Marking read is the only write a user may make, and only on their own rows.
create policy notifications_update_own
  on notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- NO insert policy for users, deliberately. Notifications are created only by the triggers
-- below, so nobody can fabricate one for someone else - the same reasoning that keeps
-- `driver_id` off the ride form.

-- ---------------------------------------------------------------------------
-- Triggers - a notification cannot be missed by a code path
-- ---------------------------------------------------------------------------
-- Consistent with how this design already handles the capacity guarantee and the cancellation
-- cascade: put the rule where application code cannot forget it. A notification fires on the
-- state change itself, so a future route that accepts a request some other way still notifies.
--
-- SECURITY DEFINER is required: the actor is never the recipient. A passenger creating a request
-- has no rights to insert a row owned by the driver, and granting them any would be far broader
-- than this needs. `search_path` is pinned, as it must be on any definer function.

create or replace function notify_request_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver uuid;
begin
  select d.driver_id into v_driver from rides d where d.id = new.ride_id;
  if v_driver is null or v_driver = new.passenger_id then
    return null;   -- no driver, or a self-request the service would have refused anyway
  end if;

  insert into notifications (user_id, kind, ride_id, request_id)
  values (v_driver, 'request_received', new.ride_id, new.id);

  return null;
end;
$$;

create trigger ride_requests_notify_created
  after insert on ride_requests
  for each row
  when (new.status = 'pending')
  execute function notify_request_created();

create or replace function notify_request_decided()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind notification_kind;
begin
  v_kind := case new.status
              when 'accepted'  then 'request_accepted'
              when 'rejected'  then 'request_declined'
              when 'cancelled' then 'ride_cancelled'
            end::notification_kind;

  -- `withdrawn` deliberately notifies nobody. The passenger performed it themselves, and
  -- telling the driver was the "everything including withdrawals" option the product owner
  -- did not choose.
  if v_kind is null then
    return null;
  end if;

  insert into notifications (user_id, kind, ride_id, request_id)
  values (new.passenger_id, v_kind, new.ride_id, new.id);

  return null;
end;
$$;

create trigger ride_requests_notify_decided
  after update of status on ride_requests
  for each row
  when (old.status is distinct from new.status)
  execute function notify_request_decided();

-- Note how this composes with 0008: cancelling a ride fires `rides_cancel_cascade`, which
-- updates every non-terminal request to 'cancelled', which fires THIS trigger once per
-- request. So every affected passenger is told, and no separate ride-level notification is
-- needed. That closes the gap requirements.md section 9.2 recorded.

-- ---------------------------------------------------------------------------
-- Realtime - so the badge updates without polling
-- ---------------------------------------------------------------------------
-- The browser subscribes to inserts on this table filtered to its own user_id. RLS still
-- applies to Realtime, so a subscriber can only ever receive their own rows.
alter publication supabase_realtime add table notifications;

comment on table notifications is
  'In-app notifications. Created only by triggers on ride_requests, so no code path can forget to notify (amends FR-42).';
