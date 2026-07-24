ALTER TABLE agent_runs ADD COLUMN performance_json TEXT;

PRAGMA user_version = 5;
