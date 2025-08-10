import { Behavior } from '../behavior';


export function defaultNamespace(namespace: string): Behavior {
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        namespace,
        ...resource.metadata,
      };
    });
  };
}

export function defaultName(prefix?: string): Behavior {
  if (prefix) {
    prefix = `${prefix}-`;
  }
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        name: `${prefix ?? ''}${component.fullName}`,
        ...resource.metadata,
      };
    });
  };
}

export function defaultLabels(labels: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        ...resource.metadata,
        labels: {
          ...resource.metadata?.labels,
          ...labels,
        },
      };
    });
  };
}

export function defaultAnnotations(annotations: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        ...resource.metadata,
        annotations: {
          ...resource.metadata?.annotations,
          ...annotations,
        },
      };
    });
  };
}
