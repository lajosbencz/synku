import * as yaml from 'yaml';
import { IComponent } from './component';

export function write(records: [IComponent, any[]][], output: NodeJS.WritableStream = process.stdout): void {
  for (const [component, resources] of records) {
    for (const resource of resources) {
      const yamlString = yaml.stringify(resource, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
      });
      output.write(`---
# ${component.fullName}
${yamlString}
`);
    }
  }
}
