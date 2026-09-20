export const MODEL_COLOR_PALETTE = ['#2d9cff', '#8b5cf6', '#f6b73c', '#14b8a6', '#ec4899'] as const;

export function createModelColorMap(modelIds: string[]): Record<string, string> {
  return Object.fromEntries(
    [...new Set(modelIds)].sort().map((modelId, index) => [modelId, MODEL_COLOR_PALETTE[index % MODEL_COLOR_PALETTE.length]!]),
  );
}
