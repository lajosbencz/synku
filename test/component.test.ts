import { ConfigMap, Secret } from 'kubernetes-models/v1';
import { Component, manifestEquality } from '../src/component';

describe('Component', () => {

  describe('resourceEquality', () => {
    it('should match instance types', () => {
      const a = new ConfigMap({ data: { foo: 'bar' } });
      const b = new ConfigMap({ data: { baz: 'bax' } });
      expect(manifestEquality(a, b)).toBeTruthy();
    });
    it('should match any types', () => {
      const a = { apiVersion: ConfigMap.apiVersion, kind: ConfigMap.kind, data: { foo: 'bar' } };
      const b = { apiVersion: ConfigMap.apiVersion, kind: ConfigMap.kind, data: { baz: 'bax' } };
      expect(manifestEquality(a, b)).toBeTruthy();
    });
    it('should not match instance types', () => {
      const a = new ConfigMap({ data: { foo: 'bar' } });
      const b = new Secret({ stringData: { baz: 'bax' } });
      expect(manifestEquality(a, b)).toBeFalsy();
    });
    it('should not match any types', () => {
      const a = { apiVersion: ConfigMap.apiVersion, kind: ConfigMap.kind, data: { foo: 'bar' } };
      const b = { apiVersion: Secret.apiVersion, kind: Secret.kind, stringData: { baz: 'bax' } };
      expect(manifestEquality(a, b)).toBeFalsy();
    });
  });

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
    const component = new Component('test');
    component
      .manifest(ConfigMap, config)
      .manifest(Secret, secret);

    it('should be named', () => {
      expect(component.name).toEqual('test');
    });
    it('should find', () => {
      const d = component.find(ConfigMap);
      expect(d.data!.foo).toBe(config.data.foo);
    });
    it('should findAll', () => {
      expect(component.findAll(ConfigMap)[0].data.foo).toEqual(config.data.foo);
      expect(component.findAll(Secret, ConfigMap).length).toEqual(2);
    });
    component.behavior(bc => bc.findAll().forEach(r => r.name = bc.name));

    it('should return synthesis', async () => {
      const syn = await component.synth();
      expect(syn).toBeDefined();
      expect(syn instanceof Array).toBeTruthy();
      expect(syn.length).toEqual(1);
    });

    it('should include component in synthesis', async () => {
      const syn = await component.synth();
      const [synComponent] = syn[0];
      expect(synComponent).toEqual(component);
    });

    it('should return modified resources in synthesis', async () => {
      const syn = await component.synth();
      const [, synResources] = syn[0];
      expect(synResources instanceof Array).toBeTruthy();
      expect(synResources.length).toEqual(2);
      expect(synResources[0].data.foo).toEqual('bar');
    });
  });

  describe('tree', () => {
    const r = new Component('r');
    it('should have no parent', () => {
      expect(r.parent).toEqual(undefined);
    });
    const c1 = r.component('c1');
    const c2 = r.component('c2');
    const l = c2.component('l');
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
    it('should have fullName', () => {
      expect(r.fullName).toBe('r');
      expect(c1.fullName).toBe('r-c1');
      expect(c2.fullName).toBe('r-c2');
      expect(l.fullName).toBe('r-c2-l');
    });
  });

  describe('behaviours', () => {
    it('should behave', async () => {
      const r = new Component('r');
      r.manifest(ConfigMap, {
        data: { foo: 'bar' },
      });
      r.behavior(c => c.find(ConfigMap).data!.baz = 'bax');
      const syn = await r.synth();
      const [[_, [sr]]] = syn;
      expect(sr.data.foo).toEqual('bar');
      expect(sr.data.baz).toEqual('bax');
    });
    it('should inherit', async () => {
      const r = new Component('r');
      r.component('c', c => {
        c.component('l', l => {
          l.manifest(ConfigMap, {
            data: { foo: 'bar' },
          });
        });
      });
      r.behavior(bc => bc.findAll(ConfigMap).forEach(br => br.data!.baz = 'bax'));
      const syn = await r.synth();
      const [[_, [sr]]] = syn;
      expect(sr.data.foo).toEqual('bar');
      expect(sr.data.baz).toEqual('bax');
    });
  });
});
