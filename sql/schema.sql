-- Dashboard productivity schema

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  day_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority VARCHAR(10) DEFAULT 'moyenne',
  position INTEGER DEFAULT 0,
  tshirt_size VARCHAR(3) DEFAULT NULL,
  tags TEXT[] DEFAULT '{}',
  carry_over BOOLEAN DEFAULT FALSE,
  carry_over_until DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS objectives (
  id SERIAL PRIMARY KEY,
  day_index INTEGER UNIQUE NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  day_index INTEGER UNIQUE NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule (
  id SERIAL PRIMARY KEY,
  day_index INTEGER NOT NULL,
  hour INTEGER NOT NULL,
  block_type INTEGER NOT NULL,
  UNIQUE(day_index, hour)
);

CREATE TABLE IF NOT EXISTS backlog (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'moyenne',
  tshirt_size VARCHAR(3) DEFAULT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);