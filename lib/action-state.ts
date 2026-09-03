/**
 * The shape a Server Action returns to its calling form.
 *
 * Server Actions are the write boundary (AQ2=A) and hold no business rules. They translate a
 * service Result into something a form can render, and nothing more.
 */
export type ActionState = {
  readonly error?: string;
  readonly success?: string;
  readonly fields?: Readonly<Record<string, string>>;
} | null;

/** Read a form field as a string, so a missing field fails validation rather than typing. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
