

export type Clonable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Clonable[]
  | { [key: string]: Clonable };

export function clone<T extends Clonable>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => clone(item)) as T;
  }
  const result: any = {};
  for (const key in obj) {
    result[key] = clone(obj[key]);
  }
  return result;
}
