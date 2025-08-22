import { Pair, stringify } from 'yaml';
import { IComponent } from './component';


export function sortMapEntries(a: Pair, b: Pair) {
  const desiredOrder = ['apiVersion', 'kind', 'metadata', 'name', 'labels', 'annotations'];
  const keyA = String(a.key);
  const keyB = String(b.key);
  const idxA = desiredOrder.indexOf(keyA);
  const idxB = desiredOrder.indexOf(keyB);
  if (idxA === -1 && idxB === -1) {
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }
  if (idxA === -1) return 1;
  if (idxB === -1) return -1;
  return idxA - idxB;
}

export function yaml(records: [IComponent, any[]][], output: NodeJS.WritableStream = process.stdout): void {
  let totalResourceCount = 0;
  for (const [component, manifests] of records) {
    for (const manifest of manifests) {
      const yamlString = stringify(manifest, {
        version: '1.1',
        schema: 'yaml-1.1',
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
        sortMapEntries,
      });
      const separator = totalResourceCount > 0 ? '\n---\n' : '';
      output.write(`${separator}# ${component.fullName}
${yamlString}`);
      totalResourceCount++;
    }
  }
}
