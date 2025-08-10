import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { ChartSourceType, FetchOptions, ChartSource } from './types';

export function detectChartSource(url: string): ChartSource {
  if (url.startsWith('oci://')) {
    return { type: ChartSourceType.OCI, url };
  }
  if (url.startsWith('git+')) {
    return { type: ChartSourceType.GIT, url };
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: ChartSourceType.HTTP, url };
  }
  return { type: ChartSourceType.LOCAL, url };
}

export interface FetchResult {
  tempDir?: string;
  chartDir: string;
}

export interface ChartFetcher {
  fetch(source: ChartSource, options: FetchOptions): Promise<FetchResult>;
}

export class OCIChartFetcher implements ChartFetcher {
  async fetch(source: ChartSource, options: FetchOptions): Promise<FetchResult> {
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), '.synku-temp-'));

    const args = ['pull', source.url];

    if (options.version) {
      args.push('--version', options.version);
    }

    args.push('--destination', tempDir, '--untar');

    if (options.username && options.password) {
      args.push('--username', options.username, '--password', options.password);
    }

    if (options.registryConfig) {
      args.push('--registry-config', options.registryConfig);
    }

    if (options.insecure) {
      args.push('--insecure-skip-tls-verify');
    }

    await this.executeHelm(args);

    // Find the extracted chart directory
    const files = await fs.readdir(tempDir);
    let chartDir: string | undefined;

    for (const file of files) {
      const stat = await fs.stat(path.join(tempDir, file));
      if (stat.isDirectory()) {
        chartDir = file;
        break;
      }
    }

    if (!chartDir) {
      throw new Error('Failed to extract chart from OCI registry');
    }

    return {
      tempDir,
      chartDir: path.join(tempDir, chartDir),
    };
  }

  private executeHelm(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const helm = spawn('helm', args, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stderr = '';
      helm.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      helm.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Helm command failed: ${stderr}`));
        }
      });

      helm.on('error', (error) => {
        reject(new Error(`Failed to execute helm: ${error.message}`));
      });
    });
  }
}

export class HTTPChartFetcher implements ChartFetcher {
  async fetch(source: ChartSource, options: FetchOptions): Promise<FetchResult> {
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), '.synku-temp-'));

    const args = ['pull', source.url];

    if (options.version) {
      args.push('--version', options.version);
    }

    args.push('--destination', tempDir, '--untar');

    await this.executeHelm(args);

    // Find the extracted chart directory
    const files = await fs.readdir(tempDir);
    let chartDir: string | undefined;

    for (const file of files) {
      const stat = await fs.stat(path.join(tempDir, file));
      if (stat.isDirectory()) {
        chartDir = file;
        break;
      }
    }

    if (!chartDir) {
      throw new Error('Failed to extract chart from HTTP source');
    }

    return {
      tempDir,
      chartDir: path.join(tempDir, chartDir),
    };
  }

  private executeHelm(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const helm = spawn('helm', args, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stderr = '';
      helm.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      helm.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Helm command failed: ${stderr}`));
        }
      });

      helm.on('error', (error) => {
        reject(new Error(`Failed to execute helm: ${error.message}`));
      });
    });
  }
}

export class GitChartFetcher implements ChartFetcher {
  async fetch(source: ChartSource, _options: FetchOptions): Promise<FetchResult> {
    // Parse git URL format: git+https://github.com/repo.git//path/to/chart
    const gitUrl = source.url.replace('git+', '');
    const [repoUrl, chartPath] = gitUrl.split('//');

    const tempDir = await fs.mkdtemp(path.join(process.cwd(), '.synku-temp-'));

    await this.executeGit(['clone', repoUrl, tempDir]);

    const fullChartPath = chartPath ? path.join(tempDir, chartPath) : tempDir;

    // Verify Chart.yaml exists
    const chartYamlPath = path.join(fullChartPath, 'Chart.yaml');
    try {
      await fs.access(chartYamlPath);
      return {
        tempDir,
        chartDir: fullChartPath,
      };
    } catch {
      throw new Error(`Chart.yaml not found at ${fullChartPath}`);
    }
  }

  private executeGit(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', args, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stderr = '';
      git.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git command failed: ${stderr}`));
        }
      });

      git.on('error', (error) => {
        reject(new Error(`Failed to execute git: ${error.message}`));
      });
    });
  }
}

export class LocalChartFetcher implements ChartFetcher {
  async fetch(source: ChartSource, _options: FetchOptions): Promise<FetchResult> {
    const chartPath = path.resolve(source.url);

    // Verify Chart.yaml exists
    const chartYamlPath = path.join(chartPath, 'Chart.yaml');
    try {
      await fs.access(chartYamlPath);
      return {
        chartDir: chartPath,
      };
    } catch {
      throw new Error(`Chart.yaml not found at ${chartPath}`);
    }
  }
}

export class ChartFetcherFactory {
  static create(sourceType: ChartSourceType): ChartFetcher {
    switch (sourceType) {
      case ChartSourceType.OCI:
        return new OCIChartFetcher();
      case ChartSourceType.HTTP:
        return new HTTPChartFetcher();
      case ChartSourceType.GIT:
        return new GitChartFetcher();
      case ChartSourceType.LOCAL:
        return new LocalChartFetcher();
      default:
        throw new Error(`Unsupported chart source type: ${sourceType}`);
    }
  }
}
