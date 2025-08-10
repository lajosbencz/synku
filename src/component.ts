import { Behavior } from './behavior';
import { Constructor, InstanceType, DeepPartial } from './types';

export function resourceEquality(a: any, b: any): boolean {
  if (a.apiVersion && a.kind) {
    return a.apiVersion === b.apiVersion && a.kind === b.kind;
  }
  return b instanceof a;
}

export type ComponentInit = (component: IComponent) => void;

export interface ComponentConstructor<T extends IComponent = IComponent> {
  new (name: string, parent?: IComponent): T;
}

export interface ComponentConstructorWithArgs<T extends IComponent = IComponent, TArgs extends any[] = any[]> {
  new (...args: TArgs): T;
}

export interface IComponent {
  readonly parent?: IComponent;
  readonly root: IComponent;
  readonly children: IComponent[];
  readonly name: string;
  readonly fullName: string;
  component(name: string, init?: ComponentInit): IComponent;
  component<T extends IComponent>(name: string, componentType: ComponentConstructor<T>, init?: ComponentInit): T;
  component<T extends IComponent>(name: string, componentType: ComponentConstructorWithArgs<T>, ...args: any[]): T;
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

  component(name: string, init?: ComponentInit): IComponent;
  component<T extends IComponent>(name: string, componentType: ComponentConstructor<T>, init?: ComponentInit): T;
  component<T extends IComponent>(name: string, componentType: ComponentConstructorWithArgs<T>, ...args: any[]): T;
  component<T extends IComponent>(
    name: string,
    componentTypeOrInit?: ComponentConstructor<T> | ComponentConstructorWithArgs<T> | ComponentInit,
    ...args: any[]
  ): IComponent | T {
    // Simple component creation with name and init
    if (!componentTypeOrInit || typeof componentTypeOrInit === 'function' && componentTypeOrInit.length === 1) {
      const init = componentTypeOrInit as ComponentInit | undefined;
      const component = new Component(this, name);
      init?.(component);
      return component;
    }

    // Component creation with constructor
    const ComponentType = componentTypeOrInit as ComponentConstructor<T> | ComponentConstructorWithArgs<T>;

    try {
      // Try as ComponentConstructor (name, parent)
      if (args.length === 0 || (args.length === 1 && typeof args[0] === 'function')) {
        const init = args[0] as ComponentInit | undefined;
        const component = new (ComponentType as ComponentConstructor<T>)(name, this);
        init?.(component);
        return component;
      }
      
      // Try as ComponentConstructorWithArgs (...args, name, parent)
      else {
        // Find optional init function from the end of arguments
        let constructorArgs = [...args];
        let init: ComponentInit | undefined;

        // Check if last argument is an init function
        if (constructorArgs.length > 0 && typeof constructorArgs[constructorArgs.length - 1] === 'function') {
          init = constructorArgs.pop() as ComponentInit;
        }

        // Create the component with constructor args, name, and parent
        const finalArgs = [...constructorArgs, name, this];
        const component = new (ComponentType as any)(...finalArgs);
        init?.(component);
        return component;
      }
    } catch (error) {
      throw new Error(`Failed to create component: ${error}`);
    }
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
