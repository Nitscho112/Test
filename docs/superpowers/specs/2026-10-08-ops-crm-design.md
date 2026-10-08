# ops-crm – Design-Spezifikation

Stand: 2026-10-08 · Status: vom Auftraggeber abschnittsweise freigegeben

## 1. Ziel und Abgrenzung

ops-crm ist ein modulares, mandantenfähiges CRM für Dienstleister im Bereich
Arbeitsschutz, Brandschutz und Schulungen. Es läuft als Progressive Web App auf
Smartphone, Tablet und Desktop und nutzt Supabase als Backend.

Die Basis liefert Login, Onboarding, optionales Firmenbranding, Mitarbeiter mit
Rollen und Kompetenzen, Kundenverwaltung und ein Modul-System. Fachbereiche
kommen als Module dazu: zuerst Zeiterfassung & Fahrtenbuch und Arbeitsschutz,
später Brandschutz, Schulungen, Erste Hilfe.

Nicht im Umfang:

- Rechnungserstellung (es gibt einen Abrechnungs-Export für externe Programme)
- Überstunden- und Urlaubskonten
- GPS-Tracking und Routenberechnung
- Plugins, die zur Laufzeit von außen nachgeladen werden

## 2. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Mandanten | Mehrere Firmen in einer Supabase-Instanz, getrennt per `tenant_id` und RLS, je eigenes Branding |
| Rollen | Systemrollen (Inhaber, Admin, Teamleitung, Mitarbeiter, Nur-Lesen) plus eigene Rollen aus Einzelrechten; Module bringen eigene Rechte mit |
| Kompetenzen | Getrennt von Rollen; bestimmen, wer auf welche Kontingente bucht |
| Ampel | Grau = nicht gebucht; grün/gelb/rot aus der Statuslogik des Moduls |
| Kontingent | An DGUV V2 angelehnt, editierbar, nach Kompetenz aufgeteilt, pro Kalenderjahr |
| Pott | Bedarf vs. Kapazität vs. Ist je Kompetenz und je Mitarbeiter |
| Zeiterfassung | Gesetzliche Arbeitszeit (Beginn, Ende, Pausen) plus Kundentermine und interne Tätigkeiten |
| Fahrtenbuch | Finanzamtstauglich: pro Fahrzeug lückenlos, gesperrte Einträge, Korrekturen nur als Nachtrag |
| Fahrtabrechnung | Pro Kunde kombinierbar: Km-Pauschale, Fahrzeit nach Stundensatz, Anfahrtspauschale, Fahrzeit aufs Kontingent |
| Ergebnis | PDF-Berichte (gebrandet oder neutral) und CSV/XLSX-Abrechnungs-Export |
| Offline | Zeiterfassung und Fahrten offline mit Sync; Verwaltung nur online |
| Kunden | Kunde mit mehreren Standorten, Ansprechpartnern, Notizen, Dokumenten |
| Sichtbarkeit | Mitarbeiter sehen nur zugewiesene Kunden; Recht `customers.view_all` erweitert |
| Architektur | Vite-React-SPA als PWA, Supabase komplett als Backend |

## 3. Architektur und Stack

### Frontend

- Vite, React 19, TypeScript (strict)
- TanStack Router (typsichere Routen, Lazy Loading pro Modul), TanStack Query
- Tailwind CSS v4, shadcn/ui, lucide-react plus eigene, neutrale Modul-Piktogramme
- react-hook-form und zod
- vite-plugin-pwa (Workbox): installierbar, App-Shell vorab gecacht
- Dexie (IndexedDB): lokaler Cache für Stammdaten und Warteschlange für Offline-Einträge
- Layout mobile-first: auf dem Smartphone eine untere Tab-Leiste mit zentralem
  Zeiterfassungs-Button, ab Tablet-Breite eine Seitenleiste

### Backend (Supabase, Region EU/Frankfurt)

- Postgres mit Row Level Security auf allen Tabellen
- Auth: E-Mail und Passwort oder Magic Link; Mitarbeiter kommen per Einladung dazu
- Storage-Buckets: `branding` (Logos), `documents` (Kundendokumente),
  `reports` (erzeugte PDFs); Pfade beginnen mit `tenant_id`, die
  Storage-Regeln prüfen die Mitgliedschaft
