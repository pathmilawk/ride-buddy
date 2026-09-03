# Domain Entities - Unit 1 Foundation

**Phase**: CONSTRUCTION - Unit 1, Functional Design, Phase 1
**Decisions applied**: FQ1=A (profiles.id = auth.users.id), FQ2=A (areas with a kind field),
FQ4=A (role optional, defaults to both)

**Scope**: technology-agnostic entity definitions. Concrete DDL, indexes, and RLS policy text
belong to Code Generation.

---

## Entity: `profiles`

One row per employee. Holds everything about a person that is not authentication.

| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `id` | UUID | No | Primary key **and** foreign key to `auth.users.id` (FQ1=A). Same UUID as the auth account. |
| `email` | text | No | The employee's company email, mirrored from the auth account at creation. Not user-editable (US-02). |
| `display_name` | text | **Yes** | The name colleagues see. Read by the completeness gate. |
| `phone` | text | **Yes** | Contact number, released only after acceptance (FR-30). Read by the completeness gate. |
| `home_area_id` | UUID | **Yes** | Foreign key to `areas.id`. The employee's pickup area. Read by the completeness gate. |
| `role` | enum | No | `driver`, `passenger`, or `both`. **Defaults to `both`** (FQ4=A). Informational only - grants no permissions (FR-7). |
| `created_at` | timestamp | No | Row creation time. |
| `updated_at` | timestamp | No | Last modification time. |

**Requirements**: FR-3, FR-4, FR-5, FR-7

### Why three fields are nullable

FR-3 (from Q4=B) creates a profile automatically on first sign-in, before the employee has
supplied anything. `display_name`, `phone`, and `home_area_id` are therefore null at
creation and filled in later. **Those three nullable fields are precisely what the
completeness gate (FR-6) checks**, and the reason the gate has to exist at all: without it,
a null phone would reach the contact-exchange flow in Unit 3 and display nothing.

`role` is deliberately **not** nullable and **not** gated. It defaults to `both`, which is
truthful for every user since FR-7 grants no permissions from it, so the default mislabels
nobody.

### Relationship to `auth.users`

- One-to-one, sharing the primary key (FQ1=A)
- Deleting the auth account cascades to the profile
- `auth.users` is Supabase-managed; this unit never writes to it except through `C5 AuthService`
- **Consequence for authorization**: because the profile's PK *is* the auth user id, the
  database-layer rule NFR-1 requires reduces to comparing the session's user id against the
  row's own id. No join is needed to decide ownership.

### Email mirroring - a deliberate duplication

`email` exists on both `auth.users` and `profiles`. Recorded as intentional rather than
accidental:

- Unit 2 lists driver names and Unit 3 releases contact details, both of which read
  `profiles`. Joining to the protected `auth` schema on every such read is awkward and, from
  the client, largely unavailable.
- The value is written once at profile creation and never updated by the user (US-02 states
  email is not editable), so the two copies cannot drift through normal use.
- **The residual risk**: an email changed directly in `auth.users` would leave the profile
  copy stale. Acceptable in a POC with no email-change feature; it would need a trigger or a
  sync step in a real product.

---

## Entity: `areas`

Seeded reference data. The single source of locations for both trip ends.

| Field | Type | Nullable | Meaning |
|---|---|---|---|
| `id` | UUID | No | Primary key. |
| `name` | text | No | Human-readable area name. Unique. |
| `kind` | enum | No | `residential` or `office` (FQ2=A). |
| `created_at` | timestamp | No | Row creation time. |

**Requirements**: FR-8, FR-9, FR-10

### Design notes

- **One table serves both trip ends.** FR-9 requires offices to be ordinary entries, and
  Unit 2's ride model is `origin_area_id -> destination_area_id` over this same table. That
  is what makes an Office-to-Home ride (FR-11) work with no extra modelling: the two area
  ids simply swap.
- **`kind` is not a permission or a constraint**, only a label. Nothing prevents a ride from
  one residential area to another. It exists so seed data can mark the office and the UI can
  group or default sensibly.
- **`name` is unique** so the seed script can upsert idempotently by name rather than by a
  generated id.
- **Read-only at runtime.** No application flow creates, renames, or deletes an area; rows
  come from the seed script (TC-6). C2 AreaRepository exposes reads only.
- **Matching is exact equality on `id`** (FR-10). No fuzzy or text matching exists anywhere in
  the system, which is the direct consequence of Q8=A choosing a seeded list over free text.

---

## Relationships

| From | To | Cardinality | On delete |
|---|---|---|---|
| `profiles.id` | `auth.users.id` | 1:1 | Cascade - removing the auth account removes the profile |
| `profiles.home_area_id` | `areas.id` | many:1, optional | Restrict - an area in use cannot be deleted |

**Restrict rather than cascade** on the area reference: deleting an area that employees live
in should fail loudly, not silently null out their home area. Since areas are seeded and never
deleted at runtime, this is a safety net rather than an operational path.

---

## Entities this unit does NOT own

Recorded so the boundary is explicit.

| Entity | Owning unit | This unit's obligation |
|---|---|---|
| `rides` | Unit 2 | Will reference `profiles.id` as driver and `areas.id` twice |
| `ride_requests` | Unit 3 | Will reference `profiles.id` as passenger |

**Downstream obligations from Unit 1**, all of which later units depend on:

1. `profiles.id` must be a stable UUID equal to the auth user id - Unit 2 and Unit 3 both key
   ownership from it
2. `profiles.display_name` must be readable by other employees - Unit 2 shows driver names in
   search results (FR-19), Unit 3 shows requester names (FR-27)
3. `profiles.phone` and `profiles.email` must be readable **conditionally** - Unit 2 builds
   the projection (C10) that enforces this, Unit 3 supplies the accepted-request status
4. `areas.id` must be stable across seed runs - Unit 2's rides reference it
5. The completeness gate must be callable - Unit 2 calls it before ride creation, Unit 3
   before seat requests

---

## Story and Requirement Coverage

| Story | Entities involved |
|---|---|
| US-01 Sign in | `auth.users`, `profiles` (created) |
| US-02 Complete my profile | `profiles`, `areas` (selection) |
| US-03 Update my profile | `profiles`, `areas` |
| US-04 Completeness gate | `profiles` - reads `display_name`, `phone`, `home_area_id` |
| US-05 Choose locations from a list | `areas` |
| US-28 Mobile responsive | none - presentation only |

| Requirement | Entity support |
|---|---|
| FR-1, FR-2 | `auth.users` via C5; no domain restriction applied |
| FR-3 | `profiles` row auto-created with three nullable fields |
| FR-4 | All `profiles` fields |
| FR-5 | `profiles` update, owner only |
| FR-6 | The three nullable `profiles` fields |
| FR-7 | `profiles.role`, read by nothing for authorization |
| FR-8, FR-9, FR-10 | `areas` with `kind`, exact id matching |
