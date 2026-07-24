import type { DatabasePort } from "../workspace/database.js";
import type { AgentExecutionStore } from "./execution-store.js";

export function recoverInterruptedRuns(
  database: DatabasePort,
  executions: AgentExecutionStore,
  interruptTrace: (runId: string) => void,
  appendFailure: (runId: string) => void,
): number {
  const now = new Date().toISOString();
  return database.transaction(() => {
    const rows = database
      .prepare("SELECT id, job_id FROM agent_runs WHERE state IN ('queued', 'running')")
      .all() as Array<{ id: string; job_id: string }>;
    for (const row of rows) {
      database
        .prepare(
          "UPDATE agent_runs SET state = 'failed', error = 'core_restarted', updated_at = ? WHERE id = ?",
        )
        .run(now, row.id);
      database
        .prepare("UPDATE jobs SET state = 'failed', updated_at = ? WHERE id = ?")
        .run(now, row.job_id);
      executions.failIncomplete(row.id, false, now);
      interruptTrace(row.id);
      appendFailure(row.id);
    }
    return rows.length;
  })();
}
