import type { AttachmentSummary } from "@vault/shared";
import type { FormEvent } from "react";
import { Icon } from "./icons.js";

interface ComposerProps {
  attachments: AttachmentSummary[];
  draft: string;
  running: boolean;
  onAttach(): void;
  onCancel(): void;
  onChange(draft: string): void;
  onSend(text: string): void;
}

export function Composer({
  attachments,
  draft,
  running,
  onAttach,
  onCancel,
  onChange,
  onSend,
}: ComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text.length > 0) onSend(text);
  }

  return (
    <form className="composer" onSubmit={submit}>
      {attachments.length === 0 ? null : (
        <ul aria-label="Attached files" className="attachment-list">
          {attachments.map((item) => (
            <li className="attachment-chip" key={item.id}>
              {item.name}
            </li>
          ))}
        </ul>
      )}
      <textarea
        aria-label="Message"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask Vault Desk to do anything"
        rows={2}
        value={draft}
      />
      <div className="composer-actions">
        <button aria-label="Attach files" className="icon-button" onClick={onAttach} type="button">
          <Icon name="add" />
        </button>
        <span className="model-label">Gemma 4 12B</span>
        {running ? (
          <button aria-label="Cancel task" className="send-button" onClick={onCancel} type="button">
            Stop
          </button>
        ) : (
          <button aria-label="Send message" className="send-button" type="submit">
            <Icon name="send" />
          </button>
        )}
      </div>
    </form>
  );
}
