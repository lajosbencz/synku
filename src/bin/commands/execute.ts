import { spawn } from 'child_process';
import path from 'path';

export async function executeFile(file: string): Promise<void> {
  // Find tsx binary - it should be in node_modules/.bin relative to our package
  // In the compiled lib directory, we need to go up to find node_modules
  const tsxBinary = path.resolve(__dirname, '../../../node_modules/.bin/tsx');

  // Resolve the user file path
  const userFile = path.resolve(process.cwd(), file);

  // Execute the TypeScript file using tsx
  const child = spawn(tsxBinary, [userFile], {
    stdio: 'inherit',
    env: process.env,
  });

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        process.exit(code || 1);
      }
    });

    child.on('error', (error) => {
      console.error('Failed to execute file:', error.message);
      reject(error);
    });
  });
}
