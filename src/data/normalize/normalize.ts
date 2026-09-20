import type {
  AcceleratorMemoryMetricKind,
  CatalogueEnergy,
  CatalogueIndex,
  CatalogueMetadata,
  CatalogueModel,
  CatalogueTechnicalCard,
  VerificationBackend,
} from '../types/catalogue';
import type { RawModelCard, RawTechnicalCard } from '../types/raw';

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function displayName(card: RawModelCard): string {
  const variant = card.identity.variant.replaceAll('_', ' ');
  return `${card.identity.model_name} ${variant}`;
}

function verificationBackends(card: RawModelCard): VerificationBackend[] {
  const local = new Set(card.device_support.locally_tested);
  return uniqueSorted([...card.device_support.upstream_declared, ...local]).map((backend) => ({
    backend,
    status: local.has(backend) ? 'locally_verified' : 'upstream_declared',
  }));
}

function normalizeSource(source: RawModelCard['sources']['implementation']) {
  return {
    id: source.source_id,
    kind: source.kind,
    url: source.url,
    package: source.package,
    revision: source.revision,
    path: source.path,
    evidenceStatus: source.evidence_status,
  };
}

function normalizeDatasets(datasets: RawModelCard['datasets']['training']) {
  return datasets.map((dataset) => ({
    name: dataset.name,
    version: dataset.version,
    subset: dataset.subset,
    split: dataset.split,
    role: dataset.role,
    sourceStatus: dataset.source_status,
    evidenceIds: dataset.evidence_ids,
  }));
}

function normalizeEnergy(card: RawTechnicalCard): CatalogueEnergy {
  let availability: CatalogueEnergy['availability'];
  if (card.energy.measurement_kind === 'failed' || card.energy.failure_reason) availability = 'failed';
  else if (card.energy.measurement_kind === 'unavailable') availability = 'unavailable';
  else availability = card.energy.coverage_complete ? 'complete' : 'partial';

  return {
    availability,
    measurementKind: card.energy.measurement_kind,
    totalEnergyKwh: card.energy.total_energy_kwh,
    cpuEnergyKwh: card.energy.cpu_energy_kwh,
    acceleratorEnergyKwh: card.energy.accelerator_energy_kwh,
    ramEnergyKwh: card.energy.ram_energy_kwh,
    durationSeconds: card.energy.measurement_duration_seconds,
    intervalSeconds: card.energy.measurement_interval_seconds,
    averagePowerWatts: card.energy.average_power_watts,
    measurementScope: card.energy.measurement_scope,
    provider: card.energy.codecarbon_version
      ? { name: 'CodeCarbon', version: card.energy.codecarbon_version }
      : null,
    privilegeUsed: card.energy.privilege_used,
    coverageComplete: card.energy.coverage_complete,
    unaccountedComponents: card.energy.unaccounted_components,
    limitations: card.energy.limitations,
  };
}

function normalizeAcceleratorMemory(card: RawTechnicalCard) {
  if (!card.accelerator_memory) return null;
  const values: Array<[AcceleratorMemoryMetricKind, number | null | undefined]> = [
    ['cuda_current_allocated', card.accelerator_memory.cuda_current_allocated_bytes],
    ['cuda_peak_allocated', card.accelerator_memory.cuda_peak_allocated_bytes],
    ['cuda_current_reserved', card.accelerator_memory.cuda_current_reserved_bytes],
    ['cuda_peak_reserved', card.accelerator_memory.cuda_peak_reserved_bytes],
    ['mps_current_allocated', card.accelerator_memory.mps_current_allocated_bytes],
    ['mps_driver_allocated', card.accelerator_memory.mps_driver_allocated_bytes],
  ];
  return {
    backend: card.accelerator_memory.backend,
    observations: values
      .filter((value): value is [AcceleratorMemoryMetricKind, number] => value[1] !== null && value[1] !== undefined)
      .map(([kind, bytes]) => ({ kind, bytes })),
    unifiedMemoryNote: card.accelerator_memory.unified_memory_note ?? null,
  };
}

