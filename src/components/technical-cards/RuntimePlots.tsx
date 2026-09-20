import { useId, useState, type CSSProperties } from 'react';
import type { CatalogueModel } from '../../data/types/catalogue';
import { metricById } from '../../data/technical-cards/metrics';
import { buildMetricBatchSeries, pointContext } from '../../data/technical-cards/plotData';
import { buildRadarChartData } from '../../data/technical-cards/radar';
import { createModelSeriesStyleMap } from '../../data/technical-cards/seriesStyle';
import { linearAxisTicks, logAxisTicks } from '../../data/technical-cards/ticks';
import type { ExplorerViewMode, ResolvedRuntimePoint, RuntimeMetricId } from '../../data/technical-cards/types';
import { LegendMarkerIcon, SvgMarker } from './SeriesMarker';
import { RadarChart } from './RadarChart';

interface Props {
  points: ResolvedRuntimePoint[];
  models: CatalogueModel[];
  colors: Record<string, string>;
  comparableMetricIds: RuntimeMetricId[];
  view: ExplorerViewMode;
}

const WIDTH = 400;
const HEIGHT = 170;
const PAD = { left: 44, right: 14, top: 14, bottom: 28 };
const MIN_LOG_VALUE = 1e-6;

/** Optional metric families the user opts into (see the toggle row below); latency, throughput,
 * and the radar are the always-on default composition so the flagship viewport shows a complete,
 * meaningful overview without a chart-workspace scrollbar (spec §368's "chart workspace fits"). */
const OPTIONAL_METRIC_IDS: RuntimeMetricId[] = ['real-time-factor', 'speed-factor', 'rss-peak-memory', 'profile-energy'];

function modelName(models: CatalogueModel[], id: string): string {
  return models.find((model) => model.id === id)?.displayName ?? id;
}

function Legend({
  ids, models, colors, styles, showLine = false,
}: {
  ids: string[];
  models: CatalogueModel[];
  colors: Record<string, string>;
  styles: Record<string, { shape: import('../../data/technical-cards/seriesStyle').MarkerShape; dashArray: string | undefined; dashLabel: string }>;
  /** True for line/radar callers (the legend swatch also samples the series' dash pattern);
   * false for bar callers, which have no line to sample (marker + the existing #N label suffice). */
  showLine?: boolean;
}) {
  return (
    <ul className="chart-legend">
      {ids.map((id) => (
        <li key={id} style={{ '--model-color': colors[id] } as CSSProperties}>
          <LegendMarkerIcon shape={styles[id]!.shape} fill={colors[id]!} dashArray={styles[id]!.dashArray} showLine={showLine} />
          {modelName(models, id)}
        </li>
      ))}
    </ul>
  );
}

interface LineChartCardProps {
  metricId: RuntimeMetricId;
  heading: string;
  subtitle: string;
  points: ResolvedRuntimePoint[];
  models: CatalogueModel[];
  colors: Record<string, string>;
  styles: Record<string, { shape: import('../../data/technical-cards/seriesStyle').MarkerShape; dashArray: string | undefined; dashLabel: string; shapeLabel: string }>;
  view: ExplorerViewMode;
  allowLogScale?: boolean;
}

/** Line chart for a condition-scoped (per-batch) metric: latency, RTF, and speed factor all share
 * this shape. Throughput is rendered as a bar (see `BarChartCard`) because the mockup and the
 * metric-summary row both treat it as a "current value" comparison, not a batch-domain curve. */
