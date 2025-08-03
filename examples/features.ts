import * as k8s from 'kubernetes-models';
import { Release, behavior } from '../lib/index.js';


// create root object
const release = Release.new("example");

// attach common behaviors
release
  .behavior(behavior.defaultLabels({
    'static': 'label',
  }))
  .behavior(behavior.defaultAnnotations({
    'static': 'annotation',
  }));

// create ui component
release.component('ui').behavior(behavior.simpleApp({
  image: 'custom-ui',
  containerPort: 3000,
}));


// create backend component
release.component('backend', backend => {

  // create queue component nested under backend
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

  // create worker component nested under backend
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

  // create api component nested under backend
  backend.component('api').behavior(behavior.simpleApp({
    image: 'custom-api',
    containerPort: 8080,
  }));
});


// these behaviors should go to library
release
  .behavior(c => {
    c.findAll(k8s.apps.v1.Deployment, k8s.apps.v1.StatefulSet)
      .forEach(r => r.spec!.template!.spec!.containers
        ?.forEach(container => container.name ??= c.name)
      );
  })
  .behavior(c => {
    // set resources for all deployment containers
    c.findAll(k8s.apps.v1.Deployment, k8s.apps.v1.StatefulSet)
      .forEach(d => {
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
  })
  .behavior(c => {
    const matchLabels = {
      'example-release': c.root.name,
      'example-component': c.fullName,
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
  });


// write synthesized resources
release.write(process.stdout);
