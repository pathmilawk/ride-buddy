import { describe, expect, it } from "vitest";
import {
  canAccept,
  canReject,
  canWithdraw,
  displayGroup,
  isTerminal,
} from "@/lib/request-transitions";
import type { RequestStatus } from "@/lib/types";

/**
 * BR-3.19 - the request state machine.
 *
 * Q20=A named "request state transitions" as one of the two things worth testing, so this is
 * the core of the approved test scope.
 *
 * The suite asserts both directions: every legal transition is permitted, and **every illegal
 * one is refused**. The second half matters more - a guard that permits too much is the bug
 * that lets a driver answer an already-withdrawn request.
 */

const ALL: RequestStatus[] = ["pending", "accepted", "rejected", "withdrawn", "cancelled"];

describe("canAccept - BR-3.14", () => {
  it("permits accepting a pending request", () => {
    expect(canAccept("pending")).toBe(true);
  });

  it("refuses every other status", () => {
    for (const status of ALL.filter((s) => s !== "pending")) {
      expect(canAccept(status), `must not accept from ${status}`).toBe(false);
    }
  });

  it("refuses re-accepting an already accepted request", () => {
    // BR-3.15: acceptance is irreversible, and it is also not repeatable. Re-accepting would
    // consume a second seat for one passenger.
    expect(canAccept("accepted")).toBe(false);
  });
});

describe("canReject - BR-3.14", () => {
  it("permits rejecting a pending request", () => {
    expect(canReject("pending")).toBe(true);
  });

  it("refuses every other status", () => {
    for (const status of ALL.filter((s) => s !== "pending")) {
      expect(canReject(status), `must not reject from ${status}`).toBe(false);
    }
  });

  it("refuses rejecting an accepted request", () => {
    // BR-3.15 - there is no un-accept. With no messaging (FR-23) there would be no way to
    // explain a reversal to the passenger, so the path does not exist.
    expect(canReject("accepted")).toBe(false);
  });
});

describe("canWithdraw - BR-3.12", () => {
  it("permits withdrawing a pending request", () => {
    expect(canWithdraw("pending")).toBe(true);
  });

  it("permits withdrawing an ACCEPTED request", () => {
    // The passenger's only way out of a ride they no longer need. Withdrawing frees the seat
    // automatically, because seats remaining is derived from the accepted count.
    expect(canWithdraw("accepted")).toBe(true);
  });

  it("refuses every terminal status", () => {
    for (const status of ["rejected", "withdrawn", "cancelled"] as RequestStatus[]) {
      expect(canWithdraw(status), `must not withdraw from ${status}`).toBe(false);
    }
  });
});

describe("isTerminal", () => {
  it("treats rejected, withdrawn and cancelled as terminal", () => {
    expect(isTerminal("rejected")).toBe(true);
    expect(isTerminal("withdrawn")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
  });

  it("does NOT treat accepted as terminal", () => {
    // Deliberate. Accepted is irreversible by the DRIVER (BR-3.15) but the passenger may still
    // withdraw (BR-3.12). Treating it as terminal would silently remove that exit.
    expect(isTerminal("accepted")).toBe(false);
  });

  it("does not treat pending as terminal", () => {
    expect(isTerminal("pending")).toBe(false);
  });
});

describe("the guards are not interchangeable", () => {
  it("accept and withdraw differ on an accepted request", () => {
    // The two ownership checks belong to different parties, and confusing them would let a
    // driver withdraw a passenger's request or a passenger answer their own.
    expect(canAccept("accepted")).toBe(false);
    expect(canWithdraw("accepted")).toBe(true);
  });

  it("no guard permits anything from a cancelled request", () => {
    expect(canAccept("cancelled")).toBe(false);
    expect(canReject("cancelled")).toBe(false);
    expect(canWithdraw("cancelled")).toBe(false);
  });
});

describe("displayGroup - FQ8=A", () => {
  it("separates pending, accepted and terminal", () => {
    expect(displayGroup("pending")).toBe("pending");
    expect(displayGroup("accepted")).toBe("accepted");
    for (const s of ["rejected", "withdrawn", "cancelled", "expired"] as const) {
      expect(displayGroup(s)).toBe("terminal");
    }
  });

  it("groups derived expired with the terminal statuses", () => {
    expect(displayGroup("expired")).toBe("terminal");
  });
});
