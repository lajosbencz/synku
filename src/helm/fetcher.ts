import { promises as fs } from 'fs';
import path from 'path';
import { ChartSourceType, FetchOptions, ChartSource } from './types';

export function detectChartSource(url: string): ChartSource {
  return { type: ChartSourceType.LOCAL, url };
}

export interface FetchResult {
  tempDir?: string;
  chartDir: string;
}

export interface ChartFetcher {
  fetch(source: ChartSource, options: FetchOptions): Promise<FetchResult>;
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
    if (sourceType === ChartSourceType.LOCAL) {
      return new LocalChartFetcher();
    }
    throw new Error(`Unsupported chart source type: ${sourceType}`);
  }
}
