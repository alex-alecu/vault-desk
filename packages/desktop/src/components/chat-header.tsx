import type { ModelRuntimeStatus } from "@vault/shared";
import { Icon } from "./icons.js";

interface ChatHeaderProps {
  technicalDetailsOpen: boolean;
  model: ModelRuntimeStatus;
  onTechnicalDetailsOpen(): void;
  onUnload(): void;
}

const statusText: Record<ModelRuntimeStatus["state"], string> = {
  unsupported: "Not supported on this Mac",
  unloaded: "Loads with your next message",
  loading: "Loading on device",
  busy: "Working on device",
  ready: "Loaded and ready",
};

export function ChatHeader({
  technicalDetailsOpen,
  model,
  onTechnicalDetailsOpen,
  onUnload,
}: ChatHeaderProps) {
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
          aria-label="Open technical details"
          className="header-action technical-details-action"
          disabled={technicalDetailsOpen}
          onClick={onTechnicalDetailsOpen}
          title="Technical details"
          type="button"
        >
          <Icon name="activity" />
        </button>
      </div>
    </header>
  );
}
