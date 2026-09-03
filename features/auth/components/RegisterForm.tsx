"use client";

import { useActionState } from "react";
import { registerAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, FieldError } from "@/components/ui/alert";

/**
 * US-01 - registration.
 *
 * BR-1.2: no domain hint and no domain validation. Any email address registers. Adding a
 * "must be a company address" message would misrepresent the system's behaviour.
 */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <Alert tone="error" data-testid="register-form-error-message">
          {state.error}
        </Alert>
      ) : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1"
          data-testid="register-form-email-input"
        />
        <FieldError>{state?.fields?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="mt-1"
          data-testid="register-form-password-input"
        />
        <FieldError>{state?.fields?.password}</FieldError>
        <p className="mt-1 text-sm text-muted-foreground">At least 8 characters.</p>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full"
        data-testid="register-form-submit-button"
      >
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
