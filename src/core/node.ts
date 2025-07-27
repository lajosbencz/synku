export interface INode {
  readonly name: string
  readonly parent: INode | undefined
  readonly children: INode[]
  readonly data?: unknown
  setParent(parent: INode | undefined): void
  addChild(child: INode): void
  removeChild(child: INode): void
  getRoot(): INode
}

export class Node implements INode {
  private _parent: INode | undefined
  private _children: INode[] = []
  get children(): INode[] {
    return this._children
  }
  constructor(
    parent: INode | undefined,
    public readonly name: string,
    public readonly data?: unknown
  ) {
    this.setParent(parent)
  }

  get parent(): INode | undefined {
    return this._parent
  }

  setParent(parent: INode | undefined): void {
    if (this._parent === parent) {
      return
    }
    if (this._parent) {
      this._parent.removeChild(this)
    }
    this._parent = parent
    parent?.addChild(this)
  }

  getRoot(): INode {
    let node: INode = this
    let N = 1024
    do {
      if (!node.parent) {
        return node
      }
      node = node.parent
    } while (node && --N > 0)
    throw new Error('Root node not found')
  }

  addChild(child: INode): void {
    this._children.push(child)
  }

  removeChild(child: INode): void {
    const index = this._children.indexOf(child)
    if (index > -1) {
      this._children.splice(index, 1)
    }
  }
}
