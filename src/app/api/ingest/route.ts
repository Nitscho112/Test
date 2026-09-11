import { NextResponse } from "next/server";

import { authorizeIngest } from "@/lib/auth";
import { upsertHealthEntry } from "@/lib/db";
import { toIsoDate } from "@/lib/metrics";
import {
  extractRecords,
  formatZodError,
  healthEntrySchema,
  normalizeHealthPayload,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Webhook für Apple Shortcuts.
 *
 * Bewusst tolerant: Feldnamen werden über Aliase aufgelöst, Zahlen dürfen als
 * String kommen, das Datum darf ein voller Zeitstempel sein und fehlt es ganz,
 * wird "heute" angenommen. Ein einzelnes Objekt und ein Array werden gleich
 * behandelt, damit auch ein Nachtrag mehrerer Tage in einem Request geht.
 *
 *   curl -X POST http://localhost:3000/api/ingest \
 *     -H "Authorization: Bearer $INGEST_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     -d '{"weight": 112.4, "bp": "128/82", "restingHeartRate": 58}'
 */
export async function POST(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body konnte nicht als JSON gelesen werden." },
      { status: 400 },
    );
  }

  const records = extractRecords(body);
  if (records.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Keine verwertbaren Datensätze im Request gefunden." },
      { status: 400 },
    );
  }

  const saved = [];
  const errors = [];

  for (const [index, record] of records.entries()) {
    const normalized = normalizeHealthPayload(record);
    normalized.date ??= toIsoDate();

    const parsed = healthEntrySchema.safeParse(normalized);
    if (!parsed.success) {
      errors.push({ index, issues: formatZodError(parsed.error) });
      continue;
    }

    const { date, weightKg, systolic, diastolic, restingHr, note } = parsed.data;
    if (
      weightKg === undefined &&
      systolic === undefined &&
      diastolic === undefined &&
      restingHr === undefined
    ) {
      errors.push({
        index,
        issues: [
          {
            field: "(root)",
            message:
              "Datensatz enthält keinen Messwert (weight, systolic, diastolic oder restingHr).",
          },
        ],
      });
      continue;
    }

    saved.push(
      await upsertHealthEntry({ date, weightKg, systolic, diastolic, restingHr, note }, "shortcut"),
    );
  }

  if (saved.length === 0) {
    return NextResponse.json({ ok: false, saved: 0, errors }, { status: 422 });
  }

  return NextResponse.json(
    { ok: true, saved: saved.length, entries: saved, errors: errors.length ? errors : undefined },
    { status: 201 },
  );
}

/** Selbstdokumentation — praktisch beim Bauen des Shortcuts auf dem iPhone. */
export async function GET(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({
    ok: true,
    method: "POST",
    contentType: "application/json",
    auth: "Authorization: Bearer <INGEST_TOKEN> — alternativ Header X-API-Key oder ?token=",
    fields: {
      date: "optional, YYYY-MM-DD (Default: heute). Voller ISO-Zeitstempel wird gekürzt.",
      weight: "kg — Aliase: weightKg, gewicht, bodyWeight",
      systolic: "mmHg — Aliase: sys, systolisch",
      diastolic: "mmHg — Aliase: dia, diastolisch",
      bp: 'alternativ kombiniert, z. B. "128/82" — Aliase: bloodPressure, blutdruck, rr',
      restingHr: "bpm — Aliase: restingHeartRate, ruhepuls, puls",
      note: "optionaler Freitext",
    },
    batch: 'Array oder { "entries": [ … ] } für mehrere Tage in einem Request.',
    example: { date: "2026-09-11", weight: 112.4, bp: "128/82", restingHeartRate: 58 },
  });
}
