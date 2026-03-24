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

app.get("/api/tasks/:day", async (req, res) => {
  const { day } = req.params;
  const result = await pool.query(
    "SELECT * FROM tasks WHERE day_index=$1 ORDER BY position, id",
    [day]
  );
  res.json(result.rows);
});

app.post("/api/tasks", async (req, res) => {
  const { day_index, text, priority, position } = req.body;
  const result = await pool.query(
    "INSERT INTO tasks (day_index, text, priority, position) VALUES ($1,$2,$3,$4) RETURNING *",
    [day_index, text, priority, position ?? 0]
  );
  res.json(result.rows[0]);
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { done, position } = req.body;
  await pool.query(
    "UPDATE tasks SET done=$1, position=$2 WHERE id=$3",
    [done, position, id]
  );
  res.json({ ok: true });
});

app.delete("/api/tasks/:id", async (req, res) => {
  await pool.query("DELETE FROM tasks WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ── OBJECTIVES ─────────────────────────────────────

app.get("/api/objectives/:day", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM objectives WHERE day_index=$1",
    [req.params.day]
  );
  res.json(result.rows[0] ?? { text: "" });
});

app.post("/api/objectives", async (req, res) => {
  const { day_index, text } = req.body;
  await pool.query(
    `INSERT INTO objectives (day_index, text) VALUES ($1,$2)
     ON CONFLICT (day_index) DO UPDATE SET text=$2`,
    [day_index, text]
  );
  res.json({ ok: true });
});

// ── NOTES ──────────────────────────────────────────

app.get("/api/notes/:day", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM notes WHERE day_index=$1",
    [req.params.day]
  );
  res.json(result.rows[0] ?? { content: "" });
});

app.post("/api/notes", async (req, res) => {
  const { day_index, content } = req.body;
  await pool.query(
    `INSERT INTO notes (day_index, content) VALUES ($1,$2)
     ON CONFLICT (day_index) DO UPDATE SET content=$2`,
    [day_index, content]
  );
  res.json({ ok: true });
});

// ── SCHEDULE ───────────────────────────────────────

app.get("/api/schedule/:day", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM schedule WHERE day_index=$1",
    [req.params.day]
  );
  res.json(result.rows);
});

app.post("/api/schedule", async (req, res) => {
  const { day_index, hour, block_type } = req.body;
  await pool.query(
    `INSERT INTO schedule (day_index, hour, block_type) VALUES ($1,$2,$3)
     ON CONFLICT (day_index, hour) DO UPDATE SET block_type=$3`,
    [day_index, hour, block_type]
  );
  res.json({ ok: true });
});

app.delete("/api/schedule/:day/:hour", async (req, res) => {
  await pool.query(
    "DELETE FROM schedule WHERE day_index=$1 AND hour=$2",
    [req.params.day, req.params.hour]
  );
  res.json({ ok: true });
});

// ── START ──────────────────────────────────────────

app.listen(process.env.PORT, () => {
  console.log(`API running on port ${process.env.PORT}`);
});
