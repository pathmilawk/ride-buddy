# Frontend Components - Unit 3 Requests and Matching

**Phase**: CONSTRUCTION - Unit 3, Functional Design, Phase 4
**Decisions applied**: FQ5=A (requests inline on My Rides), FQ6=A (My Requests on its own
route), FQ7=A (inline error on a full ride), FQ8=A (all six statuses, terminal ones separated)

The Unit 1 shell is inherited. New screens go inside `app/(app)/`.

---

## Component Hierarchy

```
app/(app)/
└── requests/page.tsx              Server - My Requests (US-26)

features/requests/
├── components/RequestSeatButton.tsx     Client - the passenger's action (US-14)
├── components/RideRequestList.tsx       Server - a driver's requests for one ride (US-18, US-25)
├── components/RequestDecisionButtons.tsx Client - accept / reject (US-19)
├── components/WithdrawRequestButton.tsx  Client - confirm-then-withdraw (US-20)
├── components/MyRequestsList.tsx        Server - list or empty state (US-26)
├── components/RequestStatusBadge.tsx    Server - one of six statuses
├── components/ContactDetails.tsx        Server - phone and email, accepted only (US-21)
└── actions.ts                           Server Actions - request, accept, reject, withdraw
```

### Modified in place

| File | Change |
|---|---|
| `features/rides/components/RideCard.tsx` | Add `RequestSeatButton`, suppressed on own and full rides; add `ContactDetails` for an accepted viewer |
| `features/rides/components/MyRidesList.tsx` | Render `RideRequestList` under each ride |
| `components/AppNav.tsx` | Add a My requests link |

Three files edited, none duplicated.

---

## Props and State

### RequestSeatButton (Client)
| | |
|---|---|
| Props | `rideId`, `disabled`, `disabledReason` |
| State | `pending`, `error` |
| Action | `requestSeatAction` |

`disabled` and its reason arrive as props from the server, which already knows whether the ride
is full or the viewer's own (Unit 2's derived flags). The component decides nothing.

**FQ7=A**: on `RIDE_FULL` the error renders inline beside the button and the page revalidates,
so the seats-remaining figure corrects itself in the same render. The passenger sees both what
failed and what is now true.

### RideRequestList (Server)
| | |
|---|---|
| Props | `rideId`, `requests` (each with requester public profile, status, and contact when accepted) |
| State | none |

**FQ8=A**: pending first, then accepted, then a separated group for rejected, withdrawn,
expired and cancelled. All six statuses appear, because US-25's criteria list all six.

A pending entry shows **name and pickup area only** - the data it receives contains nothing
else, so it cannot show more (BR-3.26, completing US-13).

### RequestDecisionButtons (Client)
| | |
|---|---|
| Props | `requestId` |
| State | `pending`, `error` |
| Actions | `acceptRequestAction`, `rejectRequestAction` |

Accept carries **no confirmation step**, unlike cancellation. Deliberate: acceptance is the
outcome a driver is trying to reach, and adding friction to the demo's happiest path would be
wrong. Reject also has none - a passenger can simply ask again (BR-3.7).

**The asymmetry is worth stating**: cancelling a ride confirms (BR-2.10) because it is
destructive and cascades; accepting does not, because it is the goal. Both are deliberate.

### WithdrawRequestButton (Client)
| | |
|---|---|
| Props | `requestId`, `wasAccepted` |
| State | `confirming`, `pending` |
| Action | `withdrawRequestAction` |

**Confirms only when the request was accepted**, where withdrawing gives up a seat someone
agreed to. Withdrawing a pending request needs no confirmation - nothing is lost.

### ContactDetails (Server)
| | |
|---|---|
| Props | `name`, `phone`, `email` |
| State | none |

Rendered **only** when the caller passes contact values, which happens only for an accepted
pair. The component has no status logic and makes no decision - if it is rendered, disclosure
was already authorised by the database policy and C10.

**Deliberately dumb.** Putting a status check here would give the disclosure rule a second
home.

### RequestStatusBadge (Server)
| | |
|---|---|
| Props | `status` - one of six, including derived EXPIRED |
| State | none |

Distinct wording per status so a passenger can tell "the driver said no" from "the ride left
before anyone answered" - a distinction FR-42's silence makes especially important.

