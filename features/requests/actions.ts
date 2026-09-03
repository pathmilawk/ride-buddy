"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as requestService from "@/services/ride-request-service";
import { field, type ActionState } from "@/lib/action-state";

/**
 * C14 Server Actions - requests.
 *
 * Same four steps throughout: read the id, delegate to exactly one service method, translate
 * the Result, return it. Every real rule is a service precondition (BR-3.1), not a form
 * constraint - which is why no new Zod schema was needed for this unit.
 */

function revalidateAll() {
  revalidatePath("/rides");
  revalidatePath("/requests");
  revalidatePath("/search");
}

export async function requestSeatAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rideId = field(formData, "rideId");
  if (!rideId) return { error: "Which ride?" };

  const result = await requestService.requestSeat(rideId);

  if (!result.ok) {
    // Matches Unit 2's pattern: hand the missing field names to the profile page so its banner
    // can name them (BR-1.11). This is the second and last gate call site.
    if (result.outcome === "PROFILE_INCOMPLETE") {
      const missing = Object.keys(result.fields ?? {}).join(",");
      redirect(`/profile?missing=${encodeURIComponent(missing)}`);
    }
    return { error: result.message };
  }

  revalidateAll();
  return { success: "Request sent." };
}

export async function acceptRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestId = field(formData, "requestId");
  if (!requestId) return { error: "Which request?" };

  const result = await requestService.acceptRequest(requestId);
  if (!result.ok) {
    // FQ7=A: revalidate even on failure. A RIDE_FULL means the seat count the driver was
    // looking at is stale, so the list must re-render with the true state alongside the error.
    revalidateAll();
    return { error: result.message };
  }

  revalidateAll();
  return { success: "Request accepted." };
}

export async function rejectRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestId = field(formData, "requestId");
  if (!requestId) return { error: "Which request?" };

  const result = await requestService.rejectRequest(requestId);
  if (!result.ok) return { error: result.message };

  revalidateAll();
  return { success: "Request declined." };
}

export async function withdrawRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestId = field(formData, "requestId");
  if (!requestId) return { error: "Which request?" };

  const result = await requestService.withdrawRequest(requestId);
  if (!result.ok) return { error: result.message };

  revalidateAll();
  return { success: "Request withdrawn." };
}
