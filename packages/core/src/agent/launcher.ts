import { MacOsMicroVmLauncher, WindowsMicroVmLauncher } from "@vault/workers";

export function createCodeAgentLauncher(
  helperPath: string,
  imageRoot: string | undefined,
  workspaceRoot: string,
) {
  return process.platform === "win32"
    ? new WindowsMicroVmLauncher(helperPath, imageRoot, workspaceRoot)
    : new MacOsMicroVmLauncher(helperPath, imageRoot, workspaceRoot);
}
