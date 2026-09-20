import type { MarkerShape } from '../../data/technical-cards/seriesStyle';

interface SvgMarkerProps {
  shape: MarkerShape;
  cx: number;
  cy: number;
  size?: number;
  fill: string;
}

/** An SVG marker glyph, shape-coded (not just color-coded) so series identity does not depend on
 * color alone. Used at chart data points, radar vertices, and inline in legends. */
export function SvgMarker({ shape, cx, cy, size = 4, fill }: SvgMarkerProps) {
  switch (shape) {
    case 'circle':
      return <circle cx={cx} cy={cy} r={size} fill={fill} />;
    case 'square':
      return <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} fill={fill} />;
    case 'diamond':
      return (
        <rect
          x={cx - size}
          y={cy - size}
          width={size * 2}
          height={size * 2}
          fill={fill}
          transform={`rotate(45 ${cx} ${cy})`}
        />
      );
    case 'triangle': {
      const h = size * 1.2;
      return <polygon points={`${cx},${cy - h} ${cx - h},${cy + h * 0.8} ${cx + h},${cy + h * 0.8}`} fill={fill} />;
    }
    case 'cross':
      return (
        <g stroke={fill} strokeWidth={size * 0.7} strokeLinecap="round">
          <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} />
          <line x1={cx - size} y1={cy + size} x2={cx + size} y2={cy - size} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * A small legend-sized glyph rendered as an inline SVG icon, used in every chart legend (line,
 * bar, radar) so series identity is never color-only. When `dashArray` is given (line/radar
 * series, which are drawn as a dashed/dotted/solid stroke) it renders a short sample line in that
 * exact dash pattern PLUS the marker centered on it, so the legend represents both halves of the
 * series' non-color encoding — not just the marker shape. Bar series have no line to sample, so
 * `dashArray` is omitted there and only the marker renders (paired with the existing `#N` textual
 * mapping already used for bars).
 */
export function LegendMarkerIcon(
  { shape, fill, dashArray, showLine = false }: { shape: MarkerShape; fill: string; dashArray?: string | undefined; showLine?: boolean },
) {
  if (!showLine) {
    return (
      <svg className="legend-marker" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
        <SvgMarker shape={shape} cx={8} cy={8} size={5} fill={fill} />
      </svg>
    );
  }
  // `dashArray` itself may be `undefined` here (the solid-line model in the palette) — that is a
  // real, meaningful dash pattern (solid), not "no line": the <line> below renders correctly
  // either way, since an absent `stroke-dasharray` attribute simply draws a solid stroke.
  return (
    <svg className="legend-marker legend-marker-dashed" viewBox="0 0 28 16" width="22" height="12" aria-hidden="true" focusable="false">
      <line x1={1} y1={8} x2={27} y2={8} stroke={fill} strokeWidth={2} strokeDasharray={dashArray} />
      <SvgMarker shape={shape} cx={14} cy={8} size={4} fill={fill} />
    </svg>
  );
}
