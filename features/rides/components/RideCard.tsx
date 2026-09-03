import { CancelRideButton } from "@/features/rides/components/CancelRideButton";
import { RequestSeatButton } from "@/features/requests/components/RequestSeatButton";
import { RequestStatusBadge } from "@/features/requests/components/RequestStatusBadge";
import { ContactDetails } from "@/features/requests/components/ContactDetails";
import { RideRequestList } from "@/features/requests/components/RideRequestList";
import { Card } from "@/components/ui/card";
import type { RideListItem, RideRequestView } from "@/lib/types";

export interface RideCardProps {
  item: RideListItem;
  variant: "search" | "mine";
  /** Driver's view only: the requests on this ride (US-25, completed in Unit 3). */
  requestViews?: RideRequestView[];
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * One ride. A Server Component - it only renders what it is given.
 *
 * BR-2.20 (FR-19): carries exactly what a decision needs - driver name, both areas, departure
 * date and time, seats remaining, and the note where one exists.
 *
 * It receives an already-projected driver (`PublicProfile`), which has no contact fields. It
 * therefore **cannot** render a phone number from that source: there is nothing in those props
 * to render (BR-2.25, FR-20).
 *
 * Contact details reach it only as an `AcceptedContact` in `item.driverContact`, which the
 * accepted-pair read path populates and only when the viewer's own request is accepted (FR-30).
 * The type is the guarantee - a `PublicProfile` cannot be passed where one is expected.
 */
export function RideCard({ item, variant, requestViews }: RideCardProps) {
  const { ride, seatsRemaining, isFull, isOwnRide, driver, myRequest, driverContact } = item;

  return (
    <Card data-testid="ride-card" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-base font-medium">
            {item.originName} <span aria-hidden="true">&rarr;</span> {item.destinationName}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{formatWhen(ride.departsAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isFull ? (
            <span
              data-testid="ride-card-full-badge"
              className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground"
            >
              Full
            </span>
          ) : (
            <span data-testid="ride-card-seats-remaining" className="text-sm text-muted-foreground">
              {seatsRemaining} of {ride.seats} free
            </span>
          )}
        </div>
      </div>

      {variant === "search" ? (
        <p className="text-sm text-muted-foreground">
          Driver: {driver?.displayName ?? "A colleague"}
          {isOwnRide ? " (you)" : ""}
        </p>
      ) : null}

      {ride.note ? <p className="break-words text-sm">{ride.note}</p> : null}

      {/* Passenger side. BR-2.23's own-ride marker suppresses the action; BR-3.4 refuses it
          server-side regardless, because a marker is not enforcement. */}
      {variant === "search" && !isOwnRide ? (
        myRequest ? (
          <div className="space-y-2">
            <RequestStatusBadge status={myRequest.displayStatus} />
            {driverContact ? <ContactDetails contact={driverContact} /> : null}
          </div>
        ) : (
          <RequestSeatButton
            rideId={ride.id}
            disabled={isFull}
            disabledReason={isFull ? "Every seat on this ride is taken." : undefined}
          />
        )
      ) : null}

      {/* Driver side. */}
      {variant === "mine" ? (
        <>
          <CancelRideButton rideId={ride.id} />
          {requestViews ? <RideRequestList views={requestViews} /> : null}
        </>
      ) : null}
    </Card>
  );
}
