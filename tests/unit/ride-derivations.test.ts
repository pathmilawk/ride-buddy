import { describe, expect, it } from "vitest";
import {
  combineDateAndTime,
  dayRange,
  isFull,
  isFuture,
  isOwnRide,
  seatsRemaining,
} from "@/lib/ride-derivations";

/**
 * FR-19, FQ2=A - seat availability.
 *
 * Unlike Unit 1's tests, this is squarely inside the scope Q20=A approved: seat availability
 * begins here, and Unit 3's capacity guarantee will constrain the same numbers.
 */

describe("seatsRemaining", () => {
  it("returns the full seat count when nothing is accepted", () => {
    // The Unit 2 case: no requests exist, so every ride shows all its seats.
    expect(seatsRemaining(4, 0)).toBe(4);
  });

  it("subtracts accepted requests", () => {
    expect(seatsRemaining(4, 1)).toBe(3);
    expect(seatsRemaining(4, 3)).toBe(1);
  });

  it("returns zero when every seat is taken", () => {
    expect(seatsRemaining(4, 4)).toBe(0);
  });

  it("never returns a negative number", () => {
    // Overbooking should be impossible once Unit 3's guarantee is in place. If data ever went
    // bad, showing "-1 seats free" would be worse than showing none.
    expect(seatsRemaining(2, 5)).toBe(0);
  });

  it("handles the single-seat boundary", () => {
    expect(seatsRemaining(1, 0)).toBe(1);
    expect(seatsRemaining(1, 1)).toBe(0);
  });
});

describe("isFull", () => {
  it("is false while seats remain", () => {
    expect(isFull(3, 0)).toBe(false);
    expect(isFull(3, 2)).toBe(false);
  });

  it("is true at capacity", () => {
    expect(isFull(3, 3)).toBe(true);
  });

  it("is true beyond capacity", () => {
    expect(isFull(3, 4)).toBe(true);
  });
});

describe("isOwnRide", () => {
  it("recognises the viewer's own ride", () => {
    expect(isOwnRide({ driverId: "abc" }, "abc")).toBe(true);
  });

  it("does not match a different employee", () => {
    expect(isOwnRide({ driverId: "abc" }, "xyz")).toBe(false);
  });
});

describe("dayRange", () => {
  it("starts at local midnight on the given date", () => {
    const range = dayRange("2026-09-10");
    expect(range).not.toBeNull();
    const from = new Date(range!.from);
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(8); // September, zero-indexed
    expect(from.getDate()).toBe(10);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
  });

  it("ends at local midnight on the following date", () => {
    const range = dayRange("2026-09-10");
    const to = new Date(range!.to);
    expect(to.getDate()).toBe(11);
    expect(to.getHours()).toBe(0);
  });

  it("produces a half-open range where `to` is strictly after `from`", () => {
    // Asserted as a relationship rather than exactly 24 hours: `setDate` spans one calendar
    // day, so a daylight-saving boundary legitimately gives 23 or 25 hours.
    const range = dayRange("2026-03-29");
    expect(new Date(range!.to).getTime()).toBeGreaterThan(new Date(range!.from).getTime());
  });

  it("rolls over a month boundary", () => {
    const range = dayRange("2026-09-30");
    const to = new Date(range!.to);
    expect(to.getMonth()).toBe(9); // October
    expect(to.getDate()).toBe(1);
  });

  it("returns null for an unparseable date", () => {
    expect(dayRange("not-a-date")).toBeNull();
  });
});

describe("combineDateAndTime", () => {
  it("combines the two form fields into one instant", () => {
    const iso = combineDateAndTime("2026-09-10", "07:30");
    expect(iso).not.toBeNull();
    const d = new Date(iso!);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(30);
  });

  it("returns null rather than an Invalid Date", () => {
    // The caller reports a validation failure instead of storing garbage.
    expect(combineDateAndTime("2026-13-45", "07:30")).toBeNull();
    expect(combineDateAndTime("2026-09-10", "99:99")).toBeNull();
  });
});

describe("isFuture", () => {
  const now = "2026-09-10T12:00:00.000Z";

  it("accepts a later instant", () => {
    expect(isFuture("2026-09-10T12:00:01.000Z", now)).toBe(true);
  });

  it("rejects an earlier instant", () => {
    expect(isFuture("2026-09-10T11:59:59.000Z", now)).toBe(false);
  });

  it("rejects the current instant - departure must be strictly future", () => {
    expect(isFuture(now, now)).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(isFuture("nonsense", now)).toBe(false);
  });
});
