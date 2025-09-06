import * as k8s from 'kubernetes-models';
import synku, { Behavior, behaviors, components } from '../src/index.js';
import { KafkaChart } from './kafka-chart.js';

const debug: Behavior = component => {
  console.error(`${component.name}`);
  component.findAll().forEach(manifest => {
    console.error(`  ${manifest.apiVersion}:${manifest.kind}`);
  });
}

const namespace = 'example-ns';

export default synku('example', project => {

  project
    .with(debug)
    .with(behaviors.defaultName())
    .with(behaviors.defaultNamespace(namespace))
    .with(behaviors.defaultLabels({
      'static': 'label',
    }))
    .with(behaviors.defaultAnnotations({
      'static': 'annotation',
    }));

  project.add('ui', components.SimpleApp, {
    image: 'custom-ui',
    containerPort: 8080,
  });

  const backend = project.add('backend');
  backend.add('kafka', KafkaChart, {
    initContainers: [
      {
        image: 'foobar',
        name: 'foobar',
        command: ['echo'],
        args: ['foobar'],
      },
    ],
  });

  const queue = backend.add('queue');
  queue
    .draft(k8s.apps.v1.StatefulSet, {
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
    .draft(k8s.v1.Service, {
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 80, targetPort: 8080 }],
      },
    });


  const worker = backend.add('worker');
  worker
    .with(behaviors.matchLabels({
      'component': 'worker',
    }))
    .draft(k8s.apps.v1.Deployment, {
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

  backend.add('api', components.SimpleApp, {
    image: 'custom-api',
    containerPort: 9000,
  });

});
