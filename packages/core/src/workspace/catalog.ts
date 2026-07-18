import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

export interface WorkspaceCatalog {
  database: Database.Database;
  schemaVersion: number;
  close(): void;
}

function lockOwner(path: string): number | undefined {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) return undefined;
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  const buffer = Buffer.alloc(32);
  const count = readSync(descriptor, buffer, 0, buffer.length, 0);
  closeSync(descriptor);
  const pid = Number.parseInt(buffer.subarray(0, count).toString("utf8"), 10);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function requireOwnedPath(path: string, kind: "directory" | "file"): void {
  const state = lstatSync(path);
  const expectedKind = kind === "directory" ? state.isDirectory() : state.isFile();
  const wrongOwner = process.getuid !== undefined && state.uid !== process.getuid();
  const linkedFile = kind === "file" && state.nlink !== 1;
  if (!expectedKind || state.isSymbolicLink() || wrongOwner || linkedFile) {
    throw new Error(`workspace_${kind}_unsafe`);
  }
}

function secureInternalRoot(path: string): void {
  try {
    mkdirSync(path, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  requireOwnedPath(path, "directory");
  chmodSync(path, 0o700);
}

function acquireWriterLock(path: string): number {
  try {
    const flags = constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW;
    const descriptor = openSync(path, flags, 0o600);
    writeFileSync(descriptor, `${process.pid}\n`, { encoding: "utf8" });
    return descriptor;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const owner = lockOwner(path);
    if (owner === undefined || processExists(owner)) throw new Error("workspace_busy");
    unlinkSync(path);
    return acquireWriterLock(path);
  }
}

function migrate(
  database: Database.Database,
  databasePath: string,
  catalogExisted: boolean,
): number {
  const current = database.pragma("user_version", { simple: true }) as number;
  if (current > 1) throw new Error(`Unsupported workspace schema version ${current}.`);
  if (current === 1) return current;
  if (catalogExisted) {
    const backup = `${databasePath}.pre-migration-v${current}-${Date.now()}.bak`;
    database.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  }
  const migrationPath = fileURLToPath(new URL("./migrations/0001-initial.sql", import.meta.url));
  const migration = readFileSync(migrationPath, "utf8");
  database.transaction(() => database.exec(migration))();
  return database.pragma("user_version", { simple: true }) as number;
}

export function openWorkspaceCatalog(workspaceRoot: string): WorkspaceCatalog {
  const internalRoot = join(workspaceRoot, ".vault");
  secureInternalRoot(internalRoot);
  const databasePath = join(internalRoot, "catalog.sqlite");
  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    const candidate = `${databasePath}${suffix}`;
    if (existsSync(candidate)) requireOwnedPath(candidate, "file");
  }
  const lockPath = join(internalRoot, "writer.lock");
  const lockDescriptor = acquireWriterLock(lockPath);
  const catalogExisted = existsSync(databasePath) && lstatSync(databasePath).size > 0;
  let database: Database.Database | undefined;
  try {
    database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = FULL");
    const schemaVersion = migrate(database, databasePath, catalogExisted);
    let closed = false;
    return {
      database,
      schemaVersion,
      close() {
        if (closed) return;
        closed = true;
        database?.close();
        closeSync(lockDescriptor);
        unlinkSync(lockPath);
      },
    };
  } catch (error) {
    database?.close();
    closeSync(lockDescriptor);
    unlinkSync(lockPath);
    throw error;
  }
}
