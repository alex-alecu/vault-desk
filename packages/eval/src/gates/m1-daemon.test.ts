import { spawn, spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultCore, daemonEndpoint, startDaemon } from "@vault/core";
import { PROTOCOL_VERSION, type RpcResponse, RpcResponseSchema } from "@vault/shared";
import { afterEach, describe, expect, it } from "vitest";

const temporaryRoots: string[] = [];

interface WindowsPipeSecurityReport {
  currentUserOnly: boolean;
  currentUserSid: string;
  restrictedConnectionDenied: boolean;
  sddl: string;
}

async function temporaryRoot(prefix = "vault-m1-daemon-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

function rpc(
  endpoint: string,
  protocolVersion: number = PROTOCOL_VERSION,
  timeoutMs = 5000,
): Promise<RpcResponse> {
  return new Promise((accept, reject) => {
    const socket = createConnection(endpoint);
    let output = "";
    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error("RPC timed out.")));
    socket.on("data", (chunk) => (output += chunk));
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: "gate", method: "status", params: {}, protocolVersion })}\n`,
      );
    });
    socket.once("end", () => {
      try {
        accept(RpcResponseSchema.parse(JSON.parse(output)));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function windowsPipeSecurity(endpoint: string): WindowsPipeSecurityReport {
  const helper = join(
    process.cwd(),
    "packages/core/native/windows-pipe-guard/.generated/vault-pipe-guard.exe",
  );
  const result = spawnSync(helper, ["probe", endpoint], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Windows pipe security probe failed.");
  return JSON.parse(result.stdout) as WindowsPipeSecurityReport;
}

async function waitForRpc(endpoint: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      await rpc(endpoint, PROTOCOL_VERSION, 100);
      return;
    } catch {
      await new Promise((accept) => setTimeout(accept, 25));
    }
  }
  throw new Error("Daemon did not become responsive.");
}

async function restartDaemon(core: Awaited<ReturnType<typeof createVaultCore>>, root: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      return await startDaemon(core, root);
    } catch (error) {
      lastError = error;
      await new Promise((accept) => setTimeout(accept, 25));
    }
  }
  throw lastError;
}

function runStatusCli(
  workspace: string,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((accept) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "packages/cli/src/main.ts", "status", "--workspace", workspace, "--json"],
      { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("close", (code) => accept({ code, stdout, stderr }));
  });
}

describe("M1 daemon endpoint identity", () => {
  it("uses one endpoint for equivalent workspace paths", async () => {
    const parent = await temporaryRoot("v-");
    const root = join(parent, "workspace");
    const alias = join(parent, "workspace-alias");
    await mkdir(root);
    await symlink(root, alias, process.platform === "win32" ? "junction" : "dir");
    expect(daemonEndpoint(alias)).toBe(daemonEndpoint(root));
    if (process.platform === "win32") {
      expect(daemonEndpoint(root.toUpperCase())).toBe(daemonEndpoint(root));
    }
    const core = await createVaultCore({ workspaceDir: root });
    const daemon = await startDaemon(core, root);
    const cli = await runStatusCli(alias);
    expect(cli.code).toBe(0);
    expect(JSON.parse(cli.stdout).status).toBe("ok");
    await daemon.close();
    await core.close();
  });
});

describe("M1 daemon and local transport", () => {
  it("starts, negotiates versions, restricts its endpoint, and restarts", async () => {
    const root = await temporaryRoot();
    const core = await createVaultCore({ workspaceDir: root });
    const first = await startDaemon(core, root);
    if (process.platform === "win32") {
      expect(first.endpoint).toMatch(/^\\\\\.\\pipe\\vault-cored-/u);
      const security = windowsPipeSecurity(first.endpoint);
      expect(security.currentUserOnly).toBe(true);
      expect(security.currentUserSid).toMatch(/^S-1-/u);
      expect(security.restrictedConnectionDenied).toBe(true);
      expect(security.sddl).not.toMatch(/;;;(?:AN|BU|WD)\)/u);
    } else {
      const state = await lstat(first.endpoint);
      expect(state.mode & 0o777).toBe(0o600);
      const directory = await lstat(join(root, ".vault"));
      expect(directory.mode & 0o777).toBe(0o700);
    }
    expect("result" in (await rpc(first.endpoint))).toBe(true);
    const cli = await runStatusCli(root);
    expect(cli.code).toBe(0);
    expect(cli.stderr).toBe("");
    expect(cli.stdout.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(cli.stdout).status).toBe("ok");
    if (process.platform !== "win32") {
      await expect(startDaemon(core, root)).rejects.toThrow("workspace_busy");
      expect("result" in (await rpc(first.endpoint))).toBe(true);
    }
    const incompatible = await rpc(first.endpoint, 99);
    expect("error" in incompatible ? incompatible.error.code : undefined).toBe(
      "incompatible_version",
    );
    await first.close();
    const second = await startDaemon(core, root);
    expect(second.endpoint).toBe(daemonEndpoint(root));
    expect("result" in (await rpc(second.endpoint))).toBe(true);
    await second.close();
    await core.close();
  });
});

describe("M1 daemon recovery", () => {
  it("recovers the writer lock and catalog after abrupt daemon termination", async () => {
    const root = await temporaryRoot();
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "packages/core/src/daemon/main.ts", "--workspace", root],
      { cwd: process.cwd(), stdio: "ignore" },
    );
    await waitForRpc(daemonEndpoint(root));
    child.kill("SIGKILL");
    await new Promise((accept) => child.once("close", accept));
    const core = await createVaultCore({ workspaceDir: root });
    const daemon = await restartDaemon(core, root);
    expect("result" in (await rpc(daemon.endpoint))).toBe(true);
    await daemon.close();
    await core.close();
  });
});
