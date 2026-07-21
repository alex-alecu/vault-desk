import type { FolderGroup } from "../state.js";

interface SessionListProps {
  activeSessionId: string | undefined;
  disabled: boolean;
  folder: FolderGroup;
  onNewSession(folderId: string | null): void;
  onSelectSession(sessionId: string): void;
  onShowMore(folderId: string): void;
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
        <button
          aria-current={session.id === props.activeSessionId ? "page" : undefined}
          className="session-row"
          disabled={props.disabled}
          key={session.id}
          onClick={() => props.onSelectSession(session.id)}
          type="button"
        >
          <span>{session.title}</span>
        </button>
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
