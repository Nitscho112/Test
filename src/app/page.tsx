import { KpiHeader } from "@/components/kpi-header";
import { LogForm } from "@/components/log-form";
import { ProgramCard } from "@/components/program-card";
import { RecentLog } from "@/components/recent-log";
import { ShortcutCard } from "@/components/shortcut-card";
import { VitalsChart } from "@/components/vitals-chart";
import { WattCalculator } from "@/components/watt-calculator";
import { Badge } from "@/components/ui/badge";
import { WeightPowerChart } from "@/components/weight-power-chart";
import { INGEST_TOKEN } from "@/lib/config";
import { getDashboardData } from "@/lib/db";
import {
  buildVitalsSeries,
  buildWeightPowerSeries,
  computeKpis,
  toIsoDate,
} from "@/lib/metrics";
import { formatNumber } from "@/lib/utils";

// Die Daten liegen im Dateisystem und ändern sich durch die API jederzeit —
// deshalb wird die Seite bei jedem Aufruf frisch gerendert.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { settings, healthEntries, workouts } = await getDashboardData();

  const today = toIsoDate();
  const kpis = computeKpis(healthEntries, workouts, settings, today);
  const weightPowerSeries = buildWeightPowerSeries(healthEntries, workouts, settings);
  const vitalsSeries = buildVitalsSeries(healthEntries);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">G26.3 Dashboard</h1>
            <Badge variant="outline">Atemschutz</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Ziel: {formatNumber(settings.targetWattsPerKg, 1)} W/kg auf dem Ergometer,
            Blutdruck und Ruhepuls im grünen Bereich.
          </p>
        </div>
        <p className="text-muted-foreground text-sm tabular">
          Noch {kpis.program.remainingDays} Tage bis zur Untersuchung
        </p>
      </header>

      <div className="space-y-6">
        <KpiHeader kpis={kpis} />

        {/* Rechner und Zeitrahmen: die beiden Module, die die Richtung vorgeben. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <WattCalculator
              currentWeightKg={kpis.weight?.value}
              startWeightKg={settings.startWeightKg}
              targetWattsPerKg={settings.targetWattsPerKg}
              currentWatts={kpis.ftp?.watts}
            />
          </div>
          <ProgramCard kpis={kpis} settings={settings} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <WeightPowerChart data={weightPowerSeries} />
          <VitalsChart data={vitalsSeries} />
        </div>

        <LogForm today={today} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <RecentLog entries={healthEntries} workouts={workouts} />
          </div>
          <ShortcutCard tokenConfigured={Boolean(INGEST_TOKEN)} />
        </div>
      </div>

      <footer className="text-muted-foreground mt-10 text-xs">
        Lokales Tracking-Werkzeug. Die Bewertung der Werte trifft die Arbeitsmedizin — die
        Grenzlinien hier dienen nur der Orientierung.
      </footer>
    </main>
  );
}
