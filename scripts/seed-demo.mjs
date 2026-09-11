/**
 * Befüllt ein frisches Dashboard mit Beispieldaten über die öffentliche API —
 * praktisch, um Diagramme und KPIs nach dem ersten Start sofort zu sehen.
 *
 *   INGEST_TOKEN=… node scripts/seed-demo.mjs [http://localhost:3000]
 *
 * Die Daten sind erfunden. Vor dem Echtbetrieb `data/dashboard.json` löschen.
 */

const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const token = process.env.INGEST_TOKEN;

if (!token) {
  console.error("INGEST_TOKEN fehlt. Beispiel: INGEST_TOKEN=geheim node scripts/seed-demo.mjs");
  process.exit(1);
}

const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

function isoDate(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function send(path, body, method = "POST") {
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: JSON.stringify(body) });
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

// 8 Wochen Verlauf: Gewicht sinkt, Blutdruck und Ruhepuls entspannen sich.
const entries = [];
for (let week = 8; week >= 0; week -= 1) {
  entries.push({
    date: isoDate(week * 7),
    weight: Number((113 - (8 - week) * 1.15).toFixed(1)),
    systolic: 144 - (8 - week) * 2,
    diastolic: 94 - (8 - week) * 1.4 > 78 ? Math.round(94 - (8 - week) * 1.4) : 78,
    restingHr: 70 - (8 - week),
  });
}

const workouts = [
  { date: isoDate(56), type: "zwift_ftp_test", durationMin: 45, ftpWatts: 198, avgHr: 148, rpe: 9 },
  { date: isoDate(49), type: "zwift_z2", durationMin: 75, avgWatts: 132, avgHr: 126, rpe: 4 },
  { date: isoDate(42), type: "kettlebell", durationMin: 30, kettlebellWeightKg: 20, rounds: 6, rpe: 7 },
  { date: isoDate(35), type: "zwift_intervals", durationMin: 60, avgWatts: 168, avgHr: 152, rpe: 8 },
  { date: isoDate(28), type: "zwift_ftp_test", durationMin: 45, ftpWatts: 224, avgHr: 152, rpe: 9 },
  { date: isoDate(21), type: "zwift_z2", durationMin: 90, avgWatts: 148, avgHr: 124, rpe: 4 },
  { date: isoDate(14), type: "kettlebell", durationMin: 35, kettlebellWeightKg: 24, rounds: 8, rpe: 8 },
  { date: isoDate(7), type: "zwift_intervals", durationMin: 65, avgWatts: 186, avgHr: 155, rpe: 8 },
  { date: isoDate(4), type: "zwift_ftp_test", durationMin: 45, ftpWatts: 252, avgHr: 156, rpe: 10 },
  { date: isoDate(2), type: "zwift_z2", durationMin: 80, avgWatts: 162, avgHr: 128, rpe: 4 },
];

const { saved } = await send("/api/ingest", { entries });
for (const workout of workouts) await send("/api/workouts", workout);

const summary = await (await fetch(`${baseUrl}/api/summary`, { headers })).json();

console.log(`${saved} Messtage und ${workouts.length} Trainingseinheiten angelegt.`);
console.log(summary.headline);
