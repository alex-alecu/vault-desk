import type { FolderGroup } from "../state.js";

interface SessionListProps {
  activeSessionId: string | undefined;
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
        onClick={() => props.onNewSession(props.folder.id)}
        type="button"
      >
        New conversation
      </button>
      {props.folder.sessions.map((session) => (
        <button
          aria-current={session.id === props.activeSessionId ? "page" : undefined}
          className="session-row"
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
          onClick={() => props.onShowMore(props.folder.id)}
          type="button"
        >
          Show more
        </button>
      )}
    </div>
  );
}
