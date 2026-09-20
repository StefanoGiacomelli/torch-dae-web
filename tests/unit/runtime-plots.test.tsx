import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import catalogueJson from '../../src/generated/catalogue.json';
import { RuntimePlots } from '../../src/components/technical-cards/RuntimePlots';
import { evaluateComparability } from '../../src/data/technical-cards/comparability';
import { buildMetricBatchSeries } from '../../src/data/technical-cards/plotData';
import { createModelColorMap } from '../../src/data/technical-cards/colors';
import { createModelSeriesStyleMap } from '../../src/data/technical-cards/seriesStyle';
import { defaultExplorerSelection, resolveExplorerState } from '../../src/data/technical-cards/selectors';
import type { CatalogueIndex } from '../../src/data/types/catalogue';

const catalogue = catalogueJson as CatalogueIndex;
const modelIds = catalogue.models.map((model) => model.id).filter((id) => !id.includes('wavegram'));

describe('metric-aware runtime plots', () => {
  it('keeps missing timing in resolved evidence and renders a partial non-timing UI without zero substitution', () => {
    const copy = structuredClone(catalogue);
    const card = copy.technicalCards.find((candidate) => candidate.modelId === modelIds[1] && candidate.context.threadRegime === 'single_thread')!;
    card.conditions.find((condition) => condition.durationSeconds === card.context.canonicalDurationSeconds && condition.batchSize === 1)!.timing = null;
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), modelIds, regime: 'single_thread', batchSize: 1 });
    const comparison = evaluateComparability(state);
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: copy.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'comparison',
    }));
    expect(state.points).toHaveLength(2);
    expect(comparison.status).toBe('partial');
    expect(comparison.comparableMetricIds).toEqual(['rss-peak-memory', 'profile-energy']);
    expect(markup).toContain('Timing plots unavailable');
    expect(markup).not.toContain('Mean latency by batch');
    expect(markup).not.toContain('Throughput at selected batch');
  });

  it('uses only the shared metric-valid batch domain for comparison curves', () => {
    const copy = structuredClone(catalogue);
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), modelIds, regime: 'single_thread', batchSize: 1 });
    const second = state.points[1]!;
    second.card.conditions.find((condition) => condition.durationSeconds === second.card.context.canonicalDurationSeconds && condition.batchSize === 8)!.timing = null;
    const comparison = buildMetricBatchSeries(state.points, 'latency-mean', 'comparison');
    expect(comparison.every((series) => series.values.every((value) => value.batch !== 8))).toBe(true);
    const single = buildMetricBatchSeries([state.points[0]!], 'latency-mean', 'single');
    expect(single[0]!.values.map((value) => value.batch)).toContain(8);
  });
});

