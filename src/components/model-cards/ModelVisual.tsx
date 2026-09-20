import { getModelSpectrogramVisual } from '../../data/derive/modelVisual';

interface ModelVisualProps {
  modelId: string;
  family: string;
}

/** First-party, deterministic, theme-aware spectrogram-like identity artwork for a Model Card.
 * Purely decorative generated texture — never presented as real measured model output. */
export function ModelVisual({ modelId, family }: ModelVisualProps) {
  const { cells, hueRotateDeg, cols, rows } = getModelSpectrogramVisual(modelId, family);
  const width = 320;
  const height = 160;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  return (
    <svg
      className="model-visual"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Decorative generated identity artwork for the ${family} model ${modelId}; not a measured spectrogram`}
      style={{ filter: `hue-rotate(${hueRotateDeg}deg)` }}
    >
      {cells.map((rowCells, rowIndex) =>
        rowCells.map((level, colIndex) => (
          <rect
            key={`${rowIndex}-${colIndex}`}
            className="model-visual-cell"
            x={colIndex * cellWidth}
            y={rowIndex * cellHeight}
            width={cellWidth + 0.5}
            height={cellHeight + 0.5}
            fillOpacity={level}
          />
        )),
      )}
    </svg>
  );
}
