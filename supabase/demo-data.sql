-- Ride Buddy - demo data for walking the app end to end
--
-- Separate from seed.sql on purpose. seed.sql holds REFERENCE data the application needs to
-- function at all (the areas list). This file holds optional FIXTURES for demonstrating, and
-- deleting it costs nothing.
--
-- Idempotent: every row it creates has a fixed UUID, and it deletes exactly those ids before
-- reinserting. It will never touch a real account you registered through the app.
--
-- Requires direct database access - `npm run db:demo`. It writes to auth.users, which the
-- publishable key cannot do.
--
-- EVERY DEMO ACCOUNT USES THE PASSWORD:  RideBuddy123!
--
-- TIMEZONE: departure times are anchored to CLOCK TIMES in :demo_tz, so a "07:30 commute" really
-- renders as 07:30 in the browser rather than drifting with whenever this script happened to run.
-- `npm run db:demo` passes your machine's timezone automatically. Running it through psql
-- directly? Pass one:  psql ... -v demo_tz=Europe/Oslo -f supabase/demo-data.sql
--
-- What it sets up, deliberately covering every state the UI can show:
--   * 6 employees, one with a DELIBERATELY INCOMPLETE profile (no phone) to demo the FR-6 gate
--   * 7 rides: both directions, one full, one already departed, one cancelled
--   * requests in ALL SIX statuses - pending, accepted, rejected, withdrawn, cancelled, and one
--     that renders as derived EXPIRED

begin;

-- ---------------------------------------------------------------------------
-- Clean up exactly what this file creates, and nothing else
-- ---------------------------------------------------------------------------
delete from ride_requests where ride_id in (
  select id from rides where id::text like '11111111-%'
);
delete from rides where id::text like '11111111-%';
delete from profiles where id::text like '99999999-%';
delete from auth.identities where user_id::text like '99999999-%';
delete from auth.users where id::text like '99999999-%';

-- ---------------------------------------------------------------------------
-- Employees - real bcrypt passwords, so you can actually sign in as them
-- ---------------------------------------------------------------------------
--
-- NOTE ON THE EMPTY STRINGS BELOW - they are required, not tidiness.
-- GoTrue (Supabase Auth) scans these token columns into non-nullable Go strings. If they are
-- left NULL, every sign-in fails with "Database error querying schema" - and the error names
-- the schema, not the column, so it is genuinely hard to diagnose. The columns have no default,
-- so a manual insert must set them explicitly.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  d.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  d.email,
  crypt('RideBuddy123!', gen_salt('bf')),
  now(),                                   -- pre-confirmed, so sign-in works immediately
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now() - interval '30 days',
  now(),
  '', '', '', ''                           -- see the note above
from (values
  ('99999999-0000-4000-8000-000000000001'::uuid, 'ada@solwr.com'),
  ('99999999-0000-4000-8000-000000000002'::uuid, 'grace@solwr.com'),
  ('99999999-0000-4000-8000-000000000003'::uuid, 'alan@solwr.com'),
  ('99999999-0000-4000-8000-000000000004'::uuid, 'katherine@solwr.com'),
  ('99999999-0000-4000-8000-000000000005'::uuid, 'linus@solwr.com'),
  ('99999999-0000-4000-8000-000000000006'::uuid, 'noor@solwr.com')
) as d(id, email);

-- GoTrue needs an identity row alongside the user for email/password sign-in.
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.id::text like '99999999-%';

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
insert into profiles (id, email, display_name, phone, home_area_id, role)
select p.id, u.email, p.name, p.phone,
       (select id from areas where name = p.area),
       p.role::user_role
