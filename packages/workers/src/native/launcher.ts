import type { ChildProcessWithoutNullStreams } from "node:child_process";

export interface NativeWorkerLaunchRequest {
  workerEntryPath: string;
  modelPath?: string;
  memoryBudgetBytes: number;
}

export interface NativeWorkerHandle {
  process: ChildProcessWithoutNullStreams;
  dispose(): Promise<void>;
}

export interface NativeWorkerLauncher {
  launch(request: NativeWorkerLaunchRequest): Promise<NativeWorkerHandle>;
}
