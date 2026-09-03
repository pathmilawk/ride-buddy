# Ride Buddy - User Stories

**Stage**: INCEPTION - User Stories, Part 2 Generation
**Methodology**: `aidlc-docs/inception/plans/story-generation-plan.md` (approved)
**Source specification**: `aidlc-docs/inception/requirements/requirements.md`
**Personas**: `aidlc-docs/inception/user-stories/personas.md`

---

## How to read this document

- **Grouping**: feature-based, following the section order of `requirements.md` (SQ1=F)
- **Order within a group**: the order a user meets it along the demo path (SQ1=F)
- **Format**: "As a [persona], I want [capability], so that [benefit]" (SQ3=A)
- **Acceptance criteria**: Gherkin where a story involves state transitions, conditional
  visibility, or concurrency; bullet checklists for straightforward CRUD (SQ4=C)
- **`[DEMO PATH]`**: the story is on the eight-step walkthrough that `requirements.md`
  Section 10 defines as success
- **`[PROMOTED]`**: an edge case raised to a standalone story because it is correctness
  critical or was derived rather than answered directly (SQ7=C). Each cites its parent.
- **Traceability**: every story cites the requirement IDs it satisfies; the coverage matrix
  at the end proves all 42 functional requirements are covered (SQ5=A)

---

# Group 1: Authentication and Profile

## US-01 [DEMO PATH] Sign in to Ride Buddy
**As an** employee, **I want** to sign in with my email address and a password, **so that** my
rides and requests are tied to me and not to a stranger.

**Satisfies**: FR-1, FR-2, FR-3

**Acceptance criteria**
- A new user can register with an email address and a password
- A returning user can sign in with those credentials
- On first successful sign-in, a profile record is created automatically holding the email
- Signing out returns the user to the sign-in screen
- All application screens other than sign-in and registration require a signed-in user
- **Any** email domain is accepted; no company-domain restriction is applied

**Note**: the final criterion is a deliberate deviation from `vision.md`, recorded in
`requirements.md` Section 9.1 and reaffirmed by the product owner. It is stated here as an
acceptance criterion rather than omitted, so that a reader cannot mistake it for a defect or
an unfinished feature.

---

## US-02 [DEMO PATH] Complete my profile
**As an** employee, **I want** to fill in my name, phone number, home area, and role, **so
that** colleagues can recognise me and reach me once we have agreed to share a ride.

**Satisfies**: FR-4, FR-5, FR-7

**Acceptance criteria**
- The profile captures display name, company email, phone number, home/pickup area, and role
- Home area is selected from the seeded area list, never typed as free text
- Role is selected from Driver, Passenger, or Both
- Email is shown from the authenticated account and is not editable
- Saving a valid profile returns the user to where they were going
- Role selection changes nothing about what the user is permitted to do

---

## US-03 Update my profile
**As an** employee, **I want** to change my profile details later, **so that** a new phone
number or a house move does not leave colleagues with stale information.

**Satisfies**: FR-5

**Acceptance criteria**
- A signed-in user can view their own profile
- Name, phone number, home area, and role can all be changed and saved
- A user cannot view or edit another user's profile
- Changes are reflected wherever the user's name or area is displayed

---

## US-04 [PROMOTED] Be stopped before acting with an incomplete profile
**As an** employee, **I want** to be asked for my missing details before I offer or request a
ride, **so that** nobody ends up holding an accepted seat and a blank phone number.

**Satisfies**: FR-6
**Promoted from**: US-02. Standalone because FR-6 was **derived** during Requirements
Analysis rather than answered directly - it is a consequence of choosing lazy profile
creation (Q4=B) - and derived requirements deserve explicit review.

**Acceptance criteria**

```
Given I am signed in and my profile has no phone number
When I attempt to create a ride
Then the action is refused
And I am directed to complete my profile
And I am told which fields are missing

Given I am signed in and my profile has no phone number
When I attempt to request a seat
Then the action is refused
And I am directed to complete my profile

Given I have just completed the missing profile fields
When I retry the action I was refused
Then the action succeeds

Given my profile has name, phone number, and home area
When I create a ride or request a seat
Then no profile prompt appears
```

**Note**: the gate covers exactly the three fields the downstream flows depend on - name,
phone, home area. Role is not gated, because FR-7 makes it non-functional.

---

# Group 2: Areas Reference Data

