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

export function name(prefix?: string): Behavior {
  if (prefix) {
    prefix = `${prefix}-`;
  }
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        name: `${prefix ?? ''}${component.name}`,
        ...manifest.metadata,
      };
    });
  };
}

export function releaseLabels(labelSet?: Record<string, string>): Behavior {
  return component => {
    const releaseLabelsToApply = {
      'synku/release': component.root.name,
      ...labelSet,
    };
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        labels: {
          ...manifest.metadata?.labels,
          ...releaseLabelsToApply,
        },
      };
    });
  };
}

export function labels(labelSet: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        labels: {
          ...manifest.metadata?.labels,
          ...labelSet,
        },
      };
    });
  };
}

export function annotations(annotationSet: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        annotations: {
          ...manifest.metadata?.annotations,
          ...annotationSet,
        },
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
        name: `${prefix ?? ''}${component.name}`,
        ...manifest.metadata,
      };
    });
  };
}

export function defaultLabels(labelSet: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        labels: {
          ...manifest.metadata?.labels,
          ...labelSet,
        },
      };
    });
  };
}

export function defaultAnnotations(annotationSet: Record<string, string>): Behavior {
  return component => {
    component.findAll().forEach(manifest => {
      manifest.metadata = {
        ...manifest.metadata,
        annotations: {
          ...manifest.metadata?.annotations,
          ...annotationSet,
        },
      };
    });
  };
}
