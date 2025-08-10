import { ConfigMap } from 'kubernetes-models/v1';
import { Release } from '../src/release';

describe('Release', () => {

  it('should create', async () => {
    const release = Release.new('test', r => {
      r.component('c1', c => {
        c.manifest(ConfigMap, {
          data: { test: 'value' },
        });
      });
      r.component('c2', c => {
        c.manifest(ConfigMap, {
          data: { test2: 'value2' },
        });
      });
    });

    const syn = await release.synth();
    const [[, [r1]], [, [r2]]] = syn;
    expect(r1.metadata.name).toEqual('test-c1');
    expect(r2.metadata.name).toEqual('test-c2');
    expect(r1.metadata.labels).toEqual({
      'synku/release': 'test',
      'synku/component': 'test-c1',
    });
    expect(r2.metadata.labels).toEqual({
      'synku/release': 'test',
      'synku/component': 'test-c2',
    });
  });

});
