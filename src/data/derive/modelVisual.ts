/**
 * First-party, deterministic visual-identity generator for a Model Card.
 *
 * No upstream imagery exists in the canonical catalogue, so each card renders a procedurally
 * generated spectrogram-like texture instead — decorative identity artwork, not a claim about any
 * real measured audio for the model. The pattern is seeded only by the model's stable ID (and, for
 * a secondary hue offset, its family), so the same model always renders the same visual across
 * renders, themes, and future builds.
 */

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ModelSpectrogramVisual {
  /** `rows` arrays of `cols` normalized intensities in `[0.05, 1]`, decorative only. */
  cells: number[][];
  /** Stable hue rotation (degrees) derived from the model family. */
  hueRotateDeg: number;
  cols: number;
  rows: number;
}

export function getModelSpectrogramVisual(
  modelId: string,
  family: string,
  cols = 26,
  rows = 12,
): ModelSpectrogramVisual {
  const random = mulberry32(hashString(modelId));
  // 2-3 elevated "formant bands" (row indices) give the texture a spectrogram-like banded
  // structure instead of pure noise, while staying fully deterministic from the same seed.
  const bandCount = 2 + Math.floor(random() * 2);
  const bands = Array.from({ length: bandCount }, () => Math.floor(random() * rows));

  const cells: number[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const bandBoost = bands.some((band) => Math.abs(band - row) <= 1) ? 0.35 : 0;
    let level = 0.35 + bandBoost;
    const rowCells: number[] = [];
    for (let col = 0; col < cols; col += 1) {
      level += (random() - 0.5) * 0.5;
      level = Math.min(1, Math.max(0.05, level));
      rowCells.push(level);
    }
    cells.push(rowCells);
  }

  const hueRotateDeg = hashString(family) % 40;
  return { cells, hueRotateDeg, cols, rows };
}