- Edge Functions:
  - `invite-member`: legt Auth-User und `members`-Zeile an und verschickt die Einladung
  - `generate-report`: erzeugt PDFs
  - `export-billing`: erzeugt den CSV/XLSX-Export und markiert exportierte Posten
- Migrationen und Seed-Daten versioniert im Repo (Supabase CLI)

### Repository-Struktur

```
src/core/                 Auth, Mandant, Branding, Layout, Rechte,
                          Modul-Registry, Offline-Sync, Kunden, Mitarbeiter,
                          Berichts-Rahmen
src/modules/
  zeiterfassung/          Arbeitstag, Termine, Fahrtenbuch
  arbeitsschutz/          Kategorien, Kontingente, Fristen, Pott
supabase/migrations/      0xxx_core_*, 1xxx_zeiterfassung_*, 2xxx_arbeitsschutz_*
supabase/functions/       invite-member, generate-report, export-billing
supabase/tests/           pgTAP
tests/e2e/                Playwright
scripts/new-module.ts     Modul-Vorlage
```

Das Frontend ist eine statische Seite und kann bei jedem Anbieter gehostet
werden (Netlify, Vercel, eigener Webserver).

## 4. Modul-System

Jedes Modul exportiert über `defineModule` ein Manifest. Die Basis liest alle
Manifeste zur Build-Zeit per `import.meta.glob('src/modules/*/manifest.ts')`
ein und blendet nur Module ein, die in `tenant_modules` für die Firma aktiv
sind.

```ts
interface ModuleManifest {
  id: string                         // 'arbeitsschutz'
  name: string
  pictogram: ComponentType           // Ampel, Menü, Berichte
  color: string                      // Standardfarbe, vom Branding überschreibbar
  dependsOn?: string[]
  permissions: PermissionDef[]       // z. B. 'arbeitsschutz.kontingent.edit'
  competences?: CompetenceSuggestion[]
  routes?: RouteDef[]                // lazy geladen
  nav?: NavItem[]
  customerTabs?: CustomerTabDef[]
  customerSettings?: ComponentType   // Formular „Kunde bucht Modul“
  dashboardWidgets?: WidgetDef[]
  activityTypes?: ActivityTypeDef[]  // Tätigkeiten im Termin-Workflow
  status?: (input: StatusInput) => StatusResult   // Ampel
  reportSections?: ReportSectionDef[]
  onboarding?: OnboardingStepDef[]
}

type StatusResult = { color: 'grey' | 'green' | 'yellow' | 'red'; reasons: string[] }
```

Andockpunkte der Basis:

- Menü und Routen
- Kundenakte (Tabs und Buchungseinstellungen)
- Spalte in der Kunden-Ampelübersicht
- Dashboard
- Tätigkeitsarten im Termin-Workflow
- Rechte-Editor
- Abschnitte im PDF-Bericht

Regeln:

- Modul-Tabellen tragen ein Präfix (`tt_` Zeiterfassung, `asc_` Arbeitsschutz)
  und haben Migrationen in einem eigenen Nummernbereich.
- Die RLS-Regeln von Modul-Tabellen prüfen zusätzlich
  `module_enabled(tenant_id, '<id>')`.
- Ein Modul greift nur über die Andockpunkte und dokumentierte Views auf die
  Basis zu, nie auf die Interna anderer Module. Einzige Ausnahme sind
  Abhängigkeiten, die in `dependsOn` stehen.
- Ein Modul ist gebucht, wenn es in `customer_modules` eine Zeile mit einem
  Zeitraum gibt, der heute umfasst. Ist es nicht gebucht, liefert die Ampel
  `grey`, ohne das Modul zu fragen.
- `npm run new-module <id>` erzeugt Ordner, Manifest, Migrationsdatei und
  Testgerüst.

## 5. Basis

### 5.1 Login und Onboarding

1. Registrieren und E-Mail bestätigen
2. Eigenes Profil: Name, Telefon, Foto, eigene Kompetenzen
3. Firma: Name, Adresse, USt-ID, Standard-Stundensatz, Standard-Km-Satz
4. Branding (optional, überspringbar): Logo, Primärfarbe, Name im PDF-Kopf.
   Ohne Angaben bleibt die Oberfläche neutral.
5. Module wählen: Zeiterfassung ist vorausgewählt, Arbeitsschutz optional
6. Mitarbeiter einladen (optional)

