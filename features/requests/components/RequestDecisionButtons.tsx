"use client";

import { useActionState } from "react";
import { acceptRequestAction, rejectRequestAction } from "@/features/requests/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * US-19 - accept or decline a request.
 *
 * **No confirmation step on either action**, and the asymmetry with cancelling a ride is
 * deliberate:
 *
 *   - cancelling a ride confirms (BR-2.10) because it is permanent and, since Unit 3, cascades
 *     every accepted passenger's seat away
 *   - accepting does not, because it is the outcome the driver is trying to reach - putting
 *     friction on the demo's happiest path would be wrong
 *   - declining does not either, because the passenger can simply ask again (BR-3.7 permits a
 *     fresh request after a rejection)
 *
 * FQ7=A: a RIDE_FULL error renders inline beside the request it concerns, and the action
 * revalidates so the list shows the true current state.
 */
export function RequestDecisionButtons({ requestId }: { requestId: string }) {
  const [acceptState, acceptAction, accepting] = useActionState(acceptRequestAction, null);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectRequestAction, null);
  const error = acceptState?.error ?? rejectState?.error;
  const busy = accepting || rejecting;

  return (
    <div className="space-y-2">
      {error ? (
        <Alert tone="error" data-testid="request-decision-error">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <Button type="submit" disabled={busy} data-testid="request-accept-button">
            {accepting ? "Accepting..." : "Accept"}
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <Button
            type="submit"
            variant="secondary"
            disabled={busy}
            data-testid="request-reject-button"
          >
            {rejecting ? "Declining..." : "Decline"}
          </Button>
        </form>
      </div>
    </div>
  );
}
