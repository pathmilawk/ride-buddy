import type { NotificationKind } from "@/lib/types";

/**
 * Notification wording, as a pure function.
 *
 * The message is NOT stored - only `kind` and the ride/request ids are. That keeps the copy
 * editable without a data migration, and it keeps this unit testable, which the stored
 * alternative would not be.
 *
 * Same reasoning as `describeMissingFields` in Unit 1 and `displayStatus` in Unit 3: if a rule
 * or a piece of user-facing wording can be a pure function, make it one.
 */

export interface RideContext {
  originName: string;
  destinationName: string;
  departsAt: string;
}

const TITLES: Record<NotificationKind, string> = {
  request_received: "Someone wants a seat",
  request_accepted: "You have a seat",
  request_declined: "Request declined",
  ride_cancelled: "A ride was cancelled",
};

/** Short, deliberately distinct so a glance at the list tells you what happened. */
export function notificationTitle(kind: NotificationKind): string {
  return TITLES[kind];
}

function whenLabel(departsAt: string): string {
  const d = new Date(departsAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function notificationBody(kind: NotificationKind, ride: RideContext): string {
  const route = `${ride.originName} to ${ride.destinationName}`;
  const when = whenLabel(ride.departsAt);
  const trip = when ? `${route}, ${when}` : route;

  switch (kind) {
    case "request_received":
      return `A colleague asked to join your ride: ${trip}.`;
    case "request_accepted":
      // The one message that should say what to do next - contact details are now available.
      return `Your seat is confirmed on ${trip}. You can now see each other's contact details.`;
    case "request_declined":
      return `The driver could not fit you in on ${trip}.`;
    case "ride_cancelled":
      // The gap this whole feature exists to close: section 9.2 recorded that a passenger
      // previously learned of a cancellation only by opening the app and looking.
      return `The driver cancelled ${trip}. You will need another way in.`;
  }
}

/** Does this notification concern the recipient as a driver, or as a passenger? */
export function notificationAudience(kind: NotificationKind): "driver" | "passenger" {
  return kind === "request_received" ? "driver" : "passenger";
}

/** Where clicking the notification should take the recipient. */
export function notificationHref(kind: NotificationKind): string {
  return notificationAudience(kind) === "driver" ? "/rides" : "/requests";
}
