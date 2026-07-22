import {
  type AgentDecision,
  AgentDecisionSchema,
  type AgentExecutionResult,
  type InferencePerformance,
} from "@vault/shared";
import type { GenerationInput } from "../runtime/inference.js";

export const MAX_EXECUTIONS = 6;
const FINAL_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    action: { const: "respond" },
    response: {
      type: "array",
      items: { type: "string", maxLength: 512 },
      minItems: 1,
      maxItems: 100,
    },
  },
  required: ["action", "response"],
  additionalProperties: false,
} as const;
const DECISION_SCHEMA = {
  oneOf: [
    FINAL_RESPONSE_SCHEMA,
    {
      type: "object",
      properties: {
        action: { const: "execute" },
        language: { enum: ["python", "node"] },
        code: {
          type: "array",
          items: { type: "string", maxLength: 512 },
          minItems: 1,
          maxItems: 24,
        },
        summary: { type: "string", minLength: 1, maxLength: 500 },
      },
      required: ["action", "language", "code", "summary"],
      additionalProperties: false,
    },
  ],
} as const;
const EXECUTION_SCHEMA = DECISION_SCHEMA.oneOf[1];
const XLSX_SEARCH_EXAMPLE = [
  "For an XLSX text search, adapt these complete source lines:",
  "from pathlib import Path",
  "import os",
  "from openpyxl import load_workbook",
  "for path in Path(os.environ['VAULT_INPUT_DIR']).iterdir():",
  "    if path.suffix.lower() != '.xlsx': continue",
  "    for sheet in load_workbook(path, data_only=True).worksheets:",
  "        for row in sheet.iter_rows(values_only=True):",
  "            if any('search term' in str(value).lower() for value in row if value is not None):",
  "                print(path.name, sheet.title, row)",
].join("\n");
const XLSX_EXECUTION_INSTRUCTIONS = [
  "For XLSX files, use openpyxl.load_workbook(path, data_only=True) and sheet.iter_rows(values_only=True). Search text as a case-insensitive substring in every nonempty cell, not as equality or in an assumed column; use the discovered headers to select date and amount columns.",
  XLSX_SEARCH_EXAMPLE,
] as const;
const XLSX_INSPECTION_PHASE = [
  "Current required phase: inspect before calculating.",
  "If this is an XLSX text-search task, execute only one short search program now: copy the XLSX search example, replace 'search term' with the requested text, and print every complete matching row with its file and sheet.",
  "Do not add break or stop after the first match. Do not calculate totals, infer headers, normalize numbers, build a transaction list, use try/except, or add comments in this phase.",
] as const;
const XLSX_RESULT_EXAMPLE = [
  "For the verified XLSX result, adapt these complete source lines and replace only the search term and observed amount index:",
  "from pathlib import Path",
  "import os",
  "from openpyxl import load_workbook",
  "count = 0",
  "total = 0.0",
  "for path in Path(os.environ['VAULT_INPUT_DIR']).iterdir():",
  "    if path.suffix.lower() != '.xlsx': continue",
  "    for sheet in load_workbook(path, data_only=True).worksheets:",
  "        for row in sheet.iter_rows(values_only=True):",
  "            if any('search term' in str(value).lower() for value in row if value is not None):",
  "                print(path.name, sheet.title, row)",
  "                count += 1",
  "                total += float(row[AMOUNT_INDEX])",
  "print('Match count:', count)",
  "print('Total:', total)",
].join("\n");
const XLSX_RESULT_PHASE = [
  "Current required phase: calculate and verify from the inspected structure before responding.",
  "Execute one short program that repeats the search and prints every requested summary row, the match count, and any requested total.",
  "Use plain comma-separated print calls. Do not build lists or dictionaries, format Markdown, use f-strings, sort, add comments, or close workbooks.",
  "Select indexes from the observed row structure and calculate from workbook values. Do not copy values into source or normalize values that are already numeric.",
  XLSX_RESULT_EXAMPLE,
] as const;
const EXECUTION_INSTRUCTIONS = [
  "You are an offline development agent.",
  "Choose one action. Execute only when computation or file inspection is needed.",
  "When the task names a language or number of execution steps, follow it exactly and respond only after those steps succeed.",
  "The code field is an array of at most 24 complete source lines, with no newline inside an item.",
  "The response field is an array of at most 100 complete output lines, with no newline inside an item.",
  "Never request packages, networks, credentials, host writes, or shell access.",
  "Import only modules used by the current execution. Python may use its standard library plus PIL, pypdf, openpyxl, docx, and lxml. Never import pandas. Node.js has built-in modules only.",
  "Every execution must perform useful task work and print an observation or write a requested artifact. Never execute imports or definitions by themselves.",
  "Prefer short top-level source. Avoid functions and try/except unless required. Never repeat a source line, and verify indentation, brackets, and argument names before executing.",
  "For unfamiliar structured files, print complete matching rows before selecting fields. Never guess column positions.",
  "Selected files are staged flat. Discover them with Path(os.environ['VAULT_INPUT_DIR']).iterdir(), and compare path.suffix.lower() so uppercase extensions are included.",
  "Format final responses as concise CommonMark Markdown when formatting improves readability. Use plain text when it does not, and never return raw HTML.",
  "Selected files are not in the current directory. Read them only by joining their names to the VAULT_INPUT_DIR environment variable.",
  "Write proposed files only by joining their names to the VAULT_ARTIFACT_DIR environment variable.",
  "The code field must contain compact executable source only: no Markdown, comments, explanations, or repeated filler.",
  "Discover selected files programmatically instead of copying file names into source.",
  "End code immediately after the required operation. Do not add a main guard, trailing notes, filler, or an extra closing brace.",
] as const;

