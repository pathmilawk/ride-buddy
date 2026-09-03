import Link from "next/link";
import { RequestStatusBadge } from "@/features/requests/components/RequestStatusBadge";
import { WithdrawRequestButton } from "@/features/requests/components/WithdrawRequestButton";
import { ContactDetails } from "@/features/requests/components/ContactDetails";
import { canWithdraw } from "@/lib/request-transitions";
import { Card } from "@/components/ui/card";
import type { MyRequestView } from "@/lib/types";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** US-26 - the passenger's own requests. */
export function MyRequestsList({ items }: { items: MyRequestView[] }) {
  if (items.length === 0) {
    return (
      <p data-testid="my-requests-empty" className="text-sm text-muted-foreground">
        You have not asked to join any rides yet.{" "}
        <Link href="/search" className="font-medium text-primary underline">
          Find a ride
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.request.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-base font-medium">
                {item.originName} <span aria-hidden="true">&rarr;</span> {item.destinationName}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatWhen(item.ride.departsAt)} &middot; {item.driver?.displayName ?? "A colleague"}
              </p>
            </div>
            <RequestStatusBadge status={item.displayStatus} />
          </div>

          {/* Present only for an accepted request - the type is the proof (BR-3.27). */}
          {item.contact ? <ContactDetails contact={item.contact} /> : null}

          {canWithdraw(item.request.status) ? (
            <WithdrawRequestButton
              requestId={item.request.id}
              wasAccepted={item.request.status === "accepted"}
            />
          ) : null}
        </Card>
      ))}
    </div>
  );
}
