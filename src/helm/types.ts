export interface FetchOptions {
  outputPath?: string;
}

export interface ChartMetadata {
  name: string;
  version: string;
  description?: string;
  home?: string;
  sources?: string[];
  dependencies?: ChartDependency[];
}

export interface ChartDependency {
  name: string;
  version: string;
  repository?: string;
}

export enum ChartSourceType {
  LOCAL = 'local',
}

export interface ChartSource {
  type: ChartSourceType;
  url: string;
  version?: string;
}

export interface GeneratedChartInfo {
  interfaceName: string;
  className: string;
  source: string;
  metadata: ChartMetadata;
}
