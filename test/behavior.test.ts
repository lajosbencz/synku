import { ConfigMap } from 'kubernetes-models/v1';
import { defaultLabels, defaultAnnotations } from '../src/behavior/metadata';
import { Component } from '../src/component';

describe('Behavior', () => {

  it('should add default labels', async () => {
    const component = new Component(undefined, 'test');
    component.manifest(ConfigMap, {
      data: { test: 'value' },
    });
    component.behavior(defaultLabels({ 'my-label': 'my-value' }));

    const syn = await component.synth();
    const [[, resources]] = syn;
    resources.forEach((r: any) => {
      expect(r.metadata.labels).toEqual({ 'my-label': 'my-value' });
    });
  });

  it('should add default annotations', async () => {
    const component = new Component(undefined, 'test');
    component.manifest(ConfigMap, {
      data: { test: 'value' },
    });
    component.behavior(defaultAnnotations({ 'my-annotation': 'my-value' }));

    const syn = await component.synth();
    const [[, resources]] = syn;
    resources.forEach((r: any) => {
      expect(r.metadata.annotations).toEqual({ 'my-annotation': 'my-value' });
    });
  });

});
