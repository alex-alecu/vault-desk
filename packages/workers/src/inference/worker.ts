import type {
  EmbeddingRequest,
  InferenceWorkerRequest,
  InferenceWorkerResponse,
  RequestId,
  StructuredGenerationRequest,
} from "@vault/shared";
import type { Llama, LlamaModel } from "node-llama-cpp";
import { encodeInferenceResponse, readInferenceRequest } from "./frames.js";

function argument(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (required && (index === -1 || value === undefined)) throw new Error(`Missing ${name}.`);
  return value;
}

function failure(requestId: RequestId, error: unknown): InferenceWorkerResponse {
  const text = error instanceof Error ? error.message : String(error);
  const code = /memory|allocation|out of memory/iu.test(text) ? "out_of_memory" : "internal";
  return {
    protocolVersion: 1,
    requestId,
    status: "error",
    error: { code, message: text },
  };
}

async function operationDenied(operation: () => Promise<unknown>): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch {
    return true;
  }
}

async function probe(request: InferenceWorkerRequest): Promise<InferenceWorkerResponse> {
  if (request.operation !== "probe") throw new Error("Invalid probe request.");
  const { spawnSync } = await import("node:child_process");
  const { readFile, writeFile } = await import("node:fs/promises");
  const networkDenied = await operationDenied(() =>
    fetch("https://example.com", { signal: AbortSignal.timeout(1_000) }),
  );
  const credentialEnvironmentAbsent = Object.keys(process.env).every(
    (name) => !/TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY/iu.test(name),
  );
  const workspaceDenied = await operationDenied(() => readFile(request.authorityProbePath));
  const outOfScopeReadDenied = await operationDenied(() => readFile(request.outOfScopeReadPath));
  const outOfScopeWriteDenied = await operationDenied(() =>
    writeFile(request.outOfScopeWritePath, "denial probe", { flag: "wx" }),
  );
  const executableToolsDenied = spawnSync("/bin/sh", ["-c", "exit 0"]).status !== 0;
  const nodeReexecDenied = spawnSync(process.execPath, ["-e", "process.exit(0)"]).status !== 0;
  if (
    !networkDenied ||
    !credentialEnvironmentAbsent ||
    process.env.SHELL !== undefined ||
    !workspaceDenied ||
    !outOfScopeReadDenied ||
    !outOfScopeWriteDenied ||
    !executableToolsDenied ||
    !nodeReexecDenied
  ) {
    throw new Error("native_worker_authority_probe_failed");
  }
  return {
    protocolVersion: 1,
    requestId: request.requestId,
    status: "ok",
    operation: "probe",
    networkDenied: true,
    credentialEnvironmentAbsent: true,
    shellEnvironmentAbsent: true,
    workspaceDenied: true,
    outOfScopeReadDenied: true,
    outOfScopeWriteDenied: true,
    executableToolsDenied: true,
    nodeReexecDenied: true,
  };
}

async function embed(
  request: EmbeddingRequest,
  llama: Llama,
  model: LlamaModel,
  budget: number,
): Promise<InferenceWorkerResponse> {
  const context = await model.createEmbeddingContext({ contextSize: request.contextSize });
  const embedding = await context.getEmbeddingFor(request.input);
  const memory = await llama.getLlamaMemoryUsage();
  return {
    protocolVersion: 1,
    requestId: request.requestId,
    status: "ok",
    operation: "embed",
    vector: Array.from(embedding.vector),
    memory: { cpuRamBytes: memory.cpuRam, gpuVramBytes: memory.gpuVram, budgetBytes: budget },
  };
}

async function generate(
  request: StructuredGenerationRequest,
  llama: Llama,
  model: LlamaModel,
  budget: number,
): Promise<InferenceWorkerResponse> {
  const { LlamaChatSession } = await import("node-llama-cpp");
  const context = await model.createContext({ contextSize: request.contextSize });
  const grammar = await llama.createGrammarForJsonSchema(request.jsonSchema as never);
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });
  const output = await session.prompt(request.prompt, {
    grammar,
    maxTokens: request.maxTokens,
    temperature: 0,
  });
  const memory = await llama.getLlamaMemoryUsage();
  return {
    protocolVersion: 1,
    requestId: request.requestId,
    status: "ok",
    operation: "generate",
    value: grammar.parse(output),
    memory: { cpuRamBytes: memory.cpuRam, gpuVramBytes: memory.gpuVram, budgetBytes: budget },
  };
}

async function infer(request: InferenceWorkerRequest): Promise<InferenceWorkerResponse> {
  if (request.operation === "probe") return probe(request);
  const modelPath = argument("--model");
  const budget = Number(argument("--memory-budget"));
  if (modelPath === undefined || !Number.isSafeInteger(budget) || budget <= 0) {
    throw new Error("Invalid worker launch arguments.");
  }
  const { getLlama, LlamaLogLevel } = await import("node-llama-cpp");
  const llama = await getLlama({ logLevel: LlamaLogLevel.error });
  const vram = await llama.getVramState();
  if (vram.unifiedSize > 0) await llama.setVramCap(budget);
  else await llama.setRamCap(budget);
  const model = await llama.loadModel({ modelPath });
  // This worker serves exactly one request. Native resources remain process-scoped and are
  // reclaimed by its normal exit after stdout flushes, avoiding unsafe partial native teardown.
  return request.operation === "embed"
    ? await embed(request, llama, model, budget)
    : await generate(request, llama, model, budget);
}

let requestId: RequestId = "00000000-0000-4000-8000-000000000000";
try {
  const request = await readInferenceRequest();
  requestId = request.requestId;
  process.stdout.write(encodeInferenceResponse(await infer(request)));
} catch (error) {
  process.stdout.write(encodeInferenceResponse(failure(requestId, error)));
}
