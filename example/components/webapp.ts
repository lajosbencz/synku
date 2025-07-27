import { Component, IComponent } from 'synku'
import * as k8s from 'kubernetes-models'

export function createWebApp(release: IComponent) {
  const app = new Component(release, 'webapp', (webapp) => {
    webapp.addManifest(k8s.apps.v1.Deployment, {
      spec: {
        replicas: 1,
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
    })

    webapp.addManifest(k8s.v1.Service, {
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 80, targetPort: 80 }],
      },
    })
  })

  return app
}
