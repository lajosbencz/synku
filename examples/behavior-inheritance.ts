import * as k8s from 'kubernetes-models';
import { Release, write, IComponent } from '../lib/index.js';

// Create a release
const release = new Release('app', (release) => {

    // Add behavior to root level - this should be inherited by all components
    release.addBehavior((c: IComponent) => {
        console.log(`[ROOT BEHAVIOR] Processing component: ${c.fullName}`);
        c.findAll().forEach(m => {
            m.metadata = {
                ...m.metadata,
                labels: {
                    ...m.metadata?.labels,
                    'app.kubernetes.io/managed-by': 'synku',
                    'app.kubernetes.io/part-of': c.release.name,
                },
            };
        });
    });

    release.addComponent('backend', (backend) => {

        // Add behavior to backend - this should be inherited by backend children
        backend.addBehavior((c: IComponent) => {
            console.log(`[BACKEND BEHAVIOR] Processing component: ${c.fullName}`);
            c.findAll().forEach(m => {
                m.metadata.labels = {
                    ...m.metadata.labels,
                    'app.kubernetes.io/component': 'backend',
                };
            });
        });

        backend.addComponent('database', (db) => {
            console.log(`Creating database component: ${db.fullName}`);
            db.add(k8s.apps.v1.Deployment, {
                spec: {
                    replicas: 1,
                    selector: { matchLabels: { app: 'db' } },
                    template: {
                        spec: {
                            containers: [{
                                name: 'postgres',
                                image: 'postgres:13'
                            }]
                        }
                    }
                }
            });
        });

        backend.addComponent('api', (api) => {
            console.log(`Creating API component: ${api.fullName}`);

            // Add behavior specific to API
            api.addBehavior((c: IComponent) => {
                console.log(`[API BEHAVIOR] Processing component: ${c.fullName}`);
                c.findAll().forEach(m => {
                    m.metadata.labels = {
                        ...m.metadata.labels,
                        'app.kubernetes.io/name': 'api',
                    };
                });
            });

            api.add(k8s.apps.v1.Deployment, {
                spec: {
                    replicas: 2,
                    selector: { matchLabels: { app: 'api' } },
                    template: {
                        spec: {
                            containers: [{
                                name: 'api',
                                image: 'my-api:latest'
                            }]
                        }
                    }
                }
            });
        });
    });

    release.addComponent('frontend', (frontend) => {
        console.log(`Creating frontend component: ${frontend.fullName}`);

        // Add behavior specific to frontend
        frontend.addBehavior((c: IComponent) => {
            console.log(`[FRONTEND BEHAVIOR] Processing component: ${c.fullName}`);
            c.findAll().forEach(m => {
                m.metadata.labels = {
                    ...m.metadata.labels,
                    'app.kubernetes.io/component': 'frontend',
                };
            });
        });

        frontend.add(k8s.apps.v1.Deployment, {
            spec: {
                replicas: 3,
                selector: { matchLabels: { app: 'frontend' } },
                template: {
                    spec: {
                        containers: [{
                            name: 'frontend',
                            image: 'my-frontend:latest'
                        }]
                    }
                }
            }
        });
    });
});

console.log('\n=== Synthesizing (behaviors will be applied in leaf-to-root order) ===\n');

// Synthesize and output
const manifests = release.synth();

console.log('\n=== Generated Manifests ===\n');

write(manifests);
