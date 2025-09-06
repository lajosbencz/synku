import { Writable } from 'stream';
import util from 'util';

export interface ILoggerAware {
  readonly logger: ILogger;
}

export interface ILogger {
  log(...args: any[]): void;
}

export class Logger {
  constructor(public readonly stream: Writable) { }
  log(...args: any[]): void {
    const out = args.map(arg => {
      if (typeof arg === 'string') {
        return arg;
      } else {
        return util.inspect(arg, { colors: true, depth: null });
      }
    }).join(' ');
    this.stream.write(out);
    this.stream.write('\n');
  }
}

export const DefaultLogger = new Logger(process.stderr);