export interface AgentPromptInput {
  task: string;
  modelId: string;
  inputNames?: string[];
}

export interface AgentProgress {
  executions: AgentExecutionResult[];
  inference: InferencePerformance;
  rejectedDuplicates: number;
}

export function hasUsefulResult(result: AgentExecutionResult): boolean {
  return (
    result.exitCode === 0 &&
    result.termination === "completed" &&
    (result.stdout.trim().length > 0 || result.artifacts.length > 0)
  );
}

function observations(executions: AgentExecutionResult[]) {
  return executions.map((result, index) => ({
    step: index + 1,
    language: result.language,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    termination: result.termination,
    artifacts: result.artifacts.map((artifact) => artifact.name),
    ...(!hasUsefulResult(result) ? { codeToRepair: result.code } : {}),
  }));
}

function prompt(input: AgentPromptInput, progress: AgentProgress, finalResponse: boolean): string {
  const { executions, rejectedDuplicates } = progress;
  const inputNames = input.inputNames ?? [];
  const artifacts = executions.flatMap((result) =>
    result.artifacts.map((artifact) => artifact.name),
  );
  const hasXlsxInput = inputNames.some((name) => name.toLowerCase().endsWith(".xlsx"));
  const usefulExecutionCount = executions.filter(hasUsefulResult).length;
  return [
    ...EXECUTION_INSTRUCTIONS,
    ...(hasXlsxInput ? XLSX_EXECUTION_INSTRUCTIONS : []),
    `Selected input count: ${inputNames.length}.`,
    `Task: ${input.task}`,
    `Completed execution observations: ${JSON.stringify(observations(executions))}`,
    `Successful execution count: ${executions.filter((item) => item.exitCode === 0 && item.termination === "completed").length}.`,
    `Remaining execution capacity: ${Math.max(0, MAX_EXECUTIONS - executions.length)}.`,
    `Rejected duplicate successful programs: ${rejectedDuplicates}. A rejected program was not executed and does not advance the task. After a rejection, implement the next missing task step with different code.`,
    `Produced artifact names: ${JSON.stringify(artifacts)}.`,
    "These observations are authoritative. Never repeat completed code or a completed task step.",
    "When codeToRepair is present, fix the reported failure or missing output in that program instead of starting over with a more complex approach.",
    "For ordered task steps, completed execution 1 means step 1 is done; the next action must implement step 2.",
    "Choose execute only if a requested step is still missing from the observations.",
    "If every requested execution and artifact is evidenced, you must choose respond now and must not execute again.",
    ...(finalResponse
      ? [
          "No execution capacity remains. Respond now from the observations. State clearly if the task could not be completed or verified.",
        ]
      : hasXlsxInput && usefulExecutionCount === 0
        ? XLSX_INSPECTION_PHASE
        : hasXlsxInput && usefulExecutionCount === 1
          ? XLSX_RESULT_PHASE
          : []),
  ].join("\n");
}

export function generationInput(
  input: AgentPromptInput,
  progress: AgentProgress,
  finalResponse = false,
): GenerationInput {
  const requiresXlsxExecution =
    !finalResponse &&
    (input.inputNames ?? []).some((name) => name.toLowerCase().endsWith(".xlsx")) &&
    progress.executions.filter(hasUsefulResult).length < 2;
  return {
    modelId: input.modelId,
    prompt: prompt(input, progress, finalResponse),
    jsonSchema: finalResponse
      ? FINAL_RESPONSE_SCHEMA
      : requiresXlsxExecution
        ? EXECUTION_SCHEMA
        : DECISION_SCHEMA,
    contextSize: "auto",
    maxTokens: 4096,
  };
}

export function parseDecision(value: unknown): AgentDecision {
  if (typeof value !== "object" || value === null) return AgentDecisionSchema.parse(value);
  const decision = value as Record<string, unknown>;
  if (decision.action === "execute" && Array.isArray(decision.code)) {
    return AgentDecisionSchema.parse({ ...decision, code: decision.code.join("\n") });
  }
  if (decision.action === "respond" && Array.isArray(decision.response)) {
    return AgentDecisionSchema.parse({ ...decision, response: decision.response.join("\n") });
  }
  return AgentDecisionSchema.parse(value);
}

export function executionBackedResponse(
  input: AgentPromptInput,
  progress: AgentProgress,
  fallback: string,
): string {
  if (!(input.inputNames ?? []).some((name) => name.toLowerCase().endsWith(".xlsx"))) {
    return fallback;
  }
  const usefulExecutions = progress.executions.filter(hasUsefulResult);
  const stdout = usefulExecutions.at(-1)?.stdout.trim() ?? "";
  return usefulExecutions.length >= 2 && stdout.length > 0 && stdout.length <= 64_000
    ? stdout
    : fallback;
}
