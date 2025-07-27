import { Node } from "./node"

describe('Node', () => {
    it('should have a parent', () => {
        const parent = new Node(undefined, 'parent');
        const child = new Node(parent, 'child');
        expect(child.parent).toBe(parent);
    })
})
