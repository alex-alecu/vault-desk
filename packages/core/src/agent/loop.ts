import {
  AgentDecisionSchema,
  type AgentExecutionResult,
  AgentExecutionResultSchema,
  type AgentLanguage,
  type AgentRunResult,
  AgentRunResultSchema,
} from "@vault/shared";
import type { GenerationInput, InferenceService } from "../runtime/inference.js";

const MAX_EXECUTIONS = 6;
const DECISION_SCHEMA = {
  type: "object",
  oneOf: [
    {
      properties: {
        action: { const: "execute" },
        language: { enum: ["python", "node"] },
        code: { type: "string" },
        summary: { type: "string" },
      },
      required: ["action", "language", "code", "summary"],
      additionalProperties: false,
    },
    {
      properties: { action: { const: "respond" }, response: { type: "string" } },
      required: ["action", "response"],
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
  signal?: AbortSignal;
}

function prompt(task: string, executions: AgentExecutionResult[]): string {
  const observations = executions.map((result, index) => ({
    step: index + 1,
    language: result.language,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    termination: result.termination,
  }));
  return [
    "You are an offline development agent.",
    "Choose one action. Execute only when computation or file inspection is needed.",
    "Never request packages, networks, credentials, host writes, or shell access.",
    `Task: ${task}`,
    `Previous bounded observations: ${JSON.stringify(observations)}`,
  ].join("\n");
}

function generationInput(
  input: AgentRunInput,
  executions: AgentExecutionResult[],
): GenerationInput {
  return {
    modelId: input.modelId,
    prompt: prompt(input.task, executions),
    jsonSchema: DECISION_SCHEMA,
    contextSize: 8192,
    maxTokens: 2048,
  };
}

export class AgentLoop {
  constructor(
    private readonly inference: Pick<InferenceService, "generate">,
    private readonly executor: AgentExecutor,
  ) {}

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const executions: AgentExecutionResult[] = [];
    for (let step = 0; step <= MAX_EXECUTIONS; step += 1) {
      input.signal?.throwIfAborted();
      const generated = await this.inference.generate(
        generationInput(input, executions),
        input.signal,
      );
      const decision = AgentDecisionSchema.parse(generated.value);
      if (decision.action === "respond") {
        return AgentRunResultSchema.parse({ response: decision.response, executions });
      }
      if (executions.length === MAX_EXECUTIONS) throw new Error("agent_execution_limit_exceeded");
      const result = await this.executor.execute(
        { language: decision.language, code: decision.code },
        input.signal,
      );
      executions.push(AgentExecutionResultSchema.parse(result));
    }
    throw new Error("agent_execution_limit_exceeded");
  }
}
