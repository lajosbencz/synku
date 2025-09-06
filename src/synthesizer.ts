import rdiff from 'recursive-diff';
import { Clonable, clone } from './clone';
import { IComponent } from './component';
import { ILogger, DefaultLogger, ILoggerAware } from './logger';
import { StateChange } from './types';

export type Synthesis<T extends any = any> = [IComponent<T>, T[], StateChange[]][];

export interface ISynthesizer<T extends any = any> extends ILoggerAware {
  synth(component: IComponent<T>): Synthesis<T>;
}

export class Synthesizer<T extends any = any> implements ISynthesizer<T> {
  constructor(public readonly logger: ILogger = DefaultLogger) { }

  public synth(component: IComponent<T>): Synthesis<T> {
    const synth: Synthesis<T> = [];
    const changes: StateChange[] = [];
    component.getBehaviors().reverse().forEach(behavior => {
      const snap1 = clone(component.findAll() as Clonable[]);
      behavior(component);
      const snap2 = clone(component.findAll() as Clonable[]);
      snap1.forEach((s1, manifestIndex) => {
        const s2 = snap2[manifestIndex];
        const diffs = rdiff.getDiff(s1, s2, true);
        if (diffs.length > 0) {
          if (behavior.__synku_trace) {
            diffs.forEach((diff: any) => {
              changes.push({ diff, trace: behavior.__synku_trace!, manifestIndex });
            });
          } else {
            throw new Error('No behavior trace found for diff');
          }
        }
      });
    });
    const manifests: T[] = [];
    component.drafts.forEach(final => {
      manifests.push(final as T);
    });
    if (manifests.length > 0) {
      synth.push([component, manifests, changes]);
    }
    component.children.forEach(childComponent => {
      synth.push(...this.synth(childComponent));
    });
    return synth;
  }
}
