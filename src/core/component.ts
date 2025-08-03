import { produce } from 'immer';
import { IBehavior } from './behavior';
import { DeepPartial } from './types';

export type ComponentInit = (component: IComponent) => void;

export interface INode {
  readonly parent?: IComponent;
  readonly root: IComponent;
  readonly children: IComponent[];
}

export interface IComponent extends INode {
  readonly name: string;
  readonly fullName: string;
  component(name: string, init: ComponentInit): IComponent;
  resource<T>(resourceType: new(...args: any[]) => T, manifest: DeepPartial<T>): IComponent;
  findAll<T = any>(resourceType?: new(...args: any[]) => T): T[];
  behavior(behavior: IBehavior): void;
  getBehaviors(): IBehavior[];
  synth(): [IComponent, any[]][];
}

export class Component implements IComponent {

  protected _parent?: IComponent;
  protected _children: IComponent[] = [];
  protected _resources: any[] = [];
  protected _behaviors: IBehavior[] = [];
  private _synthContext?: { resources: any[]; isSynthing: boolean } = undefined;

  constructor(parent: IComponent | undefined, public readonly name: string, init: ComponentInit) {
    this._parent = parent;
    init(this);
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
        fullName = `${node.name}-${fullName}`;
      } else {
        fullName = node.name;
      }
      node = node.parent;
    } while (node);
    return fullName;
  }

  component(name: string, init: ComponentInit): IComponent {
    const component = new Component(this, name, init);
    (component as any)._parent = this;
    this.children.push(component);
    return component;
  }

  resource<T>(resourceType: new(...args: any[]) => T, manifest: DeepPartial<T>): IComponent {
    const resource = new resourceType(manifest);
    this._resources.push(resource);
    return this;
  }

  findAll<T>(resourceType?: new(...args: any[]) => T): T[] {
    const results: T[] = [];

    // Use synth context resources if we're in synthesis mode, otherwise use original resources
    const resourcesSource = this._synthContext?.isSynthing ? this._synthContext.resources : this._resources;

    // Find resources in this component
    if (resourceType) {
      results.push(...resourcesSource.filter(r => r instanceof resourceType));
    } else {
      results.push(...resourcesSource);
    }

    return results;
  }

  behavior(behavior: IBehavior): void {
    this._behaviors.push(behavior);
  }

  getBehaviors(): IBehavior[] {
    return [...this._parent?.getBehaviors()??[], ...this._behaviors].reverse();
  }

  synth(): [IComponent, any[]][] {
    const list: [IComponent, any[]][] = [];

    // Create immutable copies using immer and apply behaviors
    const immutableResources = produce(this._resources, (draft: any[]) => {
      // Set synthesis context so findAll returns the draft resources
      this._synthContext = { resources: draft, isSynthing: true };

      try {
        // Apply all inherited behaviors to the draft
        this.getBehaviors().forEach(behavior => behavior(this));
      } finally {
        // Clean up synthesis context
        this._synthContext = undefined;
      }
    });

    list.push([this, immutableResources]);

    for (const child of this.children) {
      list.push(...child.synth());
    }
    return list;
  }
}
