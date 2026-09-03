import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppNotification, NotificationKind, Ride } from "@/lib/types";

/**
 * Notification data access.
 *
 * There is deliberately no `create` method. Notifications are inserted only by the triggers in
 * 0010_notifications.sql, and the table has no insert policy for users at all - so nobody can
 * fabricate one for someone else. Same reasoning that keeps `driver_id` off the ride form.
 */

interface NotificationRow {
  id: string;
  kind: NotificationKind;
  ride_id: string;
  request_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface RideRow {
  origin_area_id: string;
  destination_area_id: string;
  departs_at: string;
}

const COLUMNS = "id, kind, ride_id, request_id, read_at, created_at";

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    rideId: row.ride_id,
    requestId: row.request_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** Unread count for the badge. Uses the partial index. */
export async function countUnread(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw new Error(`notificationRepository.countUnread failed: ${error.message}`);
  return count ?? 0;
}

/**
 * The dropdown list. Embeds the ride so a sentence can be rendered without a second query.
 *
 * RLS restricts this to the caller's own rows, so no user filter is needed here - and adding
 * one would imply the policy might not hold.
 */
export async function listRecent(
  db: SupabaseClient,
  limit = 20,
): Promise<{ notification: AppNotification; ride: Pick<Ride, "originAreaId" | "destinationAreaId" | "departsAt"> }[]> {
  const { data, error } = await db
    .from("notifications")
    .select(`${COLUMNS}, rides!inner(origin_area_id, destination_area_id, departs_at)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`notificationRepository.listRecent failed: ${error.message}`);

  return (data as unknown as (NotificationRow & { rides: RideRow })[]).map((row) => ({
    notification: toNotification(row),
    ride: {
      originAreaId: row.rides.origin_area_id,
      destinationAreaId: row.rides.destination_area_id,
      departsAt: row.rides.departs_at,
    },
  }));
}

export async function markRead(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) throw new Error(`notificationRepository.markRead failed: ${error.message}`);
}

export async function markAllRead(db: SupabaseClient): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw new Error(`notificationRepository.markAllRead failed: ${error.message}`);
}
