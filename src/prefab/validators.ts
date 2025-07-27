import { IValidator, namingCollisionValidator, requiredMetadataValidator, kubernetesSchemaValidator } from '../core/validation'
import * as k8s from 'kubernetes-models'

export const basicValidators: IValidator[] = [requiredMetadataValidator, namingCollisionValidator]

/**
 * Dynamically resolves a Kubernetes model class from the manifest's apiVersion and kind
 */
function resolveKubernetesModelClass(apiVersion: string, kind: string): (new (...args: any[]) => any) | null {
  try {
    // Parse apiVersion into group and version
    const [groupOrVersion, version] = apiVersion.includes('/') ? apiVersion.split('/', 2) : ['', apiVersion]

    // Handle core API resources (v1)
    if (!version) {
      const coreClass = (k8s as any).v1?.[kind]
      if (coreClass && typeof coreClass === 'function') {
        return coreClass
      }
      return null
    }

    // Handle group API resources (e.g., apps/v1, batch/v1)
    const group = groupOrVersion
    const groupModule = (k8s as any)[group]
    if (!groupModule) {
      return null
    }

    const versionModule = groupModule[version]
    if (!versionModule) {
      return null
    }

    const manifestClass = versionModule[kind]
    if (manifestClass && typeof manifestClass === 'function') {
      return manifestClass
    }

    return null
  } catch {
    return null
  }
}

export interface GenericSchemaValidatorOptions {
  /** Whether to treat unknown resource types as errors (default: false) */
  failOnUnknownTypes?: boolean
  /** Whether to include warnings for unknown resource types (default: true) */
  warnOnUnknownTypes?: boolean
  /** Custom type resolver function to supplement the built-in resolver */
  customTypeResolver?: (apiVersion: string, kind: string) => (new (...args: any[]) => any) | null
  /** List of resource types to skip validation for */
  skipTypes?: string[] // format: "apiVersion/kind"
}

/**
 * Creates a generic schema validator that dynamically infers types from manifests
 */
export const createGenericSchemaValidator = (options: GenericSchemaValidatorOptions = {}): IValidator => {
  const { failOnUnknownTypes = false, warnOnUnknownTypes = true, customTypeResolver, skipTypes = [] } = options

  const skipTypesSet = new Set(skipTypes)

  return (manifests) => {
    const errors = []

    for (const [component, manifest] of manifests) {
      const { apiVersion, kind } = manifest

      if (!apiVersion || !kind) {
        continue // Skip manifests without apiVersion/kind (handled by requiredMetadataValidator)
      }

      const typeKey = `${apiVersion}/${kind}`

      // Skip if explicitly configured to skip this type
      if (skipTypesSet.has(typeKey)) {
        continue
      }

      // Try custom resolver first, then built-in resolver
      let ModelClass = customTypeResolver?.(apiVersion, kind) || resolveKubernetesModelClass(apiVersion, kind)

      if (ModelClass) {
        try {
          const validationInstance = new ModelClass(manifest)
          validationInstance.validate()
        } catch (error) {
          if (error instanceof Error) {
            errors.push({
              type: 'schema-validation',
              message: `Schema validation failed for ${apiVersion}/${kind}: ${error.message}`,
              component,
              manifest,
              details: {
                originalError: error,
                apiVersion,
                kind,
              },
            })
          }
        }
      } else if (failOnUnknownTypes || warnOnUnknownTypes) {
        // Handle unknown resource types based on configuration
        const errorType = failOnUnknownTypes ? 'unknown-resource-type' : 'unknown-resource-type-warning'
        const message = failOnUnknownTypes
          ? `Unknown resource type: ${apiVersion}/${kind}. Validation failed.`
          : `Unknown resource type: ${apiVersion}/${kind}. Schema validation skipped.`

        errors.push({
          type: errorType,
          message,
          component,
          manifest,
          details: {
            apiVersion,
            kind,
          },
        })
      }
    }

    // Filter out warnings from validation result if they shouldn't cause validation failure
    const validationErrors = errors.filter((error) => error.type !== 'unknown-resource-type-warning')

    return {
      isValid: validationErrors.length === 0,
      errors,
    }
  }
}

/**
 * Convenience function to create a strict validator that fails on unknown types
 */
export const createStrictSchemaValidator = (): IValidator => {
  return createGenericSchemaValidator({ failOnUnknownTypes: true })
}

/**
 * Convenience function to create a lenient validator that silently skips unknown types
 */
export const createLenientSchemaValidator = (): IValidator => {
  return createGenericSchemaValidator({
    failOnUnknownTypes: false,
    warnOnUnknownTypes: false,
  })
}

export const productionValidators: IValidator[] = [...basicValidators, createGenericSchemaValidator()]

export const createRequiredLabelsValidator = (requiredLabels: string[]): IValidator => {
  return (manifests) => {
    const errors = []

    for (const [component, manifest] of manifests) {
      const labels = manifest.metadata?.labels || {}

      for (const requiredLabel of requiredLabels) {
        if (!labels[requiredLabel]) {
          errors.push({
            type: 'missing-required-label',
            message: `Missing required label: ${requiredLabel}`,
            component,
            manifest,
            details: { requiredLabel },
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

export const createSecurityContextValidator = (): IValidator => {
  return (manifests) => {
    const errors = []

    for (const [component, manifest] of manifests) {
      if (manifest.kind === 'Deployment' || manifest.kind === 'StatefulSet' || manifest.kind === 'DaemonSet') {
        const podSpec = (manifest as any).spec?.template?.spec

        if (podSpec && !podSpec.securityContext) {
          errors.push({
            type: 'missing-security-context',
            message: `Pod template is missing securityContext`,
            component,
            manifest,
          })
        }

        const containers = podSpec?.containers || []
        for (const container of containers) {
          if (!container.securityContext) {
            errors.push({
              type: 'missing-container-security-context',
              message: `Container "${container.name}" is missing securityContext`,
              component,
              manifest,
              details: { containerName: container.name },
            })
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

export const createResourceLimitsValidator = (): IValidator => {
  return (manifests) => {
    const errors = []

    for (const [component, manifest] of manifests) {
      if (manifest.kind === 'Deployment' || manifest.kind === 'StatefulSet' || manifest.kind === 'DaemonSet') {
        const containers = (manifest as any).spec?.template?.spec?.containers || []

        for (const container of containers) {
          if (!container.resources?.limits) {
            errors.push({
              type: 'missing-resource-limits',
              message: `Container "${container.name}" is missing resource limits`,
              component,
              manifest,
              details: { containerName: container.name },
            })
          }

          if (!container.resources?.requests) {
            errors.push({
              type: 'missing-resource-requests',
              message: `Container "${container.name}" is missing resource requests`,
              component,
              manifest,
              details: { containerName: container.name },
            })
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
