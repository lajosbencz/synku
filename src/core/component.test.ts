import { Component, Release, ComponentHelper } from './component'
import { ComponentError, ManifestError } from './types'
import { BehaviorComposer } from './behaviour'
import * as k8s from 'kubernetes-models'

describe('Component', () => {
  describe('construction and initialization', () => {
    it('should create a component with proper hierarchy', () => {
      const parent = new Component(undefined, 'parent', () => {})
      const child = new Component(parent, 'child', () => {})

      expect(child.parent).toBe(parent)
      expect(parent.children).toContain(child)
      expect(child.getFullName()).toBe('parent-child')
    })

    it('should handle initialization errors gracefully', () => {
      expect(() => {
        new Component(undefined, 'test', () => {
          throw new Error('Init failed')
        })
      }).toThrow(ComponentError)
    })

    it('should generate correct full names for nested components', () => {
      const root = new Component(undefined, 'app', () => {})
      const service = new Component(root, 'backend', () => {})
      const worker = new Component(service, 'worker', () => {})

      expect(root.getFullName()).toBe('app')
      expect(service.getFullName()).toBe('app-backend')
      expect(worker.getFullName()).toBe('app-backend-worker')
    })
  })

  describe('manifest management', () => {
    let component: Component

    beforeEach(() => {
      component = new Component(undefined, 'test', () => {})
    })

    it('should add manifests with strong typing', () => {
      const result = component.addManifest(k8s.v1.ConfigMap, {
        data: { key: 'value' },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe(k8s.v1.ConfigMap)
        expect(result.data.spec.data).toEqual({ key: 'value' })
      }
    })

    it('should handle invalid manifest types', () => {
      const result = component.addManifest(null as any, {})

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ManifestError)
        expect(result.error.message).toContain('Invalid manifest type')
      }
    })

    it('should find manifests with type filtering', () => {
      component.addManifest(k8s.v1.ConfigMap, { data: { key: 'value' } })
      component.addManifest(k8s.v1.Secret, { stringData: { secret: 'value' } })

      const configMaps = component.findManifests(k8s.v1.ConfigMap)
      const secrets = component.findManifests(k8s.v1.Secret)

      expect(configMaps).toHaveLength(1)
      expect(secrets).toHaveLength(1)
      expect(configMaps[0].data?.key).toBe('value')
    })

    it('should find manifests with predicate filtering', () => {
      component.addManifest(k8s.v1.ConfigMap, {
        metadata: { name: 'config1' },
        data: { env: 'prod' },
      })
      component.addManifest(k8s.v1.ConfigMap, {
        metadata: { name: 'config2' },
        data: { env: 'dev' },
      })

      const prodConfigs = component.findManifests(k8s.v1.ConfigMap, (manifest) => manifest.data?.env === 'prod')

      expect(prodConfigs).toHaveLength(1)
      expect(prodConfigs[0].metadata?.name).toBe('config1')
    })

    it('should return defensive copies of manifests', () => {
      component.addManifest(k8s.v1.ConfigMap, { data: { key: 'value' } })

      const manifests1 = component.manifests
      const manifests2 = component.manifests

      expect(manifests1).toEqual(manifests2)
      expect(manifests1).not.toBe(manifests2) // Different objects
    })
  })

  describe('behavior management', () => {
    let component: Component

    beforeEach(() => {
      component = new Component(undefined, 'test', () => {})
    })

    it('should add and apply behaviors correctly', () => {
      let behaviorApplied = false

      component.addBehaviour((comp) => {
        behaviorApplied = true
        expect(comp).toBe(component)
      })

      component.applyBehaviours()
      expect(behaviorApplied).toBe(true)
    })

    it('should validate behavior functions', () => {
      expect(() => {
        component.addBehaviour(null as any)
      }).toThrow(ComponentError)

      expect(() => {
        component.addBehaviour('not a function' as any)
      }).toThrow(ComponentError)
    })

    it('should support typed behaviors', () => {
      const typedBehavior = BehaviorComposer.forManifestTypes(
        [k8s.v1.ConfigMap],
        (comp) => {
          // Behavior implementation
        },
        'test-behavior'
      )

      expect(() => {
        component.addTypedBehaviour(typedBehavior)
      }).not.toThrow()
    })

    it('should handle behavior application errors', () => {
      component.addBehaviour(() => {
        throw new Error('Behavior failed')
      })

      expect(() => {
        component.applyBehaviours()
      }).toThrow(ComponentError)
    })

    it('should return defensive copies of behaviors', () => {
      const behavior = () => {}
      component.addBehaviour(behavior)

      const behaviors1 = component.behaviours
      const behaviors2 = component.behaviours

      expect(behaviors1).toEqual(behaviors2)
      expect(behaviors1).not.toBe(behaviors2) // Different arrays
    })
  })

  describe('synthesis and validation', () => {
    let component: Component

    beforeEach(() => {
      component = new Component(undefined, 'test', (comp) => {
        comp.addManifest(k8s.v1.ConfigMap, {
          metadata: { name: 'test-config' },
          data: { key: 'value' },
        })
      })
    })

    it('should synthesize manifests correctly', () => {
      const synthesized = component.synth()

      expect(synthesized).toHaveLength(1)
      expect(synthesized[0][0]).toBe(component)
      expect(synthesized[0][1].kind).toBe('ConfigMap')
      expect(synthesized[0][1].metadata?.name).toBe('test-config')
    })

    it('should validate successfully with no errors', () => {
      const result = component.validate()

      expect(result.success).toBe(true)
    })

    it('should detect naming collisions', () => {
      const child = new Component(component, 'child', (comp) => {
        comp.addManifest(k8s.v1.ConfigMap, {
          metadata: { name: 'test-config' }, // Same name as parent
          data: { key: 'different-value' },
        })
      })

      const result = component.validate()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Naming collisions detected')
      }
    })

    it('should apply behaviors to child components during synthesis', () => {
      let childBehaviorApplied = false

      component.addBehaviour((comp) => {
        if (comp.name === 'child') {
          childBehaviorApplied = true
        }
      })

      new Component(component, 'child', () => {})

      component.synth()
      expect(childBehaviorApplied).toBe(true)
    })
  })

  describe('ComponentHelper', () => {
    let component: Component
    let helper: ComponentHelper

    beforeEach(() => {
      component = new Component(undefined, 'app', () => {})
      helper = new ComponentHelper(component)
    })

    it('should create suffixed names correctly', () => {
      expect(helper.suffixName('service')).toBe('app-service')
      expect(helper.suffixName('worker')).toBe('app-worker')
    })

    it('should create prefixed names correctly', () => {
      expect(helper.prefixName('prod')).toBe('prod-app')
      expect(helper.prefixName('staging')).toBe('staging-app')
    })
  })
})

