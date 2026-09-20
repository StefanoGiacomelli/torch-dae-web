import { runtimeMetricRegistry } from './metrics';
import { deviceKey, regimeKey } from './selectors';
import type {
  ComparabilityReason,
  ComparabilityResult,
  ResolvedExplorerState,
  ResolvedRuntimePoint,
  RuntimeMetricId,
} from './types';
import type { CatalogueTechnicalCard } from '../types/catalogue';

function allEqual<T>(values: T[]): boolean {
  return values.length > 0 && values.every((value) => value === values[0]);
}

function incompatibleReason(
  points: ResolvedRuntimePoint[],
  values: (point: ResolvedRuntimePoint) => string | number | boolean,
  code: ComparabilityReason['code'],
  message: string,
): ComparabilityReason | null {
  return allEqual(points.map(values)) ? null : { code, message };
}

function environmentSignature(card: CatalogueTechnicalCard): string {
  const environment = card.context.environment;
  return JSON.stringify([
    environment.hardwareFingerprint,
    environment.osName,
    environment.osVersion,
    environment.pythonImplementation,
    environment.pythonVersion,
    environment.torchVersion,
    environment.cudaRuntimeVersion,
    environment.cudaDriverVersion,
    environment.cudnnVersion,
    environment.mpsBackendInfo,
  ]);
}

function conditionSemantic(card: CatalogueTechnicalCard, id: string): string {
  const condition = card.conditions.find((candidate) => candidate.id === id);
  return condition
    ? JSON.stringify([condition.durationSeconds, condition.batchSize, condition.status, condition.unsupportedReason])
    : `missing:${id}`;
}

function cardWorkloadSignature(card: CatalogueTechnicalCard): string {
  const conditions = card.conditions
    .map((condition) => JSON.stringify([
      condition.durationSeconds,
      condition.batchSize,
      condition.status,
      condition.unsupportedReason,
    ]))
    .sort();
  const tested = card.coverage.testedConditionIds.map((id) => conditionSemantic(card, id)).sort();
  const unsupported = card.coverage.unsupportedConditionIds.map((id) => conditionSemantic(card, id)).sort();
  return JSON.stringify([conditions, tested, unsupported]);
}

function energyMethodSignature(card: CatalogueTechnicalCard): string {
  const energy = card.energy;
  return JSON.stringify([
    energy.measurementKind,
    energy.provider?.name ?? null,
    energy.provider?.version ?? null,
    energy.measurementScope,
    energy.intervalSeconds,
    energy.privilegeUsed,
    energy.coverageComplete,
    [...energy.unaccountedComponents].sort(),
    card.coverage.energyStatus,
  ]);
}

