import type { AgentArtifactSummary } from "@vault/shared";
import capabilities from "../../../workers/images/agent/capabilities.json" with { type: "json" };
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

function guestCapabilities(): string {
  const runtimes = Object.entries(capabilities.runtimes).map(
    ([name, version]) => `${name}: ${version}`,
  );
  return [
    `Source: ${capabilities.sourceMount.path} (${capabilities.sourceMount.mode}, live)`,
    `Workspace: ${capabilities.workspaceMount.path} (${capabilities.workspaceMount.maximumBytes} bytes)`,
    `Temporary runtime: ${capabilities.runtimeMount.path} (${capabilities.runtimeMount.maximumBytes} bytes, ephemeral)`,
    `Shell: ${capabilities.shell}`,
    "Runtimes:",
    ...runtimes,
    "Executables:",
    ...capabilities.executables,
  ].join("\n");
}

export function TechnicalDetails({ artifacts, open, timeline, onClose }: TechnicalDetailsProps) {
  const details = timeline.filter(isTechnical);
  return open ? (
    <aside aria-label="Technical details" className="technical-details-drawer">
      <header className="technical-details-header">
        <div>
          <h2>Technical details</h2>
          <p>Code, commands, logs, local limits, and generated files</p>
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
        <article className="technical-details-item">
          <p>Certified guest capabilities</p>
          <details>
            <summary>Show tools and runtimes</summary>
            <pre>{guestCapabilities()}</pre>
          </details>
        </article>
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
