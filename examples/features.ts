import * as k8s from 'kubernetes-models';

// this will be the real import after implementation
// import synku from 'synku'

// dummy, instead of the real import
const synku: any = {};


// custom component wrapping a deployment and a service
function simpleWebApp({
    image = 'nginx',
    tag = 'latest',
    containerPort = 8080,
    port = 80,
}): (component: synku.IComponent) => void {
    return component => {
        component.add(k8s.apps.v1.Deployment, {
            spec: {
                template: {
                    spec: {
                        containers: [
                            {
                                image: `${image}:${tag}`,
                                ports: [{ containerPort }],
                                env: [
                                    { name: 'HTTP_PORT', value: containerPort }
                                ],
                            },
                        ],
                    },
                },
            },
        });
        component.add(k8s.v1.Service, {
            spec: {
                type: 'ClusterIP',
                ports: [
                    { port, targetPort: containerPort },
                ],
            },
        });
    }
}


// create draft
const release = new synku.Release('example', release => {

    release.addComponent('backend', backend => {

        backend.addComponent('queue', queue => {
            queue.add(k8s.apps.v1.StatefulSet, {
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

        backend.addComponent('worker', queue => {
            queue.add(k8s.apps.v1.DaemonSet, {
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

        backend.addComponent('api', simpleWebApp({
            image: 'custom-api',
            port: 80,
            containerPort: 8080,
        }));
    });

    release.addComponent('ui', simpleWebApp({
        image: 'custom-ui',
        port: 80,
        containerPort: 3000,
    }));
});


// add behaviours
release.addBehavior((c: synko.IComponent) => {
    // set metadata name from nested component names
    c.findAll().forEach(m => {
        m.metadata.name = c.fullName;
    });
    // common labels
    c.findAll().forEach(m => {
        m.metadata.labels = {
            ...m.metadata.labels,
            'synku/release': c.release.name,
            'synku/component': c.name,
        };
    });
    // set resources for all deployment containers
    c.findAll<k8s.apps.v1.Deployment>().forEach(d => {
        d.spec.templates.spec.containers.foreach(container => {
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
    const deployments = c.findAll<k8s.apps.v1.Deployment>();
    if (deployments.length === 1) {
        const selector = {
            app: c.fullName,
        };
        const deployment = deployments[0];
        deployment.spec.repicas = 2;
        deployment.spec.selector.matchLabels = selector;
        c.findAll<k8s.v1.Service>().forEach(svc => {
            svc.spec.selector = selector;
        })
    }
});


// synthesize
const manifests = release.synth();


// write to yaml
synku.write(manifests, process.stdout);
