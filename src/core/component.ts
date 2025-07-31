import { IBehavior } from './behavior';
import { DeepPartial } from './types';

export type ComponentInit = (component: IComponent) => void;

export interface INode {
  readonly parent?: IComponent;
  readonly children: IComponent[];
}

export interface IComponent extends INode {
  readonly name: string;
  readonly fullName: string;
  readonly release: IComponent;
  addComponent(name: string, init: ComponentInit): IComponent;
  add<T>(resourceType: new(...args: any[]) => T, manifest: DeepPartial<T>): T;
  findAll<T = any>(resourceType?: new(...args: any[]) => T): T[];
  addBehavior(behavior: IBehavior): void;
  getInheritedBehaviors(): IBehavior[];
  synth(): [IComponent, any[]][];
}

export class Component implements IComponent {

  protected _parent?: IComponent;
  public readonly children: IComponent[] = [];
  protected resources: any[] = [];
  protected behaviors: IBehavior[] = [];

  constructor(public readonly name: string, init: ComponentInit) {
    init(this);
  }

  get release(): IComponent {
    let root: IComponent = this;
    while (root.parent) {
      root = root.parent;
    }
    return root;
  }

  get parent(): IComponent | undefined {
    return this._parent;
  }

  get fullName(): string {
    let fullName = '';
    let node: IComponent | undefined = this;
    do {
      fullName = `${node.name}-${fullName}`;
      node = node.parent;
    } while (node);
    return fullName.replace(/-$/, '');
  }

  addComponent(name: string, init: ComponentInit): IComponent {
    const component = new Component(name, init);
    (component as any)._parent = this;
    this.children.push(component);
    return component;
  }

  add<T>(resourceType: new(...args: any[]) => T, manifest: DeepPartial<T>): T {
    const resource = new resourceType(manifest);
    this.resources.push(resource);
    return resource;
  }

  findAll<T>(resourceType?: new(...args: any[]) => T): T[] {
    const results: T[] = [];

    // Find resources in this component
    if (resourceType) {
      results.push(...this.resources.filter(r => r instanceof resourceType));
    } else {
      results.push(...this.resources);
    }

    return results;
  }

  addBehavior(behavior: IBehavior): void {
    this.behaviors.push(behavior);
  }

  getInheritedBehaviors(): IBehavior[] {
    return [...this.parent?.getInheritedBehaviors()??[], ...this.behaviors].reverse();
  }

  synth(): [IComponent, any[]][] {
    const list: [IComponent, any[]][] = [];
    this.getInheritedBehaviors().forEach(behavior => behavior(this));
    list.push([this, this.findAll()]);
    for(const child of this.children) {
        list.push(...child.synth())
    }
    return list;
  }
}
