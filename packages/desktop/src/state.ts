import type {
  ConversationMessage,
  FolderSummary,
  SessionPage,
  SessionSummary,
} from "@vault/shared";
import type { DesktopBootstrap } from "./api.js";

export interface FolderGroup extends FolderSummary {
  sessions: SessionSummary[];
  expanded: boolean;
  nextCursor: string | null;
}

export interface TimelineItem {
  id: string;
  kind: "user" | "assistant" | "activity";
  text: string;
}

export interface DesktopState {
  folders: FolderGroup[];
  globalSessions: SessionSummary[];
  activeSessionId: string | undefined;
  draft: string;
  timeline: TimelineItem[];
  loaded: boolean;
}

export type DesktopAction =
  | { type: "desktop.hydrate"; snapshot: DesktopBootstrap }
  | { type: "folder.add"; folder: FolderSummary }
  | { type: "folder.toggle"; folderId: string }
  | { type: "folder.page"; folderId: string; page: SessionPage }
  | { type: "session.created"; session: SessionSummary }
  | { type: "session.select"; sessionId: string }
  | { type: "messages.load"; sessionId: string; messages: ConversationMessage[] }
  | { type: "message.append"; message: ConversationMessage }
  | { type: "draft.change"; draft: string };

export const initialDesktopState: DesktopState = {
  folders: [],
  globalSessions: [],
  activeSessionId: undefined,
  draft: "",
  timeline: [],
  loaded: false,
};

function hydrate(state: DesktopState, snapshot: DesktopBootstrap): DesktopState {
  const pages = new Map(snapshot.folderSessions.map((item) => [item.folderId, item.page]));
  return {
    ...state,
    loaded: true,
    folders: snapshot.folders.map((folder) => {
      const page = pages.get(folder.id);
      return {
        ...folder,
        sessions: page?.items ?? [],
        nextCursor: page?.nextCursor ?? null,
        expanded: true,
      };
    }),
    globalSessions: snapshot.globalSessions.items,
  };
}

function addFolder(state: DesktopState, folder: FolderSummary): DesktopState {
  if (state.folders.some((item) => item.id === folder.id)) return state;
  return {
    ...state,
    folders: [...state.folders, { ...folder, sessions: [], expanded: true, nextCursor: null }],
  };
}

function addSession(state: DesktopState, session: SessionSummary): DesktopState {
  if (session.folderId === null) {
    return {
      ...state,
      activeSessionId: session.id,
      timeline: [],
      globalSessions: [session, ...state.globalSessions],
    };
  }
  return {
    ...state,
    activeSessionId: session.id,
    timeline: [],
    folders: state.folders.map((folder) =>
      folder.id === session.folderId
        ? { ...folder, expanded: true, sessions: [session, ...folder.sessions] }
        : folder,
    ),
  };
}

function appendFolderPage(state: DesktopState, folderId: string, page: SessionPage): DesktopState {
  return {
    ...state,
    folders: state.folders.map((folder) =>
      folder.id === folderId
        ? {
            ...folder,
            sessions: [
              ...folder.sessions,
              ...page.items.filter(
                (item) => !folder.sessions.some((session) => session.id === item.id),
              ),
            ],
            nextCursor: page.nextCursor,
          }
        : folder,
    ),
  };
}

function appendMessage(state: DesktopState, message: ConversationMessage): DesktopState {
  const timeline = [
    ...state.timeline,
    { id: message.id, kind: message.role, text: message.content } satisfies TimelineItem,
  ];
  const title =
    message.role === "user" ? message.content.replaceAll(/\s+/gu, " ").slice(0, 60) : undefined;
  return {
    ...state,
    draft: "",
    timeline,
    globalSessions: state.globalSessions.map((session) =>
      session.id === message.sessionId && session.title === "New chat" && title !== undefined
        ? { ...session, title }
        : session,
    ),
    folders: state.folders.map((folder) => ({
      ...folder,
      sessions: folder.sessions.map((session) =>
        session.id === message.sessionId && session.title === "New chat" && title !== undefined
          ? { ...session, title }
          : session,
      ),
    })),
  };
}

export function desktopReducer(state: DesktopState, action: DesktopAction): DesktopState {
  if (action.type === "desktop.hydrate") return hydrate(state, action.snapshot);
  if (action.type === "folder.add") return addFolder(state, action.folder);
  if (action.type === "folder.toggle") {
    return {
      ...state,
      folders: state.folders.map((folder) =>
        folder.id === action.folderId ? { ...folder, expanded: !folder.expanded } : folder,
      ),
    };
  }
  if (action.type === "folder.page") return appendFolderPage(state, action.folderId, action.page);
  if (action.type === "session.created") return addSession(state, action.session);
  if (action.type === "session.select") return { ...state, activeSessionId: action.sessionId };
  if (action.type === "messages.load") {
    if (state.activeSessionId !== action.sessionId) return state;
    return {
      ...state,
      timeline: action.messages.map((message) => ({
        id: message.id,
        kind: message.role,
        text: message.content,
      })),
    };
  }
  if (action.type === "message.append") return appendMessage(state, action.message);
  return { ...state, draft: action.draft };
}
