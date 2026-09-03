import { Alert } from "@/components/ui/alert";
import { describeMissingFields, type GatedField } from "@/lib/profile-completeness";

export interface IncompleteBannerProps {
  missingFields: GatedField[];
}

/**
 * US-04 / BR-1.11 / FQ6=A - shown when the completeness gate redirected the user here.
 *
 * Names what is missing and why. The message text comes from the same pure function the gate
 * itself uses, so the banner cannot drift from the rule.
 */
export function IncompleteBanner({ missingFields }: IncompleteBannerProps) {
  if (missingFields.length === 0) return null;

  return (
    <Alert tone="info" data-testid="profile-incomplete-banner">
      <p className="font-medium">{describeMissingFields(missingFields)}</p>
      <p className="mt-1 text-muted-foreground">
        Colleagues need these to recognise you and get in touch once you have agreed to share a
        ride.
      </p>
    </Alert>
  );
}
