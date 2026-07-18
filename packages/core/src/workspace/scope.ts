import { constants } from "node:fs";
import { chmod, link, lstat, mkdir, open, realpath, rename, stat, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

function inside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export class WorkspaceScope {
  private constructor(readonly root: string) {}

  static async create(rootPath: string): Promise<WorkspaceScope> {
    const requested = resolve(rootPath);
    try {
      const state = await lstat(requested);
      if (!state.isDirectory() || state.isSymbolicLink()) throw new Error("path_out_of_scope");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(requested, { mode: 0o700 });
    }
    const canonical = await realpath(requested);
    return new WorkspaceScope(canonical);
  }

  resolve(path: string): string {
    if (path.includes("\0")) throw new Error("path_out_of_scope");
    const candidate = resolve(this.root, path);
    if (!inside(this.root, candidate)) throw new Error("path_out_of_scope");
    return candidate;
  }
}

export interface ScopedFileSnapshot {
  path: string;
  canonicalPath: string;
  device: number;
  inode: number;
}

export class ScopedFileSystem {
  constructor(private readonly scope: WorkspaceScope) {}

  async ensurePrivateDirectory(path: string): Promise<void> {
    const destination = this.scope.resolve(path);
    const parent = await realpath(join(destination, ".."));
    if (this.scope.resolve(parent) !== parent) throw new Error("path_out_of_scope");
    try {
      await mkdir(destination, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const state = await lstat(destination);
    const wrongOwner = process.getuid !== undefined && state.uid !== process.getuid();
    if (!state.isDirectory() || state.isSymbolicLink() || wrongOwner) {
      throw new Error("path_out_of_scope");
    }
    if ((await realpath(destination)) !== destination) throw new Error("path_out_of_scope");
    await chmod(destination, 0o700);
  }

  async snapshot(path: string): Promise<ScopedFileSnapshot> {
    const scopedPath = this.scope.resolve(path);
    const state = await lstat(scopedPath);
    if (!state.isFile() || state.isSymbolicLink()) throw new Error("path_out_of_scope");
    const canonical = await realpath(scopedPath);
    if (this.scope.resolve(canonical) !== canonical) throw new Error("path_out_of_scope");
    return { path: scopedPath, canonicalPath: canonical, device: state.dev, inode: state.ino };
  }

  async read(path: string): Promise<Buffer> {
    return await this.readSnapshot(await this.snapshot(path));
  }

  async readSnapshot(snapshot: ScopedFileSnapshot): Promise<Buffer> {
    const handle = await open(snapshot.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = await handle.stat();
      const after = await stat(snapshot.path);
      if (
        opened.dev !== snapshot.device ||
        opened.ino !== snapshot.inode ||
        opened.ino !== after.ino
      ) {
        throw new Error("path_changed");
      }
      if ((await realpath(snapshot.path)) !== snapshot.canonicalPath)
        throw new Error("path_changed");
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  }

  async writeAtomic(path: string, bytes: Uint8Array): Promise<void> {
    const destination = this.scope.resolve(path);
    const parent = await realpath(join(destination, ".."));
    if (this.scope.resolve(parent) !== parent) throw new Error("path_out_of_scope");
    try {
      if ((await lstat(destination)).isSymbolicLink()) throw new Error("path_out_of_scope");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const temporary = join(parent, `.${process.pid}-${crypto.randomUUID()}.tmp`);
    const handle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temporary, destination);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    await syncDirectory(parent);
  }

  async writeImmutable(path: string, bytes: Uint8Array): Promise<void> {
    const destination = this.scope.resolve(path);
    const parent = await realpath(join(destination, ".."));
    if (this.scope.resolve(parent) !== parent) throw new Error("path_out_of_scope");
    const temporary = join(parent, `.${process.pid}-${crypto.randomUUID()}.tmp`);
    const handle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await link(temporary, destination);
      await syncDirectory(parent);
    } finally {
      await unlink(temporary).catch(() => undefined);
      await syncDirectory(parent);
    }
  }
}
