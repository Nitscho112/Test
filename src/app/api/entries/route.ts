import { NextResponse } from "next/server";

import { authorizeIngest } from "@/lib/auth";
import { listHealthEntries, upsertHealthEntry } from "@/lib/db";
import { formatZodError, healthEntrySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Alle Vitalwert-Einträge, aufsteigend nach Datum. */
export async function GET(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({ ok: true, entries: await listHealthEntries() });
}

/** Strikte Variante von `/api/ingest` — erwartet exakt unser Schema. */
export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const parsed = healthEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const entry = await upsertHealthEntry(parsed.data, "shortcut");
  return NextResponse.json({ ok: true, entry }, { status: 201 });
}