describe('Phase 04 runtime charts', () => {
  it('renders the default (latency, throughput, radar) overview for a direct comparison, with a visible (non-hover-only) legend, and offers the remaining metrics as opt-in toggles rather than cluttering the default view', () => {
    const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds, regime: 'single_thread' });
    const comparison = evaluateComparability(state);
    expect(comparison.status).toBe('direct');
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: catalogue.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'comparison',
    }));
    expect(markup).toContain('Mean latency by batch');
    expect(markup).toContain('Throughput at selected batch');
    expect(markup).toContain('Normalized Multi-Metric Comparison');
    expect(markup).toContain('chart-legend');
    expect(markup.match(/class="legend-marker"/g)?.length ?? 0).toBeGreaterThan(0);
    // Optional metrics are NOT part of the default render (they would push the chart workspace
    // past the flagship viewport without user intent); they are offered as toggle buttons instead.
    expect(markup).not.toContain('<h2>Real-time factor by batch</h2>');
    expect(markup).not.toContain('<h2>Speed factor by batch</h2>');
    expect(markup).not.toContain('<h2>RSS sampled peak</h2>');
    expect(markup).not.toContain('<h2>Profile energy</h2>');
    expect(markup).toContain('plot-toggle-row');
    for (const label of ['RTF', 'Speed', 'Memory', 'Energy']) {
      expect(markup).toContain(`${label}</button>`);
    }
  });

  it('gives the radar chart a Data & evidence table with full runtime context/provenance, matching the actual resolved points', () => {
    const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds, regime: 'single_thread' });
    const comparison = evaluateComparability(state);
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: catalogue.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'comparison',
    }));
    const radarSection = markup.slice(markup.indexOf('radar-card'));
    for (const point of state.points) {
      expect(radarSection).toContain(point.card.id);
      expect(radarSection).toContain(String(point.condition.batchSize));
      expect(radarSection).toContain(point.card.context.deviceBackend.toUpperCase());
      expect(radarSection).toContain(point.card.context.protocolId);
    }
    expect(radarSection).toContain('Device / backend');
    expect(radarSection).toContain('Regime');
    expect(radarSection).toContain('Protocol');
    expect(radarSection).toContain('Technical Card');
    expect(radarSection).toContain('Batch');
  });

  it('omits the radar in single-model mode', () => {
    const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds: [modelIds[0]!] });
    const comparison = evaluateComparability(state);
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: catalogue.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'single',
    }));
    expect(markup).not.toContain('Normalized Multi-Metric Comparison');
  });

  it('defaults the log-capable latency chart to a linear scale and exposes exactly one scale toggle', () => {
    const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds, regime: 'single_thread' });
    const comparison = evaluateComparability(state);
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: catalogue.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'comparison',
    }));
    expect(markup).toContain('aria-pressed="true">Linear<');
    const scaleToggleCount = markup.match(/class="scale-toggle"/g)?.length ?? 0;
    expect(scaleToggleCount).toBe(1);
  });

  it('gives every selected model a distinct non-color encoding (marker shape + line dash) in the latency chart, the radar, and their legends', () => {
    const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds, regime: 'single_thread' });
    const comparison = evaluateComparability(state);
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: catalogue.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'comparison',
    }));
    const styles = createModelSeriesStyleMap(modelIds);
    const shapes = new Set(modelIds.map((id) => styles[id]!.shape));
    expect(shapes.size).toBe(modelIds.length);
    // The circle-shaped series renders a bare <circle> marker; every other shape renders a
    // distinguishable non-circle SVG primitive (rect/polygon/line pair) — never relying on fill
    // color alone to tell two series apart.
    const nonCircleShapes = modelIds.map((id) => styles[id]!.shape).filter((shape) => shape !== 'circle');
    for (const shape of nonCircleShapes) {
      const tag = shape === 'square' || shape === 'diamond' ? 'rect' : shape === 'triangle' ? 'polygon' : 'line';
      expect(markup).toContain(`<${tag}`);
    }
    // Distinct dash arrays (or explicitly solid/undefined for the first) across series paths.
    const dashArrays = new Set(modelIds.map((id) => styles[id]!.dashArray ?? 'solid'));
    expect(dashArrays.size).toBe(modelIds.length);
  });

  it('represents both the marker shape AND the line dash pattern in line/radar legend samples (not just the marker)', () => {
    const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds, regime: 'single_thread' });
    const comparison = evaluateComparability(state);
    const markup = renderToStaticMarkup(createElement(RuntimePlots, {
      points: state.points,
      models: catalogue.models,
      colors: createModelColorMap(modelIds),
      comparableMetricIds: comparison.comparableMetricIds,
      view: 'comparison',
    }));
    const styles = createModelSeriesStyleMap(modelIds);
    // At least two dashed-line legend swatches must be present (latency chart + radar, each with
    // 2 selected models), and their stroke-dasharray values must match the real per-model dash
    // pattern used on the actual chart series — not merely a marker-only glyph.
    const dashedSwatchCount = markup.match(/class="legend-marker legend-marker-dashed"/g)?.length ?? 0;
    expect(dashedSwatchCount).toBeGreaterThanOrEqual(modelIds.length * 2);
    for (const id of modelIds) {
      const dash = styles[id]!.dashArray;
      if (dash) {
        expect(markup).toContain(`stroke-dasharray="${dash}"`);
      }
    }
    // A bar chart's legend (throughput) must NOT render the dashed-line variant — bars have no
    // line to sample, so only the plain marker glyph is used there.
    const throughputSection = markup.slice(
      markup.indexOf('Throughput at selected batch'),
      markup.indexOf('Normalized Multi-Metric Comparison'),
    );
    expect(throughputSection).not.toContain('legend-marker-dashed');
  });
});
