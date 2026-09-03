# Application Design - Ride Buddy (Consolidated)

**Stage**: INCEPTION - Application Design
**Date**: 2026-09-03
**Status**: Awaiting approval

**Component documents**: [`components.md`](components.md) ·
[`component-methods.md`](component-methods.md) · [`services.md`](services.md) ·
[`component-dependency.md`](component-dependency.md)

---

## 1. Why this stage ran

The execution plan gave a specific reason. TC-1 places all server logic inside one Next.js
application, where writing business rules directly into route handlers or components is the
path of least resistance. Two rules could not be allowed to scatter:

1. **Seat capacity enforcement** (FR-31 to FR-33) - the only place in the system where a
   plausible race condition produces a silently wrong result, and FR-33 explicitly rules out
   application-layer checking as sufficient
2. **Conditional contact disclosure** (FR-20, FR-30, NFR-2) - the same phone number must be
   absent from some server output and present in other output

**The outcome**: each has exactly one named home.

| Rule | Home |
|---|---|
| Seat capacity | `C4.acceptWithCapacityGuarantee` - a single atomic database operation |
| Contact disclosure | `C10.projectProfile` - a pure function every read passes through |

---

## 2. Design Decisions (AQ1-AQ6)

| Decision | Choice |
|---|---|
| Code organisation | Feature folders for UI, one shared `services/` and `db/` layer (AQ1=C) |
| Server layer | Server Components for reads, Server Actions for writes; no hand-written HTTP API (AQ2=A) |
| Data access | Repository layer; services never touch the Supabase client (AQ3=A) |
| Validation | Shared Zod schemas with inferred TypeScript types (AQ4=A) |
| Contact disclosure | A single projection function (AQ5=A) |
| Failure reporting | Typed results for expected business outcomes, throw for faults (AQ6=C) |

---

## 3. Architecture at a glance

| Layer | Location | Components |
|---|---|---|
| Feature UI | `features/<feature>/` | C15 |
| Action boundary | `features/<feature>/actions.ts` | C14 |
| Service | `services/` | C5 Auth, C6 Profile, C7 Area, C8 Ride, C9 RideRequest |
| Repository | `db/repositories/` | C1 Profile, C2 Area, C3 Ride, C4 RideRequest |
| Cross-cutting | `lib/` | C10 Projection, C11 Schemas, C12 Result, C13 AuthContext |

Dependencies point downward only. Cross-cutting components depend on nothing outside
themselves and may be depended upon from anywhere. Verified acyclic - see
`component-dependency.md`.

---

## 4. Components

**Repositories** - C1 ProfileRepository, C2 AreaRepository, C3 RideRepository,
C4 RideRequestRepository (carries the capacity guarantee)

**Services** - C5 AuthService, C6 ProfileService (carries the FR-6 completeness gate),
C7 AreaService, C8 RideService, C9 RideRequestService (carries the request lifecycle)

**Cross-cutting** - C10 ContactProjection (carries the disclosure rule), C11
ValidationSchemas, C12 Result, C13 AuthContext

**Presentation** - C14 Server Actions (thin, no business rules), C15 Feature UI

Fifteen components. All eight business capabilities from the plan's context analysis have
exactly one owning component; full mapping in `components.md`.

---

## 5. The two rules that shaped the design

### Seat capacity - `C4.acceptWithCapacityGuarantee`

- Sets a request to ACCEPTED **only if** the ride's accepted count is below its seat count,
  as one indivisible database operation
- Given two simultaneous calls against one remaining seat, exactly one succeeds and the other
  returns `RIDE_FULL`
- **No other method in any component sets a request to ACCEPTED**, so the guarantee cannot be
  bypassed by a caller
- C9 performs no capacity check of its own - duplicating it would recreate the read-then-write
  window FR-33 rules out, and would make it ambiguous which check is authoritative
- Enforcement is cheap because FR-22 fixes every request at one seat, reducing the invariant
  to a row count against a stored integer

