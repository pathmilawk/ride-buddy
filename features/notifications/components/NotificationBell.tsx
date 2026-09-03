"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/db/supabase/client";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { notificationHref } from "@/lib/notification-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationView } from "@/lib/types";

export interface NotificationBellProps {
  /** Rendered server-side on every navigation, so the badge is correct without JS. */
  initialItems: NotificationView[];
  initialUnread: number;
  userId: string;
}

/**
 * The notification bell - badge, dropdown list, and OS-level toasts.
 *
 * Three deliberate choices:
 *
 * 1. **The initial state comes from the server.** The badge is correct on first paint with no
 *    JavaScript, and Realtime only has to carry what arrives afterwards. A client-fetch-on-mount
 *    approach would flash an empty bell on every navigation.
 *
 * 2. **OS permission is requested on the first bell CLICK**, never on page load. An unprompted
 *    permission dialog is the pattern browsers added friction to discourage, and a user who has
 *    not yet seen what notifications look like has no basis to decide.
 *
 * 3. **An OS toast fires only when the tab is not visible.** Showing a desktop notification for
 *    something already on screen is noise. The in-app badge covers the visible case.
 */
export function NotificationBell({ initialItems, initialUnread, userId }: NotificationBellProps) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Server-rendered props are the source of truth; adopt them whenever they change.
  useEffect(() => {
    setItems(initialItems);
    setUnread(initialUnread);
  }, [initialItems, initialUnread]);

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  // Live updates. RLS applies to Realtime too, so this can only ever receive our own rows -
  // the user_id filter is a bandwidth optimisation, not the security boundary.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          setUnread((n) => n + 1);

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            typeof document !== "undefined" &&
            document.visibilityState !== "visible"
          ) {
            // The row arrives without its ride context, and the wording is built server-side,
            // so the toast stays generic and the refresh below fills in the detail.
            new Notification("Ride Buddy", {
              body: "Something changed on one of your rides.",
              tag: "ride-buddy",
            });
          }

          // Re-render the server component so the list and its wording arrive properly.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // Close on an outside click, so the panel behaves like a menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Choice 2: ask on first interaction, and only once.
    if (next && permission === "default" && typeof Notification !== "undefined") {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  }

  function readOne(id: string) {
    const form = new FormData();
    form.set("notificationId", id);
    startTransition(async () => {
      await markNotificationReadAction(null, form);
      setItems((prev) =>
        prev.map((i) =>
          i.notification.id === id
            ? { ...i, notification: { ...i.notification, readAt: new Date().toISOString() } }
            : i,
        ),
      );
      setUnread((n) => Math.max(0, n - 1));
      router.refresh();
    });
  }

  function readAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setUnread(0);
      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          notification: { ...i.notification, readAt: i.notification.readAt ?? new Date().toISOString() },
        })),
      );
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        data-testid="notification-bell-button"
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground hover:bg-muted"
      >
        <span aria-hidden="true" className="text-lg">&#128276;</span>
        {unread > 0 ? (
          <span
            data-testid="notification-unread-badge"
            className="absolute right-0 top-1 min-w-5 rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          data-testid="notification-panel"
          className="absolute right-0 z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-card shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 ? (
              <Button
                variant="ghost"
                onClick={readAll}
                className="min-h-0 px-2 text-sm"
                data-testid="notification-mark-all-button"
              >
                Mark all read
              </Button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p data-testid="notification-empty" className="px-3 py-4 text-sm text-muted-foreground">
              Nothing yet. You will hear about seat requests and answers here.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map(({ notification, title, body }) => {
                const isUnread = notification.readAt === null;
                return (
                  <li
                    key={notification.id}
                    data-testid="notification-item"
                    className={cn("border-b border-border last:border-0", isUnread && "bg-accent")}
                  >
                    <Link
                      href={notificationHref(notification.kind)}
                      onClick={() => {
                        if (isUnread) readOne(notification.id);
                        setOpen(false);
                      }}
                      className="block px-3 py-2 hover:bg-muted"
                    >
                      <p className="text-sm font-medium">
                        {isUnread ? (
                          <span aria-hidden="true" className="mr-1 text-primary">&bull;</span>
                        ) : null}
                        {title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {permission === "denied" ? (
            <p className="border-t border-border px-3 py-2 text-sm text-muted-foreground">
              Desktop notifications are blocked in your browser settings. The bell still works.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
