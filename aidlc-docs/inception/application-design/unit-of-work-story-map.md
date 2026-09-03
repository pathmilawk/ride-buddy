# Unit of Work Story Map - Ride Buddy

**Stage**: INCEPTION - Units Generation, Part 2 Generation, Phase 3
**Source**: `user-stories/stories.md` (28 stories)

Per `unit-of-work.md`, this document is **the only record of which work belongs to which
unit**, because UQ2=A and UQ6=A give units no representation in the codebase. It is the
artifact to check when judging whether a unit is complete.

---

## Unit 1 - Foundation (6 stories)

| Story | Title | Tags | Requirements |
|---|---|---|---|
| US-01 | Sign in to Ride Buddy | `[DEMO PATH]` | FR-1, FR-2, FR-3 |
| US-02 | Complete my profile | `[DEMO PATH]` | FR-4, FR-5, FR-7 |
| US-03 | Update my profile | | FR-5 |
| US-04 | Be stopped before acting with an incomplete profile | `[PROMOTED]` | FR-6 |
| US-05 | Choose locations from a known list | | FR-8, FR-9, FR-10 |
| US-28 | Use Ride Buddy on my phone | | NFR-5 |

**US-28 is cross-cutting.** It is assigned to Unit 1 because the responsive layout and shared
page shell are established there, but its acceptance criteria apply to every screen in every
unit. Each later unit's screens must satisfy it too.

---

## Unit 2 - Ride Offering and Discovery (10 stories)

| Story | Title | Tags | Requirements |
|---|---|---|---|
| US-06 | Offer a ride to the office | `[DEMO PATH]` | FR-11, FR-12, FR-13 |
| US-07 | Add a note to my ride | | FR-14 |
| US-08 | Offer a ride home from the office | | FR-11 |
| US-09 | Correct a ride I got wrong | | FR-15, FR-16 |
| US-10 | Stop seeing rides that have already left | | FR-17, A-5 |
| US-11 | Search for a ride | `[DEMO PATH]` | FR-18, FR-21 |
| US-12 | See enough about a ride to decide | `[DEMO PATH]` | FR-19, A-2 |
| US-13 | Not be able to see contact details I have not earned | `[DEMO PATH]` | FR-20 |
| US-25 | See the rides I am driving | | FR-34, FR-35, FR-39, FR-41 |
| US-27 | Have my contact details withheld at the source | | NFR-2 |

---

## Unit 3 - Requests and Matching (12 stories)

| Story | Title | Tags | Requirements |
|---|---|---|---|
| US-14 | Request a seat | `[DEMO PATH]` | FR-22, FR-23 |
| US-15 | Not be able to request my own ride | `[PROMOTED]` | FR-24 |
| US-16 | Ask several drivers at once | | FR-25 |
| US-17 | Not be able to request the same ride twice | `[PROMOTED]` | FR-26, A-1 |
| US-18 | Review who has asked for a seat | `[DEMO PATH]` | FR-27 |
| US-19 | Accept or reject a request | `[DEMO PATH]` | FR-28 |
| US-20 | Withdraw my request | | FR-29 |
| US-21 | Exchange contact details once a seat is agreed | `[DEMO PATH]` | FR-30 |
| US-22 | Never have a ride overbooked | `[PROMOTED]` `[DEMO PATH]` | FR-31, FR-32, FR-33 |
| US-23 | Have a request that was never answered come to a close | | FR-36, FR-37 |
| US-24 | Know where I stand when a driver cancels | `[PROMOTED]` | FR-38 |
| US-26 | See the rides I have asked to join | | FR-35, FR-40, FR-41, FR-42 |

---

## FINDING: three stories have acceptance criteria that span a unit boundary

Checklist 3.2 requires every story to be assigned to exactly one unit, and all 28 are. But
three stories have **individual acceptance criteria that cannot be satisfied within their
assigned unit**. Recording this rather than presenting the boundaries as cleaner than they
are, because it changes what "Unit 2 complete" means.

