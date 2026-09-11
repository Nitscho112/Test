import { NextResponse } from "next/server";

import { authorizeIngest } from "@/lib/auth";
import { createWorkout, listWorkouts } from "@/lib/db";
import { formatZodError, workoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({ ok: true, workouts: await listWorkouts() });
}

/** Für automatisierte Einträge, z. B. aus einem Zwift-/Strava-Export. */
export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const parsed = workoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: formatZodError(parsed.error) }, { status: 400 });
  }

  const workout = await createWorkout(parsed.data, "shortcut");
  return NextResponse.json({ ok: true, workout }, { status: 201 });
}
