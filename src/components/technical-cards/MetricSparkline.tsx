interface SparklineValue {
  modelId: string;
  value: number;
  color: string;
}

interface Props {
  values: SparklineValue[];
}

const WIDTH = 46;
const HEIGHT = 20;
const GAP = 2;

/** A compact per-model micro bar chart shown inside a metric summary card header. Purely
 * decorative relative to the raw values printed below it in the same card — never the sole
 * carrier of a value, per the "no hover-only critical information" accessibility requirement, so
 * it is removed from the accessibility tree entirely rather than duplicating those values. */
export function MetricSparkline({ values }: Props) {
  if (values.length < 2) return null;
  const max = Math.max(...values.map((entry) => entry.value), 0);
  const barWidth = (WIDTH - GAP * (values.length - 1)) / values.length;
  return (
    <svg
      className="metric-sparkline"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      aria-hidden="true"
      focusable="false"
    >
      {values.map((entry, index) => {
        const height = max > 0 ? Math.max(1.5, (entry.value / max) * HEIGHT) : 1.5;
        return (
          <rect
            key={entry.modelId}
            x={index * (barWidth + GAP)}
            y={HEIGHT - height}
            width={barWidth}
            height={height}
            rx="1"
            fill={entry.color}
          />
        );
      })}
    </svg>
  );
}
