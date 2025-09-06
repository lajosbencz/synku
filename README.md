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
import synku, { behavior } from "synku";

export default synku("example", (release) => {
  const config = release.add("config");
  config
    .with(
      behavior((component) => {
        component.findAll(k8s.v1.ConfigMap).forEach((configMap) => {
          configMap.data!.baz = "bax";
        });
      })
    )
    .draft(k8s.v1.ConfigMap, {
      data: {
        foo: "bar",
      },
    });
});
```

#### Synthesize

```bash
npx synku ./project.ts
```

### Helm Charts

#### Download

```bash
helm pull licenseware/kafka-connect --version 0.4.0 --untar --untardir charts
helm pull oci://registry-1.docker.io/bitnamicharts/schema-registry --version 26.0.5 --untar --untardir charts
```

#### Generate

```bash
npx synku chart ./charts/kafka-connect --name KafkaConnect --output kafka-connect-chart.ts
npx synku chart ./charts/schema-registry --name SchemaRegistry --output schema-registry-chart.ts
```

#### Compose

```typescript
// project.ts
import * as k8s from "kubernetes-models";
import synku, { behavior } from "synku";
import { KafkaChart } from "./kafka-chart.ts";

export default synku("example", (release) => {
  release
    .with(
      behavior((component) => {
        component.findAll(k8s.v1.ConfigMap).forEach((configMap) => {
          configMap.data!.baz = "bax";
        });
      })
    )
    .draft(k8s.v1.ConfigMap, {
      data: {
        foo: "bar",
      },
    });
  const kafka = release.add("kafka", KafkaChart, {
    broker: {
      persistence: {
        enabled: false,
      },
    },
  });
  kafka.with(
    behavior((component) => {
      component.findAll(k8s.v1.ConfigMap).forEach((configMap) => {
        delete configMap.data?.baz;
      });
    })
  );
});
```
