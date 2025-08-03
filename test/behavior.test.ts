import { Deployment } from 'kubernetes-models/apps/v1';
import { ConfigMap } from 'kubernetes-models/v1';
import { chain } from '../src/behavior';
import { Component } from '../src/component';

describe('Behavior', () => {
  it('should chain', () => {
    const component = new Component(undefined, 'test');
    component
      .resource(ConfigMap, {})
      .resource(Deployment, {});
    component.behavior(chain(
      c => c.findAll().forEach(r => r.metadata.name = c.fullName),
      c => c.findAll().forEach(r => r.metadata.annotations = { foo: `${r.metadata.name}-bar` }),
    ));
    const [[, resources]] = component.synth();
    resources.forEach(r => {
      expect(r.metadata.name).toEqual('test');
      expect(r.metadata.annotations.foo).toEqual('test-bar');
    });
  });
});
