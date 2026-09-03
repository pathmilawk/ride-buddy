"use client";

import { useActionState } from "react";
import { requestSeatAction } from "@/features/requests/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export interface RequestSeatButtonProps {
  rideId: string;
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * US-14 - ask for a seat.
 *
 * `disabled` and its reason arrive as props. The server already knows whether the ride is full
 * or the viewer's own (Unit 2's derived flags), so this component decides nothing - and the
 * server-side refusals in BR-3.1 are what actually enforce it. A disabled button is a courtesy,
 * not a control.
 *
 * FQ7=A: a RIDE_FULL error renders inline and the action revalidates, so the seats-remaining
 * figure corrects itself in the same pass. The passenger sees both what failed and what is now
 * true - which is the visible face of US-22's race condition.
 */
export function RequestSeatButton({ rideId, disabled, disabledReason }: RequestSeatButtonProps) {
  const [state, formAction, pending] = useActionState(requestSeatAction, null);

  if (state?.success) {
    return (
      <Alert tone="success" data-testid="request-seat-success">
        {state.success} You will see the driver&apos;s answer here.
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {state?.error ? (
        <Alert tone="error" data-testid="request-seat-error">
          {state.error}
        </Alert>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="rideId" value={rideId} />
        <Button
          type="submit"
          disabled={disabled || pending}
          data-testid="request-seat-button"
          className="w-full sm:w-auto"
        >
          {pending ? "Asking..." : "Ask for a seat"}
        </Button>
      </form>

      {disabled && disabledReason ? (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}