export function normalizeCatalogue(
  rawModels: Array<{ card: RawModelCard; path: string }>,
  rawTechnicalCards: Array<{ card: RawTechnicalCard; path: string }>,
  metadata: Omit<CatalogueMetadata, 'modelCount' | 'technicalCardCount' | 'schemaVersions'>,
): CatalogueIndex {
  const modelIds = new Set<string>();
  for (const { card } of rawModels) {
    if (modelIds.has(card.card_id)) throw new Error(`Duplicate Model Card ID: ${card.card_id}`);
    modelIds.add(card.card_id);
  }

  const technicalIds = new Set<string>();
  const technicalByModel = new Map<string, string[]>();
  for (const { card } of rawTechnicalCards) {
    const technicalId = card.identity.technical_card_id;
    if (technicalIds.has(technicalId)) throw new Error(`Duplicate Technical Card ID: ${technicalId}`);
    technicalIds.add(technicalId);
    if (!modelIds.has(card.model.model_card_id)) {
      throw new Error(`Technical Card ${technicalId} references unknown model ${card.model.model_card_id}`);
    }
    const links = technicalByModel.get(card.model.model_card_id) ?? [];
    links.push(technicalId);
    technicalByModel.set(card.model.model_card_id, links);
  }

  const models: CatalogueModel[] = rawModels.map(({ card, path }) => {
    const defaultEmbedding =
      card.embeddings.items.find(
        (embedding) => embedding.default && embedding.embedding_id === card.embeddings.default_embedding_id,
      ) ?? null;
    if (card.embeddings.default_embedding_id && !defaultEmbedding) {
      throw new Error(`Model ${card.card_id} has an unresolved default embedding reference`);
    }

    return {
      id: card.card_id,
      displayName: displayName(card),
      family: card.identity.model_family,
      variant: card.identity.variant,
      lifecycleStatus: card.card_status,
      architectureSummary: card.description.architecture,
      checkpoint: {
        id: card.checkpoint.checkpoint_id,
        name: card.identity.checkpoint_name,
        sourceType: card.checkpoint.source_type,
        filename: card.checkpoint.filename,
        format: card.checkpoint.format,
        expectedSha256: card.checkpoint.expected_sha256,
        observedSha256: card.checkpoint.observed_sha256,
        authority: card.checkpoint.authority
          ? {
              provider: card.checkpoint.authority.provider,
              recordId: card.checkpoint.authority.record_id,
              filename: card.checkpoint.authority.filename,
              recordUrl: card.checkpoint.authority.record_url,
              provenanceStatus: card.checkpoint.authority.provenance_status,
            }
          : null,
      },
      sources: {
        officialRepository: normalizeSource(card.sources.official_repository),
        implementation: normalizeSource(card.sources.implementation),
        checkpoint: normalizeSource(card.sources.checkpoint),
        wrapper: normalizeSource(card.sources.wrapper),
      },
      scientificReference: {
        title: card.scientific_reference.title,
        doi: card.scientific_reference.doi,
        officialPublication: card.scientific_reference.official_publication,
        authors: card.scientific_reference.authors,
        year: card.scientific_reference.year,
      },
      datasets: {
        training: normalizeDatasets(card.datasets.training),
        validation: normalizeDatasets(card.datasets.validation),
        testing: normalizeDatasets(card.datasets.testing),
      },
      evidence: card.evidence.map((evidence) => ({
        id: evidence.evidence_id,
        kind: evidence.kind,
        status: evidence.status,
        url: evidence.url,
        revision: evidence.revision,
        path: evidence.path,
        description: evidence.description,
      })),
      tasks: card.tasks.supported_inference,
      sampleRateHz: card.input.sample_rate_hz,
      input: {
        shape: card.input.shape,
        channels: card.input.channels,
        dtype: card.input.dtype,
        validLengthsShape: card.input.valid_lengths_shape,
        resampling: card.input.resampling,
        padding: card.input.padding,
        normalization: card.input.normalization,
      },
      outputs: card.outputs.components.map((output) => ({
        name: output.name,
        semanticKind: output.semantic_kind,
        layout: output.layout,
        dtype: output.dtype,
      })),
      defaultEmbedding: defaultEmbedding
        ? {
            id: defaultEmbedding.embedding_id,
            name: defaultEmbedding.name,
            dimension: defaultEmbedding.dimension,
            granularity: defaultEmbedding.granularity,
            networkLocation: defaultEmbedding.network_location,
            status: defaultEmbedding.status,
          }
        : null,
      upstreamMetrics: card.reported_metrics.map((metric) => ({
        task: metric.task,
        dataset: metric.dataset,
        split: metric.split,
        name: metric.metric,
        value: metric.value,
        unit: metric.unit,
        protocol: metric.protocol,
        sourceStatus: metric.source_status,
        evidenceIds: metric.evidence_ids,
      })),
      verificationBackends: verificationBackends(card),
      limitations: card.limitations,
      technicalCardIds: uniqueSorted(technicalByModel.get(card.card_id) ?? []),
      provenance: {
        modelCardPath: path,
        ...(card.verification_report ? { verificationReportPath: card.verification_report } : {}),
      },
    };
  });

  const technicalCards: CatalogueTechnicalCard[] = rawTechnicalCards.map(({ card, path }) => ({
    id: card.identity.technical_card_id,
    modelId: card.model.model_card_id,
    schemaVersion: card.technical_card_schema_version,
    context: {
      protocolId: card.comparability.protocol_id,
      protocolVersion: card.comparability.protocol_version,
      executionContextFingerprint: card.comparability.execution_context_fingerprint,
      runtimeClassification: card.comparability.runtime_classification,
      deviceBackend: card.device.backend,
      deviceLabel: card.device.device_label,
      deviceIndex: card.device.device_index,
      precision: card.precision.dtype,
      autocast: card.precision.autocast,
      threadRegime: card.execution_context.thread_regime ?? null,
      canonicalDurationSeconds: card.canonical_duration_seconds,
      sampleRateHz: card.synthetic_input.sample_rate,
      sampleCount: card.synthetic_input.sample_count,
      channelCount: card.synthetic_input.channel_count,
      inputDtype: card.synthetic_input.dtype,
      inputDistribution: card.synthetic_input.distribution,
      inputSeed: card.synthetic_input.seed,
      hardware: {
        cpuModel: card.hardware.cpu_model,
        cpuArchitecture: card.hardware.cpu_architecture,
        physicalCores: card.hardware.physical_cores,
        logicalCores: card.hardware.logical_cores,
        totalRamBytes: card.hardware.total_ram_bytes,
        acceleratorVendor: card.hardware.accelerator_vendor,
        acceleratorModel: card.hardware.accelerator_model,
      },
      environment: {
        osName: card.software.os_name,
        osVersion: card.software.os_version,
        pythonImplementation: card.software.python_implementation,
        pythonVersion: card.software.python_version,
        torchVersion: card.software.torch_version,
        cudaRuntimeVersion: card.software.cuda_runtime_version,
        cudaDriverVersion: card.software.cuda_driver_version,
        cudnnVersion: card.software.cudnn_version,
        mpsBackendInfo: card.software.mps_backend_info,
        hardwareFingerprint: card.execution_context.hardware_fingerprint,
      },
    },
    conditions: card.conditions.map((condition) => ({
      id: condition.condition_id,
      durationSeconds: condition.duration_seconds,
      batchSize: condition.batch_size,
      sampleCount: condition.sample_count,
      status: condition.status,
      unsupportedReason: condition.unsupported_reason,
      timing: condition.timing
        ? {
            sampleCount: condition.timing.sample_count,
            latencyMeanMs: condition.timing.mean_ns / 1_000_000,
            latencyP50Ms: condition.timing.p50_ns / 1_000_000,
            latencyP95Ms: condition.timing.p95_ns / 1_000_000,
            throughputItemsPerSecond: condition.timing.throughput_items_per_second,
            realTimeFactor: condition.timing.real_time_factor,
            speedFactor: condition.timing.speed_factor,
          }
        : null,
    })),
    architecture: {
      totalParameters: card.architecture.total_parameters,
      parameterBytes: card.architecture.parameter_bytes,
      flops: card.architecture.flops,
      macs: card.architecture.macs,
      flopsMacsStatus: card.architecture.flops_macs_status,
    },
    memory: {
      rssSampledPeakBytes: card.host_memory.rss_sampled_peak_bytes,
      rssSampledPeakIsSampled: card.host_memory.rss_sampled_peak_is_sampled,
      accelerator: normalizeAcceleratorMemory(card),
    },
    energy: normalizeEnergy(card),
    coverage: {
      testedConditionIds: card.coverage.tested_conditions,
      unsupportedConditionIds: card.coverage.unsupported_conditions,
      energyStatus: card.coverage.energy_status,
    },
    provenance: {
      modelCardPath: card.model.model_card_path,
      technicalCardPath: path,
      rawMeasurementPath: `${path.slice(0, path.lastIndexOf('/') + 1)}${card.raw_measurements.path}`,
      ...(card.profiler.torch_dae_repository_head
        ? { sourceRevision: card.profiler.torch_dae_repository_head }
        : {}),
      sourceContentIdentity: card.profiler.torch_dae_content_identity,
      sourcePackageVersion: card.profiler.torch_dae_package_version,
      sourceRepositoryDirty: card.profiler.torch_dae_repository_dirty,
      profilerImplementationVersion: card.profiler.profiler_implementation_version,
    },
    createdAt: card.created_at,
  }));

  models.sort((a, b) => a.id.localeCompare(b.id));
  technicalCards.sort((a, b) => a.id.localeCompare(b.id));

  return {
    metadata: {
      ...metadata,
      modelCount: models.length,
      technicalCardCount: technicalCards.length,
      schemaVersions: {
        modelCards: uniqueSorted(rawModels.map(({ card }) => card.schema_version)),
        technicalCards: uniqueSorted(
          rawTechnicalCards.map(({ card }) => card.technical_card_schema_version),
        ),
      },
    },
    models,
    technicalCards,
  };
}
