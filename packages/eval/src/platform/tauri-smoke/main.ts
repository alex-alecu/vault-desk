interface TauriGlobal {
  core: { invoke<T>(command: string, payload?: Record<string, unknown>): Promise<T> };
  event: { emit(event: string, payload?: unknown): Promise<void> };
}

declare global {
  interface Window {
    __TAURI__: TauriGlobal;
  }
}

async function capabilitySmoke(): Promise<void> {
  const result = document.querySelector("#result");
  if (result === null) throw new Error("Missing smoke-test output element.");
  const sidecar = await window.__TAURI__.core.invoke<string>("launch_test_sidecar");
  let arbitraryCommandDenied = false;
  try {
    await window.__TAURI__.core.invoke("arbitrary_command", { executable: "sh" });
  } catch {
    arbitraryCommandDenied = true;
  }
  const evidence = { sidecar: JSON.parse(sidecar), arbitraryCommandDenied };
  result.textContent = JSON.stringify(evidence);
  await window.__TAURI__.event.emit("m0-runtime-evidence", evidence);
}

void capabilitySmoke();
