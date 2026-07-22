import type { SessionSummary } from "@vault/shared";
import type { Dispatch } from "react";
import type { DesktopAction, FolderGroup } from "../state.js";
import { Icon } from "./icons.js";
import { SessionList, SessionRow } from "./session-list.js";

interface SidebarProps {
  activeSessionId: string | undefined;
  disabled: boolean;
  dispatch: Dispatch<DesktopAction>;
  folders: FolderGroup[];
  globalSessions: SessionSummary[];
  onAddFolder(): void;
  onNewSession(folderId: string | null): void;
  onDeleteSession(session: SessionSummary): void;
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
          onDeleteSession={props.onDeleteSession}
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
      <div aria-hidden="true" className="window-drag-region" data-tauri-drag-region="" />
      <div className="brand">Vault Desk</div>
      <div className="sidebar-content">
        <h2 className="sidebar-label">Chats</h2>
        <button
          className="nav-action"
          disabled={props.disabled}
          onClick={() => props.onNewSession(null)}
          type="button"
        >
          <Icon name="message" />
          New chat
        </button>
        <div className="session-list global-session-list">
          {props.globalSessions.map((session) => (
            <SessionRow
              activeSessionId={props.activeSessionId}
              disabled={props.disabled}
              key={session.id}
              onDeleteSession={props.onDeleteSession}
              onSelectSession={props.onSelectSession}
              session={session}
            />
          ))}
        </div>
        <h2 className="sidebar-label">Folders</h2>
        <button
          className="nav-action"
          disabled={props.disabled}
          onClick={props.onAddFolder}
          type="button"
        >
          <Icon name="add" />
          New folder
        </button>
        <div className="folder-scroll">
          <FolderSection {...props} />
        </div>
      </div>
    </aside>
  );
}
