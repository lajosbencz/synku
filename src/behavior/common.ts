import { IBehavior } from '../core';

export function withName(prefix?: string): IBehavior {
  if (prefix) {
    prefix = `${prefix}-`;
  }
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        name: `${prefix}${component.fullName}`,
        ...resource.metadata,
      };
    });
  };
}

export function withLabels(labels: Record<string, string>): IBehavior {
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        ...resource.metadata,
        labels: {
          ...resource.metadata.labels,
          ...labels,
        },
      };
    });
  };
}

export function withAnnotations(annotations: Record<string, string>): IBehavior {
  return component => {
    component.findAll().forEach(resource => {
      resource.metadata = {
        ...resource.metadata,
        annotations: {
          ...resource.metadata.annotations,
          ...annotations,
        },
      };
    });
  };
}
