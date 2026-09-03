"use client";

import { useActionState, useState } from "react";
import { cancelRideAction } from "@/features/rides/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * BR-2.10 / FQ8=A - cancellation requires explicit confirmation.
 *
 * This is a business rule, not decoration. FR-15 makes cancel-and-recreate the only way to
 * correct a ride, so it gets used routinely - and once Unit 3 lands, the same action will
 * cascade every accepted passenger's seat away (FR-38). A permanent, widening action reached
 * by one misplaced tap is a defect waiting to happen.
 *
 * Inline rather than a modal: fewer moving parts, and it reads clearly on a phone.
 */
export function CancelRideButton({ rideId }: { rideId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(cancelRideAction, null);

  if (state?.error) {
    return <Alert tone="error">{state.error}</Alert>;
  }

  if (!confirming) {
    return (
      <Button
        variant="secondary"
        onClick={() => setConfirming(true)}
        data-testid="cancel-ride-trigger-button"
      >
        Cancel ride
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <p className="text-sm">
        Cancel this ride permanently? It cannot be undone, and rides cannot be edited &mdash;
        you would need to create a new one.
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="rideId" value={rideId} />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            data-testid="cancel-ride-confirm-button"
          >
            {pending ? "Cancelling..." : "Yes, cancel it"}
          </Button>
        </form>
        <Button
          variant="ghost"
          onClick={() => setConfirming(false)}
          data-testid="cancel-ride-dismiss-button"
        >
          Keep the ride
        </Button>
      </div>
    </div>
  );
}
