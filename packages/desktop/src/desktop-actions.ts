import {
  chooseFiles,
  chooseFolder,
  createSession,
  deleteSession,
  getAgentRun,
  listAgentRuns,
  listAttachments,
  listMessages,
  listSessions,
  loadDraft,
  removeAttachment,
  saveDraft,
  startAgent,
} from "./api.js";
import { retryLocalRequest, waitForAgentRun } from "./run-polling.js";
import type { DesktopAction } from "./state.js";

type Dispatch = (action: DesktopAction) => void;
type SetError = (message: string | undefined) => void;

export async function addFolder(dispatch: Dispatch, setError: SetError) {
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

export async function selectSession(sessionId: string, dispatch: Dispatch, setError: SetError) {
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

export async function deleteConversation(
  sessionId: string,
  dispatch: Dispatch,
  setError: SetError,
) {
  setError(undefined);
  try {
    if (await deleteSession(sessionId)) dispatch({ type: "session.deleted", sessionId });
  } catch {
    setError("Stop the conversation if it is running, then try deleting it again.");
  }
}

export async function showMore(
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
  newSessionFolderId: string | null | undefined;
  dispatch: Dispatch;
  setError: SetError;
  setSubmitting(value: boolean): void;
}

export async function send(options: SendOptions) {
  const { text, activeSessionId, newSessionFolderId, dispatch, setError, setSubmitting } = options;
  setSubmitting(true);
  setError(undefined);
  let started = false;
  try {
    const sessionId =
      activeSessionId ?? (await startSession(newSessionFolderId ?? null, dispatch, setError));
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

export async function attach(
  activeSessionId: string | undefined,
  newSessionFolderId: string | null | undefined,
  dispatch: Dispatch,
  setError: SetError,
) {
  const sessionId =
    activeSessionId ?? (await startSession(newSessionFolderId ?? null, dispatch, setError));
  if (sessionId === undefined) return;
  try {
    const attachments = await chooseFiles(sessionId);
    if (attachments.length > 0) dispatch({ type: "attachments.add", attachments });
  } catch {
    setError("The selected files could not be attached.");
  }
}

export async function remove(
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

export function changeDraft(
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
