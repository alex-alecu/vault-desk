import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface NativeProbe {
  networkDeviceCount: number;
  socketDeviceCount: number;
  guest: {
    nonLoopbackNetworkDeviceCount: number;
    protocolVersion: number;
    status: string;
    transport: string;
  };
}

interface HcsConfiguration {
  VirtualMachine: { Devices: Record<string, unknown> };
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 180_000 });
  if (result.status !== 0)
    throw new Error(result.error?.message ?? result.stderr ?? `${command} failed`);
  return result.stdout.trim();
}

function compile(executable: string, source: string): void {
  const windowsRoot = process.env.WINDIR ?? "C:\\Windows";
  const compiler = join(windowsRoot, "Microsoft.NET/Framework64/v4.0.30319/csc.exe");
  run(compiler, ["/nologo", "/optimize+", "/warnaserror+", `/out:${executable}`, source]);
}

export async function runNativeWindowsProbe(
  kernel: string,
  initramfs: string,
): Promise<NativeProbe> {
  const probeRoot = fileURLToPath(new URL(".", import.meta.url));
  const generatedRoot = join(probeRoot, ".generated");
  await mkdir(generatedRoot, { recursive: true });
  const executable = join(generatedRoot, "hcs-config-probe.exe");
  compile(executable, join(probeRoot, "probe.windows.cs"));
  const configuration = JSON.parse(
    run(executable, ["--print-configuration", kernel, initramfs]),
  ) as HcsConfiguration;
  if ("NetworkAdapters" in configuration.VirtualMachine.Devices) {
    throw new Error("HCS probe configuration unexpectedly contains a network adapter section.");
  }
  const output = run(executable, [kernel, initramfs]);
  return JSON.parse(output) as NativeProbe;
}
