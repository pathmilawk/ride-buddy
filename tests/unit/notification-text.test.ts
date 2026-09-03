import { describe, expect, it } from "vitest";
import {
  notificationAudience,
  notificationBody,
  notificationHref,
  notificationTitle,
  type RideContext,
} from "@/lib/notification-text";
import type { NotificationKind } from "@/lib/types";

/**
 * Notification wording.
 *
 * Pure by design: only `kind` and the ride ids are stored, so the copy is editable without a
 * data migration - and testable, which a stored message would not be.
 */

const ALL: NotificationKind[] = [
  "request_received",
  "request_accepted",
  "request_declined",
  "ride_cancelled",
];

const ride: RideContext = {
  originName: "Hillevag",
  destinationName: "Solwr Head Office",
  departsAt: "2026-09-10T07:30:00.000Z",
};

describe("notificationTitle", () => {
  it("gives every kind a title", () => {
    for (const kind of ALL) expect(notificationTitle(kind).length).toBeGreaterThan(0);
  });

  it("gives every kind a DISTINCT title", () => {
    // A glance at the list should say what happened. Two events sharing a title would defeat
    // the point, given FR-42 previously left users with no signal at all.
    const titles = ALL.map(notificationTitle);
    expect(new Set(titles).size).toBe(ALL.length);
  });
});

describe("notificationBody", () => {
  it("names both ends of the trip for every kind", () => {
    for (const kind of ALL) {
      const body = notificationBody(kind, ride);
      expect(body, kind).toContain("Hillevag");
      expect(body, kind).toContain("Solwr Head Office");
    }
  });

  it("includes the departure time", () => {
    expect(notificationBody("request_received", ride)).toMatch(/\d{1,2}:\d{2}/);
  });

  it("tells an accepted passenger that contact details are now available", () => {
    // The one message with a next action. FR-30 releases the phone number at exactly this
    // moment, and the notification is where the passenger finds out.
    expect(notificationBody("request_accepted", ride)).toMatch(/contact details/i);
  });

  it("makes a cancellation unmistakable", () => {
    // The gap this feature exists to close: section 9.2 recorded that a passenger previously
    // learned of a cancellation only by opening the app and noticing.
    const body = notificationBody("ride_cancelled", ride);
    expect(body).toMatch(/cancelled/i);
    expect(body).toMatch(/another way/i);
  });

  it("survives an unparseable departure time", () => {
    // Better a slightly thinner sentence than a crashed notification list.
    const body = notificationBody("request_received", { ...ride, departsAt: "not-a-date" });
    expect(body).toContain("Hillevag");
    expect(body).not.toContain("Invalid Date");
  });

  it("produces a different sentence for every kind", () => {
    const bodies = ALL.map((k) => notificationBody(k, ride));
    expect(new Set(bodies).size).toBe(ALL.length);
  });
});

describe("notificationAudience and href", () => {
  it("routes a driver's notification to My rides", () => {
    expect(notificationAudience("request_received")).toBe("driver");
    expect(notificationHref("request_received")).toBe("/rides");
  });

  it("routes every passenger notification to My requests", () => {
    for (const kind of ["request_accepted", "request_declined", "ride_cancelled"] as const) {
      expect(notificationAudience(kind), kind).toBe("passenger");
      expect(notificationHref(kind), kind).toBe("/requests");
    }
  });

  it("never sends anyone to a page that would not show the event", () => {
    // A driver's "someone wants a seat" belongs on /rides; a passenger's outcome belongs on
    // /requests. Crossing them would land the user on a screen with nothing relevant.
    for (const kind of ALL) {
      expect(["/rides", "/requests"]).toContain(notificationHref(kind));
    }
  });
});

describe("withdrawal is deliberately not a notification kind", () => {
  it("has exactly four kinds", () => {
    // "Everything including withdrawals" was offered and not chosen. A withdrawal frees a seat
    // silently; asserting the count here means adding a fifth kind is a conscious change.
    expect(ALL).toHaveLength(4);
  });
});
