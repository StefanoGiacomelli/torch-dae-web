export function formatSampleRate(hz: number): string {
  return `${hz / 1000} kHz`;
}

export function formatLatencyMs(ms: number): string {
  return `${ms < 10 ? ms.toFixed(2) : ms.toFixed(1)} ms`;
}

export function formatThroughput(itemsPerSecond: number): string {
  return `${itemsPerSecond.toFixed(itemsPerSecond < 10 ? 2 : 1)} infer/s`;
}

export function formatBytesAsMebibytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MiB`;
}

/** kWh -> joules, formatted with a scale-appropriate unit. Never call with null. */
export function formatEnergyJoules(totalEnergyKwh: number): string {
  const joules = totalEnergyKwh * 3_600_000;
  if (joules >= 1000) return `${(joules / 1000).toFixed(2)} kJ`;
  return `${joules.toFixed(1)} J`;
}

export function formatTaskLabel(task: string): string {
  return task
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatLifecycleStatus(status: string): string {
  return status.replaceAll('_', ' ');
}
