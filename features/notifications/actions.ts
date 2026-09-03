"use server";

import { revalidatePath } from "next/cache";
import * as notificationService from "@/services/notification-service";
import { field, type ActionState } from "@/lib/action-state";

/** Thin as ever: parse, delegate to one service method, translate. No rules here. */

export async function markNotificationReadAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = field(formData, "notificationId");
  if (!id) return { error: "Which notification?" };

  const result = await notificationService.markRead(id);
  if (!result.ok) return { error: result.message };

  revalidatePath("/", "layout");   // the bell lives in the shared layout
  return { success: "Marked as read." };
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  const result = await notificationService.markAllRead();
  if (!result.ok) return { error: result.message };

  revalidatePath("/", "layout");
  return { success: "All marked as read." };
}
