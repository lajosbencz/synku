import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { ChartMetadata, GeneratedChartInfo } from './types';

export interface SchemaProperty {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  description?: string;
  default?: any;
  required?: string[];
}

export class TypeScriptGenerator {
  async generateChartTypes(chartPath: string, chartName: string, sourceUrl: string): Promise<GeneratedChartInfo> {
    const metadata = await this.parseChartMetadata(chartPath);
    const valuesSchema = await this.parseValuesSchema(chartPath);

    const interfaceName = `${this.toPascalCase(chartName)}ChartValues`;
    const className = `${this.toPascalCase(chartName)}Chart`;

    const interfaceCode = this.generateInterface(interfaceName, valuesSchema);
    const classCode = this.generateChartClass(className, interfaceName, sourceUrl, metadata);

    const fullCode = [
      "import { helm } from 'synku';",
      '',
      interfaceCode,
      '',
      classCode,
    ].join('\n');

    return {
      interfaceName,
      className,
      source: fullCode,
      metadata,
    };
  }

  private async parseChartMetadata(chartPath: string): Promise<ChartMetadata> {
    const chartYamlPath = path.join(chartPath, 'Chart.yaml');
    const chartYamlContent = await fs.readFile(chartYamlPath, 'utf-8');
    return parse(chartYamlContent, {
      version: '1.1',
      schema: 'yaml-1.1',
    }) as ChartMetadata;
  }

  private async parseValuesSchema(chartPath: string): Promise<SchemaProperty> {
    // Try values.schema.json first
    const schemaJsonPath = path.join(chartPath, 'values.schema.json');
    try {
      const schemaContent = await fs.readFile(schemaJsonPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      return schema.properties || schema;
    } catch {
      // Fall back to values.yaml analysis
      return this.parseValuesYaml(chartPath);
    }
  }

  private async parseValuesYaml(chartPath: string): Promise<SchemaProperty> {
    const valuesYamlPath = path.join(chartPath, 'values.yaml');
    try {
      const valuesContent = await fs.readFile(valuesYamlPath, 'utf-8');
      const values = parse(valuesContent, {
        version: '1.1',
        schema: 'yaml-1.1',
      });
      return this.inferSchemaFromValues(values);
    } catch {
      // Return empty schema if no values file
      return { type: 'object', properties: {} };
    }
  }

  private inferSchemaFromValues(obj: any): SchemaProperty {
    if (obj === null || obj === undefined) {
      return { type: 'any' };
    }

    if (Array.isArray(obj)) {
      const itemSchema = obj.length > 0 ? this.inferSchemaFromValues(obj[0]) : { type: 'any' };
      return {
        type: 'array',
        items: itemSchema,
      };
    }

    if (typeof obj === 'object') {
      const properties: Record<string, SchemaProperty> = {};
      for (const [key, value] of Object.entries(obj)) {
        properties[key] = this.inferSchemaFromValues(value);
      }
      return {
        type: 'object',
        properties,
      };
    }

    if (typeof obj === 'string') {
      return { type: 'string', default: obj };
    }

    if (typeof obj === 'number') {
      return { type: 'number', default: obj };
    }

    if (typeof obj === 'boolean') {
      return { type: 'boolean', default: obj };
    }

    return { type: 'any' };
  }

  private generateInterface(interfaceName: string, schema: SchemaProperty, indent: string = ''): string {
    if (schema.type === 'object' && schema.properties) {
      const properties = Object.entries(schema.properties)
        .map(([key, prop]) => {
          const optional = !schema.required?.includes(key) ? '?' : '';
          const description = prop.description ? `  /** ${prop.description} */\n` : '';
          const type = this.generateTypeString(prop);
          const propertyName = this.formatPropertyName(key);
          return `${description}  ${propertyName}${optional}: ${type};`;
        })
        .join('\n');

      if (indent === '') {
        // Root interface
        return `export interface ${interfaceName} {\n${properties}\n}`;
      } else {
        // Nested object
        return `{\n${properties}\n${indent}}`;
      }
    }

    return this.generateTypeString(schema);
  }

  private generateTypeString(schema: SchemaProperty): string {
    switch (schema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        if (schema.items) {
          const itemType = this.generateTypeString(schema.items);
          return `${itemType}[]`;
        }
        return 'any[]';
      case 'object':
        if (schema.properties) {
          const properties = Object.entries(schema.properties)
            .map(([key, prop]) => {
              const optional = !schema.required?.includes(key) ? '?' : '';
              const type = this.generateTypeString(prop);
              const propertyName = this.formatPropertyName(key);
              return `    ${propertyName}${optional}: ${type};`;
            })
            .join('\n');
          return `{\n${properties}\n  }`;
        }
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }

  private formatPropertyName(key: string): string {
    // Check if the property name needs to be quoted
    // Valid JavaScript identifiers don't need quotes
    const isValidIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);

    if (isValidIdentifier) {
      return key;
    } else {
      // Quote the property name and escape any quotes within it
      return `"${key.replace(/"/g, '\\"')}"`;
    }
  }

  private generateChartClass(className: string, interfaceName: string, sourcePath: string, metadata: ChartMetadata): string {
    const description = metadata.description ? `\n * ${metadata.description}` : '';
    const version = metadata.version ? `\n * @version ${metadata.version}` : '';
    const home = metadata.home ? `\n * @see ${metadata.home}` : '';

    return `/**
 * ${className} - Helm chart wrapper${description}${version}${home}
 * @source ${sourcePath}
 */
export class ${className} extends helm.Chart<${interfaceName}> {
  constructor(namespace: string, name: string, values: ${interfaceName}) {
    super('${sourcePath}', namespace, name, values);
  }
}`;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^[a-z]/, char => char.toUpperCase());
  }
}
