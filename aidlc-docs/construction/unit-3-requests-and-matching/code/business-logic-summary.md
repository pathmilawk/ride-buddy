# Business Logic Summary - Unit 3

**Plan steps**: 5 (generation), 6 (tests), 7 (this summary) · **Components**: C9, C10, C12

## Files

| File | Purpose |
|---|---|
| `lib/request-transitions.ts` | Pure: `canAccept`, `canReject`, `canWithdraw`, `isTerminal`, `displayStatus`, `displayGroup` |
| `services/ride-request-service.ts` | **C9** - the full lifecycle |
| `lib/contact-projection.ts` | **Modified** - the accepted-pair branch |
| `lib/result.ts` | **Modified** - four new outcome codes |
| `lib/types.ts` | **Modified** - request types, `AcceptedContact`, and `RideListItem` gains the viewer's own request |
| `services/ride-service.ts` | **Modified** - `cancelRide` comment rewritten; `toListItems` populates the new fields |

## Decisions worth recording

**`accepted` is not terminal.** It is irreversible *by the driver* (BR-3.15 - there is no
un-accept, because with no messaging there would be no way to explain a reversal), but the
passenger may still withdraw. Treating it as terminal would silently remove their only exit, so
`isTerminal` excludes it and a test asserts that explicitly.

**`acceptRequest` performs no capacity check.** It calls the guarded operation and translates the
outcome. Adding a check would recreate the window FR-33 rejects and make it ambiguous which check
is authoritative (BR-3.10).

**The two ownership checks are stated per flow, not shared.** Accept and reject check the
**ride's** owner; withdraw checks the **request's** owner. Confusing them would let a driver
withdraw a passenger's request or a passenger answer their own, so a test asserts the guards are
not interchangeable.

**`AcceptedContact` is a distinct type from `PublicProfile`** (BR-3.27). Holding one *is* the
proof that disclosure was authorised, so a component rendering a phone number can only have been
given one deliberately. A test uses `@ts-expect-error` to assert a `PublicProfile` is not
assignable to it - the type boundary is part of the control, not a convenience.

**`findAcceptedContact` performs no acceptance check.** The RLS policy is the check; duplicating
it here would give the rule a second home - the same mistake BR-3.10 warns about for capacity.
Returning null means "no such profile, or no accepted link", and the caller need not distinguish
them.

**`displayStatus` returns terminal statuses unchanged after departure.** A request rejected before
the ride left was rejected, not expired. Rewriting that history would lose the distinction a
passenger most cares about, which with no notifications (FR-42) is the only signal they get.

**The `cancelRide` comment was rewritten, not deleted** (BR-3.21). It now names
`rides_cancel_cascade`, explains why a trigger was chosen over the service call Unit 2 had
anticipated, and says explicitly not to add one. A trigger's cost is invisibility at the call
site; that comment is the mitigation.

## Tests - 28 new, 101 total

| Suite | Covers |
|---|---|
| `request-transitions.test.ts` | Every legal transition permitted and **every illegal one refused**; `accepted` not terminal; the guards proven non-interchangeable; nothing permitted from `cancelled` |
| `request-expiry.test.ts` | Pending + departed = expired, at the instant not after; every terminal status unchanged by departure; **the same row reporting different statuses as time passes with nothing having run** - the property that makes a job unnecessary |
| `accepted-contact-projection.test.ts` | `PublicProfile` still carries no contact fields after Unit 3; `AcceptedContact` does; the two are not assignable |

Units 1 and 2's 73 tests still pass. No regression.

**The honest limit**: these cover the pure transition and expiry logic. **The concurrency
contract is not tested** - it needs two simultaneous transactions against a live database.
