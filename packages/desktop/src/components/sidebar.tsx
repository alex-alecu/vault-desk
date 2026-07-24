import type { SessionSummary } from "@vault/shared";
import type { Dispatch } from "react";
import type { DesktopAction, FolderGroup } from "../state.js";
import { Icon } from "./icons.js";
import { SessionList } from "./session-list.js";
import { SidebarItemRow } from "./sidebar-item-row.js";

interface SidebarProps {
  activeSessionId: string | undefined;
  disabled: boolean;
  dispatch: Dispatch<DesktopAction>;
  folders: FolderGroup[];
  globalSessions: SessionSummary[];
  onAddFolder(): void;
  onNewSession(folderId: string | null): void;
  onOpenFolder(folderId: string): void;
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
      <SidebarItemRow
        deleteLabel={`Remove ${folder.name}`}
        disabled={props.disabled}
        expanded={folder.expanded}
        label={folder.name}
        onDelete={() => props.onRevokeFolder(folder.id)}
        onSelect={() => props.dispatch({ type: "folder.toggle", folderId: folder.id })}
        onStartAction={() => props.onOpenFolder(folder.id)}
        startActionLabel={`Open ${folder.name} folder`}
        startIcon="folder"
      />
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
            <SidebarItemRow
              active={session.id === props.activeSessionId}
              deleteLabel={`Delete ${session.title}`}
              disabled={props.disabled}
              key={session.id}
              label={session.title}
              onDelete={() => props.onDeleteSession(session)}
              onSelect={() => props.onSelectSession(session.id)}
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
          Add folder
        </button>
        <div className="folder-scroll">
          <FolderSection {...props} />
        </div>
      </div>
    </aside>
  );
}
