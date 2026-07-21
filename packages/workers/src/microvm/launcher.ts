import type {
  AgentExecutionResult,
  AgentLanguage,
  MicroVmProbeReport,
  WorkerLimits,
} from "@vault/shared";

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
  jobId: string;
  language: AgentLanguage;
  code: string;
  readonlyInputs: AgentInputFile[];
  limits: WorkerLimits;
  signal?: AbortSignal;
}

export interface CodeAgentLauncher {
  executeAgent(request: MicroVmAgentRequest): Promise<AgentExecutionResult>;
}
