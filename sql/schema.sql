-- ── Drop and recreate database ──────────────────────────────────────

-- Run this as postgres user first:
-- DROP DATABASE IF EXISTS dashboard_db;
-- CREATE DATABASE dashboard_db OWNER dashboard_user;

-- ── Tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id               SERIAL PRIMARY KEY,
  day_index        INTEGER NOT NULL,
  text             TEXT NOT NULL,
  done             BOOLEAN DEFAULT FALSE,
  priority         VARCHAR(10) DEFAULT 'moyenne',
  position         INTEGER DEFAULT 0,
  tshirt_size      VARCHAR(3) DEFAULT NULL,
  tags             TEXT[] DEFAULT '{}',
  start_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date  DATE DEFAULT NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS objectives (
  id        SERIAL PRIMARY KEY,
  day_index INTEGER UNIQUE NOT NULL,
  text      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id        SERIAL PRIMARY KEY,
  day_index INTEGER UNIQUE NOT NULL,
  content   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule (
  id         SERIAL PRIMARY KEY,
  day_index  INTEGER NOT NULL,
  hour       INTEGER NOT NULL,
  block_type INTEGER NOT NULL,
  UNIQUE(day_index, hour)
);

CREATE TABLE IF NOT EXISTS backlog (
  id          SERIAL PRIMARY KEY,
  text        TEXT NOT NULL,
  priority    VARCHAR(10) DEFAULT 'moyenne',
  tshirt_size VARCHAR(3) DEFAULT NULL,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Grants ──────────────────────────────────────────────────────────

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dashboard_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dashboard_user;