import { getModelWaveformVisual } from '../../data/derive/modelVisual';

interface ModelVisualProps {
  modelId: string;
  family: string;
}

/** First-party, deterministic waveform visual identity for a Model Card. */
export function ModelVisual({ modelId, family }: ModelVisualProps) {
  const { bars, hueRotateDeg } = getModelWaveformVisual(modelId, family);
  const width = 320;
  const height = 160;
  const gap = 3;
  const barWidth = width / bars.length - gap;

  return (
    <svg
      className="model-visual"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Waveform visual identity for ${family} model ${modelId}`}
      style={{ filter: `hue-rotate(${hueRotateDeg}deg)` }}
    >
      {bars.map((level, index) => {
        const barHeight = Math.max(4, level * (height - 16));
        const x = index * (barWidth + gap);
        const y = (height - barHeight) / 2;
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            className="model-visual-bar"
          />
        );
      })}
    </svg>
  );
}
