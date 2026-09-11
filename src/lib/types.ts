/**
 * Datenmodell des Dashboards.
 *
 * Bewusst flach gehalten: ein Eintrag pro Tag für Vitalwerte (`HealthEntry`),
 * beliebig viele Trainingseinheiten pro Tag (`Workout`).
 */

export type EntrySource = "manual" | "shortcut";

export interface HealthEntry {
  id: string;
  /** ISO-Datum `YYYY-MM-DD` — pro Tag existiert maximal ein Eintrag. */
  date: string;
  weightKg?: number;
  systolic?: number;
  diastolic?: number;
  restingHr?: number;
  note?: string;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
}

export const WORKOUT_TYPES = [
  "zwift_z2",
  "zwift_intervals",
  "zwift_ftp_test",
  "kettlebell",
  "other",
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  zwift_z2: "Zwift – Zone 2",
  zwift_intervals: "Zwift – Intervalle",
  zwift_ftp_test: "Zwift – FTP-Test",
  kettlebell: "Kettlebell",
  other: "Sonstiges",
};

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  durationMin: number;
  /** Durchschnittliche Leistung der Einheit in Watt. */
  avgWatts?: number;
  /** Neue FTP (60-Min-Schwellenleistung) — nur bei Tests/Schätzungen setzen. */
  ftpWatts?: number;
  avgHr?: number;
  maxHr?: number;
  /** Subjektive Belastung, 1–10. */
  rpe?: number;
  kettlebellWeightKg?: number;
  rounds?: number;
  note?: string;
  source: EntrySource;
  createdAt: string;
}

export interface Settings {
  /** Startdatum der 10-Wochen-Vorbereitung, ISO `YYYY-MM-DD`. */
  startDate: string;
  /** Untersuchungstermin bzw. Zielzeitpunkt, ISO `YYYY-MM-DD`. */
  targetDate: string;
  startWeightKg: number;
  /** Zielwert relative Leistung in W/kg (G26.3). */
  targetWattsPerKg: number;
  /** Optionales Wunschgewicht — rein informativ. */
  targetWeightKg?: number;
}

export interface DatabaseShape {
  version: 1;
  settings: Settings;
  healthEntries: HealthEntry[];
  workouts: Workout[];
}
