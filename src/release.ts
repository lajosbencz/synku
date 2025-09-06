import { Component, IComponent } from './component';

export class Release<T extends any = any> extends Component<T> {
  constructor(name: string) {
    super(null, name);
  }

  protected self(): Release<T> {
    return this;
  }
}

export async function synku<T extends any = any>(name: string, callback: (release: IComponent<T>) => Promise<void> | void): Promise<IComponent<T>> {
  const releaseInstance = new Release<T>(name);
  const res = callback(releaseInstance);
  if (res instanceof Promise) {
    await res;
  }
  return releaseInstance;
}

export async function release<T extends any = any>(name: string, callback: (component: IComponent<T>) => Promise<void> | void): Promise<IComponent> {
  const releaseInstance = new Release<T>(name);
  const res = callback(releaseInstance);
  if (res instanceof Promise) {
    await res;
  }
  return releaseInstance;
}
