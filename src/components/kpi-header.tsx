import { Activity, Gauge, HeartPulse, Scale } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import type { BpLevel, DashboardKpis } from "@/lib/metrics";
import { formatDate, formatDelta, formatNumber } from "@/lib/utils";

const BP_ACCENT: Record<BpLevel, "success" | "warning" | "destructive"> = {
  optimal: "success",
  normal: "success",
  "hoch-normal": "warning",
  hyperton: "destructive",
  kritisch: "destructive",
};

/** Die vier Werte, die vor der Untersuchung zählen — auf einen Blick. */
export function KpiHeader({ kpis }: { kpis: DashboardKpis }) {
  const { weight, bloodPressure, restingHr, ftp, wattTarget, weightTotalDelta } = kpis;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Aktuelles Gewicht"
        icon={Scale}
        value={weight ? formatNumber(weight.value, 1) : undefined}
        unit="kg"
        meta={weight ? formatDate(weight.date) : undefined}
        accent={weight?.delta7d !== undefined && weight.delta7d <= 0 ? "success" : "neutral"}
        badge={
          weightTotalDelta !== undefined ? (
            <Badge variant={weightTotalDelta < 0 ? "success" : "secondary"}>
              {formatDelta(weightTotalDelta)} kg seit Start
            </Badge>
          ) : undefined
        }
        secondary={
          weight?.delta7d !== undefined ? `${formatDelta(weight.delta7d)} kg / 7 Tage` : undefined
        }
      />

      <KpiCard
        label="Blutdruck"
        icon={HeartPulse}
        value={bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : undefined}
        unit="mmHg"
        meta={bloodPressure ? formatDate(bloodPressure.date) : undefined}
        accent={bloodPressure ? BP_ACCENT[bloodPressure.assessment.level] : "neutral"}
        badge={
          bloodPressure ? (
            <Badge variant={BP_ACCENT[bloodPressure.assessment.level]}>
              {bloodPressure.assessment.label}
            </Badge>
          ) : undefined
        }
        secondary={bloodPressure?.assessment.hint}
      />

      <KpiCard
        label="Ruhepuls"
        icon={Activity}
        value={restingHr ? String(restingHr.value) : undefined}
        unit="bpm"
        meta={restingHr ? formatDate(restingHr.date) : undefined}
        accent={restingHr?.delta7d !== undefined && restingHr.delta7d <= 0 ? "success" : "neutral"}
        secondary={
          restingHr?.delta7d !== undefined
            ? `${formatDelta(restingHr.delta7d, 0)} bpm / 7 Tage`
            : undefined
        }
      />

      <KpiCard
        label="FTP / relative Leistung"
        icon={Gauge}
        value={ftp ? String(ftp.watts) : undefined}
        unit="W"
        meta={ftp ? formatDate(ftp.date) : undefined}
        placeholder="Kein FTP-Test"
        accent={wattTarget?.goalReached ? "success" : "neutral"}
        badge={
          ftp?.wattsPerKg !== undefined ? (
            <Badge variant={wattTarget?.goalReached ? "success" : "secondary"}>
              {formatNumber(ftp.wattsPerKg, 2)} W/kg
            </Badge>
          ) : undefined
        }
        secondary={
          wattTarget
            ? wattTarget.goalReached
              ? "Ziel erreicht"
              : `Ziel: ${wattTarget.requiredWatts} W`
            : undefined
        }
      />
    </section>
  );
}
