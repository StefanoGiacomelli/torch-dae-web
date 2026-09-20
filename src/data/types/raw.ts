export type JsonObject = Record<string, unknown>;

export interface RawModelCard extends JsonObject {
  schema_version: string;
  card_id: string;
  card_status: string;
  identity: {
    model_name: string;
    model_family: string;
    variant: string;
    checkpoint_name: string;
  };
  checkpoint: {
    checkpoint_id: string;
    source_type: string;
    filename: string | null;
    format: string;
    expected_sha256: string | null;
    observed_sha256: string | null;
    authority: null | {
      provider: string;
      record_id: string;
      filename: string;
      record_url: string;
      provenance_status: string;
    };
  };
  sources: Record<'official_repository' | 'implementation' | 'checkpoint' | 'wrapper', {
    source_id: string;
    kind: string;
    url: string | null;
    package: string | null;
    revision: string | null;
    path: string | null;
    evidence_status: 'officially_reported' | 'observed' | 'inferred' | 'unresolved';
  }>;
  scientific_reference: {
    title: string;
    doi: string | null;
    official_publication: string | null;
    authors: string[];
    year: number;
  };
  description: { architecture: string };
  datasets: Record<'training' | 'validation' | 'testing', Array<{
    name: string;
    version: string | null;
    subset: string | null;
    split: string | null;
    role: string;
    source_status: 'officially_reported' | 'observed' | 'inferred' | 'unresolved';
    evidence_ids: string[];
  }>>;
  evidence: Array<{
    evidence_id: string;
    kind: string;
    status: 'officially_reported' | 'observed' | 'inferred' | 'unresolved';
    url: string | null;
    revision: string | null;
    path: string | null;
    description: string;
  }>;
  tasks: { supported_inference: string[] };
  input: {
    shape: string;
    sample_rate_hz: number;
    dtype: string;
    valid_lengths_shape: string | null;
    channels: string;
    resampling: string;
    padding: string;
    normalization: string;
  };
  outputs: { components: Array<{ name: string; semantic_kind: string; layout: string; dtype: string }> };
  embeddings: {
    default_embedding_id: string | null;
    items: Array<{
      embedding_id: string;
      name: string;
      dimension: number | null;
      granularity: string;
      network_location: string;
      status: string;
      default: boolean;
    }>;
  };
  reported_metrics: Array<{
    task: string;
    dataset: string;
    split: string;
    metric: string;
    value: number;
    unit: string | null;
    protocol: string;
    source_status: 'officially_reported' | 'observed' | 'inferred' | 'unresolved';
    evidence_ids: string[];
  }>;
  device_support: { upstream_declared: string[]; locally_tested: string[] };
  verification_report?: string | null;
  limitations: string[];
}

export interface RawTechnicalCard extends JsonObject {
  technical_card_schema_version: string;
  identity: { technical_card_id: string };
  model: { model_card_id: string; model_card_path: string };
  profiler: {
    profiler_implementation_version: string;
    torch_dae_package_version: string;
    torch_dae_content_identity: string;
    torch_dae_repository_head: string | null;
    torch_dae_repository_dirty: boolean | null;
    codecarbon_version: string | null;
    psutil_version: string | null;
  };
  hardware: {
    cpu_model: string | null;
    cpu_architecture: string;
    physical_cores: number | null;
    logical_cores: number | null;
    total_ram_bytes: number | null;
    accelerator_vendor: string | null;
    accelerator_model: string | null;
  };
  software: {
    os_name: string;
    os_version: string;
    python_implementation: string;
    python_version: string;
    torch_version: string;
    cuda_runtime_version: string | null;
    cuda_driver_version: string | null;
    cudnn_version: string | null;
    mps_backend_info: string | null;
  };
  device: { backend: string; device_label: string; device_index: number | null };
  execution_context: {
    hardware_fingerprint: string;
    native_precision: string;
    thread_regime?: string | null;
  };
  precision: { dtype: string; autocast: boolean };
  synthetic_input: {
    distribution: string;
    dtype: string;
    seed: number;
    sample_rate: number;
    sample_count: number;
    batch_size: number;
    channel_count: number;
  };
  canonical_duration_seconds: number;
  architecture: {
    total_parameters: number;
    parameter_bytes: number;
    flops: number | null;
    macs: number | null;
    flops_macs_status: string;
  };
  conditions: Array<{
    condition_id: string;
    duration_seconds: number;
    batch_size: number;
    sample_count: number;
    status: string;
    unsupported_reason: string | null;
    timing: null | {
      sample_count: number;
      mean_ns: number;
      p50_ns: number;
      p95_ns: number;
      throughput_items_per_second: number;
      real_time_factor: number;
      speed_factor: number;
    };
  }>;
  host_memory: { rss_sampled_peak_bytes: number; rss_sampled_peak_is_sampled: boolean };
  accelerator_memory: null | {
    backend: string;
    cuda_current_allocated_bytes?: number | null;
    cuda_peak_allocated_bytes?: number | null;
    cuda_current_reserved_bytes?: number | null;
    cuda_peak_reserved_bytes?: number | null;
    mps_current_allocated_bytes?: number | null;
    mps_driver_allocated_bytes?: number | null;
    unified_memory_note?: string | null;
  };
  energy: {
    measurement_kind: 'hardware_measured' | 'software_estimated' | 'unavailable' | 'failed';
    codecarbon_version: string | null;
    cpu_energy_kwh: number | null;
    accelerator_energy_kwh: number | null;
    ram_energy_kwh: number | null;
    total_energy_kwh: number | null;
    measurement_duration_seconds: number | null;
    measurement_interval_seconds: number | null;
    measurement_scope: string | null;
    average_power_watts: number | null;
    privilege_used: boolean;
    coverage_complete: boolean;
    unaccounted_components: string[];
    limitations: string[];
    failure_reason: string | null;
  };
  raw_measurements: { path: string };
  coverage: {
    tested_conditions: string[];
    unsupported_conditions: string[];
    energy_status: string;
  };
  comparability: {
    protocol_id: string;
    protocol_version: string;
    execution_context_fingerprint: string;
    runtime_classification: string;
  };
  created_at: string;
}
