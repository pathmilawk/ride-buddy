# Security Test Instructions

## Scope, and one thing to be clear about first

The Security Baseline extension was **opted out** at Requirements Analysis (Q22=B), so no
extension rule was enforced anywhere in this project. This file is not a substitute for that
review. It covers the checks worth running given what the design actually claims.

**Two things a reader should know before trusting anything here:**

1. **There is no company-affiliation check.** Any email address can register. This is a recorded,
   reaffirmed decision (`requirements.md` §9.1), not a gap - and it is **BLOCKING before any
   public deployment**.
2. **No security review has been enforced.** Q22=B skipped it. That was reasonable for a
   local-only POC and is worth stating plainly rather than leaving implied.

---

## CHECK 1 - Contact data cannot be read without an accepted request

The most important check, because it is the control that partly offsets check-1-above's open
signup.

### 1a. Direct table read as a signed-in stranger
With B's access token, and **no** accepted request linking B to A:
```bash
curl "$URL/rest/v1/profiles?select=id,phone,email&id=eq.<A_ID>" \
  -H "apikey: $KEY" -H "Authorization: Bearer <B_TOKEN>"
```
**Expect `[]`** - the empty array, not a row with nulls. `profiles_select_own` and
`profiles_select_accepted_counterparty` both fail to match, so no row is returned.

### 1b. The public view cannot be coaxed into returning contact columns
```bash
curl "$URL/rest/v1/public_profiles?select=*" -H "apikey: $KEY" -H "Authorization: Bearer <B_TOKEN>"
curl "$URL/rest/v1/public_profiles?select=phone" -H "apikey: $KEY" -H "Authorization: Bearer <B_TOKEN>"
```
**Expect**: the first returns id, display_name, home_area_id, role and nothing else. The second
**errors** - `phone` is not a column of the view. That is FR-20 enforced by shape.

### 1c. After acceptance, and only then
Repeat 1a once A has accepted B's request. **Expect exactly A's row.** Then have B withdraw and
repeat: **expect `[]` again**. Disclosure follows state (BR-3.25).

---

## CHECK 2 - Ride and request ownership cannot be forged

### 2a. Publish a ride as someone else
```bash
curl -X POST "$URL/rest/v1/rides" -H "apikey: $KEY" -H "Authorization: Bearer <B_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"driver_id":"<A_ID>","origin_area_id":"...","destination_area_id":"...","departs_at":"2026-12-01T07:00:00Z","seats":2}'
```
**Expect refused** by `rides_insert_own`.

### 2b. Accept a request on someone else's ride
```bash
curl -X POST "$URL/rest/v1/rpc/accept_ride_request" -H "apikey: $KEY" \
  -H "Authorization: Bearer <B_TOKEN>" -H "Content-Type: application/json" \
  -d '{"p_request_id":"<REQUEST_ON_As_RIDE>"}'
```
**Expect `"NOT_FOUND"`.** The function is SECURITY INVOKER, so B's `for update` on A's ride finds
no row - PostgreSQL requires the UPDATE policy to pass for a row lock. Note it reports NOT_FOUND
rather than a permission error, which is the safe failure.

### 2c. Withdraw someone else's request
```bash
curl -X PATCH "$URL/rest/v1/ride_requests?id=eq.<Bs_REQUEST>" \
  -H "apikey: $KEY" -H "Authorization: Bearer <C_TOKEN>" \
  -H "Content-Type: application/json" -d '{"status":"withdrawn"}'
```
**Expect refused** - C is neither the passenger nor the ride's driver.

---

## CHECK 3 - The capacity guarantee cannot be bypassed

```bash
# Set a request to accepted directly, skipping the function
curl -X PATCH "$URL/rest/v1/ride_requests?id=eq.<REQUEST_ID>" \
  -H "apikey: $KEY" -H "Authorization: Bearer <A_TOKEN>" \
  -H "Content-Type: application/json" -d '{"status":"accepted"}'
```

**This one will SUCCEED, and that is worth understanding.** `ride_requests_update_as_driver`
permits a ride's driver to update requests on their ride, so a driver *can* set `accepted`
directly and overbook their own ride.

**Assessment**: not a vulnerability in the threat model. A driver overbooking their own car harms
only themselves and their passengers, both of whom they are in direct contact with. BR-3.11's
"only path" claim is about **application code**, and it holds - `acceptWithCapacityGuarantee` is
the only route the app uses.

**Recorded as a limitation, not fixed.** Closing it would need a `check` constraint or a
BEFORE-UPDATE trigger validating capacity on any transition into `accepted`. Worth doing if this
leaves POC scope; noted here rather than discovered later.

---

## CHECK 4 - Dependency vulnerabilities

```bash
npm audit
```

**Current**: 2 remaining, both `postcss` reached through `next`'s own tree. Build-time only,
processing this project's own CSS. Clearing them needs Next 16, a major upgrade to the approved
stack (TC-1). Deliberately not applied; recorded as follow-up.

Five were cleared during Unit 1 by bumping `vitest` and `postcss`.

---

## CHECK 5 - No secret is exposed to the browser

```bash
grep -rn "sb_secret\|service_role" .env.local .next/static 2>/dev/null
```
**Expect no match.** The app needs no secret key and `.env.example` says so explicitly. Only the
publishable key reaches the browser, which is what it is for.

Also confirm `.env.local` is ignored: `git check-ignore -v .env.local`.

---

## Summary

| Check | Status |
|---|---|
| 1 Contact data unreadable without acceptance | Procedure written, **not yet run** |
| 2 Ownership unforgeable | Procedure written, **not yet run** |
| 3 Capacity bypass | **Known limitation, documented above** |
| 4 Dependency audit | Run: 2 remaining, both assessed |
| 5 No secret exposed | Verified during Build and Test |

Checks 1 and 2 need the schema applied and two access tokens. They are the ones to run first.
