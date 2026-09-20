import { describe, expect, it } from 'vitest';
import catalogueJson from '../../src/generated/catalogue.json';
import { evaluateComparability } from '../../src/data/technical-cards/comparability';
import { defaultExplorerSelection, resolveExplorerState } from '../../src/data/technical-cards/selectors';
import { RADAR_MINIMUM_METRICS, buildRadarChartData } from '../../src/data/technical-cards/radar';
import type { CatalogueIndex } from '../../src/data/types/catalogue';

const catalogue = catalogueJson as CatalogueIndex;
const directModelIds = catalogue.models.map((model) => model.id).filter((id) => !id.includes('wavegram'));

function directState() {
  const state = resolveExplorerState(catalogue, {
    ...defaultExplorerSelection(catalogue),
    modelIds: directModelIds,
    regime: 'single_thread',
  });
  const comparison = evaluateComparability(state);
  return { state, comparison };
}

describe('normalized multi-metric radar', () => {
  it('excludes profile energy even when it is otherwise comparable, deferring only to the registry normalization flag', () => {
    const { state, comparison } = directState();
    expect(comparison.status).toBe('direct');
    expect(comparison.comparableMetricIds).toContain('profile-energy');
    const radar = buildRadarChartData(state.points, comparison.comparableMetricIds);
    expect(radar).not.toBeNull();
    expect(radar!.axes.map((axis) => axis.metricId)).not.toContain('profile-energy');
    expect(radar!.axes.map((axis) => axis.metricId)).toEqual(
      expect.arrayContaining(['latency-mean', 'throughput', 'real-time-factor', 'speed-factor', 'rss-peak-memory']),
    );
    expect(radar!.axes).toHaveLength(5);
    expect(radar!.series).toHaveLength(2);
  });

  it('inverts "lower is better" axes so the lower raw value normalizes closer to 1', () => {
    const { state, comparison } = directState();
    const radar = buildRadarChartData(state.points, comparison.comparableMetricIds)!;
    const latencyAxisIndex = radar.axes.findIndex((axis) => axis.metricId === 'latency-mean');
    expect(radar.axes[latencyAxisIndex]!.inverted).toBe(true);
    const [first, second] = radar.series;
    const firstPoint = first!.points[latencyAxisIndex]!;
    const secondPoint = second!.points[latencyAxisIndex]!;
    const lowerRawSeries = firstPoint.raw < secondPoint.raw ? firstPoint : secondPoint;
    const higherRawSeries = firstPoint.raw < secondPoint.raw ? secondPoint : firstPoint;
    expect(lowerRawSeries.normalized).toBeGreaterThan(higherRawSeries.normalized);
    expect(lowerRawSeries.normalized).toBeCloseTo(1, 5);
    expect(higherRawSeries.normalized).toBeCloseTo(0, 5);
  });

  it('does not invert "higher is better" axes', () => {
    const { state, comparison } = directState();
    const radar = buildRadarChartData(state.points, comparison.comparableMetricIds)!;
    const throughputAxisIndex = radar.axes.findIndex((axis) => axis.metricId === 'throughput');
    expect(radar.axes[throughputAxisIndex]!.inverted).toBe(false);
    const [first, second] = radar.series;
    const firstPoint = first!.points[throughputAxisIndex]!;
    const secondPoint = second!.points[throughputAxisIndex]!;
    const higherRawSeries = firstPoint.raw > secondPoint.raw ? first! : second!;
    expect(higherRawSeries.points[throughputAxisIndex]!.normalized).toBeCloseTo(1, 5);
  });

  it('gives every series the neutral 0.5 on a constant-valued axis instead of 0, 1, or NaN', () => {
    const { state } = directState();
    const [onlyPoint] = state.points;
    const duplicated = [
      { ...onlyPoint!, modelId: 'duplicate-a' },
      { ...onlyPoint!, modelId: 'duplicate-b' },
    ];
    const allMetricIds = ['latency-mean', 'throughput', 'real-time-factor', 'speed-factor', 'rss-peak-memory'] as const;
    const radar = buildRadarChartData(duplicated, [...allMetricIds]);
    expect(radar).not.toBeNull();
    for (const series of radar!.series) {
      for (const point of series.points) {
        expect(point.normalized).toBe(0.5);
        expect(Number.isNaN(point.normalized)).toBe(false);
      }
    }
  });

  it('returns null with fewer than the minimum eligible metrics', () => {
    const { state } = directState();
    expect(RADAR_MINIMUM_METRICS).toBe(3);
    const radar = buildRadarChartData(state.points, ['latency-mean', 'throughput']);
    expect(radar).toBeNull();
  });

  it('returns null for a single selected model even with many comparable metrics', () => {
    const single = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds: [directModelIds[0]!] });
    const comparison = evaluateComparability(single);
    const radar = buildRadarChartData(single.points, comparison.comparableMetricIds);
    expect(radar).toBeNull();
  });

  it('never fabricates a zero: drops an axis with missing evidence for any point instead of coercing to 0', () => {
    const { state } = directState();
    const copy = structuredClone(state.points);
    const target = copy[1]!;
    const condition = target.card.conditions.find(
      (candidate) => candidate.id === target.condition.id,
    )!;
    condition.timing = null;
    target.condition = condition;
    const allMetricIds = ['latency-mean', 'throughput', 'real-time-factor', 'speed-factor', 'rss-peak-memory'] as const;
    const radar = buildRadarChartData(copy, [...allMetricIds]);
    // latency, throughput, real-time-factor, speed-factor are all condition-scoped and now null for
    // the mutated point; only rss-peak-memory (card-scoped, untouched) remains valid — below the
    // RADAR_MINIMUM_METRICS floor, so the whole radar is refused rather than padded with zeros.
    expect(radar).toBeNull();
  });

  it('drops exactly the affected axis (never substitutes 0) when enough other axes remain valid', () => {
    const { state } = directState();
    const copy = structuredClone(state.points);
    const target = copy[1]!;
    const condition = target.card.conditions.find(
      (candidate) => candidate.id === target.condition.id,
    )!;
    // Real canonical data never partially nulls one timing field while keeping others; this
    // defensive test simulates that hypothetical inconsistency (a metric's `.value()` accessor
    // narrows at runtime, not compile time) to prove the radar drops exactly the affected axis.
    condition.timing = { ...condition.timing!, speedFactor: null as unknown as number };
    target.condition = condition;
    const allMetricIds = ['latency-mean', 'throughput', 'real-time-factor', 'speed-factor', 'rss-peak-memory'] as const;
    const radar = buildRadarChartData(copy, [...allMetricIds]);
    expect(radar).not.toBeNull();
    expect(radar!.axes.map((axis) => axis.metricId)).not.toContain('speed-factor');
    expect(radar!.axes.map((axis) => axis.metricId)).toEqual(
      expect.arrayContaining(['latency-mean', 'throughput', 'real-time-factor', 'rss-peak-memory']),
    );
    for (const series of radar!.series) {
      expect(series.points.every((point) => point.raw !== 0 || point.metricId !== 'speed-factor')).toBe(true);
    }
  });
});
