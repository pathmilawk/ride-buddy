import { redirect } from "next/navigation";
import * as areaService from "@/services/area-service";
import * as profileService from "@/services/profile-service";
import * as rideService from "@/services/ride-service";
import { SearchFilters } from "@/features/search/components/SearchFilters";
import { SearchResults } from "@/features/search/components/SearchResults";
import { rideSearchSchema } from "@/lib/schemas";
import { Alert } from "@/components/ui/alert";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

/**
 * US-11, US-12, US-13 - search for a ride.
 *
 * FQ6=A: filter state lives entirely in URL search parameters, so a search is a shareable
 * link and there is no client-side result state.
 *
 * BR-2.18 / FQ7=C: on a first visit the filters are prefilled - origin from the employee's own
 * home area, date today - and results are shown immediately rather than an empty prompt.
 *
 * Search parameters are parsed leniently (`rideSearchSchema`), so a stale or hand-edited URL
 * falls back to those defaults instead of erroring. A search is a read, and a bad read has a
 * sensible fallback.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = rideSearchSchema.parse({
    date: typeof raw.date === "string" ? raw.date : undefined,
    originAreaId: typeof raw.originAreaId === "string" ? raw.originAreaId : undefined,
    destinationAreaId:
      typeof raw.destinationAreaId === "string" ? raw.destinationAreaId : undefined,
  });

  const [areas, profile] = await Promise.all([
    areaService.listAreas(),
    profileService.getOrCreateMyProfile(),
  ]);
  if (!profile.ok) redirect("/sign-in");

  const today = new Date().toISOString().slice(0, 10);

  // Defaults, per BR-2.18. Destination falls back to the first office in the seeded list:
  // "home area to the office" is vision.md's primary use case, and a prefill missing one of
  // the three filters could not run a search at all.
  const firstOffice = areas.find((a) => a.kind === "office");
  const date = parsed.date ?? today;
  const originAreaId = parsed.originAreaId ?? profile.value.homeAreaId ?? "";
  const destinationAreaId = parsed.destinationAreaId ?? firstOffice?.id ?? "";

  const canSearch = date !== "" && originAreaId !== "" && destinationAreaId !== "";
  const results = canSearch
    ? await rideService.searchRides({ date, originAreaId, destinationAreaId })
    : null;

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Find a ride</CardTitle>
        <CardDescription>
          Colleagues&apos; phone numbers stay private until a ride request is accepted.
        </CardDescription>
        <div className="mt-5">
          <SearchFilters
            areas={areas}
            defaultDate={date}
            defaultOriginId={originAreaId}
            defaultDestinationId={destinationAreaId}
          />
        </div>
      </Card>

      {!canSearch ? (
        <Alert tone="info">
          Add your home area to your profile and we can prefill this search for you.
        </Alert>
      ) : results && !results.ok ? (
        <Alert tone="error">{results.message}</Alert>
      ) : results ? (
        <SearchResults items={results.value} />
      ) : null}
    </div>
  );
}
