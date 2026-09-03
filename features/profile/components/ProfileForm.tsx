"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/features/profile/actions";
import { AreaSelect } from "@/features/profile/components/AreaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, type RadioOption } from "@/components/ui/radio-group";
import { Alert, FieldError } from "@/components/ui/alert";
import type { Area, Profile } from "@/lib/types";

export interface ProfileFormProps {
  profile: Profile;
  areas: Area[];
}

/**
 * US-02, US-03 - complete and update a profile.
 *
 * Client-side validation is left to the browser's native constraints plus the shared schema
 * on the server. Deliberately no stricter client mask on the phone field: a mask rejecting
 * what the schema accepts would block valid input with no server-side justification (FQ3=A).
 */
const ROLE_OPTIONS: readonly RadioOption[] = [
  { value: "driver", label: "Driver", hint: "I usually offer seats" },
  { value: "passenger", label: "Passenger", hint: "I usually look for a seat" },
  { value: "both", label: "Both", hint: "Depends on the day" },
];

export function ProfileForm({ profile, areas }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? (
        <Alert tone="error" data-testid="profile-form-error-message">
          {state.error}
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert tone="success" data-testid="profile-form-success-message">
          {state.success}
        </Alert>
      ) : null}

      {/*
        US-02: email is rendered as read-only text rather than a disabled input, so it cannot
        be submitted at all. A disabled input is merely ignored by the browser; text cannot
        be tampered with in the first place.
      */}
      <div>
        <Label htmlFor="email-display">Work email</Label>
        <p
          id="email-display"
          className="mt-1 min-h-11 rounded-md border border-border bg-muted px-3 py-3 text-base text-muted-foreground"
        >
          {profile.email}
        </p>
      </div>

      <div>
        <Label htmlFor="displayName">Name</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile.displayName ?? ""}
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          className="mt-1"
          data-testid="profile-form-name-input"
        />
        <FieldError data-testid="profile-form-displayName-error">
          {state?.fields?.displayName}
        </FieldError>
      </div>

      <div>
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={profile.phone ?? ""}
          autoComplete="tel"
          required
          className="mt-1"
          data-testid="profile-form-phone-input"
        />
        <FieldError data-testid="profile-form-phone-error">{state?.fields?.phone}</FieldError>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared with a colleague only after one of you accepts a ride request.
        </p>
      </div>

      <div>
        <AreaSelect
          name="homeAreaId"
          areas={areas}
          label="Home / pickup area"
          defaultValue={profile.homeAreaId}
          testId="profile-form-home-area-select"
        />
        <FieldError data-testid="profile-form-homeAreaId-error">
          {state?.fields?.homeAreaId}
        </FieldError>
      </div>

      {/* FQ4=A: defaults to "both", and never gates any action (FR-7). */}
      <RadioGroup
        name="role"
        legend="How do you usually travel?"
        options={ROLE_OPTIONS}
        defaultValue={profile.role}
        data-testid="profile-form-role-radiogroup"
      />

      <Button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto"
        data-testid="profile-form-submit-button"
      >
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
