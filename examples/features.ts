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
            queue.resource(k8s.v1.Service, {
                spec: {
                    type: 'ClusterIP',
                    ports: [{ port: 80, targetPort: 8080 }],
                },
            });
        });

        backend.component('worker', queue => {
            queue.resource(k8s.apps.v1.Deployment, {
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
            });
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

release.behavior(component => {
    component
        .findAll(k8s.apps.v1.Deployment)
        .forEach(deployment => deployment.spec!.template!.spec!.containers
            ?.forEach(container => container.name ??= component.name)
        );
});


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
    const matchLabels = {
        'synku/release': c.root.name,
        'synku/component': c.fullName,
    };
    // if theres only one deployment in a component, assign all services to it
    const services = c.findAll(k8s.v1.Service);
    const deployments = c.findAll(k8s.apps.v1.Deployment);
    if (deployments.length === 1) {
        const deployment = deployments[0];
        deployment.spec!.replicas = 2;
        deployment.spec!.selector = { matchLabels };
        services.forEach(svc => {
            svc.spec!.selector = matchLabels;
        })
    }

    // if there's only one service and a statefulset, couple them
    const statefulsets = c.findAll(k8s.apps.v1.StatefulSet);
    if (statefulsets.length === 1 && services.length === 1) {
        const statefulset = statefulsets[0];
        const service = services[0];
        statefulset.spec!.serviceName = c.fullName;
        statefulset.spec!.selector = { matchLabels };
        service.spec!.selector = matchLabels;
    }
    console.log(services, deployments, statefulsets);
});


// synthesize
const manifests = release.synth();


// write to yaml
writer.yaml(manifests, process.stdout);
