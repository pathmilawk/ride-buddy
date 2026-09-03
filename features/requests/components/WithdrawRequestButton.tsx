"use client";

import { useActionState, useState } from "react";
import { withdrawRequestAction } from "@/features/requests/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/**
 * US-20 - withdraw a request.
 *
 * Confirms **only when the request was accepted**, where withdrawing gives up a seat a driver
 * agreed to and frees it for someone else. Withdrawing a pending request needs no confirmation:
 * nothing has been agreed, and nothing is lost.
 *
 * That is the same reasoning as elsewhere in the app - confirm what is costly and irreversible,
 * not everything.
 */
export function WithdrawRequestButton({
  requestId,
  wasAccepted,
}: {
  requestId: string;
  wasAccepted: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(withdrawRequestAction, null);

  if (state?.error) return <Alert tone="error">{state.error}</Alert>;

  const submitForm = (
    <form action={formAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <Button
        type="submit"
        variant={wasAccepted ? "destructive" : "secondary"}
        disabled={pending}
        data-testid={confirming ? "withdraw-request-confirm-button" : "withdraw-request-trigger-button"}
      >
        {pending ? "Withdrawing..." : confirming ? "Yes, give up the seat" : "Withdraw"}
      </Button>
    </form>
  );

  if (!wasAccepted) return submitForm;

  if (!confirming) {
    return (
      <Button
        variant="secondary"
        onClick={() => setConfirming(true)}
        data-testid="withdraw-request-trigger-button"
      >
        Withdraw
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <p className="text-sm">
        Give up this seat? The driver will see it as withdrawn and the seat becomes available to
        someone else.
      </p>
      <div className="flex flex-wrap gap-2">
        {submitForm}
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Keep the seat
        </Button>
      </div>
    </div>
  );
}
