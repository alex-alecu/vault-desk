import { AgentArtifactSummarySchema } from "@vault/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TechnicalDetails } from "./components/technical-details.js";
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
const timeline = [
  {
    createdAt: timestamp,
    eventType: "run.started",
    id: "limits",
    kind: "activity",
    text: "Offline limits: 4 CPUs, 4 GiB memory, 128 MiB scratch.",
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
    <TechnicalDetails artifacts={[artifact]} onClose={() => undefined} open timeline={timeline} />,
  );
}

describe("technical details drawer", () => {
  it("shows low-level evidence without generic progress", () => {
    const markup = renderTechnicalDetails();

    expect(markup).toContain("Technical details");
    expect(markup).toContain('aria-label="Close technical details"');
    expect(markup).toContain("4 CPUs, 4 GiB memory, 128 MiB scratch");
    expect(markup).toContain("print(&#x27;ok&#x27;)");
    expect(markup).toContain("Output:\nok");
    expect(markup).toContain("Termination: completed");
    expect(markup).toContain("text/csv");
    expect(markup).toContain("42 bytes");
    expect(markup).not.toContain("Planning the task");
    expect(markup).not.toContain("Response completed");
  });
});
