import { IComponent } from './component'

export interface IWriter {
  write(component: IComponent, stream: NodeJS.WritableStream, options?: any): void
}
