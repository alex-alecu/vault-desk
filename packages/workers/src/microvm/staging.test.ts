import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyBoundedInput } from "./staging.js";

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "vault-worker-stage-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })));
});

describe("bounded worker input staging", () => {
  it("removes a partial copy when the byte limit is exceeded", async () => {
    const root = await temporaryRoot();
    const source = join(root, "source");
    const destination = join(root, "destination");
    await writeFile(source, "oversized");
    await expect(
      copyBoundedInput(source, destination, 4, new AbortController().signal),
    ).rejects.toThrow("worker_input_limit_exceeded");
    await expect(access(destination)).rejects.toThrow();
  });

  it("does not create an output for a cancelled job", async () => {
    const root = await temporaryRoot();
    const source = join(root, "source");
    const destination = join(root, "destination");
    await writeFile(source, "input");
    const cancelled = AbortSignal.abort(new Error("cancelled"));
    await expect(copyBoundedInput(source, destination, 16, cancelled)).rejects.toThrow("cancelled");
    await expect(access(destination)).rejects.toThrow();
  });
});
