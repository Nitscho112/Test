/**
 * Rückgabezustand der Formular-Actions.
 *
 * Bewusst außerhalb von `actions.ts`: eine `"use server"`-Datei darf nur
 * async-Funktionen exportieren, keine Werte.
 */
export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: { field: string; message: string }[];
}

export const initialActionState: ActionState = { status: "idle" };
