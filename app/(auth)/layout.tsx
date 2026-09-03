import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-6 text-center text-2xl font-semibold">Ride Buddy</h1>
      {children}
    </main>
  );
}
