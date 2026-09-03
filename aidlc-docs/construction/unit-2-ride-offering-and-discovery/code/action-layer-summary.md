# Action Layer Summary - Unit 2

**Plan steps**: 8 (generation), 10 (this summary) · **Component**: C14

## Files

| File | Actions |
|---|---|
| `features/rides/actions.ts` | `createRideAction`, `cancelRideAction` |

## There is no search action

Under FQ6=A a search is a **navigation**, not a mutation: `SearchFilters` pushes new URL search
parameters and the Server Component re-renders. A Server Action would add a write boundary
where nothing is written.

## Decisions worth recording

**`createRideAction` closes the loop Unit 1 built but could not demonstrate.** On
`PROFILE_INCOMPLETE` it redirects to `/profile?missing=...`, handing the missing field names to
the banner Unit 1 wrote. US-04 becomes visible to a real user here for the first time - in
Unit 1 the gate existed with nothing to gate.

**Both actions keep the four-line shape**: parse, delegate to one service method, translate the
Result, return it. No business rule lives in either.

**`cancelRideAction` revalidates both `/rides` and `/search`**, since a cancelled ride must
disappear from search results too.

## No tests, deliberately

Plan step 9.1. Logic-free by construction; behaviour covered through the services in Step 6.
