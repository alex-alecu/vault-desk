import type { AttachmentSummary } from "@vault/shared";
import type { FormEvent } from "react";
import { Icon } from "./icons.js";

interface ComposerProps {
  attachments: AttachmentSummary[];
  disabled: boolean;
  draft: string;
  removableAttachmentIds: string[];
  running: boolean;
  onAttach(): void;
  onCancel(): void;
  onChange(draft: string): void;
  onRemoveAttachment(attachmentId: string): void;
  onSend(text: string): void;
}

function AttachmentList({
  attachments,
  removableAttachmentIds,
  onRemoveAttachment,
}: Pick<ComposerProps, "attachments" | "removableAttachmentIds" | "onRemoveAttachment">) {
  if (attachments.length === 0) return null;
  return (
    <ul aria-label="Attached files" className="attachment-list">
      {attachments.map((item) => (
        <li className="attachment-chip" key={item.id}>
          <span>{item.name}</span>
          {removableAttachmentIds.includes(item.id) ? (
            <button
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemoveAttachment(item.id)}
              type="button"
            >
              ×
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Composer({
  attachments,
  disabled,
  draft,
  removableAttachmentIds,
  running,
  onAttach,
  onCancel,
  onChange,
  onRemoveAttachment,
  onSend,
}: ComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text.length > 0) onSend(text);
  }

  const canSend = !disabled && !running && draft.trim().length > 0;

  return (
    <form className="composer" onSubmit={submit}>
      <AttachmentList
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
        removableAttachmentIds={removableAttachmentIds}
      />
      <textarea
        aria-label="Message"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask Vault Desk to do anything"
        rows={2}
        value={draft}
      />
      <div className="composer-actions">
        <button
          aria-label="Attach files"
          className="icon-button"
          disabled={disabled || running}
          onClick={onAttach}
          type="button"
        >
          <Icon name="add" />
        </button>
        {running ? (
          <button
            aria-label="Cancel task"
            className="stop-button"
            disabled={disabled}
            onClick={onCancel}
            type="button"
          >
            Stop
          </button>
        ) : (
          <button
            aria-label="Send message"
            className="send-button"
            disabled={!canSend}
            type="submit"
          >
            <Icon name="send" />
          </button>
        )}
      </div>
    </form>
  );
}
