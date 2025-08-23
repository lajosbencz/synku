import * as k8s from 'kubernetes-models';
import { Behavior, Component, IComponent, behavior } from '../src/index.js';
import { KafkaChart } from './kafka-chart.js';

const debug: Behavior = (component: IComponent) => {
  console.error(`${component.fullName}`);
  component.findAll().forEach(manifest => {
    console.error(`  ${manifest.apiVersion}:${manifest.kind}`);
  });
}

const namespace = 'example-ns';

export default
  new Component("example")
    .behavior(debug)
    .behavior(behavior.defaultName())
    .behavior(behavior.defaultNamespace(namespace))
    .behavior(behavior.defaultLabels({
      'static': 'label',
    }))
    .behavior(behavior.defaultAnnotations({
      'static': 'annotation',
    }))
    .component('ui', ui => {
      ui.behavior(behavior.simpleApp({
        image: 'custom-ui',
        containerPort: 3000,
      }));
    })
    .component('backend', backend => {
      backend.component(new KafkaChart(namespace, 'kafka', {
        initContainers: [
          {
            image: 'foobar',
            name: 'foobar',
            command: ['echo'],
            args: ['foobar'],
          },
        ],
      }));

      const test1 = new Component('test1');
      test1.manifest(k8s.v1.ServiceAccount, {});
      backend.component(test1);

      backend.component('test2', test2 => {
        test2.manifest(k8s.v1.ServiceAccount, {});
      });

      // create queue component nested under backend
      backend.component('queue', queue => {
        queue.manifest(k8s.apps.v1.StatefulSet, {
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    image: 'mqtt',
                  },
                ],
              },
            },
          },
        })
        queue.manifest(k8s.v1.Service, {
          spec: {
            type: 'ClusterIP',
            ports: [{ port: 80, targetPort: 8080 }],
          },
        });
      });

      // create worker component nested under backend
      backend.component('worker', queue => {
        queue.manifest(k8s.apps.v1.Deployment, {
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    image: 'custom-worker',
                  },
                ],
              },
            },
          },
        });
      });

      // create api component nested under backend
      backend.component('api').behavior(behavior.simpleApp({
        image: 'custom-api',
        containerPort: 8080,
      }));
    });

