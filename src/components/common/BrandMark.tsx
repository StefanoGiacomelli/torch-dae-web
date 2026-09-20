interface Props {
  size?: number;
}

/**
 * First-party inline SVG brand mark: a small deterministic waveform glyph (not an external logo,
 * not copyrighted imagery). Used consistently everywhere the previous placeholder glyph (`▥`)
 * appeared — the navbar and the Model Card kicker — so the mark reads as one coherent identity.
 * `currentColor` makes it theme-aware without a separate light/dark asset.
 */
export function BrandMark({ size = 22 }: Props) {
  const bars = [0.42, 0.72, 1, 0.58, 0.32];
  const barWidth = 2.6;
  const gap = 1.7;
  const totalWidth = bars.length * barWidth + (bars.length - 1) * gap;
  const height = 16;
  return (
    <svg
      className="brand-mark-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${totalWidth} ${height}`}
      role="img"
      aria-label="torch-dae"
      focusable="false"
    >
      {bars.map((level, index) => {
        const barHeight = Math.max(2, level * height);
        return (
          <rect
            key={index}
            x={index * (barWidth + gap)}
            y={(height - barHeight) / 2}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
