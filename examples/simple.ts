import * as k8s from 'kubernetes-models';
import { Release, write, IComponent } from '../lib/index.js';

// Simple test to verify the implementation
const release = new Release('test', (release) => {
    release.addComponent('app', (app) => {
        app.add(k8s.apps.v1.Deployment, {
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: { app: 'test' }
                },
                template: {
                    metadata: {
                        labels: { app: 'test' }
                    },
                    spec: {
                        containers: [{
                            name: 'app',
                            image: 'nginx:latest',
                            ports: [{ containerPort: 80 }]
                        }]
                    }
                }
            }
        });

        app.add(k8s.v1.Service, {
            spec: {
                selector: { app: 'test' },
                ports: [{ port: 80, targetPort: 80 }]
            }
        });
    });
});

// Add behavior to set metadata names
release.addBehavior((c: IComponent) => {
    c.findAll().forEach(m => {
        if (!m.metadata.name) {
            m.metadata.name = c.fullName;
        }
    });
});

// Synthesize and output
const manifests = release.synth();
write(manifests);
