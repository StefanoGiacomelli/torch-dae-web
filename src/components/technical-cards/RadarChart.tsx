import type { CSSProperties } from 'react';
import type { CatalogueModel } from '../../data/types/catalogue';
import { metricById } from '../../data/technical-cards/metrics';
import { pointContext } from '../../data/technical-cards/plotData';
import type { RadarChartData } from '../../data/technical-cards/radar';
import type { SeriesStyle } from '../../data/technical-cards/seriesStyle';
import type { ResolvedRuntimePoint } from '../../data/technical-cards/types';
import { LegendMarkerIcon, SvgMarker } from './SeriesMarker';

interface Props {
  data: RadarChartData;
  points: ResolvedRuntimePoint[];
  models: CatalogueModel[];
  colors: Record<string, string>;
  styles: Record<string, SeriesStyle>;
}

const SIZE = 210;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 44;

function axisPoint(index: number, count: number, radius: number): [number, number] {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

function modelName(models: CatalogueModel[], id: string): string {
  return models.find((model) => model.id === id)?.displayName ?? id;
}

const RING_STEPS = [0.25, 0.5, 0.75, 1];

export function RadarChart({ data, points, models, colors, styles }: Props) {
  const { axes, series } = data;
  const contextByModel = new Map(points.map((point) => [point.modelId, pointContext(point)]));
  return (
    <article className="plot-card radar-card">
      <header>
        <div>
          <h2>Normalized Multi-Metric Comparison</h2>
          <p>Higher is better (normalized) · min-max within the current selection</p>
        </div>
        <details className="radar-info">
          <summary aria-label="How this chart is normalized">?</summary>
          <p>
            Each axis is independently min-max normalized to <code>[0, 1]</code> across only the
            currently selected models. Axes marked "(inv.)" measure a metric where lower raw
            values are better; those axes are inverted here so the outer edge always means
            "better" on this chart. Raw values are never replaced — see the metric summary cards
            and evidence links above for the canonical figures this chart derives from.
          </p>
        </details>
      </header>
      <div className="radar-body">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Normalized multi-metric comparison across ${axes.map((axis) => axis.shortLabel).join(', ')}`}>
          {RING_STEPS.map((step) => {
            const points = axes.map((_, index) => axisPoint(index, axes.length, RADIUS * step).join(',')).join(' ');
            return <polygon key={step} className="radar-ring" points={points} />;
          })}
          {axes.map((axis, index) => {
            const [x, y] = axisPoint(index, axes.length, RADIUS);
            return <line key={axis.metricId} className="radar-spoke" x1={CENTER} y1={CENTER} x2={x} y2={y} />;
          })}
          {axes.map((axis, index) => {
            const [x, y] = axisPoint(index, axes.length, RADIUS + 18);
            return (
              <text key={axis.metricId} className="radar-axis-label" x={x} y={y} textAnchor="middle">
                {axis.shortLabel}
              </text>
            );
          })}
          {series.map((entry) => {
            const style = styles[entry.modelId]!;
            const points = entry.points.map((point, index) => axisPoint(index, axes.length, RADIUS * point.normalized).join(',')).join(' ');
            return (
              <g key={entry.modelId}>
                <polygon
                  className="radar-series"
                  points={points}
                  stroke={colors[entry.modelId]}
                  fill={colors[entry.modelId]}
                  strokeDasharray={style.dashArray}
                />
                {entry.points.map((point, index) => {
                  const [x, y] = axisPoint(index, axes.length, RADIUS * point.normalized);
                  const metric = metricById.get(point.metricId)!;
                  return (
                    <g key={point.metricId}>
                      <SvgMarker shape={style.shape} cx={x} cy={y} size={3} fill={colors[entry.modelId]!} />
                      <title>{`${modelName(models, entry.modelId)} · ${metric.displayName}: ${metric.format(point.raw)} ${metric.unit} (normalized ${point.normalized.toFixed(2)})`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        <ul className="radar-legend">
          {series.map((entry) => (
            <li key={entry.modelId} style={{ '--model-color': colors[entry.modelId] } as CSSProperties}>
              <LegendMarkerIcon
                shape={styles[entry.modelId]!.shape}
                fill={colors[entry.modelId]!}
                dashArray={styles[entry.modelId]!.dashArray}
                showLine
              />
              {modelName(models, entry.modelId)}
            </li>
          ))}
        </ul>
      </div>
      <details className="chart-data">
        <summary>Data &amp; evidence</summary>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Batch</th>
              <th>Device / backend</th>
              <th>Regime</th>
              <th>Protocol</th>
              <th>Technical Card</th>
              {axes.map((axis) => <th key={axis.metricId}>{axis.shortLabel}</th>)}
            </tr>
          </thead>
          <tbody>
            {series.map((entry) => {
              const ctx = contextByModel.get(entry.modelId);
              return (
                <tr key={entry.modelId}>
                  <td>{modelName(models, entry.modelId)}</td>
                  <td>{ctx?.batch ?? '—'}</td>
                  <td>{ctx?.device ?? '—'}</td>
                  <td>{ctx?.regime ?? '—'}</td>
                  <td>{ctx?.protocol ?? '—'}</td>
                  <td>{ctx ? <code>{ctx.cardId}</code> : '—'}</td>
                  {entry.points.map((point) => {
                    const metric = metricById.get(point.metricId)!;
                    return <td key={point.metricId}>{metric.format(point.raw)} {metric.unit}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </article>
  );
}
