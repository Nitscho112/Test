import { z } from "zod";

import { WORKOUT_TYPES } from "./types";

export const isoDateSchema = z
  .string()
  .trim()
  .min(1)
  // Apple Shortcuts liefern gerne volle Zeitstempel — der Tag genügt uns.
  .transform((value) => value.slice(0, 10))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format YYYY-MM-DD vorliegen"));

/** Akzeptiert Zahlen und Strings mit Komma ("112,4") — Shortcuts sind da locker. */
const loose = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === "" || value === null) return undefined;
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", ".").trim());
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }, schema);

const weightSchema = loose(z.number().min(30).max(400).optional());
const systolicSchema = loose(z.number().int().min(60).max(300).optional());
const diastolicSchema = loose(z.number().int().min(30).max(200).optional());
const restingHrSchema = loose(z.number().int().min(25).max(150).optional());

export const healthEntrySchema = z.object({
  date: isoDateSchema,
  weightKg: weightSchema,
  systolic: systolicSchema,
  diastolic: diastolicSchema,
  restingHr: restingHrSchema,
  note: z.string().trim().max(500).optional(),
});

export type HealthEntryPayload = z.infer<typeof healthEntrySchema>;

export const workoutSchema = z.object({
  date: isoDateSchema,
  type: z.enum(WORKOUT_TYPES),
  durationMin: loose(z.number().int().min(1).max(600)),
  avgWatts: loose(z.number().int().min(20).max(800).optional()),
  ftpWatts: loose(z.number().int().min(20).max(800).optional()),
  avgHr: loose(z.number().int().min(40).max(230).optional()),
  maxHr: loose(z.number().int().min(40).max(230).optional()),
  rpe: loose(z.number().int().min(1).max(10).optional()),
  kettlebellWeightKg: loose(z.number().min(1).max(100).optional()),
  rounds: loose(z.number().int().min(1).max(100).optional()),
  note: z.string().trim().max(500).optional(),
});

export type WorkoutPayload = z.infer<typeof workoutSchema>;

export const settingsSchema = z.object({
  startDate: isoDateSchema.optional(),
  targetDate: isoDateSchema.optional(),
  startWeightKg: loose(z.number().min(30).max(400).optional()),
  targetWattsPerKg: loose(z.number().min(0.5).max(8).optional()),
  targetWeightKg: loose(z.number().min(30).max(400).optional()),
});

/* -------------------------------------------------------------------------- */
/*                       Normalisierung für Apple Shortcuts                   */
/* -------------------------------------------------------------------------- */

const FIELD_ALIASES: Record<string, keyof HealthEntryPayload> = {
  date: "date",
  datum: "date",
  timestamp: "date",
  day: "date",
  weight: "weightKg",
  weightkg: "weightKg",
  bodyweight: "weightKg",
  bodymass: "weightKg",
  gewicht: "weightKg",
  koerpergewicht: "weightKg",
  systolic: "systolic",
  sys: "systolic",
  systolisch: "systolic",
  bloodpressuresystolic: "systolic",
  diastolic: "diastolic",
  dia: "diastolic",
  diastolisch: "diastolic",
  bloodpressurediastolic: "diastolic",
  restinghr: "restingHr",
  restingheartrate: "restingHr",
  resting_heart_rate: "restingHr",
  ruhepuls: "restingHr",
  puls: "restingHr",
  pulse: "restingHr",
  heartrate: "restingHr",
  note: "note",
  notiz: "note",
  notes: "note",
  comment: "note",
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

/**
 * Übersetzt ein beliebig benanntes Shortcut-Objekt in unser Schema.
 *
 * Apple Shortcuts und Health-Automationen benennen dieselben Werte sehr
 * unterschiedlich; statt den Nutzer zum exakten JSON zu zwingen, akzeptieren
 * wir die gängigen Schreibweisen und zusätzlich `"128/82"` als kombinierten
 * Blutdruckwert.
 */
export function normalizeHealthPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === "") continue;
    const normalized = normalizeKey(key);

    // Kombinierter Blutdruck: "128/82"
    if (["bp", "bloodpressure", "blutdruck", "rr"].includes(normalized)) {
      const match = String(value).match(/(\d{2,3})\s*[/\\|-]\s*(\d{2,3})/);
      if (match) {
        result.systolic ??= Number(match[1]);
        result.diastolic ??= Number(match[2]);
      }
      continue;
    }

    const target = FIELD_ALIASES[normalized];
    if (target) result[target] ??= value;
  }

  return result;
}

/** Zieht aus einem Request-Body die Liste der zu verarbeitenden Datensätze. */
export function extractRecords(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) return [];

  for (const key of ["entries", "records", "items", "data"]) {
    const nested = body[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
  }
  return [body];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Formt Zod-Fehler in eine kompakte, in der Shortcut-App lesbare Liste um. */
export function formatZodError(error: z.ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}
