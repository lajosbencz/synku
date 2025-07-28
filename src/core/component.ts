import { IBehaviour, ITypedBehaviour } from './behaviour'
import { INode, Node } from './node'
import { DeepPartial, KubernetesObject, KubernetesConstructor, StrongManifest, Result, ComponentError, ManifestError } from './types'
import { validateNamingCollisions, NamingCollisionError, validateManifestWithContext } from './validation'

/**
 * Legacy manifest interface for backward compatibility
 */
export interface Manifest {
  type: KubernetesConstructor<any>
  data: KubernetesObject
}

/**
 * Interface for manifest container functionality
 */
export interface IManifestContainer {
  readonly manifests: Manifest[]
  addManifest<T extends KubernetesObject>(type: KubernetesConstructor<T>, spec: DeepPartial<T>): Result<StrongManifest<T>, ManifestError>
  findManifests(): Manifest[]
  findManifests<T extends KubernetesObject>(
    type: KubernetesConstructor<T>,
    predicate?: (manifest: DeepPartial<T>) => boolean
  ): DeepPartial<T>[]
}

/**
 * Interface for behavior management
 */
export interface IBehaviorHost {
  readonly behaviours: IBehaviour[]
  addBehaviour(behaviour: IBehaviour): void
  addTypedBehaviour<T extends KubernetesObject>(behaviour: ITypedBehaviour<T>): void
  applyBehaviours(): void
}

/**
 * Enhanced component interface with better separation of concerns
 */
export interface IComponent extends INode, IManifestContainer, IBehaviorHost {
  readonly name: string
  getFullName(): string
  synth(): [IComponent, KubernetesObject][]
  validate(): Result<void, ComponentError>
}

export class ComponentHelper {
  private readonly component: IComponent
  constructor(component: IComponent) {
    this.component = component
  }

  /**
   * Creates a name with the component's full name as prefix
   */
  suffixName = (suffix: string): string => {
    return `${this.component.getFullName()}-${suffix}`
  }

  /**
   * Creates a name with custom prefix
   */
  prefixName = (prefix: string): string => {
    return `${prefix}-${this.component.name}`
  }
}

export type ComponentInitializer = (component: IComponent, helper: ComponentHelper) => void

export class Component extends Node implements IComponent {
  private _manifests: Manifest[] = []
  private _behaviours: IBehaviour[] = []

  get manifests(): Manifest[] {
    return [...this._manifests] // Return copy to prevent external mutation
  }

  get behaviours(): IBehaviour[] {
    return [...this._behaviours] // Return copy to prevent external mutation
  }

  constructor(
    parent: INode | undefined,
    public readonly name: string,
    init: ComponentInitializer
  ) {
    super(parent, name)
    try {
      const helper = new ComponentHelper(this)
      init(this, helper)
    } catch (error) {
      throw new ComponentError(`Failed to initialize component '${name}': ${error instanceof Error ? error.message : String(error)}`, {
        componentName: name,
        originalError: error,
      })
    }
  }

  getFullName(): string {
    const parts: string[] = []
    let node: IComponent | undefined = this

    while (node) {
      parts.unshift(node.name)
      node = node.parent as IComponent | undefined
    }

    return parts.join('-')
  }

  addManifest<T extends KubernetesObject>(type: KubernetesConstructor<T>, spec: DeepPartial<T>): Result<StrongManifest<T>, ManifestError> {
    try {
      // Validate the constructor
      if (typeof type !== 'function') {
        return {
          success: false,
          error: new ManifestError('Invalid manifest type: must be a constructor function', {
            componentName: this.getFullName(),
            providedType: typeof type,
          }),
        }
      }

      // Create instance with validation
      const instance = new type(spec)
      const data = instance.toJSON() as T

      // Store in legacy format for compatibility
      this._manifests.push({ type, data })

      // Return strongly typed result
      const strongManifest: StrongManifest<T> = {
        type,
        spec,
        data,
      }

      return { success: true, data: strongManifest }
    } catch (error) {
      return {
        success: false,
        error: new ManifestError(`Failed to create manifest: ${error instanceof Error ? error.message : String(error)}`, {
          componentName: this.getFullName(),
          manifestType: type.name,
          spec,
          originalError: error,
        }),
      }
    }
  }

  addBehaviour(behaviour: IBehaviour): void {
    if (typeof behaviour !== 'function') {
      throw new ComponentError('Invalid behaviour: must be a function', {
        componentName: this.getFullName(),
        providedType: typeof behaviour,
      })
    }
    this._behaviours.push(behaviour)
  }

