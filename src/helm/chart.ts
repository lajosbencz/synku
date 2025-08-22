import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';
import { Component, IComponent } from '../component';
import { detectChartSource, ChartFetcherFactory } from './fetcher';
import { FetchOptions } from './types';

export class Chart<TValues = any> extends Component {
  private tempPath?: string;
  private chartPath?: string;
  private rendered = false;

  constructor(
    private chartUrl: string,
    private values: TValues,
    name?: string,
    parent?: IComponent,
    private namespace: string = 'default',
  ) {
    super(parent, name || 'chart');
  }

  private async fetchAndRender(): Promise<void> {
    // Fetch the chart
    const source = detectChartSource(this.chartUrl);
    const fetcher = ChartFetcherFactory.create(source.type);
    const options: FetchOptions = {}; // Could be extended to pass auth options

    const fetchResult = await fetcher.fetch(source, options);
    this.chartPath = fetchResult.chartDir;
    this.tempPath = fetchResult.tempDir;

    // Render the chart templates
    await this.renderChart();
  }

  private async renderChart(): Promise<void> {
    if (!this.chartPath) {
      throw new Error('Chart not fetched yet');
    }

    // Create temporary values file
    const tempValuesPath = path.join(this.chartPath, '.synku-values.yaml');
    const valuesYaml = stringify(this.values, {
      version: '1.1',
      schema: 'yaml-1.1',
    });
    await fs.writeFile(tempValuesPath, valuesYaml);

    try {
      // Execute helm template
      const manifestsYaml = await this.executeHelmTemplate(this.chartPath, tempValuesPath);

      // Parse and add resources
      await this.parseAndAddResources(manifestsYaml);
    } finally {
      // Clean up temporary values file
      try {
        await this.cleanup();
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private executeHelmTemplate(chartPath: string, valuesPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'template',
        this.fullName,
        chartPath,
        '--values', valuesPath,
        '--namespace', this.namespace,
        '--include-crds',
      ];

      const helm = spawn('helm', args, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      helm.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      helm.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      helm.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Helm template failed: ${stderr}`));
        }
      });

      helm.on('error', (error) => {
        reject(new Error(`Failed to execute helm: ${error.message}`));
      });
    });
  }

  private async parseAndAddResources(manifestsYaml: string): Promise<void> {
    // Split YAML documents
    const documents = manifestsYaml
      .split(/^---$/m)
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0);

    for (const doc of documents) {
      try {
        const manifest = parse(doc, {
          version: '1.1',
        });
        if (manifest && manifest.kind && manifest.apiVersion) {
          // Try to find the corresponding kubernetes-models class
          const manifestClass = this.findKubernetesModelClass(manifest.apiVersion, manifest.kind);
          if (manifestClass) {
            this.manifest(manifestClass, manifest);
          } else {
            // Fall back to raw object if no typed class found
            this.manifest(Object, manifest);
          }
        }
      } catch (error) {
        console.warn(`Failed to parse manifest: ${error}`);
      }
    }
  }

  private findKubernetesModelClass(apiVersion: string, kind: string): any {
    try {
      // Dynamic import based on apiVersion and kind
      // This is a simplified approach - in reality you'd want a more robust mapping
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const _k8s = require('kubernetes-models');

      if (apiVersion.includes('/')) {
        let [group, version] = apiVersion.split('/');
        group = group.replace(/[.]([a-z])/g, (_, sub1) => `${sub1.toUpperCase()}`);
        return _k8s[group]?.[version]?.[kind];
      } else {
        // Core API
        return _k8s[apiVersion]?.[kind];
      }
    } catch {
      return null;
    }
  }

  // Override synth to ensure chart is rendered
  async synth(): Promise<[IComponent, any[]][]> {
    if (!this.rendered) {
      await this.fetchAndRender();
    }
    return super.synth();
  }

  // Cleanup method
  private async cleanup(): Promise<void> {
    if (this.tempPath) {
      try {
        await fs.rm(this.tempPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
