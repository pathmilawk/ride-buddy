# Units of Work - Ride Buddy

**Stage**: INCEPTION - Units Generation, Part 2 Generation, Phase 1
**Plan**: `aidlc-docs/inception/plans/unit-of-work-plan.md` (approved)
**Decisions applied**: UQ1=A (three units), UQ2=A (planning device only), UQ3=A (single
developer sequential), UQ4=A (identical deployment), UQ5=A (demo-path grouping), UQ6=A (units
invisible in the tree)

---

## Terminology

Per `units-generation.md`, a **Service** is independently deployable and a **Module** is a
logical grouping within a service. TC-1 fixes this system as a single deployable Next.js
application, so:

> **Ride Buddy has one Service and three Modules.**

The three units below are **build sequencing and review checkpoints**. They are not
deployment boundaries, not versioning boundaries, and carry no network contracts. Later
stages must not treat a unit boundary as a service boundary.

---

## Deployment Model (checklist 1.6)

Per UQ4=A, all three units share one deployment identically:

| Aspect | Value |
|---|---|
| Deployable artifacts | One - a single Next.js application (TC-1) |
| Database | One Supabase cloud project (TC-4) |
| Runtime | Local development, `npm run dev` (TC-7) |
| Per-unit deployment differences | None |
| Scaling treatment | None; under 50 users assumed (NFR-4) |

UQ4=A independently confirms that the execution plan was right to skip Infrastructure Design.
Had any unit needed separate deployment, that skip would have required revisiting.

---

## Unit 1 - Foundation

**Purpose**: establish an identified employee with a usable profile and a known home area.
Nothing else in the system can be demonstrated without this.

**Responsibilities**
- Registration, sign-in, sign-out (FR-1, FR-2)
- Automatic minimal profile creation on first sign-in (FR-3)
- Profile viewing and updating (FR-4, FR-5)
- The profile completeness gate that later units depend on (FR-6)
- Seeded area reference data and its selection controls (FR-8, FR-9, FR-10)
- Mobile-first responsive layout, established here and applied throughout (NFR-5)

**Stories**: US-01, US-02, US-03, US-04, US-05, US-28 (6 stories)

**Components**: C1 ProfileRepository, C2 AreaRepository, C5 AuthService, C6 ProfileService,
C7 AreaService, C11 ValidationSchemas (credentials and profile schemas), C12 Result,
C13 AuthContext, C14 Server Actions (auth and profile), C15 Feature UI (auth and profile)

**Demonstrable at completion**: an employee registers, signs in, is prompted for their
missing profile fields, selects their home area from the seeded list, and saves. Attempting a
later action with an incomplete profile is refused with a clear message.

**Requirements**: FR-1 to FR-10, NFR-5

---

## Unit 2 - Ride Offering and Discovery

**Purpose**: a driver publishes a trip and a passenger finds it - without any contact
details changing hands.

**Responsibilities**
- Ride creation in both directions, one-off only (FR-11, FR-12, FR-13)
- The optional ride note (FR-14)
- Ride cancellation, and the absence of any edit path (FR-15, FR-16)
- Past-ride exclusion, evaluated at query time (FR-17, A-5)
- Search by date, origin area, and destination area (FR-18, FR-21)
- Ride result detail including seats remaining and a full marker (FR-19, A-2)
- **Contact-detail withholding, established here** (FR-20, NFR-2)
- My Rides view for the driver (FR-34, FR-39, FR-41)

**Stories**: US-06, US-07, US-08, US-09, US-10, US-11, US-12, US-13, US-25, US-27
(10 stories)

**Components**: C3 RideRepository, C8 RideService, **C10 ContactProjection**,
C11 (ride creation and search schemas), C14 (ride actions), C15 (rides and search features)

**Demonstrable at completion**: a driver publishes a ride from their home area to the office
and sees it in My Rides. A second employee searches by date and both areas, finds the ride,
sees the driver's name and the ride note - and cannot see the driver's phone number.

**Requirements**: FR-11 to FR-21, FR-34, FR-39, FR-41, NFR-2, A-2, A-5

**Why C10 lands here rather than in Unit 3**: ride search must already withhold driver
contact details before any request exists. Deferring the projection to Unit 3 would mean
Unit 2 shipped with contact data exposed in search results.

---

## Unit 3 - Requests and Matching

**Purpose**: the seat request lifecycle, the capacity guarantee, and the contact exchange
that follows acceptance.

**Responsibilities**
- Seat request creation, one seat, no message (FR-22, FR-23)
- Self-request refusal, enforced server-side (FR-24)
- Multiple concurrent pending requests (FR-25)
- Duplicate active request refusal (FR-26, A-1)
- Driver's request review, name and area only (FR-27)
- Accept and reject (FR-28)
- Passenger withdrawal (FR-29)
- Contact exchange on acceptance (FR-30)
- **The seat capacity guarantee** (FR-31, FR-32, FR-33)
- The full request state machine (FR-34, FR-35)
- Expiry at departure, derived at read time (FR-36, FR-37)
- Cancellation cascade to accepted passengers (FR-38)
- My Requests view (FR-40, FR-41, FR-42)

