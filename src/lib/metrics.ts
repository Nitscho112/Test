import type { HealthEntry, Settings, Workout } from "./types";

/* -------------------------------------------------------------------------- */
/*                               Hilfsfunktionen                              */
/* -------------------------------------------------------------------------- */

export function toIsoDate(value: Date | string = new Date()): string {
  if (typeof value === "string") return value.slice(0, 10);
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Jüngster Eintrag, der `key` gesetzt hat. Liste muss aufsteigend sortiert sein. */
function latestWith<T, K extends keyof T>(items: T[], key: K): T | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const value = items[i][key];
    if (value !== undefined && value !== null) return items[i];
  }
  return undefined;
}

/** Letzter Wert, der mindestens `days` Tage vor `reference` liegt. */
function valueDaysAgo<T extends { date: string }>(
  items: T[],
  key: keyof T,
  reference: string,
  days: number,
): number | undefined {
  const cutoff = new Date(Date.parse(`${reference}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const value = item[key];
    if (item.date <= cutoff && typeof value === "number") return value;
  }
  return undefined;
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/* -------------------------------------------------------------------------- */
/*                            Watt-Rechner (Kern)                             */
/* -------------------------------------------------------------------------- */

export interface WattTarget {
  weightKg: number;
  targetWattsPerKg: number;
  /** Leistung, die bei diesem Gewicht für das Ziel getreten werden muss. */
  requiredWatts: number;
  currentWatts?: number;
  currentWattsPerKg?: number;
  /** Fehlende Watt bis zum Ziel (0, wenn erreicht). */
  wattGap?: number;
  /** Gewicht, bei dem die aktuelle Leistung das Ziel erfüllen würde. */
  weightForGoalAtCurrentWatts?: number;
  goalReached: boolean;
}

/**
 * Das Herzstück: "Bei X kg musst du für Y W/kg genau Z Watt treten."
 *
 * Liefert zusätzlich den zweiten Hebel — das Gewicht, ab dem die *aktuelle*
 * Leistung reicht. Beide Wege führen zum Ziel, das macht die Abwägung sichtbar.
 */
export function computeWattTarget(
  weightKg: number,
  targetWattsPerKg: number,
  currentWatts?: number,
): WattTarget {
  const requiredWatts = weightKg * targetWattsPerKg;
  const currentWattsPerKg = currentWatts ? currentWatts / weightKg : undefined;

  return {
    weightKg,
    targetWattsPerKg,
    requiredWatts: round(requiredWatts, 0),
    currentWatts,
    currentWattsPerKg: currentWattsPerKg ? round(currentWattsPerKg, 2) : undefined,
    wattGap: currentWatts ? Math.max(0, round(requiredWatts - currentWatts, 0)) : undefined,
    weightForGoalAtCurrentWatts: currentWatts
      ? round(currentWatts / targetWattsPerKg, 1)
      : undefined,
    goalReached: currentWatts !== undefined && currentWatts >= requiredWatts,
  };
}

/* -------------------------------------------------------------------------- */
/*                          Blutdruck-Klassifikation                          */
/* -------------------------------------------------------------------------- */

export type BpLevel = "optimal" | "normal" | "hoch-normal" | "hyperton" | "kritisch";

export interface BpAssessment {
  level: BpLevel;
  label: string;
  /** Kurzhinweis für das Badge unter dem KPI-Wert. */
  hint: string;
}

/**
 * Einordnung nach den gängigen ESC/ESH-Kategorien. Bewusst nur als Orientierung
 * für den Trend — die arbeitsmedizinische Bewertung macht die Ärztin.
 */
export function assessBloodPressure(systolic: number, diastolic: number): BpAssessment {
  if (systolic >= 180 || diastolic >= 110) {
    return { level: "kritisch", label: "Hypertonie Grad 3", hint: "Ärztlich abklären" };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { level: "hyperton", label: "Hypertonie", hint: "Über G26-Grenze" };
  }
  if (systolic >= 130 || diastolic >= 85) {
    return { level: "hoch-normal", label: "Hoch-normal", hint: "Engmaschig messen" };
  }
  if (systolic >= 120 || diastolic >= 80) {
    return { level: "normal", label: "Normal", hint: "Im grünen Bereich" };
  }
  return { level: "optimal", label: "Optimal", hint: "Im grünen Bereich" };
}

/* -------------------------------------------------------------------------- */
/*                                    KPIs                                    */
/* -------------------------------------------------------------------------- */

export interface TrendValue {
  value: number;
  date: string;
  /** Veränderung gegenüber dem Wert von vor 7 Tagen. */
  delta7d?: number;
}

export interface DashboardKpis {
  weight?: TrendValue;
  /** Gesamte Gewichtsveränderung seit Programmstart. */
  weightTotalDelta?: number;
  bloodPressure?: { systolic: number; diastolic: number; date: string; assessment: BpAssessment };
  restingHr?: TrendValue;
  ftp?: { watts: number; date: string; wattsPerKg?: number };
  wattTarget?: WattTarget;
  program: {
    startDate: string;
    targetDate: string;
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
    remainingWeeks: number;
    progressPct: number;
  };
  /** Trainingseinheiten der letzten 7 Tage. */
  sessionsLast7d: number;
  totalSessions: number;
}

export function computeKpis(
  entries: HealthEntry[],
  workouts: Workout[],
  settings: Settings,
  today = toIsoDate(),
): DashboardKpis {
  const weightEntry = latestWith(entries, "weightKg");
  const bpEntry = entries.filter((e) => e.systolic && e.diastolic).at(-1);
  const hrEntry = latestWith(entries, "restingHr");
  const ftpWorkout = workouts.filter((w) => typeof w.ftpWatts === "number").at(-1);

  const weightKg = weightEntry?.weightKg;
  const ftpWatts = ftpWorkout?.ftpWatts;

  const totalDays = Math.max(1, daysBetween(settings.startDate, settings.targetDate));
  const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(settings.startDate, today)));
  const sevenDaysAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return {
    weight: weightEntry?.weightKg
      ? {
          value: weightEntry.weightKg,
          date: weightEntry.date,
          delta7d: (() => {
            const before = valueDaysAgo(entries, "weightKg", weightEntry.date, 7);
            return before === undefined ? undefined : round(weightEntry.weightKg! - before, 1);
          })(),
        }
      : undefined,
    weightTotalDelta: weightKg ? round(weightKg - settings.startWeightKg, 1) : undefined,
    bloodPressure: bpEntry
      ? {
          systolic: bpEntry.systolic!,
          diastolic: bpEntry.diastolic!,
          date: bpEntry.date,
          assessment: assessBloodPressure(bpEntry.systolic!, bpEntry.diastolic!),
        }
      : undefined,
    restingHr: hrEntry?.restingHr
      ? {
          value: hrEntry.restingHr,
          date: hrEntry.date,
          delta7d: (() => {
            const before = valueDaysAgo(entries, "restingHr", hrEntry.date, 7);
            return before === undefined ? undefined : round(hrEntry.restingHr! - before, 0);
          })(),
        }
      : undefined,
    ftp: ftpWatts
      ? {
          watts: ftpWatts,
          date: ftpWorkout!.date,
          wattsPerKg: weightKg ? round(ftpWatts / weightKg, 2) : undefined,
        }
      : undefined,
    wattTarget: weightKg
      ? computeWattTarget(weightKg, settings.targetWattsPerKg, ftpWatts)
      : undefined,
    program: {
      startDate: settings.startDate,
      targetDate: settings.targetDate,
      totalDays,
      elapsedDays,
      remainingDays: Math.max(0, totalDays - elapsedDays),
      remainingWeeks: Math.max(0, Math.ceil((totalDays - elapsedDays) / 7)),
      progressPct: Math.round((elapsedDays / totalDays) * 100),
    },
    sessionsLast7d: workouts.filter((w) => w.date > sevenDaysAgo).length,
    totalSessions: workouts.length,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Chart-Zeitreihen                              */
/* -------------------------------------------------------------------------- */

export interface WeightPowerPoint {
  date: string;
  weightKg?: number;
  /** Fortgeschriebene FTP — ändert sich nur an Testtagen. */
  ftpWatts?: number;
  /** Benötigte Watt für das Ziel beim Gewicht dieses Tages. */
  requiredWatts?: number;
  wattsPerKg?: number;
}

/**
 * Führt Gewicht und Leistung auf einer gemeinsamen Zeitachse zusammen.
 *
 * Die FTP wird zwischen zwei Tests fortgeschrieben, damit die Ziel-Watt-Linie
 * (die mit dem Gewicht fällt) und die Ist-Leistung direkt vergleichbar sind:
 * Der Schnittpunkt beider Linien ist der Tag, an dem das Ziel erreicht ist.
 */
export function buildWeightPowerSeries(
  entries: HealthEntry[],
  workouts: Workout[],
  settings: Settings,
): WeightPowerPoint[] {
  const dates = new Set<string>();
  for (const entry of entries) if (entry.weightKg) dates.add(entry.date);
  for (const workout of workouts) if (workout.ftpWatts) dates.add(workout.date);

  const weightByDate = new Map(
    entries.filter((e) => e.weightKg).map((e) => [e.date, e.weightKg!] as const),
  );
  const ftpByDate = new Map(
    workouts.filter((w) => w.ftpWatts).map((w) => [w.date, w.ftpWatts!] as const),
  );

  let carriedWeight: number | undefined;
  let carriedFtp: number | undefined;

  return [...dates]
    .sort()
    .map((date) => {
      carriedWeight = weightByDate.get(date) ?? carriedWeight;
      carriedFtp = ftpByDate.get(date) ?? carriedFtp;

      return {
        date,
        weightKg: weightByDate.get(date),
        ftpWatts: carriedFtp,
        requiredWatts: carriedWeight
          ? round(carriedWeight * settings.targetWattsPerKg, 0)
          : undefined,
        wattsPerKg:
          carriedFtp && carriedWeight ? round(carriedFtp / carriedWeight, 2) : undefined,
      };
    });
}

export interface VitalsPoint {
  date: string;
  systolic?: number;
  diastolic?: number;
  restingHr?: number;
}

export function buildVitalsSeries(entries: HealthEntry[]): VitalsPoint[] {
  return entries
    .filter((e) => e.systolic || e.diastolic || e.restingHr)
    .map((e) => ({
      date: e.date,
      systolic: e.systolic,
      diastolic: e.diastolic,
      restingHr: e.restingHr,
    }));
}
