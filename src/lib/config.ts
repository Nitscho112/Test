import path from "node:path";

import type { Settings } from "./types";

/** Verzeichnis der JSON-Datenbank — im Container per Volume gemountet. */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

export const DB_FILE = path.join(DATA_DIR, "dashboard.json");

/** Shared Secret für die Apple-Shortcuts-Schnittstelle. */
export const INGEST_TOKEN = process.env.INGEST_TOKEN ?? "";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addWeeks(d: Date, weeks: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + weeks * 7);
  return copy;
}

/**
 * Vorbelegung beim allerersten Start. Alles davon ist später über
 * `PATCH /api/settings` änderbar.
 */
export function defaultSettings(now = new Date()): Settings {
  return {
    startDate: isoDate(now),
    targetDate: isoDate(addWeeks(now, 10)),
    startWeightKg: Number(process.env.START_WEIGHT_KG ?? 113),
    targetWattsPerKg: Number(process.env.TARGET_WATTS_PER_KG ?? 3.3),
  };
}
