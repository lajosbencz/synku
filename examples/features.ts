import * as k8s from 'kubernetes-models';
import { Behavior, Component, IComponent, behavior, component } from '../src/index.js';
import { KafkaChart } from './kafka-chart.js';
import { SimpleApp } from '../src/component/default.js';

const debug: Behavior = component => {
  console.error(`${component.fullName}`);
  component.findAll().forEach(manifest => {
    console.error(`  ${manifest.apiVersion}:${manifest.kind}`);
  });
}

const namespace = 'example-ns';

const project = new Component("example");

project
  .behavior(debug)
  .behavior(behavior.defaultName())
  .behavior(behavior.defaultNamespace(namespace))
  .behavior(behavior.defaultLabels({
    'static': 'label',
  }))
  .behavior(behavior.defaultAnnotations({
    'static': 'annotation',
  }))

project.component(new SimpleApp('ui', {
  image: 'custom-ui',
  containerPort: 8080,
}))
project.component('backend', backend => {
  backend.component(new KafkaChart(namespace, 'kafka', {
    initContainers: [
      {
        image: 'foobar',
        name: 'foobar',
        command: ['echo'],
        args: ['foobar'],
      },
    ],
  }))
  backend.component('queue', queue => {
    queue
      .manifest(k8s.apps.v1.StatefulSet, {
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
      .manifest(k8s.v1.Service, {
        spec: {
          type: 'ClusterIP',
          ports: [{ port: 80, targetPort: 8080 }],
        },
      });
  })
  backend.component('worker', worker => {
    worker
      .behavior(behavior.matchLabels({
        'component': 'worker',
      }))
      .manifest(k8s.apps.v1.Deployment, {
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
  })

  backend.component(new SimpleApp('api', {
    image: 'custom-api',
    containerPort: 9000,
  }))

});

export default project;