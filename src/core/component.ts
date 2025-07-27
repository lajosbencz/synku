import { ObjectReference } from "kubernetes-models/v1";
import { IBehaviour } from "./behaviour";
import { INode, Node } from "./node";
import { DeepPartial, KubernetesObject } from "./types";
import { validateNamingCollisions, NamingCollisionError, validateManifestWithContext } from "./validation";

export interface Manifest {
  type: new (...args: any[]) => KubernetesObject;
  data: KubernetesObject;
}

export interface IComponent extends INode {
  readonly name: string;
  readonly manifests: Manifest[];
  readonly behaviours: IBehaviour[];
  getFullName(): string;
  addManifest<T extends new (...args: any[]) => KubernetesObject>(type: T, spec: DeepPartial<InstanceType<T>>): void;
  addBehaviour(behaviour: IBehaviour): void;
  findManifests(): Manifest[];
  findManifests<T extends KubernetesObject>(type: new (...args: any[]) => T, predicate?: (manifest: DeepPartial<T>) => boolean): DeepPartial<T>[];
  synth(): [IComponent, KubernetesObject][];
  validate(): void;
}

export class ComponentHelper {
  private readonly component: IComponent;
  constructor(component: IComponent) {
    this.component = component;
  }
  suffixName = (suffix: string): string => {
    return `${this.component.getFullName()}-${suffix}`;
  }
}

export type ComponentInitializer = (component: IComponent, helper: ComponentHelper) => void;

export class Component extends Node implements IComponent {
  private _manifests: Manifest[] = [];
  private _behaviours: IBehaviour[] = [];
  get manifests(): Manifest[] {
    return this._manifests;
  }
  get behaviours(): IBehaviour[] {
    return this._behaviours;
  }
  constructor(parent: INode | undefined, public readonly name: string, init: ComponentInitializer) {
    super(parent, name);
    const helper = new ComponentHelper(this);
    init(this, helper);
  }
  getFullName(): string {
    let name = '';
    let node: IComponent | undefined = this;
    do {
      name = `${node.name}-${name}`;
      node = node.parent as IComponent;
    } while (node);
    return name.replace(/-$/, '');
  }
  addManifest<T extends new (...args: any[]) => KubernetesObject>(type: T, spec: DeepPartial<InstanceType<T>>): void {
    const instance = new type(spec as any) as ObjectReference;
    const data = instance.toJSON();
    this._manifests.push({ type, data });
  }
  addBehaviour(behaviour: IBehaviour): void {
    this._behaviours.push(behaviour);
  }
  findManifests<T extends KubernetesObject>(type?: new (...args: any[]) => T, predicate?: (manifest: DeepPartial<T>) => boolean): any {
    if (!type) {
      return this._manifests;
    }

    const typed = this._manifests.filter((manifest) => manifest.type === type).map(manifest => manifest.data as DeepPartial<T>);

    if (predicate) {
      return typed.filter(predicate);
    }

    return typed;
  }
  synth(): [IComponent, KubernetesObject][] {
    const manifests: [IComponent, KubernetesObject][] = [];

    for (const behaviour of this._behaviours) {
      behaviour(this);
    }

    for (const manifest of this._manifests) {
      const processedData = JSON.parse(JSON.stringify(manifest.data));
      manifests.push([this, processedData]);
    }

    for (const child of this.children) {
      if (child instanceof Component) {
        for (const behaviour of this._behaviours) {
          behaviour(child);
        }

        for (const [childComponent, childManifest] of child.synth()) {
          manifests.push([childComponent, childManifest]);
        }
      }
    }
    return manifests;
  }

  validate(): void {
    const synthesizedManifests = this.synth();

    const collisionResult = validateNamingCollisions(synthesizedManifests);
    if (collisionResult.hasCollisions) {
      throw new NamingCollisionError(collisionResult);
    }

    for (const [component, processedData] of synthesizedManifests) {
      const originalManifest = component.manifests.find(m =>
        m.data.apiVersion === processedData.apiVersion &&
        m.data.kind === processedData.kind &&
        m.data.metadata?.name === processedData.metadata?.name
      );

      if (originalManifest) {
        validateManifestWithContext(component, processedData, originalManifest.type);
      }
    }
  }
}

export class Release<ContextType> extends Component implements IComponent {
  constructor(name: string, public readonly context: ContextType, init: (release: IComponent) => void) {
    super(undefined, name, init);
  }
}
