export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T | undefined;

export type DeepReadonly<T> = T extends Function
  ? Readonly<T>
  : T extends Array<infer U>
    ? Array<DeepReadonly<U>>
    : T extends object
      ? { [P in keyof T]?: DeepReadonly<T[P]> }
      : Readonly<T> | undefined;
