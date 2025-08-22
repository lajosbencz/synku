import { promises as fs } from 'fs';
import path from 'path';
import { Command } from 'commander';
import { detectChartSource, ChartFetcherFactory } from '../../helm/fetcher';
import { TypeScriptGenerator } from '../../helm/generator';
import { FetchOptions } from '../../helm/types';

export const chartCommand = new Command('chart')
  .description('Generate TypeScript types from Helm chart')
  .argument('<source>', 'Chart source (OCI, HTTP, Git, or local path)')
  .requiredOption('--name <name>', 'Chart class name')
  .option('--chart-version <version>', 'Chart version')
  .option('--output <file>', 'Output file path (default: <name>-chart.ts)')
  .option('--username <user>', 'Registry username')
  .option('--password <pass>', 'Registry password')
  .option('--registry-config <file>', 'OCI registry config file')
  .option('--insecure', 'Allow insecure registry connections')
  .addHelpText('after', `
Examples:
  Generate types from OCI registry:
    $ synku chart oci://registry-1.docker.io/bitnamicharts/postgresql --name PostgreSQL

  Generate types from HTTP URL:
    $ synku chart https://charts.bitnami.com/bitnami/nginx-15.1.0.tgz --name Nginx

  Generate types from local chart:
    $ synku chart ./local-chart --name LocalChart

  Generate with custom options:
    $ synku chart oci://registry/chart --name MyChart --chart-version 1.0.0 --output my-chart.ts
`)
  .action(async (source: string, options: ChartCommandOptions) => {
    const { name, chartVersion, output, username, password, registryConfig, insecure } = options;

    const outputFile = output || `${name.toLowerCase()}-chart.ts`;

    const fetchOptions: FetchOptions = {
      version: chartVersion,
      username,
      password,
      registryConfig,
      insecure,
    };

    try {
      console.log(`Fetching chart from: ${source}`);

      // Detect chart source and fetch
      const chartSource = detectChartSource(source);
      const fetcher = ChartFetcherFactory.create(chartSource.type);
      const fetchResult = await fetcher.fetch(chartSource, fetchOptions);
      const chartPath = fetchResult.chartDir;

      console.log(`Chart fetched to: ${chartPath}`);
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

      // Cleanup temporary files
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
  chartVersion?: string;
  output?: string;
  username?: string;
  password?: string;
  registryConfig?: string;
  insecure?: boolean;
}
