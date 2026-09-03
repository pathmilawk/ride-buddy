"use client";

import { useActionState } from "react";
import { createRideAction } from "@/features/rides/actions";
import { AreaSelect } from "@/features/profile/components/AreaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, FieldError } from "@/components/ui/alert";
import type { Area } from "@/lib/types";

const SEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * US-06, US-07, US-08 - publish a ride.
 *
 * Date and time are two inputs, as a driver thinks of them, and are combined into one instant
 * at the action boundary (FQ1=A). Input shape and storage shape differ deliberately.
 *
 * There is deliberately no same-area validation: FQ4=B permits a ride whose origin equals its
 * destination (BR-2.4).
 */
export function RideForm({ areas, defaultOriginId }: { areas: Area[]; defaultOriginId?: string | null }) {
  const [state, formAction, pending] = useActionState(createRideAction, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? (
        <Alert tone="error" data-testid="ride-form-error-message">
          {state.error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            min={today}
            defaultValue={today}
            className="mt-1"
            data-testid="ride-form-date-input"
          />
          <FieldError>{state?.fields?.date}</FieldError>
        </div>
        <div>
          <Label htmlFor="time">Departure time</Label>
          <Input
            id="time"
            name="time"
            type="time"
            required
            className="mt-1"
            data-testid="ride-form-time-input"
          />
          <FieldError>{state?.fields?.time}</FieldError>
        </div>
      </div>

      <div>
        <AreaSelect
          name="originAreaId"
          areas={areas}
          label="Starting from"
          defaultValue={defaultOriginId}
          testId="ride-form-origin-area-select"
        />
        <FieldError>{state?.fields?.originAreaId}</FieldError>
      </div>

      <div>
        <AreaSelect
          name="destinationAreaId"
          areas={areas}
          label="Going to"
          testId="ride-form-destination-area-select"
        />
        <FieldError>{state?.fields?.destinationAreaId}</FieldError>
      </div>

      <div>
        <Label htmlFor="seats">Spare seats</Label>
        {/*
          A select rather than a number input, so BR-2.2's 1-8 bounds are expressed in the
          control instead of only in an error message.
        */}
        <Select
          id="seats"
          name="seats"
          defaultValue="1"
          required
          className="mt-1"
          data-testid="ride-form-seats-select"
        >
          {SEAT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <FieldError>{state?.fields?.seats}</FieldError>
      </div>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          name="note"
          maxLength={280}
          placeholder="e.g. leaving from the north gate, no room for large bags"
          className="mt-1"
          data-testid="ride-form-note-input"
        />
        <FieldError>{state?.fields?.note}</FieldError>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto"
        data-testid="ride-form-submit-button"
      >
        {pending ? "Publishing..." : "Publish ride"}
      </Button>

      <p className="text-sm text-muted-foreground">
        A published ride cannot be edited. If you get something wrong, cancel it and create a
        new one.
      </p>
    </form>
  );
}