from (values
  ('99999999-0000-4000-8000-000000000001'::uuid, 'Ada Lovelace',      '+47 900 11 001', 'Sandnes Centre',  'driver'),
  ('99999999-0000-4000-8000-000000000002'::uuid, 'Grace Hopper',      '+47 900 11 002', 'Stavanger East',  'both'),
  ('99999999-0000-4000-8000-000000000003'::uuid, 'Alan Turing',       '+47 900 11 003', 'Hillevag',        'passenger'),
  ('99999999-0000-4000-8000-000000000004'::uuid, 'Katherine Johnson', '+47 900 11 004', 'Forus',           'both'),
  ('99999999-0000-4000-8000-000000000005'::uuid, 'Linus Berg',        '+47 900 11 005', 'Randaberg',       'driver')
) as p(id, name, phone, area, role)
join auth.users u on u.id = p.id;

-- Noor has NO phone and NO home area, deliberately. Sign in as noor@solwr.com and try to offer
-- or request a ride to demonstrate the completeness gate (FR-6, US-04) refusing and redirecting.
insert into profiles (id, email, display_name, phone, home_area_id, role)
select '99999999-0000-4000-8000-000000000006'::uuid, u.email, 'Noor Hansen', null, null, 'passenger'
from auth.users u where u.id = '99999999-0000-4000-8000-000000000006'::uuid;

-- ---------------------------------------------------------------------------
-- Rides
-- ---------------------------------------------------------------------------
insert into rides (id, driver_id, origin_area_id, destination_area_id, departs_at, seats, note)
select r.id, r.driver,
       (select id from areas where name = r.origin),
       (select id from areas where name = r.dest),
       r.departs, r.seats, r.note
from (values
  -- R1: the main demo ride. Roomy, has a mix of requests.
  ('11111111-0000-4000-8000-000000000001'::uuid, '99999999-0000-4000-8000-000000000001'::uuid,
   'Sandnes Centre', 'Solwr Head Office', ((current_date + 1)::timestamp + time '07:30') at time zone :'demo_tz', 3,
   'Leaving from the north gate. Room for a normal bag each.'),
  -- R2: ONE seat, and it gets taken -> demonstrates the Full marker
  ('11111111-0000-4000-8000-000000000002'::uuid, '99999999-0000-4000-8000-000000000005'::uuid,
   'Randaberg', 'Solwr Head Office', ((current_date + 1)::timestamp + time '08:00') at time zone :'demo_tz', 1,
   'Only one spare seat today.'),
  -- R3: RETURN leg -> demonstrates both directions (FR-11)
  ('11111111-0000-4000-8000-000000000003'::uuid, '99999999-0000-4000-8000-000000000001'::uuid,
   'Solwr Head Office', 'Sandnes Centre', ((current_date + 1)::timestamp + time '16:30') at time zone :'demo_tz', 2,
   'Heading home just after four.'),
  -- R4: has a rejected request
  ('11111111-0000-4000-8000-000000000004'::uuid, '99999999-0000-4000-8000-000000000002'::uuid,
   'Stavanger East', 'Solwr Head Office', ((current_date + 2)::timestamp + time '07:45') at time zone :'demo_tz', 4, null),
  -- R5: has a withdrawn request
  ('11111111-0000-4000-8000-000000000005'::uuid, '99999999-0000-4000-8000-000000000004'::uuid,
   'Forus', 'Solwr Head Office', ((current_date + 3)::timestamp + time '08:15') at time zone :'demo_tz', 2,
   'Happy to detour slightly.'),
  -- R6: ALREADY DEPARTED -> excluded from search, and its pending request renders as EXPIRED
  ('11111111-0000-4000-8000-000000000006'::uuid, '99999999-0000-4000-8000-000000000005'::uuid,
   'Randaberg', 'Solwr Head Office', ((current_date - 1)::timestamp + time '07:00') at time zone :'demo_tz', 2, 'Yesterday''s run.'),
  -- R7: will be CANCELLED below, so the trigger cascades its request
  ('11111111-0000-4000-8000-000000000007'::uuid, '99999999-0000-4000-8000-000000000001'::uuid,
   'Sandnes Centre', 'Solwr Head Office', ((current_date + 4)::timestamp + time '07:00') at time zone :'demo_tz', 2,
   'Cancelled - car is in for a service.'),
  -- R8: departs LATER TODAY from Hillevag, with seats free and no requests.
  --
  -- This exists for the demo's sake. The search screen prefills origin from the signed-in
  -- employee's home area and the date to TODAY (BR-2.18), so without a ride matching those
  -- defaults the very first screen a viewer sees is an empty result set - which reads as a
  -- broken page rather than as correct behaviour. Alan Turing lives in Hillevag, so signing in
  -- as him now lands on a searchable ride with an actionable "Ask for a seat" button.
  --
  -- Kept relative to now() (unlike the others) so it is always still upcoming today. Caveat:
  -- load the demo within two hours of local midnight and it rolls into tomorrow, leaving the
  -- default search empty - just re-run `npm run db:demo` in the morning.
  ('11111111-0000-4000-8000-000000000008'::uuid, '99999999-0000-4000-8000-000000000004'::uuid,
   'Hillevag', 'Solwr Head Office', date_trunc('hour', now()) + interval '2 hours', 3,
   'Picking up on the way in - message me and I will confirm the corner.')
) as r(id, driver, origin, dest, departs, seats, note);

