import {
  type AgentDecision,
  type AgentEventDetail,
  type AgentEventType,
  type AgentExecutionResult,
  AgentExecutionResultSchema,
  type AgentRunResult,
  AgentRunResultSchema,
  type InferencePerformance,
} from "@vault/shared";
import type { AgentSessionExecution } from "@vault/workers";
import type { InferenceService } from "../runtime/inference.js";
import {
  type AgentProgress,
  type AgentPromptInput,
  executionBackedResponse,
  generationInput,
  MAX_EXECUTIONS,
  parseDecision,
} from "./prompt.js";

const MAX_DECISIONS = 12;

export interface AgentExecutor {
  execute(input: AgentSessionExecution, signal?: AbortSignal): Promise<AgentExecutionResult>;
}

export interface AgentRunInput extends AgentPromptInput {
  onEvent?(type: AgentEventType, summary: string, detail?: Partial<AgentEventDetail>): void;
  onThinking?(text: string | null): void;
  signal?: AbortSignal;
}

function emptyPerformance(): InferencePerformance {
  return {
    promptTokens: 0,
    outputTokens: 0,
    promptDurationMs: 0,
    generationDurationMs: 0,
    totalDurationMs: 0,
  };
}

function addPerformance(total: InferencePerformance, next: InferencePerformance): void {
  total.promptTokens += next.promptTokens;
  total.outputTokens += next.outputTokens;
  total.promptDurationMs += next.promptDurationMs;
  total.generationDurationMs += next.generationDurationMs;
  total.totalDurationMs += next.totalDurationMs;
}

export class AgentLoop {
  private contextTokens: number;
  constructor(
    private readonly inference: Pick<InferenceService, "generate">,
    private readonly executor: AgentExecutor,
    contextTokens = 8_192,
  ) {
    this.contextTokens = Math.max(8_192, contextTokens);
  }

  private async decide(
    input: AgentRunInput,
    progress: AgentProgress,
    finalResponse = false,
  ): Promise<AgentDecision> {
    const { executions, inference } = progress;
    input.onEvent?.(
      "inference.started",
      finalResponse
        ? "Preparing the final response."
        : executions.length === 0
          ? "Loading the local model and planning the task."
          : `Planning step ${executions.length + 1}.`,
    );
    let thinking = "";
    input.onThinking?.(null);
    const generated = await this.inference.generate(
      generationInput(input, progress, finalResponse, this.contextTokens),
      input.signal,
      (delta) => {
        thinking = `${thinking}${delta}`.slice(-64_000);
        input.onThinking?.(thinking);
      },
    );
    addPerformance(inference, generated.performance);
    this.contextTokens = generated.memory.contextSizeTokens ?? this.contextTokens;
    input.onThinking?.(null);
    return parseDecision(generated.value);
  }

  private async execute(
    input: AgentRunInput,
    decision: Extract<AgentDecision, { action: "execute" }>,
    progress: AgentProgress,
  ): Promise<void> {
    const execution: AgentSessionExecution =
      decision.language === "shell"
        ? { language: "shell", command: decision.command }
        : {
            language: decision.language,
            path:
              decision.path ??
              `steps/${String(progress.executions.length + 1).padStart(4, "0")}.${decision.language === "python" ? "py" : "mjs"}`,
            source: decision.source,
          };
    input.onEvent?.("execution.started", decision.summary, {
      language: decision.language,
      path: execution.language === "shell" ? null : execution.path,
      source: decision.language === "shell" ? null : decision.source,
      command: decision.language === "shell" ? decision.command : null,
    });
    const result = await this.executor.execute(execution, input.signal);
    progress.executions.push(AgentExecutionResultSchema.parse(result));
    input.onEvent?.(
      "execution.completed",
      `${decision.language} finished with exit code ${result.exitCode}.`,
      {
        language: result.language,
        path: result.path,
        source: result.source,
        command: result.command,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: result.durationMs,
        termination: result.termination,
      },
    );
  }

  private finish(input: AgentRunInput, progress: AgentProgress, response: string): AgentRunResult {
    input.onEvent?.("assistant.completed", "Response completed.");
    return AgentRunResultSchema.parse({
      response: executionBackedResponse(input, progress, response),
      ...progress,
    });
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const progress: AgentProgress = {
      executions: [],
      inference: emptyPerformance(),
      rejectedDuplicates: 0,
    };
    for (
      let decisionCount = 0;
      decisionCount < MAX_DECISIONS && progress.executions.length < MAX_EXECUTIONS;
      decisionCount += 1
    ) {
      input.signal?.throwIfAborted();
      const decision = await this.decide(input, progress);
      if (decision.action === "respond") return this.finish(input, progress, decision.response);
      if (
        progress.executions.some((execution) =>
          decision.language === "shell"
            ? execution.command === decision.command
            : execution.source === decision.source,
        )
      ) {
        progress.rejectedDuplicates += 1;
        continue;
      }
      await this.execute(input, decision, progress);
      const verifiedResponse = executionBackedResponse(input, progress, "");
      if (verifiedResponse.length > 0) return this.finish(input, progress, verifiedResponse);
    }
    input.signal?.throwIfAborted();
    const decision = await this.decide(input, progress, true);
    if (decision.action !== "respond") throw new Error("agent_execution_limit_exceeded");
    return this.finish(input, progress, decision.response);
  }
}
