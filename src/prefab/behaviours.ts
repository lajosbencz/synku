import { IBehaviour } from '../core/behaviour'
import { IComponent } from '../core/component'
import * as k8s from 'kubernetes-models'

/**
 * Applies default names to all manifests in a component based on the component's full name.
 * If a manifest doesn't have a name, it will be set to the component's full name.
 *
 * @example
 * ```typescript
 * component.addBehaviour(withDefaultName)
 * ```
 */
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

/**
 * Applies default Kubernetes labels to all manifests in a component.
 * Sets `app.kubernetes.io/name` to the root component name and
 * `app.kubernetes.io/component` to the current component's full name.
 *
 * @example
 * ```typescript
 * component.addBehaviour(withDefaultLabels)
 * ```
 */
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

/**
 * Applies default container configuration to Deployment manifests.
 * Sets up proper selectors, labels, and container names for Kubernetes Deployments.
 *
 * @example
 * ```typescript
 * component.addBehaviour(withDefaultContainer)
 * ```
 */
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

/**
 * Applies default resource requests and limits to all containers in Deployment manifests.
 *
 * @param resources - The resource configuration to apply
 * @param resources.requests - Resource requests (CPU and memory)
 * @param resources.limits - Resource limits (CPU and memory)
 *
 * @example
 * ```typescript
 * component.addBehaviour(withDefaultResources({
 *   requests: { cpu: '100m', memory: '128Mi' },
 *   limits: { cpu: '500m', memory: '512Mi' }
 * }))
 * ```
 */
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

/**
 * Applies custom labels to all manifests in a component.
 *
 * @param labels - Key-value pairs of labels to apply
 *
 * @example
 * ```typescript
 * component.addBehaviour(withLabels({
 *   'environment': 'production',
 *   'team': 'backend'
 * }))
 * ```
 */
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

/**
 * Applies custom annotations to all manifests in a component.
 *
 * @param annotations - Key-value pairs of annotations to apply
 *
 * @example
 * ```typescript
 * component.addBehaviour(withAnnotations({
 *   'deployment.kubernetes.io/revision': '1',
 *   'prometheus.io/scrape': 'true'
 * }))
 * ```
 */
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

/**
 * Applies a namespace to all manifests in a component.
 *
 * @param namespace - The namespace name to apply, or undefined to remove namespace
 *
 * @example
 * ```typescript
 * component.addBehaviour(withNamespace('production'))
 * ```
 */
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

/**
 * Applies common Kubernetes labels following best practices.
 * Sets standard labels including app name, component, managed-by, and optionally version.
 *
 * @param name - The application name
 * @param version - The application version (optional)
 *
 * @example
 * ```typescript
 * component.addBehaviour(withCommonLabels('myapp', '1.2.3'))
 * ```
 */
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
