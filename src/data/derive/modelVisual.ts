/**
 * First-party, deterministic visual-identity generator for a Model Card.
 *
 * No upstream imagery exists in the canonical catalogue, so each card renders a
 * procedurally generated waveform pattern instead. The pattern is seeded only by
 * the model's stable ID (and, for a secondary hue offset, its family), so the
 * same model always renders the same visual across renders, themes, and future
 * builds.
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

export interface ModelWaveformVisual {
  /** Normalized bar heights in [0.08, 1], suitable for an SVG/CSS waveform. */
  bars: number[];
  /** Stable hue rotation (degrees) derived from the model family. */
  hueRotateDeg: number;
}

export function getModelWaveformVisual(modelId: string, family: string, barCount = 28): ModelWaveformVisual {
  const random = mulberry32(hashString(modelId));
  const bars: number[] = [];
  let level = 0.5;
  for (let index = 0; index < barCount; index += 1) {
    level += (random() - 0.5) * 0.6;
    level = Math.min(1, Math.max(0.08, level));
    bars.push(level);
  }
  const hueRotateDeg = hashString(family) % 40;
  return { bars, hueRotateDeg };
}
