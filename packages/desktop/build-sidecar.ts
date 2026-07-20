import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const desktopRoot = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = resolve(desktopRoot, "../..");
const tauriRoot = join(desktopRoot, "src-tauri");
const generatedRoot = join(desktopRoot, ".generated", "sidecar");
const resourcesRoot = join(tauriRoot, "resources", "core");
const binariesRoot = join(tauriRoot, "binaries");
const expectedNodeVersion = "v24.18.0";
const migrationNames = ["0001-initial.sql", "0002-audit-head.sql", "0003-conversations.sql"];

function run(command: string, args: string[], env?: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { encoding: "utf8", env, stdio: "pipe" });
  if (result.status === 0) return;
  const detail = result.error?.message ?? result.stderr ?? result.stdout ?? "unknown failure";
  throw new Error(`${command} failed: ${detail}`);
}

function targetTriple(): string {
  const triples: Record<string, string> = {
    "darwin-arm64": "aarch64-apple-darwin",
    "win32-x64": "x86_64-pc-windows-msvc",
  };
  const triple = triples[`${process.platform}-${process.arch}`];
  if (triple === undefined) throw new Error("Unsupported Vault Desk desktop build host.");
  return triple;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function sqliteAddonPath(): string {
  const coreRequire = createRequire(join(repositoryRoot, "packages/core/package.json"));
  const entry = coreRequire.resolve("better-sqlite3");
  return resolve(dirname(entry), "../build/Release/better_sqlite3.node");
}

async function buildBundle(): Promise<string> {
  const output = join(generatedRoot, "vault-core.cjs");
  await build({
    absWorkingDir: repositoryRoot,
    entryPoints: [join(repositoryRoot, "packages/core/src/daemon/main.ts")],
    outfile: output,
    bundle: true,
    conditions: ["vault-runtime"],
    define: { "import.meta.url": '"file:///vault-core.cjs"' },
    format: "cjs",
    platform: "node",
    target: "node24",
  });
  return output;
}

async function prepareSea(bundle: string): Promise<string> {
  if (process.version !== expectedNodeVersion) {
    throw new Error(`Expected Node ${expectedNodeVersion}, received ${process.version}.`);
  }
  const blob = join(generatedRoot, "vault-core.blob");
  const executable = join(
    generatedRoot,
    process.platform === "win32" ? "vault-core.exe" : "vault-core",
  );
  const config = join(generatedRoot, "sea-config.json");
  await writeFile(
    config,
    `${JSON.stringify({ main: bundle, output: blob, useCodeCache: false, useSnapshot: false })}\n`,
  );
  run(process.execPath, ["--experimental-sea-config", config]);
  await copyFile(process.execPath, executable);
  const postject = join(desktopRoot, "node_modules", "postject", "dist", "cli.js");
  if (process.platform === "darwin") {
    spawnSync("codesign", ["--remove-signature", executable]);
  } else {
    stripWindowsSignature(executable);
  }
  const args = [
    executable,
    "NODE_SEA_BLOB",
    blob,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ];
  if (process.platform === "darwin") args.push("--macho-segment-name", "NODE_SEA");
  run(process.execPath, [postject, ...args]);
  return executable;
}

function stripWindowsSignature(executable: string): void {
  const programFiles = process.env["ProgramFiles(x86)"];
  if (programFiles === undefined) throw new Error("Missing 64-bit Windows SDK location.");
  const powerShell = windowsPowerShell();
  const script =
    '$s=Get-ChildItem "$env:VAULT_WINDOWS_KITS\\*\\x64\\signtool.exe" | Sort-Object FullName -Descending | Select-Object -First 1;if($null -eq $s){exit 1};& $s.FullName remove /s $env:VAULT_SIGN_PATH;exit $LASTEXITCODE';
  run(powerShell.executable, ["-NoProfile", "-NonInteractive", "-Command", script], {
    ...process.env,
    PSModulePath: powerShell.modulePath,
    VAULT_SIGN_PATH: executable,
    VAULT_WINDOWS_KITS: join(programFiles, "Windows Kits", "10", "bin"),
  });
}

function windowsPowerShell(): { executable: string; modulePath: string } {
  const windowsRoot = process.env.WINDIR ?? "C:\\Windows";
  const root = join(windowsRoot, "System32", "WindowsPowerShell", "v1.0");
  return { executable: join(root, "powershell.exe"), modulePath: join(root, "Modules") };
}

function signWindows(executable: string): string {
  const powerShell = windowsPowerShell();
  const script =
    "$p=$env:VAULT_SIGN_PATH;$c=$null;try{$c=New-SelfSignedCertificate -Subject 'CN=Vault Desk M3 Development' -Type CodeSigningCert -CertStoreLocation Cert:\\CurrentUser\\My;Set-AuthenticodeSignature -FilePath $p -Certificate $c | Out-Null;$s=Get-AuthenticodeSignature -FilePath $p;$ok=$null -ne $s.SignerCertificate -and $s.Status -ne 'HashMismatch' -and $s.Status -ne 'NotSigned'}finally{if($null -ne $c){Remove-Item ('Cert:\\CurrentUser\\My\\'+$c.Thumbprint)}};if(-not $ok){exit 1}";
  run(powerShell.executable, ["-NoProfile", "-NonInteractive", "-Command", script], {
    ...process.env,
    PSModulePath: powerShell.modulePath,
    VAULT_SIGN_PATH: executable,
  });
  return "windows-ephemeral-self-signed";
}

function signExecutable(executable: string): string {
  if (process.platform === "win32") return signWindows(executable);
  run("codesign", ["--force", "--sign", "-", executable]);
  run("codesign", ["--verify", "--strict", executable]);
  return "macos-adhoc";
}

interface ResourceHashes {
  addon: string;
  migrations: Record<string, string>;
  windowsPipeGuard?: string;
}

async function installResources(): Promise<ResourceHashes> {
  const addon = join(resourcesRoot, "better_sqlite3.node");
  await copyFile(sqliteAddonPath(), addon);
  const migrations: Record<string, string> = {};
  for (const name of migrationNames) {
    const source = join(repositoryRoot, "packages/core/src/workspace/migrations", name);
    const destination = join(resourcesRoot, "migrations", name);
    await copyFile(source, destination);
    migrations[name] = await sha256(destination);
  }
  let windowsPipeGuard: string | undefined;
  if (process.platform === "win32") {
    run("pnpm", ["--dir", repositoryRoot, "core:windows-pipe-guard:build"], process.env);
    const pipeGuard = join(resourcesRoot, "vault-pipe-guard.exe");
    await copyFile(
      join(
        repositoryRoot,
        "packages/core/native/windows-pipe-guard/.generated/vault-pipe-guard.exe",
      ),
      pipeGuard,
    );
    windowsPipeGuard = await sha256(pipeGuard);
  }
  return {
    addon: await sha256(addon),
    migrations,
    ...(windowsPipeGuard === undefined ? {} : { windowsPipeGuard }),
  };
}

await rm(generatedRoot, { recursive: true, force: true });
await rm(resourcesRoot, { recursive: true, force: true });
await mkdir(generatedRoot, { recursive: true });
await mkdir(join(resourcesRoot, "migrations"), { recursive: true });
await mkdir(binariesRoot, { recursive: true });
const bundle = await buildBundle();
const executable = await prepareSea(bundle);
await chmod(executable, 0o755);
const signingMode = signExecutable(executable);
const extension = process.platform === "win32" ? ".exe" : "";
const installed = join(binariesRoot, `vault-core-${targetTriple()}${extension}`);
await copyFile(executable, installed);
await chmod(installed, 0o755);
const resources = await installResources();
const record = {
  schemaVersion: 1,
  nodeVersion: process.version,
  targetTriple: targetTriple(),
  signingMode,
  executableSha256: await sha256(installed),
  bundleSha256: await sha256(bundle),
  resources,
};
await writeFile(join(generatedRoot, "build-record.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record));
