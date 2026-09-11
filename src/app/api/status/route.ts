import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Unauthentifizierte Liveness-Probe für den Docker-Healthcheck. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "g26-dashboard", time: new Date().toISOString() });
}
