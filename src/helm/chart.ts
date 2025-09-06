import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { IComponent, UserComponent } from '../component';
import { DeepPartial } from '../types';

export interface ChartOptions<TValues = any> {
  chartPath: string;
  namespace: string;
  values: TValues;
}

export class Chart<TValues = any> extends UserComponent<ChartOptions<TValues>> {
  private _isRendered = false;

  constructor(
    parent: IComponent,
    chartPath: string,
    namespace: string,
    name: string,
    values: TValues,
  ) {
    super(parent, name, { chartPath, namespace, values });
  }

  protected optionsDefaults(): DeepPartial<ChartOptions<TValues>> {
    return {};
  }

  protected init(): void {
    // Chart rendering will be done lazily when manifests are needed
    // since init() must be synchronous but helm templating is async
  }

  /**
   * Render the Helm chart and add manifests to this component
   */
  public async render(): Promise<void> {
    await this.renderChart();
  }

  /**
   * Override findAll to ensure chart is rendered before returning manifests
   */
  public findAll<T extends any>(type?: any): DeepPartial<T>[] {
    // If not rendered yet, we can't return manifests synchronously
    // The user should call render() first or use the async version
    if (!this._isRendered) {
      throw new Error(`Failed to findAll , chart ${this} with name ${this.name} has not been rendered yet.`);
    }
    return super.findAll(type);
  }

  /**
   * Async version of findAll that ensures chart is rendered
   */
  public async findAllAsync<T extends any>(type?: any): Promise<DeepPartial<T>[]> {
    await this.renderChart();
    return super.findAll(type);
  }

  private async renderChart(): Promise<void> {
    if (this._isRendered) {
      return;
    }
    this._isRendered = true;
    const { chartPath, namespace, values } = this.options;

    // Validate chart path exists and has Chart.yaml
    const chartYamlPath = path.join(chartPath, 'Chart.yaml');
    try {
      await fs.access(chartYamlPath);
    } catch {
      throw new Error(`Chart.yaml not found at ${chartPath}`);
    }

    // Create temporary values file
    const tempValuesFile = path.join(process.cwd(), `.synku-values-${this.name}.yaml`);
    try {
      const valuesYaml = yaml.stringify(values);
      await fs.writeFile(tempValuesFile, valuesYaml);

      // Run helm template to render the chart
      const renderedYaml = await this.executeHelmTemplate(chartPath, tempValuesFile, namespace);

      // Parse and add manifests
      this.parseAndAddManifests(renderedYaml);

    } finally {
      // Clean up temporary values file
      try {
        await fs.unlink(tempValuesFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private executeHelmTemplate(chartPath: string, valuesFile: string, namespace: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'template',
        this.name,
        chartPath,
        '--values', valuesFile,
        '--namespace', namespace,
        '--include-crds',
      ];

      const helm = spawn('helm', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
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

  private parseAndAddManifests(renderedYaml: string): void {
    // Split YAML documents by '---' separator
    const documents = renderedYaml
      .split(/^---$/m)
      .map(doc => doc.trim())
      .filter(doc => doc.length > 0);

    for (const doc of documents) {
      const manifest = yaml.parse(doc);

      // Skip empty documents or documents without kind
      if (!manifest || !manifest.kind) {
        continue;
      }

      // Add the manifest to this component
      this.addManifest(manifest);
    }
  }

  private addManifest(manifest: any): void {
    // Add manifest as a draft to the component
    // We create a constructor function for the manifest
    const ManifestConstructor = function (this: any, data: any) {
      Object.assign(this, data);
    } as any;

    this.draft(ManifestConstructor, manifest);
  }
}
