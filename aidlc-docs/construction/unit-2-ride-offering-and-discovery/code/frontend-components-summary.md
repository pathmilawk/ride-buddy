# Frontend Components Summary - Unit 2

**Plan steps**: 11 (generation), 13 (this summary) · **Component**: C15

## Files

| File | Type | Stories |
|---|---|---|
| `app/(app)/rides/page.tsx` | Server | US-25 (partial) |
| `app/(app)/rides/new/page.tsx` | Server | US-06, US-07, US-08 |
| `app/(app)/search/page.tsx` | Server | US-11, US-12, US-13 |
| `features/rides/components/RideForm.tsx` | Client | US-06, US-07, US-08 |
| `features/rides/components/RideCard.tsx` | Server | US-12, US-13 |
| `features/rides/components/CancelRideButton.tsx` | Client | US-09 |
| `features/rides/components/MyRidesList.tsx` | Server | US-25 |
| `features/search/components/SearchFilters.tsx` | Client | US-11 |
| `features/search/components/SearchResults.tsx` | Server | US-11 |

Three Client Components, each because it needs form state or a confirm flag.

## Modified in place, never duplicated

`components/AppNav.tsx` gains two links; `app/page.tsx` and `middleware.ts` redirect a
signed-in employee to `/search` rather than `/profile`, because finding a ride is what someone
opens the app to do - and the completeness gate diverts them if anything is missing.

## Decisions worth recording

**`RideCard` cannot render a phone number.** It receives an already-projected `PublicProfile`,
a type with no contact fields, so there is nothing in its props to render. FR-20 is satisfied
by what the component is *given*, not by what it chooses to display.

**`AreaSelect` is reused three times unchanged** - ride origin, ride destination, and both
search selects - each passing its own `testId`. That is exactly why Unit 1 made `testId` a
prop rather than a constant.

**Seats is a select, not a number input**, so BR-2.2's 1-8 bounds are expressed in the control
rather than only in an error message.

**`CancelRideButton` confirms inline** rather than in a modal - fewer moving parts, and it
reads clearly on a phone. Its wording states the action is permanent and that rides cannot be
edited, which is BR-2.10's substance.

**`rides/new` does not gate the page.** The completeness gate runs in the service on submit
(BR-2.1). Gating the page as well would be a third gate BR-1.10 does not authorise.

**The search page prefills its destination from the first office in the seeded list.** BR-2.18
specified origin and date but not destination, and a prefill missing one of the three filters
could not run a search at all. "Home area to the office" is `vision.md`'s primary use case.
Recorded as a small inference beyond the written design.

## 21 new data-testids, all verified present

## Responsive

Unit 1's shell is inherited, not restated. New: ride cards stack and wrap rather than
truncating; search filters are single-column on mobile and a row from `sm`; date, time and
seats use native controls so mobile gets platform pickers.

## No tests, deliberately

Plan step 12.1. Q20=A excludes UI testing and no DOM environment is configured.
