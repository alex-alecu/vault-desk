import { spawnSync } from "node:child_process";

function milestoneArgument(): string {
  const index = process.argv.indexOf("--milestone");
  const milestone = process.argv[index + 1];
  if (index === -1 || milestone === undefined) {
    throw new Error("Usage: pnpm test:gate --milestone 0");
  }
  return milestone;
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function requiredModelPath(): string {
  const index = process.argv.indexOf("--model");
  const path = process.argv[index + 1];
  if (index === -1 || path === undefined) {
    throw new Error("M0 closure requires --model <path> for the pinned Qwen GGUF.");
  }
  return path;
}

if (milestoneArgument() !== "0") {
  throw new Error("Only the active M0 gate exists.");
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const modelPath = requiredModelPath();
run(pnpm, ["verify"]);
run(pnpm, ["tauri:check"]);
run(process.execPath, [
  "--import",
  "tsx",
  "packages/eval/src/gates/model-smoke.ts",
  "--model",
  modelPath,
]);
run(pnpm, ["test:platform", "--require-certified"]);
