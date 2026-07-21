import { useEffect, useReducer, useState } from "react";
import {
  bootstrapDesktop,
  cancelAgent,
  chooseFiles,
  chooseFolder,
  createSession,
  getAgentRun,
  listAgentRuns,
  listAttachments,
  listMessages,
  listSessions,
  loadDraft,
  removeAttachment,
  revokeFolder,
  saveDraft,
  startAgent,
} from "./api.js";
import { Activity } from "./components/activity.js";
import { Composer } from "./components/composer.js";
import { Conversation } from "./components/conversation.js";
import { Sidebar } from "./components/sidebar.js";
import { retryLocalRequest, waitForAgentRun } from "./run-polling.js";
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
  setError(undefined);
  dispatch({ type: "session.select", sessionId });
  try {
    const [messages, attachments, draft, runs] = await Promise.all([
      listMessages(sessionId),
      listAttachments(sessionId),
      loadDraft(sessionId),
      listAgentRuns(sessionId),
    ]);
    const lastUserMessage = messages.filter((message) => message.role === "user").at(-1);
    dispatch({ type: "messages.load", sessionId, messages });
    dispatch({
      type: "attachments.load",
      sessionId,
      attachments,
      removableIds: attachments
        .filter(
          (item) => lastUserMessage === undefined || item.createdAt > lastUserMessage.createdAt,
        )
        .map((item) => item.id),
    });
    dispatch({ type: "draft.load", sessionId, draft: draft?.content ?? "" });
    for (const snapshot of await Promise.all(runs.map((run) => getAgentRun(run.id)))) {
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

interface SendOptions {
  text: string;
  activeSessionId: string | undefined;
  dispatch: Dispatch;
  setError: SetError;
  setSubmitting(value: boolean): void;
}

async function send({ text, activeSessionId, dispatch, setError, setSubmitting }: SendOptions) {
  setSubmitting(true);
  setError(undefined);
  let started = false;
  try {
    const sessionId = activeSessionId ?? (await startSession(null, dispatch, setError));
    if (sessionId === undefined) return;
    const run = await startAgent(sessionId, text);
    started = true;
    dispatch({ type: "agent.started", run });
    setSubmitting(false);
    try {
      dispatch({
        type: "messages.load",
        sessionId,
        messages: await retryLocalRequest(() => listMessages(sessionId)),
      });
    } catch {
      // The persisted user message is restored with the terminal refresh below.
    }
    await waitForAgentRun({
      runId: run.id,
      read: getAgentRun,
      onSnapshot: (snapshot) => dispatch({ type: "agent.snapshot", snapshot }),
    });
    try {
      dispatch({
        type: "messages.load",
        sessionId,
        messages: await retryLocalRequest(() => listMessages(sessionId)),
      });
    } catch {
      setError("The task completed. Reopen this chat to restore its response.");
    }
  } catch {
    setError(
      started
        ? "The task status could not be refreshed. Reopen this chat to restore the latest result."
        : "The offline task could not be started.",
    );
  } finally {
    setSubmitting(false);
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

async function remove(
  sessionId: string,
  attachmentId: string,
  dispatch: Dispatch,
  setError: SetError,
) {
  setError(undefined);
  try {
    if (await removeAttachment(sessionId, attachmentId)) {
      dispatch({ type: "attachment.remove", attachmentId });
    }
  } catch {
    setError("The attached file could not be removed.");
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
  const [submitting, setSubmitting] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  useEffect(() => {
    void bootstrapDesktop()
      .then((snapshot) => dispatch({ type: "desktop.hydrate", snapshot }))
      .catch(() => setDesktopError("Vault Core could not be started."));
  }, []);
  return (
    <div className="app-shell">
      <Sidebar
        activeSessionId={state.activeSessionId}
        disabled={!state.loaded}
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
      <main aria-busy={!state.loaded} className="workspace">
        <Activity
          artifacts={state.artifacts}
          onClose={() => setActivityOpen(false)}
          onOpen={() => setActivityOpen(true)}
          open={activityOpen}
          timeline={state.timeline}
        />
        {desktopError === undefined ? null : (
          <div className="error-banner" role="alert">
            <span>{desktopError}</span>
            <button
              aria-label="Dismiss error"
              onClick={() => setDesktopError(undefined)}
              type="button"
            >
              ×
            </button>
          </div>
        )}
        <Conversation
          artifacts={state.artifacts}
          ready={state.loaded}
          onSuggestion={(draft) =>
            changeDraft(draft, state.activeSessionId, dispatch, setDesktopError)
          }
          timeline={state.timeline}
        />
        <Composer
          attachments={state.attachments}
          draft={state.draft}
          disabled={!state.loaded}
          onAttach={() => void attach(state.activeSessionId, dispatch, setDesktopError)}
          onCancel={() => {
            if (state.activeRun !== undefined) {
              void cancelAgent(state.activeRun.jobId).catch(() =>
                setDesktopError("The task could not be cancelled."),
              );
            }
          }}
          onChange={(draft) => changeDraft(draft, state.activeSessionId, dispatch, setDesktopError)}
          onRemoveAttachment={(attachmentId) => {
            if (state.activeSessionId !== undefined) {
              void remove(state.activeSessionId, attachmentId, dispatch, setDesktopError);
            }
          }}
          onSend={(text) =>
            void send({
              text,
              activeSessionId: state.activeSessionId,
              dispatch,
              setError: setDesktopError,
              setSubmitting,
            })
          }
          removableAttachmentIds={state.removableAttachmentIds}
          running={
            submitting ||
            state.activeRun?.state === "queued" ||
            state.activeRun?.state === "running"
          }
        />
      </main>
    </div>
  );
}
