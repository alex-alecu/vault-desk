import { setTimeout as delay } from "node:timers/promises";

interface ParentMonitorOptions {
  onExit(): Promise<void> | void;
  parentPid: number;
  pollMilliseconds?: number;
  processIsLive?(pid: number): boolean;
}

function processIsLive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export function monitorParent(options: ParentMonitorOptions): () => void {
  const isLive = options.processIsLive ?? processIsLive;
  const timer = setInterval(() => {
    if (isLive(options.parentPid)) return;
    clearInterval(timer);
    void options.onExit();
  }, options.pollMilliseconds ?? 50);
  timer.unref();
  return () => clearInterval(timer);
}

export async function openWithWorkspaceRetry<T>(
  open: () => Promise<T>,
  timeoutMilliseconds: number,
  retryMilliseconds = 50,
): Promise<T> {
  const deadline = Date.now() + timeoutMilliseconds;
  for (;;) {
    try {
      return await open();
    } catch (error) {
      const retry = error instanceof Error && error.message === "workspace_busy";
      if (!retry || Date.now() >= deadline) throw error;
      await delay(retryMilliseconds);
    }
  }
}
