import { IComponent } from './component';

export type Behavior = (component: IComponent) => void;

export function chain(...behaviors: Behavior[]): Behavior {
  return component => behaviors.forEach(behavior => behavior(component));
}
