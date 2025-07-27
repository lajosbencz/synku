import { IBehaviour } from '../core/behaviour'
import { IComponent } from '../core/component'
import * as k8s from 'kubernetes-models'

export const withDefaultName: IBehaviour = (component: IComponent) => {
  const manifests = component.findManifests()
  for (const manifest of manifests) {
    if (!manifest.data.metadata) {
      manifest.data.metadata = {}
    }
    if (!manifest.data.metadata.name) {
      manifest.data.metadata.name = component.getFullName()
    }
  }
}

export const withDefaultLabels: IBehaviour = (component: IComponent) => {
  const manifests = component.findManifests()
  for (const manifest of manifests) {
    if (!manifest.data.metadata) {
      manifest.data.metadata = {}
    }
    if (!manifest.data.metadata.labels) {
      manifest.data.metadata.labels = {}
    }

    const root = component.getRoot()
    manifest.data.metadata.labels['app.kubernetes.io/name'] = root.name
    manifest.data.metadata.labels['app.kubernetes.io/component'] = component.getFullName()
  }
}

export const withDefaultContainer: IBehaviour = (component: IComponent) => {
  const manifests = component.findManifests(k8s.apps.v1.Deployment)
  for (const manifest of manifests) {
    const matchName = manifest.metadata?.name ?? component.getFullName()
    if (!manifest.spec) {
      manifest.spec = {}
    }
    if (!manifest.spec.selector) {
      manifest.spec.selector = {}
    }
    if (!manifest.spec.selector.matchLabels) {
      manifest.spec.selector.matchLabels = {}
    }
    manifest.spec.selector.matchLabels = {
      ...manifest.metadata?.labels,
      'synku/match': matchName,
      ...manifest.spec.selector.matchLabels,
    }
    if (!manifest.spec.template) {
      manifest.spec.template = {}
    }
    if (!manifest.spec.template.metadata) {
      manifest.spec.template.metadata = {}
    }
    if (!manifest.spec.template.metadata.labels) {
      manifest.spec.template.metadata.labels = {}
    }
    manifest.spec.template.metadata.labels = {
      ...manifest.metadata?.labels,
      'synku/match': matchName,
      ...manifest.spec.template.metadata.labels,
    }
    for (const container of manifest.spec?.template?.spec?.containers ?? []) {
      container.name ??= manifest.metadata?.name ?? component.name
    }
  }
}

export const withDefaultResources = (resources: {
  requests: { cpu: string; memory: string }
  limits: { cpu: string; memory: string }
}): IBehaviour => {
  return (component: IComponent) => {
    for (const manifest of component.findManifests(k8s.apps.v1.Deployment)) {
      manifest.spec?.template?.spec?.containers?.map(
        (container) =>
          (container.resources = {
            ...container.resources,
            requests: {
              ...container.resources?.requests,
              ...resources.requests,
            },
            limits: {
              ...container.resources?.limits,
              ...resources.limits,
            },
          })
      )
    }
  }
}

export const withLabels = (labels: Record<string, string>): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests()
    for (const manifest of manifests) {
      if (!manifest.data.metadata) {
        manifest.data.metadata = {}
      }
      if (!manifest.data.metadata.labels) {
        manifest.data.metadata.labels = {}
      }
      Object.assign(manifest.data.metadata.labels, labels)
    }
  }
}

export const withAnnotations = (annotations: Record<string, string>): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests()
    for (const manifest of manifests) {
      if (!manifest.data.metadata) {
        manifest.data.metadata = {}
      }
      if (!manifest.data.metadata.annotations) {
        manifest.data.metadata.annotations = {}
      }

      Object.assign(manifest.data.metadata.annotations, annotations)
    }
  }
}

export const withNamespace = (namespace?: string): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests()
    for (const manifest of manifests) {
      if (!manifest.data.metadata) {
        manifest.data.metadata = {}
      }
      manifest.data.metadata.namespace = namespace ?? undefined
    }
  }
}

export const withCommonLabels = (name: string, version?: string): IBehaviour => {
  return (component: IComponent) => {
    const manifests = component.findManifests()
    for (const manifest of manifests) {
      if (!manifest.data.metadata) {
        manifest.data.metadata = {}
      }
      if (!manifest.data.metadata.labels) {
        manifest.data.metadata.labels = {}
      }

      manifest.data.metadata.labels['app.kubernetes.io/name'] = name
      manifest.data.metadata.labels['app.kubernetes.io/component'] = component.getFullName()
      manifest.data.metadata.labels['app.kubernetes.io/managed-by'] = 'synku'

      if (version) {
        manifest.data.metadata.labels['app.kubernetes.io/version'] = version
      }
    }
  }
}
