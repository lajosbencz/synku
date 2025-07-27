import { IValidator, namingCollisionValidator, requiredMetadataValidator, kubernetesSchemaValidator } from '../core/validation';
import * as k8s from 'kubernetes-models';

export const basicValidators: IValidator[] = [
  requiredMetadataValidator,
  namingCollisionValidator,
];

export const createCommonSchemaValidator = (): IValidator => {
  const manifestTypes = new Map<string, new (...args: any[]) => any>([
    ['apps/v1/Deployment', k8s.apps.v1.Deployment],
    ['v1/Service', k8s.v1.Service],
    ['v1/ConfigMap', k8s.v1.ConfigMap],
    ['v1/Secret', k8s.v1.Secret],
    ['v1/PersistentVolumeClaim', k8s.v1.PersistentVolumeClaim],
    ['apps/v1/StatefulSet', k8s.apps.v1.StatefulSet],
    ['apps/v1/DaemonSet', k8s.apps.v1.DaemonSet],
    ['batch/v1/Job', k8s.batch.v1.Job],
    ['batch/v1/CronJob', k8s.batch.v1.CronJob],
  ]);
  
  return kubernetesSchemaValidator(manifestTypes);
};

export const productionValidators: IValidator[] = [
  ...basicValidators,
  createCommonSchemaValidator(),
];

export const createRequiredLabelsValidator = (requiredLabels: string[]): IValidator => {
  return (manifests) => {
    const errors = [];
    
    for (const [component, manifest] of manifests) {
      const labels = manifest.metadata?.labels || {};
      
      for (const requiredLabel of requiredLabels) {
        if (!labels[requiredLabel]) {
          errors.push({
            type: 'missing-required-label',
            message: `Missing required label: ${requiredLabel}`,
            component,
            manifest,
            details: { requiredLabel },
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
};

export const createSecurityContextValidator = (): IValidator => {
  return (manifests) => {
    const errors = [];
    
    for (const [component, manifest] of manifests) {
      if (manifest.kind === 'Deployment' || manifest.kind === 'StatefulSet' || manifest.kind === 'DaemonSet') {
        const podSpec = (manifest as any).spec?.template?.spec;
        
        if (podSpec && !podSpec.securityContext) {
          errors.push({
            type: 'missing-security-context',
            message: `Pod template is missing securityContext`,
            component,
            manifest,
          });
        }
        
        const containers = podSpec?.containers || [];
        for (const container of containers) {
          if (!container.securityContext) {
            errors.push({
              type: 'missing-container-security-context',
              message: `Container "${container.name}" is missing securityContext`,
              component,
              manifest,
              details: { containerName: container.name },
            });
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
};

export const createResourceLimitsValidator = (): IValidator => {
  return (manifests) => {
    const errors = [];
    
    for (const [component, manifest] of manifests) {
      if (manifest.kind === 'Deployment' || manifest.kind === 'StatefulSet' || manifest.kind === 'DaemonSet') {
        const containers = (manifest as any).spec?.template?.spec?.containers || [];
        
        for (const container of containers) {
          if (!container.resources?.limits) {
            errors.push({
              type: 'missing-resource-limits',
              message: `Container "${container.name}" is missing resource limits`,
              component,
              manifest,
              details: { containerName: container.name },
            });
          }
          
          if (!container.resources?.requests) {
            errors.push({
              type: 'missing-resource-requests',
              message: `Container "${container.name}" is missing resource requests`,
              component,
              manifest,
              details: { containerName: container.name },
            });
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
};
