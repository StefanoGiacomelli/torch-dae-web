export type EvidenceStatus = 'officially_reported' | 'observed' | 'inferred' | 'unresolved';

export interface CatalogueProvenance {
  modelCardPath: string;
  technicalCardPath?: string;
  verificationReportPath?: string;
  rawMeasurementPath?: string;
  sourceRevision?: string;
  sourceContentIdentity?: string;
  sourcePackageVersion?: string;
  sourceRepositoryDirty?: boolean | null;
  profilerImplementationVersion?: string;
}

export interface CatalogueSourceRecord {
  id: string;
  kind: string;
  url: string | null;
  package: string | null;
  revision: string | null;
  path: string | null;
  evidenceStatus: EvidenceStatus;
}

export interface CatalogueEvidence {
  id: string;
  kind: string;
  status: EvidenceStatus;
  url: string | null;
  revision: string | null;
  path: string | null;
  description: string;
}

export interface CatalogueDataset {
  name: string;
  version: string | null;
  subset: string | null;
  split: string | null;
  role: string;
  sourceStatus: EvidenceStatus;
  evidenceIds: string[];
}

export interface CatalogueMetric {
  task: string;
  dataset: string;
  split: string;
  name: string;
  value: number;
  unit: string | null;
  protocol: string;
  sourceStatus: EvidenceStatus;
  evidenceIds: string[];
}

export interface CatalogueOutput {
  name: string;
  semanticKind: string;
  layout: string;
  dtype: string;
}

export interface CatalogueEmbedding {
  id: string;
  name: string;
  dimension: number | null;
  granularity: string;
  networkLocation: string;
  status: string;
}

export interface VerificationBackend {
  backend: string;
  status: 'locally_verified' | 'upstream_declared';
}

export interface CatalogueModel {
  id: string;
  displayName: string;
  family: string;
  variant: string;
  lifecycleStatus: string;
  architectureSummary: string;
  checkpoint: {
    id: string;
    name: string;
    sourceType: string;
    filename: string | null;
    format: string;
    expectedSha256: string | null;
    observedSha256: string | null;
    authority: null | {
      provider: string;
      recordId: string;
      filename: string;
      recordUrl: string;
      provenanceStatus: string;
    };
  };
  sources: {
    officialRepository: CatalogueSourceRecord;
    implementation: CatalogueSourceRecord;
    checkpoint: CatalogueSourceRecord;
    wrapper: CatalogueSourceRecord;
  };
  scientificReference: {
    title: string;
    doi: string | null;
    officialPublication: string | null;
    authors: string[];
    year: number;
  };
  datasets: {
    training: CatalogueDataset[];
    validation: CatalogueDataset[];
    testing: CatalogueDataset[];
  };
  evidence: CatalogueEvidence[];
  tasks: string[];
  sampleRateHz: number;
  input: {
    shape: string;
    channels: string;
    dtype: string;
    validLengthsShape: string | null;
    resampling: string;
    padding: string;
    normalization: string;
  };
  outputs: CatalogueOutput[];
  defaultEmbedding: CatalogueEmbedding | null;
  upstreamMetrics: CatalogueMetric[];
  verificationBackends: VerificationBackend[];
  limitations: string[];
  technicalCardIds: string[];
  provenance: CatalogueProvenance;
}

export interface CatalogueTimingMetricSet {
  sampleCount: number;
  latencyMeanMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  throughputItemsPerSecond: number;
  realTimeFactor: number;
  speedFactor: number;
}

export interface CatalogueCondition {
  id: string;
  durationSeconds: number;
  batchSize: number;
  sampleCount: number;
  status: string;
  unsupportedReason: string | null;
  timing: CatalogueTimingMetricSet | null;
}

export interface CatalogueContext {
  protocolId: string;
  protocolVersion: string;
  executionContextFingerprint: string;
  runtimeClassification: string;
  deviceBackend: string;
  deviceLabel: string;
  deviceIndex: number | null;
  precision: string;
  autocast: boolean;
  threadRegime: string | null;
  canonicalDurationSeconds: number;
  sampleRateHz: number;
  sampleCount: number;
  channelCount: number;
  inputDtype: string;
  inputDistribution: string;
  inputSeed: number;
  hardware: {
    cpuModel: string | null;
    cpuArchitecture: string;
    physicalCores: number | null;
    logicalCores: number | null;
    totalRamBytes: number | null;
    acceleratorVendor: string | null;
    acceleratorModel: string | null;
  };
  environment: {
    osName: string;
    osVersion: string;
    pythonImplementation: string;
    pythonVersion: string;
    torchVersion: string;
    cudaRuntimeVersion: string | null;
    cudaDriverVersion: string | null;
    cudnnVersion: string | null;
    mpsBackendInfo: string | null;
    hardwareFingerprint: string;
  };
}

export type EnergyMeasurementKind =
  | 'hardware_measured'
  | 'software_estimated'
  | 'unavailable'
  | 'failed';

export interface CatalogueEnergy {
  availability: 'complete' | 'partial' | 'unavailable' | 'failed';
  measurementKind: EnergyMeasurementKind;
  totalEnergyKwh: number | null;
  cpuEnergyKwh: number | null;
  acceleratorEnergyKwh: number | null;
  ramEnergyKwh: number | null;
  durationSeconds: number | null;
  intervalSeconds: number | null;
  averagePowerWatts: number | null;
  measurementScope: string | null;
  provider: { name: 'CodeCarbon'; version: string } | null;
  privilegeUsed: boolean;
  coverageComplete: boolean;
  unaccountedComponents: string[];
  limitations: string[];
}

export type AcceleratorMemoryMetricKind =
  | 'cuda_current_allocated'
  | 'cuda_peak_allocated'
  | 'cuda_current_reserved'
  | 'cuda_peak_reserved'
  | 'mps_current_allocated'
  | 'mps_driver_allocated';

export interface AcceleratorMemoryObservation {
  kind: AcceleratorMemoryMetricKind;
  bytes: number;
}

export interface CatalogueTechnicalCard {
  id: string;
  modelId: string;
  schemaVersion: string;
  context: CatalogueContext;
  conditions: CatalogueCondition[];
  architecture: {
    totalParameters: number;
    parameterBytes: number;
    flops: number | null;
    macs: number | null;
    flopsMacsStatus: string;
  };
  memory: {
    rssSampledPeakBytes: number;
    rssSampledPeakIsSampled: boolean;
    accelerator: null | {
      backend: string;
      observations: AcceleratorMemoryObservation[];
      unifiedMemoryNote: string | null;
    };
  };
  energy: CatalogueEnergy;
  coverage: {
    testedConditionIds: string[];
    unsupportedConditionIds: string[];
    energyStatus: string;
  };
  provenance: CatalogueProvenance;
  createdAt: string;
}

export interface CatalogueMetadata {
  sourceRepository: string;
  sourceMode: 'local' | 'github';
  requestedRef: string;
  resolvedCommitSha: string;
  generatedAt: string;
  modelCount: number;
  technicalCardCount: number;
  schemaVersions: {
    modelCards: string[];
    technicalCards: string[];
  };
  /** SPDX identifier read from the canonical source's own `pyproject.toml`; null if undiscoverable. */
  licenseIdentifier: string | null;
}

export interface CatalogueIndex {
  metadata: CatalogueMetadata;
  models: CatalogueModel[];
  technicalCards: CatalogueTechnicalCard[];
}
