import os
import secrets
import sqlite3
import string
import time

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.getcwd(), "data", "scrum-poker.db"))
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

_conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
_conn.row_factory = sqlite3.Row
_conn.execute("PRAGMA journal_mode=WAL")
_conn.execute("PRAGMA foreign_keys=ON")


def fetchone(sql: str, params: tuple = ()) -> dict | None:
    row = _conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def fetchall(sql: str, params: tuple = ()) -> list[dict]:
    return [dict(r) for r in _conn.execute(sql, params).fetchall()]


def execute(sql: str, params: tuple = ()) -> None:
    _conn.execute(sql, params)


def now_ms() -> int:
    return int(time.time() * 1000)


def generate_room_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(6))


def generate_id() -> str:
    return secrets.token_hex(16)


def calc_average(vote_values: list[str]) -> float | None:
    numeric = []
    for v in vote_values:
        if v == "?":
            continue
        try:
            numeric.append(float(v))
        except ValueError:
            continue
    if not numeric:
        return None
    return round(sum(numeric) / len(numeric) * 10) / 10


def _snake_to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


def row_to_camel(row: dict) -> dict:
    return {_snake_to_camel(k): v for k, v in row.items()}


def init_db() -> None:
    _conn.executescript("""
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
            story_queue_id TEXT,
            result TEXT,
            dev_result TEXT,
            qa_result TEXT,
            created_at INTEGER NOT NULL,
            revealed_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS votes (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id),
            participant_name TEXT NOT NULL,
            participant_role TEXT,
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
    """)

    # Migraciones aditivas para bases de datos existentes
    _add_column_if_missing("sessions", "jira_key", "TEXT")
    _add_column_if_missing("sessions", "story_queue_id", "TEXT")
    _add_column_if_missing("sessions", "dev_result", "TEXT")
    _add_column_if_missing("sessions", "qa_result", "TEXT")
    _add_column_if_missing("votes", "participant_role", "TEXT")

    print(f"[db] SQLite en {DB_PATH}")


def _add_column_if_missing(table: str, column: str, col_type: str) -> None:
    cols = [c["name"] for c in fetchall(f"PRAGMA table_info({table})")]
    if column not in cols:
        execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
