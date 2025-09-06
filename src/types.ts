
import rdiff from 'recursive-diff';
import { ITrace } from './trace';

export type StateChange = {
  readonly diff: rdiff.rdiffResult;
  readonly trace: ITrace;
  readonly manifestIndex: number;
};

export type Constructor<T> = new (...args: any[]) => T;

export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T | undefined;
