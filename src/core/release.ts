import { Component, ComponentInit } from './component';

export class Release extends Component {
  public static new(name: string, init: ComponentInit) {
    return new Release(undefined, name, init);
  }
}
