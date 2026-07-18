import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MacOsMicroVmLauncher } from "@vault/workers";

async function macReport(): Promise<unknown> {
  const helper = join(
    process.cwd(),
    "packages/workers/native/macos-vz-helper/.generated/vault-vz-helper",
  );
  const artifacts = join(process.cwd(), "packages/workers/images/.generated/artifacts/aarch64");
  if (!existsSync(helper) || !existsSync(artifacts)) {
    return {
      classification: "compatible_unverified",
      reason: "Build the signed helper and pinned arm64 guest before certification.",
    };
  }
  const root = await mkdtemp(join(tmpdir(), "vault-m1-platform-"));
  try {
    const input = join(root, "input.img");
    await writeFile(input, "probe input");
    return await new MacOsMicroVmLauncher(helper).launchProbe({
      jobId: randomUUID(),
      readonlyInputs: [input],
      limits: {
        wallTimeMs: 30_000,
        memoryBytes: 256 * 1024 * 1024,
        scratchBytes: 8 * 1024 * 1024,
        outputBytes: 4096,
        cpuCount: 1,
      },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function stageReport(): Promise<unknown> {
  if (process.platform === "darwin" && process.arch === "arm64") return await macReport();
  return {
    classification: "unsupported",
    reason: "This stage implements M1 certification only for macOS on Apple silicon.",
  };
}

const report = await stageReport();
console.log(JSON.stringify(report));
if (process.argv.includes("--require-certified")) {
  const classification = (report as { classification?: string }).classification;
  if (classification !== "certified") process.exitCode = 1;
}
