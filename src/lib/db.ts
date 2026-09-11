import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { DATA_DIR, DB_FILE, defaultSettings } from "./config";
import type { DatabaseShape, HealthEntry, Settings, Workout } from "./types";

/**
 * Persistenz als eine einzelne JSON-Datei.
 *
 * Für ein Single-User-Dashboard ist das der beste Kompromiss: keine native
 * Abhängigkeit im Docker-Image, die Daten sind mit `cat` lesbar und ein Backup
 * ist ein Dateikopie. Schreibzugriffe laufen über eine Promise-Kette
 * (`writeQueue`), damit parallele Requests sich nicht gegenseitig überschreiben,
 * und landen atomar per `rename` auf der Platte.
 */

function emptyDb(): DatabaseShape {
  return {
    version: 1,
    settings: defaultSettings(),
    healthEntries: [],
    workouts: [],
  };
}

let writeQueue: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<DatabaseShape> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DatabaseShape>;
    return {
      version: 1,
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      healthEntries: parsed.healthEntries ?? [],
      workouts: parsed.workouts ?? [],
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyDb();
    throw error;
  }
}

async function writeDb(db: DatabaseShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, `.dashboard.${randomUUID()}.tmp`);
  await fs.writeFile(tmp, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Führt `mutator` exklusiv aus und persistiert das Ergebnis. */
async function transaction<T>(mutator: (db: DatabaseShape) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });
  // Fehler dürfen die Kette nicht abreißen lassen.
  writeQueue = run.catch(() => undefined);
  return run;
}

function byDateAsc<T extends { date: string }>(a: T, b: T): number {
  return a.date.localeCompare(b.date);
}

/* -------------------------------------------------------------------------- */
/*                                  Lesen                                     */
/* -------------------------------------------------------------------------- */

export async function getSettings(): Promise<Settings> {
  return (await readDb()).settings;
}

export async function listHealthEntries(): Promise<HealthEntry[]> {
  return (await readDb()).healthEntries.slice().sort(byDateAsc);
}

export async function listWorkouts(): Promise<Workout[]> {
  return (await readDb()).workouts
    .slice()
    .sort((a, b) => byDateAsc(a, b) || a.createdAt.localeCompare(b.createdAt));
}

export async function getDashboardData(): Promise<{
  settings: Settings;
  healthEntries: HealthEntry[];
  workouts: Workout[];
}> {
  const db = await readDb();
  return {
    settings: db.settings,
    healthEntries: db.healthEntries.slice().sort(byDateAsc),
    workouts: db.workouts
      .slice()
      .sort((a, b) => byDateAsc(a, b) || a.createdAt.localeCompare(b.createdAt)),
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Schreiben                                  */
/* -------------------------------------------------------------------------- */

export type HealthEntryInput = Pick<
  HealthEntry,
  "date" | "weightKg" | "systolic" | "diastolic" | "restingHr" | "note"
>;

/**
 * Legt den Tageseintrag an oder ergänzt ihn. Nur tatsächlich übergebene Felder
 * werden überschrieben — so kann die Waage morgens das Gewicht und das
 * Blutdruckmessgerät abends den Druck liefern, ohne sich zu überschreiben.
 */
export async function upsertHealthEntry(
  input: HealthEntryInput,
  source: HealthEntry["source"] = "manual",
): Promise<HealthEntry> {
  return transaction((db) => {
    const now = new Date().toISOString();
    const existing = db.healthEntries.find((e) => e.date === input.date);
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined && value !== null),
    ) as Partial<HealthEntry>;

    if (existing) {
      Object.assign(existing, patch, { source, updatedAt: now });
      return existing;
    }

    const created: HealthEntry = {
      id: randomUUID(),
      date: input.date,
      source,
      createdAt: now,
      updatedAt: now,
      ...patch,
    };
    db.healthEntries.push(created);
    return created;
  });
}

export async function deleteHealthEntry(id: string): Promise<boolean> {
  return transaction((db) => {
    const index = db.healthEntries.findIndex((e) => e.id === id);
    if (index === -1) return false;
    db.healthEntries.splice(index, 1);
    return true;
  });
}

export type WorkoutInput = Omit<Workout, "id" | "createdAt" | "source">;

export async function createWorkout(
  input: WorkoutInput,
  source: Workout["source"] = "manual",
): Promise<Workout> {
  return transaction((db) => {
    const created: Workout = {
      ...input,
      id: randomUUID(),
      source,
      createdAt: new Date().toISOString(),
    };
    db.workouts.push(created);
    return created;
  });
}

export async function deleteWorkout(id: string): Promise<boolean> {
  return transaction((db) => {
    const index = db.workouts.findIndex((w) => w.id === id);
    if (index === -1) return false;
    db.workouts.splice(index, 1);
    return true;
  });
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return transaction((db) => {
    db.settings = { ...db.settings, ...patch };
    return db.settings;
  });
}
