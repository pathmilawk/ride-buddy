# Frontend Components - Unit 2 Ride Offering and Discovery

**Phase**: CONSTRUCTION - Unit 2, Functional Design, Phase 4
**Decisions applied**: FQ6=A (same page, URL-driven), FQ7=C (prefilled), FQ8=A (confirm cancel)

The Unit 1 responsive shell is **inherited, not restated**. New screens go inside
`app/(app)/`, which already provides the authenticated layout, navigation, viewport meta and
the 44px / 16px sizing rules (NFR-5, US-28).

---

## Component Hierarchy

```
app/(app)/
├── rides/
│   ├── page.tsx               Server  - My Rides (US-25)
│   └── new/page.tsx           Server  - loads areas, renders RideForm (US-06..US-08)
└── search/page.tsx            Server  - reads searchParams, renders filters + results

features/rides/
├── components/RideForm.tsx    Client  - date, time, origin, destination, seats, note
├── components/RideCard.tsx    Server  - one ride, reused by My Rides and search results
├── components/CancelRideButton.tsx  Client - confirm-then-cancel (FQ8=A)
├── components/MyRidesList.tsx Server  - list or empty state
└── actions.ts                 Server Actions - createRide, cancelRide

features/search/
├── components/SearchFilters.tsx  Client - date + two AreaSelects, submits to the URL
├── components/SearchResults.tsx  Server - result list or empty state
└── (no actions.ts)                      - search is a read, so it needs none
```

**`features/search` has no `actions.ts`.** Under FQ6=A search is a navigation, not a mutation:
the form updates URL search parameters and the Server Component re-renders. A Server Action
would add a write boundary where nothing is written.

**Reused from Unit 1 unchanged**: `AreaSelect`, and the `components/ui/*` primitives.

---

## Props and State

### RideForm (Client)
| | |
|---|---|
| Props | `areas` |
| State | `pending`, `formError`, `fieldErrors` |
| Action | `createRideAction` |
| Renders | Date, time, origin `AreaSelect`, destination `AreaSelect`, seats, note, submit |

Seats renders as a select of 1 to 8 rather than a number input, so BR-2.2's bounds are
expressed in the control instead of only in an error message.

Date and time are two inputs; they are combined into one instant at the action boundary
(BR-2.2). Input shape and storage shape differ deliberately.

**No same-area validation** - FQ4=B permits it (BR-2.4).

### RideCard (Server)
| | |
|---|---|
| Props | `ride` (with derived seats remaining, full flag, own-ride flag), `variant`: `"search"` or `"mine"` |
| State | none |
| Renders | Route, date and time, seats remaining, note, driver name (search variant only) |

**One component serves both listings**, differing by variant. Worth noting because Unit 3 adds
a third context - a ride with its request list - and a single card keeps that consistent.

The card receives an already-projected driver name. **It never receives a phone number**,
because the public view it came from has no such column (BR-2.24).

### CancelRideButton (Client)
| | |
|---|---|
| Props | `rideId` |
| State | `confirming`, `pending` |
| Action | `cancelRideAction` |
| Renders | "Cancel ride"; once pressed, an inline confirm and dismiss pair |

Client-side purely to hold the `confirming` flag. Inline confirmation rather than a modal -
fewer moving parts, and it reads clearly on a phone.

**BR-2.10 makes this a rule, not a nicety.** The wording must say the action is permanent and
cannot be undone.

### MyRidesList / SearchResults (Server)
| | |
|---|---|
| Props | `rides`, plus `hasSearched` for SearchResults |
| State | none |
| Renders | `RideCard` per ride, or an explicit empty state (BR-2.19) |

Two distinct empty states: "you have no upcoming rides" for My Rides, and "no rides match" for
search.

### SearchFilters (Client)
| | |
|---|---|
| Props | `areas`, `defaultDate`, `defaultOriginId` |
| State | controlled inputs mirroring the URL |
| Renders | Date input, origin `AreaSelect`, destination `AreaSelect`, submit |

Submitting navigates with new search parameters rather than posting (FQ6=A). Defaults come
from the server per BR-2.18 - the component receives them and does not derive them.

---

## User Interaction Flows

