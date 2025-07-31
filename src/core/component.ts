
export type ComponentInit = (component: IComponent) => void

export interface IComponent {
    readonly name: string;
    readonly fullName: string;
    readonly release: IComponent;
    readonly parent?: IComponent;
    readonly children: IComponent[];
}

export class Component implements IComponent {

    protected _parent?: IComponent;
    public readonly children: IComponent[] = [];

    constructor(public readonly name: string, init: ComponentInit) {
        init(this);
    }

    get release(): IComponent {
        let root: IComponent = this;
        while(root.parent) {
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
}
