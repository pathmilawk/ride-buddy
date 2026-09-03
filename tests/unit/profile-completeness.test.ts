import { describe, expect, it } from "vitest";
import {
  describeMissingFields,
  isProfileComplete,
  missingProfileFields,
} from "@/lib/profile-completeness";
import type { Profile } from "@/lib/types";

/**
 * BR-1.9 / FR-6 / US-04 - the completeness gate.
 *
 * This is the rule both Unit 2 and Unit 3 call before allowing a ride to be offered or a
 * seat requested, so it is the piece of Unit 1 most worth pinning down.
 */

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "employee@example.com",
    displayName: "Ada Lovelace",
    phone: "+47 900 00 000",
    homeAreaId: "22222222-2222-2222-2222-222222222222",
    role: "both",
    ...overrides,
  };
}

describe("missingProfileFields", () => {
  it("passes when all three gated fields are present", () => {
    expect(missingProfileFields(profile())).toEqual([]);
    expect(isProfileComplete(profile())).toBe(true);
  });

  it("reports a missing display name", () => {
    expect(missingProfileFields(profile({ displayName: null }))).toEqual(["displayName"]);
  });

  it("reports a missing phone number", () => {
    expect(missingProfileFields(profile({ phone: null }))).toEqual(["phone"]);
  });

  it("reports a missing home area", () => {
    expect(missingProfileFields(profile({ homeAreaId: null }))).toEqual(["homeAreaId"]);
  });

  it("reports every missing field, not just the first", () => {
    const missing = missingProfileFields(
      profile({ displayName: null, phone: null, homeAreaId: null }),
    );
    expect(missing).toEqual(["displayName", "phone", "homeAreaId"]);
  });

  it("treats whitespace-only values as missing", () => {
    // A profile saved with "   " would otherwise pass the gate and then show a blank name
    // to colleagues in Unit 2's search results.
    expect(missingProfileFields(profile({ displayName: "   " }))).toEqual(["displayName"]);
    expect(missingProfileFields(profile({ phone: "\t" }))).toEqual(["phone"]);
  });

  it("does NOT gate on role, even though role is always set", () => {
    // FR-7 makes role informational and FQ4=A gives it a default. Gating on a field that
    // grants no permission would add friction with no functional effect.
    for (const role of ["driver", "passenger", "both"] as const) {
      expect(missingProfileFields(profile({ role }))).toEqual([]);
    }
  });

  it("does not gate on email, which the user cannot edit", () => {
    expect(missingProfileFields(profile({ email: "" }))).toEqual([]);
  });
});

describe("describeMissingFields", () => {
  it("returns an empty string when nothing is missing", () => {
    expect(describeMissingFields([])).toBe("");
  });

  it("names a single missing field", () => {
    expect(describeMissingFields(["phone"])).toBe(
      "Please add your phone number to your profile first.",
    );
  });

  it("names two missing fields with 'and'", () => {
    expect(describeMissingFields(["displayName", "phone"])).toBe(
      "Please add your name and your phone number to your profile first.",
    );
  });

  it("names three missing fields as a list", () => {
    expect(describeMissingFields(["displayName", "phone", "homeAreaId"])).toBe(
      "Please add your name, your phone number and your home area to your profile first.",
    );
  });
});
