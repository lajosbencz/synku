import { stringify } from 'yaml';
import { IComponent } from '../core/component';

export function yaml(records: [IComponent, any[]][], output: NodeJS.WritableStream = process.stdout): void {
  for (const [component, resources] of records) {
    for (const resource of resources) {
      const yamlString = stringify(resource, {
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
