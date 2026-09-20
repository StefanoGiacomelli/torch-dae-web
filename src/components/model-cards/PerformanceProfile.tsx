import type { ReferenceRuntimeContext } from '../../data/derive/referenceContext';
import {
  formatBytesAsMebibytes,
  formatEnergyJoules,
  formatLatencyMs,
  formatThroughput,
} from '../../data/derive/format';

interface PerformanceProfileProps {
  reference: ReferenceRuntimeContext;
}

/**
 * Illustrative ceilings used only to size the secondary bar-fill visual within
 * a single card. They are fixed constants, not a cross-model or cross-device
 * grading scale, and raw values are always shown alongside them.
 */
const ILLUSTRATIVE_CEILINGS = {
  latencyMs: 250,
  throughputItemsPerSecond: 150,
  memoryMiB: 1024,
  energyJoules: 2000,
};

function Bar({ fraction, direction }: { fraction: number; direction: 'lower-is-better' | 'higher-is-better' }) {
  const clamped = Math.min(1, Math.max(0.04, fraction));
  return (
    <div className="metric-bar" role="presentation" data-direction={direction}>
      <span className="metric-bar-fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export function PerformanceProfile({ reference }: PerformanceProfileProps) {
  const { technicalCard, condition } = reference;
  const timing = condition.timing;
  if (!timing) return null;
  const { energy } = technicalCard;
  const { context } = technicalCard;

  return (
    <section className="performance-profile" aria-label="Reference performance profile">
      <header>
        <h3>Performance Profile</h3>
        <details className="performance-context">
          <summary>
            Reference context <span aria-hidden="true">⌄</span>
          </summary>
          <dl className="performance-context-detail">
            <div>
              <dt>Device / backend</dt>
              <dd>{context.deviceBackend.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Execution regime</dt>
              <dd>{context.threadRegime ?? 'backend default'}</dd>
            </div>
            <div>
              <dt>Batch size</dt>
              <dd>{condition.batchSize}</dd>
            </div>
            <div>
              <dt>Protocol</dt>
              <dd>
                {context.protocolId} / {context.protocolVersion}
              </dd>
            </div>
          </dl>
        </details>
      </header>

      <dl className="metric-list">
        <div className="metric-row">
          <dt>
            Mean latency <span className="metric-direction">Lower is better</span>
          </dt>
          <dd>
            <span className="metric-value">{formatLatencyMs(timing.latencyMeanMs)}</span>
            <Bar fraction={1 - timing.latencyMeanMs / ILLUSTRATIVE_CEILINGS.latencyMs} direction="lower-is-better" />
          </dd>
        </div>

        <div className="metric-row">
          <dt>
            Throughput <span className="metric-direction">Higher is better</span>
          </dt>
          <dd>
            <span className="metric-value">{formatThroughput(timing.throughputItemsPerSecond)}</span>
            <Bar
              fraction={timing.throughputItemsPerSecond / ILLUSTRATIVE_CEILINGS.throughputItemsPerSecond}
              direction="higher-is-better"
            />
          </dd>
        </div>

        <div className="metric-row">
          <dt>
            RSS sampled peak <span className="metric-direction">Lower is better</span>
          </dt>
          <dd>
            <span className="metric-value">{formatBytesAsMebibytes(technicalCard.memory.rssSampledPeakBytes)}</span>
            <Bar
              fraction={1 - technicalCard.memory.rssSampledPeakBytes / (1024 * 1024) / ILLUSTRATIVE_CEILINGS.memoryMiB}
              direction="lower-is-better"
            />
          </dd>
        </div>

        <div className="metric-row">
          <dt>
            Profile energy <span className="metric-direction">Lower is better</span>
          </dt>
          <dd>
            {energy.availability === 'complete' && energy.totalEnergyKwh !== null ? (
              <>
                <span className="metric-value">{formatEnergyJoules(energy.totalEnergyKwh)}</span>
                <Bar
                  fraction={1 - (energy.totalEnergyKwh * 3_600_000) / ILLUSTRATIVE_CEILINGS.energyJoules}
                  direction="lower-is-better"
                />
              </>
            ) : (
              <span className="metric-value metric-value-muted">
                {energy.availability === 'partial'
                  ? 'Partial coverage'
                  : energy.availability === 'failed'
                    ? 'Measurement failed'
                    : 'Unavailable'}
              </span>
            )}
          </dd>
        </div>
      </dl>
      <details className="performance-scope-detail">
        <summary>Metric scope notes</summary>
        <p className="performance-scope-note">
          Mean latency and throughput are per-inference. RSS sampled peak is the host process's sampled
          peak resident memory. Profile energy totals the full profiling resource pass (including model
          construction and checkpoint loading) and is not scoped to individual inferences.
        </p>
      </details>
    </section>
  );
}
