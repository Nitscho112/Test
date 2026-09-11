import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value?: string;
  unit?: string;
  /** Zweite Zeile unter dem Hauptwert, z. B. relative Leistung. */
  secondary?: string;
  /** Kontext rechts oben, meist das Messdatum. */
  meta?: string;
  badge?: React.ReactNode;
  /** Text, wenn noch keine Daten vorliegen. */
  placeholder?: string;
  accent?: "neutral" | "success" | "warning" | "destructive";
}

const accentRing: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function KpiCard({
  label,
  icon: Icon,
  value,
  unit,
  secondary,
  meta,
  badge,
  placeholder = "Noch keine Daten",
  accent = "neutral",
}: KpiCardProps) {
  return (
    <Card className="gap-0 py-5">
      <div className="flex items-start justify-between px-5">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4", accentRing[accent])} />
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
        </div>
        {meta ? <span className="text-muted-foreground text-xs tabular">{meta}</span> : null}
      </div>

      <div className="mt-3 px-5">
        {value ? (
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-3xl leading-none font-semibold tracking-tight">
              {value}
            </span>
            {unit ? <span className="text-muted-foreground text-sm">{unit}</span> : null}
          </div>
        ) : (
          <span className="text-muted-foreground text-lg">{placeholder}</span>
        )}
      </div>

      {secondary || badge ? (
        <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2 px-5">
          {badge}
          {secondary ? (
            <span className="text-muted-foreground text-xs tabular">{secondary}</span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
