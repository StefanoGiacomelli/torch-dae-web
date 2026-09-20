import { runtimeMetricRegistry } from './metrics';
import type { ResolvedRuntimePoint, RuntimeMetricId } from './types';

export const RADAR_MINIMUM_METRICS = 3;

export interface RadarAxis {
  metricId: RuntimeMetricId;
  label: string;
  shortLabel: string;
  inverted: boolean;
}

export interface RadarSeriesPoint {
  metricId: RuntimeMetricId;
  raw: number;
  normalized: number;
}

export interface RadarSeries {
  modelId: string;
  points: RadarSeriesPoint[];
}

export interface RadarChartData {
  axes: RadarAxis[];
  series: RadarSeries[];
}

/**
 * "Normalized Multi-Metric Comparison" data.
 *
 * Axis eligibility: a registered runtime metric qualifies only when the metric registry itself
 * marks it `normalizationAllowed` AND it is in the caller's `comparableMetricIds` (i.e. mutually
 * available for every selected point under the current comparability result). Profile energy is
 * excluded because `runtimeMetricRegistry` declares `normalizationAllowed: false` for it — the
 * radar never special-cases energy on its own; it defers entirely to the shared registry flag.
 *
 * Normalization: per-axis min-max scaling within the CURRENT comparison set only
 * (`normalized = (raw - min) / (max - min)`), never against a fixed reference population and
 * never persisted as canonical data. "Lower is better" axes are inverted for display only
 * (`1 - scaled`) so every axis reads "further out = better"; the underlying raw value and its
 * original directionality remain available via `RadarSeriesPoint.raw` and `RadarAxis.inverted`.
 * A constant-valued axis (max === min, including a single-model radar) cannot be scaled
 * meaningfully, so every series receives the neutral midpoint `0.5` on that axis rather than a
 * `0`, `1`, or `NaN` that would misleadingly imply a real difference.
 *
 * Defensive axis validation: even though a metric being in `comparableMetricIds` should already
 * guarantee every selected point has a non-null value for it (the comparability engine's own
 * contract), this function never trusts that blindly. Any candidate axis where `metric.value(point)`
 * is `null` or non-finite for ANY selected point is dropped from the radar entirely before
 * normalization runs — it is never coerced to `0`. Missing runtime evidence must never become a
 * fabricated data point; a dropped axis is the only correct outcome. `RADAR_MINIMUM_METRICS` is
 * enforced AFTER this validation, so a radar with too few genuinely valid axes is refused (`null`)
 * rather than padded out with synthetic zeros.
 *
 * Returns `null` when fewer than `RADAR_MINIMUM_METRICS` valid axes remain, or fewer than two
 * models are selected (a radar comparing one series to itself is not meaningful); callers should
 * fall back to a compact alternate comparison in that case.
 */
export function buildRadarChartData(
  points: ResolvedRuntimePoint[],
  comparableMetricIds: RuntimeMetricId[],
): RadarChartData | null {
  if (points.length < 2) return null;

  const candidateMetrics = runtimeMetricRegistry.filter(
    (metric) => metric.normalizationAllowed && comparableMetricIds.includes(metric.id),
  );

  function isFiniteNumber(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  const axisMetrics = candidateMetrics.filter((metric) =>
    points.every((point) => isFiniteNumber(metric.value(point))),
  );
  if (axisMetrics.length < RADAR_MINIMUM_METRICS) return null;

  const axes: RadarAxis[] = axisMetrics.map((metric) => ({
    metricId: metric.id,
    label: metric.direction === 'lower' ? `${metric.displayName} (inverted)` : metric.displayName,
    shortLabel: metric.direction === 'lower' ? `${metric.shortName} (inv.)` : metric.shortName,
    inverted: metric.direction === 'lower',
  }));

  const series: RadarSeries[] = points.map((point) => ({
    modelId: point.modelId,
    points: axisMetrics.map((metric) => {
      const raw = metric.value(point);
      if (!isFiniteNumber(raw)) throw new Error(`Unreachable: axis ${metric.id} was validated as finite for every point.`);
      return { metricId: metric.id, raw, normalized: 0 };
    }),
  }));

  axisMetrics.forEach((metric, axisIndex) => {
    const rawValues = series.map((entry) => entry.points[axisIndex]!.raw);
    const min = Math.min(...rawValues);
    const max = Math.max(...rawValues);
    for (const entry of series) {
      const axisPoint = entry.points[axisIndex]!;
      const scaled = max === min ? 0.5 : (axisPoint.raw - min) / (max - min);
      axisPoint.normalized = metric.direction === 'lower' ? 1 - scaled : scaled;
    }
  });

  return { axes, series };
}
