import { constants } from "node:fs";
import { lstat, mkdtemp, open, opendir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import type { AgentInputFile } from "@vault/workers";
import type { DatabasePort } from "../workspace/database.js";
import type { AgentStore } from "./store.js";

const MAX_INPUTS = 32;
const MAX_INPUT_BYTES = 8 * 1024 * 1024 * 1024;
const MAX_FILE_BYTES = 512 * 1024 * 1024;

export interface ResolvedAgentInputs {
  files: AgentInputFile[];
  dispose(): Promise<void>;
}

function safeRelativeName(path: string): string {
  return path.replaceAll("/", "__").replaceAll("\\", "__").slice(-255);
}

function uniqueInputName(name: string, index: number, used: Set<string>): string {
  let candidate = name.slice(-255);
  let attempt = 0;
  while (used.has(candidate)) {
    const prefix = `${index.toString().padStart(2, "0")}-${attempt || ""}`;
    candidate = `${prefix}${name.slice(-(255 - prefix.length))}`;
    attempt += 1;
  }
  used.add(candidate);
  return candidate;
}

function appendInput(
  files: AgentInputFile[],
  usedNames: Set<string>,
  path: string,
  name: string,
): void {
  files.push({ path, name: uniqueInputName(name, files.length, usedNames) });
}

function addInputBytes(total: number, byteLength: number): number {
  const next = total + byteLength;
  if (next > MAX_INPUT_BYTES) throw new Error("worker_input_limit_exceeded");
  return next;
}

function sessionFolder(database: DatabasePort, sessionId: string) {
  return database
    .prepare(
      "SELECT f.root_path, f.revoked_at FROM sessions s LEFT JOIN folder_grants f ON f.id = s.folder_id WHERE s.id = ?",
    )
    .get(sessionId) as { root_path: string | null; revoked_at: string | null } | undefined;
}

function isWithin(root: string, path: string): boolean {
  const remainder = relative(root, path);
  return remainder === "" || (!remainder.startsWith("..") && !isAbsolute(remainder));
}

async function folderFiles(
  root: string,
): Promise<Array<{ path: string; name: string; root: string }>> {
  const canonicalRoot = await realpath(root);
  const files: Array<{ path: string; name: string; root: string }> = [];
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: bounded recursive traversal keeps snapshot policy in one boundary.
  async function walk(directory: string): Promise<void> {
    const directoryStat = await lstat(directory);
    const canonicalDirectory = await realpath(directory);
    if (
      !directoryStat.isDirectory() ||
      directoryStat.isSymbolicLink() ||
      !isWithin(canonicalRoot, canonicalDirectory)
    ) {
      throw new Error("folder_traversal_denied");
    }
    const entries = await opendir(directory);
    for await (const entry of entries) {
      if (entry.name === ".vault") continue;
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        if (files.length >= MAX_INPUTS) throw new Error("worker_input_limit_exceeded");
        files.push({ path, name: safeRelativeName(relative(root, path)), root: canonicalRoot });
      }
    }
  }
  await walk(root);
  return files;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the copy and its before/opened/after identity checks must remain one TOCTOU boundary.
async function copySnapshot(
  source: string,
  destination: string,
  allowedRoot: string,
  remainingBytes: number,
): Promise<number> {
  const before = await lstat(source);
  const maximumBytes = Math.min(MAX_FILE_BYTES, remainingBytes);
  if (!before.isFile() || before.isSymbolicLink() || before.size > maximumBytes) {
    throw new Error("worker_input_limit_exceeded");
  }
  const canonical = await realpath(source);
  if (!isWithin(allowedRoot, canonical)) throw new Error("folder_traversal_denied");
  const input = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
  const output = await open(
    destination,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
    0o400,
  );
  try {
    const opened = await input.stat();
    if (
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      (await realpath(source)) !== canonical ||
      !isWithin(allowedRoot, canonical)
    ) {
      throw new Error("input_changed");
    }
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let total = 0;
    while (true) {
      const { bytesRead } = await input.read(buffer, 0, buffer.length);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maximumBytes) throw new Error("worker_input_limit_exceeded");
      await output.writeFile(buffer.subarray(0, bytesRead));
    }
    await output.sync();
    return total;
  } finally {
    await Promise.all([input.close(), output.close()]);
  }
}

export class AgentInputResolver {
  constructor(
    private readonly database: DatabasePort,
    private readonly store: AgentStore,
  ) {}

  async resolve(sessionId: string): Promise<ResolvedAgentInputs> {
    const session = sessionFolder(this.database, sessionId);
    if (session === undefined) throw new Error("session_not_found");
    if (session.revoked_at !== null) throw new Error("folder_grant_revoked");
    const selected = session.root_path === null ? [] : await folderFiles(session.root_path);
    const attachments = this.store.listAttachments(sessionId);
    if (selected.length + attachments.length > MAX_INPUTS)
      throw new Error("worker_input_limit_exceeded");
    const root = await mkdtemp(join(tmpdir(), `vault-inputs-${sessionId}-`));
    const files: AgentInputFile[] = [];
    const usedNames = new Set<string>();
    let total = 0;
    try {
      for (const [index, item] of selected.entries()) {
        const destination = join(root, `folder-${index}`);
        total += await copySnapshot(item.path, destination, item.root, MAX_INPUT_BYTES - total);
        appendInput(files, usedNames, destination, item.name);
      }
      for (const [index, item] of attachments.entries()) {
        const bytes = await this.store.attachmentBytes(item);
        total = addInputBytes(total, bytes.byteLength);
        const destination = join(root, `attachment-${index}`);
        const handle = await open(
          destination,
          constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
          0o400,
        );
        try {
          await handle.writeFile(bytes);
          await handle.sync();
        } finally {
          await handle.close();
        }
        appendInput(files, usedNames, destination, item.name);
      }
      return {
        files,
        async dispose() {
          await rm(root, { recursive: true, force: true });
        },
      };
    } catch (error) {
      await rm(root, { recursive: true, force: true });
      throw error;
    }
  }
}
