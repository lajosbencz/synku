import { promises as fs } from 'fs';
import path from 'path';
import { Command } from 'commander';
import { detectChartSource, ChartFetcherFactory } from '../../helm/fetcher';
import { TypeScriptGenerator } from '../../helm/generator';
import { FetchOptions } from '../../helm/types';

export const chartCommand = new Command('chart')
  .description('Generate TypeScript types from local Helm chart')
  .argument('<source>', 'Local chart path')
  .requiredOption('--name <name>', 'Chart class name')
  .option('--output <file>', 'Output file path (default: <name>-chart.ts)')
  .addHelpText('after', `
Examples:
  Generate types from local chart:
    $ synku chart ./local-chart --name LocalChart

  Generate with custom output:
    $ synku chart ./my-chart --name MyChart --output my-chart.ts
`)
  .action(async (source: string, options: ChartCommandOptions) => {
    const { name, output } = options;

    const outputFile = output || `${name.toLowerCase()}-chart.ts`;

    const fetchOptions: FetchOptions = {
      outputPath: outputFile,
    };

    try {
      console.log(`Processing local chart: ${source}`);

      // Detect chart source and fetch
      const chartSource = detectChartSource(source);
      const fetcher = ChartFetcherFactory.create(chartSource.type);
      const fetchResult = await fetcher.fetch(chartSource, fetchOptions);
      const chartPath = fetchResult.chartDir;

      console.log(`Chart loaded from: ${chartPath}`);
      console.log('Generating TypeScript types...');

      // Generate TypeScript types
      const generator = new TypeScriptGenerator();
      const chartInfo = await generator.generateChartTypes(chartPath, name, source);

      // Write to output file
      await fs.writeFile(outputFile, chartInfo.source);

      console.log(`Generated chart class: ${chartInfo.className}`);
      console.log(`Output written to: ${outputFile}`);
      console.log('');
      console.log('Usage example:');
      console.log(`import { ${chartInfo.className} } from './${path.basename(outputFile, '.ts')}';`);
      console.log('');
      console.log(`const chart = new ${chartInfo.className}({`);
      console.log('  // Chart values here');
      console.log('});');

      // Cleanup temporary files (not needed for local charts, but keeping for consistency)
      if (fetchResult.tempDir) {
        await fs.rm(fetchResult.tempDir, { recursive: true, force: true });
      }

    } catch (error) {
      console.error('Error generating chart:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

interface ChartCommandOptions {
  name: string;
  output?: string;
}
