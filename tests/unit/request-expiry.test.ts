import { describe, expect, it } from "vitest";
import { displayStatus } from "@/lib/request-transitions";
import type { RequestStatus } from "@/lib/types";

/**
 * FR-36, FR-37, FQ1=A - EXPIRED is derived, never stored.
 *
 * The database has five status values and no `expired`. This function is the only place the
 * sixth comes from, so it is the whole of the feature.
 */

const NOW = "2026-09-10T12:00:00.000Z";
const DEPARTED = "2026-09-10T11:00:00.000Z";
const UPCOMING = "2026-09-10T13:00:00.000Z";

describe("displayStatus", () => {
  it("reports a pending request on an upcoming ride as pending", () => {
    expect(displayStatus("pending", UPCOMING, NOW)).toBe("pending");
  });

  it("reports a pending request on a DEPARTED ride as expired", () => {
    // US-23: nobody answered, and the ride has left. Nothing wrote this.
    expect(displayStatus("pending", DEPARTED, NOW)).toBe("expired");
  });

  it("expires at the departure instant, not after it", () => {
    // A ride departing exactly now has left. The passenger cannot board it.
    expect(displayStatus("pending", NOW, NOW)).toBe("expired");
  });

  it("leaves every terminal status unchanged even after departure", () => {
    // A request rejected before the ride left was REJECTED, not expired. Rewriting that history
    // would be a lie, and it would lose the distinction a passenger most wants - "the driver
    // said no" versus "nobody answered in time".
    for (const status of ["accepted", "rejected", "withdrawn", "cancelled"] as RequestStatus[]) {
      expect(displayStatus(status, DEPARTED, NOW), `${status} must not become expired`).toBe(
        status,
      );
    }
  });

  it("leaves an accepted request accepted after the ride departs", () => {
    // Called out separately because it is the one most likely to be got wrong: the ride has
    // gone, but the passenger did travel. Their request was honoured.
    expect(displayStatus("accepted", DEPARTED, NOW)).toBe("accepted");
  });

  it("never invents expired for a non-pending status on an upcoming ride", () => {
    for (const status of ALL_NON_PENDING) {
      expect(displayStatus(status, UPCOMING, NOW)).toBe(status);
    }
  });

  it("falls back to the stored status when a date is unparseable", () => {
    // Better to show a slightly stale status than to crash a list render.
    expect(displayStatus("pending", "not-a-date", NOW)).toBe("pending");
    expect(displayStatus("pending", UPCOMING, "not-a-date")).toBe("pending");
  });

  it("requires no scheduled job to be correct", () => {
    // The property that makes FQ1=A work: the same stored row reports different statuses as
    // time passes, with nothing having run in between. Q33=A ruled out a scheduler and TC-7
    // gives one nowhere to live.
    const before = displayStatus("pending", "2026-09-10T12:30:00.000Z", "2026-09-10T12:00:00.000Z");
    const after = displayStatus("pending", "2026-09-10T12:30:00.000Z", "2026-09-10T13:00:00.000Z");
    expect(before).toBe("pending");
    expect(after).toBe("expired");
  });
});

const ALL_NON_PENDING: RequestStatus[] = ["accepted", "rejected", "withdrawn", "cancelled"];
