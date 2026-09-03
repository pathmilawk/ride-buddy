import { RideCard } from "@/features/rides/components/RideCard";
import type { RideListItem } from "@/lib/types";

/** BR-2.19 - an empty result set is an explicit state, never a blank region. */
export function SearchResults({ items }: { items: RideListItem[] }) {
  if (items.length === 0) {
    return (
      <p data-testid="search-results-empty" className="text-sm text-muted-foreground">
        No rides match. Try another date, or a different pair of areas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <RideCard key={item.ride.id} item={item} variant="search" />
      ))}
    </div>
  );
}
