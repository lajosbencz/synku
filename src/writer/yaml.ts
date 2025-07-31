import { stringify } from 'yaml';
import { IComponent } from '../core/component';

export function yaml(records: [IComponent, any[]][], output: NodeJS.WritableStream = process.stdout): void {
  let totalResourceCount = 0;
  for (const [component, resources] of records) {
    for (const resource of resources) {
      const yamlString = stringify(resource, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
      });
      const separator = totalResourceCount > 0 ? '---\n': '';
      output.write(`${separator}# ${component.fullName}
${yamlString}
`);
      totalResourceCount++;
    }
  }
}
