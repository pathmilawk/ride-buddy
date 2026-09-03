-- Unit 1 Foundation - areas reference table
-- Requirements: FR-8, FR-9, FR-10
-- Rules: BR-1.12, BR-1.13, BR-1.14, BR-1.15
-- Design: functional-design/domain-entities.md (FQ2=A - one table with a kind field)

create type area_kind as enum ('residential', 'office');

create table areas (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  kind       area_kind   not null,
  created_at timestamptz not null default now()
);

-- BR-1.13: an office is an ordinary row distinguished only by `kind`. The field is a label
-- for grouping and seed identification; it restricts nothing. FR-9 requires offices to live
-- in this same table so a ride's origin and destination can both reference it, which is what
-- makes an Office -> Home ride (FR-11) work with no additional modelling.

-- BR-1.15: read-only at runtime. No application flow inserts, renames, or deletes an area;
-- rows come from supabase/seed.sql (TC-6). `name` is unique so the seed can upsert
-- idempotently by name rather than by a generated id (assumption A-6).

comment on table areas is
  'Seeded location reference data. Serves both ride origin and destination (FR-9).';
comment on column areas.kind is
  'Label only - grouping and seed identification. Grants and restricts nothing (BR-1.13).';
