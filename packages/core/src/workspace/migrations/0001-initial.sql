CREATE TABLE workspace (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  cancellation_requested INTEGER NOT NULL DEFAULT 0,
  resume_cursor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  sequence INTEGER PRIMARY KEY,
  event_json TEXT NOT NULL
);

CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON audit_events BEGIN
  SELECT RAISE(ABORT, 'audit events are append-only');
END;

CREATE TRIGGER audit_events_no_delete
BEFORE DELETE ON audit_events BEGIN
  SELECT RAISE(ABORT, 'audit events are append-only');
END;

PRAGMA user_version = 1;
