CREATE TABLE agent_executions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('python', 'node', 'shell')),
  workspace_path TEXT,
  code TEXT,
  command TEXT,
  state TEXT NOT NULL CHECK (state IN ('starting', 'running', 'completed', 'failed', 'cancelled')),
  exit_code INTEGER,
  duration_ms INTEGER,
  termination TEXT,
  stdout BLOB NOT NULL DEFAULT X'',
  stderr BLOB NOT NULL DEFAULT X'',
  vm_diagnostics_json TEXT NOT NULL DEFAULT '[]',
  stdout_truncated INTEGER NOT NULL DEFAULT 0,
  stderr_truncated INTEGER NOT NULL DEFAULT 0,
  vm_diagnostics_truncated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(run_id, sequence)
);

CREATE INDEX agent_executions_by_run
ON agent_executions(run_id, sequence);

INSERT INTO agent_executions (
  id, run_id, sequence, language, workspace_path, code, command, state,
  exit_code, duration_ms, termination, stdout, stderr, created_at, updated_at, completed_at
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-8' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
  run_id,
  row_number() OVER (PARTITION BY run_id ORDER BY sequence) - 1,
  language,
  workspace_path,
  code,
  command,
  CASE
    WHEN termination = 'cancelled' THEN 'cancelled'
    WHEN termination = 'completed' AND coalesce(exit_code, 0) = 0 THEN 'completed'
    ELSE 'failed'
  END,
  CASE WHEN termination = 'completed' AND exit_code IS NULL THEN 0 ELSE exit_code END,
  duration_ms,
  termination,
  CAST(coalesce(stdout, '') AS BLOB),
  CAST(coalesce(stderr, '') AS BLOB),
  created_at,
  created_at,
  created_at
FROM agent_events
WHERE event_type = 'execution.completed' AND language IS NOT NULL;

PRAGMA user_version = 7;
