import { Deployment, StatefulSet } from 'kubernetes-models/apps/v1';
import { IResourceRequirements } from 'kubernetes-models/v1';
import { Behavior } from '../behavior';


export function matchLabels(labels: Record<string, string>): Behavior {
  return component => {
    component.findAll(Deployment).forEach(manifest => {
      manifest.spec!.selector = {
        matchLabels: {
          ...manifest.spec!.selector?.matchLabels,
          ...labels,
        },
      };
      manifest.spec!.template!.metadata = {
        ...manifest.spec!.template!.metadata,
        labels: {
          ...manifest.spec!.template!.metadata?.labels,
          ...labels,
        },
      };
    });
  };
}

export function resources(req: IResourceRequirements): Behavior {
  return component => {
    component.findAll().forEach((manifest: any) => {
      if (manifest.spec?.template?.spec?.containers) {
        manifest.spec.template.spec.containers.forEach((container: any) => {
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
      }
    });
  };
}

export function defaultResources(req: IResourceRequirements): Behavior {
  return component => {
    component.findAll(Deployment).forEach(manifest => {
      if (manifest.spec?.template?.spec?.containers) {
        manifest.spec.template.spec.containers.forEach((container: any) => {
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
      }
    });
    component.findAll(StatefulSet).forEach(manifest => {
      if (manifest.spec?.template?.spec?.containers) {
        manifest.spec.template.spec.containers.forEach((container: any) => {
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
      }
    });
  };
}
