CREATE TABLE audit_head (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  sequence INTEGER NOT NULL,
  hash TEXT NOT NULL
);

INSERT INTO audit_head (singleton, sequence, hash)
SELECT 1, sequence, json_extract(event_json, '$.hash')
FROM audit_events
ORDER BY sequence DESC
LIMIT 1;

CREATE TRIGGER audit_head_no_delete
BEFORE DELETE ON audit_head BEGIN
  SELECT RAISE(ABORT, 'audit head cannot be deleted');
END;

PRAGMA user_version = 2;
