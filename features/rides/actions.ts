"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as rideService from "@/services/ride-service";
import { rideCreateSchema, toFieldErrors } from "@/lib/schemas";
import { field, type ActionState } from "@/lib/action-state";

/**
 * C14 Server Actions - rides.
 *
 * Same four steps as Unit 1: parse with the shared schema, delegate to exactly one service
 * method, translate the Result, return it. No business rule lives here.
 *
 * There is no search action. Under FQ6=A a search is a navigation, not a mutation - the
 * filters update URL parameters and the Server Component re-renders. A Server Action would
 * add a write boundary where nothing is written.
 */

export async function createRideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = rideCreateSchema.safeParse({
    date: field(formData, "date"),
    time: field(formData, "time"),
    originAreaId: field(formData, "originAreaId"),
    destinationAreaId: field(formData, "destinationAreaId"),
    seats: field(formData, "seats"),
    note: field(formData, "note"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) };
  }

  const result = await rideService.createRide(parsed.data);

  if (!result.ok) {
    // BR-1.11 / BR-2.1: the completeness gate refused. Hand the missing field names to the
    // profile page so its banner can name them. This closes the loop Unit 1 built but could
    // not demonstrate - US-04 becomes visible to a user here for the first time.
    if (result.outcome === "PROFILE_INCOMPLETE") {
      const missing = Object.keys(result.fields ?? {}).join(",");
      redirect(`/profile?missing=${encodeURIComponent(missing)}`);
    }
    return { error: result.message, fields: result.fields };
  }

  revalidatePath("/rides");
  redirect("/rides");
}

export async function cancelRideAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rideId = field(formData, "rideId");
  if (!rideId) return { error: "Which ride?" };

  const result = await rideService.cancelRide(rideId);
  if (!result.ok) return { error: result.message };

  revalidatePath("/rides");
  revalidatePath("/search");
  return { success: "Ride cancelled." };
}
