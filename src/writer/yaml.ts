import { IComponent } from "@core/component";
import { IWriter } from "@core/writer";
import { dump, DumpOptions } from 'js-yaml';


export class YamlWriter implements IWriter {
  write(release: IComponent, stream: NodeJS.WritableStream, options?: DumpOptions): void {
    const title = `ksyn release: ${release.name}`;
    stream.write(`# ${'-'.repeat(title.length)}\n`);
    stream.write(`# ${title}\n`);
    stream.write(`# ${'-'.repeat(title.length)}\n`);
    release.synth().forEach(([component, manifest]) => {
      stream.write(`---\n`);
      stream.write(`# ksyn component: ${component.getFullName()}\n`);
      stream.write(dump(manifest, options));
      stream.write(`\n`);
    })
  }
}