Wer eine Firma registriert, bekommt die Rolle Inhaber. Eingeladene Mitarbeiter
durchlaufen nur Schritt 2.

### 5.2 Datenmodell der Basis

Alle Tabellen haben `id uuid`, `tenant_id`, `created_at`, `updated_at` und
`created_by`.

| Tabelle | Inhalt |
|---|---|
| `tenants` | Name, Adresse, USt-ID, Branding (Logo-Pfad, Primärfarbe, PDF-Kopfname), Standard-Stundensatz, Standard-Km-Satz |
| `tenant_modules` | `module_id`, `enabled`, `settings jsonb` |
| `members` | `user_id`, Profil, Status (eingeladen / aktiv / deaktiviert) |
| `member_capacities` | `member_id`, `competence_id`, `year`, `hours` (Jahreskapazität) |
| `roles` | Name, `is_system`; Systemrollen sind nicht löschbar |
| `role_permissions` | `role_id`, `permission` (Text) |
| `member_roles` | `member_id`, `role_id` |
| `competences` | Name, Schlüssel (z. B. `sifa`, `betriebsarzt`) |
| `member_competences` | `member_id`, `competence_id`, `valid_until` |
| `customers` | Name, Branche (Freitext), Notizen, Abrechnungseinstellungen (siehe 5.3); die Arbeitsschutz-Kategorie hängt am Kontingent (7.2), nicht am Kunden |
| `customer_sites` | Name, Adresse, `employee_count` |
| `customer_contacts` | Name, Funktion, Telefon, E-Mail, `site_id` optional |
| `customer_assignments` | `customer_id`, `member_id`, `module_id` optional, `competence_id` optional |
| `customer_modules` | `customer_id`, `module_id`, `active_from`, `active_to`, `settings jsonb` |
| `documents` | Storage-Pfad, Titel, `customer_id`, `site_id` optional |
| `audit_log` | Tabelle, Datensatz, Aktion, Alt/Neu (jsonb), Benutzer, Zeit; per Trigger befüllt |

Die Rechteprüfung in SQL läuft über `has_permission(tenant_id, permission)`.
Diese Funktion löst die Rollen des aktuellen Benutzers auf. Inhaber und Admin
haben implizit alle Rechte.

Kundensichtbarkeit: Ein Kunde ist für einen Benutzer lesbar, wenn eine
`customer_assignments`-Zeile für ihn existiert oder `has_permission(…,
'customers.view_all')` gilt. Das setzt RLS durch.

### 5.3 Abrechnungseinstellungen pro Kunde

| Feld | Bedeutung |
|---|---|
| `bill_km` (bool), `km_rate` (Default aus Tenant) | Km × Satz |
| `bill_travel_time` (bool), `travel_hourly_rate` | Fahrzeit × Stundensatz |
| `bill_flat_fee` (bool), `flat_fee_amount` | Pauschale pro Anfahrt |
| `travel_counts_to_contingent` (bool) | Fahrzeit zählt aufs Kontingent |
| `hourly_rate` | Stundensatz für Tätigkeiten (Default aus Tenant) |

### 5.4 Kundenübersicht

- Liste ab Tablet-Breite als Tabelle, auf dem Smartphone als Karten
- Pro Kunde eine Reihe Modul-Piktogramme in Ampelfarbe; Antippen bzw.
  Tooltip zeigt `reasons`
- Filter: meine Kunden, Modul, Ampelfarbe; Suche über Name, Ort, Ansprechpartner

## 6. Modul Zeiterfassung & Fahrtenbuch (`zeiterfassung`)

### 6.1 Bedienung

Startbildschirm: Button „Arbeitstag starten“. Danach laufen die Tagesuhr und
die Aktionen Kundentermin, Interne Tätigkeit, Pause, Fahrt und Tag beenden.

Workflow Kundentermin, ein Schritt pro Bildschirm:

1. Kunde: nur sichtbare Kunden, zuletzt genutzte oben, mit Suche
2. Standort: entfällt bei nur einem Standort
3. Bereich: nur Module, die der Kunde gebucht hat
4. Tätigkeit: aus `activityTypes` des Moduls
5. Art: vor Ort / online / telefonisch / im Büro
6. Zeit („jetzt starten“ oder Von–Bis nachtragen) und Freitext