### MyRequestsList (Server)
| | |
|---|---|
| Props | `items` |
| State | none |

Empty state: "You have not asked to join any rides yet." with a link to search.

---

## User Interaction Flows

| Flow | Steps |
|---|---|
| **Request a seat** | Search → find a ride → Request a seat → **gate may redirect to profile** → back and retry → status shows pending |
| **Request a full ride** | Button already disabled; if it races, an inline "ride is full" appears and seats-remaining corrects itself |
| **Answer a request** | My rides → see requests under a ride → Accept or Reject → the entry moves group and contact details appear on accept |
| **Withdraw** | My requests → Withdraw → (confirm, if accepted) → status shows withdrawn |
| **See a cancelled ride** | My requests → the entry shows cancelled, and the driver's contact details are gone |

The last flow needs no new mechanism: the cascade changed the status, and the policy then stops
permitting the contact row. Nothing had to un-share anything.

---

## Form Validation

Every action here carries either nothing or a single id, so there is little to validate. Each
action confirms the id is present and well-formed; every real rule is a service precondition
(BR-3.1) rather than a form constraint.

**No new Zod schemas are needed.** Recorded because the pattern in Units 1 and 2 was one schema
per form, and its absence here is a consequence of the actions taking ids rather than data.

---

## API Integration Points

| Component | Reaches server via | Target |
|---|---|---|
| `requests/page.tsx` | Server Component render | `C9.listMyRequests` |
| `rides/page.tsx` (modified) | Server Component render | `C8.listMyRides` + `C9.listRequestsForMyRide` |
| RequestSeatButton | Server Action | `C9.requestSeat` |
| RequestDecisionButtons | Server Actions | `C9.acceptRequest`, `C9.rejectRequest` |
| WithdrawRequestButton | Server Action | `C9.withdrawRequest` |
| ContactDetails | none | receives props |

---

## data-testid Naming

| Element | testid |
|---|---|
| Request-seat button | `request-seat-button` |
| Request-seat error | `request-seat-error` |
| Request list for a ride | `ride-request-list` |
| One request entry | `ride-request-item` |
| Terminal request group | `ride-request-terminal-group` |
| Status badge | `request-status-badge` |
| Accept | `request-accept-button` |
| Reject | `request-reject-button` |
| Decision error | `request-decision-error` |
| Withdraw trigger | `withdraw-request-trigger-button` |
| Withdraw confirm | `withdraw-request-confirm-button` |
| Contact block | `request-contact-details` |
| Contact phone | `request-contact-phone` |
| Contact email | `request-contact-email` |
| My requests empty | `my-requests-empty` |
| Nav my-requests link | `app-nav-my-requests-link` |

16 new identifiers, bringing the project to 52.

`request-contact-phone` matters beyond convenience: it gives an end-to-end check a precise
anchor for the assertion that most needs making - that a phone number is **absent** before
acceptance and **present** after.

---

## Responsive (NFR-5, US-28)

Inherited. New considerations:

| Aspect | Rule |
|---|---|
| Request entries | Stack within a ride card; name wraps rather than truncating |
| Accept and reject | Side by side, each meeting the 44px target; stack below `sm` if cramped |
| Contact details | Phone as a `tel:` link so a tap dials - the natural next step after acceptance |
| Terminal group | Collapsed by default on mobile to keep the active requests visible |

---

## Story Coverage

| Story | Components |
|---|---|
| US-14, US-15, US-16, US-17 | RequestSeatButton, plus service preconditions |
| US-18 | RideRequestList |
| US-19 | RequestDecisionButtons |
| US-20 | WithdrawRequestButton |
| US-21 | ContactDetails |
| US-22 | Surfaced by the inline error on RequestSeatButton and RequestDecisionButtons |
| US-23 | RequestStatusBadge showing derived EXPIRED |
| US-24 | RequestStatusBadge showing cancelled; ContactDetails absent |
| US-26 | MyRequestsList, `requests/page.tsx` |
| **US-13** | RideRequestList - receives no contact fields for pending requests |
| **US-25** | MyRidesList with RideRequestList - **now complete** |
| **US-27** | ContactDetails renders only what C10 supplied |
