import type { RawModelCard, RawTechnicalCard } from '../../src/data/types/raw';

function model(id: string, sampleRate: number): RawModelCard {
  return {
    schema_version: '1.0.0',
    card_id: id,
    card_status: 'runtime_verified',
    identity: { model_name: 'Fixture', model_family: 'Test family', variant: id, checkpoint_name: `${id} checkpoint` },
    checkpoint: {
      checkpoint_id: id, source_type: 'https', filename: `${id}.pt`, format: 'fixture',
      expected_sha256: null, observed_sha256: 'a'.repeat(64),
      authority: { provider: 'fixture', record_id: '1', filename: `${id}.pt`, record_url: 'https://example.test/1', provenance_status: 'officially_reported' },
    },
    sources: {
      official_repository: { source_id: 'official', kind: 'repository', url: 'https://example.test/repo', package: null, revision: 'b'.repeat(40), path: null, evidence_status: 'officially_reported' },
      implementation: { source_id: 'implementation', kind: 'repository', url: 'https://example.test/repo', package: null, revision: 'b'.repeat(40), path: 'model.py', evidence_status: 'officially_reported' },
      checkpoint: { source_id: 'checkpoint', kind: 'asset', url: 'https://example.test/1', package: null, revision: null, path: null, evidence_status: 'officially_reported' },
      wrapper: { source_id: 'wrapper', kind: 'local', url: null, package: null, revision: null, path: 'wrapper.py', evidence_status: 'observed' },
    },
    scientific_reference: { title: 'Fixture paper', doi: null, official_publication: null, authors: ['Tester'], year: 2026 },
    description: { architecture: 'Fixture architecture' },
    datasets: {
      training: [{ name: 'FixtureSet', version: null, subset: null, split: 'train', role: 'training', source_status: 'officially_reported', evidence_ids: ['paper'] }],
      validation: [],
      testing: [{ name: 'FixtureSet', version: null, subset: null, split: 'test', role: 'evaluation', source_status: 'officially_reported', evidence_ids: ['paper'] }],
    },
    evidence: [{ evidence_id: 'paper', kind: 'paper', status: 'officially_reported', url: 'https://example.test/paper', revision: null, path: null, description: 'Fixture evidence' }],
    tasks: { supported_inference: ['embedding_extraction'] },
    input: { shape: 'B,C,T', sample_rate_hz: sampleRate, dtype: 'float32', valid_lengths_shape: 'B', channels: 'mono', resampling: 'none', padding: 'none', normalization: 'none' },
    outputs: { components: [{ name: 'embedding', semantic_kind: 'embedding', layout: 'B,8', dtype: 'float32' }] },
    embeddings: {
      default_embedding_id: 'embedding',
      items: [{
        embedding_id: 'embedding', name: 'Fixture embedding', dimension: 8, granularity: 'clipwise',
        network_location: 'test layer', status: 'verified', default: true,
      }],
    },
    reported_metrics: [],
    device_support: { upstream_declared: ['cpu', 'cuda'], locally_tested: ['cpu'] },
    verification_report: `verification/${id}.json`,
    limitations: [],
  };
}

export function createFixtureTechnicalCard(
  id: string,
  modelId: string,
  fingerprint: string,
  energy: { kind?: RawTechnicalCard['energy']['measurement_kind']; complete?: boolean } = {},
): RawTechnicalCard {
  const kind = energy.kind ?? 'hardware_measured';
  const complete = energy.complete ?? true;
  const available = kind !== 'unavailable' && kind !== 'failed';
  return {
    technical_card_schema_version: '1.0.0',
    identity: { technical_card_id: id },
    model: { model_card_id: modelId, model_card_path: `model_cards/fixtures/${modelId}.json` },
    profiler: {
      profiler_implementation_version: '1.0.0', torch_dae_package_version: '0.2.0',
      torch_dae_content_identity: 'content-sha256:fixture', torch_dae_repository_head: 'abc123',
      torch_dae_repository_dirty: false, codecarbon_version: '2.8.4', psutil_version: '6.1.1',
    },
    hardware: { cpu_model: 'Fixture CPU', cpu_architecture: 'test64', physical_cores: 4, logical_cores: 8, total_ram_bytes: 1024, accelerator_vendor: null, accelerator_model: null },
    software: { os_name: 'FixtureOS', os_version: '1', python_implementation: 'CPython', python_version: '3.12', torch_version: '2.0', cuda_runtime_version: null, cuda_driver_version: null, cudnn_version: null, mps_backend_info: null },
    device: { backend: 'cpu', device_label: 'cpu', device_index: null },
    execution_context: { hardware_fingerprint: 'c'.repeat(64), native_precision: 'float32', thread_regime: fingerprint },
    precision: { dtype: 'float32', autocast: false },
    synthetic_input: { distribution: 'uniform', dtype: 'float32', seed: 1337, sample_rate: 16000, sample_count: 16000, batch_size: 1, channel_count: 1 },
    canonical_duration_seconds: 1,
    architecture: { total_parameters: 10, parameter_bytes: 40, flops: null, macs: null, flops_macs_status: 'unavailable' },
    conditions: [{
      condition_id: 'b1', duration_seconds: 1, batch_size: 1, sample_count: 16000, status: 'success',
      unsupported_reason: null,
      timing: { sample_count: 5, mean_ns: 2_000_000, p50_ns: 1_900_000, p95_ns: 2_200_000,
        throughput_items_per_second: 500, real_time_factor: 0.002, speed_factor: 500 },
    }],
    host_memory: { rss_sampled_peak_bytes: 100, rss_sampled_peak_is_sampled: true },
    accelerator_memory: null,
    energy: {
      measurement_kind: kind, codecarbon_version: available ? '2.8.4' : null,
      cpu_energy_kwh: available && complete ? 0.001 : null,
      accelerator_energy_kwh: null, ram_energy_kwh: available ? 0.001 : null,
      total_energy_kwh: available && complete ? 0.002 : null,
      measurement_duration_seconds: available ? 1 : null,
      measurement_interval_seconds: available ? 0.1 : null,
      measurement_scope: available ? 'fixture resource pass' : null,
      average_power_watts: available ? 2 : null,
      privilege_used: kind === 'hardware_measured', coverage_complete: available && complete,
      unaccounted_components: available && !complete ? ['cpu'] : [], limitations: [],
      failure_reason: kind === 'failed' ? 'fixture failure' : null,
    },
    raw_measurements: { path: `${id}.npz` },
    coverage: { tested_conditions: ['b1'], unsupported_conditions: [], energy_status: 'hardware_measured' },
    comparability: { protocol_id: 'audio-inference-v1', protocol_version: '1.0.0', execution_context_fingerprint: fingerprint, runtime_classification: 'canonical' },
    created_at: '2026-01-01T00:00:00Z',
  };
}

export const fixtureModels = [
  { card: model('model-a', 16000), path: 'model_cards/fixtures/model-a.json' },
  { card: model('model-b', 32000), path: 'model_cards/fixtures/model-b.json' },
];

export const fixtureTechnicalCards = [
  { card: createFixtureTechnicalCard('tc-a1', 'model-a', 'context-a'), path: 'technical_cards/model-a/tc-a1.json' },
  { card: createFixtureTechnicalCard('tc-a2', 'model-a', 'context-b', { complete: false }), path: 'technical_cards/model-a/tc-a2.json' },
  { card: createFixtureTechnicalCard('tc-b1', 'model-b', 'context-a'), path: 'technical_cards/model-b/tc-b1.json' },
];