## US-05 Choose locations from a known list
**As an** employee, **I want** to pick my area from a list rather than typing it, **so that**
my area matches a colleague's exactly and we actually find each other.

**Satisfies**: FR-8, FR-9, FR-10

**Acceptance criteria**
- Areas come from a seeded reference table; the user never types a location
- The same list is offered for a profile home area, a ride origin, and a ride destination
- Office locations appear in the list as ordinary entries
- Matching between any two areas is exact equality on the area identifier
- No free-text or fuzzy location search exists anywhere in the application

**Note**: one shared area table for both trip ends is what makes Office to Home rides
(US-08) work with no additional data model, since direction is emergent rather than stored.

---

# Group 3: Rides

## US-06 [DEMO PATH] Offer a ride to the office
**As a** driver, **I want** to publish a trip I am already making with the seats I have spare,
**so that** a colleague from my area can travel with me instead of alone.

**Satisfies**: FR-11, FR-12, FR-13

**Acceptance criteria**
- Creating a ride captures date, departure time, origin area, destination area, available
  seat count, and an optional note
- Origin and destination are chosen from the seeded area list (US-05)
- Available seats must be a positive whole number
- The date and time must be in the future
- Each ride carries a single date; no recurring or repeating option is offered
- On success the ride appears in the driver's My Rides view
- The created ride becomes discoverable by other employees (US-11)

---

## US-07 Add a note to my ride
**As a** driver, **I want** to add a short note to my ride, **so that** I can pass on the
practical details a form cannot capture, like where to meet or that there is no room for
luggage.

**Satisfies**: FR-14

**Acceptance criteria**
- A ride has one optional free-text note field
- A ride can be created without a note
- Where a note exists it is shown to passengers browsing search results (US-12)
- The note is visible without any request having been made

---

## US-08 Offer a ride home from the office
**As a** driver, **I want** to publish the return leg as its own ride, **so that** colleagues
can travel home with me as well as in.

**Satisfies**: FR-11

**Acceptance criteria**
- A driver can create a ride whose origin is an office area and whose destination is a
  residential area
- The return ride is an independent record with its own date, time, and seat count
- It is not linked to any morning ride and can be cancelled independently
- It is discoverable by the same search that finds inbound rides (US-11)

---

## US-09 Correct a ride I got wrong
**As a** driver, **I want** to cancel a ride and publish a corrected one, **so that** a
mistyped departure time is recoverable even though rides cannot be edited.

**Satisfies**: FR-15, FR-16

**Acceptance criteria**

```
Given I have published an upcoming ride
When I view it
Then no option to edit its details is offered
And an option to cancel it is offered

Given I have published an upcoming ride with no requests
When I cancel it
Then the ride moves to CANCELLED
And it no longer appears in search results

Given I have cancelled a ride
When I create a new ride with corrected details
Then the new ride is published normally
And the cancelled ride remains cancelled
```

**Note**: cancellation of a ride that already has requests has additional consequences for
those passengers - see US-24.

---

## US-10 Stop seeing rides that have already left
**As an** employee, **I want** rides whose departure has passed to disappear from view, **so
that** I am not reading a list of journeys nobody can take.

**Satisfies**: FR-17

**Acceptance criteria**

```
Given a ride whose departure date and time are in the past
When any employee searches for rides
Then that ride does not appear in the results

Given a ride whose departure date and time are in the past
When its driver opens My Rides
Then that ride does not appear

Given a ride has passed
When the underlying data is inspected
Then the ride record still exists and has not been deleted
```

**Note**: "upcoming" is evaluated at query time against the current moment (assumption A-5),
which is what allows this behaviour without any scheduled job.

---

# Group 4: Ride Discovery

## US-11 [DEMO PATH] Search for a ride
**As a** passenger, **I want** to search by date, where I am starting, and where I am going,
**so that** I see only the rides that could actually carry me.

**Satisfies**: FR-18, FR-21

**Acceptance criteria**
- Search accepts a date, an origin area, and a destination area
- Areas are selected from the seeded list (US-05)
- Results include only rides matching all three criteria
- Cancelled rides never appear in results
- Rides whose departure has passed never appear in results (US-10)
- An empty result set is presented as a clear "no rides found" state, not a blank screen

---

## US-12 [DEMO PATH] See enough about a ride to decide
**As a** passenger, **I want** each result to show who is driving, when they leave, and
whether seats remain, **so that** I can judge whether to ask for a seat.

