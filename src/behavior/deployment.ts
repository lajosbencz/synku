import { Deployment, StatefulSet } from 'kubernetes-models/apps/v1';
import { ResourceRequirements } from 'kubernetes-models/v1';
import { Behavior } from '../behavior';


export function matchLabels(labels: Record<string, string>): Behavior {
  return component => {
    component.findAll(Deployment).forEach(resource => {
      resource.spec!.selector = {
        matchLabels: {
          ...resource.spec!.selector?.matchLabels,
          ...labels,
        },
      };
      resource.spec!.template!.metadata = {
        ...resource.spec!.template!.metadata,
        labels: {
          ...resource.spec!.template!.metadata?.labels,
          ...labels,
        },
      };
    });
  };
}

export function defaultResources(req: ResourceRequirements): Behavior {
  return component => {
    component.findAll(Deployment, StatefulSet).forEach(resource => {
      resource.spec?.template.spec?.containers.forEach(container => {
        container.resources = {
          ...container.resources,
          requests: {
            ...req.requests,
            ...container.resources?.requests,
          },
          limits: {
            ...req.limits,
            ...container.resources?.limits,
          },
        };
      });
    });
  };
}
