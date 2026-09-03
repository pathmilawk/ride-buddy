import Link from "next/link";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

/** US-01 - sign in. */
export default function SignInPage() {
  return (
    <Card>
      <CardTitle>Sign in</CardTitle>
      <CardDescription>Use your work email address.</CardDescription>
      <div className="mt-5">
        <SignInForm />
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-primary underline">
          Register
        </Link>
      </p>
    </Card>
  );
}
