import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "error" | "success";

const TONES: Record<Tone, string> = {
  info: "border-border bg-muted text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-foreground",
  success: "border-primary/40 bg-primary/10 text-foreground",
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

export function Alert({ className, tone = "info", ...props }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2 text-sm", TONES[tone], className)}
      {...props}
    />
  );
}

export function FieldError({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p className="mt-1 text-sm text-destructive" {...props}>
      {children}
    </p>
  );
}