  addTypedBehaviour<T extends KubernetesObject>(behaviour: ITypedBehaviour<T>): void {
    if (!behaviour || typeof behaviour.apply !== 'function') {
      throw new ComponentError('Invalid typed behaviour: must have an apply method', {
        componentName: this.getFullName(),
        behaviour,
      })
    }

    // Wrap typed behaviour as regular behaviour
    this._behaviours.push((component: IComponent) => behaviour.apply(component))
  }

  applyBehaviours(): void {
    for (const behaviour of this._behaviours) {
      try {
        behaviour(this)
      } catch (error) {
        throw new ComponentError(
          `Behaviour application failed in component '${this.getFullName()}': ${error instanceof Error ? error.message : String(error)}`,
          {
            componentName: this.getFullName(),
            originalError: error,
          }
        )
      }
    }
  }

  findManifests(): Manifest[]
  findManifests<T extends KubernetesObject>(
    type: KubernetesConstructor<T>,
    predicate?: (manifest: DeepPartial<T>) => boolean
  ): DeepPartial<T>[]
  findManifests<T extends KubernetesObject>(type?: KubernetesConstructor<T>, predicate?: (manifest: DeepPartial<T>) => boolean): any {
    if (!type) {
      return this.manifests
    }

    const typed = this._manifests.filter((manifest) => manifest.type === (type as any)).map((manifest) => manifest.data as DeepPartial<T>)

    if (predicate) {
      return typed.filter(predicate)
    }

    return typed
  }

  synth(): [IComponent, KubernetesObject][] {
    const manifests: [IComponent, KubernetesObject][] = []

    // Apply behaviors first
    this.applyBehaviours()

    // Process manifests
    for (const manifest of this._manifests) {
      // Deep clone to prevent mutations affecting original
      const processedData = JSON.parse(JSON.stringify(manifest.data))
      manifests.push([this, processedData])
    }

    // Process child components
    for (const child of this.children) {
      if (child instanceof Component) {
        // Apply parent behaviors to children
        for (const behaviour of this._behaviours) {
          try {
            behaviour(child)
          } catch (error) {
            // Log warning but don't fail - some behaviors might not apply to children
            console.warn(`Behaviour could not be applied to child component '${child.getFullName()}':`, error)
          }
        }

        // Recursively synthesize children
        for (const [childComponent, childManifest] of child.synth()) {
          manifests.push([childComponent, childManifest])
        }
      }
    }

    return manifests
  }

  validate(): Result<void, ComponentError> {
    try {
      const synthesizedManifests = this.synth()

      // Check for naming collisions
      const collisionResult = validateNamingCollisions(synthesizedManifests)
      if (collisionResult.hasCollisions) {
        return {
          success: false,
          error: new ComponentError('Naming collisions detected', {
            componentName: this.getFullName(),
            collisions: collisionResult.collisions,
          }),
        }
      }

      // Validate individual manifests
      for (const [component, processedData] of synthesizedManifests) {
        const originalManifest = component.manifests.find(
          (m) =>
            m.data.apiVersion === processedData.apiVersion &&
            m.data.kind === processedData.kind &&
            m.data.metadata?.name === processedData.metadata?.name
        )

        if (originalManifest) {
          try {
            validateManifestWithContext(component, processedData, originalManifest.type)
          } catch (error) {
            return {
              success: false,
              error: new ComponentError(`Manifest validation failed in component '${component.getFullName()}'`, {
                componentName: component.getFullName(),
                manifest: processedData,
                originalError: error,
              }),
            }
          }
        }
      }

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: new ComponentError(
          `Validation failed for component '${this.getFullName()}': ${error instanceof Error ? error.message : String(error)}`,
          {
            componentName: this.getFullName(),
            originalError: error,
          }
        ),
      }
    }
  }
}

export class Release extends Component implements IComponent {
  constructor(
    name: string,
    public readonly context: Record<string, any>,
    init: (release: IComponent) => void
  ) {
    super(undefined, name, (component, helper) => {
      init(component)
    })
  }

  /**
   * Enhanced validation for releases that also validates context
   */
  validateRelease(): Result<void, ComponentError> {
    // Validate context
    if (!this.context || typeof this.context !== 'object') {
      return {
        success: false,
        error: new ComponentError('Release context must be a valid object', { releaseName: this.name, context: this.context }),
      }
    }

    // Run standard component validation
    return this.validate()
  }
}
