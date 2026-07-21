import type { SessionSummary } from "@vault/shared";
import type { FolderGroup } from "../state.js";
import { Icon } from "./icons.js";

interface SessionListProps {
  activeSessionId: string | undefined;
  disabled: boolean;
  folder: FolderGroup;
  onNewSession(folderId: string | null): void;
  onDeleteSession(session: SessionSummary): void;
  onSelectSession(sessionId: string): void;
  onShowMore(folderId: string): void;
}

interface SessionRowProps {
  activeSessionId: string | undefined;
  disabled: boolean;
  session: SessionSummary;
  onDeleteSession(session: SessionSummary): void;
  onSelectSession(sessionId: string): void;
}

export function SessionRow(props: SessionRowProps) {
  return (
    <div className="session-row-shell">
      <button
        aria-current={props.session.id === props.activeSessionId ? "page" : undefined}
        className="session-row"
        disabled={props.disabled}
        onClick={() => props.onSelectSession(props.session.id)}
        type="button"
      >
        <span title={props.session.title}>{props.session.title}</span>
      </button>
      <button
        aria-label={`Delete ${props.session.title}`}
        className="session-delete"
        disabled={props.disabled}
        onClick={() => props.onDeleteSession(props.session)}
        type="button"
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}

export function SessionList(props: SessionListProps) {
  return (
    <div className="session-list">
      <button
        className="new-folder-session"
        disabled={props.disabled}
        onClick={() => props.onNewSession(props.folder.id)}
        type="button"
      >
        New conversation
      </button>
      {props.folder.sessions.map((session) => (
        <SessionRow
          activeSessionId={props.activeSessionId}
          disabled={props.disabled}
          key={session.id}
          onDeleteSession={props.onDeleteSession}
          onSelectSession={props.onSelectSession}
          session={session}
        />
      ))}
      {props.folder.nextCursor === null ? null : (
        <button
          className="show-more"
          disabled={props.disabled}
          onClick={() => props.onShowMore(props.folder.id)}
          type="button"
        >
          Show more
        </button>
      )}
    </div>
  );
}