**Stories**: US-14, US-15, US-16, US-17, US-18, US-19, US-20, US-21, US-22, US-23, US-24,
US-26 (12 stories)

**Components**: **C4 RideRequestRepository** (carries the capacity guarantee),
C9 RideRequestService, C14 (request actions), C15 (requests feature)

**Demonstrable at completion**: the full eight-step demo path. A passenger requests a seat,
the driver sees the request with name and area only, accepts it, capacity is enforced at the
database, and both parties then see each other's phone number and email.

**Requirements**: FR-22 to FR-38, FR-40, FR-41, FR-42, A-1

**Why this unit is the largest**: it carries all the state-machine work, the one
correctness-critical concurrency requirement, and the conditional disclosure that switches on
acceptance. Splitting the request lifecycle across units would leave a half-built state
machine at a checkpoint.

---

## Code Organization Strategy (checklist 1.5 - greenfield requirement)

Per UQ6=A, **units do not appear in the directory structure**. Code lands in the layout fixed
by Application Design AQ1=C regardless of which unit introduces it.

```
<workspace root>/
├── app/                      # Next.js App Router - routes and layouts
├── features/                 # UI organised by feature (AQ1=C)
│   ├── auth/                 #   Unit 1
│   ├── profile/              #   Unit 1
│   ├── rides/                #   Unit 2
│   ├── search/               #   Unit 2
│   └── requests/             #   Unit 3
│       └── actions.ts        #   Server Actions per feature (C14)
├── services/                 # Shared business logic (C5-C9)
├── db/
│   └── repositories/         # Shared data access (C1-C4)
├── lib/                      # Cross-cutting (C10 projection, C11 schemas,
│                             #   C12 result, C13 auth context)
├── supabase/
│   ├── migrations/           # Versioned schema SQL (TC-5)
│   └── seed.sql              # Demo data (TC-6)
├── tests/                    # Unit tests (NFR-6)
└── aidlc-docs/               # Documentation only - never application code
```

The comments mark which unit *introduces* each directory. They are annotations for reading
this plan, not a structural boundary.

### DEVIATION from the generic structure pattern

`construction/code-generation.md` lists, under structure patterns by project type:

> **Greenfield multi-unit (monolith)**: `src/{unit-name}/`, `tests/{unit-name}/`

**This project does not use that pattern.** Recorded here rather than silently diverging.

**Why not**, in order of weight:

1. **The user decided otherwise.** UQ6=A explicitly chose units invisible in the tree, having
   been shown the alternative of unit-named top-level directories and its cost.
2. **It would break the approved Application Design.** AQ1=C put services, repositories,
   validation schemas, and the contact projection in a single shared layer, specifically so
   the seat-capacity rule and the contact-disclosure rule each have exactly one home.
   `src/unit-1/`, `src/unit-2/`, `src/unit-3/` would fragment that shared layer across three
   directories and leave both cross-cutting rules without a single owner - undoing the stated
   purpose of running Application Design at all.
3. **The framework constrains the layout.** Next.js App Router requires `app/` at the
   repository root or under `src/`. A `src/{unit-name}/` arrangement does not accommodate
   framework-mandated routing directories.
4. **The pattern targets a different case.** It is written for a monolith whose units are
   genuine modules with their own boundaries. Here UQ2=A made units a planning device with no
   codebase representation at all, so there is nothing for unit directories to contain.

**Retained from the rule**: application code stays at the workspace root, documentation stays
in `aidlc-docs/`, and no application code is ever written into `aidlc-docs/`. Those are the
Code Location Rules, and they are absolute. Only the optional per-project-type directory
shape differs.

### Consequence of UQ2=A and UQ6=A

Because units have no representation in the codebase, **nothing structural prevents Unit 3
code being written during Unit 2**. The unit boundary is a discipline, not a constraint.
`unit-of-work-story-map.md` is therefore the only record of what belongs where, and is the
artifact to check when judging whether a unit is complete.

---

## Unit Summary

| Unit | Stories | Components | Requirements | Est. effort |
|---|---|---|---|---|
| 1 Foundation | 6 | 10 | FR-1 to FR-10, NFR-5 | 45-60 min |
| 2 Ride Offering and Discovery | 10 | 6 | FR-11 to FR-21, FR-34, FR-39, FR-41, NFR-2 | 60-75 min |
| 3 Requests and Matching | 12 | 4 | FR-22 to FR-38, FR-40 to FR-42 | 75-90 min |
| **Total** | **28** | **15** | **42 FR + NFR-2, NFR-5** | **3 - 3.75 h** |

Component counts overlap where a unit extends an existing component - C11, C14 and C15 are
introduced in Unit 1 and extended in Units 2 and 3. The table counts each unit's touched
components; the 15 total counts distinct components.
