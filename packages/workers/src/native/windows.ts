import type {
  NativeWorkerHandle,
  NativeWorkerLauncher,
  NativeWorkerLaunchRequest,
} from "./launcher.js";
import { NativeWorkerLaunchError } from "./launcher.js";

export class WindowsNativeWorkerLauncher implements NativeWorkerLauncher {
  async launch(_request: NativeWorkerLaunchRequest): Promise<NativeWorkerHandle> {
    throw new NativeWorkerLaunchError("unsupported", "unsupported_native_worker_platform");
  }
}