**Satisfies**: FR-19, A-2

**Acceptance criteria**
- Each result shows the driver's name, origin area, destination area, date, departure time,
  seats remaining, and the ride note where one exists
- Seats remaining reflects accepted requests, not requests still pending
- A ride with no seats remaining is shown and clearly marked as full, rather than hidden
- The request action is unavailable on a full ride
- The request action is unavailable on a ride the viewer created (US-15)

**Note**: showing full rides rather than hiding them is assumption A-2. Hiding a ride a
colleague has mentioned would read as a bug; marking it full explains itself.

---

## US-13 [DEMO PATH] Not be able to see contact details I have not earned
**As an** employee, **I want** colleagues' phone numbers and email addresses to stay private
until we have actually agreed to share a ride, **so that** browsing the app is not a way to
collect everyone's personal contact details.

**Satisfies**: FR-20

**Acceptance criteria**

```
Given I am signed in and browsing search results
When I view any ride I have no accepted request on
Then the driver's name is visible
And the driver's phone number is not visible
And the driver's email address is not visible

Given I am a driver viewing pending requests on my ride
When I view a request I have not yet accepted
Then the requester's name and pickup area are visible
And the requester's phone number is not visible
And the requester's email address is not visible
```

**Note**: enforcement of this rule at the API layer, not merely in the interface, is
specified separately as US-27. That distinction is the difference between a hidden field and
an absent one.

---

# Group 5: Seat Requests

## US-14 [DEMO PATH] Request a seat
**As a** passenger, **I want** to ask for a seat on a ride that suits me, **so that** I can
travel with a colleague instead of making my own way.

**Satisfies**: FR-22, FR-23

**Acceptance criteria**
- A passenger can request a seat on any upcoming ride with seats remaining
- Each request is for exactly one seat; no seat quantity is offered
- No message or note field is offered with the request
- On success the request is created with status PENDING
- The request appears in the passenger's My Requests view (US-26)
- The request appears to the driver in their ride's request list (US-18)
- The passenger sees no contact details for the driver at this point (US-13)

---

## US-15 [PROMOTED] Not be able to request my own ride
**As a** driver, **I want** the app to stop me requesting a seat in my own car, **so that** I
do not create a nonsensical request in front of colleagues.

**Satisfies**: FR-24
**Promoted from**: US-14. Standalone because the requirement specifies enforcement at the
server, not only in the interface, which is a distinct verifiable behaviour.

**Acceptance criteria**

```
Given I am viewing a ride I created
When the ride is displayed in search results or in detail
Then no request action is offered

Given I am the driver of a ride
When a seat request for that ride is submitted directly to the server, bypassing the interface
Then the request is refused
And no request record is created
```

---

## US-16 Ask several drivers at once
**As a** passenger, **I want** to have requests outstanding on more than one ride, **so that**
I am not stuck waiting on a single driver who may never answer.

**Satisfies**: FR-25

**Acceptance criteria**
- A passenger may hold PENDING requests on several different rides simultaneously
- Requests on different rides may be for the same date
- Accepting one request does not automatically withdraw the passenger's others
- All of a passenger's pending requests are listed in My Requests (US-26)

**Note**: because accepting one request leaves the others pending, a passenger may end up
accepted on two rides for the same date. This is deliberate - Q11=A - and the passenger is
expected to withdraw the surplus themselves (US-20).

---

## US-17 [PROMOTED] Not be able to request the same ride twice
**As a** passenger, **I want** a second request on a ride I have already asked about to be
refused, **so that** I do not clutter a driver's list or distort their seat count.

**Satisfies**: FR-26, A-1
**Promoted from**: US-14. Standalone because FR-26 was **derived** rather than answered -
Q11=A permitted multiple requests across different rides but was silent on repeats of the
same ride - and because an unchecked duplicate would corrupt the seat arithmetic in US-22.

**Acceptance criteria**

```
Given I already have a PENDING request on a ride
When I attempt to request a seat on that same ride again
Then the attempt is refused
And I am told I already have a request on this ride

Given I already have an ACCEPTED request on a ride
When I attempt to request a seat on that same ride again
Then the attempt is refused

Given my earlier request on a ride was REJECTED or WITHDRAWN
When I request a seat on that ride again
Then the request is created normally
```

