import { TypeMeta } from '@kubernetes-models/base'

export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T | undefined

export interface KubernetesObject {
  apiVersion: string
  kind: string
  metadata?: {
    name?: string
    namespace?: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    [key: string]: any
  }
  [key: string]: any
}

export interface KubernetesManifest<T extends KubernetesObject = KubernetesObject> {
  type: new (...args: any[]) => T
  spec: DeepPartial<T>
}

export type KubernetesResource<T> = T extends new (...args: any[]) => infer R ? R : never
