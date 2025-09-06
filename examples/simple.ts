import * as k8s from 'kubernetes-models';
import synku, { behavior } from '../src/index.js';

const externalSecretMysqlUsers = `example-mysql-users`;

export default synku('example-simple', async release => {

  // print objects
  release.with(behavior(component => {
    console.error(component.name);
    component.findAll().forEach(manifest => console.error(` - ${manifest.apiVersion}:${manifest.kind}`));
  }));

  // default name
  release.with(behavior(component => {
    component.findAll().forEach(manifest => {
      manifest.metadata ??= {};
      manifest.metadata.name ??= component.name;
    });
  }));

  // common labels
  release.with(behavior(component => {
    component.findAll().forEach(manifest => {
      manifest.metadata ??= {};
      manifest.metadata.labels = {
        'synku/release': release.name,
        ...manifest.metadata.labels,
      };
    });
  }));

  release.draft(k8s.v1.ConfigMap, {
    metadata: {
      name: `${release.name}-config`,
    },
    data: {
      ENV: 'development',
    },
  });

  const backend = release.add('backend');
  const db = backend.add('db');
  
  const matchLabels = {
    'synku/app': `${db.name}`
  };
  
  db.draft(k8s.v1.Service, {
    spec: {
      type: 'ClusterIP',
      selector: {
        ...matchLabels,
      },
      ports: [
        {
          port: 3306,
          targetPort: 3306,
        },
      ],
    },
  });
  
  db.draft(k8s.apps.v1.StatefulSet, {
    spec: {
      serviceName: db.name,
      replicas: 3,
      volumeClaimTemplates: [
        {
          metadata: {
            name: 'data',
          },
          spec: {
            accessModes: ["ReadWriteOnce"],
            resources: {
              requests: {
                storage: '1Gi',
              },
            },
          },
        },
      ],
      template: {
        metadata: {
          labels: {
            ...matchLabels,
          },
        },
        spec: {
          containers: [
            {
              image: 'bitnami/mysql:latest',
              envFrom: [
                {
                  secretRef: {
                    name: externalSecretMysqlUsers,
                  },
                },
              ],
              volumeMounts: [
                {
                  name: 'data',
                  mountPath: '/bitnami/mysql/data',
                },
              ],
            },
          ],
        },
      },
    },
  });

  const api = backend.add('api');
  api.draft(k8s.apps.v1.Deployment, {
    spec: {
      replicas: 2,
      template: {
        spec: {
          containers: [
            {
              image: 'example-api:latest',
              env: [
                { name: 'DB_HOST', value: db.name },
              ],
            },
          ],
        },
      },
    },
  });

  const worker = backend.add('worker');
  worker.draft(k8s.apps.v1.Deployment, {
    spec: {
      replicas: 2,
      template: {
        spec: {
          containers: [
            {
              image: 'example-worker:latest',
              env: [
                { name: 'DB_HOST', value: db.name },
              ],
            },
          ],
        },
      },
    },
  });

  const frontend = release.add('frontend');
  frontend.draft(k8s.apps.v1.Deployment, {
    spec: {
      replicas: 2,
      template: {
        spec: {
          containers: [
            {
              image: 'nginx:latest',
              env: [
                { name: 'UPSTREAM_BACKEND', value: `http://${backend.name}:8080` },
              ],
            },
          ],
        },
      },
    },
  });

});
