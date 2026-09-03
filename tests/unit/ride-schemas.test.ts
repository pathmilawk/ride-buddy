import { describe, expect, it } from "vitest";
import { rideCreateSchema, rideSearchSchema } from "@/lib/schemas";

/** BR-2.2, BR-2.4 - ride form and search parameter validation. */

const AREA_A = "11111111-1111-1111-1111-111111111111";
const AREA_B = "22222222-2222-2222-2222-222222222222";

function validRide(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-09-10",
    time: "07:30",
    originAreaId: AREA_A,
    destinationAreaId: AREA_B,
    seats: 3,
    ...overrides,
  };
}

describe("rideCreateSchema", () => {
  it("accepts a well-formed ride", () => {
    expect(rideCreateSchema.safeParse(validRide()).success).toBe(true);
  });

  it("accepts a ride with no note", () => {
    const r = rideCreateSchema.safeParse(validRide());
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBeNull();
  });

  it("normalises an empty note to null", () => {
    const r = rideCreateSchema.safeParse(validRide({ note: "   " }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBeNull();
  });

  it("keeps a real note", () => {
    const r = rideCreateSchema.safeParse(validRide({ note: "Leaving from the north gate" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe("Leaving from the north gate");
  });

  it("rejects a note over 280 characters", () => {
    expect(rideCreateSchema.safeParse(validRide({ note: "x".repeat(281) })).success).toBe(false);
  });

  describe("seat bounds (BR-2.2, FQ3=A)", () => {
    it("accepts 1 through 8", () => {
      for (const seats of [1, 2, 4, 8]) {
        expect(rideCreateSchema.safeParse(validRide({ seats })).success).toBe(true);
      }
    });

    it("rejects zero seats", () => {
      // A ride nobody can join makes the capacity guarantee vacuous.
      expect(rideCreateSchema.safeParse(validRide({ seats: 0 })).success).toBe(false);
    });

    it("rejects more than eight", () => {
      expect(rideCreateSchema.safeParse(validRide({ seats: 9 })).success).toBe(false);
    });

    it("rejects a fractional seat count", () => {
      expect(rideCreateSchema.safeParse(validRide({ seats: 2.5 })).success).toBe(false);
    });

    it("coerces the string a form submits", () => {
      const r = rideCreateSchema.safeParse(validRide({ seats: "3" }));
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.seats).toBe(3);
    });
  });

  it("rejects a malformed date or time", () => {
    expect(rideCreateSchema.safeParse(validRide({ date: "10/09/2026" })).success).toBe(false);
    expect(rideCreateSchema.safeParse(validRide({ time: "7am" })).success).toBe(false);
  });

  it("rejects an area that is not a uuid", () => {
    expect(rideCreateSchema.safeParse(validRide({ originAreaId: "forus" })).success).toBe(false);
  });

  it("ACCEPTS a ride whose origin equals its destination", () => {
    // BR-2.4 / FQ4=B. The product owner chose to permit this, against the recommendation.
    // Asserted so that adding a same-area rule later fails a test rather than silently
    // changing behaviour that was deliberately chosen.
    const r = rideCreateSchema.safeParse(
      validRide({ originAreaId: AREA_A, destinationAreaId: AREA_A }),
    );
    expect(r.success).toBe(true);
  });

  it("does not check whether the date is in the future", () => {
    // That check depends on the current instant and lives in the service, so the schema stays
    // a pure shape check.
    expect(rideCreateSchema.safeParse(validRide({ date: "2020-01-01" })).success).toBe(true);
  });
});

describe("rideSearchSchema - lenient by design", () => {
  it("accepts a complete set of parameters", () => {
    const r = rideSearchSchema.safeParse({
      date: "2026-09-10",
      originAreaId: AREA_A,
      destinationAreaId: AREA_B,
    });
    expect(r.success).toBe(true);
  });

  it("accepts no parameters at all", () => {
    // A first visit has none; the page supplies prefilled defaults (BR-2.18).
    const r = rideSearchSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("drops unparseable values rather than failing", () => {
    // A hand-edited, stale or shared URL should fall back to defaults, not show an error page.
    const r = rideSearchSchema.safeParse({
      date: "yesterday",
      originAreaId: "forus",
      destinationAreaId: AREA_B,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.date).toBeUndefined();
      expect(r.data.originAreaId).toBeUndefined();
      expect(r.data.destinationAreaId).toBe(AREA_B);
    }
  });
});
