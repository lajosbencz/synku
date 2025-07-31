import { produce } from 'immer';
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
  private _synthContext?: { resources: any[]; isSynthing: boolean } = undefined;

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

    // Use synth context resources if we're in synthesis mode, otherwise use original resources
    const resourcesSource = this._synthContext?.isSynthing ? this._synthContext.resources : this.resources;

    // Find resources in this component
    if (resourceType) {
      results.push(...resourcesSource.filter(r => r instanceof resourceType));
    } else {
      results.push(...resourcesSource);
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

    // Create immutable copies using immer and apply behaviors
    const immutableResources = produce(this.resources, (draft: any[]) => {
      // Set synthesis context so findAll returns the draft resources
      this._synthContext = { resources: draft, isSynthing: true };

      try {
        // Apply all inherited behaviors to the draft
        this.getInheritedBehaviors().forEach(behavior => behavior(this));
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
