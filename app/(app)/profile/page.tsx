import { redirect } from "next/navigation";
import * as areaService from "@/services/area-service";
import * as profileService from "@/services/profile-service";
import { IncompleteBanner } from "@/features/profile/components/IncompleteBanner";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GATED_FIELDS, type GatedField } from "@/lib/profile-completeness";

/**
 * US-02, US-03, US-04, US-05 - the profile screen.
 *
 * A Server Component: it reads through the services during render (AQ2=A). There is no JSON
 * endpoint behind this page.
 *
 * The `missing` search parameter is how the completeness gate hands over which fields it
 * refused on (BR-1.11, FQ6=A). Units 2 and 3 will redirect here with it when their gated
 * actions are refused.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ missing?: string }>;
}) {
  const params = await searchParams;

  const [profileResult, areas] = await Promise.all([
    profileService.getOrCreateMyProfile(),
    areaService.listAreas(),
  ]);

  // The middleware guarantees a session (BR-1.6), so this is a belt-and-braces guard rather
  // than an expected path.
  if (!profileResult.ok) redirect("/sign-in");

  // Only accept field names the gate actually recognises, so a hand-edited URL cannot inject
  // arbitrary text into the banner.
  const missingFields = (params.missing ?? "")
    .split(",")
    .filter((f): f is GatedField => (GATED_FIELDS as readonly string[]).includes(f));

  return (
    <div className="space-y-5">
      <IncompleteBanner missingFields={missingFields} />
      <Card>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>
          Colleagues see your name and pickup area. Your phone number stays private until a ride
          request is accepted.
        </CardDescription>
        <div className="mt-5">
          <ProfileForm profile={profileResult.value} areas={areas} />
        </div>
      </Card>
    </div>
  );
}
