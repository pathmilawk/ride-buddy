# Component Methods - Ride Buddy

**Stage**: INCEPTION - Application Design, Phase 2
**Decisions applied**: AQ3=A (repositories), AQ4=A (Zod-inferred types), AQ6=C (typed results
for business outcomes, throw for faults)

**Scope boundary**: signatures, purpose, input and output types, and failure outcomes.
**Detailed business rules are deliberately absent** - they are designed in Functional Design,
per unit. Where a rule is named here it is to say *which method owns it*, not how it works.

---

## Conventions

**Result type** (C12), per AQ6=C:

```
Result<T> = { ok: true, value: T } | { ok: false, outcome: BusinessOutcome }

BusinessOutcome =
  | "PROFILE_INCOMPLETE"      // FR-6,  US-04
  | "RIDE_FULL"               // FR-31, US-22
  | "DUPLICATE_REQUEST"       // FR-26, US-17
  | "SELF_REQUEST"            // FR-24, US-15
  | "NOT_PERMITTED"           // ownership violations
  | "NOT_FOUND"
  | "INVALID_STATE"           // transition not legal from current status
```

Unexpected faults - a dropped connection, a schema mismatch, a bug - are **thrown**, not
returned. Only outcomes a story describes as normal behaviour travel as results.

**Types** are inferred from C11 Zod schemas (AQ4=A), so a schema change propagates to the
types rather than requiring a parallel edit.

**Viewer-projected reads**: any method returning another employee's profile data returns it
already passed through C10. This is stated per method rather than assumed.

---

## C1 - ProfileRepository

| Method | Purpose | Input | Output |
|---|---|---|---|
| `findByUserId` | Read one profile | user id | profile or nothing |
| `findManyByUserIds` | Batch read, to avoid per-row queries in list views | user ids | profiles |
| `create` | Create the minimal profile on first sign-in (FR-3) | user id, email | profile |
| `update` | Persist changed profile fields (FR-5) | user id, partial profile | profile |

Returns raw records. Applies no rules and no projection.

---

## C2 - AreaRepository

| Method | Purpose | Input | Output |
|---|---|---|---|
| `listAll` | All areas for selection (FR-8) | none | areas |
| `findById` | Resolve one area | area id | area or nothing |

Read-only; areas are seeded (TC-6).

---

## C3 - RideRepository

| Method | Purpose | Input | Output |
|---|---|---|---|
| `create` | Insert a ride (FR-12) | driver id, ride fields | ride |
| `findById` | Read one ride | ride id | ride or nothing |
| `markCancelled` | Set a ride CANCELLED (FR-16) | ride id | ride |
| `searchUpcoming` | Discovery query (FR-18) | date, origin area id, destination area id | rides with seats-remaining |
| `listUpcomingByDriver` | My Rides source (FR-39) | driver id | rides with seats-remaining |
| `countAcceptedRequests` | Seats-remaining input (FR-19) | ride id | count |

`searchUpcoming` and `listUpcomingByDriver` both exclude cancelled rides and rides whose
departure has passed (FR-17, FR-21), evaluating "upcoming" at query time per assumption A-5.
Neither method returns driver contact fields.

---

## C4 - RideRequestRepository

| Method | Purpose | Input | Output |
|---|---|---|---|
| `create` | Insert a PENDING request (FR-22) | ride id, passenger id | request |
| `findById` | Read one request | request id | request or nothing |
| `findActiveByRideAndPassenger` | Duplicate detection (FR-26) | ride id, passenger id | request or nothing |
| **`acceptWithCapacityGuarantee`** | **The capacity-critical operation** | request id, ride id | `Result<request>` |
| `markRejected` | PENDING to REJECTED (FR-28) | request id | request |
| `markWithdrawn` | PENDING or ACCEPTED to WITHDRAWN (FR-29) | request id | request |
| `cancelAllForRide` | Cascade on ride cancellation (FR-38) | ride id | count affected |
| `listByRide` | Driver's request list (FR-27, FR-39) | ride id | requests with requester ids |
| `listUpcomingByPassenger` | My Requests source (FR-40) | passenger id | requests with ride data |

### `acceptWithCapacityGuarantee` - the one method that carries a correctness guarantee

This is the named home of FR-31 to FR-33 and story US-22.

- **Contract**: sets the request to ACCEPTED **only if** the ride's accepted-request count is
  below its seat count, as one indivisible database operation. Returns `RIDE_FULL` otherwise.
- **Why one operation**: FR-33 states that application-layer checking is not sufficient.
  Reading a count and then writing leaves a window in which another writer can also pass the
  check. The check and the write therefore cannot be separated at this boundary.
