import {
  type ErrorCode,
  FolderIdSchema,
  MessageRoleSchema,
  PROTOCOL_VERSION,
  type RpcRequest,
  RpcRequestSchema,
  type RpcResponse,
  SessionIdSchema,
} from "@vault/shared";
import type { VaultCore } from "../facade.js";

function failure(request: RpcRequest | undefined, code: ErrorCode, message: string): RpcResponse {
  return {
    jsonrpc: "2.0",
    id: request?.id ?? null,
    error: { code, message },
    protocolVersion: PROTOCOL_VERSION,
  };
}

function executionFailure(request: RpcRequest, error: unknown): RpcResponse {
  const message = error instanceof Error ? error.message : "";
  if (message === "folder_not_found" || message === "session_not_found") {
    return failure(request, "not_found", "The requested record was not found.");
  }
  if (message === "folder_grant_invalid") {
    return failure(request, "path_out_of_scope", "The selected folder is not available.");
  }
  if (message.startsWith("invalid_") || (error instanceof Error && error.name === "ZodError")) {
    return failure(request, "invalid_request", "The request parameters are invalid.");
  }
  return failure(request, "internal", "The request could not be completed.");
}

function success(request: RpcRequest, result: unknown): RpcResponse {
  return { jsonrpc: "2.0", id: request.id, result, protocolVersion: PROTOCOL_VERSION };
}

function nullableFolderId(value: unknown): string | null | undefined {
  if (value === null) return null;
  const parsed = FolderIdSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

async function addFolder(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  const path = request.params.rootPath;
  if (typeof path !== "string") return failure(request, "invalid_request", "Invalid folder path.");
  return success(request, await core.addFolder(path));
}

async function createSession(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  const folderId = nullableFolderId(request.params.folderId);
  if (folderId === undefined) return failure(request, "invalid_request", "Invalid folder id.");
  return success(request, await core.createSession(folderId));
}

async function listSessions(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  const folderId = nullableFolderId(request.params.folderId);
  if (folderId === undefined) return failure(request, "invalid_request", "Invalid folder id.");
  const { cursor, limit } = request.params;
  if (cursor !== undefined && typeof cursor !== "string") {
    return failure(request, "invalid_request", "Invalid session cursor.");
  }
  if (limit !== undefined && typeof limit !== "number") {
    return failure(request, "invalid_request", "Invalid page limit.");
  }
  return success(request, await core.listSessions(folderId, cursor, limit));
}

async function appendMessage(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  const sessionId = SessionIdSchema.safeParse(request.params.sessionId);
  const role = MessageRoleSchema.safeParse(request.params.role);
  const { content } = request.params;
  if (!sessionId.success || !role.success || typeof content !== "string") {
    return failure(request, "invalid_request", "Invalid message.");
  }
  return success(request, await core.appendMessage(sessionId.data, role.data, content));
}

async function listMessages(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  const sessionId = SessionIdSchema.safeParse(request.params.sessionId);
  if (!sessionId.success) return failure(request, "invalid_request", "Invalid session id.");
  return success(request, await core.listMessages(sessionId.data));
}

async function cancelJob(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  const { jobId } = request.params;
  if (typeof jobId !== "string") return failure(request, "invalid_request", "Invalid job id.");
  return success(request, { cancelled: await core.cancelJob(jobId) });
}

async function dispatchMethod(core: VaultCore, request: RpcRequest): Promise<RpcResponse> {
  switch (request.method) {
    case "status":
      return success(request, await core.status());
    case "folders.add":
      return addFolder(core, request);
    case "folders.list":
      return success(request, await core.listFolders());
    case "sessions.create":
      return createSession(core, request);
    case "sessions.list":
      return listSessions(core, request);
    case "messages.append":
      return appendMessage(core, request);
    case "messages.list":
      return listMessages(core, request);
    case "jobs.cancel":
      return cancelJob(core, request);
    default:
      return failure(request, "unsupported", `Unsupported method: ${request.method}`);
  }
}

export async function dispatchRpc(core: VaultCore, input: unknown): Promise<RpcResponse> {
  const parsed = RpcRequestSchema.safeParse(input);
  if (!parsed.success) return failure(undefined, "invalid_request", "Invalid JSON-RPC request.");
  if (parsed.data.protocolVersion !== PROTOCOL_VERSION) {
    return failure(
      parsed.data,
      "incompatible_version",
      `Protocol version ${PROTOCOL_VERSION} required.`,
    );
  }
  try {
    return await dispatchMethod(core, parsed.data);
  } catch (error) {
    return executionFailure(parsed.data, error);
  }
}
