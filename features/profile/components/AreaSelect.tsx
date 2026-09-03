import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Area } from "@/lib/types";

export interface AreaSelectProps {
  name: string;
  areas: Area[];
  label: string;
  defaultValue?: string | null;
  testId: string;
  required?: boolean;
}

/**
 * US-05 - locations are selected, never typed (BR-1.12).
 *
 * Options are grouped by `kind` so an office is distinguishable from a residential area
 * (BR-1.13), while remaining an ordinary entry in the same list (FR-9).
 *
 * `testId` is a prop rather than a constant because Unit 2 reuses this component for ride
 * origin and destination, and each usage needs its own stable identifier.
 */
export function AreaSelect({
  name,
  areas,
  label,
  defaultValue,
  testId,
  required = true,
}: AreaSelectProps) {
  const offices = areas.filter((a) => a.kind === "office");
  const residential = areas.filter((a) => a.kind === "residential");

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="mt-1"
        data-testid={testId}
      >
        <option value="" disabled>
          Select an area
        </option>
        {offices.length > 0 ? (
          <optgroup label="Offices">
            {offices.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        {residential.length > 0 ? (
          <optgroup label="Areas">
            {residential.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </Select>
    </div>
  );
}
