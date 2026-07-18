import { createFacade, type VaultCore, type VaultCorePorts } from "./facade.js";

export function createVaultCoreHarness(ports: VaultCorePorts): VaultCore {
  return createFacade(ports);
}
