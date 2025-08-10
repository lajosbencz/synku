export interface FetchOptions {
  version?: string;
  username?: string;
  password?: string;
  registryConfig?: string;
  insecure?: boolean;
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
  OCI = 'oci',
  HTTP = 'http',
  GIT = 'git',
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
