import { describe, expect, it } from "vitest";
import { toPublicProfile } from "@/lib/contact-projection";

/**
 * FR-20, NFR-2, BR-2.24 - the contact disclosure control.
 *
 * This suite exists to make widening the projection LOUD. Given that
 * `requirements.md` Section 9.1 records the deliberate absence of any company-domain check,
 * the public profile shape is the principal thing standing between a registered stranger and
 * every employee's phone number.
 *
 * If someone later adds `phone` to the view, the type, or this mapping, a test fails - rather
 * than a phone number quietly appearing in search results.
 */

describe("toPublicProfile", () => {
  const row = {
    id: "11111111-1111-1111-1111-111111111111",
    display_name: "Ada Lovelace",
    home_area_id: "22222222-2222-2222-2222-222222222222",
    role: "both" as const,
  };

  it("maps the four public columns", () => {
    expect(toPublicProfile(row)).toEqual({
      id: row.id,
      displayName: "Ada Lovelace",
      homeAreaId: row.home_area_id,
      role: "both",
    });
  });

  it("produces EXACTLY four keys - no contact fields", () => {
    expect(Object.keys(toPublicProfile(row)).sort()).toEqual([
      "displayName",
      "homeAreaId",
      "id",
      "role",
    ]);
  });

  it("carries no phone and no email under any name", () => {
    // Double cast is required, and that requirement is itself the point: `PublicProfile` has
    // no index signature, so TypeScript refuses to treat it as an arbitrary record. The type
    // will not let a caller reach for a field that does not exist.
    const projected = toPublicProfile(row) as unknown as Record<string, unknown>;
    for (const forbidden of ["phone", "email", "phoneNumber", "emailAddress"]) {
      expect(projected[forbidden], `${forbidden} must not be present`).toBeUndefined();
    }
  });

  it("does not leak contact fields even when the row carries them", () => {
    // Defends against the view being widened, or the base table being read by mistake: the
    // mapping is an allow-list, so extra input columns are dropped rather than passed through.
    const contaminated = {
      ...row,
      phone: "+47 900 00 000",
      email: "ada@example.com",
    } as unknown as Parameters<typeof toPublicProfile>[0];

    const projected = toPublicProfile(contaminated) as unknown as Record<string, unknown>;
    expect(projected.phone).toBeUndefined();
    expect(projected.email).toBeUndefined();
    expect(Object.keys(projected)).toHaveLength(4);
  });

  it("tolerates an incomplete profile", () => {
    // FR-3 creates profiles with null name and area; a colleague may appear before completing
    // theirs, and a listing must still render.
    const incomplete = { ...row, display_name: null, home_area_id: null };
    const projected = toPublicProfile(incomplete);
    expect(projected.displayName).toBeNull();
    expect(projected.homeAreaId).toBeNull();
  });
});
