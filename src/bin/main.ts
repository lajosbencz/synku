#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: synku <file.ts>');
    process.exit(1);
  }

  // Find tsx binary - it should be in node_modules/.bin relative to our package
  // In the compiled lib directory, we need to go up to find node_modules
  const tsxBinary = path.resolve(__dirname, '../../node_modules/.bin/tsx');

  // Resolve the user file path
  const userFile = path.resolve(process.cwd(), file);

  // Execute the TypeScript file using tsx
  const child = spawn(tsxBinary, [userFile], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });

  child.on('error', (error) => {
    console.error('Failed to execute file:', error.message);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
