import {
  type AgentDecision,
  AgentDecisionSchema,
  type AgentEventDetail,
  type AgentEventType,
  type AgentExecutionResult,
  AgentExecutionResultSchema,
  type AgentLanguage,
  type AgentRunResult,
  AgentRunResultSchema,
  type InferencePerformance,
} from "@vault/shared";
import type { GenerationInput, InferenceService } from "../runtime/inference.js";

const MAX_EXECUTIONS = 6;
const DECISION_SCHEMA = {
  oneOf: [
    {
      type: "object",
      properties: {
        action: { const: "respond" },
        response: { type: "string", maxLength: 1_536 },
      },
      required: ["action", "response"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        action: { const: "execute" },
        language: { enum: ["python", "node"] },
        code: {
          type: "array",
          items: { type: "string", maxLength: 160 },
          minItems: 1,
          maxItems: 24,
        },
        summary: { type: "string", maxLength: 500 },
      },
      required: ["action", "language", "code", "summary"],
      additionalProperties: false,
    },
  ],
} as const;

export interface AgentExecutor {
  execute(
    input: { language: AgentLanguage; code: string },
    signal?: AbortSignal,
  ): Promise<AgentExecutionResult>;
}

export interface AgentRunInput {
  task: string;
  modelId: string;
  inputNames?: string[];
  onEvent?(type: AgentEventType, summary: string, detail?: Partial<AgentEventDetail>): void;
  onThinking?(text: string | null): void;
  signal?: AbortSignal;
}

function prompt(task: string, inputNames: string[], executions: AgentExecutionResult[]): string {
  const artifacts = executions.flatMap((result) =>
    result.artifacts.map((artifact) => artifact.name),
  );
  const observations = executions.map((result, index) => ({
    step: index + 1,
    language: result.language,
    code: result.code,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    termination: result.termination,
    artifacts: result.artifacts.map((artifact) => artifact.name),
  }));
  return [
    "You are an offline development agent.",
    "Choose one action. Execute only when computation or file inspection is needed.",
    "When the task names a language or number of execution steps, follow it exactly and respond only after those steps succeed.",
    "The code field is an array of at most 24 complete source lines, with no newline inside an item.",
    "Never request packages, networks, credentials, host writes, or shell access.",
    "Selected files are not in the current directory. Read them only by joining their names to the VAULT_INPUT_DIR environment variable.",
    "Write proposed files only by joining their names to the VAULT_ARTIFACT_DIR environment variable.",
    "The code field must contain compact executable source only: no Markdown, comments, explanations, or repeated filler.",
    "End code immediately after the required operation. Do not add a main guard, trailing notes, filler, or an extra closing brace.",
    `Selected file names: ${JSON.stringify(inputNames)}`,
    `Task: ${task}`,
    `Completed execution observations: ${JSON.stringify(observations)}`,
    `Successful execution count: ${executions.filter((item) => item.exitCode === 0 && item.termination === "completed").length}.`,
    `Produced artifact names: ${JSON.stringify(artifacts)}.`,
    "These observations are authoritative. Never repeat completed code or a completed task step.",
    "For ordered task steps, completed execution 1 means step 1 is done; the next action must implement step 2.",
    "Choose execute only if a requested step is still missing from the observations.",
    "If every requested execution and artifact is evidenced, you must choose respond now and must not execute again.",
  ].join("\n");
}

function parseDecision(value: unknown): AgentDecision {
  if (typeof value !== "object" || value === null) return AgentDecisionSchema.parse(value);
  const record = value as Record<string, unknown>;
  if (record.action !== "execute" || !Array.isArray(record.code)) {
    return AgentDecisionSchema.parse(value);
  }
  return AgentDecisionSchema.parse({ ...record, code: record.code.join("\n") });
}

function generationInput(
  input: AgentRunInput,
  executions: AgentExecutionResult[],
): GenerationInput {
  return {
    modelId: input.modelId,
    prompt: prompt(input.task, input.inputNames ?? [], executions),
    jsonSchema: DECISION_SCHEMA,
    contextSize: 8192,
    maxTokens: 1024,
  };
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
  constructor(
    private readonly inference: Pick<InferenceService, "generate">,
    private readonly executor: AgentExecutor,
  ) {}

  private async decide(
    input: AgentRunInput,
    executions: AgentExecutionResult[],
    inference: InferencePerformance,
    step: number,
  ): Promise<AgentDecision> {
    input.onEvent?.(
      "inference.started",
      step === 0 ? "Loading the local model and planning the task." : `Planning step ${step + 1}.`,
    );
    let thinking = "";
    input.onThinking?.(null);
    const generated = await this.inference.generate(
      generationInput(input, executions),
      input.signal,
      (delta) => {
        thinking = `${thinking}${delta}`.slice(-64_000);
        input.onThinking?.(thinking);
      },
    );
    addPerformance(inference, generated.performance);
    input.onThinking?.(null);
    return parseDecision(generated.value);
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const executions: AgentExecutionResult[] = [];
    const inference = emptyPerformance();
    for (let step = 0; step <= MAX_EXECUTIONS; step += 1) {
      input.signal?.throwIfAborted();
      const decision = await this.decide(input, executions, inference, step);
      if (decision.action === "respond") {
        input.onEvent?.("assistant.completed", "Response completed.");
        return AgentRunResultSchema.parse({ response: decision.response, executions, inference });
      }
      if (executions.length === MAX_EXECUTIONS) throw new Error("agent_execution_limit_exceeded");
      input.onEvent?.("execution.started", decision.summary, {
        language: decision.language,
        code: decision.code,
      });
      const result = await this.executor.execute(
        { language: decision.language, code: decision.code },
        input.signal,
      );
      executions.push(AgentExecutionResultSchema.parse(result));
      input.onEvent?.(
        "execution.completed",
        `${decision.language} finished with exit code ${result.exitCode}.`,
        {
          language: result.language,
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
          termination: result.termination,
        },
      );
    }
    throw new Error("agent_execution_limit_exceeded");
  }
}
