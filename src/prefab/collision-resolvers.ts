import { IBehaviour } from '../core/behaviour';
import { IComponent } from '../core/component';
import { validateNamingCollisions } from '../core/validation';

export const withCollisionResolution: IBehaviour = (component: IComponent) => {
  const root = component.getRoot() as IComponent;
  
  if (root !== component) {
    return;
  }
  
  const manifests = root.synth();
  const collisionResult = validateNamingCollisions(manifests);
  
  if (!collisionResult.hasCollisions) {
    return;
  }
  
  for (const collision of collisionResult.collisions) {
    const [apiVersion, kind, namespace, originalName] = collision.key.split('/');
    
    for (let i = 1; i < collision.manifests.length; i++) {
      const { component: _, manifest } = collision.manifests[i];
      
      let suffix = i + 1;
      let newName = `${originalName}-${suffix}`;
      
      while (hasNameConflict(manifests, apiVersion, kind, namespace, newName)) {
        suffix++;
        newName = `${originalName}-${suffix}`;
      }
      
      if (manifest.metadata) {
        manifest.metadata.name = newName;
      }
    }
  }
};

export const withNameSuffix = (suffix: string): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests();
    for (const manifest of manifests) {
      if (manifest.data.metadata?.name) {
        manifest.data.metadata.name = `${manifest.data.metadata.name}-${suffix}`;
      }
    }
  };
};

export const withNamePrefix = (prefix: string): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests();
    for (const manifest of manifests) {
      if (manifest.data.metadata?.name) {
        manifest.data.metadata.name = `${prefix}-${manifest.data.metadata.name}`;
      }
    }
  };
};

export const withExplicitName = (name: string): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests();
    for (const manifest of manifests) {
      if (!manifest.data.metadata) {
        manifest.data.metadata = {};
      }
      manifest.data.metadata.name = name;
    }
  };
};

export const withEnvironmentSuffix = (environment: string): IBehaviour => {
  return withNameSuffix(environment);
};

export const withVersionSuffix = (version: string): IBehaviour => {
  return withNameSuffix(version.replace(/[^a-zA-Z0-9-]/g, '-'));
};

function hasNameConflict(
  manifests: Array<[IComponent, any]>, 
  apiVersion: string, 
  kind: string, 
  namespace: string, 
  name: string
): boolean {
  return manifests.some(([, manifest]) => {
    return manifest.apiVersion === apiVersion &&
           manifest.kind === kind &&
           (manifest.metadata?.namespace || 'default') === namespace &&
           manifest.metadata?.name === name;
  });
}
