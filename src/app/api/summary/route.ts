import { NextResponse } from "next/server";

import { authorizeIngest } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";
import { computeKpis } from "@/lib/metrics";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Kennzahlen als JSON — damit lässt sich der Watt-Zielwert auch direkt in einem
 * iOS-Widget oder am Ende eines Shortcuts anzeigen.
 */
export async function GET(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const { settings, healthEntries, workouts } = await getDashboardData();
  const kpis = computeKpis(healthEntries, workouts, settings);

  return NextResponse.json({
    ok: true,
    kpis,
    // Fertig formulierter Satz für die "Text anzeigen"-Aktion in Shortcuts.
    headline: kpis.wattTarget
      ? `Bei ${formatNumber(kpis.wattTarget.weightKg, 1)} kg brauchst du ${kpis.wattTarget.requiredWatts} Watt für ${formatNumber(kpis.wattTarget.targetWattsPerKg, 1)} W/kg.`
      : "Noch kein Gewicht erfasst.",
  });
}
