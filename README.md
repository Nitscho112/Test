# G26.3 Dashboard

Lokales Trainings- und Gesundheits-Dashboard für die Vorbereitung auf die
arbeitsmedizinische Vorsorge **G26.3 (Atemschutz)**.

Es beantwortet die eine Frage, die vor dem Ergometertest zählt:

> Bei deinem aktuellen Gewicht von **X kg** musst du für **3,3 W/kg** exakt **Y Watt** treten.

Dazu kommen der Trend von Gewicht, Leistung, Blutdruck und Ruhepuls sowie ein
Logbuch für Zwift- und Kettlebell-Einheiten. Alle Daten bleiben auf der eigenen
Maschine.

## Stack

| Baustein    | Wahl                                              |
| ----------- | ------------------------------------------------- |
| Framework   | Next.js 15 (App Router, React 19, Server Actions) |
| Styling     | Tailwind CSS v4 + shadcn/ui (New York)            |
| Diagramme   | Recharts                                          |
| Validierung | Zod                                               |
| Persistenz  | eine JSON-Datei unter `DATA_DIR`                  |
| Deployment  | Docker (`output: "standalone"`)                   |

Die Persistenz ist bewusst schlicht: ein Single-User-Dashboard braucht keine
Datenbank. Eine JSON-Datei hat keine native Abhängigkeit im Image, ist mit `cat`
lesbar, und ein Backup ist eine Dateikopie. Schreibzugriffe laufen serialisiert
und atomar (`rename`), damit ein Shortcut-Push und eine Formulareingabe sich
nicht in die Quere kommen.

## Schnellstart (lokal)

```bash
cp .env.example .env
# INGEST_TOKEN setzen, z. B.:
echo "INGEST_TOKEN=$(openssl rand -hex 32)" >> .env

npm install
npm run dev          # http://localhost:3000
```

Optional mit Beispieldaten befüllen, um Diagramme und KPIs sofort zu sehen:

```bash
INGEST_TOKEN=… node scripts/seed-demo.mjs http://localhost:3000
```

Vor dem Echtbetrieb `data/dashboard.json` wieder löschen.

## Deployment mit Docker

```bash
echo "INGEST_TOKEN=$(openssl rand -hex 32)" > .env
docker compose up -d --build
```

Das Dashboard läuft dann auf Port 3000, die Daten liegen im Volume
`dashboard-data` unter `/data`. Ein Update (`docker compose up -d --build`)
lässt die Messwerte unberührt.

Backup:

```bash
docker compose cp dashboard:/data/dashboard.json ./backup-$(date +%F).json
```

Läuft das Dashboard hinter einem Reverse Proxy, muss dessen Origin in
`ALLOWED_ORIGINS` stehen (z. B. `https://dashboard.fritz.box`), sonst weist
Next.js die Server Actions der Formulare ab.

## Umgebungsvariablen

| Variable              | Default          | Bedeutung                                            |
| --------------------- | ---------------- | ---------------------------------------------------- |
| `INGEST_TOKEN`        | –                | Shared Secret für die API. **Pflicht** für `/api/*`. |
| `DATA_DIR`            | `./data`         | Ablage der JSON-Datenbank (im Container `/data`).     |
| `START_WEIGHT_KG`     | `113`            | Startgewicht beim allerersten Start.                  |
| `TARGET_WATTS_PER_KG` | `3.3`            | Zielvorgabe in W/kg.                                  |
| `ALLOWED_ORIGINS`     | –                | Origins hinter einem Reverse Proxy, kommagetrennt.    |

Ohne gesetztes `INGEST_TOKEN` antworten alle API-Routen mit `503`. Das ist
Absicht: ein versehentlich ins Netz gestelltes Dashboard soll nicht offen
beschreibbar sein. Die Weboberfläche selbst funktioniert auch ohne Token, weil
sie direkt über Server Actions auf die Daten zugreift.

## API

Authentifizierung wahlweise per `Authorization: Bearer <TOKEN>`, Header
`X-API-Key: <TOKEN>` oder Query-Parameter `?token=<TOKEN>` — Apple Shortcuts
kann alle drei.