- **Concurrency contract**: given two simultaneous calls against a single remaining seat,
  exactly one returns success and the other returns `RIDE_FULL`. Accepted count never exceeds
  seat count; seats remaining is never negative.
- **Why enforcement is simple here**: FR-22 fixes every request at exactly one seat, so the
  invariant is a row count against a stored integer rather than a sum over quantities.
- **No alternative path**: no other method in any component sets a request to ACCEPTED.

The mechanism - a constraint, a conditional write, or a serialised transaction - is chosen in
Functional Design. What is fixed here is that the guarantee is this method's responsibility
and cannot be relocated to a caller.

---

## C5 - AuthService

| Method | Purpose | Input | Output |
|---|---|---|---|
| `signUp` | Register (FR-1) | email, password | `Result<user>` |
| `signIn` | Authenticate (FR-1) | email, password | `Result<user>` |
| `signOut` | End the session | none | void |
| `getCurrentUser` | Identify the caller | none | user or nothing |

No email-domain check is applied (FR-2), per the accepted deviation in `requirements.md`
Section 9.1. Recorded here so the absence reads as intentional.

---

## C6 - ProfileService

| Method | Purpose | Input | Output |
|---|---|---|---|
| `getOrCreateMyProfile` | Current user's profile, created if absent (FR-3) | none | profile |
| `updateMyProfile` | Update own profile only (FR-5) | validated profile input | `Result<profile>` |
| `assertCanAct` | **The completeness gate** (FR-6) | none | `Result<void>` |
| `getProfileAsViewedBy` | Another employee's profile, projected | viewer id, subject id, linking status | projected profile |

`assertCanAct` is the named home of FR-6 and story US-04. It returns `PROFILE_INCOMPLETE`
when name, phone, or home area is missing. It deliberately ignores role, because FR-7 makes
role non-functional. Both C8 `createRide` and C9 `requestSeat` call it before acting.

`updateMyProfile` returns `NOT_PERMITTED` if asked to write another user's profile.
`getProfileAsViewedBy` returns the result of C10, never a raw profile.

---

## C7 - AreaService

| Method | Purpose | Input | Output |
|---|---|---|---|
| `listAreas` | Areas for any selection control (FR-8, FR-9) | none | areas |

---

## C8 - RideService

| Method | Purpose | Input | Output |
|---|---|---|---|
| `createRide` | Publish a ride (FR-12) | validated ride input | `Result<ride>` |
| `cancelRide` | Cancel own ride and cascade (FR-16, FR-38) | ride id | `Result<void>` |
| `searchRides` | Discovery (FR-18) | validated search input, viewer id | ride summaries |
| `getRideForViewer` | One ride, projected | ride id, viewer id | ride detail or nothing |
| `listMyRides` | My Rides with requests (FR-39) | none | rides with request lists |

- `createRide` calls `C6.assertCanAct` first and propagates `PROFILE_INCOMPLETE`
- `cancelRide` returns `NOT_PERMITTED` unless the caller owns the ride, then delegates the
  request cascade to `C9.cancelRequestsForRide`
- `searchRides` returns summaries carrying seats remaining, a full marker, and an own-ride
  marker (A-2, FR-24) so the UI can disable the request action without re-deriving the rule
- **There is no `updateRide`.** FR-15 forbids editing, so the method does not exist. Its
  absence is the enforcement.
- All read methods return driver data already projected by C10

---

## C9 - RideRequestService

| Method | Purpose | Input | Output |
|---|---|---|---|
| `requestSeat` | Create a seat request (FR-22) | ride id | `Result<request>` |
| `acceptRequest` | Accept, capacity-guarded (FR-28, FR-31) | request id | `Result<request>` |
| `rejectRequest` | Reject (FR-28) | request id | `Result<request>` |
| `withdrawRequest` | Withdraw own request (FR-29) | request id | `Result<request>` |
| `cancelRequestsForRide` | Cascade on ride cancellation (FR-38) | ride id | `Result<count>` |
| `listRequestsForMyRide` | Driver's view, projected (FR-27) | ride id | projected requests |
| `listMyRequests` | My Requests with status (FR-40) | none | projected requests |

Ownership and precondition contracts:

| Method | Refuses with |
|---|---|
| `requestSeat` | `PROFILE_INCOMPLETE` (FR-6), `SELF_REQUEST` (FR-24), `DUPLICATE_REQUEST` (FR-26), `RIDE_FULL`, `NOT_FOUND` |
| `acceptRequest` | `NOT_PERMITTED` unless caller owns the ride, `RIDE_FULL` from C4, `INVALID_STATE` if not PENDING |
| `rejectRequest` | `NOT_PERMITTED` unless caller owns the ride, `INVALID_STATE` if not PENDING |
| `withdrawRequest` | `NOT_PERMITTED` unless caller owns the request, `INVALID_STATE` if terminal |