-- ---------------------------------------------------------------------------
-- Requests - covering every status the UI can render
-- ---------------------------------------------------------------------------
insert into ride_requests (id, ride_id, passenger_id, status, created_at, decided_at)
values
  -- R1: one accepted (so contact details are exchanged), one still waiting
  ('22222222-0000-4000-8000-000000000001'::uuid,'11111111-0000-4000-8000-000000000001'::uuid,
   '99999999-0000-4000-8000-000000000003'::uuid,'accepted', now() - interval '2 hours', now() - interval '1 hour'),
  ('22222222-0000-4000-8000-000000000002'::uuid,'11111111-0000-4000-8000-000000000001'::uuid,
   '99999999-0000-4000-8000-000000000002'::uuid,'pending',  now() - interval '30 minutes', null),
  -- R2: its single seat is taken -> the ride shows as Full
  ('22222222-0000-4000-8000-000000000003'::uuid,'11111111-0000-4000-8000-000000000002'::uuid,
   '99999999-0000-4000-8000-000000000004'::uuid,'accepted', now() - interval '5 hours', now() - interval '4 hours'),
  -- R4: rejected
  ('22222222-0000-4000-8000-000000000004'::uuid,'11111111-0000-4000-8000-000000000004'::uuid,
   '99999999-0000-4000-8000-000000000003'::uuid,'rejected', now() - interval '1 day', now() - interval '20 hours'),
  -- R5: withdrawn by the passenger
  ('22222222-0000-4000-8000-000000000005'::uuid,'11111111-0000-4000-8000-000000000005'::uuid,
   '99999999-0000-4000-8000-000000000002'::uuid,'withdrawn', now() - interval '6 hours', now() - interval '5 hours'),
  -- R6: still pending on a DEPARTED ride -> renders as EXPIRED, with nothing having written it
  ('22222222-0000-4000-8000-000000000006'::uuid,'11111111-0000-4000-8000-000000000006'::uuid,
   '99999999-0000-4000-8000-000000000003'::uuid,'pending',  now() - interval '2 days', null),
  -- R7: pending for now; the cancellation below cascades it
  ('22222222-0000-4000-8000-000000000007'::uuid,'11111111-0000-4000-8000-000000000007'::uuid,
   '99999999-0000-4000-8000-000000000002'::uuid,'pending',  now() - interval '3 hours', null);

-- Cancel R7 via an UPDATE so the rides_cancel_cascade TRIGGER fires and cascades its request,
-- rather than inserting a cancelled row and faking the outcome. This also exercises FR-38.
update rides set status = 'cancelled' where id = '11111111-0000-4000-8000-000000000007'::uuid;

commit;
