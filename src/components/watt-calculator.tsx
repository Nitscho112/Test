"use client";

import * as React from "react";
import { Calculator, Target, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { computeWattTarget } from "@/lib/metrics";
import { formatNumber } from "@/lib/utils";

interface WattCalculatorProps {
  currentWeightKg?: number;
  startWeightKg: number;
  targetWattsPerKg: number;
  currentWatts?: number;
}

/**
 * Gewicht-vs-Watt-Rechner.
 *
 * Zeigt zuerst die eine Zahl, die im Ergometertest zählt, und macht danach über
 * den Regler beide Stellschrauben greifbar: mehr Leistung treten — oder
 * leichter werden. Der Regler verändert nur die Simulation, nie die Messdaten.
 */
export function WattCalculator({
  currentWeightKg,
  startWeightKg,
  targetWattsPerKg,
  currentWatts,
}: WattCalculatorProps) {
  const baseWeight = currentWeightKg ?? startWeightKg;
  const [simulatedWeight, setSimulatedWeight] = React.useState(baseWeight);

  // Neue Messung von der Waage → Simulation folgt dem echten Wert.
  React.useEffect(() => {
    setSimulatedWeight(baseWeight);
  }, [baseWeight]);

  const sliderMin = Math.max(50, Math.floor(baseWeight - 35));
  const sliderMax = Math.ceil(Math.max(startWeightKg, baseWeight) + 2);

  const live = computeWattTarget(simulatedWeight, targetWattsPerKg, currentWatts);
  const actual = computeWattTarget(baseWeight, targetWattsPerKg, currentWatts);
  const isSimulating = Math.abs(simulatedWeight - baseWeight) > 0.05;

  const achievedPct = currentWatts ? (currentWatts / live.requiredWatts) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="text-muted-foreground size-4" />
          Gewicht vs. Watt
        </CardTitle>
        <CardDescription>
          Zielvorgabe {formatNumber(targetWattsPerKg, 1)} W/kg auf dem Fahrrad-Ergometer.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Die Kernaussage */}
        <p className="text-lg leading-relaxed">
          Bei deinem {isSimulating ? "simulierten" : "aktuellen"} Gewicht von{" "}
          <span className="tabular font-semibold">{formatNumber(simulatedWeight, 1)} kg</span> musst
          du für {formatNumber(targetWattsPerKg, 1)} W/kg exakt{" "}
          <span className="tabular text-2xl font-semibold tracking-tight">
            {live.requiredWatts} Watt
          </span>{" "}
          treten.
        </p>

        {/* Simulationsregler */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="weight-sim"
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              Gewicht simulieren
            </label>
            {isSimulating ? (
              <button
                type="button"
                onClick={() => setSimulatedWeight(baseWeight)}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
              >
                Zurück auf {formatNumber(baseWeight, 1)} kg
              </button>
            ) : null}
          </div>
          <input
            id="weight-sim"
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={0.5}
            value={simulatedWeight}
            onChange={(event) => setSimulatedWeight(Number(event.target.value))}
            className="accent-primary h-2 w-full cursor-pointer"
          />
          <div className="text-muted-foreground flex justify-between text-xs tabular">
            <span>{sliderMin} kg</span>
            <span>{sliderMax} kg</span>
          </div>
        </div>

        <Separator />

        {/* Ist-Stand gegen Ziel */}
        {currentWatts ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">
                  Aktuelle Leistung {currentWatts} W
                  {live.currentWattsPerKg ? ` · ${formatNumber(live.currentWattsPerKg, 2)} W/kg` : ""}
                </span>
                <span className="tabular font-medium">
                  {Math.round(Math.min(achievedPct, 999))}%
                </span>
              </div>
              <Progress
                value={achievedPct}
                indicatorClassName={live.goalReached ? "bg-success" : "bg-chart-2"}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Metric
                icon={Target}
                label="Noch zu steigern"
                value={live.goalReached ? "Ziel erreicht" : `${live.wattGap} W`}
                hint={
                  live.goalReached
                    ? `${formatNumber(live.currentWattsPerKg ?? 0, 2)} W/kg liegen über dem Ziel`
                    : `von ${currentWatts} W auf ${live.requiredWatts} W`
                }
                positive={live.goalReached}
              />
              <Metric
                icon={TrendingDown}
                label="Oder: Zielgewicht"
                value={`${formatNumber(actual.weightForGoalAtCurrentWatts ?? 0, 1)} kg`}
                hint={`bei unveränderten ${currentWatts} W`}
                positive={actual.goalReached}
              />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Trage einen FTP-Test im Logbuch ein, um deinen Abstand zum Ziel zu sehen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  positive,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-muted/50 rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="tabular text-xl font-semibold tracking-tight">{value}</span>
        {positive ? <Badge variant="success">erreicht</Badge> : null}
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}
