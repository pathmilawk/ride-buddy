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
