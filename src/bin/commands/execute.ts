import path from 'path';
import { Serializer, SerializerTraced, Synthesizer, ISynthesizer, ISerializer } from '../../';
import { IComponent } from '../../component';
import { Chart } from '../../helm/chart';
import { isTruishString } from '../../utils';

export async function executeFile(file: string): Promise<void> {
  const userFile = path.resolve(process.cwd(), file);
  const module = await import(userFile);
  const releasePromise = module.default;
  if (!releasePromise) {
    throw new Error('Default export must be a release Promise or IComponent');
  }

  const release = await releasePromise;

  // Render all charts before synthesis
  await renderChartsRecursively(release);

  const synthesizer: ISynthesizer = new Synthesizer();
  const synth = synthesizer.synth(release);

  let serializer: ISerializer = new Serializer();
  if (isTruishString(process.env.SYNKU_TRACE ?? '0')) {
    serializer = new SerializerTraced();
  }
  serializer.serialize(synth, process.stdout);
}

async function renderChartsRecursively(component: IComponent): Promise<void> {
  // Render chart if this component is a Chart instance
  if (component instanceof Chart) {
    await component.render();
  }

  // Recursively render charts in child components
  for (const child of component.children) {
    await renderChartsRecursively(child);
  }
}
