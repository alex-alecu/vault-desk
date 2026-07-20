import type { TimelineItem } from "../state.js";

interface ConversationProps {
  timeline: TimelineItem[];
}

function EmptyConversation() {
  return (
    <div className="welcome">
      <div aria-hidden="true" className="welcome-mark">
        V
      </div>
      <h1>What should we work on?</h1>
      <p>Select a folder, attach files in New chat, or start with a question.</p>
      <div className="suggestions">
        <button type="button">Explore and understand files</button>
        <button type="button">Build a small artifact</button>
        <button type="button">Compare documents or data</button>
        <button type="button">Diagnose an issue</button>
      </div>
    </div>
  );
}

export function Conversation({ timeline }: ConversationProps) {
  if (timeline.length === 0) return <EmptyConversation />;
  return (
    <div aria-live="polite" className="timeline">
      {timeline.map((item) => (
        <article className={`timeline-item timeline-${item.kind}`} key={item.id}>
          {item.kind === "activity" ? <span className="activity-label">Activity</span> : null}
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}
