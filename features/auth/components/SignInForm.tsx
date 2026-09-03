"use client";

import { useActionState } from "react";
import { signInAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, FieldError } from "@/components/ui/alert";

/**
 * US-01 - sign in.
 *
 * BR-1.3: the error shown is whatever the service returned, which is always generic. This
 * component must not try to distinguish "no such account" from "wrong password" - it is not
 * given that information.
 */
export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <Alert tone="error" data-testid="sign-in-form-error-message">
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
          data-testid="sign-in-form-email-input"
        />
        <FieldError>{state?.fields?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1"
          data-testid="sign-in-form-password-input"
        />
        <FieldError>{state?.fields?.password}</FieldError>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full"
        data-testid="sign-in-form-submit-button"
      >
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
