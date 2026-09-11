"use client";

import * as React from "react";

import { formatDate, formatNumber } from "@/lib/utils";

export interface TooltipSeries {
  dataKey: string;
  label: string;
  unit: string;
  /** CSS-Farbe des Serienpunkts, i. d. R. `var(--color-chart-N)`. */
  color: string;
  decimals?: number;
}

/**
 * Einheitlicher Tooltip für alle Diagramme: deutsches Datum, feste
 * Reihenfolge der Serien und Einheiten direkt am Wert.
 */
export function ChartTooltip({ series }: { series: TooltipSeries[] }) {
  function Content(props: {
    active?: boolean;
    label?: string | number;
    payload?: { dataKey?: string | number; value?: number | string }[];
  }) {
    const { active, label, payload } = props;
    if (!active || !payload?.length || typeof label !== "string") return null;

    const values = new Map(payload.map((item) => [String(item.dataKey), item.value]));

    return (
      <div className="bg-popover text-popover-foreground rounded-lg border p-3 text-xs shadow-md">
        <div className="mb-1.5 font-medium">{formatDate(label)}</div>
        <div className="space-y-1">
          {series.map((entry) => {
            const value = values.get(entry.dataKey);
            if (typeof value !== "number") return null;
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.label}</span>
                </span>
                <span className="tabular font-medium">
                  {formatNumber(value, entry.decimals ?? 0)} {entry.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return Content;
}

/** Platzhalter, solange für ein Diagramm noch keine Werte erfasst sind. */
export function ChartEmpty({ hint }: { hint: string }) {
  return (
    <div className="text-muted-foreground flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm">
      {hint}
    </div>
  );
}

/** Achsenbeschriftung mit deutschem Dezimalkomma und optionaler Einheit. */
export function axisTick(unit?: string, decimals = 0) {
  return (value: number) =>
    `${formatNumber(value, decimals)}${unit ? ` ${unit}` : ""}`;
}

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  stroke: "var(--muted-foreground)",
  fontSize: 11,
} as const;
