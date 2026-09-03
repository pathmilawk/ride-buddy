"use server";

import { redirect } from "next/navigation";
import * as authService from "@/services/auth-service";
import { credentialsSchema, toFieldErrors } from "@/lib/schemas";
import { field, type ActionState } from "@/lib/action-state";

/**
 * C14 Server Actions - auth.
 *
 * Every action here is the same four steps: parse with the shared schema, delegate to exactly
 * one service method, translate the Result, return it. No business rule lives in this file.
 * A rule placed here could not be reused by another caller and could not be unit tested
 * without a request context.
 */

export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) };
  }

  const result = await authService.signIn(parsed.data);
  // BR-1.3: the service already generalised the message. The action must not try to work out
  // whether the account exists - it is not given that information.
  if (!result.ok) return { error: result.message };

  redirect("/profile");
}

export async function registerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) };
  }

  // BR-1.2: no domain check. Any address registers.
  const result = await authService.signUp(parsed.data);
  if (!result.ok) return { error: result.message };

  redirect("/profile");
}

export async function signOutAction(): Promise<void> {
  await authService.signOut();
  redirect("/sign-in");
}
