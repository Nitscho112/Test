import { Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Kurzanleitung für die Apple-Shortcuts-Anbindung, direkt im Dashboard. */
export function ShortcutCard({ tokenConfigured }: { tokenConfigured: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="text-muted-foreground size-4" />
          iPhone-Anbindung
          {tokenConfigured ? (
            <Badge variant="success">aktiv</Badge>
          ) : (
            <Badge variant="warning">INGEST_TOKEN fehlt</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Kurzbefehl-Aktion &bdquo;Inhalte von URL abrufen&ldquo; mit Methode POST.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="bg-muted/60 overflow-x-auto rounded-lg border p-3 text-xs leading-relaxed">
          <code>{`POST  http://<host>:3000/api/ingest
Header  Authorization: Bearer <INGEST_TOKEN>
Body (JSON)
{
  "weight": 112.4,
  "bp": "128/82",
  "restingHeartRate": 58
}`}</code>
        </pre>
        <ul className="text-muted-foreground space-y-1 text-xs">
          <li>Ohne Datum wird der heutige Tag verwendet.</li>
          <li>
            Feldnamen sind tolerant: <code>gewicht</code>, <code>sys</code>/<code>dia</code>,{" "}
            <code>ruhepuls</code> funktionieren ebenso.
          </li>
          <li>
            <code>GET /api/summary</code> liefert die Kennzahlen zurück — ideal für ein Widget.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
