import { Behavior } from '../behavior';


export function defaultNamespace(namespace: string): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        namespace,
        ...manifest.metadata,
      };
    });
  };
}

export function defaultName(prefix?: string): Behavior {
  if (prefix) {
    prefix = `${prefix}-`;
  }
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        name: `${prefix ?? ''}${component.fullName}`,
        ...manifest.metadata,
      };
    });
  };
}

export function defaultLabels(labels: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        labels: {
          ...manifest.metadata?.labels,
          ...labels,
        },
      };
    });
  };
}

export function defaultAnnotations(annotations: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        annotations: {
          ...manifest.metadata?.annotations,
          ...annotations,
        },
      };
    });
  };
}