**Note**: the final criterion matters. Only an *active* request blocks a repeat. A passenger
who withdrew by mistake, or was rejected before a seat freed up, can ask again.

---

## US-18 [DEMO PATH] Review who has asked for a seat
**As a** driver, **I want** to see who has requested a seat and where they are starting from,
**so that** I can judge whether the detour works before I commit.

**Satisfies**: FR-27

**Acceptance criteria**

```
Given I have a ride with pending requests
When I view the ride
Then each request shows the requester's name
And each request shows the requester's pickup area
And no requester's phone number is shown
And no requester's email address is shown
And each request shows its current status
```

**Note**: name and pickup area are what the decision actually needs - whether the detour is
reasonable. Nothing further is exposed before acceptance.

---

## US-19 [DEMO PATH] Accept or reject a request
**As a** driver, **I want** to accept or decline each request, **so that** I keep control of
who travels in my car.

**Satisfies**: FR-28

**Acceptance criteria**

```
Given I have a PENDING request on my ride and a seat is available
When I accept it
Then the request status becomes ACCEPTED
And the ride's seats remaining decreases by one

Given I have a PENDING request on my ride
When I reject it
Then the request status becomes REJECTED
And the ride's seats remaining is unchanged
And the passenger is not told a reason

Given a request on my ride is already ACCEPTED
When I view it
Then no option to un-accept or reverse it is offered

Given a request is on a ride I did not create
When I attempt to accept or reject it
Then the attempt is refused
```

**Note**: acceptance is irreversible by design. With no messaging (FR-23) there would be no
way to explain a reversal to the passenger, so the path does not exist.

---

## US-20 Withdraw my request
**As a** passenger, **I want** to take back a request I no longer need, **so that** I am not
holding a seat a colleague could use.

**Satisfies**: FR-29

**Acceptance criteria**

```
Given I have a PENDING request
When I withdraw it
Then the request status becomes WITHDRAWN
And it no longer appears in the driver's pending list

Given I have an ACCEPTED request
When I withdraw it
Then the request status becomes WITHDRAWN
And the ride's seats remaining increases by one

Given a request belongs to another passenger
When I attempt to withdraw it
Then the attempt is refused
```

**Note**: the second criterion returns the seat to the pool. Without it, a passenger changing
their plans would silently shrink the ride's capacity for everyone else.

---

## US-21 [DEMO PATH] Exchange contact details once a seat is agreed
**As an** employee, **I want** to see the other person's phone number and email once a request
is accepted, **so that** we can arrange the pickup directly.

**Satisfies**: FR-30

**Acceptance criteria**

```
Given my request on a ride has been ACCEPTED
When I view that ride or my request
Then the driver's phone number is visible
And the driver's email address is visible

Given I am a driver and I have accepted a request on my ride
When I view that request
Then the requester's phone number is visible
And the requester's email address is visible

Given a request is PENDING, REJECTED, WITHDRAWN, EXPIRED, or CANCELLED
When either party views it
Then no phone number or email address is visible to them
```

**Note**: the third criterion is the one most easily missed. Contact details are visible for
ACCEPTED requests only - a rejected or withdrawn request closes the window again.

---

# Group 6: Seat Capacity (Correctness Critical)

## US-22 [PROMOTED] [DEMO PATH] Never have a ride overbooked
**As a** driver, **I want** it to be impossible to accept more passengers than I have seats,
**so that** nobody is left standing on the pavement because two people were promised the same
seat.

**Satisfies**: FR-31, FR-32, FR-33
**Promoted from**: US-19. Standalone because `requirements.md` identifies this as the only
requirement in the system where a plausible race condition produces a silently wrong result,
and because FR-33 explicitly rules out application-layer checking as sufficient.

**Acceptance criteria**

```
Given my ride has 3 seats and 3 accepted requests
When I attempt to accept a fourth request
Then the attempt fails
And I am told the ride is full
And the fourth request remains PENDING

Given my ride has exactly 1 seat remaining and two PENDING requests
When both acceptances are submitted at the same moment
Then exactly one succeeds
And the other fails with a "ride is full" error
And the ride has exactly 1 accepted request more than before
And seats remaining is never negative

Given the seat limit is bypassed at the application layer
When an acceptance would exceed the ride's seat count
Then the database itself refuses the write
```

