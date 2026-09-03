import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";

/**
 * Authenticated shell. Units 2 and 3 add their screens inside this layout rather than
 * restating the responsive rules (NFR-5, US-28).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
