# Integration Test Instructions

## Purpose

Test interactions across the three units, and the four rules the database enforces that no unit
test can reach.

**Scenarios 1 to 4 and 6 are now AUTOMATED** in `scripts/verify-live.mjs`:

```bash
npm run verify:live     # 17 checks, self-cleaning
```

It creates fixtures under a reserved UUID prefix and removes them afterwards, so it never
touches demo data or a real account. **All 17 pass**, including the concurrency guarantee that
no unit test can reach.

The manual procedures below are kept because they exercise the paths through the **UI** rather
than the database, and because reading them explains what the script asserts.

**Prerequisite for all of them**: the schema applied (see `build-instructions.md` step 3) and two
registered employee accounts, since profiles cannot be seeded.

---

## SCENARIO 1 - The capacity guarantee under concurrency

> **This is the single highest-value check in the project.** FR-31 to FR-33 is the only
> correctness-critical requirement, `0007_accept_request_function.sql` is where it lives, and no
> unit test can exercise it. If you run one thing, run this.

### Setup
1. Employee A publishes a ride with **exactly 1 seat**
2. Employees B and C each ask for a seat - the ride now has 2 pending requests and 1 seat
3. In the Supabase SQL Editor, note the ride id and both request ids

### Test - two concurrent acceptances against one seat

Open **two** SQL Editor tabs. In each, paste one block. Run the `begin` and `select` lines in
**tab 1 first**, then the whole of tab 2, then tab 1's remainder.

Tab 1:
```sql
begin;
select accept_ride_request('<REQUEST_ID_B>');   -- run this, then switch tabs
-- ... after tab 2 has been started and is waiting:
commit;
```

Tab 2:
```sql
select accept_ride_request('<REQUEST_ID_C>');   -- this should BLOCK until tab 1 commits
```

### Expected results
- **Tab 1 returns `OK`**
- **Tab 2 blocks** while tab 1's transaction is open - this is the row lock doing its job
- **After tab 1 commits, tab 2 returns `RIDE_FULL`**
- Final state: exactly **one** accepted request

```sql
select status, count(*) from ride_requests where ride_id = '<RIDE_ID>' group by status;
-- expect: accepted 1, pending 1
```

### What a failure looks like
If **both** return `OK`, the ride is overbooked and the guarantee is broken. That is the exact
failure mode `0007` documents as the reason a single conditional `UPDATE` was rejected.

### Cleanup
```sql
delete from ride_requests where ride_id = '<RIDE_ID>';
delete from rides where id = '<RIDE_ID>';
```

---

## SCENARIO 2 - Contact disclosure across the view / policy / type boundary

Tests FR-20 and FR-30, which span all three units.

### Test steps
1. As B, search and find A's ride. **Confirm no phone number is anywhere on the page** - view
   source and search for A's number, do not just look
2. As B, ask for a seat
3. As A, open My rides. **Confirm B's name and pickup area appear and B's phone does not**
4. As A, accept
5. As B, open My requests. **A's phone and email now appear**
6. As A, open My rides. **B's phone and email now appear**

### Direct probe - the assertion that matters most
With B's session, in the browser console on any authenticated page:
```js
// Before acceptance this must return no row; after acceptance, exactly A's row.
const { data } = await window.__supabase.from('profiles').select('id,phone,email').eq('id','<A_ID>');
console.log(data);
```
If `window.__supabase` is not exposed, use the Supabase SQL Editor's "run as authenticated user"
or check the network tab: **no response payload should contain a phone number before step 4.**

### Expected result
The disclosure boundary holds at the **database**, not just the UI. A phone number is absent from
the payload before acceptance, present after - and it closes again if the request is later
withdrawn.

---

## SCENARIO 3 - The cancellation cascade

Tests FR-38 and the `rides_cancel_cascade` trigger.

1. A publishes a ride; B asks; A accepts. **Confirm B sees A's phone**
2. A cancels the ride, confirming the prompt
3. As B, open My requests

**Expected**: B's request shows **"Ride was cancelled"**, and **A's phone number is gone** - the
cascade changed the status, so the accepted-pair policy stopped matching. Nothing had to
un-share anything.

```sql
select status from ride_requests where ride_id = '<RIDE_ID>';
-- expect every row 'cancelled', none 'pending' or 'accepted'
```

**Known limitation**: B was not notified (FR-42, §9.2). They learn of it by looking.

---

## SCENARIO 4 - Duplicate request prevention

Tests FR-26 / A-1 and the partial unique index.

1. B asks for a seat on A's ride
2. B tries again - **expect "You have already asked to join this ride"**
3. A declines the request
4. B asks again - **expect success**, because only an *active* request blocks a repeat (US-17)

---

## SCENARIO 5 - The completeness gate across units

Tests FR-6 at both of its two call sites (BR-1.10).

1. Register a fresh employee; **do not complete the profile**
2. Try to publish a ride → **redirected to the profile page, with the missing fields named**
3. Complete the profile, return, publish → **succeeds**
4. Try to ask for a seat with a fresh incomplete account → **same redirect**

This is the first point US-04 is demonstrable through the UI; in Unit 1 the gate existed with
nothing to gate.

---

## SCENARIO 6 - Self-request refused server-side

Tests FR-24 / BR-3.4, whose story requires enforcement beyond hiding the button.

1. As A, search and find your own ride - **no request button is offered**
2. Post the request directly, bypassing the UI:
```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/ride_requests" \
  -H "apikey: $KEY" -H "Authorization: Bearer <A_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ride_id":"<A_OWN_RIDE_ID>","passenger_id":"<A_ID>"}'
```

**Expected**: refused. Note the insert policy alone permits this (it only checks
`passenger_id = auth.uid()`), so **the service check is what enforces BR-3.4** - which is why
US-15 was promoted to its own story. If this succeeds, the UI is the only guard and the story is
unmet.

---

## Cleanup

```sql
delete from ride_requests;
delete from rides;
-- profiles and auth users: delete via Supabase Auth → Users
```

`areas` can be left; `seed.sql` is re-runnable.

---

## Coverage summary

| Rule | Automated | Manual scenario |
|---|---|---|
| Seat capacity under concurrency (FR-31 to FR-33) | **No** | **1 - highest priority** |
| Contact disclosure (FR-20, FR-30) | Type half only | 2 |
| Cancellation cascade (FR-38) | No | 3 |
| Duplicate prevention (FR-26) | No | 4 |
| Completeness gate (FR-6) | Logic only | 5 |
| Self-request refusal (FR-24) | No | 6 |

Every row's left column is why the right column exists.