**Note on why this is singled out.** Because every request is for exactly one seat (FR-22),
enforcement reduces to keeping a row count below a stored integer - expressible as a
constraint or a short transaction. The third criterion is the substance of FR-33: a check in
application code that reads the count and then writes cannot exclude a concurrent writer
between those two operations. This is cheap to do correctly and conspicuous when wrong.

---

# Group 7: Lifecycle and State

## US-23 Have a request that was never answered come to a close
**As a** passenger, **I want** a request nobody answered to stop showing as pending once the
ride has left, **so that** my list reflects reality.

**Satisfies**: FR-36, FR-37

**Acceptance criteria**

```
Given I have a PENDING request on a ride departing later today
When the departure time has not yet passed
Then the request remains PENDING
And no expiry warning is shown

Given I have a PENDING request on a ride whose departure has passed
When I view My Requests
Then the request is treated as EXPIRED
And it is not shown among my upcoming requests

Given a ride's departure is several hours away
When any time passes short of that departure
Then no request is expired early
```

**Note**: the third criterion records a deliberate absence. Requests are not expired ahead of
departure (Q33=A), which is what removes the need for any scheduled job - expiry is derived
at read time from the ride's departure.

---

## US-24 [PROMOTED] Know where I stand when a driver cancels
**As a** passenger who had an accepted seat, **I want** the cancelled ride to show clearly as
cancelled, **so that** I do not turn up expecting a lift that is not coming.

**Satisfies**: FR-38
**Promoted from**: US-09. Standalone because FR-38 was **derived** during Requirements
Analysis to close an open design point, and because it is the one place where a driver's
action silently changes another person's state.

**Acceptance criteria**

```
Given a ride has both PENDING and ACCEPTED requests
When the driver cancels the ride
Then every PENDING request on it moves to CANCELLED
And every ACCEPTED request on it moves to CANCELLED
And no request on that ride remains PENDING or ACCEPTED

Given my accepted request was cancelled because the driver cancelled the ride
When I view My Requests
Then the request shows as cancelled
And the driver's phone number is no longer visible to me

Given a ride has been cancelled
When any employee searches for rides
Then it does not appear in results
```

**Known limitation**: nothing notifies the passenger. With no notifications at all (FR-42),
they learn of the cancellation only by opening the app. This is recorded in
`requirements.md` Section 9.2 as an accepted POC limitation. What FR-38 guarantees is that
the status they eventually see is correct - not that they see it promptly.

---

# Group 8: User Views

## US-25 See the rides I am driving
**As a** driver, **I want** one place showing my upcoming rides and who has asked to join,
**so that** I can deal with requests without hunting for them.

**Satisfies**: FR-39, FR-41, FR-34, FR-35

**Acceptance criteria**
- My Rides lists rides created by the signed-in user
- Only upcoming rides are listed; past rides are excluded (US-10)
- Each ride shows date, departure time, both areas, seats remaining, and its status
- Each ride lists its requests with requester name, pickup area, and request status
- Request statuses shown are drawn from PENDING, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED,
  and CANCELLED
- Accept and reject actions are available on pending requests (US-19)
- A cancel action is available on the ride (US-09)
- The view is reachable by every signed-in user regardless of their role field

---

## US-26 See the rides I have asked to join
**As a** passenger, **I want** one place showing my requests and where each one stands, **so
that** I know whether I have a way to work tomorrow.

**Satisfies**: FR-40, FR-41, FR-42, FR-35

**Acceptance criteria**
- My Requests lists requests made by the signed-in user
- Only requests on upcoming rides are listed (US-10, US-23)
- Each entry shows the ride's date, departure time, both areas, the driver's name, and the
  request status
- For ACCEPTED requests the driver's phone number and email are shown (US-21)
- For all other statuses no contact details are shown (US-13)
- A withdraw action is available on pending and accepted requests (US-20)
- Status is discoverable only by opening this view; nothing is sent by email or push
- The view is reachable by every signed-in user regardless of their role field

---

# Group 9: Observable Non-Functional Behaviour

Per SQ8=B, non-functional requirements become stories only where a user can observe the
effect. NFR-2 and NFR-5 qualify. The remainder are listed as cross-cutting constraints below.

## US-27 Have my contact details withheld at the source
**As an** employee, **I want** my phone number to be absent from what the server sends, not
merely hidden by the screen, **so that** it cannot be read out of the app's network traffic by
someone who knows how to look.