function LineChartCard({ metricId, heading, subtitle, points, models, colors, styles, view, allowLogScale }: LineChartCardProps) {
  const metric = metricById.get(metricId)!;
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const scaleId = useId();
  const series = buildMetricBatchSeries(points, metricId, view);
  const allValues = series.flatMap((entry) => entry.values.map((value) => value.value));
  if (allValues.length === 0) return null;
  const canLog = allowLogScale && allValues.every((value) => value > 0);
  const useLog = canLog && scale === 'log';
  const allBatches = [...new Set(series.flatMap((entry) => entry.values.map((value) => value.batch)))].sort((a, b) => a - b);
  const maxValue = Math.max(...allValues, MIN_LOG_VALUE);
  const minPositive = Math.max(Math.min(...allValues.filter((value) => value > 0), maxValue), MIN_LOG_VALUE);
  const yTicks = useLog ? logAxisTicks(minPositive, maxValue) : linearAxisTicks(maxValue);
  const linearMax = yTicks[yTicks.length - 1] ?? maxValue;
  const logSpan = Math.log10(yTicks[yTicks.length - 1] ?? maxValue) - Math.log10(yTicks[0] ?? minPositive) || 1;
  const x = (batch: number) => PAD.left + (allBatches.indexOf(batch) / Math.max(allBatches.length - 1, 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => useLog
    ? HEIGHT - PAD.bottom - ((Math.log10(Math.max(value, MIN_LOG_VALUE)) - Math.log10(yTicks[0] ?? minPositive)) / logSpan) * (HEIGHT - PAD.top - PAD.bottom)
    : HEIGHT - PAD.bottom - (value / linearMax) * (HEIGHT - PAD.top - PAD.bottom);
  const formatTick = (value: number) => (value >= 100 ? Math.round(value).toLocaleString('en-US') : metric.format(value));

  return (
    <article className="plot-card">
      <header>
        <div>
          <h2>{heading}</h2>
          <p>{subtitle}</p>
        </div>
        {allowLogScale && (
          <div className="scale-toggle" role="group" aria-label={`${metric.shortName} chart scale`}>
            <button type="button" aria-pressed={!useLog} onClick={() => setScale('linear')}>Linear</button>
            <button type="button" aria-pressed={useLog} onClick={() => setScale('log')} disabled={!canLog}>Log</button>
          </div>
        )}
      </header>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${heading}, ${useLog ? 'logarithmic' : 'linear'} scale`}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line className="plot-gridline" x1={PAD.left} y1={y(tick)} x2={WIDTH - PAD.right} y2={y(tick)} />
            <text className="plot-tick" x={PAD.left - 5} y={y(tick) + 3} textAnchor="end">{formatTick(tick)}</text>
          </g>
        ))}
        <line className="plot-axis" x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} />
        <line className="plot-axis" x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={HEIGHT - PAD.bottom} />
        {allBatches.map((batch) => <text key={batch} className="plot-tick" x={x(batch)} y={HEIGHT - 10} textAnchor="middle">{batch}</text>)}
        <text className="plot-unit" x={2} y={PAD.top - 2}>{metric.unit}</text>
        {series.map((entry) => {
          const style = styles[entry.modelId]!;
          const path = entry.values.map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(item.batch)} ${y(item.value)}`).join(' ');
          return (
            <g key={entry.modelId} className="chart-series">
              <path d={path} fill="none" stroke={colors[entry.modelId]} strokeWidth="2.5" strokeDasharray={style.dashArray} />
              {entry.values.map((item) => (
                <g key={item.batch}>
                  <SvgMarker shape={style.shape} cx={x(item.batch)} cy={y(item.value)} fill={colors[entry.modelId]!} />
                  <title>{`${modelName(models, entry.modelId)} · batch ${item.batch}: ${metric.format(item.value)} ${metric.unit}`}</title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <Legend ids={series.map((entry) => entry.modelId)} models={models} colors={colors} styles={styles} showLine />
      <details className="chart-data">
        <summary>Data &amp; evidence</summary>
        <table>
          <thead>
            <tr><th>Model</th><th>Batch</th><th>{metric.shortName} ({metric.unit})</th><th>Device / backend</th><th>Regime</th><th>Protocol</th><th>Technical Card</th></tr>
          </thead>
          <tbody>
            {points.flatMap((point) => {
              const entry = series.find((candidate) => candidate.modelId === point.modelId);
              const ctx = pointContext(point);
              return (entry?.values ?? []).map((item) => (
                <tr key={`${point.modelId}-${item.batch}`}>
                  <td>{modelName(models, point.modelId)}</td>
                  <td>{item.batch}</td>
                  <td>{metric.format(item.value)}</td>
                  <td>{ctx.device}</td>
                  <td>{ctx.regime}</td>
                  <td>{ctx.protocol}</td>
                  <td><code>{ctx.cardId}</code></td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </details>
      <span id={scaleId} className="visually-hidden">{useLog ? 'Logarithmic' : 'Linear'} scale active for {metric.shortName}.</span>
    </article>
  );
}

interface BarChartCardProps {
  metricId: RuntimeMetricId;
  heading: string;
  subtitle: string;
  points: ResolvedRuntimePoint[];
  models: CatalogueModel[];
  colors: Record<string, string>;
  styles: Record<string, { shape: import('../../data/technical-cards/seriesStyle').MarkerShape; dashArray: string | undefined; dashLabel: string; shapeLabel: string }>;
  batchDependent: boolean;
}

/** Bar chart for a single current value per selected point: condition-scoped throughput at the
 * selected batch (`batchDependent`), or card-scoped metrics (RSS peak memory, profile energy) that
 * describe the whole profiling resource pass and never vary with the selection's batch size. */
function BarChartCard({ metricId, heading, subtitle, points, models, colors, styles, batchDependent }: BarChartCardProps) {
  const metric = metricById.get(metricId)!;
  const bars = points.flatMap((point) => {
    const value = metric.value(point);
    return value === null ? [] : [{ point, value }];
  });
  if (bars.length === 0) return null;
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
  const yTicks = linearAxisTicks(maxValue);
  const linearMax = yTicks[yTicks.length - 1] ?? maxValue;
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const slotWidth = plotWidth / Math.max(bars.length, 1);
  const barY = (value: number) => (value / linearMax) * (HEIGHT - PAD.top - PAD.bottom);
  const formatTick = (value: number) => (value >= 100 ? Math.round(value).toLocaleString('en-US') : metric.format(value));
  return (
    <article className="plot-card">
      <header><div><h2>{heading}</h2><p>{subtitle}</p></div></header>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={heading}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line className="plot-gridline" x1={PAD.left} y1={HEIGHT - PAD.bottom - barY(tick)} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom - barY(tick)} />
            <text className="plot-tick" x={PAD.left - 5} y={HEIGHT - PAD.bottom - barY(tick) + 3} textAnchor="end">{formatTick(tick)}</text>
          </g>
        ))}
        <line className="plot-axis" x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} />
        <text className="plot-unit" x={2} y={PAD.top - 2}>{metric.unit}</text>
        {bars.map(({ point, value }, index) => {
          const style = styles[point.modelId]!;
          const barWidth = Math.min(58, slotWidth * 0.5);
          const height = barY(value);
          const left = PAD.left + slotWidth * index + (slotWidth - barWidth) / 2;
          return (
            <g key={point.modelId} className="chart-series">
              <rect x={left} y={HEIGHT - PAD.bottom - height} width={barWidth} height={height} rx="5" fill={colors[point.modelId]} />
              <SvgMarker shape={style.shape} cx={left + barWidth / 2} cy={Math.max(20, HEIGHT - PAD.bottom - height - 14)} fill={colors[point.modelId]!} />
              <text className="plot-value" x={left + barWidth / 2} y={Math.max(13, HEIGHT - PAD.bottom - height - 20)} textAnchor="middle">{metric.format(value)}</text>
              <text className="plot-tick" x={left + barWidth / 2} y={HEIGHT - 10} textAnchor="middle">#{index + 1}</text>
              <title>{`${modelName(models, point.modelId)}: ${metric.format(value)} ${metric.unit}`}</title>
            </g>
          );
        })}
      </svg>
      <Legend ids={bars.map((bar) => bar.point.modelId)} models={models} colors={colors} styles={styles} />
      <details className="chart-data">
        <summary>Data &amp; evidence</summary>
        <table>
          <thead>
            <tr><th>Model</th>{batchDependent && <th>Batch</th>}<th>{metric.shortName} ({metric.unit})</th><th>Device / backend</th><th>Regime</th><th>Protocol</th><th>Technical Card</th></tr>
          </thead>
          <tbody>
            {bars.map(({ point, value }) => {
              const ctx = pointContext(point);
              return (
                <tr key={point.modelId}>
                  <td>{modelName(models, point.modelId)}</td>
                  {batchDependent && <td>{point.condition.batchSize}</td>}
                  <td>{metric.format(value)}</td>
                  <td>{ctx.device}</td>
                  <td>{ctx.regime}</td>
                  <td>{ctx.protocol}</td>
                  <td><code>{ctx.cardId}</code></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </article>
  );
}

export function RuntimePlots({ points, models, colors, comparableMetricIds, view }: Props) {
  const styles = createModelSeriesStyleMap(points.map((point) => point.modelId));
  const [optionalVisible, setOptionalVisible] = useState<Set<RuntimeMetricId>>(new Set());
  const toggleOptional = (id: RuntimeMetricId) => {
    setOptionalVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const showLatency = comparableMetricIds.includes('latency-mean');
  const showThroughput = comparableMetricIds.includes('throughput');
  const radar = view === 'comparison' ? buildRadarChartData(points, comparableMetricIds) : null;

  const latencySeries = showLatency ? buildMetricBatchSeries(points, 'latency-mean', view) : [];
  const hasLatencyData = latencySeries.some((entry) => entry.values.length > 0);
  const throughputMetric = metricById.get('throughput')!;
  const hasThroughputData = showThroughput && points.some((point) => throughputMetric.value(point) !== null);
  const anyTimingData = hasLatencyData || hasThroughputData;

  const availableOptional = OPTIONAL_METRIC_IDS.filter((id) => comparableMetricIds.includes(id));
  const primaryCount = (hasLatencyData ? 1 : 0) + (hasThroughputData ? 1 : 0) + (radar ? 1 : 0);

  return (
    <div className="runtime-plots-panel">
      {availableOptional.length > 0 && (
        <div className="plot-toggle-row" role="group" aria-label="Additional runtime plots">
          <span className="plot-toggle-label">More plots:</span>
          {availableOptional.map((id) => {
            const metric = metricById.get(id)!;
            const active = optionalVisible.has(id);
            return (
              <button key={id} type="button" className="plot-toggle" aria-pressed={active} onClick={() => toggleOptional(id)}>
                <span aria-hidden="true">{active ? '−' : '+'}</span> {metric.shortName}
              </button>
            );
          })}
        </div>
      )}
      <section className="runtime-plots" aria-label="Runtime plots" style={{ '--plot-columns': Math.max(primaryCount, 1) } as CSSProperties}>
        {hasLatencyData && (
          <LineChartCard
            metricId="latency-mean"
            heading="Mean latency by batch"
            subtitle="Canonical-duration successful conditions · lower is better"
            points={points}
            models={models}
            colors={colors}
            styles={styles}
            view={view}
            allowLogScale
          />
        )}
        {hasThroughputData && (
          <BarChartCard
            metricId="throughput"
            heading="Throughput at selected batch"
            subtitle="Raw infer/s · higher is better"
            points={points}
            models={models}
            colors={colors}
            styles={styles}
            batchDependent
          />
        )}
        {radar && <RadarChart data={radar} points={points} models={models} colors={colors} styles={styles} />}
        {!anyTimingData && (
          <article className="plot-card plots-unavailable">
            <header><div><h2>Timing plots unavailable</h2><p>The selected canonical evidence has no mutually available timing values. Card-scoped metrics remain visible above when comparable.</p></div></header>
          </article>
        )}
        {optionalVisible.has('real-time-factor') && comparableMetricIds.includes('real-time-factor') && (
          <LineChartCard
            metricId="real-time-factor"
            heading="Real-time factor by batch"
            subtitle="Canonical-duration successful conditions · lower is better"
            points={points}
            models={models}
            colors={colors}
            styles={styles}
            view={view}
          />
        )}
        {optionalVisible.has('speed-factor') && comparableMetricIds.includes('speed-factor') && (
          <LineChartCard
            metricId="speed-factor"
            heading="Speed factor by batch"
            subtitle="Canonical-duration successful conditions · higher is better"
            points={points}
            models={models}
            colors={colors}
            styles={styles}
            view={view}
          />
        )}
        {optionalVisible.has('rss-peak-memory') && comparableMetricIds.includes('rss-peak-memory') && (
          <BarChartCard
            metricId="rss-peak-memory"
            heading="RSS sampled peak"
            subtitle="Whole profiling process · not batch-dependent · lower is better"
            points={points}
            models={models}
            colors={colors}
            styles={styles}
            batchDependent={false}
          />
        )}
        {optionalVisible.has('profile-energy') && comparableMetricIds.includes('profile-energy') && (
          <BarChartCard
            metricId="profile-energy"
            heading="Profile energy"
            subtitle="Whole profiling resource pass, not per inference or per batch · lower is better"
            points={points}
            models={models}
            colors={colors}
            styles={styles}
            batchDependent={false}
          />
        )}
      </section>
    </div>
  );
}
