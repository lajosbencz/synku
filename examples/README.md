# Synku Example

## Download Helm charts

```bash
# Kafka
helm pull oci://registry-1.docker.io/bitnamicharts/kafka \
--version 32.4.2 --untar --untardir charts/

# Kafka Connect
helm repo add licenseware https://licenseware.github.io/charts
helm pull licenseware/kafka-connect \
--version 0.4.0 --untar --untardir charts/
```

## Generate types for Helm charts

```bash
npx synku chart ./charts/kafka
npx synku chart ./charts/kafka-connect
```

## Synthesize

```bash
npx synku ./charts.ts > ./charts.yaml
```
