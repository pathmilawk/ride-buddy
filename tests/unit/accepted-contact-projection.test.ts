import { describe, expect, it } from "vitest";
import { toPublicProfile } from "@/lib/contact-projection";
import type { AcceptedContact, PublicProfile } from "@/lib/types";

/**
 * FR-30, BR-3.23, BR-3.24, BR-3.27 - two disclosure paths, kept distinct.
 *
 * Unit 2's suite asserts that a `PublicProfile` can never carry contact details. This one
 * asserts the other half: that the accepted-pair path is a **separate type**, so the two cases
 * stay distinguishable at compile time rather than becoming one type with sometimes-null
 * fields.
 *
 * The database is what actually authorises disclosure
 * (`profiles_select_accepted_counterparty`). These tests guard the type boundary that keeps the
 * rule from diffusing into every call site.
 */

describe("the two paths are distinct types", () => {
  it("PublicProfile still carries no contact fields after Unit 3", () => {
    // Regression guard. Unit 3 added a contact path; the temptation would have been to widen
    // PublicProfile with nullable phone and email instead. BR-3.27 forbids it, because then
    // every call site would have to decide whether to trust them.
    const publicProfile = toPublicProfile({
      id: "1",
      display_name: "Ada Lovelace",
      home_area_id: "2",
      role: "both",
    });

    const asRecord = publicProfile as unknown as Record<string, unknown>;
    expect(asRecord.phone).toBeUndefined();
    expect(asRecord.email).toBeUndefined();
    expect(Object.keys(publicProfile).sort()).toEqual([
      "displayName",
      "homeAreaId",
      "id",
      "role",
    ]);
  });

  it("AcceptedContact carries phone and email", () => {
    const contact: AcceptedContact = {
      id: "1",
      displayName: "Ada Lovelace",
      phone: "+47 900 00 000",
      email: "ada@example.com",
    };
    expect(contact.phone).toBe("+47 900 00 000");
    expect(contact.email).toBe("ada@example.com");
  });

  it("AcceptedContact is not assignable from a PublicProfile", () => {
    // Holding an AcceptedContact IS the proof that disclosure was authorised. A PublicProfile
    // cannot be passed where one is expected, so a component that renders a phone number can
    // only ever have been given one deliberately.
    const publicProfile: PublicProfile = {
      id: "1",
      displayName: "Ada Lovelace",
      homeAreaId: "2",
      role: "both",
    };

    // @ts-expect-error - PublicProfile lacks phone and email, and that is the guarantee.
    const _wrong: AcceptedContact = publicProfile;
    void _wrong;

    expect(publicProfile.id).toBe("1");
  });

  it("tolerates a counterparty with no phone recorded", () => {
    // FR-3 allows an incomplete profile, and the completeness gate only fires at the two points
    // BR-1.10 names. A colleague could in principle be accepted with a null phone.
    const contact: AcceptedContact = {
      id: "1",
      displayName: null,
      phone: null,
      email: "ada@example.com",
    };
    expect(contact.phone).toBeNull();
    expect(contact.email).toBeTruthy();
  });
});
