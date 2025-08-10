import { Behavior, chain } from './behavior';
import { defaultName } from './behavior/metadata';
import { Component, ComponentInit } from './component';
import { yaml } from './writer';

export const releaseLabels: Behavior = component => component
  .findAll()
  .forEach(manifest =>
    manifest.metadata = {
      ...manifest.metadata,
      labels: {
        ...manifest.metadata.labels,
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

  public async write(stream: NodeJS.WritableStream): Promise<void> {
    const synthResult = await this.synth();
    yaml(synthResult, stream);
  }
}
