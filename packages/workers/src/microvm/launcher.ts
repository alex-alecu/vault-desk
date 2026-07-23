import type { AgentExecutionResult, MicroVmProbeReport, WorkerLimits } from "@vault/shared";

export interface MicroVmLaunchRequest {
  jobId: string;
  readonlyInputs: string[];
  limits: WorkerLimits;
  signal?: AbortSignal;
}

export type MicroVmLaunchResult = MicroVmProbeReport;

export interface MicroVmLauncher {
  launchProbe(request: MicroVmLaunchRequest): Promise<MicroVmLaunchResult>;
}

export interface AgentInputFile {
  path: string;
  name: string;
}

export interface MicroVmAgentRequest {
  sessionId: string;
  sourceFolder: string;
  readonlyInputs: AgentInputFile[];
  limits: WorkerLimits;
  signal?: AbortSignal;
}

export type AgentSessionExecution =
  | { language: "python" | "node"; path: string; source: string }
  | { language: "shell"; command: string };

export interface CodeAgentSession {
  execute(request: AgentSessionExecution, signal?: AbortSignal): Promise<AgentExecutionResult>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}

export interface CodeAgentLauncher {
  openAgentSession(request: MicroVmAgentRequest): Promise<CodeAgentSession>;
  deleteWorkspace(sessionId: string): Promise<void>;
}
