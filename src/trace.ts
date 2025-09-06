
import path from 'path';

export interface ITrace {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  toString(): string;
}

export class Trace implements ITrace {
  public relativeFile: string;
  constructor(public readonly file: string, public readonly line: number, public readonly column: number) {
    this.relativeFile = path.relative(process.cwd(), this.file);
  }
  toString(): string {
    return `${this.relativeFile}:${this.line}`;
  }
}

export function trace(lineOffset: number = 0): Trace {
  const errorTrace = new Error('trace');
  if (errorTrace.stack) {
    // 0: Error, 1: at behavior, 2: at caller
    const lines = errorTrace.stack.split('\n');
    const callerLine = lines[Math.max(0, Math.min(lines.length - 1, 2 + lineOffset))];
    if (callerLine) {
      const match = callerLine.match(/\s*at (?:.*(?:[(]|\s+))?([^:]+:\d+:\d+)/);
      if (match) {
        const parts = match[1].split(':');
        const file = parts.slice(0, -2).join(':');
        const line = parseInt(parts[parts.length - 2], 10);
        const column = parseInt(parts[parts.length - 1], 10);
        return new Trace(file, line, column);
      }
    }
  }
  throw new Error('Failed to generate trace');
}
