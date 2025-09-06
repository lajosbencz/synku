import { Chart } from '../src/helm';

export interface KafkaConnectChartValues {
  replicaCount?: number;
  image?: {
    repository?: string;
    pullPolicy?: string;
    tag?: string;
  };
  imagePullSecrets?: any[];
  nameOverride?: string;
  fullnameOverride?: string;
  extraVolumeMounts?: any[];
  extraVolumes?: any[];
  strategy?: {
    rollingUpdate?: {
    maxSurge?: number;
    maxUnavailable?: number;
  };
    type?: string;
  };
  serviceAccount?: {
    create?: boolean;
    annotations?: {

  };
    name?: string;
    automountServiceAccountToken?: boolean;
  };
  livenessProbe?: {
    httpGet?: {
    path?: string;
    port?: string;
  };
    initialDelaySeconds?: number;
    periodSeconds?: number;
    timeoutSeconds?: number;
    failureThreshold?: number;
    successThreshold?: number;
  };
  readinessProbe?: {
    httpGet?: {
    path?: string;
    port?: string;
  };
    initialDelaySeconds?: number;
    periodSeconds?: number;
    timeoutSeconds?: number;
    failureThreshold?: number;
    successThreshold?: number;
  };
  podAnnotations?: {

  };
  podSecurityContext?: {

  };
  securityContext?: {

  };
  service?: {
    type?: string;
    port?: number;
  };
  ingress?: {
    enabled?: boolean;
    className?: string;
    annotations?: {

  };
    hosts?: {
    host?: string;
    paths?: {
    path?: string;
    pathType?: string;
  }[];
  }[];
    tls?: any[];
  };
  resources?: {

  };
  autoscaling?: {
    enabled?: boolean;
    minReplicas?: number;
    maxReplicas?: number;
    targetCPUUtilizationPercentage?: number;
  };
  nodeSelector?: {

  };
  tolerations?: any[];
  affinity?: {

  };
  configMapPairs?: {
    CONNECT_BOOTSTRAP_SERVERS?: string;
    CONNECT_REST_PORT?: string;
    CONNECT_GROUP_ID?: string;
    CONNECT_CONFIG_STORAGE_TOPIC?: string;
    CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR?: string;
    CONNECT_OFFSET_STORAGE_TOPIC?: string;
    CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR?: string;
    CONNECT_OFFSET_STORAGE_PARTITIONS?: string;
    CONNECT_OFFSET_PARTITION_NAME?: string;
    CONNECT_STATUS_STORAGE_TOPIC?: string;
    CONNECT_STATUS_STORAGE_REPLICATION_FACTOR?: string;
    CONNECT_STATUS_STORAGE_PARTITIONS?: string;
    CONNECT_KEY_CONVERTER?: string;
    CONNECT_VALUE_CONVERTER?: string;
    CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL?: string;
    CONNECT_INTERNAL_KEY_CONVERTER?: string;
    CONNECT_INTERNAL_VALUE_CONVERTER?: string;
    CONNECT_PRODUCER_INTERCEPTOR_CLASSES?: string;
    CONNECT_CONSUMER_INTERCEPTOR_CLASSES?: string;
    CONNECT_REST_ADVERTISED_HOST_NAME?: string;
    CONNECT_PLUGIN_PATH?: string;
    CONNECT_LOG4J_LOGGERS?: string;
  };
  extraEnvFrom?: any[];
  initContainers?: any[];
  sidecars?: any[];
  kafka?: {
    create?: boolean;
    fullnameOverride?: string;
    nameOverride?: string;
    defaultReplicationFactor?: number;
    deleteTopicEnable?: boolean;
    heapOpts?: string;
    numPartitions?: number;
    persistence?: {
    enabled?: boolean;
  };
    provisioning?: {
    enabled?: boolean;
    topics?: {
    name?: string;
    config?: {
    "cleanup.policy"?: string;
  };
  }[];
  };
    replicaCount?: number;
    zookeeper?: {
    persistence?: {
    enabled?: boolean;
  };
  };
  };
  "schema-registry"?: {
    create?: boolean;
    externalKafka?: {
    brokers?: string[];
  };
    kafka?: {
    enabled?: boolean;
  };
    zookeeper?: {
    enabled?: boolean;
  };
  };
}

/**
 * KafkaConnectChart - Helm chart wrapper
 * Confluent Kafka connect Helm Chart with the ability to add plugins as required
 * @version 0.4.0
 * @source ./charts/kafka-connect
 */
export class KafkaConnectChart extends Chart<KafkaConnectChartValues> {
  constructor(parent: any, name: string, values: KafkaConnectChartValues) {
    super(parent, 'examples/charts/kafka-connect', 'default', name, values);
  }
}
