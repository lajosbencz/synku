import path from 'path';
import { write } from '../../writer';

export async function executeFile(file: string): Promise<void> {
  try {
    // Resolve the user file path
    const userFile = path.resolve(process.cwd(), file);

    // Dynamically import the file
    const module = await import(userFile);
    
    // Get the default export
    const importedComponent = module.default;
    
    // Verify it's an IComponent
    if (!importedComponent || typeof importedComponent.synth !== 'function') {
      throw new Error('Default export must be an IComponent with a synth() method');
    }

    // Process the component
    const synth = await importedComponent.synth();
    write(synth, process.stdout);
  } catch (error) {
    console.error('Failed to execute file:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
