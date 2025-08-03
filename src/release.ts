import { Behavior, chain } from './behavior';
import { defaultName } from './behavior/metadata';
import { Component, ComponentInit } from './component';
import { yaml } from './writer';

export const releaseLabels: Behavior = component => component
  .findAll()
  .forEach(resource =>
    resource.metadata = {
      ...resource.metadata,
      labels: {
        ...resource.metadata.labels,
        [`${Release.LABEL_PREFIX}release`]: component.root.name,
        [`${Release.LABEL_PREFIX}component`]: component.fullName,
      },
    },
  );

export class Release extends Component {

  static LABEL_PREFIX = 'synku/';

  public static new(name: string, init?: ComponentInit): Release {
    const release = new Release(undefined, name);
    release.behavior(chain(
      defaultName(),
      releaseLabels,
    ));
    init?.(release);
    return release;
  }

  public write(stream: NodeJS.WritableStream): void {
    yaml(this.synth(), stream);
  }
}
