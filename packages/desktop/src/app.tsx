import { useEffect, useReducer, useState } from "react";
import {
  bootstrapDesktop,
  cancelAgent,
  chooseFiles,
  chooseFolder,
  createSession,
  getAgentRun,
  listAttachments,
  listMessages,
  listSessions,
  loadDraft,
  revokeFolder,
  saveDraft,
  startAgent,
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
    if (folderId !== null) {
      dispatch({ type: "folder.refresh", folderId, page: await listSessions(folderId) });
    }
    return session.id;
  } catch {
    setError("The conversation could not be created.");
    return undefined;
  }
}

async function selectSession(sessionId: string, dispatch: Dispatch, setError: SetError) {
  dispatch({ type: "session.select", sessionId });
  try {
    const [messages, attachments, draft] = await Promise.all([
      listMessages(sessionId),
      listAttachments(sessionId),
      loadDraft(sessionId),
    ]);
    dispatch({ type: "messages.load", sessionId, messages });
    dispatch({ type: "attachments.load", sessionId, attachments });
    dispatch({ type: "draft.load", sessionId, draft: draft?.content ?? "" });
    const runIds = messages.flatMap((message) => (message.runId === null ? [] : [message.runId]));
    for (const snapshot of await Promise.all(runIds.map((runId) => getAgentRun(runId)))) {
      dispatch({ type: "agent.snapshot", snapshot });
    }
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
    const run = await startAgent(sessionId, text);
    dispatch({ type: "agent.started", run });
    dispatch({ type: "messages.load", sessionId, messages: await listMessages(sessionId) });
    while (true) {
      const snapshot = await getAgentRun(run.id);
      dispatch({ type: "agent.snapshot", snapshot });
      if (snapshot.run.state !== "queued" && snapshot.run.state !== "running") break;
      await new Promise((accept) => setTimeout(accept, 350));
    }
    dispatch({ type: "messages.load", sessionId, messages: await listMessages(sessionId) });
  } catch {
    setError("The offline task could not be completed.");
  }
}

async function attach(activeSessionId: string | undefined, dispatch: Dispatch, setError: SetError) {
  const sessionId = activeSessionId ?? (await startSession(null, dispatch, setError));
  if (sessionId === undefined) return;
  try {
    const attachments = await chooseFiles(sessionId);
    if (attachments.length > 0) dispatch({ type: "attachments.add", attachments });
  } catch {
    setError("The selected files could not be attached.");
  }
}

function changeDraft(
  draft: string,
  sessionId: string | undefined,
  dispatch: Dispatch,
  setError: SetError,
) {
  dispatch({ type: "draft.change", draft });
  if (sessionId !== undefined) {
    void saveDraft(sessionId, draft).catch(() => setError("The draft could not be saved."));
  }
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: this is the single view-composition boundary; workflow logic remains in the small helpers above.
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
        onRevokeFolder={(folderId) => {
          void revokeFolder(folderId)
            .then((revoked) => {
              if (revoked) dispatch({ type: "folder.revoked", folderId });
            })
            .catch(() => setDesktopError("The folder grant could not be removed."));
        }}
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
        <Conversation
          artifacts={state.artifacts}
          onSuggestion={(draft) =>
            changeDraft(draft, state.activeSessionId, dispatch, setDesktopError)
          }
          timeline={state.timeline}
        />
        <Composer
          attachments={state.attachments}
          draft={state.draft}
          onAttach={() => void attach(state.activeSessionId, dispatch, setDesktopError)}
          onCancel={() => {
            if (state.activeRun !== undefined) void cancelAgent(state.activeRun.jobId);
          }}
          onChange={(draft) => changeDraft(draft, state.activeSessionId, dispatch, setDesktopError)}
          onSend={(text) => void send(text, state.activeSessionId, dispatch, setDesktopError)}
          running={state.activeRun?.state === "queued" || state.activeRun?.state === "running"}
        />
      </main>
    </div>
  );
}
