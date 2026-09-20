import { metricById } from './metrics';
import { canonicalSuccessfulConditions } from './selectors';
import type { ExplorerViewMode, ResolvedRuntimePoint, RuntimeMetricId } from './types';

export interface MetricPlotSeries {
  modelId: string;
  values: Array<{ batch: number; value: number }>;
}

export function buildMetricBatchSeries(
  points: ResolvedRuntimePoint[],
  metricId: RuntimeMetricId,
  view: ExplorerViewMode,
): MetricPlotSeries[] {
  const metric = metricById.get(metricId);
  if (!metric || metric.scope !== 'condition') return [];
  const series = points.map((point) => ({
    modelId: point.modelId,
    values: canonicalSuccessfulConditions(point.card).flatMap((condition) => {
      const value = metric.value({ ...point, condition });
      return value === null ? [] : [{ batch: condition.batchSize, value }];
    }),
  }));
  if (view === 'single') return series;
  const sharedBatches = series[0]?.values
    .map(({ batch }) => batch)
    .filter((batch) => series.every((candidate) => candidate.values.some((value) => value.batch === batch))) ?? [];
  return series.map((candidate) => ({
    ...candidate,
    values: candidate.values.filter(({ batch }) => sharedBatches.includes(batch)),
  }));
}