**Satisfies**: NFR-2, and enforces FR-20 and FR-30

**Acceptance criteria**

```
Given I am signed in and browsing rides
When the application requests ride data from the server
Then the response contains no phone number or email address for any driver
And this holds regardless of what the interface chooses to display

Given I am a driver viewing pending requests
When the application requests those requests from the server
Then the response contains no phone number or email address for any requester

Given a request between me and another employee is ACCEPTED
When the application requests that request from the server
Then the response contains that employee's phone number and email address

Given I attempt to read another employee's profile directly
When I have no accepted request linking us
Then the read is refused or returns no contact fields
```

**Note**: this is the story that makes US-13 real. A field hidden with CSS or omitted from a
component is still in the payload. Given the accepted open-signup deviation
(`requirements.md` Section 9.1), server-side projection is the principal control protecting
employee contact data, which is why it carries its own acceptance criteria.

---

## US-28 Use Ride Buddy on my phone
**As an** employee, **I want** the app to work properly on the phone in my hand, **so that** I
can offer or request a ride while I am walking to the car park.

**Satisfies**: NFR-5

**Acceptance criteria**
- All screens are usable at a typical phone viewport width without horizontal scrolling
- Search, ride creation, and accept/reject actions are all operable on a touch screen
- Tap targets are large enough to hit reliably
- The same screens remain usable at desktop width

---

# Cross-Cutting Constraints (not stories)

Per SQ8=B, these apply to every story above and are stated once rather than restated as
stories, because no user can directly observe them as behaviour.

| ID | Constraint |
|---|---|
| NFR-1 | Authorization enforced in two independent layers: Postgres RLS policies and server-side checks |
| NFR-3 | Seat capacity enforced in the database (has an observable story: US-22) |
| NFR-4 | Design assumes fewer than 50 employees; no performance engineering |
| NFR-6 | Unit tests cover seat availability and request state transitions |
| NFR-7 | English only, single local timezone |
| NFR-8 | Console-level logging |
| NFR-9 | POC privacy posture: no self-service deletion, no retention policy |
| TC-1 | Single Next.js application; API routes serve as the Node.js backend |
| TC-2 | TypeScript throughout |
| TC-3 | Tailwind CSS with shadcn/ui |
| TC-4 | Supabase cloud for database and authentication |
| TC-5 | Schema as migration SQL files under `supabase/migrations/` |
| TC-6 | Seed script provides demo employees, areas, and rides |
| TC-7 | Local development only |
| TC-8 | Application code at workspace root; `aidlc-docs/` is documentation only |

---

# Persona Mapping

| Persona | Primary stories | Shared stories |
|---|---|---|
| **Driver** | US-06, US-07, US-08, US-09, US-18, US-19, US-22, US-25 | US-01, US-02, US-03, US-04, US-05, US-10, US-13, US-21, US-27, US-28 |
| **Passenger** | US-11, US-12, US-14, US-15, US-16, US-17, US-20, US-23, US-24, US-26 | US-01, US-02, US-03, US-04, US-05, US-10, US-13, US-21, US-27, US-28 |

**Both mode of use**: every story is reachable by any signed-in employee. US-25 and US-26
explicitly require that neither view is gated on the role field, and US-15 exists precisely
because one account holds both capabilities. See `personas.md` Section 3.

---

# Demo Path Coverage

`requirements.md` Section 10 defines success as an eight-step walkthrough. Each step maps to
at least one `[DEMO PATH]` story:

| # | Demo step | Story |
|---|---|---|
| 1 | Employee signs in | US-01 |
| 2 | Completes their profile | US-02 (gate: US-04) |
| 3 | Creates a ride from home area to office | US-06 |
| 4 | Second employee searches and finds it | US-11, US-12 |
| 5 | Requests a seat, no contact details yet | US-14, US-13 |
| 6 | Driver sees request with name and area only | US-18 |
| 7 | Driver accepts; capacity enforced in database | US-19, US-22 |
| 8 | Both see each other's phone and email | US-21 |

All eight steps are covered. Eleven stories carry the `[DEMO PATH]` tag.

---

# Requirements Coverage Matrix

