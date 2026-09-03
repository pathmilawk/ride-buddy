"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AreaSelect } from "@/features/profile/components/AreaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Area } from "@/lib/types";

export interface SearchFiltersProps {
  areas: Area[];
  defaultDate: string;
  defaultOriginId: string;
  defaultDestinationId: string;
}

/**
 * US-11 - search filters.
 *
 * FQ6=A: submitting **navigates** with new URL search parameters rather than posting. There is
 * no Server Action and no client-side result state - the Server Component re-renders from the
 * URL, which also makes any search a shareable link.
 *
 * Defaults arrive as props (BR-2.18). This component does not derive them; the page reads the
 * employee's home area server-side and passes it in.
 */
export function SearchFilters({
  areas,
  defaultDate,
  defaultOriginId,
  defaultDestinationId,
}: SearchFiltersProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams({
      date: String(data.get("date") ?? ""),
      originAreaId: String(data.get("originAreaId") ?? ""),
      destinationAreaId: String(data.get("destinationAreaId") ?? ""),
    });
    setPending(true);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={defaultDate}
          className="mt-1"
          data-testid="search-filters-date-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AreaSelect
          name="originAreaId"
          areas={areas}
          label="Starting from"
          defaultValue={defaultOriginId}
          testId="search-filters-origin-area-select"
        />
        <AreaSelect
          name="destinationAreaId"
          areas={areas}
          label="Going to"
          defaultValue={defaultDestinationId}
          testId="search-filters-destination-area-select"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto"
        data-testid="search-filters-submit-button"
      >
        {pending ? "Searching..." : "Search rides"}
      </Button>
    </form>
  );
}
