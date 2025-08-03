import { Behavior } from './behavior';
import { Constructor, InstanceType, DeepPartial } from './types';

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
  synth(): [IComponent, any[]][];
}

export class Component implements IComponent {

  protected _parent?: IComponent;
  protected _children: IComponent[] = [];
  protected _resources: any[] = [];
  protected _behaviors: Behavior[] = [];

  constructor(parent: IComponent | undefined, public readonly name: string) {
    this._parent = parent;
    this.init();
  }

  protected init() { }

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
        fullName = `${node.name}-${fullName}`;
      } else {
        fullName = node.name;
      }
      node = node.parent;
    } while (node);
    return fullName;
  }

  component(name: string, init?: ComponentInit): IComponent {
    const component = new Component(this, name);
    init?.(component);
    this.children.push(component);
    return component;
  }

  resource<T>(resourceType: Constructor<T>, draft: DeepPartial<T>): IComponent {
    (draft as any).metadata ??= {};
    const resource = new resourceType(draft);
    this._resources.push(resource);
    return this;
  }

  find<T = any>(resourceType: Constructor<T>): T {
    return this._resources.find(r => r instanceof resourceType);
  }

  findAll(...resourceTypes: Constructor<any>[]): any[] {
    return this._resources.filter(r => resourceTypes.length < 1 || resourceTypes.some(rt => r instanceof rt));
  }

  behavior(behavior: Behavior): IComponent {
    this._behaviors.push(behavior);
    return this;
  }

  getBehaviors(): Behavior[] {
    return [...this._parent?.getBehaviors() ?? [], ...this._behaviors].reverse();
  }

  synth(): [IComponent, any[]][] {
    const list: [IComponent, any[]][] = [];
    this.getBehaviors().forEach(behavior => behavior(this));
    if (this._resources.length > 0) {
      list.push([this, this._resources]);
    }
    for (const child of this.children) {
      list.push(...child.synth());
    }
    return list;
  }
}
