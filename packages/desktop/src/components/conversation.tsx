import type { AgentArtifactSummary } from "@vault/shared";
import type { TimelineItem } from "../state.js";

interface ConversationProps {
  artifacts: AgentArtifactSummary[];
  ready: boolean;
  timeline: TimelineItem[];
  onSuggestion(text: string): void;
}

function EmptyConversation({
  onSuggestion,
  ready,
}: Pick<ConversationProps, "onSuggestion" | "ready">) {
  return (
    <div className="welcome">
      <div aria-hidden="true" className="welcome-mark">
        V
      </div>
      <h1>What should we work on?</h1>
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
          onClick={() => onSuggestion("Build a useful artifact from these files.")}
          type="button"
        >
          Build a small artifact
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

export function Conversation({ ready, timeline, onSuggestion }: ConversationProps) {
  const messages = timeline.filter((item) => item.kind !== "activity");
  if (messages.length === 0) {
    return <EmptyConversation onSuggestion={onSuggestion} ready={ready} />;
  }
  return (
    <section aria-label="Conversation" aria-live="polite" className="timeline">
      {messages.map((item) => (
        <article className={`timeline-item timeline-${item.kind}`} key={item.id}>
          <p>{item.text}</p>
        </article>
      ))}
      <div
        aria-hidden="true"
        key={messages.length}
        ref={(node) => node?.scrollIntoView({ block: "end" })}
      />
    </section>
  );
}
