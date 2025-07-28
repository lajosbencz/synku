export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T | undefined

export interface KubernetesObject {
  apiVersion: string
  kind: string
  metadata?: {
    name?: string
    namespace?: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    [key: string]: any
  }
  [key: string]: any
}

/**
 * Strongly typed manifest container
 */
export interface StrongManifest<T extends KubernetesObject> {
  readonly type: new (spec: DeepPartial<T>) => T
  readonly spec: DeepPartial<T>
  readonly data: T
}

/**
 * Legacy manifest interface for backward compatibility
 */
export interface KubernetesManifest<T extends KubernetesObject = KubernetesObject> {
  type: KubernetesConstructor<T>
  spec: DeepPartial<T>
}

/**
 * Type-safe constructor constraint for Kubernetes objects
 * Compatible with kubernetes-models library
 */
export type KubernetesConstructor<T extends KubernetesObject> = new (spec?: any) => T

export type KubernetesResource<T> = T extends new (...args: any[]) => infer R ? R : never

/**
 * Result pattern for error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

/**
 * Standardized error types for Synku
 */
export class SynkuError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message)
    this.name = 'SynkuError'
  }
}

export class ValidationError extends SynkuError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context)
    this.name = 'ValidationError'
  }
}

export class ManifestError extends SynkuError {
  constructor(message: string, context?: any) {
    super(message, 'MANIFEST_ERROR', context)
    this.name = 'ManifestError'
  }
}

export class ComponentError extends SynkuError {
  constructor(message: string, context?: any) {
    super(message, 'COMPONENT_ERROR', context)
    this.name = 'ComponentError'
  }
}
