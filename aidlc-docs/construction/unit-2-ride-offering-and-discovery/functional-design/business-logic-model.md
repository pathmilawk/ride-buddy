# Business Logic Model - Unit 2 Ride Offering and Discovery

**Phase**: CONSTRUCTION - Unit 2, Functional Design, Phase 3

Flows are technology-agnostic. Each cites its stories, rules and requirements.

---

## Flow 1: Publish a Ride

**Stories**: US-06, US-07, US-08 · **Rules**: BR-2.1 to BR-2.7 · **Requirements**: FR-6, FR-11 to FR-14

| # | Step | Outcome on failure |
|---|---|---|
| 1 | Driver opens the new-ride form; areas loaded for both selects | - |
| 2 | Driver submits date, time, origin, destination, seats, optional note | - |
| 3 | Schema parses input; date and time combined into one instant (BR-2.2) | `VALIDATION_FAILED` per field |
| 4 | Departure confirmed to be in the future (BR-2.2) | `VALIDATION_FAILED` |
| 5 | Seats confirmed within 1 to 8 (BR-2.2) | `VALIDATION_FAILED` |
| 6 | Caller resolved from the session | `NOT_PERMITTED` |
| 7 | **Completeness gate checked** (BR-2.1, reusing Unit 1's `assertCanAct`) | `PROFILE_INCOMPLETE`, redirect to profile with the missing fields |
| 8 | Both area ids confirmed to exist | `NOT_FOUND` |
| 9 | Ride inserted as `active`, `driver_id` taken from the session (BR-2.5) | thrown - a fault |
| 10 | Driver returned to My Rides, where the new ride appears | - |

**Step 7 is where US-04 finally becomes demonstrable.** Unit 1 built the gate but had nothing
to gate; this is the first of the two call sites BR-1.10 allows.

**Step 9 takes the driver from the session, not the form.** Ride ownership is therefore
unforgeable - there is no field an attacker could set.

**No same-area check.** FQ4=B permits origin to equal destination (BR-2.4).

---

## Flow 2: Cancel a Ride

**Stories**: US-09 · **Rules**: BR-2.8 to BR-2.12 · **Requirements**: FR-15, FR-16

| # | Step | Outcome on failure |
|---|---|---|
| 1 | Driver views their ride in My Rides. **No edit control is offered** (BR-2.8) | - |
| 2 | Driver activates cancel; interface requires explicit confirmation (BR-2.10) | Driver declines; nothing happens |
| 3 | Caller resolved from the session | `NOT_PERMITTED` |
| 4 | Ride loaded | `NOT_FOUND` |
| 5 | Ownership confirmed in the service (BR-2.9, BR-2.32) | `NOT_PERMITTED` |
| 6 | `status` set to `cancelled`; the database policy independently enforces ownership | thrown |
| 7 | Ride leaves search results and My Rides (BR-2.11, BR-2.14) | - |
| 8 | Driver may now create a corrected ride via Flow 1 | - |

**Step 2 is a business rule, not decoration** (BR-2.10). Because FR-15 makes
cancel-and-recreate the only correction path, this action gets used routinely - and in Unit 3
it will also cascade accepted passengers' seats away.

**Unit 3 inserts its cascade between steps 6 and 7.** The insertion point is named now so it
is not bolted on later: FR-38 requires ride status and request states to change together.

---

## Flow 3: Search for a Ride

**Stories**: US-11, US-12, US-13 · **Rules**: BR-2.13 to BR-2.27 · **Requirements**: FR-18 to FR-21

| # | Step | Component |
|---|---|---|
| 1 | Employee opens search. Filters **prefilled** - origin from their `home_area_id`, date today (BR-2.18) | C15, C6 |
| 2 | Areas loaded for both selects | C7 |
| 3 | Filters read from URL search parameters | C15 |
| 4 | Filters parsed by the search schema | C11 |
| 5 | Rides queried: date range over `departs_at`, exact origin and destination ids, `status = active`, `departs_at > now` (BR-2.14, BR-2.16) | C3 |
| 6 | Accepted-request counts obtained per ride to derive seats remaining (BR-2.21) | C3 |
| 7 | Driver profiles read **through the public view** in one batch (BR-2.24) | C10 |
| 8 | Full rides marked; the viewer's own rides marked (BR-2.22, BR-2.23) | C8 |
| 9 | Results rendered, or the explicit empty state (BR-2.19) | C15 |

**Step 7 is the disclosure control.** The batch read goes through a view carrying no `phone`
and no `email`, so no later step can leak them - there is nothing to leak. This is FR-20 and
NFR-2 satisfied by the shape of the data rather than by remembering to strip fields.

**Step 6 always yields zero in Unit 2.** No requests exist, so every ride shows its full seat
count. Correct, but not real evidence that the derivation works - that arrives with Unit 3.

**Steps 3 and 4 make a search a shareable URL** (FQ6=A). No client-side filter state exists.

---

## Flow 4: Read Another Employee's Public Profile

**Stories**: US-13, US-27 · **Rules**: BR-2.24, BR-2.25, BR-2.26 · **Requirements**: FR-20, NFR-2

The mechanism Flow 3 step 7 depends on, stated separately because Unit 3 will extend it.

| # | Step |
|---|---|
| 1 | A caller needs one or more employees' names |
| 2 | C10 reads the **public profile view**, never the base table |
| 3 | The view returns `id`, `display_name`, `home_area_id`, `role` - **no contact columns exist on it** |
| 4 | C10 returns `PublicProfile` values, a type with no contact fields |
| 5 | Callers render names; the type makes reading a phone number a compile error |

**Two independent guarantees**, which is NFR-1's point:
- The database cannot return `phone` or `email` through this path - the columns are not there
- The type system prevents a caller from expecting them

**Unit 3's extension**: FR-30 needs `phone` and `email` released to an accepted pair. The
public view deliberately cannot serve that, so Unit 3 adds a separate path - and C10 gains the
conditional branch choosing between them. FQ5=B solves Unit 2's need completely and Unit 3's
not at all, by design.

---

## Flow 5: My Rides

**Stories**: US-25 · **Rules**: BR-2.28 to BR-2.30 · **Requirements**: FR-34, FR-39, FR-41

| # | Step |
|---|---|
| 1 | Caller resolved from the session |
| 2 | Rides queried where `driver_id` is the caller, `status = active`, `departs_at > now` |
| 3 | Seats remaining derived per ride |
| 4 | Each ride rendered with date, time, both areas, seats, status, note, and a cancel action |
| 5 | Reachable by every signed-in employee regardless of `role` (BR-2.30) |

**No request list, and no accept or reject actions** (BR-2.29). Those criteria of US-25 are
satisfied in Unit 3. US-25 is therefore **partially complete** at this unit's checkpoint - the
approved story-map finding, restated so the checkpoint is judged against the right bar.

---

## Flow 6: Past-Ride Exclusion

**Stories**: US-10 · **Rules**: BR-2.13 to BR-2.15 · **Requirements**: FR-17

| Condition | Behaviour |
|---|---|
| `departs_at` later than now | Ride appears in search and My Rides |
| `departs_at` earlier than now | Excluded from both listings; **the row is retained** |
| `status = cancelled` | Excluded from both listings; the row is retained |

Not a user-initiated flow but a predicate on every listing query. **No scheduled job exists**
and none is needed - which is what Q33=A and TC-7 between them require.

**Retention matters for Unit 3**: FR-37 derives EXPIRED for pending requests against departed
rides, which needs the ride row still present.

---

## Flow-to-Story Coverage

| Story | Flows | Fully covered in Unit 2 |
|---|---|---|
| US-06 Offer a ride | 1 | Yes |
| US-07 Ride note | 1 | Yes |
| US-08 Return ride | 1 | Yes |
| US-09 Cancel and recreate | 2 | Yes |
| US-10 Past rides | 6 | Yes |
| US-11 Search | 3 | Yes |
| US-12 Result detail | 3 | Yes, except the full marker which nothing can exercise yet |
| US-13 Contact withheld | 3, 4 | **Partially** - search half yes; driver's pending-request half needs Unit 3 |
| US-25 My Rides | 5 | **Partially** - ride list yes; request list needs Unit 3 |
| US-27 Withheld at source | 4 | **Partially** - browsing half yes; pending and accepted output need Unit 3 |

Three stories partially complete, exactly as the approved story map records. Unit 3 must
re-verify all three in full.

---

## Downstream Interface Contract

What Unit 3 may rely on. Changing any of these is a breaking change.

| Contract | Consumer |
|---|---|
| `rides.seats` is the authoritative seat count; nothing caches a remaining figure | Unit 3's capacity guarantee |
| Seats remaining is derived by counting accepted requests | Unit 3's constraint counts the same rows |
| `rides.driver_id` identifies the owner, taken from the session | Unit 3's self-request refusal (FR-24) |
| `rides.status` and the `departs_at > now` predicate define a joinable ride | Unit 3's request validity |
| Past rides are retained, not deleted | Unit 3's EXPIRED derivation (FR-37) |
| C10 owns the non-owner profile read path and the `PublicProfile` type | Unit 3 adds the conditional branch |
| The public view carries no contact columns and **cannot serve FR-30** | Unit 3 must add its own path for accepted pairs |
| Cancellation is a single `status` transition with a named insertion point for the cascade | Unit 3's FR-38 |
