#!/bin/env node

import fs from 'fs'
import yaml from 'js-yaml'
import { Component, IComponent, Release } from '../core/component';
import { YamlWriter } from '../writer/yaml';
import {
  withDefaultName,
  withNamespace,
  withLabels,
  withCommonLabels,
  withDefaultContainer,
  withDefaultResources
} from '../prefab/behaviours';
import {
  createIngress
} from '../prefab/helpers';
import { IBehaviour } from '@core/behaviour';
import * as k8s from 'kubernetes-models';

const CONFIG_FILE_PATH = 'context.yaml'


const withNodeEnv = (env: 'production' | 'staging' | 'development' | string): IBehaviour => {
  const key = 'NODE_ENV';
  return (component: IComponent) => {
    component.findManifests(k8s.apps.v1.Deployment).forEach(manifest => {
      manifest.spec?.template?.spec?.containers?.forEach(container => {
        container.env ??= [];
        container.env = [
          ...container.env.filter((_, index, self) => index !== self.findIndex(t => t.name === key)),
          { name: key, value: env },
        ];
      });
    });
  }
};

async function main() {

  const fileContext = fs.existsSync(CONFIG_FILE_PATH)
    ? yaml.load(fs.readFileSync(CONFIG_FILE_PATH)?.toString() ?? '') as {}
    : {};
  const context: Record<string, string> = {
    environment: 'development',
    ...fileContext,
  };

  const release = new Release('webapp', context, (release) => {
    const { namespace, environment, version } = context;

    if (namespace) {
      release.addManifest(k8s.v1.Namespace, {
        metadata: {
          name: namespace,
        },
      });
    }

    release.addManifest(k8s.v1.ConfigMap, {
      data: {
        'DATABASE_HOST': 'postgres.webapp-prod',
        'REDIS_HOST': 'redis.webapp-prod',
        'LOG_LEVEL': 'info',
      },
    });

    release.addManifest(k8s.v1.Secret, {
      stringData: {
        'DATABASE_PASSWORD': 'super-secret-password',
        'JWT_SECRET': 'jwt-secret-key',
        'API_KEY': 'external-api-key',
      },
    });

    const frontend = new Component(release, 'frontend', (frontend) => {
      const app = frontend.addManifest(k8s.apps.v1.Deployment, {
        spec: {
          replicas: 2,
          template: {
            spec: {
              containers: [
                {
                  image: 'nginx:alpine',
                  ports: [{ containerPort: 80 }],
                },
              ],
            },
          },
        },
      });
      const svc = frontend.addManifest(k8s.v1.Service, {
        spec: {
          type: 'ClusterIP',
          clusterIP: 'None',
          ports: [{ port: 80, targetPort: 80 }],
          selector: {
            name: frontend.getFullName(),
          },
        },
      });
      const ingress = createIngress(frontend, 'ingress', 'webapp.example.com', 'webapp-frontend-service', {
        servicePort: 80,
        path: '/',
        pathType: 'Prefix',
        namespace,
        tls: true,
        tlsSecretName: 'webapp-tls',
      });
    });

    const backend = new Component(release, 'backend', (backend, { suffixName }) => {
      const app = backend.addManifest(k8s.apps.v1.Deployment, {
        spec: {
          replicas: 2,
          template: {
            spec: {
              containers: [
                {
                  image: 'nginx:alpine',
                  ports: [{ containerPort: 3000 }],
                  env: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'PORT', value: '3000' },
                  ],
                },
              ],
            },
          },
        },
      });

      const svc = backend.addManifest(k8s.v1.Service, {
        spec: {
          type: 'ClusterIP',
          clusterIP: 'None',
          ports: [{ port: 80, targetPort: 3000 }],
        },
      });

      const worker = backend.addManifest(k8s.apps.v1.Deployment, {
        metadata: {
          name: suffixName('worker'),
        },
        spec: {
          replicas: 1,
          template: {
            spec: {
              containers: [
                {
                  env: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'WORKER_TYPE', value: 'background' },
                  ],
                },
              ],
            },
          },
        },
      });

      const ingress = createIngress(backend, 'ingress', 'api.webapp.example.com', 'webapp-api-service', {
        servicePort: 80,
        path: '/',
        pathType: 'Prefix',
        namespace,
        tls: true,
        tlsSecretName: 'webapp-api-tls',
      });
    });

    // Add behaviours to all components
    release.addBehaviour(withDefaultName);
    release.addBehaviour(withNamespace(namespace));
    release.addBehaviour(withCommonLabels('webapp', context.version ?? '0'));
    release.addBehaviour(withLabels({
      'environment': context.environment,
    }));
    release.addBehaviour(withNodeEnv(context.environment));
  });
  release.addBehaviour(withDefaultContainer);
  release.addBehaviour(withDefaultResources({
    requests: {
      cpu: '25m',
      memory: '32Mi',
    },
    limits: {
      cpu: '50m',
      memory: '64Mi',
    },
  }));

  const writer = new YamlWriter();
  writer.write(release, process.stdout);
  release.validate();
}

main().catch(err => {
  console.error(err.message);
  if (err.stack) {
    console.error(`\n`);
    console.error(err.stack);
  };
  process.exit(1);
});
