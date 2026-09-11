"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { createWorkout, deleteHealthEntry, deleteWorkout, updateSettings, upsertHealthEntry } from "@/lib/db";
import { formatZodError, healthEntrySchema, settingsSchema, workoutSchema } from "@/lib/validation";

/** Leere Formularfelder sollen `undefined` sein, nicht `""`. */
function value(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function saveHealthEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = healthEntrySchema.safeParse({
    date: value(formData, "date"),
    weightKg: value(formData, "weightKg"),
    systolic: value(formData, "systolic"),
    diastolic: value(formData, "diastolic"),
    restingHr: value(formData, "restingHr"),
    note: value(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Bitte Eingaben prüfen.", errors: formatZodError(parsed.error) };
  }

  const { weightKg, systolic, diastolic, restingHr } = parsed.data;
  if ([weightKg, systolic, diastolic, restingHr].every((v) => v === undefined)) {
    return { status: "error", message: "Mindestens ein Messwert wird benötigt." };
  }

  // Blutdruck ergibt nur als Paar Sinn.
  if ((systolic === undefined) !== (diastolic === undefined)) {
    return { status: "error", message: "Blutdruck bitte vollständig eintragen (systolisch und diastolisch)." };
  }

  await upsertHealthEntry(parsed.data, "manual");
  revalidatePath("/");
  return { status: "success", message: "Vitalwerte gespeichert." };
}

export async function saveWorkoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = workoutSchema.safeParse({
    date: value(formData, "date"),
    type: value(formData, "type"),
    durationMin: value(formData, "durationMin"),
    avgWatts: value(formData, "avgWatts"),
    ftpWatts: value(formData, "ftpWatts"),
    avgHr: value(formData, "avgHr"),
    maxHr: value(formData, "maxHr"),
    rpe: value(formData, "rpe"),
    kettlebellWeightKg: value(formData, "kettlebellWeightKg"),
    rounds: value(formData, "rounds"),
    note: value(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Bitte Eingaben prüfen.", errors: formatZodError(parsed.error) };
  }

  await createWorkout(parsed.data, "manual");
  revalidatePath("/");
  return { status: "success", message: "Training gespeichert." };
}

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = settingsSchema.safeParse({
    startDate: value(formData, "startDate"),
    targetDate: value(formData, "targetDate"),
    startWeightKg: value(formData, "startWeightKg"),
    targetWattsPerKg: value(formData, "targetWattsPerKg"),
    targetWeightKg: value(formData, "targetWeightKg"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Bitte Eingaben prüfen.", errors: formatZodError(parsed.error) };
  }

  const cleaned = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  await updateSettings(cleaned);
  revalidatePath("/");
  return { status: "success", message: "Einstellungen gespeichert." };
}

export async function deleteHealthEntryAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id === "string") await deleteHealthEntry(id);
  revalidatePath("/");
}

export async function deleteWorkoutAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id === "string") await deleteWorkout(id);
  revalidatePath("/");
}
