import { redirect } from "next/navigation";
import * as requestService from "@/services/ride-request-service";
import { MyRequestsList } from "@/features/requests/components/MyRequestsList";

/**
 * US-26 - My Requests, on its own route (FQ6=A).
 *
 * A Server Component reading through the service during render (AQ2=A).
 *
 * BR-3.29 (FR-40, FR-41): lists the caller's own requests on upcoming rides, with the ride's
 * details, the driver's name and the current status - including derived EXPIRED.
 *
 * BR-3.31 (FR-7): reachable by every signed-in employee regardless of `role`. Nothing here
 * reads that field.
 *
 * Status is discoverable only here - nothing is emailed or pushed (FR-42, BR-3.30). That is a
 * recorded limitation, not an oversight: `requirements.md` Section 9.2 notes that an accepted
 * passenger learns of a cancellation only by opening the app.
 */
export default async function MyRequestsPage() {
  const result = await requestService.listMyRequests();
  if (!result.ok) redirect("/sign-in");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Rides you have asked to join</h1>
      <MyRequestsList items={result.value} />
    </div>
  );
}
