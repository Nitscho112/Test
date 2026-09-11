"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

import {
  AXIS_PROPS,
  axisTick,
  ChartEmpty,
  ChartTooltip,
  type TooltipSeries,
} from "@/components/chart-bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeightPowerPoint } from "@/lib/metrics";
import { formatShortDate } from "@/lib/utils";

const TOOLTIP_SERIES: TooltipSeries[] = [
  { dataKey: "weightKg", label: "Gewicht", unit: "kg", color: "var(--color-chart-1)", decimals: 1 },
  { dataKey: "ftpWatts", label: "FTP", unit: "W", color: "var(--color-chart-3)" },
  { dataKey: "requiredWatts", label: "Ziel-Watt", unit: "W", color: "var(--color-chart-2)" },
  {
    dataKey: "wattsPerKg",
    label: "Relativ",
    unit: "W/kg",
    color: "var(--color-chart-5)",
    decimals: 2,
  },
];

/**
 * Gewichtsverlust gegen Leistungsentwicklung.
 *
 * Die gestrichelte Ziel-Linie sinkt mit dem Gewicht, die FTP-Linie steigt mit
 * dem Training — ihr Schnittpunkt ist der Tag, an dem die G26.3-Vorgabe erfüllt
 * ist. Deshalb liegen beide bewusst in einem Diagramm.
 */
export function WeightPowerChart({ data }: { data: WeightPowerPoint[] }) {
  const hasData = data.length > 0;
  const tooltipContent = ChartTooltip({ series: TOOLTIP_SERIES });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="text-muted-foreground size-4" />
          Gewicht vs. Leistung
        </CardTitle>
        <CardDescription>
          Körpergewicht (linke Achse) gegen FTP und die dafür nötigen Ziel-Watt (rechte Achse).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} {...AXIS_PROPS} />
              <YAxis
                yAxisId="weight"
                domain={["dataMin - 2", "dataMax + 2"]}
                tickFormatter={axisTick("kg", 1)}
                width={66}
                {...AXIS_PROPS}
              />
              <YAxis
                yAxisId="watts"
                orientation="right"
                domain={["dataMin - 20", "dataMax + 20"]}
                tickFormatter={axisTick("W")}
                width={62}
                {...AXIS_PROPS}
              />
              <Tooltip content={tooltipContent} cursor={{ stroke: "var(--border)" }} />
              <Legend iconType="line" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="weightKg"
                name="Gewicht"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="watts"
                type="stepAfter"
                dataKey="ftpWatts"
                name="FTP"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                yAxisId="watts"
                type="monotone"
                dataKey="requiredWatts"
                name="Ziel-Watt"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty hint="Sobald ein Gewicht erfasst ist, erscheint hier die Kurve." />
        )}
      </CardContent>
    </Card>
  );
}
