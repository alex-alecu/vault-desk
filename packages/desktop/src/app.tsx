import { useEffect, useReducer, useState } from "react";
import {
  appendUserMessage,
  bootstrapDesktop,
  chooseFolder,
  createSession,
  listMessages,
  listSessions,
} from "./api.js";
import { Composer } from "./components/composer.js";
import { Conversation } from "./components/conversation.js";
import { Sidebar } from "./components/sidebar.js";
import { type DesktopAction, desktopReducer, initialDesktopState } from "./state.js";

type Dispatch = (action: DesktopAction) => void;
type SetError = (message: string | undefined) => void;

async function addFolder(dispatch: Dispatch, setError: SetError) {
  setError(undefined);
  try {
    const folder = await chooseFolder();
    if (folder !== undefined) dispatch({ type: "folder.add", folder });
  } catch {
    setError("The selected folder could not be added.");
  }
}

async function startSession(folderId: string | null, dispatch: Dispatch, setError: SetError) {
  setError(undefined);
  try {
    const session = await createSession(folderId);
    dispatch({ type: "session.created", session });
    return session.id;
  } catch {
    setError("The conversation could not be created.");
    return undefined;
  }
}

async function selectSession(sessionId: string, dispatch: Dispatch, setError: SetError) {
  dispatch({ type: "session.select", sessionId });
  try {
    dispatch({ type: "messages.load", sessionId, messages: await listMessages(sessionId) });
  } catch {
    setError("The conversation could not be loaded.");
  }
}

async function showMore(
  folderId: string,
  cursor: string | null,
  dispatch: Dispatch,
  setError: SetError,
) {
  if (cursor === null) return;
  try {
    const page = await listSessions(folderId, cursor);
    dispatch({ type: "folder.page", folderId, page });
  } catch {
    setError("More conversations could not be loaded.");
  }
}

async function send(
  text: string,
  activeSessionId: string | undefined,
  dispatch: Dispatch,
  setError: SetError,
) {
  const sessionId = activeSessionId ?? (await startSession(null, dispatch, setError));
  if (sessionId === undefined) return;
  try {
    const message = await appendUserMessage(sessionId, text);
    dispatch({ type: "message.append", message });
  } catch {
    setError("The message could not be saved.");
  }
}

export function App() {
  const [state, dispatch] = useReducer(desktopReducer, initialDesktopState);
  const [desktopError, setDesktopError] = useState<string>();
  useEffect(() => {
    void bootstrapDesktop()
      .then((snapshot) => dispatch({ type: "desktop.hydrate", snapshot }))
      .catch(() => setDesktopError("Vault Core could not be started."));
  }, []);
  return (
    <div className="app-shell">
      <Sidebar
        activeSessionId={state.activeSessionId}
        dispatch={dispatch}
        folders={state.folders}
        globalSessions={state.globalSessions}
        onAddFolder={() => void addFolder(dispatch, setDesktopError)}
        onNewSession={(folderId) => void startSession(folderId, dispatch, setDesktopError)}
        onSelectSession={(sessionId) => void selectSession(sessionId, dispatch, setDesktopError)}
        onShowMore={(folderId) =>
          void showMore(
            folderId,
            state.folders.find((folder) => folder.id === folderId)?.nextCursor ?? null,
            dispatch,
            setDesktopError,
          )
        }
      />
      <main className="workspace">
        {desktopError === undefined ? null : <div className="error-banner">{desktopError}</div>}
        <Conversation timeline={state.timeline} />
        <Composer
          draft={state.draft}
          onChange={(draft) => dispatch({ type: "draft.change", draft })}
          onSend={(text) => void send(text, state.activeSessionId, dispatch, setDesktopError)}
        />
      </main>
    </div>
  );
}