Bei „vor Ort“ fragt die App „Fahrt erfassen?“ und trägt den Kundenstandort als
Ziel ein.

### 6.2 Datenmodell

| Tabelle | Inhalt |
|---|---|
| `tt_workdays` | `member_id`, `date`, `started_at`, `ended_at`, Status (offen / abgeschlossen / freigegeben) |
| `tt_breaks` | `workday_id`, `started_at`, `ended_at` |
| `tt_activities` | `workday_id`, `customer_id` optional (leer = intern), `site_id`, `module_id`, `activity_type`, `mode`, `started_at`, `ended_at`, `note`, `billable`, `exported_at` |
| `vehicles` | Kennzeichen, Bezeichnung, `current_odometer` |
| `tt_trips` | `vehicle_id`, `member_id`, `workday_id`, `departed_at`, `arrived_at`, `odometer_start`, `odometer_end`, `origin`, `destination`, `purpose`, `customer_id` optional, `trip_type` (dienstlich / privat / Arbeitsweg), `locked_at`, `exported_at` |
| `tt_trip_corrections` | `trip_id`, Feld, alter und neuer Wert, Begründung, Benutzer, Zeit; nur INSERT erlaubt |

Die IDs offline erfasster Einträge erzeugt der Client (UUID v4).

### 6.3 Regeln

- Prüfungen nach Arbeitszeitgesetz als Warnung, nicht als Sperre:
  - mehr als 10 h Arbeitszeit am Tag
  - zu wenig Pause (über 6 h: mindestens 30 min, über 9 h: mindestens 45 min)
  - weniger als 11 h Ruhezeit zum Vortag
- Km-Kontinuität (DB-Trigger): `odometer_start` muss dem letzten
  `odometer_end` des Fahrzeugs entsprechen. Eine Lücke muss als eigene Fahrt
  (z. B. privat) oder mit Begründung erfasst werden, sonst wird gespeichert,
  aber als unvollständig markiert.
- `odometer_end` ≥ `odometer_start`, `arrived_at` ≥ `departed_at`.
- Sperre: Fahrten bekommen beim Tagesabschluss `locked_at`, spätestens 7 Tage
  nach dem Fahrtdatum per geplantem Job (pg_cron). Ein Trigger verweigert
  UPDATE und DELETE gesperrter Fahrten; Änderungen laufen über
  `tt_trip_corrections`, und Berichte zeigen die korrigierten Werte mit
  Verweis auf die Korrektur.
- Arbeitszeiten sind bis zum Tagesabschluss frei änderbar. Danach geht das nur
  noch mit Begründung (ins Audit-Log) und dem Recht `zeiterfassung.edit_closed`.

### 6.4 Offline-Sync

- Die App-Shell liegt vorab im Service-Worker-Cache. Sichtbare Kunden,
  Standorte, Fahrzeuge und Tätigkeitsarten werden in Dexie zwischengespeichert.
- Schreibvorgänge der Zeiterfassung landen zuerst in der Dexie-Tabelle
  `outbox` (Operation, Tabelle, Payload, Status, Fehler) und dann per
  Upsert auf die Client-UUID beim Server. Wiederholtes Senden ist damit
  idempotent.
- Der Sync läuft bei `online`-Events, beim App-Start und alle 60 s, solange
  Einträge offen sind.
- Ein Konflikt mit einem gesperrten Datensatz führt nicht zum Überschreiben.
  Die lokale Fassung wird als Korrekturvorschlag angeboten.
- Die Oberfläche zeigt, wie viele Einträge noch nicht synchronisiert sind, und
  listet fehlgeschlagene mit Grund. Nichts wird stillschweigend verworfen.

### 6.5 Rechte (Auswahl)

`zeiterfassung.own` (eigene Zeiten), `zeiterfassung.view_team`,
`zeiterfassung.edit_closed`, `zeiterfassung.approve`, `vehicles.manage`.

## 7. Modul Arbeitsschutz (`arbeitsschutz`)

### 7.1 Kategorien

`asc_categories`: Name, WZ-Codes (Text-Array), Betreuungsgruppe (I/II/III oder
keine), `hours_per_employee`.

