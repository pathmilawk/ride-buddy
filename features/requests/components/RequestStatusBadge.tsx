import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/lib/types";

/**
 * One of the six statuses (FR-35), including derived `expired`.
 *
 * Wording is distinct per status on purpose. With no notifications at all (FR-42), the badge is
 * the only thing that tells a passenger what happened - and "the driver said no" versus "the
 * ride left before anyone answered" is a distinction they will care about.
 */
const LABELS: Record<DisplayStatus, string> = {
  pending: "Waiting for the driver",
  accepted: "Accepted",
  rejected: "Declined by the driver",
  withdrawn: "You withdrew this",
  cancelled: "Ride was cancelled",
  expired: "Ride left before this was answered",
};

const TONES: Record<DisplayStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-primary/15 text-foreground",
  rejected: "bg-destructive/10 text-foreground",
  withdrawn: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function RequestStatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      data-testid="request-status-badge"
      className={cn("inline-block rounded-md px-2 py-1 text-sm", TONES[status])}
    >
      {LABELS[status]}
    </span>
  );
}
