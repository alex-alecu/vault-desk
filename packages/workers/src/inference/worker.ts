import type {
  EmbeddingRequest,
  InferenceWorkerMessage,
  InferenceWorkerRequest,
  InferenceWorkerResponse,
  RequestId,
  StructuredGenerationRequest,
} from "@vault/shared";
import type { Llama, LlamaChatSession, LlamaEmbeddingContext, LlamaModel } from "node-llama-cpp";
import {
  encodeInferenceMessage,
  encodeInferenceResponse,
  InferenceRequestDecoder,
} from "./frames.js";
import { probe } from "./probe.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index === -1 || value === undefined) throw new Error(`Missing ${name}.`);
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

async function embed(
  request: EmbeddingRequest,
  runtime: LoadedRuntime,
): Promise<InferenceWorkerResponse> {
  runtime.embedding ??= {
    contextSize: request.contextSize,
    context: await runtime.model.createEmbeddingContext({ contextSize: request.contextSize }),
  };
  if (runtime.embedding.contextSize !== request.contextSize) {
    throw new Error("worker_context_size_change_unsupported");
  }
  const embedding = await runtime.embedding.context.getEmbeddingFor(request.input);
  const memory = await runtime.llama.getLlamaMemoryUsage();
  return {
    protocolVersion: 1,
    requestId: request.requestId,
    status: "ok",
    operation: "embed",
    vector: Array.from(embedding.vector),
    memory: {
      cpuRamBytes: memory.cpuRam,
      gpuVramBytes: memory.gpuVram,
      budgetBytes: runtime.budget,
    },
  };
}

interface LoadedRuntime {
  budget: number;
  llama: Llama;
  model: LlamaModel;
  generation?: { contextSize: number; session: LlamaChatSession };
  embedding?: { contextSize: number; context: LlamaEmbeddingContext };
}

let loadedRuntime: Promise<LoadedRuntime> | undefined;

async function runtime(): Promise<LoadedRuntime> {
  loadedRuntime ??= (async () => {
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
    return { budget, llama, model: await llama.loadModel({ modelPath }) };
  })();
  return loadedRuntime;
}

async function generationSession(request: StructuredGenerationRequest, runtime: LoadedRuntime) {
  if (runtime.generation === undefined) {
    const { Gemma4ChatWrapper, LlamaChatSession } = await import("node-llama-cpp");
    const context = await runtime.model.createContext({ contextSize: request.contextSize });
    runtime.generation = {
      contextSize: request.contextSize,
      session: new LlamaChatSession({
        contextSequence: context.getSequence(),
        ...(request.modelId.startsWith("gemma-4")
          ? { chatWrapper: new Gemma4ChatWrapper({ reasoning: true }) }
          : {}),
      }),
    };
  }
  if (runtime.generation.contextSize !== request.contextSize) {
    throw new Error("worker_context_size_change_unsupported");
  }
  runtime.generation.session.resetChatHistory();
  return runtime.generation.session;
}

function performanceReport(input: {
  initial: { usedInputTokens: number; usedOutputTokens: number };
  final: { usedInputTokens: number; usedOutputTokens: number };
  startedAt: number;
  firstTokenAt: number | undefined;
  completedAt: number;
}) {
  const generationStartedAt = input.firstTokenAt ?? input.completedAt;
  return {
    promptTokens: input.final.usedInputTokens - input.initial.usedInputTokens,
    outputTokens: input.final.usedOutputTokens - input.initial.usedOutputTokens,
    promptDurationMs: Math.max(0, Math.round(generationStartedAt - input.startedAt)),
    generationDurationMs: Math.max(0, Math.round(input.completedAt - generationStartedAt)),
    totalDurationMs: Math.max(0, Math.round(input.completedAt - input.startedAt)),
  };
}

async function generate(
  request: StructuredGenerationRequest,
  runtime: LoadedRuntime,
  emit: (message: InferenceWorkerMessage) => void,
): Promise<InferenceWorkerResponse> {
  const session = await generationSession(request, runtime);
  const grammar = await runtime.llama.createGrammarForJsonSchema(request.jsonSchema as never);
  const initialMeter = session.sequence.tokenMeter.getState();
  const startedAt = performance.now();
  let firstTokenAt: number | undefined;
  const output = await session.prompt(request.prompt, {
    grammar,
    maxTokens: request.maxTokens,
    temperature: 0,
    ...(request.modelId.startsWith("gemma-4")
      ? { budgets: { thoughtTokens: Math.min(384, Math.floor(request.maxTokens / 2)) } }
      : {}),
    onResponseChunk(chunk) {
      if (chunk.tokens.length > 0) firstTokenAt ??= performance.now();
      if (chunk.type === "segment" && chunk.segmentType === "thought" && chunk.text.length > 0) {
        emit({
          protocolVersion: 1,
          requestId: request.requestId,
          status: "stream",
          event: "thinking.delta",
          text: chunk.text,
        });
      }
    },
  });
  const completedAt = performance.now();
  const finalMeter = session.sequence.tokenMeter.getState();
  const memory = await runtime.llama.getLlamaMemoryUsage();
  return {
    protocolVersion: 1,
    requestId: request.requestId,
    status: "ok",
    operation: "generate",
    value: grammar.parse(output),
    memory: {
      cpuRamBytes: memory.cpuRam,
      gpuVramBytes: memory.gpuVram,
      budgetBytes: runtime.budget,
    },
    performance: performanceReport({
      initial: initialMeter,
      final: finalMeter,
      startedAt,
      firstTokenAt,
      completedAt,
    }),
  };
}

async function infer(
  request: InferenceWorkerRequest,
  emit: (message: InferenceWorkerMessage) => void,
): Promise<InferenceWorkerResponse> {
  if (request.operation === "probe") return probe(request);
  const loaded = await runtime();
  // Native resources remain process-scoped. Manual unload terminates this worker so the OS
  // reclaims the model and contexts together instead of relying on unsafe partial teardown.
  return request.operation === "embed"
    ? await embed(request, loaded)
    : await generate(request, loaded, emit);
}

let requestId: RequestId = "00000000-0000-4000-8000-000000000000";
const decoder = new InferenceRequestDecoder();
const emit = (message: InferenceWorkerMessage) =>
  process.stdout.write(encodeInferenceMessage(message));
try {
  for await (const chunk of process.stdin) {
    for (const request of decoder.push(Buffer.from(chunk))) {
      requestId = request.requestId;
      try {
        process.stdout.write(encodeInferenceResponse(await infer(request, emit)));
      } catch (error) {
        process.stdout.write(encodeInferenceResponse(failure(requestId, error)));
      }
    }
  }
  decoder.finish();
} catch (error) {
  process.stdout.write(encodeInferenceResponse(failure(requestId, error)));
}
