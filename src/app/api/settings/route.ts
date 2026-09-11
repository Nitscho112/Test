import { NextResponse } from "next/server";

import { authorizeIngest } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/db";
import { formatZodError, settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  return NextResponse.json({ ok: true, settings: await getSettings() });
}

export async function PATCH(request: Request) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: formatZodError(parsed.error) }, { status: 400 });
  }

  const cleaned = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );
  return NextResponse.json({ ok: true, settings: await updateSettings(cleaned) });
}