| Flow | Steps |
|---|---|
| **Publish a ride** | My Rides → "Offer a ride" → fill form → submit → **gate may redirect to profile** → back and resubmit → ride appears in My Rides |
| **Search** | Search screen opens **already prefilled and showing results** → adjust filters → submit → URL updates, results re-render |
| **Cancel** | My Rides → "Cancel ride" → inline confirm → ride disappears from the list |
| **Publish a return ride** | Same as publish, with origin and destination reversed |

The gate redirect in the first flow is US-04 becoming visible for the first time.

---

## Form Validation

One schema per form, server parse authoritative (AQ4=A).

| Form | Schema | Client | Server |
|---|---|---|---|
| RideForm | `rideCreateSchema` | Required fields, seats select bounded to 1-8, `min` on the date input | Same schema, plus future-date check, area existence, and the completeness gate |
| SearchFilters | `rideSearchSchema` | Required fields | Same schema; invalid parameters fall back to defaults rather than erroring |

**Search parameters are parsed leniently.** A hand-edited or stale URL should show the default
search, not an error page - a search is a read, and a bad read has a sensible fallback.

---

## API Integration Points

| Component | Reaches server via | Target |
|---|---|---|
| `rides/page.tsx` | Server Component render | `C8.listMyRides` |
| `rides/new/page.tsx` | Server Component render | `C7.listAreas` |
| `search/page.tsx` | Server Component render | `C7.listAreas`, `C6.getOrCreateMyProfile` (for the prefill), `C8.searchRides` |
| RideForm | Server Action | `createRideAction` → `C8.createRide` |
| CancelRideButton | Server Action | `cancelRideAction` → `C8.cancelRide` |
| SearchFilters | **Navigation** | none - updates URL search params |

No component fetches from an endpoint; none exists (AQ2=A).

---

## data-testid Naming

Pattern `{component}-{element-role}`, stable, never generated.

| Element | testid |
|---|---|
| Offer-a-ride link | `my-rides-offer-ride-link` |
| Ride date | `ride-form-date-input` |
| Ride time | `ride-form-time-input` |
| Ride origin | `ride-form-origin-area-select` |
| Ride destination | `ride-form-destination-area-select` |
| Ride seats | `ride-form-seats-select` |
| Ride note | `ride-form-note-input` |
| Ride submit | `ride-form-submit-button` |
| Ride form error | `ride-form-error-message` |
| Ride card | `ride-card` |
| Seats remaining | `ride-card-seats-remaining` |
| Full marker | `ride-card-full-badge` |
| Cancel trigger | `cancel-ride-trigger-button` |
| Cancel confirm | `cancel-ride-confirm-button` |
| Cancel dismiss | `cancel-ride-dismiss-button` |
| Search date | `search-filters-date-input` |
| Search origin | `search-filters-origin-area-select` |
| Search destination | `search-filters-destination-area-select` |
| Search submit | `search-filters-submit-button` |
| Empty search results | `search-results-empty` |
| Empty My Rides | `my-rides-empty` |

21 new identifiers. The three `AreaSelect` reuses pass their own `testId`, which is why Unit 1
made it a prop.

---

## Navigation Added to the Shell

`AppNav` gains two links, **Search** and **My Rides**. That is the only change to a Unit 1
component in this unit - additive, and it does not alter Unit 1's behaviour.

---

## Responsive (NFR-5, US-28)

Inherited from Unit 1's shell. New considerations:

| Aspect | Rule |
|---|---|
| Ride cards | Stack vertically on mobile; the route line wraps rather than truncating |
| Search filters | Single column on mobile, inline row from the `sm` breakpoint |
| Date and time inputs | Native controls, so mobile gets the platform picker |
| Seats select | Native select for the same reason |
| No horizontal scroll | Long area names wrap; nothing relies on a fixed-width table |

---

## Story Coverage

| Story | Components |
|---|---|
| US-06, US-08 | RideForm, `rides/new/page.tsx` |
| US-07 | RideForm note field, RideCard |
| US-09 | CancelRideButton, and the absence of any edit control |
| US-10 | Handled server-side; no component renders a past ride |
| US-11 | SearchFilters, `search/page.tsx` |
| US-12 | RideCard, SearchResults |
| US-13 | RideCard - receives no contact fields to render |
| US-25 | MyRidesList, `rides/page.tsx` (partially - no request list) |
| US-27 | Enforced below the components, by the view and C10 |
