import {
  PROTOCOL_VERSION,
  type RpcRequest,
  RpcRequestSchema,
  type RpcResponse,
} from "@vault/shared";
import type { VaultCore } from "../facade.js";

function failure(
  request: RpcRequest | undefined,
  code: "invalid_request" | "incompatible_version" | "unsupported",
  message: string,
): RpcResponse {
  return {
    jsonrpc: "2.0",
    id: request?.id ?? null,
    error: { code, message },
    protocolVersion: PROTOCOL_VERSION,
  };
}

export async function dispatchRpc(core: VaultCore, input: unknown): Promise<RpcResponse> {
  const parsed = RpcRequestSchema.safeParse(input);
  if (!parsed.success) return failure(undefined, "invalid_request", "Invalid JSON-RPC request.");
  const request = parsed.data;
  if (request.protocolVersion !== PROTOCOL_VERSION) {
    return failure(
      request,
      "incompatible_version",
      `Protocol version ${PROTOCOL_VERSION} required.`,
    );
  }
  if (request.method === "status") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: await core.status(),
      protocolVersion: PROTOCOL_VERSION,
    };
  }
  if (request.method === "jobs.cancel" && typeof request.params.jobId === "string") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { cancelled: await core.cancelJob(request.params.jobId) },
      protocolVersion: PROTOCOL_VERSION,
    };
  }
  return failure(request, "unsupported", `Unsupported method: ${request.method}`);
}
