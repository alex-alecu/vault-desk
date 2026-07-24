import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encodeFrame, FrameDecoder } from "./ipc.js";

function shutdownFrame() {
  return {
    protocolVersion: 3 as const,
    requestId: randomUUID(),
    operation: "shutdown" as const,
  };
}

describe("persistent agent frame decoder", () => {
  it("decodes fragmented and adjacent protocol-v3 frames", () => {
    const first = shutdownFrame();
    const second = shutdownFrame();
    const encoded = Buffer.concat([encodeFrame(first), encodeFrame(second)]);
    const decoder = new FrameDecoder();

    expect(decoder.push(encoded.subarray(0, 2))).toEqual([]);
    expect(decoder.push(encoded.subarray(2, 11))).toEqual([]);
    expect(decoder.push(encoded.subarray(11))).toEqual([first, second]);
  });

  it("rejects zero-length and oversized frames before buffering payloads", () => {
    const zero = Buffer.alloc(4);
    const oversized = Buffer.alloc(4);
    oversized.writeUInt32BE(193 * 1024 * 1024);

    expect(() => new FrameDecoder().push(zero)).toThrow("Invalid worker frame length");
    expect(() => new FrameDecoder().push(oversized)).toThrow("Invalid worker frame length");
  });
});
