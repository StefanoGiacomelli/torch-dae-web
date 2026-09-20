export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross';

export interface SeriesStyle {
  shape: MarkerShape;
  shapeLabel: string;
  dashArray: string | undefined;
  dashLabel: string;
}

/**
 * Deterministic non-color series encoding (spec: "color + shape/marker distinction"), assigned by
 * the same sorted-model-ID order `createModelColorMap` (colors.ts) already uses, so a given model
 * always gets the same shape+dash pairing alongside its stable color. Never randomized per render.
 */
const SERIES_STYLE_PALETTE: SeriesStyle[] = [
  { shape: 'circle', shapeLabel: 'circle marker', dashArray: undefined, dashLabel: 'solid line' },
  { shape: 'square', shapeLabel: 'square marker', dashArray: '7 4', dashLabel: 'dashed line' },
  { shape: 'diamond', shapeLabel: 'diamond marker', dashArray: '2 3', dashLabel: 'dotted line' },
  { shape: 'triangle', shapeLabel: 'triangle marker', dashArray: '9 3 2 3', dashLabel: 'dash-dot line' },
  { shape: 'cross', shapeLabel: 'cross marker', dashArray: '12 4', dashLabel: 'long-dash line' },
];

export function createModelSeriesStyleMap(modelIds: string[]): Record<string, SeriesStyle> {
  return Object.fromEntries(
    [...new Set(modelIds)].sort().map((modelId, index) => [modelId, SERIES_STYLE_PALETTE[index % SERIES_STYLE_PALETTE.length]!]),
  );
}
