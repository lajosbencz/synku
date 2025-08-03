import * as k8s from 'kubernetes-models';
import { core, writer, behavior } from '../lib/index.js';


// behaviour wrapping a deployment and a service
function simpleWebApp({
    image = 'nginx',
    tag = 'latest',
    containerPort = 8080,
    port = 80,
}: {
    image?: string,
    tag?: string,
    containerPort?: number,
    port?: number,
}): core.IBehavior {
    return component => {
        component.resource(k8s.apps.v1.Deployment, {
            spec: {
                template: {
                    spec: {
                        containers: [
                            {
                                image: `${image}:${tag}`,
                                ports: [{ containerPort }],
                                env: [
                                    { name: 'HTTP_PORT', value: containerPort.toString() }
                                ],
                            },
                        ],
                    },
                },
            },
        });
        component.resource(k8s.v1.Service, {
            spec: {
                type: 'ClusterIP',
                ports: [
                    { port, targetPort: containerPort },
                ],
            },
        });
    }
}


const release = core.Release.new("example", release => {
    release.component('backend', backend => {

        backend.component('queue', queue => {
            queue.resource(k8s.apps.v1.StatefulSet, {
                spec: {
                    template: {
                        spec: {
                            containers: [
                                {
                                    image: 'mqtt',
                                },
                            ],
                        },
                    },
                },
            })
        });

        backend.component('worker', queue => {
            queue.resource(k8s.apps.v1.DaemonSet, {
                spec: {
                    template: {
                        spec: {
                            containers: [
                                {
                                    image: 'custom-worker',
                                },
                            ],
                        },
                    },
                },
            })
        });

        backend.component('api', simpleWebApp({
            image: 'custom-api',
        }));
    });

    release.component('ui', simpleWebApp({
        image: 'custom-ui',
        containerPort: 3000,
    }));
});


release.behavior(behavior.withName());


// add behaviours
release.behavior((c: core.IComponent) => {
    // set metadata name from nested component names
    c.findAll().forEach(m => {
        m.metadata = {
            name: c.fullName,
            ...m.metadata,
        }
    });
    // common labels
    c.findAll().forEach(m => {
        m.metadata = {
            ...m.metadata,
            labels: {
                ...m.metadata.labels,
                'synku/release': c.root.name,
                'synku/component': c.fullName,
            },
        }
    });
    // set resources for all deployment containers
    c.findAll(k8s.apps.v1.Deployment).forEach(d => {
        d.spec!.template!.spec!.containers!.forEach(container => {
            container.resources = {
                requests: {
                    cpu: '100m',
                    memory: '128Mi',
                },
                limits: {
                    cpu: '100m',
                    memory: '128Mi',
                },
            };
        });
    });
    // if theres only one deployment in a component, assign all services to it
    const deployments = [
        ...c.findAll(k8s.apps.v1.Deployment),
        ...c.findAll(k8s.apps.v1.StatefulSet),
    ];
    if (deployments.length === 1) {
        const matchLabels = {
            'synku/release': c.root.name,
            'synku/component': c.fullName,
        };
        const deployment = deployments[0];
        deployment.spec!.replicas = 2;
        deployment.spec!.selector = { matchLabels };
        c.findAll(k8s.v1.Service).forEach(svc => {
            svc.spec!.selector = matchLabels;
        })
    }
});


// synthesize
const manifests = release.synth();


// write to yaml
writer.yaml(manifests, process.stdout);
