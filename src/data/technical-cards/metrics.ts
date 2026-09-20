import type { ResolvedRuntimePoint, RuntimeMetricId } from './types';

export type MetricDirection = 'lower' | 'higher' | 'descriptive';

export interface RuntimeMetricDefinition {
  id: RuntimeMetricId;
  displayName: string;
  shortName: string;
  unit: string;
  direction: MetricDirection;
  normalizationAllowed: boolean;
  scope: 'condition' | 'card';
  value(point: ResolvedRuntimePoint): number | null;
  format(value: number): string;
}

const finite = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const compact = (maximumFractionDigits: number) => (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);

export const runtimeMetricRegistry: readonly RuntimeMetricDefinition[] = [
  {
    id: 'latency-mean', displayName: 'Mean latency', shortName: 'Latency', unit: 'ms',
    direction: 'lower', normalizationAllowed: true, scope: 'condition',
    value: ({ condition }) => finite(condition.timing?.latencyMeanMs), format: compact(2),
  },
  {
    id: 'throughput', displayName: 'Throughput', shortName: 'Throughput', unit: 'infer/s',
    direction: 'higher', normalizationAllowed: true, scope: 'condition',
    value: ({ condition }) => finite(condition.timing?.throughputItemsPerSecond), format: compact(2),
  },
  {
    id: 'real-time-factor', displayName: 'Real-time factor', shortName: 'RTF', unit: 'RTF',
    direction: 'lower', normalizationAllowed: true, scope: 'condition',
    value: ({ condition }) => finite(condition.timing?.realTimeFactor), format: compact(4),
  },
  {
    id: 'speed-factor', displayName: 'Speed factor', shortName: 'Speed', unit: '× realtime',
    direction: 'higher', normalizationAllowed: true, scope: 'condition',
    value: ({ condition }) => finite(condition.timing?.speedFactor), format: compact(2),
  },
  {
    id: 'rss-peak-memory', displayName: 'RSS sampled peak', shortName: 'Memory', unit: 'MiB',
    direction: 'lower', normalizationAllowed: true, scope: 'card',
    value: ({ card }) => card.memory.rssSampledPeakIsSampled
      ? finite(card.memory.rssSampledPeakBytes / 1024 / 1024)
      : null,
    format: compact(1),
  },
  {
    id: 'profile-energy', displayName: 'Profile energy', shortName: 'Energy', unit: 'J/profile',
    direction: 'lower', normalizationAllowed: false, scope: 'card',
    value: ({ card }) => card.energy.availability === 'complete'
      && card.energy.coverageComplete
      && card.energy.unaccountedComponents.length === 0
      && card.coverage.energyStatus === card.energy.measurementKind
      ? finite(card.energy.totalEnergyKwh === null ? null : card.energy.totalEnergyKwh * 3_600_000)
      : null,
    format: compact(2),
  },
] as const;

export const metricById = new Map(runtimeMetricRegistry.map((metric) => [metric.id, metric]));
