// Read-only dashboard. Fetches entries from the live Cloudflare Worker and
// renders counts of pending and completed updates per initiative.
// It never writes to the Worker.
import express from "express";

const WORKER_URL = process.env.WORKER_URL || "https://mgt3745-hw4.princemuteteke.workers.dev";
const app = express();

const INITIATIVES = {
  stepshow: "Homecoming Stepshow",
  pageant: "Scholarship Pageant",
  general: "General Events",
  brotherhood: "Brotherhood",
  national: "National",
};

// Every value that came from a user is escaped before it reaches HTML.
// This is the server-side twin of textContent in the browser pages.
function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function summarize(entries) {
  const byInitiative = new Map();
  for (const entry of entries) {
    if (!byInitiative.has(entry.initiative)) {
      byInitiative.set(entry.initiative, { pending: 0, completed: 0 });
    }
    const row = byInitiative.get(entry.initiative);
    if (entry.status === "completed") row.completed += 1;
    else row.pending += 1;
  }
  return byInitiative;
}

// Colors and type follow STYLE.md: black, old gold, cream, Arial, 14px minimum.
function layout(body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nu Mu Update Dashboard</title>
  <style>
    :root { font-family: Arial, Helvetica, sans-serif; color: #0d0d0d; background: #f7f1de; }
    body { margin: 0; font-size: 14px; }
    main { max-width: 44rem; margin: 2rem auto; padding: 0 1.25rem; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.4rem; border-bottom: 2px solid #a8842c; padding-bottom: 0.3rem; }
    p, td, th { line-height: 1.5; }
    .note { color: #6b5015; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 4px; }
    th { background: #a8842c; color: #0d0d0d; text-align: left; }
    th, td { padding: 8px 16px; border-bottom: 1px solid #ddd0a8; }
    progress { width: 100%; height: 1.25rem; }
    .error { color: #922020; font-weight: 700; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`;
}

app.get("/", async (req, res) => {
  try {
    const upstream = await fetch(WORKER_URL + "/entries", { signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) {
      res.status(502).send(layout(`<h1>Nu Mu Update Dashboard</h1><p class="error">The Worker answered with status ${esc(upstream.status)}. Try again shortly.</p>`));
      return;
    }
    const entries = await upstream.json();
    const summary = summarize(entries);
    const total = entries.length;
    const completed = entries.filter((e) => e.status === "completed").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const rows = [...summary.entries()]
      .map(([key, counts]) => {
        const label = INITIATIVES[key] || key;
        return `<tr><td>${esc(label)}</td><td>${counts.pending}</td><td>${counts.completed}</td><td>${counts.pending + counts.completed}</td></tr>`;
      })
      .join("");

    res.send(layout(`
      <h1>Nu Mu Update Dashboard</h1>
      <p class="note">Read-only view of the chapter update tool. Data comes live from the Cloudflare Worker.</p>
      <h2>Overall progress</h2>
      <p>${completed} of ${total} updates completed (${percent}%)</p>
      <progress value="${completed}" max="${total || 1}" aria-label="Completed updates"></progress>
      <h2>By initiative</h2>
      <table>
        <thead><tr><th>Initiative</th><th>Pending</th><th>Completed</th><th>Total</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No updates yet.</td></tr>'}</tbody>
      </table>`));
  } catch {
    res.status(502).send(layout(`<h1>Nu Mu Update Dashboard</h1><p class="error">Could not reach the Worker. Try again shortly.</p>`));
  }
});

app.listen(process.env.PORT || 8080);