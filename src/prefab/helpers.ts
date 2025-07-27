import * as k8s from 'kubernetes-models'
import { IComponent, Component } from '../core/component'
import { withDefaultName, withDefaultLabels, withNamespace } from './behaviours'

export const createDeployment = (
  parent: IComponent,
  name: string,
  image: string,
  options: {
    port?: number
    replicas?: number
    env?: Record<string, string>
    namespace?: string
  } = {}
): Component => {
  const { port = 8080, replicas = 1, env = {}, namespace } = options

  return new Component(parent, name, (component) => {
    component.addManifest(k8s.apps.v1.Deployment, {
      spec: {
        replicas,
        selector: {
          matchLabels: {
            app: component.getFullName(),
          },
        },
        template: {
          metadata: {
            labels: {
              app: component.getFullName(),
            },
          },
          spec: {
            containers: [
              {
                name: component.getFullName(),
                image,
                ports: [{ containerPort: port }],
                env: Object.entries(env).map(([name, value]) => ({
                  name,
                  value,
                })),
              },
            ],
          },
        },
      },
    })

    component.addBehaviour(withDefaultName)
    component.addBehaviour(withDefaultLabels)
    if (namespace) {
      component.addBehaviour(withNamespace(namespace))
    }
  })
}

export const createService = (
  parent: IComponent,
  name: string,
  options: {
    port?: number
    targetPort?: number
    type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
    namespace?: string
  } = {}
): Component => {
  const { port = 80, targetPort = 8080, type = 'ClusterIP', namespace } = options

  return new Component(parent, name, (component) => {
    component.addManifest(k8s.v1.Service, {
      spec: {
        type,
        ports: [
          {
            port,
            targetPort,
            protocol: 'TCP',
          },
        ],
        selector: {
          app: parent.getFullName(),
        },
      },
    })

    component.addBehaviour(withDefaultName)
    component.addBehaviour(withDefaultLabels)
    if (namespace) {
      component.addBehaviour(withNamespace(namespace))
    }
  })
}

export const createConfigMap = (
  parent: IComponent,
  name: string,
  data: Record<string, string>,
  options: {
    namespace?: string
  } = {}
): Component => {
  const { namespace } = options

  return new Component(parent, name, (component) => {
    component.addManifest(k8s.v1.ConfigMap, {
      data,
    })

    component.addBehaviour(withDefaultName)
    component.addBehaviour(withDefaultLabels)
    if (namespace) {
      component.addBehaviour(withNamespace(namespace))
    }
  })
}

export const createSecret = (
  parent: IComponent,
  name: string,
  data: Record<string, string>,
  options: {
    type?: string
    namespace?: string
  } = {}
): Component => {
  const { type = 'Opaque', namespace } = options

  return new Component(parent, name, (component) => {
    component.addManifest(k8s.v1.Secret, {
      type,
      stringData: data,
    })

    component.addBehaviour(withDefaultName)
    component.addBehaviour(withDefaultLabels)
    if (namespace) {
      component.addBehaviour(withNamespace(namespace))
    }
  })
}

export const createIngress = (
  component: IComponent,
  name: string,
  host: string,
  serviceName: string,
  options: {
    servicePort?: number
    path?: string
    pathType?: 'Prefix' | 'Exact' | 'ImplementationSpecific'
    namespace?: string
    tls?: boolean
    tlsSecretName?: string
  } = {}
): k8s.networkingK8sIo.v1.Ingress => {
  const { servicePort = 80, path = '/', pathType = 'Prefix', namespace, tls = false, tlsSecretName } = options

  const ingressSpec: any = {
    rules: [
      {
        host,
        http: {
          paths: [
            {
              path,
              pathType,
              backend: {
                service: {
                  name: serviceName,
                  port: {
                    number: servicePort,
                  },
                },
              },
            },
          ],
        },
      },
    ],
  }

  if (tls) {
    ingressSpec.tls = [
      {
        hosts: [host],
        secretName: tlsSecretName || `${component.getFullName()}-tls`,
      },
    ]
  }

  const ingress = new k8s.networkingK8sIo.v1.Ingress({
    spec: ingressSpec,
  })

  component.addManifest(k8s.networkingK8sIo.v1.Ingress, ingress)
  return ingress
}
