import { Writable } from 'stream';
import yaml, { Node, Pair, Scalar, YAMLMap } from 'yaml';
import { IComponent } from './component';
import { ILogger, DefaultLogger, ILoggerAware } from './logger';
import { Synthesis } from './synthesizer';
import { ITrace } from './trace';
import { StateChange } from './types';

function applyComment(doc: yaml.Document, path: (string | number)[], comment: string) {
  const parentPath = path.slice(0, -1);
  const key = path[path.length - 1];
  const parentNode = doc.getIn(parentPath) as YAMLMap;
  if (parentNode && parentNode.items) {
    const pair = parentNode.items.find(p => (p.key as Scalar)?.value === key) as Pair;
    if (pair && pair.key) {
      const keyNode = pair.key as Node;
      if (keyNode.commentBefore) {
        keyNode.commentBefore += `\n${comment}`;
      } else {
        keyNode.commentBefore = comment;
      }
    }
  }
}

function processAdd(doc: yaml.Document, path: (string | number)[], value: any, trace: ITrace) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        processAdd(doc, [...path, key], value[key], trace);
      }
    }
  } else {
    const comment = ` add [${value}] ${trace.toString()}`;
    applyComment(doc, path, comment);
  }
}

function processUpdate(doc: yaml.Document, path: (string | number)[], value: any, trace: ITrace) {
  const comment = ` update [${value}] ${trace.toString()}`;
  applyComment(doc, path, comment);
}

function processDelete(doc: yaml.Document, path: (string | number)[], oldVal: any, trace: ITrace) {
  const parentPath = path.slice(0, -1);
  const deletedKey = path[path.length - 1];
  const comment = ` delete ${deletedKey} [${oldVal}] ${trace.toString()}`;

  if (parentPath.length === 0) {
    if (doc.commentBefore) {
      doc.commentBefore += `\n${comment}`;
    } else {
      doc.commentBefore = comment;
    }
    return;
  }

  applyComment(doc, parentPath, comment);
}

export interface ISerializer<T extends any = any> extends ILoggerAware {
  serialize(synth: Synthesis<T>, writer: Writable): void;
}

export class Serializer<T extends any = any> implements ISerializer<T> {
  constructor(public readonly logger: ILogger = DefaultLogger) { }
  protected _createWriter(writable: Writable): (str: string) => void {
    return (str) => {
      writable.write(str, err => { if (err) throw err; });
    };
  }
  protected _processManifest(
    write: (str: string) => void,
    _component: IComponent<T>,
    manifest: T,
    manifestIndex: number,
    _changes: StateChange[],
  ): void {
    if (manifestIndex > 0) {
      write('\n');
      write('---\n');
    }
    const str = yaml.stringify(manifest, {
      version: '1.1',
      schema: 'yaml-1.1',
    });
    write(str);
  }
  serialize(synth: Synthesis<T>, writable: Writable): void {
    const write = this._createWriter(writable);
    synth.forEach(([component, manifests, changes], index) => {
      if (index > 0) {
        write('\n\n');
      }
      write('---\n');
      write(`#${'>'.repeat(1 + component.depth)} ${component.name}\n`);

      manifests.forEach((manifest, manifestIndex) => {
        const manifestChanges = changes.filter(
          change => change.manifestIndex === manifestIndex,
        );
        this._processManifest(write, component, manifest, manifestIndex, manifestChanges);
      });
      write(`#${'<'.repeat(1 + component.depth)} ${component.name}\n`);
    });
  }
}

export class SerializerTraced<T extends any = any> extends Serializer<T> implements ISerializer<T> {
  protected _processManifest(
    write: (str: string) => void,
    _component: IComponent<T>,
    manifest: T,
    manifestIndex: number,
    changes: StateChange[],
  ): void {
    const doc = yaml.parseDocument(yaml.stringify(manifest));

    for (const { diff, trace, manifestIndex: changeManifestIndex } of changes) {
      if (changeManifestIndex !== manifestIndex) {
        continue;
      }

      if (diff.op === 'add') {
        processAdd(doc, diff.path, diff.val, trace);
      } else if (diff.op === 'update') {
        processUpdate(doc, diff.path, diff.val, trace);
      } else if (diff.op === 'delete') {
        processDelete(doc, diff.path, diff.oldVal, trace);
      }
    }

    if (manifestIndex > 0) {
      write('\n');
      write('---\n');
    }
    const str = yaml.stringify(doc, {
      version: '1.1',
      schema: 'yaml-1.1',
    });
    write(str);
  }
}
