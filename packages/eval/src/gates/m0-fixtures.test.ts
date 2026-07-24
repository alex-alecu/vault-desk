import { describe, expect, it } from "vitest";
import { developmentAgentTasks, encodeAgentTaskCorpus } from "../fixtures/agent-tasks.js";
import { heldoutAgentTasks } from "../fixtures/heldout-agent-tasks.js";

const requiredCategories = new Set([
  "positive",
  "negative",
  "contradiction",
  "locale",
  "corruption",
  "prompt_injection",
]);

describe("M0 deterministic evaluation corpora", () => {
  it("generates identical bytes and covers every required class", () => {
    const first = encodeAgentTaskCorpus(developmentAgentTasks());
    const second = encodeAgentTaskCorpus(developmentAgentTasks());
    expect(first).toEqual(second);
    expect(new Set(developmentAgentTasks().map((entry) => entry.category))).toEqual(
      requiredCategories,
    );
  });

  it("keeps held-out tasks separate and every source anchor exact", () => {
    const development = developmentAgentTasks();
    const heldout = heldoutAgentTasks();
    const developmentIds = new Set(development.map((entry) => entry.id));
    expect(heldout.every((entry) => !developmentIds.has(entry.id))).toBe(true);
    expect(new Set(heldout.map((entry) => entry.category))).toEqual(requiredCategories);
    for (const fixture of [...development, ...heldout]) {
      const content = Buffer.from(fixture.contentBase64, "base64").toString("utf8");
      expect(fixture.anchors.every((anchor) => content.includes(anchor.exactText))).toBe(true);
    }
  });
});