- Seed pro neuer Firma: Gruppe I = 2,5 h, Gruppe II = 1,5 h, Gruppe III =
  0,5 h, dazu Beispielbranchen (z. B. Metallverarbeitung → Gruppe II).
  Alles ist editierbar.
- Hinweis in der Oberfläche: Für Betriebe mit bis zu 10 Beschäftigten nennt
  DGUV V2 keine festen Einsatzzeiten; das Kontingent wird dort manuell
  eingetragen.

### 7.2 Kontingente

`asc_contingents` (eindeutig je Kunde und Jahr):

| Feld | Bedeutung |
|---|---|
| `year` | Kalenderjahr |
| `category_id`, `hours_per_employee` | beim Anlegen festgeschrieben |
| `employee_count` | beim Anlegen aus der Summe der Standorte übernommen, editierbar |
| `base_hours` | `employee_count × hours_per_employee` (berechnet) |
| `specific_hours` | betriebsspezifischer Teil, manuell |
| `manual_hours` | Sonderfall ohne Kategorie (z. B. ≤ 10 Beschäftigte), ersetzt `base_hours` |

`asc_contingent_shares`: `contingent_id`, `competence_id`, `percent`,
`responsible_member_id`.

- Die Summe der Prozente muss 100 ergeben. Sind SiFa und Betriebsarzt
  beteiligt, braucht jeder mindestens 20 % (Prüfung im Client und per
  DB-Trigger).
- Eine zuständige Person erzeugt bzw. pflegt die passende
  `customer_assignments`-Zeile.
- `asc_contingent_adjustments`: Stunden (±) und Begründung.

Soll je Kompetenz = (Grundbetreuung bzw. manuelles Kontingent +
betriebsspezifischer Teil) × Anteil + Korrekturen dieser Kompetenz.

Ist je Kompetenz = Summe der Dauer aller `tt_activities` mit `module_id =
'arbeitsschutz'` im Jahr, für Mitarbeiter mit dieser Kompetenz. Hat ein
Mitarbeiter mehrere passende Kompetenzen, zählt die Kompetenz, unter der er dem
Kunden zugewiesen ist. Ist beim Kunden `travel_counts_to_contingent` aktiv,
kommt die Fahrzeit (`arrived_at − departed_at`) dienstlicher Fahrten zu diesem
Kunden dazu, zugeordnet nach derselben Kompetenzregel für den Fahrer.

Die Berechnung liegt als reine TypeScript-Funktion in
`src/modules/arbeitsschutz/lib/contingent.ts` und als SQL-View
`asc_contingent_status` für Berichte. Beide prüfen dieselben Testfälle.

### 7.3 Fristen

`asc_deadlines`: `customer_id`, Titel, `due_date`, `interval_months` optional,
`done_at`. Wird eine wiederkehrende Frist erledigt, legt die App die nächste an.

### 7.4 Ampel

Standardschwellen, änderbar in `tenant_modules.settings`:

- Plan = Soll × (vergangene Tage im Jahr / Tage im Jahr)
- Rot, wenn eine dieser Bedingungen gilt:
  - Ist > Soll
  - ab dem 1. April: Ist < 50 % von Plan
  - eine Frist ist überschritten
- Gelb, wenn eine dieser Bedingungen gilt:
  - Ist ≥ 80 % von Soll
  - ab dem 1. April: Ist < 80 % von Plan
  - eine Frist ist in höchstens 30 Tagen fällig
- Grün in allen anderen Fällen.
- Ohne Kontingent für das laufende Jahr: Gelb mit dem Grund „Kein Kontingent
  für <Jahr> angelegt“.

`reasons` enthält jede ausgelöste Bedingung als lesbaren Text.

### 7.5 Pott (Dashboard-Widget und eigene Seite)

- Jahr wählbar
- Je Kompetenz:
  - Bedarf = Summe der Soll-Anteile über alle Kunden
  - Kapazität = Summe `member_capacities`
  - Ist
  - Differenz Bedarf − Kapazität, rot hervorgehoben, wenn positiv
- Je Mitarbeiter: zugewiesenes Soll, Kapazität, Ist, Auslastung in %

### 7.6 Tätigkeitsarten

Begehung, Gefährdungsbeurteilung, ASA-Sitzung, Unterweisung, Beratung,
Unfalluntersuchung, Dokumentation, Sonstiges.

### 7.7 Rechte (Auswahl)

