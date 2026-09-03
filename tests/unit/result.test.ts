import { describe, expect, it } from "vitest";
import { fail, isOk, ok, type Result } from "@/lib/result";

/** C12 Result - AQ6=C. Expected business outcomes are values; faults are thrown elsewhere. */

describe("Result", () => {
  it("carries a value on success", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it("carries an outcome and message on failure", () => {
    const r = fail<number>("NOT_PERMITTED", "You need to be signed in to do that.");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.outcome).toBe("NOT_PERMITTED");
      expect(r.message).toContain("signed in");
      expect(r.fields).toBeUndefined();
    }
  });

  it("carries field detail when given", () => {
    const r = fail<number>("PROFILE_INCOMPLETE", "Please add your phone number.", {
      phone: "Required",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields?.phone).toBe("Required");
  });

  it("narrows correctly through isOk", () => {
    const results: Result<string>[] = [ok("yes"), fail("NOT_FOUND", "gone")];
    const values = results.filter(isOk).map((r) => r.value);
    expect(values).toEqual(["yes"]);
  });
});
