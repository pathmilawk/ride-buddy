# Frontend Components Summary - Unit 3

**Plan steps**: 11, 13 · **Component**: C15

## Files

Seven new components under `features/requests/components/`, plus `app/(app)/requests/page.tsx`.

**Modified in place**: `RideCard.tsx`, `MyRidesList.tsx`, `app/(app)/rides/page.tsx`,
`components/AppNav.tsx`. Four files edited, none duplicated.

## US-25 is now complete

Unit 2 shipped My Rides without a request list, which the approved story map recorded as partial.
`MyRidesList` now receives `requestViews` and passes them to `RideCard`, which renders
`RideRequestList` with accept and reject on pending entries. **The carried-forward finding is
closed** - US-13, US-25 and US-27 are all complete as of this unit.

## Decisions worth recording

**`ContactDetails` is deliberately dumb.** It takes an `AcceptedContact` and renders it, with no
status check at all. A check here would give the disclosure rule a second home; the type is the
safeguard, since an `AcceptedContact` can only have come from the accepted-pair read path.

**No confirmation on accept or reject, and the asymmetry is intentional.** Cancelling a ride
confirms (BR-2.10) because it is permanent and cascades every accepted passenger's seat away.
Accepting does not, because it is the outcome the driver is trying to reach. Declining does not
either, because BR-3.7 lets the passenger simply ask again.

**Withdraw confirms only when the request was accepted**, where a seat someone agreed to is being
given up. A pending withdrawal loses nothing.

**`RideRequestList` shows all six statuses** (FQ8=A), with the terminal group in a collapsed
`<details>`. A withdrawn passenger leaves a trace without crowding out what needs action.

**`RequestStatusBadge` wording is distinct per status.** With no notifications at all (FR-42) the
badge is the only thing that tells a passenger what happened, and "declined by the driver" versus
"ride left before this was answered" is a distinction they will care about.

**`RideCard` shows the viewer's own request status instead of a button** where one exists, rather
than offering an action that would be refused with `DUPLICATE_REQUEST`. This is why `RideListItem`
gained `myRequest` - a small extension to a Unit 2 type, made in place.

**Phone renders as a `tel:` link**, so a tap dials. That is the natural next step after
acceptance, and `request-contact-phone` gives an end-to-end check a precise anchor for the
assertion that most needs making: absent before acceptance, present after.

## 16 new data-testids, 53 project-wide

## No tests, deliberately

Plan step 12.1. Q20=A excludes UI testing; no DOM environment is configured.
