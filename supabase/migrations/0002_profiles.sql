-- Unit 1 Foundation - employee profiles
-- Requirements: FR-3, FR-4, FR-5, FR-7
-- Rules: BR-1.4, BR-1.7, BR-1.9
-- Design: functional-design/domain-entities.md (FQ1=A - id is both PK and FK to auth.users)

create type user_role as enum ('driver', 'passenger', 'both');

create table profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  email         text        not null,
  display_name  text,
  phone         text,
  home_area_id  uuid        references areas (id) on delete restrict,
  role          user_role   not null default 'both',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- FQ1=A: `id` is simultaneously the primary key and a foreign key to auth.users.id, so a row
-- shares its UUID with the auth account. This is what lets every ownership policy reduce to
-- `auth.uid() = id` with no join (see 0003_rls_policies.sql).

-- The three nullable columns are deliberate. FR-3 creates a profile automatically on first
-- sign-in, before the employee has supplied anything, so display_name, phone and
-- home_area_id start null. Those same three columns are exactly what the completeness gate
-- (BR-1.9, FR-6) checks before allowing a ride to be offered or a seat requested.

-- `role` is deliberately NOT nullable and NOT gated. It defaults to 'both', which is truthful
-- for every user because FR-7 grants no permissions from it - so the default mislabels nobody.

-- `email` is mirrored from auth.users at creation and never edited by the user (US-02).
-- The duplication is intentional: Unit 2 lists driver names and Unit 3 releases contact
-- details, both reading `profiles`, and joining to the protected auth schema on every such
-- read is awkward and largely unavailable from the client. Residual risk: an email changed
-- directly in auth.users would leave this copy stale. Accepted for the POC - there is no
-- email-change feature.

-- home_area_id uses ON DELETE RESTRICT rather than CASCADE or SET NULL: deleting an area that
-- employees live in should fail loudly rather than silently null out their home area. Areas
-- are seeded and never deleted at runtime, so this is a safety net, not an operational path.

create index profiles_home_area_id_idx on profiles (home_area_id);

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

comment on table profiles is
  'One row per employee, keyed by the auth user id (FQ1=A).';
comment on column profiles.role is
  'Informational only. Read by nothing for authorization (FR-7).';
