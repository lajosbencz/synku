#!/usr/bin/env tsx

import { Command } from 'commander';
import { chartCommand } from './commands/chart';
import { executeFile } from './commands/execute';

import * as pkg from '../../package.json';

const program = new Command();

program
  .name('synku')
  .description('TypeScript-first Kubernetes deployment tool with Helm chart integration')
  .version(pkg.version)
  .helpOption('-h, --help', 'Display help for command');

// Add chart command
program.addCommand(chartCommand);

// Handle file execution (default behavior when no subcommand is provided)
program
  .argument('[file]', 'TypeScript file to execute')
  .action(async (file?: string) => {
    if (!file) {
      program.help();
      return;
    }

    try {
      await executeFile(file);
    } catch (error) {
      console.error('Failed to execute file:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Enhanced help examples
program.addHelpText('after', `
Examples:
  Execute a TypeScript project file:
    $ synku ./project.ts

  Generate chart types from local chart:
    $ synku chart ./my-local-chart --name MyChart

  Generate with custom output:
    $ synku chart ./my-chart --name MyChart --output custom-chart.ts
`);

// Parse command line arguments
program.parse();
