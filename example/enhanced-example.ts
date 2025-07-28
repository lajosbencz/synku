import fs from 'fs'
import yaml from 'js-yaml'
import {
  Component,
  IComponent,
  Release,
  IBehaviour,
  YamlWriter,
  withDefaultName,
  withNamespace,
  withLabels,
  withCommonLabels,
  withDefaultContainer,
  withDefaultResources,
  withAnnotations,
  createIngress,
  BehaviorComposer,
  ComponentError,
  ManifestError,
} from '../src'
import * as k8s from 'kubernetes-models'

const CONFIG_FILE_PATH = 'context.yaml'

/**
 * Enhanced example demonstrating improved Synku features:
 * - Strong typing with Result pattern
 * - Composable behaviors
 * - Better error handling
 * - Conditional behaviors
 * - Comprehensive validation
 */

// Custom typed behavior for Node.js applications
const withNodeEnv = (env: 'production' | 'staging' | 'development'): IBehaviour => {
  return BehaviorComposer.forManifestTypes(
    [k8s.apps.v1.Deployment],
    (component: IComponent) => {
      component.findManifests(k8s.apps.v1.Deployment).forEach((manifest) => {
        manifest.spec?.template?.spec?.containers?.forEach((container) => {
          container.env ??= []
          // Remove existing NODE_ENV if present
          container.env = container.env.filter((envVar) => envVar.name !== 'NODE_ENV')
          container.env.push({ name: 'NODE_ENV', value: env })
        })
      })
    },
    `node-env-${env}`
  ).apply
}

// Conditional behavior that only applies to production
const withProductionOptimizations: IBehaviour = BehaviorComposer.withCondition(
  (component) => {
    const root = component.getRoot() as any
    return root.context?.environment === 'production'
  },
  BehaviorComposer.chain(
    withDefaultResources({
      requests: { cpu: '100m', memory: '256Mi' },
      limits: { cpu: '500m', memory: '1Gi' },
    }),
    withAnnotations({
      'prometheus.io/scrape': 'true',
      'prometheus.io/port': '3000',
      'deployment.kubernetes.io/revision': '1',
    })
  )
)

// Health check behavior for web applications
const withHealthChecks: IBehaviour = (component: IComponent) => {
  component.findManifests(k8s.apps.v1.Deployment).forEach((manifest) => {
    manifest.spec?.template?.spec?.containers?.forEach((container) => {
      if (!container.readinessProbe) {
        container.readinessProbe = {
          httpGet: {
            path: '/health',
            port: container.ports?.[0]?.containerPort || 3000,
          },
          initialDelaySeconds: 10,
          periodSeconds: 5,
        }
      }
      if (!container.livenessProbe) {
        container.livenessProbe = {
          httpGet: {
            path: '/health',
            port: container.ports?.[0]?.containerPort || 3000,
          },
          initialDelaySeconds: 30,
          periodSeconds: 10,
        }
      }
    })
  })
}

