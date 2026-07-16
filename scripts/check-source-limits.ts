import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set([
  ".git",
  ".generated",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "target",
]);
const checkedExtensions = new Set([".rs", ".ts", ".tsx"]);
const maximumLines = 300;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.isFile() && checkedExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

async function overLimit(path: string): Promise<string | undefined> {
  const text = await readFile(path, "utf8");
  const lineCount = text === "" ? 0 : text.split(/\r?\n/u).length;
  if (lineCount <= maximumLines) return undefined;
  return `${relative(root, path)}: ${lineCount} lines (maximum ${maximumLines})`;
}

const failures = (await Promise.all((await sourceFiles(root)).map(overLimit))).filter(
  (failure): failure is string => failure !== undefined,
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Source limit passed (${maximumLines} lines per hand-written source file).`);
}
