import type { FormEvent } from "react";
import { Icon } from "./icons.js";

interface ComposerProps {
  draft: string;
  onChange(draft: string): void;
  onSend(text: string): void;
}

export function Composer({ draft, onChange, onSend }: ComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text.length > 0) onSend(text);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        aria-label="Message"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ask Vault Desk to do anything"
        rows={2}
        value={draft}
      />
      <div className="composer-actions">
        <button aria-label="Attach files" className="icon-button" disabled type="button">
          <Icon name="add" />
        </button>
        <span className="model-label">Gemma 4 12B</span>
        <button aria-label="Send message" className="send-button" type="submit">
          <Icon name="send" />
        </button>
      </div>
    </form>
  );
}
