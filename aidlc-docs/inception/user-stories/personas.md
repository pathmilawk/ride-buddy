# Ride Buddy - User Personas

**Stage**: INCEPTION - User Stories, Part 2 Generation, Phase 1
**Depth**: Detailed (per SQ6=B)
**Source**: `aidlc-docs/inception/requirements/requirements.md`

---

## Why two personas, not three

`requirements.md` FR-7 (from Q5=A) makes the profile `role` field informational: it grants no
permissions, and any signed-in employee may both offer rides and request seats. **Driver** and
**Passenger** are therefore *modes of use*, not separate populations. One person moves between
them freely, sometimes within the same week.

Two archetypes are documented because the two modes differ in one way that matters to the
build: **what they are allowed to see about each other, and when.** A third "Both" persona
would duplicate the other two rather than reveal anything new, so the Both case is documented
as a mode of use in Section 3 instead.

---

## Persona 1: The Driver

**Archetype**: An employee who owns a car, drives to the office anyway, and has spare seats.

### Who they are
Commutes by car most days from a residential area outside the office. Has one to three empty
seats on any given trip. Not looking to make money - Q21=A rules out payments entirely - but
would rather share the drive than travel alone, and is glad to help a colleague who lives
nearby.

### Goals
- Publish a trip they were making regardless, in under a minute
- Fill spare seats with colleagues from a sensible detour
- Keep control over who rides with them
- Not be pestered once the seats are gone

### Motivations
- Company on the commute
- Practical helpfulness toward colleagues in the same area
- Environmental and traffic benefit of fewer cars

### Pain points the product addresses
- Today there is no way to know a colleague lives on their route
- Ad-hoc arrangements over chat get forgotten and are hard to track
- Offering a lift publicly feels awkward; a structured request they can accept or decline
  does not

### Pain points the product deliberately does NOT address
- No cost-splitting, so fuel remains their own contribution (Q21=A)
- No editing a published ride - a wrong departure time means cancel and recreate (FR-15)
- No notification when a request arrives; they must open the app to find out (FR-42)

### What a Driver may see
| About | Before accepting | After accepting |
|---|---|---|
| Requester's name | Visible (FR-27) | Visible |
| Requester's pickup area | Visible (FR-27) | Visible |
| Requester's phone number | **Hidden** (FR-27) | Visible (FR-30) |
| Requester's email | **Hidden** (FR-27) | Visible (FR-30) |

### Constraints they operate under
- Cannot accept more requests than the ride has seats; the limit is enforced in the database,
  so a full ride refuses further acceptances outright (FR-31 to FR-33)
- Cannot request a seat on their own ride (FR-24)
- Cannot un-accept a request once accepted - there is no reversal path (FR-35)
- Must have name, phone, and home area on their profile before publishing (FR-6)

---

## Persona 2: The Passenger

**Archetype**: An employee without a car available, or choosing not to drive today, who lives
near a colleague's route.

### Who they are
Travels to the office from a residential area. May not own a car, may be sharing one at home,
or may simply prefer not to drive. Currently takes public transport or drives alone.

### Goals
- Find out whether anyone is driving from their area on a given day
- Ask for a seat without an awkward personal approach
- Know quickly whether they have a seat, so they can make other arrangements if not
- Reach the driver directly once a seat is confirmed

### Motivations
- A faster or more comfortable journey than the alternative
- Cost saving relative to driving or public transport
- Sociability with colleagues

### Pain points the product addresses
- No visibility today of who is driving from their area
- Asking a colleague for a lift face to face is uncomfortable and hard to withdraw from
- Uncertainty about whether a verbal arrangement still stands

### Pain points the product deliberately does NOT address
- No notification of a decision; they must open the app to check (FR-42)
- No notification if a driver cancels a ride they were accepted on - status will be correct
  when they look, but nothing alerts them (Section 9.2)
- Cannot request two seats to bring a colleague; one seat per request (FR-22)
- Cannot send a message with the request, such as a preferred meeting point (FR-23)

### What a Passenger may see
| About | Before acceptance | After acceptance |
|---|---|---|
| Driver's name | Visible (FR-19) | Visible |
| Ride details: date, time, areas, seats, note | Visible (FR-19) | Visible |
| Driver's phone number | **Hidden** (FR-20) | Visible (FR-30) |
| Driver's email | **Hidden** (FR-20) | Visible (FR-30) |

### Constraints they operate under
- One seat per request (FR-22)
- May hold pending requests on several rides at once and take whichever is accepted first
  (FR-25), but not two active requests on the same ride (FR-26)
- Cannot request a seat on a ride they created (FR-24)
- Must have name, phone, and home area on their profile before requesting (FR-6)
- A pending request is not answered forever: it expires when the ride departs (FR-37)

---

## Section 3: The "Both" mode of use

An employee whose role is set to Both - or indeed any employee, since FR-7 makes role
non-restrictive - moves between the two modes without any change in permissions.

**A realistic pattern**: drives in on Monday and offers two seats; leaves the car at home on
Tuesday and requests a seat from a colleague; drives again Wednesday.

**Why this is not a third persona**: the goals, motivations, and pain points are exactly those
of Driver when offering and exactly those of Passenger when requesting. Nothing is added.

**What it does mean for the build**:
- Both the My Rides and My Requests views must be reachable by every user at all times, never
  gated on the role field (FR-39, FR-40, FR-7)
- The self-request block (FR-24) exists precisely because one account holds both capabilities
- A person may legitimately appear as driver on one ride and requester on another, on the same
  date. Nothing prevents this and nothing should.

---

## Persona to Story Mapping

Completed in Phase 5.10 after `stories.md` is generated. See the Persona Mapping section of
`stories.md`.

---

## A note on who is NOT a persona

- **Administrator** - no admin interface exists (Q21=A). Seed data (TC-6) is the only route to
  bulk content, applied by a developer outside the application.
- **Non-employee / external user** - not a *supported* persona, but per `requirements.md`
  Section 9.1 the POC does not technically exclude one: there is no email-domain restriction,
  so any email address can register. This is a recorded, accepted deviation rather than an
  oversight, and its residual risk is low only because the application stays local (TC-7).
  Worth stating in a personas document, because a reader could otherwise reasonably assume
  "employee" is enforced somewhere. It is not.