| Route                | Methode  | Zweck                                                     |
| -------------------- | -------- | --------------------------------------------------------- |
| `/api/ingest`        | `POST`   | Toleranter Webhook für Shortcuts (Aliase, Batch, Defaults) |
| `/api/ingest`        | `GET`    | Selbstdokumentation des erwarteten Formats                 |
| `/api/entries`       | `GET`    | Alle Vitalwerte                                            |
| `/api/entries`       | `POST`   | Vitalwerte im strikten Schema                              |
| `/api/entries/:id`   | `DELETE` | Eintrag löschen                                            |
| `/api/workouts`      | `GET`    | Alle Trainingseinheiten                                    |
| `/api/workouts`      | `POST`   | Trainingseinheit anlegen                                   |
| `/api/workouts/:id`  | `DELETE` | Einheit löschen                                            |
| `/api/settings`      | `GET`    | Zeitraum, Startgewicht, Zielvorgabe                        |
| `/api/settings`      | `PATCH`  | Einstellungen ändern                                       |
| `/api/summary`       | `GET`    | Berechnete Kennzahlen inkl. fertigem Satz für ein Widget   |
| `/api/status`        | `GET`    | Liveness-Probe (ohne Token, für den Healthcheck)           |

### Apple Shortcuts einrichten

Kurzbefehl mit der Aktion **„Inhalte von URL abrufen"**:

- **URL**: `http://<host>:3000/api/ingest`
- **Methode**: `POST`
- **Header**: `Authorization` → `Bearer <INGEST_TOKEN>`
- **Anfragetext**: JSON

```json
{
  "weight": 112.4,
  "bp": "128/82",
  "restingHeartRate": 58
}
```

Die Route ist absichtlich nachsichtig, weil Shortcuts und Health-Automationen
dieselben Werte unterschiedlich benennen:

- **Datum** optional — ohne Angabe zählt der heutige Tag; ein voller
  ISO-Zeitstempel wird auf den Tag gekürzt.
- **Feldnamen** über Aliase: `weight`/`weightKg`/`gewicht`, `systolic`/`sys`,
  `diastolic`/`dia`, `restingHr`/`restingHeartRate`/`ruhepuls`/`puls`.
- **Blutdruck** auch kombiniert als `"bp": "128/82"`.
- **Zahlen** dürfen Strings mit Komma sein (`"112,4"`).
- **Mehrere Tage** als Array oder `{ "entries": [ … ] }` in einem Request.

Pro Tag existiert genau ein Vitalwert-Eintrag; ein zweiter Push ergänzt ihn nur.
Die Waage am Morgen und das Blutdruckmessgerät am Abend überschreiben sich also
nicht.

Für ein Widget oder das Ende eines Kurzbefehls liefert `GET /api/summary` unter
`headline` einen fertig formulierten Satz mit der Ziel-Wattzahl.

## Aufbau

```
src/
├─ app/
│  ├─ page.tsx            Hauptansicht des Dashboards
│  ├─ actions.ts          Server Actions der Formulare
│  └─ api/                REST-Routen inkl. Shortcut-Webhook
├─ components/
│  ├─ kpi-header.tsx      KPI-Leiste
│  ├─ watt-calculator.tsx Gewicht-vs-Watt-Rechner mit Simulationsregler
│  ├─ weight-power-chart.tsx
│  ├─ vitals-chart.tsx    Blutdruck- und Ruhepuls-Trend
│  ├─ log-form.tsx        Logbuch-Eingabemaske
│  └─ ui/                 shadcn/ui-Primitive
└─ lib/
   ├─ metrics.ts          Kennzahlen, Watt-Rechner, Zeitreihen
   ├─ db.ts               JSON-Persistenz
   ├─ validation.ts       Zod-Schemata und Shortcut-Aliase
   └─ auth.ts             Token-Prüfung
```

Die Rechenlogik liegt vollständig in `src/lib/metrics.ts` und ist frei von
React — die Zahlen im Dashboard und die in `/api/summary` stammen aus derselben
Funktion und können nicht auseinanderlaufen.

## Einordnung der Grenzwerte

Die farbliche Bewertung des Blutdrucks folgt den gängigen ESC/ESH-Kategorien,
die Linien bei 140/90 mmHg markieren die Grenze zur Hypertonie. Das ist eine
Orientierung für den eigenen Trend — die arbeitsmedizinische Beurteilung trifft
die untersuchende Ärztin oder der untersuchende Arzt.
