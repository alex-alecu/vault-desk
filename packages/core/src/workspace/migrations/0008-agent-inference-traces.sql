ALTER TABLE agent_runs ADD COLUMN trace_version INTEGER NOT NULL DEFAULT 0
  CHECK (trace_version IN (0, 1));

CREATE TABLE agent_inference_turns (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('decision', 'final_response')),
  request_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  context_size TEXT NOT NULL,
  max_tokens INTEGER NOT NULL,
  allocated_context_tokens INTEGER,
  prompt_hash TEXT NOT NULL,
  schema_hash TEXT NOT NULL,
  response_hash TEXT,
  outcome TEXT CHECK (outcome IN (
    'accepted_execution',
    'accepted_response',
    'rejected_duplicate',
    'invalid_response',
    'inference_failed',
    'cancelled',
    'interrupted'
  )),
  execution_sequence INTEGER,
  created_at TEXT NOT NULL,
  response_captured_at TEXT,
  completed_at TEXT,
  UNIQUE(run_id, sequence)
);

CREATE INDEX agent_inference_turns_by_run
ON agent_inference_turns(run_id, sequence);

PRAGMA user_version = 8;
