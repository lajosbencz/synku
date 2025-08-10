import { Behavior } from './behavior';
import { Constructor, InstanceType, DeepPartial } from './types';

export function resourceEquality(a: any, b: any): boolean {
  if (a.apiVersion && a.kind) {
    return a.apiVersion === b.apiVersion && a.kind === b.kind;
  }
  return b instanceof a;
}

export type ComponentInit = (component: IComponent) => void;

export interface IComponent {
  readonly parent?: IComponent;
  readonly root: IComponent;
  readonly children: IComponent[];
  readonly name: string;
  readonly fullName: string;
  component(name: string, init?: ComponentInit): IComponent;
  resource<T>(resourceType: Constructor<T>, draft: DeepPartial<T>): IComponent;
  find<T = any>(resourceType: Constructor<T>): T;
  findAll(): any[];
  findAll<T>(resourceType: Constructor<T>): T[];
  findAll<T extends readonly Constructor<any>[]>(...resourceTypes: T): InstanceType<T[number]>[];
  behavior(behavior: Behavior): IComponent;
  getBehaviors(): Behavior[];
  init(): void;
  synth(): Promise<[IComponent, any[]][]>;
}

export class Component implements IComponent {

  protected _parent?: IComponent;
  protected _children: IComponent[] = [];
  protected _resources: any[] = [];
  protected _behaviors: Behavior[] = [];

  constructor(parent: IComponent | undefined, public readonly name: string) {
    this._parent = parent;
    this._parent?.children.push(this);
    this.init();
  }

  init(): void {
    // Default implementation does nothing
  }

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

  component(name: string, init?: ComponentInit): IComponent {
    const component = new Component(this, name);
    init?.(component);
    return component;
  }

  resource<T>(resourceType: Constructor<T>, draft: DeepPartial<T>): IComponent {
    const resource = new resourceType(draft);
    this._resources.push(resource);
    return this;
  }

  find<T = any>(resourceType: Constructor<T>): T {
    return this._resources.find(r => resourceEquality(resourceType, r));
  }

  findAll(...resourceTypes: Constructor<any>[]): any[] {
    if (resourceTypes.length < 1) {
      return this._resources;
    }
    return this._resources.filter(r => resourceTypes.some(rt => resourceEquality(r, rt)));
  }

  behavior(behavior: Behavior): IComponent {
    this._behaviors.push(behavior);
    return this;
  }

  getBehaviors(): Behavior[] {
    return [...this._parent?.getBehaviors() ?? [], ...this._behaviors].reverse();
  }

  async synth(): Promise<[IComponent, any[]][]> {
    const list: [IComponent, any[]][] = [];
    if (this._resources.length > 0) {
      list.push([this, this._resources]);
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
