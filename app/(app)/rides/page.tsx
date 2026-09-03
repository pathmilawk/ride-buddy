import Link from "next/link";
import { redirect } from "next/navigation";
import * as rideService from "@/services/ride-service";
import * as requestService from "@/services/ride-request-service";
import { MyRidesList } from "@/features/rides/components/MyRidesList";
import { Button } from "@/components/ui/button";

/**
 * US-25 - My Rides, now with each ride's requests.
 *
 * BR-2.28 (FR-39, FR-41): lists the caller's own upcoming rides, filtered by driver id with the
 * two upcoming predicates applied.
 *
 * BR-2.30 (FR-7): reachable by every signed-in employee regardless of their `role`. Nothing
 * here reads that field - role grants no permissions.
 *
 * **US-25 is complete as of Unit 3.** BR-3.28's per-ride request list and the accept/reject
 * actions are supplied by `listRequestsForRideIds`, closing the carried-forward finding the
 * approved story map recorded.
 */
export default async function MyRidesPage() {
  const result = await rideService.listMyRides();
  if (!result.ok) redirect("/sign-in");

  // One batched call for every ride's requests, rather than a query per card.
  const requestViews = await requestService.listRequestsForRideIds(
    result.value.map((item) => ({
      id: item.ride.id,
      departsAt: item.ride.departsAt,
      driverId: item.ride.driverId,
    })),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Rides you are driving</h1>
        <Link href="/rides/new" data-testid="my-rides-offer-ride-link">
          <Button>Offer a ride</Button>
        </Link>
      </div>
      <MyRidesList
        items={result.value}
        requestViews={requestViews.ok ? requestViews.value : new Map()}
      />
    </div>
  );
}
