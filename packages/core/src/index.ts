export { AuditLog } from "./audit/log.js";
export { createVaultCore, type VaultCoreOptions } from "./compose.js";
export { daemonEndpoint, startDaemon, type VaultDaemon } from "./daemon/server.js";
export type { VaultCore, VaultCorePorts } from "./facade.js";
export { createVaultCoreHarness } from "./harness.js";
export { ArtifactStore } from "./workspace/artifacts.js";
export { ScopedFileSystem, WorkspaceScope } from "./workspace/scope.js";
