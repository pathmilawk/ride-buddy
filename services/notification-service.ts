import { createSupabaseServerClient } from "@/db/supabase/server";
import * as areaRepository from "@/db/repositories/area-repository";
import * as notificationRepository from "@/db/repositories/notification-repository";
import { requireUser } from "@/lib/auth-context";
import { notificationBody, notificationTitle } from "@/lib/notification-text";
import { ok, type Result } from "@/lib/result";
import type { NotificationView } from "@/lib/types";

/** Notification reads and mark-as-read. Creation belongs to the database triggers. */

export async function unreadCount(): Promise<number> {
  const auth = await requireUser();
  if (!auth.ok) return 0;   // the bell simply shows nothing when signed out
  const supabase = await createSupabaseServerClient();
  return notificationRepository.countUnread(supabase);
}

export async function listRecent(): Promise<Result<NotificationView[]>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const [rows, areas] = await Promise.all([
    notificationRepository.listRecent(supabase),
    areaRepository.listAll(supabase),
  ]);
  const areaNames = new Map(areas.map((a) => [a.id, a.name]));

  return ok(
    rows.map(({ notification, ride }) => {
      const context = {
        originName: areaNames.get(ride.originAreaId) ?? "Unknown area",
        destinationName: areaNames.get(ride.destinationAreaId) ?? "Unknown area",
        departsAt: ride.departsAt,
      };
      return {
        notification,
        ...context,
        title: notificationTitle(notification.kind),
        body: notificationBody(notification.kind, context),
      };
    }),
  );
}

export async function markRead(id: string): Promise<Result<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const supabase = await createSupabaseServerClient();
  // The update policy restricts this to the caller's own rows, so no ownership check is
  // duplicated here - unlike elsewhere, there is nothing this layer could add.
  await notificationRepository.markRead(supabase, id);
  return ok(null);
}

export async function markAllRead(): Promise<Result<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const supabase = await createSupabaseServerClient();
  await notificationRepository.markAllRead(supabase);
  return ok(null);
}
