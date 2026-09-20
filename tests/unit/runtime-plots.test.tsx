import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import catalogueJson from '../../src/generated/catalogue.json';
import { RuntimePlots } from '../../src/components/technical-cards/RuntimePlots';
import { evaluateComparability } from '../../src/data/technical-cards/comparability';
import { buildMetricBatchSeries } from '../../src/data/technical-cards/plotData';
import { createModelColorMap } from '../../src/data/technical-cards/colors';
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
