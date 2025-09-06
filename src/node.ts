
export type NodeWalkCallback<T> = (node: INode<T>) => void;

export interface INode<T> {
  readonly root: T;
  readonly parent: T | null;
  readonly children: T[];
  readonly depth: number;
  walk(callback: NodeWalkCallback<T>, depthFirst: boolean): void;
}

export abstract class Node<T extends Node<T>> implements INode<T> {
  private _children: T[] = [];

  constructor(private _parent: T | null = null) {
    if (this._parent) {
      this._parent._children.push(this.self());
    }
  }

  protected abstract self(): T;

  public get root(): T {
    let current: T = this.self();
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  public get parent(): T | null {
    return this._parent;
  }

  public get children(): T[] {
    return this._children;
  }

  public get depth(): number {
    if (!this.parent) {
      return 0;
    }
    return this.parent.depth + 1;
  }

  public walk(callback: NodeWalkCallback<T>, depthFirst: boolean = false): void {
    if (!depthFirst) {
      callback(this);
    }
    this._children.forEach(node => {
      node.walk(callback);
    });
    if (depthFirst) {
      callback(this);
    }
  }
}
