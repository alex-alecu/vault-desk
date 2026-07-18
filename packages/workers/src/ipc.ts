import { type WorkerFrame, WorkerFrameSchema } from "@vault/shared";

const HEADER_BYTES = 4;
const MAX_FRAME_BYTES = 1024 * 1024;

export function encodeFrame(frame: WorkerFrame): Buffer {
  const payload = Buffer.from(JSON.stringify(WorkerFrameSchema.parse(frame)));
  if (payload.length > MAX_FRAME_BYTES) throw new Error("Worker frame exceeds size limit.");
  const encoded = Buffer.allocUnsafe(HEADER_BYTES + payload.length);
  encoded.writeUInt32BE(payload.length, 0);
  payload.copy(encoded, HEADER_BYTES);
  return encoded;
}

export function decodeFrame(encoded: Buffer): WorkerFrame {
  if (encoded.length < HEADER_BYTES) throw new Error("Incomplete worker frame header.");
  const length = encoded.readUInt32BE(0);
  if (length === 0 || length > MAX_FRAME_BYTES || encoded.length !== length + HEADER_BYTES) {
    throw new Error("Invalid worker frame length.");
  }
  return WorkerFrameSchema.parse(JSON.parse(encoded.subarray(HEADER_BYTES).toString("utf8")));
}

export class FrameDecoder {
  private pending = Buffer.alloc(0);

  push(chunk: Buffer): WorkerFrame[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const frames: WorkerFrame[] = [];
    while (this.pending.length >= HEADER_BYTES) {
      const length = this.pending.readUInt32BE(0);
      if (length === 0 || length > MAX_FRAME_BYTES) throw new Error("Invalid worker frame length.");
      if (this.pending.length < HEADER_BYTES + length) break;
      frames.push(decodeFrame(this.pending.subarray(0, HEADER_BYTES + length)));
      this.pending = this.pending.subarray(HEADER_BYTES + length);
    }
    return frames;
  }
}