- `acceptRequest` performs no capacity check of its own; it calls
  `C4.acceptWithCapacityGuarantee` and surfaces `RIDE_FULL`. Duplicating the check in the
  service is precisely what FR-33 rules out.
- `listMyRequests` derives EXPIRED for pending requests whose ride has departed (FR-36,
  FR-37). Derived at read time, which is what removes the need for a scheduled job.
- Both list methods return contact fields only for ACCEPTED requests, via C10.

---

## C10 - ContactProjection

| Method | Purpose | Input | Output |
|---|---|---|---|
| `projectProfile` | Include or strip contact fields (FR-20, FR-30) | viewer id, profile, linking request status | projected profile |
| `projectMany` | Batch equivalent for list views | viewer id, profiles with statuses | projected profiles |

**Contract**
- Viewer is the profile owner: contact fields included
- A linking request exists with status ACCEPTED: contact fields included
- Any other case, including PENDING, REJECTED, WITHDRAWN, EXPIRED, CANCELLED, or no link at
  all: contact fields **absent from the returned object**, not blanked or nulled

Pure and side-effect free, performs no queries. Callers supply the linking status. That
constraint is deliberate: it keeps the component unit-testable without a database and makes
the rule auditable by reading one function.

---

## C11 - ValidationSchemas

| Schema | Validates | Feeds |
|---|---|---|
| `profileUpdateSchema` | name, phone, home area id, role | C6.updateMyProfile |
| `rideCreateSchema` | date, departure time, origin area id, destination area id, seats, optional note | C8.createRide |
| `rideSearchSchema` | date, origin area id, destination area id | C8.searchRides |
| `credentialsSchema` | email, password | C5.signUp, C5.signIn |

Each exports its inferred TypeScript type. Field-level rules such as future-dated departure
and positive seat count are specified in Functional Design; this document records only that
these schemas are the place those rules will live.

---

## C13 - AuthContext helper

| Method | Purpose | Input | Output |
|---|---|---|---|
| `requireUser` | Current user, or refuse | none | user, else `NOT_PERMITTED` |
| `getOptionalUser` | Current user if signed in | none | user or nothing |

Used by Server Components and Server Actions so no call site re-derives identity.

---

## C14 - Server Actions

Every action has the same four-line shape, per AQ2=A and the thin-boundary rule:

```
1. parse FormData with the feature's C11 schema
2. resolve the current user via C13.requireUser
3. call exactly one service method
4. return the service's Result to the calling form
```

| Action | Delegates to |
|---|---|
| `signUpAction`, `signInAction`, `signOutAction` | C5 |
| `updateProfileAction` | C6.updateMyProfile |
| `createRideAction` | C8.createRide |
| `cancelRideAction` | C8.cancelRide |
| `requestSeatAction` | C9.requestSeat |
| `acceptRequestAction` | C9.acceptRequest |
| `rejectRequestAction` | C9.rejectRequest |
| `withdrawRequestAction` | C9.withdrawRequest |

**No business rule may live in an action.** Rules placed here cannot be reused by another
caller and cannot be unit tested without a request context - which matters directly, because
NFR-6 requires unit tests over seat availability and state transitions.

---

## Business Rule Ownership

Recorded so that Functional Design knows where each rule belongs, and so no rule is
homeless.

| Rule | Requirements | Owning method |
|---|---|---|
| Seat capacity never exceeded | FR-31 to FR-33 | `C4.acceptWithCapacityGuarantee` |
| Contact disclosure | FR-20, FR-27, FR-30, NFR-2 | `C10.projectProfile` |
| Profile completeness gate | FR-6 | `C6.assertCanAct` |
| No self-request | FR-24 | `C9.requestSeat` |
| No duplicate active request | FR-26, A-1 | `C9.requestSeat` via `C4.findActiveByRideAndPassenger` |
| Ride ownership for accept and reject | FR-28 | `C9.acceptRequest`, `C9.rejectRequest` |
| Request ownership for withdraw | FR-29 | `C9.withdrawRequest` |
| Cancellation cascade | FR-38 | `C9.cancelRequestsForRide` |
| Expiry at departure | FR-36, FR-37 | `C9.listMyRequests` (derived at read time) |
| No ride editing | FR-15 | Enforced by the absence of an update method on C8 |
| Upcoming-only filtering | FR-17, FR-21, FR-41, A-5 | `C3.searchUpcoming`, `C3.listUpcomingByDriver` |
| Role grants no permissions | FR-7 | Enforced by no component reading role for authorization |
