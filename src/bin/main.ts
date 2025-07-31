import path from 'path';
import { pathToFileURL } from 'url';
import { Release } from '../core/index.js';
import { yaml } from '../writer/index.js';

async function executeUserFile(filePath: string): Promise<Release> {
  const absPath = path.resolve(process.cwd(), filePath);

  const userModule = await import(pathToFileURL(absPath).href);
  const exportedFunction = userModule.default;

  if (typeof exportedFunction !== 'function') {
    throw new Error('User file must export a default function that returns a Release instance');
  }

  const result = await exportedFunction();

  if (!result || typeof result.synth !== 'function') {
    throw new Error('Exported function must return a Release instance');
  }

  return result;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: synku <file.ts>');
  }

  const release = await executeUserFile(file);
  const manifests = release.synth();
  yaml(manifests, process.stdout);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
