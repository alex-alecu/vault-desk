import { accessSync, constants, lstatSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";

export interface InspectedFolderGrant {
  canonicalPath: string;
  displayName: string;
}

export function inspectFolderGrant(rootPath: string): InspectedFolderGrant {
  try {
    if (rootPath.includes("\0")) throw new Error("folder_grant_invalid");
    const requested = resolve(rootPath);
    const state = lstatSync(requested);
    if (!state.isDirectory() || state.isSymbolicLink()) throw new Error("folder_grant_invalid");
    const canonicalPath = realpathSync.native(requested);
    accessSync(canonicalPath, constants.R_OK);
    const displayName = basename(canonicalPath);
    if (displayName.length === 0) throw new Error("folder_grant_invalid");
    return { canonicalPath, displayName };
  } catch {
    throw new Error("folder_grant_invalid");
  }
}
