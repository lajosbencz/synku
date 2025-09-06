import { Deployment } from 'kubernetes-models/apps/v1';
import { ResourceRequirements, Service } from 'kubernetes-models/v1';
import * as behavior from '../behaviors/index';
import { UserComponent } from '../component';
import { DeepPartial } from '../types';

export interface SimpleAppOptions {
  image: string;
  tag?: string;
  replicas?: number;
  containerPort?: number;
  port?: number;
  revisionHistoryLimit?: number;
  resources?: ResourceRequirements;
  matchLabelKey?: string;
};

export const SimpleAppDefaultOptions: DeepPartial<SimpleAppOptions> = {
  tag: 'latest',
  replicas: 2,
  containerPort: 8080,
  port: 80,
  revisionHistoryLimit: 5,
  matchLabelKey: 'synku/app',
};

export class SimpleApp extends UserComponent<SimpleAppOptions> {
  protected optionsDefaults(): DeepPartial<SimpleAppOptions> {
    return SimpleAppDefaultOptions;
  }

  protected init(): void {
    const {
      replicas,
      revisionHistoryLimit,
      image,
      tag,
      resources,
      port,
      containerPort,
      matchLabelKey,
    } = this.options;

    const matchLabels = {
      [matchLabelKey!]: this.name,
    };

    this
      .draft(Deployment, {
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
                  name: this.shortName,
                  image: `${image}:${tag}`,
                  ports: [{ protocol: 'TCP', containerPort }],
                  resources,
                },
              ],
            },
          },
        },
      })
      .draft(Service, {
        spec: {
          type: 'ClusterIP',
          selector: {
            ...matchLabels,
          },
          ports: [{ port, targetPort: containerPort }],
        },
      })
      .with(behavior.defaultName());
  }
}
