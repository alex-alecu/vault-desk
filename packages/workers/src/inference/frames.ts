import {
  type InferenceWorkerRequest,
  InferenceWorkerRequestSchema,
  type InferenceWorkerResponse,
  InferenceWorkerResponseSchema,
} from "@vault/shared";

const HEADER_BYTES = 4;
const MAX_FRAME_BYTES = 1024 * 1024;

function encode(value: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(value));
  if (payload.length === 0 || payload.length > MAX_FRAME_BYTES) {
    throw new Error("Invalid inference frame length.");
  }
  const frame = Buffer.allocUnsafe(HEADER_BYTES + payload.length);
  frame.writeUInt32BE(payload.length, 0);
  payload.copy(frame, HEADER_BYTES);
  return frame;
}

export function encodeInferenceRequest(request: InferenceWorkerRequest): Buffer {
  return encode(InferenceWorkerRequestSchema.parse(request));
}

export function encodeInferenceResponse(response: InferenceWorkerResponse): Buffer {
  return encode(InferenceWorkerResponseSchema.parse(response));
}

export class InferenceResponseDecoder {
  private pending = Buffer.alloc(0);

  push(chunk: Buffer): InferenceWorkerResponse[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const responses: InferenceWorkerResponse[] = [];
    while (this.pending.length >= HEADER_BYTES) {
      const length = this.pending.readUInt32BE(0);
      if (length === 0 || length > MAX_FRAME_BYTES) {
        throw new Error("Invalid inference frame length.");
      }
      if (this.pending.length < HEADER_BYTES + length) break;
      const payload = this.pending.subarray(HEADER_BYTES, HEADER_BYTES + length);
      responses.push(InferenceWorkerResponseSchema.parse(JSON.parse(payload.toString("utf8"))));
      this.pending = this.pending.subarray(HEADER_BYTES + length);
    }
    return responses;
  }

  finish(): void {
    if (this.pending.length !== 0) throw new Error("Incomplete inference frame.");
  }
}

export async function readInferenceRequest(): Promise<InferenceWorkerRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const frame = Buffer.concat(chunks);
  if (frame.length < HEADER_BYTES) throw new Error("Incomplete inference frame.");
  const length = frame.readUInt32BE(0);
  if (length === 0 || length > MAX_FRAME_BYTES || frame.length !== HEADER_BYTES + length) {
    throw new Error("Invalid inference frame length.");
  }
  return InferenceWorkerRequestSchema.parse(
    JSON.parse(frame.subarray(HEADER_BYTES).toString("utf8")),
  );
}
