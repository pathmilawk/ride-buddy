import type { Profile } from "@/lib/types";

/**
 * BR-1.9 - the completeness gate rule, as a pure function.
 *
 * Kept in its own module with no framework imports so it can be unit tested directly
 * (NFR-6). The service wrapper that fetches a profile and calls this lives in
 * services/profile-service.ts.
 *
 * Checks exactly three fields: display_name, phone, home_area_id. Those are the three that
 * FR-3 leaves null at profile creation and that downstream flows depend on - a ride needs a
 * driver name to display and a phone to release on acceptance; a request needs the same of
 * the passenger.
 *
 * `role` is deliberately NOT checked. FR-7 makes it informational and it carries a default
 * (FQ4=A), so gating on it would add friction with no functional effect.
 */

export const GATED_FIELDS = ["displayName", "phone", "homeAreaId"] as const;

export type GatedField = (typeof GATED_FIELDS)[number];

const LABELS: Record<GatedField, string> = {
  displayName: "your name",
  phone: "your phone number",
  homeAreaId: "your home area",
};

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === "";
}

/** The gated fields that are missing. An empty array means the gate passes. */
export function missingProfileFields(profile: Profile): GatedField[] {
  const missing: GatedField[] = [];
  if (isBlank(profile.displayName)) missing.push("displayName");
  if (isBlank(profile.phone)) missing.push("phone");
  if (isBlank(profile.homeAreaId)) missing.push("homeAreaId");
  return missing;
}

export function isProfileComplete(profile: Profile): boolean {
  return missingProfileFields(profile).length === 0;
}

/** A message naming what is missing, as BR-1.9 requires. */
export function describeMissingFields(missing: GatedField[]): string {
  if (missing.length === 0) return "";
  const parts = missing.map((f) => LABELS[f]);
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `Please add ${list} to your profile first.`;
}
