import { redirect } from "next/navigation";
import * as areaService from "@/services/area-service";
import * as profileService from "@/services/profile-service";
import { RideForm } from "@/features/rides/components/RideForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

/**
 * US-06, US-07, US-08 - publish a ride.
 *
 * The completeness gate is NOT checked here. It is checked in the service when the form is
 * submitted (BR-2.1), so a driver with an incomplete profile can still see the form and is
 * redirected to their profile only when they try to publish. Gating the page itself would be
 * a second gate BR-1.10 does not authorise.
 */
export default async function NewRidePage() {
  const [areas, profile] = await Promise.all([
    areaService.listAreas(),
    profileService.getOrCreateMyProfile(),
  ]);
  if (!profile.ok) redirect("/sign-in");

  return (
    <Card>
      <CardTitle>Offer a ride</CardTitle>
      <CardDescription>
        Publish a trip you are already making. Colleagues from your area can ask to join.
      </CardDescription>
      <div className="mt-5">
        <RideForm areas={areas} defaultOriginId={profile.value.homeAreaId} />
      </div>
    </Card>
  );
}
