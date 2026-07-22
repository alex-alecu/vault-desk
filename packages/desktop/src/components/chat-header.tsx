import type { ModelRuntimeStatus } from "@vault/shared";
import { Icon } from "./icons.js";

interface ChatHeaderProps {
  activityOpen: boolean;
  model: ModelRuntimeStatus;
  onActivityOpen(): void;
  onUnload(): void;
}

const statusText: Record<ModelRuntimeStatus["state"], string> = {
  unsupported: "Not supported on this Mac",
  unloaded: "Loads with your next message",
  loading: "Loading on device",
  busy: "Working on device",
  ready: "Loaded and ready",
};

export function ChatHeader({ activityOpen, model, onActivityOpen, onUnload }: ChatHeaderProps) {
  const modelStatus = model.message ?? statusText[model.state];
  return (
    <header className="chat-header" data-tauri-drag-region="">
      <div className="model-identity">
        <div className="model-copy">
          <div className="model-title-row">
            <strong>{model.name}</strong>
          </div>
          <span className={`model-state model-state-${model.state}`}>
            <i aria-hidden="true" />
            {modelStatus}
          </span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="header-action unload-action"
          disabled={model.state !== "ready"}
          onClick={onUnload}
          title={model.state === "ready" ? "Unload model from memory" : modelStatus}
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
