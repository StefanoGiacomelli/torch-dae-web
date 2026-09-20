import { metricById } from './metrics';
import { canonicalSuccessfulConditions } from './selectors';
import type { ExplorerViewMode, ResolvedRuntimePoint, RuntimeMetricId } from './types';

export interface MetricPlotSeries {
  modelId: string;
  values: Array<{ batch: number; value: number }>;
}

export interface PlotPointContext {
  batch: number;
  device: string;
  regime: string;
  protocol: string;
  cardId: string;
}

/** The runtime/provenance context for one resolved point, shared by every chart's "Data &
 * evidence" disclosure (line, bar, and radar) so they all report the same fields from the same
 * source — never invented, always read directly off the actual `ResolvedRuntimePoint`. */
export function pointContext(point: ResolvedRuntimePoint): PlotPointContext {
  const { context } = point.card;
  return {
    batch: point.condition.batchSize,
    device: `${context.deviceBackend.toUpperCase()} · ${context.deviceLabel}`,
    regime: context.threadRegime ?? 'backend default',
    protocol: `${context.protocolId} v${context.protocolVersion}`,
    cardId: point.card.id,
  };
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
