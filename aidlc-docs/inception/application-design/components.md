# Components - Ride Buddy

**Stage**: INCEPTION - Application Design, Phase 1
**Decisions applied**: AQ1=C (feature UI, shared services/db), AQ2=A (Server Components +
Actions), AQ3=A (repository layer), AQ5=A (single projection function)

**Scope boundary**: this document names components, their responsibilities, and their
interface boundaries. Detailed business rules belong to Functional Design, per unit.

---

## Layer Structure

Per AQ1=C, the codebase has feature-organised UI over a shared server-side core.

| Layer | Location | Contains |
|---|---|---|
| Feature UI | `features/<feature>/` | Server and Client Components, forms |
| Action boundary | `features/<feature>/actions.ts` | Server Actions - thin: parse, delegate, return |
| Service | `services/` | Business logic and orchestration (shared) |
| Repository | `db/repositories/` | Data access over Supabase (shared) |
| Cross-cutting | `lib/` | Projection, validation schemas, result types, auth context |

**The rule**: anything a single feature owns lives in that feature's folder. Anything two
features could need lives in the shared layer. The two cross-cutting rules identified in the
execution plan are therefore both in the shared layer by construction, not by discipline.

---

## Repository Components

### C1 - ProfileRepository
**Purpose**: persistence for employee profiles.
**Responsibilities**
- Read a profile by user id
- Create a minimal profile on first sign-in (FR-3)
- Update profile fields (FR-5)
**Interface boundary**: accepts and returns profile records. Applies no business rules and
performs no contact filtering - filtering is C10's job.
**Requirements**: FR-3, FR-4, FR-5

### C2 - AreaRepository
**Purpose**: read access to the seeded area reference table.
**Responsibilities**
- List all areas for selection
- Resolve an area by id
**Interface boundary**: read-only. Areas are seeded by TC-6 and never created at runtime.
**Requirements**: FR-8, FR-9, FR-10

### C3 - RideRepository
**Purpose**: persistence and querying for rides.
**Responsibilities**
- Insert a ride (FR-12)
- Mark a ride cancelled (FR-16)
- Query upcoming rides by date, origin area, destination area (FR-18)
- Query rides owned by a user (FR-39)
- Report seats remaining for a ride (FR-19)
**Interface boundary**: accepts and returns ride records. Excludes past and cancelled rides
from discovery queries (FR-17, FR-21), because "upcoming" is a query-time predicate per
assumption A-5.
**Requirements**: FR-12, FR-16, FR-17, FR-18, FR-19, FR-21, FR-39

### C4 - RideRequestRepository
**Purpose**: persistence and state transitions for seat requests.
**Responsibilities**
- Insert a request (FR-22)
- Detect an existing active request by the same passenger on the same ride (FR-26)
- Transition a request to REJECTED, WITHDRAWN, or CANCELLED
- **Accept a request under a capacity guarantee** - see below
- Transition every request on a ride to CANCELLED (FR-38)
- Query requests by ride, and by requesting user (FR-39, FR-40)

**CAPACITY ENFORCEMENT LIVES HERE.** Checklist item 1.4 requires the seat rule to have a
named home, and this is it: the method **`acceptWithCapacityGuarantee`**. It is a **single
atomic database operation** that either succeeds or fails with a capacity outcome. FR-33 rules out reading a count and
then writing, so the check and the write are not separable at this boundary. Callers -
including C9 - cannot bypass it, because no other write path sets a request to ACCEPTED.

**Interface boundary**: the accept operation returns a distinguishable capacity-failure
outcome rather than throwing, per AQ6=C.
**Requirements**: FR-22, FR-26, FR-28, FR-29, FR-31, FR-32, FR-33, FR-38

---

## Service Components

### C5 - AuthService
**Purpose**: establish who is making the current request.
**Responsibilities**
- Return the authenticated user, or nothing when signed out
- Expose sign-up, sign-in, and sign-out (FR-1)
**Interface boundary**: wraps Supabase Auth. No other component reads the auth session
directly, so there is one place that determines identity.
**Note**: applies no email-domain restriction (FR-2), per the accepted deviation in
`requirements.md` Section 9.1.
**Requirements**: FR-1, FR-2

### C6 - ProfileService
**Purpose**: profile reads, updates, and the completeness gate.
**Responsibilities**
- Fetch the current user's profile, creating it if absent (FR-3)
- Update the current user's own profile only (FR-5)
- **Report whether a profile is complete enough to act** (FR-6)
**Interface boundary**: refuses reads and writes of other users' profiles. Returns profiles
already passed through C10 when the caller is not the owner.
**Requirements**: FR-3, FR-4, FR-5, FR-6, FR-7

### C7 - AreaService
**Purpose**: supply areas for selection.
**Responsibilities**: list areas for profile, ride creation, and search forms.
**Requirements**: FR-8, FR-9, FR-10

### C8 - RideService
**Purpose**: ride offering and discovery.
**Responsibilities**
- Create a ride after checking profile completeness via C6 (FR-6, FR-12)
- Cancel a ride owned by the current user, delegating the request cascade to C9 (FR-16, FR-38)
- Search upcoming rides by date and both areas (FR-18)
- List the current user's upcoming rides with their requests (FR-39)
- Mark rides the viewer owns, and rides with no seats left, so the UI can disable the request
  action (A-2, FR-24)
**Interface boundary**: never exposes driver contact details; all ride reads pass through C10.
Offers no update operation, because FR-15 forbids editing.
**Requirements**: FR-11 to FR-21, FR-24, FR-39, A-2

