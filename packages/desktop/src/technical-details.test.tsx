import { AgentArtifactSummarySchema, AgentExecutionSnapshotSchema } from "@vault/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shouldFollowLog, TechnicalDetails } from "./components/technical-details.js";
import { LogsPanel } from "./components/technical-logs.js";
import type { TimelineItem } from "./state.js";

const timestamp = "2026-07-20T12:00:00.000Z";
const artifact = AgentArtifactSummarySchema.parse({
  id: "6ad824dc-bd7a-431a-9b2a-e79cdb8a98fe",
  runId: "77ff5b22-555d-4ef2-9170-fdd7118738f1",
  name: "report.csv",
  mediaType: "text/csv",
  byteLength: 42,
  contentHash: `sha256:${"a".repeat(64)}`,
  createdAt: timestamp,
});
const execution = AgentExecutionSnapshotSchema.parse({
  id: "8546e320-b1ef-48df-8ea1-51524d95ca1a",
  runId: "77ff5b22-555d-4ef2-9170-fdd7118738f1",
  sequence: 0,
  language: "python",
  path: "steps/0001.py",
  source: "print('ok')",
  command: null,
  state: "completed",
  exitCode: 0,
  durationMs: 2,
  termination: "completed",
  stdout: "private output\n",
  stderr: "",
  vmDiagnostics: [],
  stdoutBytes: 15,
  stderrBytes: 0,
  vmDiagnosticsBytes: 2,
  stdoutTruncated: false,
  stderrTruncated: false,
  vmDiagnosticsTruncated: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp,
});
const activeExecution = AgentExecutionSnapshotSchema.parse({
  ...execution,
  id: "54c5ad78-d10f-4447-aa3f-f68b315ed890",
  sequence: 1,
  state: "running",
  exitCode: null,
  durationMs: null,
  termination: null,
  stdout: "live output\n",
  stdoutBytes: 12,
  vmDiagnostics: [
    {
      sequence: 0,
      code: "process_start",
      platform: "guest",
      platformCode: null,
      createdAt: timestamp,
    },
  ],
  completedAt: null,
});
const timeline = [
  {
    createdAt: timestamp,
    eventType: "run.started",
    id: "limits",
    kind: "activity",
    text: "Offline limits: 4 CPUs, 4 GiB memory, 128 MiB persistent workspace.",
  },
  {
    createdAt: timestamp,
    eventType: "inference.started",
    id: "planning",
    kind: "activity",
    text: "Planning the task.",
  },
  {
    createdAt: timestamp,
    detail: "Code:\nprint('ok')",
    eventType: "execution.started",
    id: "code",
    kind: "activity",
    text: "Inspecting data.",
  },
  {
    createdAt: timestamp,
    detail: "Output:\nok\n\nTermination: completed",
    eventType: "execution.completed",
    id: "output",
    kind: "activity",
    text: "Python finished with exit code 0.",
  },
  {
    createdAt: timestamp,
    eventType: "assistant.completed",
    id: "completed",
    kind: "activity",
    text: "Response completed.",
  },
] satisfies TimelineItem[];

function renderTechnicalDetails(): string {
  return renderToStaticMarkup(
    <TechnicalDetails
      artifacts={[artifact]}
      executions={[execution]}
      onClose={() => undefined}
      open
      timeline={timeline}
    />,
  );
}

describe("technical details drawer", () => {
  it("shows low-level evidence without generic progress", () => {
    const markup = renderTechnicalDetails();

    expect(markup).toContain("Technical details");
    expect(markup).toContain('aria-label="Close technical details"');
    expect(markup).toContain("4 CPUs, 4 GiB memory, 128 MiB persistent workspace");
    expect(markup).toContain("Certified guest capabilities");
    expect(markup).toContain("Python: 3.14.5");
    expect(markup).toContain("/usr/bin/patch");
    expect(markup).toContain("print(&#x27;ok&#x27;)");
    expect(markup).toContain("Termination: completed");
    expect(markup).toContain("text/csv");
    expect(markup).toContain("42 bytes");
    expect(markup).not.toContain("Planning the task");
    expect(markup).not.toContain("Response completed");
    expect(markup).not.toContain("private output");
    expect(markup).toContain('aria-selected="true" role="tab"');
    expect(markup).toContain("Overview</button>");
  });

  it("follows only while the viewer remains near the bottom", () => {
    expect(shouldFollowLog(1_000, 760, 200)).toBe(true);
    expect(shouldFollowLog(1_000, 600, 200)).toBe(false);
  });

  it("opens only the active execution after Logs is selected", () => {
    const markup = renderToStaticMarkup(<LogsPanel executions={[execution, activeExecution]} />);

    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Output for execution 2"');
    expect(markup).toContain("live output");
    expect(markup).not.toContain("private output");
    expect(markup).toContain("readOnly");
  });
});