export default async function enhancedExample() {
  try {
    // Load configuration with error handling
    const fileContext = fs.existsSync(CONFIG_FILE_PATH)
      ? (yaml.load(fs.readFileSync(CONFIG_FILE_PATH)?.toString() ?? '') as Record<string, any>)
      : {}

    const context: Record<string, any> = {
      environment: 'development',
      namespace: 'default',
      version: '1.0.0',
      replicas: 2,
      ...fileContext,
    }

    console.log(`🚀 Creating release for environment: ${context.environment}`)

    const release = new Release('enhanced-webapp', context, (release) => {
      const { namespace, environment, version, replicas } = context

      // Create namespace if specified
      if (namespace && namespace !== 'default') {
        const namespaceResult = release.addManifest(k8s.v1.Namespace, {
          metadata: { name: namespace },
        })

        if (!namespaceResult.success) {
          throw new ComponentError(`Failed to create namespace: ${namespaceResult.error.message}`)
        }
      }

      // Configuration management with strong typing
      const configResult = release.addManifest(k8s.v1.ConfigMap, {
        metadata: { name: 'app-config' },
        data: {
          DATABASE_HOST: environment === 'production' ? 'postgres.prod' : 'postgres.dev',
          REDIS_HOST: environment === 'production' ? 'redis.prod' : 'redis.dev',
          LOG_LEVEL: environment === 'production' ? 'info' : 'debug',
          API_VERSION: version,
        },
      })

      if (!configResult.success) {
        throw new ManifestError(`Failed to create ConfigMap: ${configResult.error.message}`)
      }

      // Secrets with validation
      const secretResult = release.addManifest(k8s.v1.Secret, {
        metadata: { name: 'app-secrets' },
        type: 'Opaque',
        stringData: {
          DATABASE_PASSWORD: 'super-secret-password',
          JWT_SECRET: 'jwt-secret-key',
          API_KEY: 'external-api-key',
        },
      })

      if (!secretResult.success) {
        throw new ManifestError(`Failed to create Secret: ${secretResult.error.message}`)
      }

      // Frontend component with enhanced behaviors
      const frontend = new Component(release, 'frontend', (frontend) => {
        const deploymentResult = frontend.addManifest(k8s.apps.v1.Deployment, {
          spec: {
            replicas: replicas,
            template: {
              spec: {
                containers: [
                  {
                    name: 'nginx',
                    image: 'nginx:alpine',
                    ports: [{ containerPort: 80 }],
                    volumeMounts: [
                      {
                        name: 'nginx-config',
                        mountPath: '/etc/nginx/conf.d',
                      },
                    ],
                  },
                ],
                volumes: [
                  {
                    name: 'nginx-config',
                    configMap: {
                      name: 'nginx-config',
                    },
                  },
                ],
              },
            },
          },
        })

        if (!deploymentResult.success) {
          throw new ComponentError(`Frontend deployment failed: ${deploymentResult.error.message}`)
        }

        const serviceResult = frontend.addManifest(k8s.v1.Service, {
          spec: {
            type: 'ClusterIP',
            ports: [{ port: 80, targetPort: 80 }],
          },
        })

        if (!serviceResult.success) {
          throw new ComponentError(`Frontend service failed: ${serviceResult.error.message}`)
        }

        // Add nginx configuration
        frontend.addManifest(k8s.v1.ConfigMap, {
          metadata: { name: 'nginx-config' },
          data: {
            'default.conf': `
              server {
                listen 80;
                location / {
                  root /usr/share/nginx/html;
                  index index.html;
                  try_files $uri $uri/ /index.html;
                }
                location /api {
                  proxy_pass http://enhanced-webapp-backend-service;
                }
              }
            `,
          },
        })

        // Apply behaviors
        frontend.addBehaviour(withHealthChecks)

        // Create ingress with error handling
        try {
          createIngress(frontend, 'ingress', 'webapp.example.com', 'enhanced-webapp-frontend-service', {
            servicePort: 80,
            path: '/',
            pathType: 'Prefix',
            namespace,
            tls: environment === 'production',
            tlsSecretName: 'webapp-frontend-tls',
          })
        } catch (error) {
          console.warn('Failed to create frontend ingress:', error)
        }
      })

      // Backend component with advanced configuration
      const backend = new Component(release, 'backend', (backend, { suffixName, prefixName }) => {
        // Main API deployment
        const apiResult = backend.addManifest(k8s.apps.v1.Deployment, {
          metadata: { name: 'api' },
          spec: {
            replicas: replicas,
            template: {
              spec: {
                containers: [
                  {
                    name: 'api',
                    image: environment === 'production' ? 'myapp:v1.0.0' : 'myapp:latest',
                    ports: [{ containerPort: 3000 }],
                    env: [
                      { name: 'PORT', value: '3000' },
                      { name: 'DATABASE_HOST', valueFrom: { configMapKeyRef: { name: 'app-config', key: 'DATABASE_HOST' } } },
                      { name: 'DATABASE_PASSWORD', valueFrom: { secretKeyRef: { name: 'app-secrets', key: 'DATABASE_PASSWORD' } } },
                    ],
                    envFrom: [{ configMapRef: { name: 'app-config' } }],
                  },
                ],
              },
            },
          },
        })

        if (!apiResult.success) {
          throw new ComponentError(`Backend API deployment failed: ${apiResult.error.message}`)
        }

        // Service for the API
        backend.addManifest(k8s.v1.Service, {
          metadata: { name: 'service' },
          spec: {
            type: 'ClusterIP',
            ports: [{ port: 80, targetPort: 3000 }],
          },
        })

        // Background worker deployment
        const workerResult = backend.addManifest(k8s.apps.v1.Deployment, {
          metadata: { name: suffixName('worker') },
          spec: {
            replicas: 1,
            template: {
              spec: {
                containers: [
                  {
                    name: 'worker',
                    image: environment === 'production' ? 'myapp-worker:v1.0.0' : 'myapp-worker:latest',
                    env: [
                      { name: 'WORKER_TYPE', value: 'background' },
                      { name: 'QUEUE_CONCURRENCY', value: environment === 'production' ? '10' : '5' },
                    ],
                    envFrom: [{ configMapRef: { name: 'app-config' } }, { secretRef: { name: 'app-secrets' } }],
                  },
                ],
              },
            },
          },
        })

        if (!workerResult.success) {
          throw new ComponentError(`Backend worker deployment failed: ${workerResult.error.message}`)
        }

        // Apply behaviors
        backend.addBehaviour(withHealthChecks)
        backend.addBehaviour(withNodeEnv(environment))

        // Create API ingress
        try {
          createIngress(backend, 'api-ingress', 'api.webapp.example.com', 'enhanced-webapp-backend-service', {
            servicePort: 80,
            path: '/',
            pathType: 'Prefix',
            namespace,
            tls: environment === 'production',
            tlsSecretName: 'webapp-api-tls',
          })
        } catch (error) {
          console.warn('Failed to create backend ingress:', error)
        }
      })

      // Apply global behaviors with composition
      const globalBehaviors = BehaviorComposer.chain(
        withDefaultName,
        withNamespace(namespace),
        withCommonLabels('enhanced-webapp', version),
        withLabels({
          environment,
          'app.kubernetes.io/part-of': 'webapp-suite',
        }),
        withDefaultContainer,
        withProductionOptimizations,
        withNodeEnv(environment)
      )

      release.addBehaviour(globalBehaviors)
    })

    // Enhanced validation with detailed error reporting
    console.log('🔍 Validating release...')
    const validationResult = release.validateRelease()

    if (!validationResult.success) {
      console.error('❌ Validation failed:')
      console.error(validationResult.error.message)
      console.error('Context:', validationResult.error.context)
      throw validationResult.error
    }

    console.log('✅ Validation successful!')
    console.log(`📊 Generated ${release.synth().length} Kubernetes manifests`)

    return release
  } catch (error) {
    if (error instanceof ComponentError) {
      console.error('🚨 Component Error:', error.message)
      console.error('Code:', error.code)
      console.error('Context:', error.context)
    } else if (error instanceof ManifestError) {
      console.error('🚨 Manifest Error:', error.message)
      console.error('Context:', error.context)
    } else {
      console.error('🚨 Unexpected Error:', error)
    }
    throw error
  }
}
