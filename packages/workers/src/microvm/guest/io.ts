import { open, realpath, stat } from "node:fs/promises";

export async function readStagedInput(path: string): Promise<Buffer> {
  const canonical = await realpath(path);
  const before = await stat(canonical);
  const handle = await open(canonical, "r");
  try {
    const opened = await handle.stat();
    if (opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("path_changed");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}
