import { type FileHandle, open, unlink } from "node:fs/promises";

const COPY_BUFFER_BYTES = 64 * 1024;

export function launchSignal(signal: AbortSignal | undefined, wallTimeMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(wallTimeMs);
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
}

async function writeAll(
  output: FileHandle,
  buffer: Buffer,
  length: number,
  signal: AbortSignal,
): Promise<void> {
  let offset = 0;
  while (offset < length) {
    signal.throwIfAborted();
    const { bytesWritten } = await output.write(buffer, offset, length - offset);
    if (bytesWritten === 0) throw new Error("worker_input_write_failed");
    offset += bytesWritten;
  }
}

export async function copyBoundedInput(
  source: string,
  destination: string,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<number> {
  signal.throwIfAborted();
  const input = await open(source, "r");
  try {
    const output = await open(destination, "wx", 0o600);
    let copied = 0;
    const buffer = Buffer.allocUnsafe(COPY_BUFFER_BYTES);
    try {
      while (true) {
        signal.throwIfAborted();
        const { bytesRead } = await input.read(buffer, 0, buffer.length);
        if (bytesRead === 0) break;
        if (copied + bytesRead > maximumBytes) throw new Error("worker_input_limit_exceeded");
        await writeAll(output, buffer, bytesRead, signal);
        copied += bytesRead;
      }
      await output.sync();
      return copied;
    } catch (error) {
      await output.close();
      await unlink(destination).catch(() => undefined);
      throw error;
    } finally {
      await output.close().catch(() => undefined);
    }
  } finally {
    await input.close();
  }
}
