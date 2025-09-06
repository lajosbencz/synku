import { NameAware, DraftAware, IComponent } from './component';
import { INode } from './node';
import { ITrace, trace } from './trace';

export interface IBehaviorTrace {
  __synku_trace?: ITrace;
};

export type BehaviorComponent<T> = NameAware & DraftAware<T> & INode<IComponent<T>>;

export type Behavior<T extends any = any> = IBehaviorTrace & {
  (component: BehaviorComponent<T>): void;
};

export function behavior<T extends any = any>(callback: Behavior<T>): Behavior {
  callback.__synku_trace = trace(1);
  return callback;
}
