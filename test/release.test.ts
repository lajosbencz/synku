import { ConfigMap } from 'kubernetes-models/v1';
import { Release } from '../src/index';

describe('Release', () => {
  it('should add labels', () => {
    const release = Release.new('test');
    release.resource(ConfigMap, {
      data: {
        foo: 'bar',
      },
    });
    release.component('sub', sub => {
      sub.resource(ConfigMap, {
        data: {
          baz: 'bax',
        },
      });
    });
    const [[, [r1]], [, [r2]]] = release.synth();
    expect(r1).toBeDefined();
    expect(r1.data.foo).toEqual('bar');
    expect(r1.metadata.labels[`${Release.LABEL_PREFIX}release`]).toEqual('test');
    expect(r1.metadata.labels[`${Release.LABEL_PREFIX}component`]).toEqual('test');
    expect(r2).toBeDefined();
    expect(r2.data.baz).toEqual('bax');
    expect(r2.metadata.labels[`${Release.LABEL_PREFIX}release`]).toEqual('test');
    expect(r2.metadata.labels[`${Release.LABEL_PREFIX}component`]).toEqual('test-sub');
  });
});
