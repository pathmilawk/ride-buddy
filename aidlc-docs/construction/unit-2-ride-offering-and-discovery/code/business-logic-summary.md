# Business Logic Summary - Unit 2

**Plan steps**: 5 (generation), 6 (tests), 7 (this summary) · **Components**: C8, C10, C11

## Files

| File | Purpose |
|---|---|
| `lib/ride-derivations.ts` | Pure: `seatsRemaining`, `isFull`, `isOwnRide`, `dayRange`, `combineDateAndTime`, `isFuture` |
| `lib/contact-projection.ts` | **C10** - `PublicProfile` mapping and the view read path |
| `lib/schemas.ts` | Extended with `rideCreateSchema` and `rideSearchSchema` |
| `services/ride-service.ts` | **C8** - createRide, cancelRide, searchRides, listMyRides, getRideForViewer |

## Decisions worth recording

**Derivations are a separate pure module**, as the completeness gate was in Unit 1. No
framework imports means they are directly unit testable - and this time the tests fall
squarely inside Q20=A's approved scope, because seat availability begins here.

**`seatsRemaining` clamps at zero.** A negative value should be impossible once Unit 3's
guarantee is in place, but if data ever went bad, showing "-1 seats free" would be worse than
showing none.

**`dayRange` uses `setDate` rather than adding 24 hours**, so a day that gains or loses an hour
to daylight saving still spans exactly one calendar day.

**`combineDateAndTime` returns null rather than an Invalid Date**, so the caller reports a
validation failure instead of storing garbage.

**The future-date check lives in the service, not the schema.** It depends on the current
instant, and a schema should stay a pure shape check.

**`rideSearchSchema` is lenient by design** - `.catch(undefined)` on every field. A stale,
shared or hand-edited URL falls back to the prefilled defaults rather than erroring. A search
is a read, and a bad read has a sensible fallback.

**`C8` exposes no `updateRide`.** FR-15 is enforced by the method's absence.

**Unit 2 adds no new `BusinessOutcome` codes.** Everything it can fail with already existed
from Unit 1. `RIDE_FULL` and friends still arrive in Unit 3, as planned.

**The FR-38 cascade insertion point is a named comment in `cancelRide`**, between the status
write and the return, stating that Unit 3's cascade goes exactly there and that the two writes
must become atomic. Designed in, not bolted on.

## Tests - 43 new, 73 total

| Suite | Covers |
|---|---|
| `ride-derivations.test.ts` | Seats remaining at zero, partial, full and beyond capacity; never negative; own-ride; day-range boundaries including month rollover and a DST date; date/time combination; strict future comparison |
| `ride-schemas.test.ts` | Seat bounds 1-8 including coercion from a form string; note length and empty normalisation; malformed date and time; **that a same-area ride is accepted** (BR-2.4); that the schema does *not* check future-ness; lenient search parsing |
| `contact-projection.test.ts` | A `PublicProfile` has **exactly four keys**; no phone or email under any name; **contact fields are dropped even when the input row carries them** |

Two tests assert *decisions* rather than behaviour, so a later change fails loudly:

- **the same-area ride test** - FQ4=B was chosen against my recommendation, so if someone adds
  a same-area rule later, a test fails rather than the choice being silently reversed
- **the contaminated-row test** - the mapping is an allow-list, so widening the view or reading
  the base table by mistake cannot leak contact fields through this path

Unit 1's 30 tests still pass. No regression.
