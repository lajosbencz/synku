import { KubernetesObject } from './types'
import { IComponent } from './component'

export interface ValidationResult {
  isValid: boolean
  errors: IValidationError[]
}

export interface IValidationError {
  type: string
  message: string
  component?: IComponent
  manifest?: KubernetesObject
  details?: any
}

export type IValidator = (manifests: Array<[IComponent, KubernetesObject]>) => ValidationResult

// Legacy types for backward compatibility
export interface ManifestCollision {
  key: string
  manifests: Array<{
    component: IComponent
    manifest: KubernetesObject
  }>
}

export interface CollisionValidationResult {
  hasCollisions: boolean
  collisions: ManifestCollision[]
}

/**
 * Creates a unique key for a Kubernetes manifest based on its identifying properties
 */
function createManifestKey(manifest: KubernetesObject): string {
  const apiVersion = manifest.apiVersion || ''
  const kind = manifest.kind || ''
  const namespace = manifest.metadata?.namespace || 'default'
  const name = manifest.metadata?.name || ''

  return `${apiVersion}/${kind}/${namespace}/${name}`
}

export function validateNamingCollisions(manifests: Array<[IComponent, KubernetesObject]>): CollisionValidationResult {
  const manifestGroups = new Map<string, Array<{ component: IComponent; manifest: KubernetesObject }>>()

  for (const [component, manifest] of manifests) {
    if (!manifest.metadata?.name) {
      continue
    }

    const key = createManifestKey(manifest)

    if (!manifestGroups.has(key)) {
      manifestGroups.set(key, [])
    }

    manifestGroups.get(key)!.push({ component, manifest })
  }

  const collisions: ManifestCollision[] = []

  for (const [key, group] of manifestGroups.entries()) {
    if (group.length > 1) {
      collisions.push({
        key,
        manifests: group,
      })
    }
  }

  return {
    hasCollisions: collisions.length > 0,
    collisions,
  }
}

/**
 * Creates a detailed error message for naming collisions
 */
export function formatCollisionError(result: CollisionValidationResult): string {
  if (!result.hasCollisions) {
    return ''
  }

  const errors: string[] = ['Manifest naming collisions detected:', '']

  for (const collision of result.collisions) {
    const [apiVersion, kind, namespace, name] = collision.key.split('/')

    errors.push(`Collision for ${kind} "${name}" in namespace "${namespace}" (${apiVersion}):`)

    for (const { component, manifest } of collision.manifests) {
      const componentPath = getComponentPath(component)
      errors.push(`  - Component: ${componentPath}`)
    }

    errors.push('')
  }

  errors.push('To resolve collisions, consider:')
  errors.push('1. Using different component names')
  errors.push('2. Applying behaviors that modify manifest names')
  errors.push('3. Using different namespaces')
  errors.push('4. Explicitly setting unique names in manifests')

  return errors.join('\n')
}

/**
 * Gets the full path of a component for debugging purposes
 */
function getComponentPath(component: IComponent): string {
  const path: string[] = []
  let current: IComponent | undefined = component

  while (current) {
    path.unshift(current.name)
    current = current.parent as IComponent | undefined
  }

  return path.join('/')
}

/**
 * Error class for naming collisions
 */
export class NamingCollisionError extends Error {
  constructor(
    public readonly result: CollisionValidationResult,
    message?: string
  ) {
    super(message || formatCollisionError(result))
    this.name = 'NamingCollisionError'
  }
}

/**
 * Error class for manifest validation with component context
 */
export class ManifestValidationError extends Error {
  constructor(
    public readonly component: IComponent,
    public readonly manifest: KubernetesObject,
    public readonly originalError: Error
  ) {
    const componentPath = getComponentPath(component)
    const manifestId = manifest.metadata?.name || '<unnamed>'
    const manifestType = `${manifest.apiVersion}/${manifest.kind}`

    const message = [
      `Validation failed for ${manifestType} "${manifestId}" in component "${componentPath}":`,
      '',
      originalError.message,
      '',
      'Component path: ' + componentPath,
      'Manifest type: ' + manifestType,
      'Manifest name: ' + manifestId,
    ].join('\n')

    super(message)
    this.name = 'ManifestValidationError'
    this.stack = originalError.stack
  }
}

// Core validation runner
export function validateManifests(manifests: Array<[IComponent, KubernetesObject]>, validators: IValidator[]): ValidationResult {
  const allErrors: IValidationError[] = []

  for (const validator of validators) {
    const result = validator(manifests)
    allErrors.push(...result.errors)
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  }
}

// Modular validators
export const namingCollisionValidator: IValidator = (manifests) => {
  const manifestGroups = new Map<string, Array<{ component: IComponent; manifest: KubernetesObject }>>()

  // Group manifests by their unique key
  for (const [component, manifest] of manifests) {
    // Skip manifests without names as they will fail validation elsewhere
    if (!manifest.metadata?.name) {
      continue
    }

    const key = createManifestKey(manifest)

    if (!manifestGroups.has(key)) {
      manifestGroups.set(key, [])
    }

    manifestGroups.get(key)!.push({ component, manifest })
  }

  const errors: IValidationError[] = []

  for (const [key, group] of manifestGroups.entries()) {
    if (group.length > 1) {
      const [apiVersion, kind, namespace, name] = key.split('/')

      errors.push({
        type: 'naming-collision',
        message: `Multiple manifests with same identity: ${kind} "${name}" in namespace "${namespace}" (${apiVersion})`,
        details: {
          key,
          manifests: group,
          components: group.map((g) => getComponentPath(g.component)),
        },
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const requiredMetadataValidator: IValidator = (manifests) => {
  const errors: IValidationError[] = []

  for (const [component, manifest] of manifests) {
    if (!manifest.metadata?.name) {
      errors.push({
        type: 'missing-name',
        message: `Manifest is missing required metadata.name`,
        component,
        manifest,
      })
    }

    if (!manifest.apiVersion) {
      errors.push({
        type: 'missing-apiVersion',
        message: `Manifest is missing required apiVersion`,
        component,
        manifest,
      })
    }

    if (!manifest.kind) {
      errors.push({
        type: 'missing-kind',
        message: `Manifest is missing required kind`,
        component,
        manifest,
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const kubernetesSchemaValidator = (manifestTypes: Map<string, new (...args: any[]) => KubernetesObject>): IValidator => {
  return (manifests) => {
    const errors: IValidationError[] = []

    for (const [component, manifest] of manifests) {
      const typeKey = `${manifest.apiVersion}/${manifest.kind}`
      const ManifestType = manifestTypes.get(typeKey)

      if (ManifestType) {
        try {
          const validationInstance = new ManifestType(manifest)
          validationInstance.validate()
        } catch (error) {
          if (error instanceof Error) {
            errors.push({
              type: 'schema-validation',
              message: `Schema validation failed: ${error.message}`,
              component,
              manifest,
              details: { originalError: error },
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

export function validateManifestWithContext(
  component: IComponent,
  manifest: KubernetesObject,
  manifestType: new (...args: any[]) => KubernetesObject
): void {
  try {
    const validationInstance = new manifestType(manifest)
    validationInstance.validate()
  } catch (error) {
    if (error instanceof Error) {
      throw new ManifestValidationError(component, manifest, error)
    }
    throw error
  }
}
