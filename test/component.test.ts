import { ConfigMap, Secret } from 'kubernetes-models/v1';
import { behavior } from '../src/behavior';
import { Component } from '../src/component';
import { Synthesizer } from '../src/synthesizer';

describe('Component', () => {

  describe('simple', () => {
    const config = {
      data: {
        foo: 'bar',
      },
    };
    const secret = {
      stringData: {
        foo: 'bar',
      },
    };
    const component = new Component(null, 'test');
    component
      .draft(ConfigMap, config)
      .draft(Secret, secret);

    it('should be named', () => {
      expect(component.name).toEqual('test');
    });
    it('should find', () => {
      const d = component.find(ConfigMap);
      expect(d?.data?.foo).toBe(config.data.foo);
    });
    it('should findAll', () => {
      expect(component.findAll(ConfigMap)[0]?.data?.foo).toEqual(config.data.foo);
      expect(component.findAll().length).toEqual(2);
    });
    component.with(behavior(bc => bc.findAll().forEach((r: any) => r.name = bc.name)));

    it('should return synthesis', async () => {
      const synthesizer = new Synthesizer();
      const syn = synthesizer.synth(component);
      expect(syn).toBeDefined();
      expect(syn instanceof Array).toBeTruthy();
      expect(syn.length).toEqual(1);
    });

    it('should include component in synthesis', async () => {
      const synthesizer = new Synthesizer();
      const syn = synthesizer.synth(component);
      const [synComponent] = syn[0];
      expect(synComponent).toEqual(component);
    });

    it('should return modified resources in synthesis', async () => {
      const synthesizer = new Synthesizer();
      const syn = synthesizer.synth(component);
      const [, synResources] = syn[0];
      expect(synResources instanceof Array).toBeTruthy();
      expect(synResources.length).toEqual(2);
      expect((synResources[0] as any).data.foo).toEqual('bar');
    });
  });

  describe('tree', () => {
    const r = new Component(null, 'r');
    it('should have no parent', () => {
      expect(r.parent).toEqual(null);
    });
    const c1 = r.add('c1');
    const c2 = r.add('c2');
    const l = c2.add('l');
    it('should have children', () => {
      expect(r.children).toEqual([c1, c2]);
    });
    it('should have parent', () => {
      expect(c1.parent).toEqual(r);
      expect(c2.parent).toEqual(r);
      expect(l.parent).toEqual(c2);
    });
    it('should have root', () => {
      expect(r.root).toEqual(r);
      expect(c1.root).toEqual(r);
      expect(c2.root).toEqual(r);
      expect(l.root).toEqual(r);
    });
    it('should have name', () => {
      expect(r.name).toBe('r');
      expect(c1.name).toBe('r-c1');
      expect(c2.name).toBe('r-c2');
      expect(l.name).toBe('r-c2-l');
    });
  });

  describe('behaviours', () => {
    it('should behave', async () => {
      const r = new Component(null, 'r');
      r.draft(ConfigMap, {
        data: { foo: 'bar' },
      });
      r.with(behavior((c: any) => c.find(ConfigMap).data!.baz = 'bax'));
      const synthesizer = new Synthesizer();
      const syn = synthesizer.synth(r);
      const [[_, [sr]]] = syn;
      expect((sr as any).data.foo).toEqual('bar');
      expect((sr as any).data.baz).toEqual('bax');
    });
    it('should inherit', async () => {
      const r = new Component(null, 'r');
      const c = r.add('c');
      const l = c.add('l');
      l.draft(ConfigMap, {
        data: { foo: 'bar' },
      });
      r.with(behavior((bc: any) => bc.findAll(ConfigMap).forEach((br: any) => br.data!.baz = 'bax')));
      const synthesizer = new Synthesizer();
      const syn = synthesizer.synth(r);
      const [[_, [sr]]] = syn;
      expect((sr as any).data.foo).toEqual('bar');
      expect((sr as any).data.baz).toEqual('bax');
    });
  });
});
