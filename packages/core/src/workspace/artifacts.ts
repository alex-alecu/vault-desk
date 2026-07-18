import { createHash } from "node:crypto";
import { type ContentHash, ContentHashSchema } from "@vault/shared";
import { ScopedFileSystem, type WorkspaceScope } from "./scope.js";

export class ArtifactStore {
  private constructor(private readonly files: ScopedFileSystem) {}

  static async create(scope: WorkspaceScope): Promise<ArtifactStore> {
    const files = new ScopedFileSystem(scope);
    await files.ensurePrivateDirectory(".vault");
    await files.ensurePrivateDirectory(".vault/artifacts");
    return new ArtifactStore(files);
  }

  async put(bytes: Uint8Array): Promise<ContentHash> {
    const digest = createHash("sha256").update(bytes).digest("hex");
    const hash = `sha256:${digest}` as ContentHash;
    const relativePath = `.vault/artifacts/${digest.slice(0, 2)}/${digest}`;
    await this.files.ensurePrivateDirectory(`.vault/artifacts/${digest.slice(0, 2)}`);
    try {
      await this.files.writeImmutable(relativePath, bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await this.files.read(relativePath);
      const existingDigest = createHash("sha256").update(existing).digest("hex");
      if (existingDigest !== digest) throw new Error("artifact_hash_mismatch");
    }
    return hash;
  }

  async read(hash: ContentHash): Promise<Buffer> {
    const digest = ContentHashSchema.parse(hash).slice("sha256:".length);
    const bytes = await this.files.read(`.vault/artifacts/${digest.slice(0, 2)}/${digest}`);
    if (createHash("sha256").update(bytes).digest("hex") !== digest) {
      throw new Error("artifact_hash_mismatch");
    }
    return bytes;
  }
}
