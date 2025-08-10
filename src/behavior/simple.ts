import { Deployment } from 'kubernetes-models/apps/v1';
import { ResourceRequirements, Service } from 'kubernetes-models/v1';
import { Behavior } from '../behavior';
import * as behavior from '../behavior/index';
import { DeepPartial } from '../types';

export interface DefaultAppOptions {
  image: string;
  tag?: string;
  replicas?: number;
  containerPort: number;
  port?: number;
  revisionHistoryLimit?: number;
  resources?: ResourceRequirements;
  matchLabelKey?: string;
};

export const DefaultAppDefaultOptions: DeepPartial<DefaultAppOptions> = {
  tag: 'latest',
  replicas: 2,
  port: 80,
  revisionHistoryLimit: 5,
  matchLabelKey: 'synku/app',
};

export function simpleApp(options: DefaultAppOptions): Behavior {
  return component => {
    const {
      replicas,
      revisionHistoryLimit,
      image,
      tag,
      resources,
      port,
      containerPort,
      matchLabelKey,
    } = { ...DefaultAppDefaultOptions, ...options };
    const matchLabels = {
      [matchLabelKey!]: component.fullName,
    };
    component
      .behavior(behavior.defaultName())
      .manifest(Deployment, {
        spec: {
          replicas,
          revisionHistoryLimit,
          selector: {
            matchLabels,
          },
          template: {
            metadata: {
              labels: {
                ...matchLabels,
              },
            },
            spec: {
              containers: [
                {
                  name: component.name,
                  image: `${image}:${tag}`,
                  ports: [{ protocol: 'TCP', containerPort }],
                  resources,
                },
              ],
            },
          },
        },
      })
      .manifest(Service, {
        spec: {
          type: 'ClusterIP',
          selector: {
            ...matchLabels,
          },
          ports: [{ port, targetPort: containerPort }],
        },
      });
  };
}
