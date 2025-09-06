import { readFileSync } from 'fs';
import { parse } from 'yaml';

export const DEFAULT_CONFIG_PATH = 'synku.yaml';
export const ENV_CONFIG_PATH = 'SYNKU_CONFIG';

export const DefaultConfigPath = process.env[ENV_CONFIG_PATH] ?? DEFAULT_CONFIG_PATH;

export interface ConfigChart {
  url: string;
  name: string;
  version?: string;
  output?: string;
}

export interface Config {
  entry: string;
  context?: Record<string, any>;
  charts?: ConfigChart[];
}

export const DefaultConfig = {
  entry: 'synku.ts',
  context: {},
  charts: [],
} as Config;

export function mergeDefaultConfig(config: Partial<Config>): Config {
  return {
    ...DefaultConfig,
    ...config,
  } as Config;
}

export function loadConfig(path: string = DefaultConfigPath): Config {
  const config = parse(readFileSync(path, 'utf-8'), {
    version: '1.2',
    schema: 'yaml-1.2',
  });
  return mergeDefaultConfig(config);
}
