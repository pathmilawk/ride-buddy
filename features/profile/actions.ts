"use server";

import { revalidatePath } from "next/cache";
import * as profileService from "@/services/profile-service";
import { profileUpdateSchema, toFieldErrors } from "@/lib/schemas";
import { field, type ActionState } from "@/lib/action-state";

/** C14 Server Actions - profile. Parse, delegate, translate. No business rules. */

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileUpdateSchema.safeParse({
    displayName: field(formData, "displayName"),
    phone: field(formData, "phone"),
    homeAreaId: field(formData, "homeAreaId"),
    role: field(formData, "role") || undefined,
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) };
  }

  const result = await profileService.updateMyProfile(parsed.data);
  if (!result.ok) return { error: result.message, fields: result.fields };

  revalidatePath("/profile");
  return { success: "Profile saved." };
}
