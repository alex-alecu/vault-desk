import { fetchModel, readCanonicalModelManifest } from "../models.js";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (index === -1 || value === undefined) {
    throw new Error(`Pass ${name} <value>.`);
  }
  return value;
}

const modelId = argument("--id");
const destination = argument("--destination");
const manifest = await readCanonicalModelManifest();
const model = manifest.models.find((candidate) => candidate.id === modelId);
if (model === undefined) throw new Error(`Unknown canonical model: ${modelId}`);
await fetchModel(model, destination);
console.log(JSON.stringify({ modelId, destination, sha256: model.sha256 }));
