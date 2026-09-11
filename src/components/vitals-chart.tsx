"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HeartPulse } from "lucide-react";

import {
  AXIS_PROPS,
  axisTick,
  ChartEmpty,
  ChartTooltip,
  type TooltipSeries,
} from "@/components/chart-bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VitalsPoint } from "@/lib/metrics";
import { formatShortDate } from "@/lib/utils";

const BP_SERIES: TooltipSeries[] = [
  { dataKey: "systolic", label: "Systolisch", unit: "mmHg", color: "var(--color-chart-4)" },
  { dataKey: "diastolic", label: "Diastolisch", unit: "mmHg", color: "var(--color-chart-1)" },
];

const HR_SERIES: TooltipSeries[] = [
  { dataKey: "restingHr", label: "Ruhepuls", unit: "bpm", color: "var(--color-chart-5)" },
];

/**
 * Blutdruck- und Ruhepuls-Trend.
 *
 * Der grüne Korridor markiert den Normbereich, die gestrichelten Linien bei
 * 140/90 mmHg die Grenze zur Hypertonie — genau die Schwelle, die bei der
 * G26.3 gesondert betrachtet wird.
 */
export function VitalsChart({ data }: { data: VitalsPoint[] }) {
  const bpData = data.filter((point) => point.systolic && point.diastolic);
  const hrData = data.filter((point) => point.restingHr);

  const bpTooltip = ChartTooltip({ series: BP_SERIES });
  const hrTooltip = ChartTooltip({ series: HR_SERIES });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="text-muted-foreground size-4" />
          Blutdruck & Ruhepuls
        </CardTitle>
        <CardDescription>
          Die gestrichelten Linien markieren die Grenze zur Hypertonie: 140 mmHg
          systolisch, 90 mmHg diastolisch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bp">
          <TabsList>
            <TabsTrigger value="bp">Blutdruck</TabsTrigger>
            <TabsTrigger value="hr">Ruhepuls</TabsTrigger>
          </TabsList>

          <TabsContent value="bp">
            {bpData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={bpData} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} {...AXIS_PROPS} />
                  <YAxis
                    domain={[50, 180]}
                    ticks={[60, 80, 100, 120, 140, 160, 180]}
                    tickFormatter={axisTick()}
                    width={40}
                    {...AXIS_PROPS}
                  />
                  <ReferenceLine
                    y={140}
                    stroke="var(--color-chart-4)"
                    strokeDasharray="4 4"
                    label={{
                      value: "140",
                      position: "right",
                      fill: "var(--color-chart-4)",
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    y={90}
                    stroke="var(--color-chart-1)"
                    strokeDasharray="4 4"
                    label={{
                      value: "90",
                      position: "right",
                      fill: "var(--color-chart-1)",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip content={bpTooltip} cursor={{ stroke: "var(--border)" }} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolisch"
                    stroke="var(--color-chart-4)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolisch"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty hint="Noch keine Blutdruckwerte erfasst." />
            )}
          </TabsContent>

          <TabsContent value="hr">
            {hrData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hrData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} {...AXIS_PROPS} />
                  <YAxis
                    domain={["dataMin - 5", "dataMax + 5"]}
                    allowDecimals={false}
                    tickFormatter={axisTick("bpm")}
                    width={62}
                    {...AXIS_PROPS}
                  />
                  <Tooltip content={hrTooltip} cursor={{ stroke: "var(--border)" }} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="restingHr"
                    name="Ruhepuls"
                    stroke="var(--color-chart-5)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty hint="Noch kein Ruhepuls erfasst." />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
