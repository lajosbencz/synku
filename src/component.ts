import { Behavior } from './behavior';
import { Constructor, InstanceType, DeepPartial } from './types';

export function manifestEquality(a: any, b: any): boolean {
  if (a.apiVersion && a.kind) {
    return a.apiVersion === b.apiVersion && a.kind === b.kind;
  }
  return b instanceof a;
}

export type ComponentInit<T extends IComponent = IComponent> = (component: T) => void;

export interface ComponentConstructor<T extends IComponent = IComponent> {
  new(name: string, parent?: IComponent): T;
}

export interface ComponentConstructorWithArgs<T extends IComponent = IComponent, TArgs extends any[] = any[]> {
  new(...args: TArgs): T;
}

export interface IComponent {
  readonly parent?: IComponent;
  readonly root: IComponent;
  readonly children: IComponent[];
  readonly name: string;
  readonly fullName: string;
  setParent(parent: IComponent): void;
  removeChild(child: IComponent): void;
  component(name: string, init?: ComponentInit): IComponent;
  component<T extends IComponent>(component: T, init?: ComponentInit<T>): T;
  manifest<T>(type: Constructor<T>, draft: DeepPartial<T>): IComponent;
  find<T = any>(type: Constructor<T>): T;
  findAll(): any[];
  findAll<T>(type: Constructor<T>): T[];
  findAll<T extends readonly Constructor<any>[]>(...types: T): InstanceType<T[number]>[];
  behavior(behavior: Behavior): IComponent;
  getBehaviors(): Behavior[];
  init(): void;
  synth(): Promise<[IComponent, any[]][]>;
}

export class Component implements IComponent {

  protected _parent?: IComponent = undefined;
  protected _children: IComponent[] = [];
  protected _manifests: any[] = [];
  protected _behaviors: Behavior[] = [];

  constructor(public readonly name: string) { }

  init(): void { }

  get root(): IComponent {
    let root: IComponent = this;
    while (root.parent) {
      root = root.parent;
    }
    return root;
  }

  get parent(): IComponent | undefined {
    return this._parent;
  }

  get children(): IComponent[] {
    return this._children;
  }

  get fullName(): string {
    let fullName = '';
    let node: IComponent | undefined = this;
    do {
      if (fullName !== '') {
        fullName = `${node!.name}-${fullName}`;
      } else {
        fullName = node!.name;
      }
      node = node!.parent;
    } while (node);
    return fullName;
  }

  setParent(parent?: IComponent): void {
    if (this._parent && this._parent !== parent) {
      this._parent.removeChild(this);
    }
    this._parent = parent;
  }

  removeChild(child: IComponent): void {
    this._children = this._children.filter(e => e !== child);
  }

  component(name: string, init?: ComponentInit): IComponent;
  component<T extends IComponent>(component: T, init?: ComponentInit<T>): T;
  component(nameOrComponent: string | IComponent, init?: ComponentInit): IComponent {
    let component: IComponent;
    if (typeof nameOrComponent === 'string') {
      component = new Component(nameOrComponent);
    } else {
      component = nameOrComponent as IComponent;
    }
    component.setParent(this);
    this._children.push(component);
    init?.(component);
    return component;
  }

  manifest<T>(type: Constructor<T>, draft: DeepPartial<T>): IComponent {
    const manifest = new type(draft);
    this._manifests.push(manifest);
    return this;
  }

  find<T = any>(type: Constructor<T>): T {
    return this._manifests.find(r => manifestEquality(type, r));
  }

  findAll(...types: Constructor<any>[]): any[] {
    if (types.length < 1) {
      return this._manifests;
    }
    return this._manifests.filter(r => types.some(rt => manifestEquality(r, rt)));
  }

  behavior(behavior: Behavior): IComponent {
    this._behaviors.push(behavior);
    return this;
  }

  getBehaviors(): Behavior[] {
    return [...this._parent?.getBehaviors() ?? [], ...this._behaviors].reverse();
  }

  async synth(): Promise<[IComponent, any[]][]> {
    this.init();
    const list: [IComponent, any[]][] = [];
    if (this._manifests.length > 0) {
      list.push([this, this._manifests]);
    }
    for (const child of this.children) {
      const childResults = await child.synth();
      list.push(...childResults);
    }
    this.getBehaviors().forEach(behavior => {
      behavior(this);
    });
    return list;
  }
}