### Contact disclosure - `C10.projectProfile`

- Contact fields are included only when the viewer owns the profile, or an ACCEPTED request
  links viewer and subject
- In every other case the fields are **absent from the returned object**, not blanked
- Pure, no I/O, callers supply the linking status - which keeps it unit-testable without a
  database and auditable by reading one function
- Every read path returning another employee's data ends with a C10 call

**The design property worth noting**: FR-20 (hidden before) and FR-30 (visible after) are not
two features. They are one function producing different output as the linking status changes.
Acceptance involves no write of contact data anywhere - the fields simply stop being stripped.

Given that `requirements.md` Section 9.1 records the deliberate absence of any
company-domain check, C10 is the principal control protecting employee contact data. That is
why it is a single auditable function rather than a convention applied per screen.

---

## 6. Transaction boundaries

Two operations require atomicity. Both are named now because they constrain Functional Design.

| Operation | Why |
|---|---|
| **Accept a request** | FR-31 to FR-33. Check and write are inseparable, or concurrent acceptances both succeed. |
| **Cancel a ride** | FR-38. Ride status and the request cascade must not diverge, or a passenger keeps a phantom seat. |

Every other write is a single statement.

---

## 7. Notable design consequences

- **There is no `updateRide` method.** FR-15 forbids editing a published ride, so the method
  does not exist. Its absence is the enforcement, not a check.
- **Role is read by no component for authorization.** FR-7 makes it informational, so treating
  it as a permission anywhere would be a defect.
- **Expiry is derived at read time**, not written by a job. FR-36 and FR-37 combined with
  Q33=A mean a pending request on a departed ride is reported EXPIRED by
  `C9.listMyRequests`. No scheduler exists, and TC-7 gives one nowhere to run.
- **Reads produce no JSON endpoint** (AQ2=A), which strengthens NFR-2 but does not satisfy it.
  Server-rendered output still reaches the browser, so US-27 applies unchanged - hence C10.
- **Actions hold no logic**, which is what makes NFR-6's unit tests over seat availability and
  state transitions cheap: the logic under test needs no request context.
- **Absent seed data there is nothing to demo**, since Q21=A rules out an admin interface.
  TC-6's seed script is a requirement, not a convenience.

---

## 8. Unit assignment

| Unit | Components |
|---|---|
| **1 Foundation** | C1, C2, C5, C6, C7, C11 (partial), C12, C13, C14 (auth/profile), C15 (auth/profile) |
| **2 Ride Offering and Discovery** | C3, C8, **C10**, C11 (ride schemas), C14 (ride actions), C15 (rides/search) |
| **3 Requests and Matching** | C4, C9, C14 (request actions), C15 (requests) |

**C10 lands in Unit 2, not Unit 3.** Ride search must already withhold driver contact details
(US-13, FR-20) before any request exists. Deferring it would mean Unit 2 shipped with contact
data exposed.

---

## 9. Deferred to Functional Design

Deliberately not decided here:

- Table definitions, columns, keys, indexes
- The concrete mechanism for the capacity guarantee - constraint, conditional write, or
  serialised transaction
- RLS policy text (NFR-1's database layer)
- Field-level validation rules inside the C11 schemas
- The request state machine's transition guards in detail
- UI layout and styling

---

## 10. Verification

| Check | Result |
|---|---|
| Every component traces to at least one requirement | 15/15 |
| All 8 business capabilities have an owning component | 8/8 |
| Seat capacity rule has exactly one home | Yes - `C4.acceptWithCapacityGuarantee` |
| Contact disclosure rule has exactly one home | Yes - `C10.projectProfile` |
| Component dependency graph is acyclic | Yes - valid topological order exists |
| Mermaid diagrams validated | 1 diagram, all edges and style targets resolve |
| Text alternatives provided for diagrams | Yes, per `common/content-validation.md` |
| No detailed business logic present | Confirmed - rules are located, not specified |
