const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ── TASKS ──────────────────────────────────────────

app.get("/api/tasks/:day/:date", async (req, res) => {
  const { day, date } = req.params;
  // Tâches du jour + carry over actifs non terminés
  const result = await pool.query(`
    SELECT * FROM tasks
    WHERE (day_index = $1)
       OR (carry_over = true AND done = false
           AND (carry_over_until IS NULL OR carry_over_until >= $2::date)
           AND day_index < $1)
    ORDER BY position, id
  `, [day, date]);
  res.json(result.rows);
});

app.post("/api/tasks", async (req, res) => {
  const { day_index, text, priority, position, tshirt_size, tags, carry_over, carry_over_until } = req.body;
  const result = await pool.query(`
    INSERT INTO tasks (day_index, text, priority, position, tshirt_size, tags, carry_over, carry_over_until)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
  `, [day_index, text, priority, position ?? 0, tshirt_size ?? null, tags ?? [], carry_over ?? false, carry_over_until ?? null]);
  res.json(result.rows[0]);
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { done, position, tshirt_size, tags, carry_over, carry_over_until } = req.body;
  await pool.query(`
    UPDATE tasks SET done=$1, position=$2, tshirt_size=$3, tags=$4, carry_over=$5, carry_over_until=$6
    WHERE id=$7
  `, [done, position, tshirt_size ?? null, tags ?? [], carry_over ?? false, carry_over_until ?? null, id]);
  res.json({ ok: true });
});

app.delete("/api/tasks/:id", async (req, res) => {
  await pool.query("DELETE FROM tasks WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ── BACKLOG ─────────────────────────────────────────

app.get("/api/backlog", async (req, res) => {
  const result = await pool.query("SELECT * FROM backlog ORDER BY created_at DESC");
  res.json(result.rows);
});

app.post("/api/backlog", async (req, res) => {
  const { text, priority, tshirt_size, tags } = req.body;
  const result = await pool.query(`
    INSERT INTO backlog (text, priority, tshirt_size, tags)
    VALUES ($1,$2,$3,$4) RETURNING *
  `, [text, priority ?? 'moyenne', tshirt_size ?? null, tags ?? []]);
  res.json(result.rows[0]);
});

app.delete("/api/backlog/:id", async (req, res) => {
  await pool.query("DELETE FROM backlog WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// Déplacer une tâche du backlog vers un jour
app.post("/api/backlog/:id/schedule", async (req, res) => {
  const { id } = req.params;
  const { day_index, position } = req.body;
  const backlog = await pool.query("SELECT * FROM backlog WHERE id=$1", [id]);
  if (backlog.rows.length === 0) return res.status(404).json({ error: "Not found" });
  const item = backlog.rows[0];
  const task = await pool.query(`
    INSERT INTO tasks (day_index, text, priority, position, tshirt_size, tags)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  `, [day_index, item.text, item.priority, position ?? 0, item.tshirt_size, item.tags]);
  await pool.query("DELETE FROM backlog WHERE id=$1", [id]);
  res.json(task.rows[0]);
});

// ── OBJECTIVES ─────────────────────────────────────

app.get("/api/objectives/:day", async (req, res) => {
  const result = await pool.query("SELECT * FROM objectives WHERE day_index=$1", [req.params.day]);
  res.json(result.rows[0] ?? { text: "" });
});

app.post("/api/objectives", async (req, res) => {
  const { day_index, text } = req.body;
  await pool.query(`
    INSERT INTO objectives (day_index, text) VALUES ($1,$2)
    ON CONFLICT (day_index) DO UPDATE SET text=$2
  `, [day_index, text]);
  res.json({ ok: true });
});

// ── NOTES ──────────────────────────────────────────

app.get("/api/notes/:day", async (req, res) => {
  const result = await pool.query("SELECT * FROM notes WHERE day_index=$1", [req.params.day]);
  res.json(result.rows[0] ?? { content: "" });
});

app.post("/api/notes", async (req, res) => {
  const { day_index, content } = req.body;
  await pool.query(`
    INSERT INTO notes (day_index, content) VALUES ($1,$2)
    ON CONFLICT (day_index) DO UPDATE SET content=$2
  `, [day_index, content]);
  res.json({ ok: true });
});

// ── SCHEDULE ───────────────────────────────────────

app.get("/api/schedule/:day", async (req, res) => {
  const result = await pool.query("SELECT * FROM schedule WHERE day_index=$1", [req.params.day]);
  res.json(result.rows);
});

app.post("/api/schedule", async (req, res) => {
  const { day_index, hour, block_type } = req.body;
  await pool.query(`
    INSERT INTO schedule (day_index, hour, block_type) VALUES ($1,$2,$3)
    ON CONFLICT (day_index, hour) DO UPDATE SET block_type=$3
  `, [day_index, hour, block_type]);
  res.json({ ok: true });
});

app.delete("/api/schedule/:day/:hour", async (req, res) => {
  await pool.query("DELETE FROM schedule WHERE day_index=$1 AND hour=$2", [req.params.day, req.params.hour]);
  res.json({ ok: true });
});

// ── LOGS (SSE) ─────────────────────────────────────

const logClients = [];
const logs = [];

function pushLog(msg) {
  const entry = { time: new Date().toISOString(), msg };
  logs.push(entry);
  if (logs.length > 500) logs.shift();
  logClients.forEach(res => res.write(`data: ${JSON.stringify(entry)}\n\n`));
}

// Intercepter console.log/error
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => { origLog(...args); pushLog(args.join(" ")); };
console.error = (...args) => { origErr(...args); pushLog("[ERROR] " + args.join(" ")); };

app.get("/api/admin/logs", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Envoyer les 100 derniers logs
  logs.slice(-100).forEach(e => res.write(`data: ${JSON.stringify(e)}\n\n`));
  logClients.push(res);
  req.on("close", () => {
    const i = logClients.indexOf(res);
    if (i !== -1) logClients.splice(i, 1);
  });
});

// ── START ──────────────────────────────────────────

app.listen(process.env.PORT, () => {
  console.log(`API running on port ${process.env.PORT}`);
});