### C9 - RideRequestService
**Purpose**: orchestrate the seat request lifecycle.
**Responsibilities**
- Request a seat, after checking profile completeness (FR-6), self-request (FR-24), and
  duplicate active request (FR-26)
- Accept a request via C4's atomic operation, surfacing a capacity failure (FR-28, FR-31)
- Reject a request (FR-28)
- Withdraw the current user's own request (FR-29)
- Cascade all requests to CANCELLED when a ride is cancelled (FR-38)
- Derive EXPIRED status for pending requests on departed rides (FR-36, FR-37)
- List the current user's upcoming requests with status (FR-40)
**Interface boundary**: enforces that only a ride's owner may accept or reject, and only a
request's owner may withdraw. All reads pass through C10.
**Requirements**: FR-22 to FR-30, FR-34 to FR-38, FR-40, FR-42, A-1

---

## Cross-Cutting Components

### C10 - ContactProjection
**Purpose**: the single place that decides whether a phone number and email address may be
included in anything the server produces.

**Responsibilities** - carried by the method **`projectProfile`**, with `projectMany` as its
batch equivalent for list views
- Given a viewer and a profile, return the profile with contact fields present only when an
  ACCEPTED request links the two (FR-20, FR-30)
- Always return the owner's own contact fields to the owner
- Strip contact fields for every other relationship, including PENDING, REJECTED, WITHDRAWN,
  EXPIRED, and CANCELLED

**Why this is one component.** Checklist item 1.5 required a decision, and AQ5=A chose a
single function. `requirements.md` Section 9.1 records that no company-domain check exists,
which makes this projection the principal control protecting employee contact data. A rule
applied in fifteen places is a rule with fifteen chances to be forgotten; this one is applied
in one place and every read path is routed through it.

**Interface boundary**: pure and side-effect free. It takes a viewer, a profile, and the
linking request status, and returns a projected profile. It performs no queries of its own,
which is what keeps it trivially testable.
**Requirements**: FR-20, FR-27, FR-30, NFR-2

### C11 - ValidationSchemas
**Purpose**: shared Zod schemas for every form input, per AQ4=A.
**Responsibilities**
- Define schemas for profile update, ride creation, ride search, and seat request
- Export inferred TypeScript types so schema and type cannot drift
**Interface boundary**: pure declarations, no I/O. Used by Client Components for immediate
feedback and by Server Actions as the authoritative parse of `FormData`.
**Requirements**: enables FR-4, FR-12, FR-18, FR-22

### C12 - Result
**Purpose**: the typed outcome shape services return, per AQ6=C.
**Responsibilities**
- Represent success with a value, or failure with a distinguishable business outcome code
- Cover the outcomes stories require: ride full (US-22), duplicate request (US-17), incomplete
  profile (US-04), not permitted, not found
**Interface boundary**: a type plus small constructors. Unexpected faults are thrown, not
wrapped - only expected business outcomes travel as results.
**Requirements**: enables FR-6, FR-24, FR-26, FR-31

### C13 - AuthContext helper
**Purpose**: give server-side code the current user without each call site re-deriving it.
**Responsibilities**: resolve the current user for Server Components and Server Actions, and
refuse the operation when there is none.
**Interface boundary**: server-only. Wraps C5.
**Requirements**: FR-1, NFR-1

---

## Presentation Components

### C14 - Server Actions (per feature)
**Purpose**: the write boundary between browser and services, per AQ2=A.
**Responsibilities**
- Parse `FormData` with the relevant C11 schema
- Resolve the current user via C13
- Call exactly one service method
- Return the service's typed result to the calling form
**Interface boundary**: deliberately thin. **No business rule may live here.** Any logic in an
action is logic that cannot be reused by another caller and cannot be unit tested without a
request context.
**Requirements**: the write side of FR-1 (sign in/up/out), FR-5 (profile update),
FR-12 (ride creation), FR-16 (ride cancellation), FR-22 (seat request), FR-28 (accept and
reject), FR-29 (withdraw). Every other functional requirement is reached through reads,
which per AQ2=A go directly from Server Components to services and do not pass through an
action.

### C15 - Feature UI components
**Purpose**: the screens, organised by feature per AQ1=C.
**Features**: `auth`, `profile`, `rides`, `search`, `requests`
**Responsibilities**
- Server Components fetch through services and render
- Client Components handle forms, validating with C11 schemas for feedback
- Present statuses, seats remaining, and full or own-ride markers
- Mobile-first responsive layout (NFR-5, US-28)
**Interface boundary**: never queries the database and never reads the auth session directly.
**Requirements**: FR-39 to FR-42, NFR-5

---

## Capability Ownership

Checklist item 5.3 requires every capability from the plan's context analysis to have an
owning component.

| Capability | Owner | Supporting |
|---|---|---|
| Identity and profile | C6 ProfileService | C1, C5, C13 |
| Geography reference data | C7 AreaService | C2 |
| Ride offering | C8 RideService | C3 |
| Ride discovery | C8 RideService | C3, C10 |
| Seat request lifecycle | C9 RideRequestService | C4 |
| Capacity enforcement | **C4 RideRequestRepository** | C9 |
| Personal views | C8 and C9 | C15 |
| Contact disclosure control | **C10 ContactProjection** | C6, C8, C9 |

All 8 capabilities have exactly one owning component. The two cross-cutting rules each have
one designated home, satisfying checklist item 5.4.
