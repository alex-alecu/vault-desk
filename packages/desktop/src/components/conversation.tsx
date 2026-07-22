import type { AgentArtifactSummary, AgentRunPerformance } from "@vault/shared";
import Markdown from "react-markdown";
import type { TimelineItem } from "../state.js";

interface ConversationProps {
  artifacts: AgentArtifactSummary[];
  folderName?: string | undefined;
  ready: boolean;
  timeline: TimelineItem[];
  onSuggestion(text: string): void;
  performance: AgentRunPerformance | null;
  runId: string | undefined;
  thinking: string | null;
}

type OrderedEntry =
  | { createdAt: string; item: AgentArtifactSummary; kind: "artifact"; order: number }
  | { createdAt: string; item: TimelineItem; kind: "timeline"; order: number };

function showsInConversation(item: TimelineItem): boolean {
  return (
    item.kind !== "activity" ||
    (item.eventType !== "run.started" && item.eventType !== "assistant.completed")
  );
}

function conversationEntries(
  timeline: TimelineItem[],
  artifacts: AgentArtifactSummary[],
): OrderedEntry[] {
  const entries: OrderedEntry[] = timeline
    .filter(showsInConversation)
    .map((item, order) => ({ createdAt: item.createdAt, item, kind: "timeline", order }));
  entries.push(
    ...artifacts.map((item, index) => ({
      createdAt: item.createdAt,
      item,
      kind: "artifact" as const,
      order: timeline.length + index,
    })),
  );
  return entries.sort(
    (left, right) => left.createdAt.localeCompare(right.createdAt) || left.order - right.order,
  );
}

function EmptyConversation({
  folderName,
  onSuggestion,
  ready,
}: Pick<ConversationProps, "folderName" | "onSuggestion" | "ready">) {
  return (
    <div className="welcome">
      <h1>What should we work on{folderName === undefined ? "" : ` in ${folderName}`}?</h1>
      <p>
        {ready
          ? "Select a folder, attach files in New chat, or start with a question."
          : "Starting your private workspace…"}
      </p>
      <div className="suggestions">
        <button
          disabled={!ready}
          onClick={() => onSuggestion("Explore and explain the selected files.")}
          type="button"
        >
          Explore and understand files
        </button>
        <button
          disabled={!ready}
          onClick={() => onSuggestion("Review these files and suggest practical improvements.")}
          type="button"
        >
          Review and suggest improvements
        </button>
        <button
          disabled={!ready}
          onClick={() => onSuggestion("Compare the selected documents or data.")}
          type="button"
        >
          Compare documents or data
        </button>
        <button
          disabled={!ready}
          onClick={() => onSuggestion("Diagnose the issue in the selected files.")}
          type="button"
        >
          Diagnose an issue
        </button>
      </div>
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)}s`;
  const minutes = Math.floor(milliseconds / 60_000);
  return `${minutes}m ${Math.round((milliseconds % 60_000) / 1_000)}s`;
}

function ResponseMetrics({ performance }: { performance: AgentRunPerformance }) {
  return (
    <footer className="response-metrics">
      <span>
        <strong>{performance.tokensPerSecond.toFixed(1)}</strong> tok/s
      </span>
      <span>
        <strong>{performance.promptTokensPerSecond.toFixed(1)}</strong> prompt tok/s
      </span>
      <span>
        <strong>{formatDuration(performance.totalDurationMs)}</strong> total
      </span>
    </footer>
  );
}

function AssistantResponse({ children }: { children: string }) {
  return (
    <div className="assistant-markdown">
      <Markdown disallowedElements={["a", "img"]} skipHtml unwrapDisallowed>
        {children}
      </Markdown>
    </div>
  );
}

export function Conversation({
  artifacts,
  folderName,
  ready,
  timeline,
  onSuggestion,
  performance,
  runId,
  thinking,
}: ConversationProps) {
  const entries = conversationEntries(timeline, artifacts);
  if (entries.length === 0) {
    return <EmptyConversation folderName={folderName} onSuggestion={onSuggestion} ready={ready} />;
  }
  const lastAssistantId = timeline.findLast((item) => item.kind === "assistant")?.id;
  return (
    <section aria-label="Conversation" aria-live="polite" className="timeline">
      {entries.map((entry) => {
        if (entry.kind === "artifact") {
          return (
            <article className="timeline-item timeline-artifact" key={entry.item.id}>
              <span className="activity-label">Generated file</span>
              <p>{entry.item.name}</p>
            </article>
          );
        }
        const item = entry.item;
        const showMetrics =
          item.id === lastAssistantId && item.runId === runId && performance !== null;
        return (
          <article className={`timeline-item timeline-${item.kind}`} key={item.id}>
            {item.kind === "assistant" ? (
              <AssistantResponse>{item.text}</AssistantResponse>
            ) : (
              <p>{item.text}</p>
            )}
            {showMetrics ? <ResponseMetrics performance={performance} /> : null}
          </article>
        );
      })}
      {thinking === null || thinking.length === 0 ? null : (
        <article className="thinking-stream">
          <header>
            <span aria-hidden="true" className="thinking-pulse" />
            Thinking locally
          </header>
          <p>{thinking}</p>
        </article>
      )}
      <div
        aria-hidden="true"
        key={entries.length}
        ref={(node) => node?.scrollIntoView({ block: "end" })}
      />
    </section>
  );
}
