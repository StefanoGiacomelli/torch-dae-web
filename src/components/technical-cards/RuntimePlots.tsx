import type { CatalogueModel } from '../../data/types/catalogue';
import { metricById } from '../../data/technical-cards/metrics';
import { buildMetricBatchSeries } from '../../data/technical-cards/plotData';
import type { ExplorerViewMode, ResolvedRuntimePoint, RuntimeMetricId } from '../../data/technical-cards/types';

interface Props {
  points: ResolvedRuntimePoint[];
  models: CatalogueModel[];
  colors: Record<string, string>;
  comparableMetricIds: RuntimeMetricId[];
  view: ExplorerViewMode;
}

const WIDTH = 560;
const HEIGHT = 170;
const PAD = { left: 42, right: 16, top: 16, bottom: 30 };

function modelName(models: CatalogueModel[], id: string): string {
  return models.find((model) => model.id === id)?.displayName ?? id;
}

export function RuntimePlots({ points, models, colors, comparableMetricIds, view }: Props) {
  const showLatency = comparableMetricIds.includes('latency-mean');
  const showThroughput = comparableMetricIds.includes('throughput');
  const latencySeries = showLatency ? buildMetricBatchSeries(points, 'latency-mean', view) : [];
  const allLatency = latencySeries.flatMap((series) => series.values.map((value) => value.value));
  const hasLatencyData = showLatency && allLatency.length > 0;
  const allBatches = [...new Set(latencySeries.flatMap((series) => series.values.map((value) => value.batch)))].sort((a, b) => a - b);
  const maxLatency = Math.max(...allLatency, 1);
  const x = (batch: number) => PAD.left + (allBatches.indexOf(batch) / Math.max(allBatches.length - 1, 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => HEIGHT - PAD.bottom - (value / maxLatency) * (HEIGHT - PAD.top - PAD.bottom);

  const throughput = metricById.get('throughput')!;
  const latency = metricById.get('latency-mean')!;
  const bars = showThroughput ? points.flatMap((point) => {
    const value = throughput.value(point);
    return value === null ? [] : [{ point, value }];
  }) : [];
  const hasThroughputData = showThroughput && bars.length > 0;
  const maxThroughput = Math.max(...bars.map((bar) => bar.value), 1);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const slotWidth = plotWidth / Math.max(bars.length, 1);

  return (
    <section className="runtime-plots" aria-label="Basic runtime plots">
      {hasLatencyData && <article className="plot-card">
        <header><div><h2>Mean latency by batch</h2><p>Canonical-duration successful conditions · lower is better</p></div></header>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Mean latency by canonical batch size">
          <line className="plot-axis" x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} />
          <line className="plot-axis" x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={HEIGHT - PAD.bottom} />
          {allBatches.map((batch) => <text key={batch} x={x(batch)} y={HEIGHT - 10} textAnchor="middle">{batch}</text>)}
          <text x={8} y={PAD.top + 5}>ms</text>
          {latencySeries.map((series) => {
            const path = series.values.map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(item.batch)} ${y(item.value)}`).join(' ');
            return <g key={series.modelId}>
              <path d={path} fill="none" stroke={colors[series.modelId]} strokeWidth="3" />
              {series.values.map((item) => <circle key={item.batch} cx={x(item.batch)} cy={y(item.value)} r="3.5" fill={colors[series.modelId]}>
                <title>{`${modelName(models, series.modelId)} · batch ${item.batch}: ${latency.format(item.value)} ms`}</title>
              </circle>)}
            </g>;
          })}
        </svg>
      </article>}
      {hasThroughputData && <article className="plot-card">
        <header><div><h2>Throughput at selected batch</h2><p>Raw infer/s · higher is better</p></div></header>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Throughput comparison at selected batch size">
          <line className="plot-axis" x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} />
          {bars.map(({ point, value }, index) => {
            const barWidth = Math.min(72, slotWidth * 0.55);
            const height = (value / maxThroughput) * (HEIGHT - PAD.top - PAD.bottom);
            const left = PAD.left + slotWidth * index + (slotWidth - barWidth) / 2;
            return <g key={point.modelId}>
              <rect x={left} y={HEIGHT - PAD.bottom - height} width={barWidth} height={height} rx="5" fill={colors[point.modelId]} />
              <text className="plot-value" x={left + barWidth / 2} y={Math.max(13, HEIGHT - PAD.bottom - height - 6)} textAnchor="middle">{throughput.format(value)}</text>
              <text x={left + barWidth / 2} y={HEIGHT - 10} textAnchor="middle">{index + 1}</text>
              <title>{`${modelName(models, point.modelId)}: ${throughput.format(value)} ${throughput.unit}`}</title>
            </g>;
          })}
        </svg>
      </article>}
      {!hasLatencyData && !hasThroughputData && <article className="plot-card plots-unavailable">
        <header><div><h2>Timing plots unavailable</h2><p>The selected canonical evidence has no mutually available timing values. Card-scoped metrics remain visible above when comparable.</p></div></header>
      </article>}
    </section>
  );
}
