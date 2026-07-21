import type { AgentArtifactSummary } from "@vault/shared";
import type { TimelineItem } from "../state.js";
import { Icon } from "./icons.js";

interface ActivityProps {
  artifacts: AgentArtifactSummary[];
  open: boolean;
  timeline: TimelineItem[];
  onClose(): void;
  onOpen(): void;
}

export function Activity({ artifacts, open, timeline, onClose, onOpen }: ActivityProps) {
  const activity = timeline.filter((item) => item.kind === "activity");
  return (
    <>
      {open ? null : (
        <button
          aria-label="Open activity and technical details"
          className="activity-toggle"
          onClick={onOpen}
          type="button"
        >
          <Icon name="activity" />
        </button>
      )}
      {open ? (
        <aside aria-label="Activity and technical details" className="activity-drawer">
          <header className="activity-header">
            <div>
              <h2>Activity</h2>
              <p>Technical details and task progress</p>
            </div>
            <button aria-label="Close activity" onClick={onClose} type="button">
              <Icon name="close" />
            </button>
          </header>
          <div className="activity-scroll">
            {activity.length === 0 && artifacts.length === 0 ? (
              <p className="activity-empty">Task activity will appear here.</p>
            ) : null}
            {activity.map((item) => (
              <article className="activity-item" key={item.id}>
                <p>{item.text}</p>
                {item.detail === undefined ? null : (
                  <details>
                    <summary>Show details</summary>
                    <pre>{item.detail}</pre>
                  </details>
                )}
              </article>
            ))}
            {artifacts.map((item) => (
              <article className="activity-item" key={item.id}>
                <span className="activity-label">Generated file</span>
                <p>{item.name}</p>
              </article>
            ))}
          </div>
        </aside>
      ) : null}
    </>
  );
}
