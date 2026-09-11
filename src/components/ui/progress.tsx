import * as React from "react";

import { cn } from "@/lib/utils";

/** Schlanker Fortschrittsbalken ohne zusätzliche Abhängigkeit. */
function Progress({
  value,
  className,
  indicatorClassName,
  ...props
}: React.ComponentProps<"div"> & { value: number; indicatorClassName?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("bg-muted relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        className={cn("bg-primary h-full rounded-full transition-all", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
