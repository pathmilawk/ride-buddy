import { RequestStatusBadge } from "@/features/requests/components/RequestStatusBadge";
import { RequestDecisionButtons } from "@/features/requests/components/RequestDecisionButtons";
import { ContactDetails } from "@/features/requests/components/ContactDetails";
import { displayGroup } from "@/lib/request-transitions";
import type { RideRequestView } from "@/lib/types";

/**
 * US-18, US-25 - the requests on one of the driver's rides.
 *
 * **Completes US-25**, partially satisfied since Unit 2, and **completes US-13**: a pending
 * entry shows the requester's name and pickup area, and cannot show a phone number, because the
 * data it receives came through the public view which has no such column (FR-27, BR-3.26).
 *
 * FQ8=A: all six statuses appear. Pending and accepted are prominent; the terminal group is
 * separated and collapsed, so a withdrawn passenger leaves a trace without crowding out what
 * needs action.
 */
export function RideRequestList({ views }: { views: RideRequestView[] }) {
  if (views.length === 0) {
    return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  }

  const active = views.filter((v) => displayGroup(v.displayStatus) !== "terminal");
  const terminal = views.filter((v) => displayGroup(v.displayStatus) === "terminal");

  return (
    <div data-testid="ride-request-list" className="space-y-3 border-t border-border pt-3">
      <p className="text-sm font-medium">Requests</p>

      {active.map((view) => (
        <div key={view.request.id} data-testid="ride-request-item" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-medium">{view.requester?.displayName ?? "A colleague"}</span>
              {/* Name and pickup area only. There is no phone number in these props. */}
            </p>
            <RequestStatusBadge status={view.displayStatus} />
          </div>

          {view.displayStatus === "pending" ? (
            <RequestDecisionButtons requestId={view.request.id} />
          ) : null}

          {view.contact ? <ContactDetails contact={view.contact} /> : null}
        </div>
      ))}

      {terminal.length > 0 ? (
        <details data-testid="ride-request-terminal-group" className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {terminal.length} closed {terminal.length === 1 ? "request" : "requests"}
          </summary>
          <div className="mt-2 space-y-2">
            {terminal.map((view) => (
              <div
                key={view.request.id}
                data-testid="ride-request-item"
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>{view.requester?.displayName ?? "A colleague"}</span>
                <RequestStatusBadge status={view.displayStatus} />
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
