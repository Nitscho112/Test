import { NextResponse } from "next/server";

import { authorizeIngest } from "@/lib/auth";
import { deleteHealthEntry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authorizeIngest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const deleted = await deleteHealthEntry(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Eintrag nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
