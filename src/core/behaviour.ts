import { IComponent } from './component'
import { KubernetesObject, KubernetesConstructor } from './types'

/**
 * Basic behavior interface - applies changes to a component
 */
export interface IBehaviour {
  (component: IComponent): void
}

/**
 * Typed behavior that only applies to specific manifest types
 */
export interface ITypedBehaviour<T extends KubernetesObject = KubernetesObject> {
  readonly name?: string
  readonly targetTypes?: Array<KubernetesConstructor<T>>
  apply(component: IComponent): void
}

/**
 * Conditional behavior wrapper
 */
export interface IConditionalBehaviour extends IBehaviour {
  readonly condition: (component: IComponent) => boolean
}

/**
 * Behavior composition utilities
 */
export class BehaviorComposer {
  /**
   * Chains multiple behaviors together
   */
  static chain(...behaviors: IBehaviour[]): IBehaviour {
    return (component: IComponent) => {
      behaviors.forEach((behavior) => behavior(component))
    }
  }

  /**
   * Creates a conditional behavior
   */
  static withCondition(condition: (component: IComponent) => boolean, behavior: IBehaviour): IConditionalBehaviour {
    const conditionalBehavior = (component: IComponent) => {
      if (condition(component)) {
        behavior(component)
      }
    }

    conditionalBehavior.condition = condition
    return conditionalBehavior
  }

  /**
   * Creates a typed behavior that only applies to specific manifest types
   */
  static forManifestTypes<T extends KubernetesObject>(
    types: Array<KubernetesConstructor<T>>,
    apply: (component: IComponent) => void,
    name?: string
  ): ITypedBehaviour<T> {
    return {
      name,
      targetTypes: types,
      apply,
    }
  }
}

/**
 * Legacy behavior type alias for backward compatibility
 */
export type LegacyBehaviour = IBehaviour
