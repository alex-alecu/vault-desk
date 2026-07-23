ALTER TABLE agent_events ADD COLUMN workspace_path TEXT;
ALTER TABLE agent_events ADD COLUMN command TEXT;
ALTER TABLE agent_events ADD COLUMN exit_code INTEGER;
ALTER TABLE agent_events ADD COLUMN duration_ms INTEGER;

PRAGMA user_version = 6;
