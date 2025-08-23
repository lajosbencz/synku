import { IManifestAware, INameAware } from './component';

export type Behavior = (component: IManifestAware & INameAware) => void;

export function chain(...behaviors: Behavior[]): Behavior {
  return component => behaviors.forEach(behavior => behavior(component));
}
