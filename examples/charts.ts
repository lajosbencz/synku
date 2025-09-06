import * as k8s from 'kubernetes-models';
import synku, { Behavior, behavior, components, behaviors } from '../src/index';
import { KafkaChart } from './kafka-chart';
import { KafkaConnectChart } from './kafkaconnect-chart'

const debug: Behavior = component => {
  console.error(`${component.name}`);
  component.findAll().forEach(manifest => {
    console.error(`  ${manifest.apiVersion}:${manifest.kind}`);
  });
}

const defaultContainerName: Behavior = component => {
  component.findAll(k8s.apps.v1.Deployment).forEach(deployment => {
    const containers = deployment.spec?.template?.spec?.containers;
    if (containers) {
      containers.forEach((container: any, ci: number) => {
        container.name ??= container.image?.split(':')[0]?.split('/').pop() ?? `${component.name}-${ci}`;
      });
    }
  })
}

const namespace = 'example-ns';

export default synku("example-charts", async release => {
  release
    .with(behavior(debug))
    .with(behaviors.defaultName())
    .with(behaviors.defaultNamespace(namespace))
    .with(behaviors.defaultLabels({
      'static': 'label',
    }))
    .with(behaviors.defaultAnnotations({
      'static': 'annotation',
    }))
    .with(behaviors.defaultResources({
      requests: {
        cpu: '250m',
        memory: '512Mi',
      },
      limits: {
        cpu: '1000m',
        memory: '512Mi',
      },
    }))
    .with(behavior(defaultContainerName));

  const frontend = release.add('frontend', components.SimpleApp, {
    image: 'custom-ui',
    containerPort: 8080,
  });

  const backend = release.add('backend');
  
  const kafka = backend.add('kafka', KafkaChart, {
    initContainers: [
      {
        image: 'foobar',
        name: 'foobar',
        command: ['echo'],
        args: ['kafka'],
      },
    ],
  });

  const kafkaConnect = backend.add('kafka-connect', KafkaConnectChart, {
    kafka: {
      create: false,
    },
  });

  const queue = backend.add('queue');
  queue
    .draft(k8s.apps.v1.StatefulSet, {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'mqtt',
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

  const api = backend.add('api', components.SimpleApp, {
    image: 'custom-api',
    containerPort: 9000,
  });
});
