import { describe, expect, it } from "vitest";
import { credentialsSchema, profileUpdateSchema, toFieldErrors } from "@/lib/schemas";

/** BR-1.7 - field validation rules. */

const AREA_ID = "22222222-2222-2222-2222-222222222222";

function validProfile(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Ada Lovelace",
    phone: "+47 900 00 000",
    homeAreaId: AREA_ID,
    role: "both",
    ...overrides,
  };
}

describe("credentialsSchema", () => {
  it("accepts a valid email and password", () => {
    const r = credentialsSchema.safeParse({ email: "a@example.com", password: "correct-horse" });
    expect(r.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(credentialsSchema.safeParse({ email: "nope", password: "correct-horse" }).success).toBe(
      false,
    );
  });

  it("rejects a password under 8 characters", () => {
    expect(credentialsSchema.safeParse({ email: "a@example.com", password: "short" }).success).toBe(
      false,
    );
  });

  it("accepts ANY email domain", () => {
    // FR-2 / BR-1.2 - no domain allow-list exists. This is a recorded deviation from vision.md
    // Section 4, reaffirmed by the product owner (requirements.md Section 9.1). The test
    // asserts it so that adding a domain check later fails loudly rather than silently
    // changing behaviour nobody intended to change.
    for (const email of ["a@solwr.com", "a@gmail.com", "a@anything.example"]) {
      expect(credentialsSchema.safeParse({ email, password: "correct-horse" }).success).toBe(true);
    }
  });
});

describe("profileUpdateSchema", () => {
  it("accepts a complete profile", () => {
    expect(profileUpdateSchema.safeParse(validProfile()).success).toBe(true);
  });

  it("defaults role to 'both' when omitted", () => {
    // FQ4=A
    const r = profileUpdateSchema.safeParse({
      displayName: "Ada Lovelace",
      phone: "90000000",
      homeAreaId: AREA_ID,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("both");
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(profileUpdateSchema.safeParse(validProfile({ displayName: "A" })).success).toBe(false);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(profileUpdateSchema.safeParse(validProfile({ displayName: "x".repeat(81) })).success).toBe(
      false,
    );
  });

  it("rejects a home area that is not a uuid", () => {
    expect(profileUpdateSchema.safeParse(validProfile({ homeAreaId: "forus" })).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(profileUpdateSchema.safeParse(validProfile({ role: "admin" })).success).toBe(false);
  });

  describe("phone - deliberately loose (FQ3=A)", () => {
    it("accepts a variety of formats colleagues actually type", () => {
      for (const phone of [
        "90000000",
        "900 00 000",
        "+4790000000",
        "+47 900 00 000",
        "(047) 900-00-000",
      ]) {
        const r = profileUpdateSchema.safeParse(validProfile({ phone }));
        expect(r.success, `expected ${phone} to be accepted`).toBe(true);
      }
    });

    it("imposes no country code and no locale", () => {
      // A bare local number with no + prefix must pass. If a stricter rule is ever added,
      // this test should fail rather than the change slipping through unnoticed.
      expect(profileUpdateSchema.safeParse(validProfile({ phone: "12345678" })).success).toBe(true);
    });

    it("still rejects clearly unusable values", () => {
      for (const phone of ["", "123", "x".repeat(21), "call me maybe"]) {
        expect(
          profileUpdateSchema.safeParse(validProfile({ phone })).success,
          `expected ${phone} to be rejected`,
        ).toBe(false);
      }
    });
  });
});

describe("toFieldErrors", () => {
  it("maps each failing field to its first message", () => {
    const r = profileUpdateSchema.safeParse(validProfile({ displayName: "A", phone: "1" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = toFieldErrors(r.error);
      expect(Object.keys(errors).sort()).toEqual(["displayName", "phone"]);
      expect(typeof errors.displayName).toBe("string");
    }
  });
});
