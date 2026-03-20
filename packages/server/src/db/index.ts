import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "scrum-poker.db");

// Asegurar que el directorio existe
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);

// WAL mode para mejor performance con lecturas concurrentes
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Crear tablas si no existen (sin migraciones en v1, schema-push directo)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    story_name TEXT NOT NULL,
    jira_key TEXT,
    result TEXT,
    created_at INTEGER NOT NULL,
    revealed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    participant_name TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS story_queue (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    story_name TEXT NOT NULL,
    jira_key TEXT,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS retros (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    facilitator_email TEXT NOT NULL,
    room_id TEXT,
    timer_seconds INTEGER NOT NULL,
    writing_ends_at INTEGER,
    phase TEXT NOT NULL DEFAULT 'waiting',
    votes_per_person INTEGER NOT NULL DEFAULT 5,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS retro_columns (
    id TEXT PRIMARY KEY,
    retro_id TEXT NOT NULL,
    title TEXT NOT NULL,
    emoji TEXT,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS retro_items (
    id TEXT PRIMARY KEY,
    retro_id TEXT NOT NULL,
    column_id TEXT NOT NULL,
    author_email TEXT NOT NULL,
    content TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS retro_votes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    voter_email TEXT NOT NULL
  );
`);

// Migraciones aditivas para bases ya existentes
const cols = sqlite.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
if (!cols.some((c) => c.name === "jira_key")) {
  sqlite.exec("ALTER TABLE sessions ADD COLUMN jira_key TEXT");
}
if (!cols.some((c) => c.name === "story_queue_id")) {
  sqlite.exec("ALTER TABLE sessions ADD COLUMN story_queue_id TEXT");
}
const voteCols = sqlite.prepare("PRAGMA table_info(votes)").all() as { name: string }[];
if (!voteCols.some((c) => c.name === "participant_role")) {
  sqlite.exec("ALTER TABLE votes ADD COLUMN participant_role TEXT");
}
if (!cols.some((c) => c.name === "dev_result")) {
  sqlite.exec("ALTER TABLE sessions ADD COLUMN dev_result TEXT");
}
if (!cols.some((c) => c.name === "qa_result")) {
  sqlite.exec("ALTER TABLE sessions ADD COLUMN qa_result TEXT");
}

console.log(`[db] SQLite en ${DB_PATH}`);