| Requirement | Covered by |
|---|---|
| FR-1 | US-01 |
| FR-2 | US-01 |
| FR-3 | US-01 |
| FR-4 | US-02 |
| FR-5 | US-02, US-03 |
| FR-6 | US-04 |
| FR-7 | US-02 |
| FR-8 | US-05 |
| FR-9 | US-05 |
| FR-10 | US-05 |
| FR-11 | US-06, US-08 |
| FR-12 | US-06 |
| FR-13 | US-06 |
| FR-14 | US-07 |
| FR-15 | US-09 |
| FR-16 | US-09 |
| FR-17 | US-10 |
| FR-18 | US-11 |
| FR-19 | US-12 |
| FR-20 | US-13, US-27 |
| FR-21 | US-11 |
| FR-22 | US-14 |
| FR-23 | US-14 |
| FR-24 | US-15 |
| FR-25 | US-16 |
| FR-26 | US-17 |
| FR-27 | US-18 |
| FR-28 | US-19 |
| FR-29 | US-20 |
| FR-30 | US-21, US-27 |
| FR-31 | US-22 |
| FR-32 | US-22 |
| FR-33 | US-22 |
| FR-34 | US-25 |
| FR-35 | US-25, US-26 |
| FR-36 | US-23 |
| FR-37 | US-23 |
| FR-38 | US-24 |
| FR-39 | US-25 |
| FR-40 | US-26 |
| FR-41 | US-25, US-26 |
| FR-42 | US-26 |
| NFR-2 | US-27 |
| NFR-5 | US-28 |
| A-1 | US-17 |
| A-2 | US-12 |
| A-5 | US-10 |

**All 42 functional requirements are covered.** Remaining NFRs and all TCs are carried as
cross-cutting constraints above. Assumptions A-3, A-4, and A-6 are environment and setup
concerns with no user-observable behaviour, so they carry no story.

---

**28 stories. 11 on the demo path. 5 promoted edge cases (US-04, US-15, US-17, US-22, US-24).**

---

# INVEST Verification

Per plan Phase 5.3 to 5.9. Each criterion was checked against all 28 stories. Findings are
reported honestly, including where a story is borderline.

| Criterion | Result | Notes |
|---|---|---|
| **Independent** | 23 fully / 5 qualified | See the qualification below. |
| **Negotiable** | 28/28 | Every story states an outcome, not an implementation. The one story that names a mechanism, US-22 ("the database itself refuses the write"), does so because FR-33 makes the mechanism the requirement - application-layer checking is explicitly ruled out as insufficient. |
| **Valuable** | 28/28 | Every story carries an explicit `so that` clause naming a benefit to a persona. Verified programmatically: 28/28 open in Connextra form. |
| **Estimable** | 28/28 | Every story has bounded scope and cites the requirements it satisfies. |
| **Small** | 26 clear / 2 largest | US-25 and US-26 each carry 8 acceptance criteria. Both remain single user-visible outcomes - one screen apiece - so they are kept whole rather than split into artificial fragments. |
| **Testable** | 28/28 | Every story has acceptance criteria. 14 use Gherkin for state transitions, conditional visibility, and concurrency; the rest use verifiable bullet checklists. |

### Qualification on Independence

Five stories are the promoted edge cases (US-04, US-15, US-17, US-22, US-24). Each is
**independently valuable and independently testable**, but none is independently *deliverable*
- US-22 has nothing to enforce until US-19 exists, and US-04 has nothing to gate until US-02
and US-06 exist.

This is a consequence of the approved SQ7=C methodology, which promoted them deliberately:
they are correctness-critical or were derived rather than user-answered, and burying them as
sub-bullets inside a parent story would have hidden exactly the behaviour that most needs
review. Each declares its parent explicitly (verified: 5/5).

Recording this rather than claiming a clean 28/28 on Independence, because the trade-off was
chosen rather than overlooked.

### Verification Performed

Checked programmatically before this section was written:

| Check | Result |
|---|---|
| Story identifiers contiguous US-01 to US-28, no gaps or duplicates | PASS |
| Every story carries a `**Satisfies**` requirement citation | 28/28 |
| All functional requirements covered by at least one story | 42/42 |
| Every story cited in the coverage matrix exists | 28/28, no dangling references |
| Every FR referenced in a story exists in `requirements.md` | PASS |
| Promoted stories declare their parent story | 5/5 |
| Stories in Connextra format | 28/28 |
| Demo path stories tagged | 11 |
| Gherkin blocks where SQ4=C requires them | 14 |
