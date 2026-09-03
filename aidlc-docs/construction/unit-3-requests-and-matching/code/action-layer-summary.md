# Action Layer Summary - Unit 3

**Plan steps**: 8, 10 · **Component**: C14

## Files

`features/requests/actions.ts` - `requestSeatAction`, `acceptRequestAction`,
`rejectRequestAction`, `withdrawRequestAction`.

## No new Zod schema

Every action takes an id and nothing else, so there is no shape to validate. Every real rule is a
service precondition (BR-3.1). Recorded because Units 1 and 2 followed one-schema-per-form, and
the absence here is a consequence of the input shape rather than an oversight.

## Decisions worth recording

**`acceptRequestAction` revalidates on failure too** (FQ7=A). A `RIDE_FULL` means the seat count
the driver was looking at is stale, so the list must re-render with the true state alongside the
error. Revalidating only on success would leave them staring at a number that had just been
disproved.

**`requestSeatAction` redirects to `/profile?missing=...`** on `PROFILE_INCOMPLETE`, matching
Unit 2's pattern. This is the second and last of the two gate call sites BR-1.10 permits.

**All four revalidate `/rides`, `/requests` and `/search`**, because a status change moves seats
remaining, the driver's list and the passenger's list at once.

## No tests, deliberately

Plan step 9.1. Logic-free by construction; covered through the services.