`arbeitsschutz.view`, `arbeitsschutz.kontingent.edit`,
`arbeitsschutz.categories.edit`, `arbeitsschutz.pott.view`,
`arbeitsschutz.report.view`.

## 8. Berichte und Export

Die Edge Function `generate-report` erzeugt PDFs mit dem Tenant-Branding oder
neutral ohne Branding. Jedes aktive Modul liefert Abschnitte über
`reportSections`.

- **Leistungsnachweis Kunde** (frei wählbarer Zeitraum): Kopf mit Logo und
  Firmendaten, Kontingent Soll/Ist je Kompetenz, Tätigkeiten (Datum,
  Mitarbeiter, Tätigkeit, Art, Dauer, Text), abrechenbare Fahrten, Summen.
- **Gesamtübersicht**: Kunden × Module mit Soll/Ist/Ampel; Stunden und
  Fahrzeiten je Mitarbeiter.
- **Fahrtenbuch-Auszug** pro Fahrzeug und Zeitraum, inklusive Korrekturen.

`export-billing` erzeugt CSV und XLSX mit einer Zeile pro Posten (Kunde, Datum,
Art = Tätigkeit / Km / Fahrzeit / Anfahrtspauschale, Menge, Einheit, Satz,
Betrag, Text) und setzt danach `exported_at`. Bereits exportierte Posten sind
standardmäßig ausgeschlossen; ein erneuter Export ist mit dem Recht
`billing.reexport` möglich.

## 9. Fehlerbehandlung

- Jede Eingabe wird im Client per zod geprüft. Zusätzlich sichern
  DB-Constraints und Trigger die fachlichen Regeln ab (20-%-Regel,
  Km-Kontinuität, Sperren, Prozentsumme); sie sind die letzte Instanz.
- Fehlermeldungen sind deutsch und konkret, als Toast oder am Feld. Bei einem
  fehlenden Recht nennt die Meldung das Recht.
- Offline-Fehler bleiben mit Grund in der Outbox-Liste sichtbar und lassen
  sich bearbeiten und erneut senden.
- Edge Functions antworten mit `{ error: { code, message } }`. Die Oberfläche
  bildet bekannte Codes auf Texte ab und zeigt bei unbekannten einen
  allgemeinen Text mit Code.

## 10. Tests

- **Vitest**: Kontingent-Berechnung, Ampel-Regeln (inklusive Jahresanfang,
  Schaltjahr, fehlendes Kontingent), Fahrtkosten, ArbZG-Warnungen,
  Modul-Registry, Outbox-Logik.
- **pgTAP**:
  - RLS-Matrix: Mandantentrennung, Sichtbarkeit nur zugewiesener Kunden,
    Rechte, Modul-Aktivierung
  - Sperr- und Korrekturregeln
  - Km-Kontinuität
  - 20-%-Regel
- **Playwright** (mobiles und Desktop-Viewport):
  - Onboarding
  - Mitarbeiter einladen
  - Kunde mit Standort anlegen und Modul buchen
  - Tag starten → Kundentermin → Fahrt → Tag beenden, auch im Offline-Modus
  - PDF-Bericht erzeugen

## 11. Ausbaustufen

Jede Stufe bekommt einen eigenen Implementierungsplan.

1. **Basis**: Projekt-Setup, Supabase-Schema und RLS, Auth, Onboarding,
   Branding, Mitarbeiter, Rollen und Rechte-Editor, Kompetenzen und
   Kapazitäten, Modul-Registry, Kunden mit Standorten, Kontakten und
   Dokumenten, Ampel-Übersicht (grau oder grün, solange kein Modul Status
   liefert), PWA-Grundgerüst.
2. **Zeiterfassung & Fahrtenbuch** inklusive Offline-Sync.
3. **Arbeitsschutz**: Kategorien, Kontingente, Fristen, Ampel, Pott.
4. **Berichte & Export**.
5. Weitere Module (Brandschutz, Schulungen, Erste Hilfe) nach dem Modul-Muster.

## 12. Repository

Ziel ist ein privates GitHub-Repository `ops-crm`. Diese Spec liegt vorläufig im
Repository `Test` auf dem Branch `claude/modular-crm-time-tracking-5qdkmk` und
zieht nach `ops-crm` um, sobald es angelegt ist.
