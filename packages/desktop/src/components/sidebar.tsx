import type { SessionSummary } from "@vault/shared";
import type { Dispatch } from "react";
import type { DesktopAction, FolderGroup } from "../state.js";
import { Icon } from "./icons.js";
import { SessionList } from "./session-list.js";

interface SidebarProps {
  activeSessionId: string | undefined;
  disabled: boolean;
  dispatch: Dispatch<DesktopAction>;
  folders: FolderGroup[];
  globalSessions: SessionSummary[];
  onAddFolder(): void;
  onNewSession(folderId: string | null): void;
  onRevokeFolder(folderId: string): void;
  onSelectSession(sessionId: string): void;
  onShowMore(folderId: string): void;
}

function FolderSection(props: SidebarProps) {
  if (props.folders.length === 0) {
    return <p className="sidebar-empty">Add a folder to start a group of private sessions.</p>;
  }
  return props.folders.map((folder) => (
    <section className="folder-group" key={folder.id}>
      <div className="folder-heading-row">
        <button
          aria-expanded={folder.expanded}
          className="folder-heading"
          disabled={props.disabled}
          onClick={() => props.dispatch({ type: "folder.toggle", folderId: folder.id })}
          type="button"
        >
          <Icon name="chevron" />
          <Icon name="folder" />
          <span>{folder.name}</span>
        </button>
        <button
          aria-label={`Remove ${folder.name}`}
          className="folder-remove"
          disabled={props.disabled}
          onClick={() => props.onRevokeFolder(folder.id)}
          type="button"
        >
          ×
        </button>
      </div>
      {folder.expanded ? (
        <SessionList
          activeSessionId={props.activeSessionId}
          disabled={props.disabled}
          folder={folder}
          onNewSession={props.onNewSession}
          onSelectSession={props.onSelectSession}
          onShowMore={props.onShowMore}
        />
      ) : null}
    </section>
  ));
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">Vault Desk</div>
      <nav aria-label="Workspace navigation">
        <button
          className="nav-action"
          disabled={props.disabled}
          onClick={() => props.onNewSession(null)}
          type="button"
        >
          <Icon name="message" />
          New chat
        </button>
        <button
          className="nav-action"
          disabled={props.disabled}
          onClick={props.onAddFolder}
          type="button"
        >
          <Icon name="add" />
          Add folder
        </button>
      </nav>
      {props.globalSessions.length === 0 ? null : (
        <>
          <h2 className="sidebar-label">Chats</h2>
          <div className="session-list">
            {props.globalSessions.map((session) => (
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
          </div>
        </>
      )}
      <h2 className="sidebar-label">Folders</h2>
      <div className="folder-scroll">
        <FolderSection {...props} />
      </div>
    </aside>
  );
}
