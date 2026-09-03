import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * text-base is 16px, which prevents iOS Safari zooming the viewport on focus (NFR-5).
 * min-h-11 is the 44px tap target.
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "block min-h-11 w-full rounded-md border border-border bg-card px-3 text-base text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
