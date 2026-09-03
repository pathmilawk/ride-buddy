/**
 * Domain types for Unit 1 Foundation.
 * Source: functional-design/domain-entities.md
 *
 * Database columns are snake_case; these domain types are camelCase. Repositories are the
 * only place that mapping happens, so no other layer sees a database column name.
 */

/** areas.kind - a label for grouping and seed identification only (BR-1.13). */
export type AreaKind = "residential" | "office";

/**
 * profiles.role - informational only, read by nothing for authorization (FR-7).
 *
 * Declared as a readonly tuple with Role derived from it, so the same declaration serves both
 * the type and z.enum() without a cast.
 */
export const ROLES = ["driver", "passenger", "both"] as const;

export type Role = (typeof ROLES)[number];

export interface Area {
  id: string;
  name: string;
  kind: AreaKind;
}

/**
 * An employee profile. `id` is the auth user id (FQ1=A).
 *
 * displayName, phone and homeAreaId are nullable because FR-3 creates the profile
 * automatically before the employee has supplied anything. Those three fields are exactly
 * what the completeness gate checks (BR-1.9).
 */
export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  homeAreaId: string | null;
  role: Role;
}

/** The fields a user may change on their own profile (FR-5). Email is not among them. */
export interface ProfileUpdate {
  displayName: string;
  phone: string;
  homeAreaId: string;
  role: Role;
}

// ---------------------------------------------------------------------------
// Unit 2 - Ride Offering and Discovery
// ---------------------------------------------------------------------------

/** rides.status. PAST and FULL are derived, never stored (FR-34). */
export type RideStatus = "active" | "cancelled";

/**
 * A trip a driver offers.
 *
 * Note what is absent: no `seatsRemaining` (derived, FQ2=A) and no `updatedAt` (FR-15 forbids
 * editing, so nothing but the single status transition ever changes a ride).
 */
export interface Ride {
  id: string;
  driverId: string;
  originAreaId: string;
  destinationAreaId: string;
  /** ISO instant. Date and departure time in one value (FQ1=A). */
  departsAt: string;
  seats: number;
  note: string | null;
  status: RideStatus;
}

/**
 * Another employee's profile as any employee may see it.
 *
 * There is no `phone` and no `email` field, and that is the point: the type makes reading a
 * colleague's contact details a compile error, while the `public_profiles` view makes it
 * impossible at the database level (BR-2.24, NFR-2).
 *
 * Unit 3 adds a separate, conditional path for accepted pairs (FR-30). It will not widen
 * this type.
 */
export interface PublicProfile {
  id: string;
  displayName: string | null;
  homeAreaId: string | null;
  role: Role;
}

/** A ride as presented in a listing, with everything derived already applied. */
export interface RideListItem {
  ride: Ride;
  seatsRemaining: number;
  isFull: boolean;
  isOwnRide: boolean;
  /** Null when the driver profile could not be resolved. Never carries contact details. */
  driver: PublicProfile | null;
  originName: string;
  destinationName: string;
  /**
   * The viewer's own request on this ride, if any (Unit 3).
   *
   * Lets a listing show "you have already asked" instead of a button that would be refused
   * with DUPLICATE_REQUEST (BR-3.7). Null before Unit 3 and for a ride the viewer has never
   * asked about.
   */
  myRequest: { id: string; status: RequestStatus; displayStatus: DisplayStatus } | null;
  /**
   * The driver's contact details - present only when the viewer's own request on this ride is
   * ACCEPTED (FR-30). US-21 permits seeing them on "that ride or my request", so they appear
   * both here and on My Requests.
   */
  driverContact: AcceptedContact | null;
}

/** Parsed, validated search criteria (FR-18). */
export interface RideSearchCriteria {
  date: string;
  originAreaId: string;
  destinationAreaId: string;
}

// ---------------------------------------------------------------------------
// Unit 3 - Requests and Matching
// ---------------------------------------------------------------------------

/**
 * The FIVE statuses actually stored (FQ1=A).
 *
 * `expired` is absent on purpose - it is derived at read time, not written. See DisplayStatus.
 */
export type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "cancelled";

/**
 * The SIX statuses a user is shown (FR-35).
 *
 * The extra one, `expired`, is what a still-pending request on a departed ride reports
 * (FR-36, FR-37). Keeping it in a separate type from RequestStatus is what stops anyone
 * trying to write it.
 */
export type DisplayStatus = RequestStatus | "expired";

export interface RideRequest {
  id: string;
  rideId: string;
  passengerId: string;
  status: RequestStatus;
  createdAt: string;
  /** Null while pending, and null forever for a derived-expired request. */
  decidedAt: string | null;
}

/**
 * A counterparty's contact details, released only when an accepted request links the two
 * people (FR-30).
 *
 * A DISTINCT TYPE from PublicProfile, deliberately (BR-3.27). A single type with
 * sometimes-null phone and email would make every call site decide whether to trust them,
 * which is exactly the diffusion the projection exists to prevent. Here, holding an
 * AcceptedContact IS the proof that disclosure was authorised.
 */
export interface AcceptedContact {
  id: string;
  displayName: string | null;
  phone: string | null;
  email: string;
}

/** One request as a driver sees it on their ride. */
export interface RideRequestView {
  request: RideRequest;
  displayStatus: DisplayStatus;
  /** Name and pickup area only - never contact details (FR-27, BR-3.26). */
  requester: PublicProfile | null;
  /** Present only for an accepted request (FR-30). */
  contact: AcceptedContact | null;
}

/** One request as the passenger who made it sees it. */
export interface MyRequestView {
  request: RideRequest;
  displayStatus: DisplayStatus;
  ride: Ride;
  originName: string;
  destinationName: string;
  driver: PublicProfile | null;
  /** Present only for an accepted request (FR-30). */
  contact: AcceptedContact | null;
}

// ---------------------------------------------------------------------------
// Notifications - amends FR-42, which originally chose no notifications at all
// ---------------------------------------------------------------------------

/**
 * The four events that notify someone.
 *
 * `withdrawn` is deliberately absent: the passenger performed it themselves, and telling the
 * driver was the "everything including withdrawals" option that was not chosen.
 */
export type NotificationKind =
  | "request_received"  // to the DRIVER
  | "request_accepted"  // to the PASSENGER
  | "request_declined"  // to the PASSENGER
  | "ride_cancelled";   // to the PASSENGER

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  rideId: string;
  requestId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** A notification with enough ride context to render a sentence. */
export interface NotificationView {
  notification: AppNotification;
  originName: string;
  destinationName: string;
  departsAt: string;
  /** Title and body, built by lib/notification-text.ts - never stored. */
  title: string;
  body: string;
}
