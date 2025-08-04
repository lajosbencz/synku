# synku

## SYNthesize KUbernetes manifests

### Why?

- Concise
- Unopinionated
- Typesafe
- Composition

### Examples

- [Definition](examples/features.ts)
- [Synthesis](examples/features.yaml)

### Usage

#### Install

```bash
yarn add synku
```

#### Compose

```typescript
// project.ts
import * as k8s from "kubernetes-models";
import { Release } from "synku";
Release.new("project", (release) => {
  release
    .behavior((component) => {
      component.findAll(k8s.v1.ConfigMap).forEach((configMap) => {
        configMap.data!.baz = "bax";
      });
    })
    .component(k8s.v1.ConfigMap, {
      data: {
        foo: "bar",
      },
    });
}).write(process.stdout);
```

#### Synthesize

```bash
npx synku ./project.ts
```
