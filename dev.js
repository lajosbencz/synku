import { exec } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Generate a unique temp file path
const outputFile = join(process.cwd(), 'dev-output.yaml');

// Run your command
exec('node dist/cli/example.js', async (err, stdout, stderr) => {
  if (err) {
    console.error('Error:', stderr);
    process.exit(1);
  }

  await writeFile(outputFile, stdout);
  exec(`code --reuse-window "${outputFile}"`);
});