describe('Release', () => {
  it('should create a release with context', () => {
    const context = { environment: 'production', version: '1.0.0' }
    const release = new Release('myapp', context, () => {})

    expect(release.name).toBe('myapp')
    expect(release.context).toEqual(context)
    expect(release.getFullName()).toBe('myapp')
  })

  it('should validate release context', () => {
    const validRelease = new Release('app', { env: 'prod' }, () => {})
    const result = validRelease.validateRelease()

    expect(result.success).toBe(true)
  })

  it('should reject invalid context', () => {
    const invalidRelease = new Release('app', null as any, () => {})
    const result = invalidRelease.validateRelease()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('Release context must be a valid object')
    }
  })
})

describe('BehaviorComposer', () => {
  let component: Component

  beforeEach(() => {
    component = new Component(undefined, 'test', () => {})
  })

  it('should chain behaviors correctly', () => {
    let behavior1Applied = false
    let behavior2Applied = false

    const behavior1 = () => {
      behavior1Applied = true
    }
    const behavior2 = () => {
      behavior2Applied = true
    }

    const chained = BehaviorComposer.chain(behavior1, behavior2)
    chained(component)

    expect(behavior1Applied).toBe(true)
    expect(behavior2Applied).toBe(true)
  })

  it('should create conditional behaviors', () => {
    let behaviorApplied = false

    const conditional = BehaviorComposer.withCondition(
      (comp) => comp.name === 'test',
      () => {
        behaviorApplied = true
      }
    )

    conditional(component)
    expect(behaviorApplied).toBe(true)

    // Reset and test with different component
    behaviorApplied = false
    const otherComponent = new Component(undefined, 'other', () => {})
    conditional(otherComponent)
    expect(behaviorApplied).toBe(false)
  })

  it('should create typed behaviors for specific manifest types', () => {
    const typedBehavior = BehaviorComposer.forManifestTypes(
      [k8s.v1.ConfigMap],
      (comp) => {
        // This would apply only to ConfigMap manifests
      },
      'configmap-behavior'
    )

    expect(typedBehavior.name).toBe('configmap-behavior')
    expect(typedBehavior.targetTypes).toEqual([k8s.v1.ConfigMap])
    expect(typeof typedBehavior.apply).toBe('function')
  })
})
