import { Behavior } from './behavior';
import { Node, INode } from './node';
import { trace } from './trace';
import { Constructor, DeepPartial } from './types';

export interface NameAware {
  readonly shortName: string;
  readonly longName: string;
  /** Alias of longName */
  readonly name: string;
}

export interface DraftAware<TBase> {
  find<T extends TBase>(type: Constructor<T>): DeepPartial<T> | null;
  findAll<T extends TBase>(type?: Constructor<T>): DeepPartial<T>[];
}

type ComponentOptionsOf<T> = T extends new (parent: IComponent<any> | null, name: string, options: infer O) => any ? O : never;

export interface IComponent<TBase extends any = any> extends INode<IComponent<TBase>>, NameAware, DraftAware<TBase> {
  readonly drafts: DeepPartial<TBase>[];
  readonly behaviors: Behavior[];
  add(name: string): IComponent<TBase>;
  add<C extends Constructor<IComponent<TBase>>>(name: string, type: C, options: ComponentOptionsOf<C>): InstanceType<C>;
  draft<TDraft extends TBase = TBase>(type: Constructor<TDraft>, draft: DeepPartial<TDraft>): this;
  with(behavior: Behavior): this;
  getBehaviors(): Behavior[];
}

export class Component<TBase extends any = any> extends Node<Component<TBase>> implements IComponent<TBase> {

  private _drafts: DeepPartial<TBase>[] = [];
  private _behaviors: Behavior[] = [];

  constructor(parent: IComponent<TBase> | null, public readonly shortName: string) {
    super(parent as Component<TBase>);
  }

  public get drafts(): DeepPartial<TBase>[] {
    return this._drafts;
  }

  public get behaviors(): Behavior[] {
    return this._behaviors;
  }

  public get longName(): string {
    let name = this.shortName;
    let node = this.parent;
    while (node) {
      name = `${node.shortName}-${name}`;
      node = node.parent;
    }
    return name;
  }

  public get name(): string {
    return this.longName;
  }

  protected self(): Component<TBase> {
    return this;
  }

  add<C extends Constructor<IComponent<TBase>>>(name: string, type: C, options: ComponentOptionsOf<C>): InstanceType<C>;
  add(name: string): IComponent<TBase>;
  add(name: string, type?: Constructor<any>, options?: any): IComponent<TBase> {
    if (type) {
      return new type(this, name, options);
    } else {
      return new Component<TBase>(this, name);
    }
  }

  draft<TDraft extends TBase>(type: Constructor<TDraft>, draft: DeepPartial<TDraft>): this {
    const instance = new type(draft) as DeepPartial<TBase>;
    this._drafts.push(instance);
    return this;
  }

  find<T extends TBase>(type: Constructor<T>): DeepPartial<T> | null {
    return this._drafts.find(element => element instanceof type) as DeepPartial<T> || null;
  }

  findAll<T extends TBase>(type?: Constructor<T>): DeepPartial<T>[] {
    if (!type) {
      return this._drafts as DeepPartial<T>[];
    }
    return this._drafts.filter(element => element instanceof type) as DeepPartial<T>[];
  }

  with(behavior: Behavior): this {
    behavior.__synku_trace = trace(1);
    this._behaviors.push(behavior);
    return this;
  }

  getBehaviors(): Behavior[] {
    const behaviors: Behavior[] = [
      ...this.parent?.getBehaviors() ?? [],
      ...this._behaviors,
    ];
    return behaviors;
  }
}

export abstract class UserComponent<TUserComponentOptions extends {} = {}, T extends any = any> extends Component<T> {
  public readonly options: TUserComponentOptions;
  constructor(parent: IComponent<T> | null, public readonly shortName: string, options: TUserComponentOptions) {
    super(parent, shortName);
    this.options = this.optionsMerge(options, this.optionsDefaults());
    this.init();
  }
  protected optionsMerge(options: TUserComponentOptions, defaults: DeepPartial<TUserComponentOptions>): TUserComponentOptions {
    return {
      ...defaults,
      ...options,
    };
  }
  protected optionsDefaults(): DeepPartial<TUserComponentOptions> {
    return {} as DeepPartial<TUserComponentOptions>;
  }
  protected abstract init(): void;
}
