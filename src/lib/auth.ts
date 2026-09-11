import { timingSafeEqual } from "node:crypto";

import { INGEST_TOKEN } from "./config";

export type AuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string };

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Prüft das Shared Secret der Shortcut-Schnittstelle.
 *
 * Der Token darf per `Authorization: Bearer …`, `X-API-Key` oder als
 * Query-Parameter kommen — Shortcuts kann alle drei, je nach Aktion.
 * Ohne gesetztes `INGEST_TOKEN` bleibt die Route bewusst geschlossen, damit ein
 * versehentlich ins Netz gestelltes Dashboard nicht offen schreibbar ist.
 */
export function authorizeIngest(request: Request): AuthResult {
  if (!INGEST_TOKEN) {
    return {
      ok: false,
      status: 503,
      message:
        "INGEST_TOKEN ist nicht gesetzt. Bitte in .env bzw. docker-compose.yml hinterlegen und den Container neu starten.",
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const apiKey = request.headers.get("x-api-key")?.trim() ?? "";
  const queryToken = new URL(request.url).searchParams.get("token")?.trim() ?? "";

  const provided = bearer || apiKey || queryToken;
  if (provided && safeEqual(provided, INGEST_TOKEN)) return { ok: true };

  return { ok: false, status: 401, message: "Ungültiger oder fehlender Token." };
}
