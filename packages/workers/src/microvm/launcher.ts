import type { MicroVmProbeReport, WorkerLimits } from "@vault/shared";

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
