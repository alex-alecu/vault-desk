import type { AgentArtifactSummary } from "@vault/shared";
import type { TimelineItem } from "../state.js";
import { Icon } from "./icons.js";

interface TechnicalDetailsProps {
  artifacts: AgentArtifactSummary[];
  open: boolean;
  timeline: TimelineItem[];
  onClose(): void;
}

function isTechnical(item: TimelineItem): boolean {
  return (
    item.kind === "activity" && (item.eventType === "run.started" || item.detail !== undefined)
  );
}

export function TechnicalDetails({ artifacts, open, timeline, onClose }: TechnicalDetailsProps) {
  const details = timeline.filter(isTechnical);
  return open ? (
    <aside aria-label="Technical details" className="technical-details-drawer">
      <header className="technical-details-header">
        <div>
          <h2>Technical details</h2>
          <p>Code, logs, and local task limits</p>
        </div>
        <button aria-label="Close technical details" onClick={onClose} type="button">
          <Icon name="close" />
        </button>
      </header>
      <div className="technical-details-scroll">
        {details.length === 0 && artifacts.length === 0 ? (
          <p className="technical-details-empty">
            Technical details will appear after a task runs.
          </p>
        ) : null}
        {details.map((item) => (
          <article className="technical-details-item" key={item.id}>
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
          <article className="technical-details-item" key={item.id}>
            <span className="activity-label">Generated file</span>
            <p>{item.name}</p>
            <dl className="technical-file-metadata">
              <div>
                <dt>Type</dt>
                <dd>{item.mediaType}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{item.byteLength} bytes</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </aside>
  ) : null;
}
