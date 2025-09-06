import { ConfigMap } from 'kubernetes-models/v1';
import { defaultLabels, defaultAnnotations } from '../src/behaviors/metadata';
import { Component } from '../src/component';
import { Synthesizer } from '../src/synthesizer';

describe('Behavior', () => {

  it('should add default labels', async () => {
    const component = new Component(null, 'test');
    component.draft(ConfigMap, {
      data: { test: 'value' },
    });
    component.with(defaultLabels({ 'my-label': 'my-value' }));

    const synthesizer = new Synthesizer();
    const syn = synthesizer.synth(component);
    const [[, resources]] = syn;
    resources.forEach((r: any) => {
      expect(r.metadata.labels).toEqual({ 'my-label': 'my-value' });
    });
  });

  it('should add default annotations', async () => {
    const component = new Component(null, 'test');
    component.draft(ConfigMap, {
      data: { test: 'value' },
    });
    component.with(defaultAnnotations({ 'my-annotation': 'my-value' }));

    const synthesizer = new Synthesizer();
    const syn = synthesizer.synth(component);
    const [[, resources]] = syn;
    resources.forEach((r: any) => {
      expect(r.metadata.annotations).toEqual({ 'my-annotation': 'my-value' });
    });
  });

});
