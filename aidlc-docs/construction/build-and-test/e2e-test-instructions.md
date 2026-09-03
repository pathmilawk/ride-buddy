# End-to-End Test Instructions

## Purpose

Walk the eight-step path that `requirements.md` §10 defines as success. Q43=A made this the
definition of done, so this is the acceptance test for the whole project.

**Manual.** Q20=A excluded browser automation. Every step names a `data-testid`, so this
converts to Playwright later without rewriting the steps.

## Prerequisites
- Schema applied (`build-instructions.md` step 3)
- `npm run dev`
- Two browser profiles or windows, so two employees can be signed in at once. Call them **A**
  (the driver) and **B** (the passenger)

---

## The eight steps

### 1. Employee signs in — US-01
As A: open <http://localhost:3000> → redirected to `/sign-in` → **Register** → email and a
password of 8+ characters → submit.

**Expect**: signed in, landed in the app. Any email domain is accepted - that is the recorded
deviation in §9.1, not a bug.

### 2. Completes their profile — US-02, US-04
A is on `/profile`. Fill in name, phone, home area (pick a residential area), role.

**Expect**: `profile-form-submit-button` saves; email is read-only text, not an editable field.

### 3. Creates a ride — US-06
As A: **My rides** → **Offer a ride** → tomorrow's date, a departure time, origin = A's home
area, destination = the office, 1 seat, and a note.

**Expect**: the ride appears in My rides with "1 of 1 free".

> **Also test the gate here.** Register a third employee, skip the profile, and try to publish.
> Expect a redirect to `/profile` with `profile-incomplete-banner` naming the missing fields.
> This is US-04's first demonstrable moment.

### 4. Second employee searches and finds it — US-11, US-12
As B: register, complete the profile with **the same home area as A**.

**Expect**: `/search` is **already prefilled** - origin = B's home area, date = today - and shows
results without touching a filter (BR-2.18). Change the date to tomorrow.

**Expect**: A's ride appears, showing A's name, the route, the time, "1 of 1 free" and the note.

### 5. Requests a seat, with no contact details — US-14, US-13
As B: **Ask for a seat** on A's ride.

**Expect**: `request-status-badge` reads "Waiting for the driver".

> **The assertion that matters**: view source and search for A's phone number. **It must be
> absent.** Not hidden - absent. `public_profiles` has no phone column, so there is nothing to
> hide.

### 6. Driver sees name and area only — US-18, US-13
As A: **My rides** → the ride now shows `ride-request-list` with B's entry.

**Expect**: B's name. **No phone number.** Accept and Decline buttons on the pending request.

### 7. Driver accepts; capacity enforced in the database — US-19, US-22
As A: **Accept**.

**Expect**: the badge becomes "Accepted" and seats remaining drops to "Full".

**Expect**: `request-seat-button` is now unavailable on that ride for anyone else.

> The concurrency half of US-22 cannot be shown by clicking. See
> `integration-test-instructions.md` scenario 1.

### 8. Both see phone and email — US-21, US-27
As A: `request-contact-details` appears under B's accepted request, with `request-contact-phone`
and `request-contact-email`.

As B: **My requests** → the same block with A's details. The phone is a `tel:` link.

**Expect both directions.** FR-30 releases to both parties, not just the passenger.

---

## The demo path is complete when all eight pass without a rough edge

That is Q43=A's bar, quoted from `requirements.md` §10.

---

## Worth walking afterwards

| Check | Story | Expect |
|---|---|---|
| B withdraws the accepted request | US-20 | Confirmation prompt; seat returns to "1 of 1 free" |
| A cancels a ride with an accepted passenger | US-24 | B's request shows "Ride was cancelled" **and A's phone disappears** |
| B asks twice on one ride | US-17 | Second attempt refused |
| A asks for a seat on their own ride | US-15 | No button offered |
| A publishes an Office → Home ride | US-08 | Works identically; direction is just two area ids |
| A ride whose departure has passed | US-10 | Absent from search and My rides |
| Everything at a 360px viewport | US-28 | No horizontal scrolling on any screen |

---

## Converting to automation

Every step above names its `data-testid`; there are 53 across the project, and they are stable by
convention (`{component}-{element-role}`). A Playwright suite would need: two storage-state
fixtures for A and B, a fresh Supabase project or a truncate step between runs, and the same
step sequence. **Nothing in the app needs to change to make it automatable** - that was the point
of applying the testids during code generation rather than retrofitting them.
