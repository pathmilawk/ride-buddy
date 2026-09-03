import { RideCard } from "@/features/rides/components/RideCard";
import type { RideListItem, RideRequestView } from "@/lib/types";

/**
 * US-25 - the driver's own upcoming rides, each with its requests.
 *
 * **Now complete.** Unit 2 shipped the ride list without a request list, which the approved
 * story map recorded as partial. Unit 3 supplies `requestViews`, satisfying the remaining
 * criteria: each ride lists its requests, and accept/reject are available on pending ones.
 */
export function MyRidesList({
  items,
  requestViews,
}: {
  items: RideListItem[];
  requestViews: Map<string, RideRequestView[]>;
}) {
  if (items.length === 0) {
    return (
      <p data-testid="my-rides-empty" className="text-sm text-muted-foreground">
        You have no upcoming rides. Offer one and colleagues from your area can ask to join.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <RideCard
          key={item.ride.id}
          item={item}
          variant="mine"
          requestViews={requestViews.get(item.ride.id) ?? []}
        />
      ))}
    </div>
  );
}
