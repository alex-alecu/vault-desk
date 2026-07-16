const response = { protocolVersion: 1, status: "ok", capability: "fixed-sidecar" } as const;

if (process.argv.length !== 2) {
  process.stderr.write("This capability fixture accepts no arguments.\n");
  process.exitCode = 64;
} else {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}