| Story | Unit | Criteria satisfiable in Unit 2 | Criteria requiring Unit 3 |
|---|---|---|---|
| **US-13** | 2 | Driver's phone and email hidden in search results | The second Gherkin block - a driver viewing pending requests sees no requester contact details |
| **US-25** | 2 | My Rides lists upcoming rides with status and a cancel action | The request list per ride, and the accept/reject actions on pending requests |
| **US-27** | 2 | No driver contact fields in ride-browsing output; direct profile reads refused | Pending-request output, and accepted-request output including contact fields |

**Why they are assigned to Unit 2 anyway.** Each one's *primary* criteria protect or serve
Unit 2's own demo path:

- US-13 and US-27 must hold in Unit 2 or the unit ships with driver contact details exposed
  in search - the exact failure the projection exists to prevent
- US-25 must exist in Unit 2 because US-06's own acceptance criteria state that a created ride
  "appears in the driver's My Rides view". Deferring US-25 would leave US-06 unsatisfiable.

**The alternative was worse.** Moving all three to Unit 3 would mean Unit 2 completes with
contact data exposed and with a driver unable to see their own published rides.

**Consequence for judging completion**: these three stories are **partially complete** at the
end of Unit 2 and **fully complete** at the end of Unit 3. Unit 2's checkpoint should verify
the Unit-2-satisfiable criteria only. Unit 3's checkpoint must re-verify all three stories in
full, not only its own twelve.

---

## Demo Path Distribution

The eight-step walkthrough in `requirements.md` Section 10 spreads across all three units,
which is what makes each checkpoint meaningful.

| Unit | Demo path stories | Demo steps covered |
|---|---|---|
| 1 | US-01, US-02 | Steps 1-2 |
| 2 | US-06, US-11, US-12, US-13 | Steps 3-5 |
| 3 | US-14, US-18, US-19, US-21, US-22 | Steps 5-8 |

11 demo path stories total. Step 5 appears in both Units 2 and 3 - US-13 (no contact details
shown) is Unit 2, US-14 (requesting a seat) is Unit 3.

---

## Promoted Story Distribution

Per SQ7=C, five edge cases were promoted to standalone stories. Each stayed with its parent's
unit.

| Story | Unit | Parent | Parent's unit | Together? |
|---|---|---|---|---|
| US-04 | 1 | US-02 | 1 | Yes |
| US-15 | 3 | US-14 | 3 | Yes |
| US-17 | 3 | US-14 | 3 | Yes |
| US-22 | 3 | US-19 | 3 | Yes |
| US-24 | 3 | US-09 | **2** | **No** |

**US-24 is separated from its parent.** US-09 (cancel and recreate a ride) is Unit 2; US-24
(the cancellation cascade to accepted passengers) is Unit 3. This is correct and unavoidable:
there are no requests to cascade to until Unit 3 exists. Unit 2 therefore ships ride
cancellation that cascades to nothing, and Unit 3 adds the cascade. Both states are
internally consistent - at no point is a passenger left holding a phantom seat, because
until Unit 3 no passenger can hold a seat at all.

---

## Requirement Coverage by Unit

| Unit | Functional requirements | Other |
|---|---|---|
| 1 | FR-1 to FR-10 | NFR-5 |
| 2 | FR-11 to FR-21, FR-34, FR-35 (partial), FR-39, FR-41 | NFR-2, A-2, A-5 |
| 3 | FR-22 to FR-33, FR-35, FR-36, FR-37, FR-38, FR-40, FR-41, FR-42 | A-1 |

FR-35 (request states) and FR-41 (upcoming-only filtering) appear in both Units 2 and 3
because each unit has its own view - My Rides in Unit 2, My Requests in Unit 3.

**All 42 functional requirements are reachable through the unit assignments.** Verified
programmatically - see the validation summary below.

---

## Validation Summary (checklist Phase 4)

| Check | Result |
|---|---|
| Stories assigned | 28/28 |
| Stories assigned exactly once | Yes - no duplicates |
| Stories unassigned | None |
| Functional requirements reachable | 42/42 |
| Components assigned to a unit | 15/15 |
| Unit dependency graph acyclic | Yes - lower-triangular matrix, one valid ordering |
| Demo path stories mapped | 11/11 |
| Promoted stories mapped | 5/5 |
| Stories with criteria spanning units | **3 - US-13, US-25, US-27, documented above** |
