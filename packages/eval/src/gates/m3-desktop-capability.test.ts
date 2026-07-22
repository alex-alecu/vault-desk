import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("M3 desktop capability surface", () => {
  it("authorizes window dragging without broader plugin access", async () => {
    const path = join(process.cwd(), "packages/desktop/src-tauri/capabilities/default.json");
    const capability = JSON.parse(await readFile(path, "utf8")) as { permissions: string[] };

    expect(capability.permissions).toEqual(["core:default", "core:window:allow-start-dragging"]);
  });
});
