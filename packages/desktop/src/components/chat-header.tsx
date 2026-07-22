import type { ModelRuntimeStatus } from "@vault/shared";
import { Icon } from "./icons.js";

interface ChatHeaderProps {
  activityOpen: boolean;
  model: ModelRuntimeStatus;
  onActivityOpen(): void;
  onUnload(): void;
}

const statusText: Record<ModelRuntimeStatus["state"], string> = {
  unloaded: "Loads with your next message",
  loading: "Loading on device",
  busy: "Working on device",
  ready: "Loaded and ready",
};

export function ChatHeader({ activityOpen, model, onActivityOpen, onUnload }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="model-identity">
        <div aria-hidden="true" className="model-monogram">
          G4
        </div>
        <div className="model-copy">
          <div className="model-title-row">
            <strong>{model.name}</strong>
            {model.thinkingSupported ? <span className="thinking-badge">Thinking on</span> : null}
          </div>
          <span className={`model-state model-state-${model.state}`}>
            <i aria-hidden="true" />
            {statusText[model.state]}
          </span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="header-action unload-action"
          disabled={model.state !== "ready"}
          onClick={onUnload}
          title={model.state === "ready" ? "Unload model from memory" : statusText[model.state]}
          type="button"
        >
          <Icon name="power" />
          <span>Unload</span>
        </button>
        <button
          aria-label="Open activity and technical details"
          className="header-action activity-action"
          disabled={activityOpen}
          onClick={onActivityOpen}
          title="Activity and technical details"
          type="button"
        >
          <Icon name="activity" />
        </button>
      </div>
    </header>
  );
}
