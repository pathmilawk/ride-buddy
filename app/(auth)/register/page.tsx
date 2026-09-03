import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

/**
 * US-01 - registration.
 *
 * BR-1.2: deliberately no note claiming a company address is required, because none is
 * enforced. Saying otherwise here would misrepresent what the system does.
 */
export default function RegisterPage() {
  return (
    <Card>
      <CardTitle>Create an account</CardTitle>
      <CardDescription>You will add your name and pickup area next.</CardDescription>
      <div className="mt-5">
        <RegisterForm />
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/sign-in" className="font-medium text-primary underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
