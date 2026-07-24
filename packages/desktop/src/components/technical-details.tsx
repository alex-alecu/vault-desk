import type { AgentArtifactSummary, AgentExecutionSnapshot } from "@vault/shared";
import { useState } from "react";
import capabilities from "../../../workers/images/agent/capabilities.json" with { type: "json" };
import type { TimelineItem } from "../state.js";
import { Icon } from "./icons.js";
import { selectAdjacentTab } from "./tab-keyboard.js";
import { ExecutionStatus, LogsPanel } from "./technical-logs.js";

export { shouldFollowLog } from "./technical-logs.js";

interface TechnicalDetailsProps {
  artifacts: AgentArtifactSummary[];
  executions: AgentExecutionSnapshot[];
  open: boolean;
  timeline: TimelineItem[];
  onClose(): void;
}

type DrawerTab = "overview" | "logs";

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

function DrawerTabs({ tab, setTab }: { tab: DrawerTab; setTab(tab: DrawerTab): void }) {
  const tabs = ["overview", "logs"] as const;
  return (
    <div aria-label="Technical detail views" className="technical-tabs" role="tablist">
      {tabs.map((item) => (
        <button
          aria-controls={`technical-${item}-panel`}
          aria-selected={tab === item}
          key={item}
          onClick={() => setTab(item)}
          onKeyDown={(event) => selectAdjacentTab(event, item, tabs, setTab)}
          role="tab"
          tabIndex={tab === item ? 0 : -1}
          type="button"
        >
          {item === "overview" ? "Overview" : "Logs"}
        </button>
      ))}
    </div>
  );
}

function Overview({
  artifacts,
  executions,
  timeline,
}: Pick<TechnicalDetailsProps, "artifacts" | "executions" | "timeline">) {
  const limits = timeline.find((item) => item.eventType === "run.started")?.text;
  return (
    <div className="technical-details-scroll" role="tabpanel" id="technical-overview-panel">
      {limits === undefined && executions.length === 0 && artifacts.length === 0 ? (
        <p className="technical-details-empty">Technical details will appear after a task runs.</p>
      ) : null}
      <article className="technical-details-item">
        <p>Certified guest capabilities</p>
        {limits === undefined ? null : <p className="technical-limits">{limits}</p>}
        <details>
          <summary>Show tools and runtimes</summary>
          <pre>{guestCapabilities()}</pre>
        </details>
      </article>
      {executions.map((execution) => (
        <article className="technical-details-item" key={execution.id}>
          <div className="execution-heading">
            <p>
              Execution {execution.sequence + 1} · {execution.language}
            </p>
            <ExecutionStatus execution={execution} />
          </div>
          <p>{execution.path ?? "Guest shell command"}</p>
          <p>
            Termination: {execution.termination ?? "in progress"}
            {execution.exitCode === null ? "" : ` · exit ${execution.exitCode}`}
          </p>
          <details>
            <summary>Show code or command</summary>
            <pre>{execution.source ?? execution.command}</pre>
          </details>
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
  );
}

export function TechnicalDetails(props: TechnicalDetailsProps) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  if (!props.open) return null;
  return (
    <aside aria-label="Technical details" className="technical-details-drawer">
      <header className="technical-details-header">
        <div>
          <h2>Technical details</h2>
          <p>Local limits, execution evidence, and bounded logs</p>
        </div>
        <button aria-label="Close technical details" onClick={props.onClose} type="button">
          <Icon name="close" />
        </button>
      </header>
      <DrawerTabs setTab={setTab} tab={tab} />
      {tab === "overview" ? <Overview {...props} /> : <LogsPanel executions={props.executions} />}
    </aside>
  );
}