export function evaluateComparability(state: ResolvedExplorerState): ComparabilityResult {
  const { points, selection, resolutionIssues } = state;
  const fatalReasons: ComparabilityReason[] = [];
  if (resolutionIssues.includes('no-model-selection')) {
    fatalReasons.push({ code: 'no-model-selection', message: 'Select at least one model to resolve runtime evidence.' });
  }
  if (resolutionIssues.includes('no-shared-context')) {
    fatalReasons.push({ code: 'no-shared-context', message: 'The selected models have no shared canonical runtime context.' });
  }
  if (resolutionIssues.includes('ambiguous-card')) {
    fatalReasons.push({ code: 'ambiguous-context', message: 'More than one Technical Card matches the chosen context; no card was selected implicitly.' });
  }
  if (resolutionIssues.includes('missing-condition')) {
    fatalReasons.push({ code: 'missing-condition', message: 'A selected Technical Card has no successful canonical condition for this batch.' });
  }
  if (points.length !== selection.modelIds.length) {
    return { status: 'incompatible', comparableMetricIds: [], excludedMetricIds: runtimeMetricRegistry.map((metric) => metric.id), reasons: fatalReasons, resolvedContext: null };
  }

  const contextReasons = [
    incompatibleReason(points, ({ card }) => `${card.context.protocolId}@${card.context.protocolVersion}`, 'protocol-mismatch', 'Profiling protocol IDs or versions differ.'),
    incompatibleReason(points, ({ card }) => deviceKey(card), 'device-mismatch', 'Device/backend or hardware context differs.'),
    incompatibleReason(points, ({ card }) => regimeKey(card), 'execution-regime-mismatch', 'Execution thread regimes differ.'),
    incompatibleReason(points, ({ card }) => `${card.context.precision}:${card.context.autocast}`, 'precision-mismatch', 'Precision or autocast configuration differs.'),
    incompatibleReason(points, ({ card }) => card.context.runtimeClassification, 'runtime-classification-mismatch', 'Runtime classifications differ.'),
    incompatibleReason(points, ({ card }) => card.context.canonicalDurationSeconds, 'canonical-duration-mismatch', 'Canonical input durations differ.'),
    incompatibleReason(points, ({ card }) => `${card.context.channelCount}:${card.context.inputDtype}:${card.context.inputDistribution}:${card.context.inputSeed}`, 'input-context-mismatch', 'Synthetic input channels, dtype, distribution, or seed differ.'),
    incompatibleReason(points, ({ card }) => environmentSignature(card), 'environment-mismatch', 'Hardware or material software environment differs.'),
    incompatibleReason(points, ({ condition }) => condition.batchSize, 'batch-mismatch', 'Batch sizes differ.'),
  ].filter((reason): reason is ComparabilityReason => reason !== null);

  if (contextReasons.length > 0) {
    return { status: 'incompatible', comparableMetricIds: [], excludedMetricIds: runtimeMetricRegistry.map((metric) => metric.id), reasons: contextReasons, resolvedContext: null };
  }

  const comparableMetricIds: RuntimeMetricId[] = [];
  const excludedMetricIds: RuntimeMetricId[] = [];
  const metricReasons: ComparabilityReason[] = [];
  for (const metric of runtimeMetricRegistry) {
    const values = points.map(metric.value);
    if (metric.scope === 'card' && !allEqual(points.map(({ card }) => cardWorkloadSignature(card)))) {
      excludedMetricIds.push(metric.id);
      metricReasons.push({ code: 'card-workload-mismatch', metricId: metric.id, message: `${metric.displayName} is excluded because card-scoped workload or coverage differs.` });
      continue;
    }
    if (metric.id === 'rss-peak-memory' && points.some(({ card }) => card.memory.rssSampledPeakIsSampled !== true)) {
      excludedMetricIds.push(metric.id);
      metricReasons.push({ code: 'memory-semantics-mismatch', metricId: metric.id, message: 'RSS is excluded because every selected card must use sampled-peak RSS semantics.' });
      continue;
    }
    if (metric.id === 'profile-energy') {
      if (values.some((value) => value === null)) {
        excludedMetricIds.push(metric.id);
        metricReasons.push({ code: 'energy-coverage-mismatch', metricId: metric.id, message: 'Profile energy is excluded because complete aggregate energy is not available for every selected card.' });
        continue;
      }
      const signatures = points.map(({ card }) => energyMethodSignature(card));
      if (!allEqual(signatures)) {
        excludedMetricIds.push(metric.id);
        metricReasons.push({ code: 'energy-method-mismatch', metricId: metric.id, message: 'Profile energy is excluded because measurement method, provider, or scope differs.' });
        continue;
      }
    }
    if (values.some((value) => value === null)) {
      excludedMetricIds.push(metric.id);
      metricReasons.push({ code: 'metric-unavailable', metricId: metric.id, message: `${metric.displayName} is unavailable for at least one selected card.` });
    } else {
      comparableMetricIds.push(metric.id);
    }
  }

  const first = points[0];
  if (!first) {
    return { status: 'incompatible', comparableMetricIds: [], excludedMetricIds: runtimeMetricRegistry.map((metric) => metric.id), reasons: [{ code: 'no-shared-context', message: 'No runtime evidence was resolved.' }], resolvedContext: null };
  }
  const resolvedContext = {
    deviceKey: deviceKey(first.card),
    backend: first.card.context.deviceBackend,
    deviceLabel: first.card.context.deviceLabel,
    regime: regimeKey(first.card),
    protocolId: first.card.context.protocolId,
    protocolVersion: first.card.context.protocolVersion,
    batchSize: first.condition.batchSize,
    canonicalDurationSeconds: first.card.context.canonicalDurationSeconds,
    precision: first.card.context.precision,
  };

  return {
    status: excludedMetricIds.length === 0 ? 'direct' : 'partial',
    comparableMetricIds,
    excludedMetricIds,
    reasons: metricReasons,
    resolvedContext,
  };
}
