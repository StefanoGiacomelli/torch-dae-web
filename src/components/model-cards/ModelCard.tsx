import type { CatalogueMetadata, CatalogueModel, VerificationBackend } from '../../data/types/catalogue';
import type { ReferenceRuntimeContext } from '../../data/derive/referenceContext';
import { buildRepositoryFileUrl, buildRepositoryRawUrl, formatSourceIdentity } from '../../data/derive/provenance';
import { formatLifecycleStatus, formatSampleRate, formatTaskLabel } from '../../data/derive/format';
import { BrandMark } from '../common/BrandMark';
import { ModelVisual } from './ModelVisual';
import { PerformanceProfile } from './PerformanceProfile';

interface ModelCardProps {
  model: CatalogueModel;
  metadata: CatalogueMetadata;
  reference: ReferenceRuntimeContext | null;
  verificationBackends: VerificationBackend[];
  cardNumber: number;
  selected: boolean;
  offset: number;
  onSelect: (modelId: string) => void;
}

function backendStatusLabel(status: 'locally_verified' | 'upstream_declared'): string {
  return status === 'locally_verified' ? 'verified' : 'upstream-declared, locally unverified';
}

export function ModelCard({
  model,
  metadata,
  reference,
  verificationBackends,
  cardNumber,
  selected,
  offset,
  onSelect,
}: ModelCardProps) {
  const isRuntimeVerified = model.lifecycleStatus === 'runtime_verified';
  const cardId = `model-card-${model.id}`;
  const modelCardUrl = buildRepositoryFileUrl(metadata, model.provenance.modelCardPath);
  const verificationUrl = buildRepositoryFileUrl(metadata, model.provenance.verificationReportPath);
  const implementationSource =
    formatSourceIdentity(model.sources.implementation) ?? formatSourceIdentity(model.sources.officialRepository);

  return (
    <article
      id={cardId}
      className="model-card"
      data-model-id={model.id}
      data-selected={selected}
      data-offset={offset}
      aria-current={selected ? 'true' : undefined}
      aria-hidden={Math.abs(offset) > 2 ? true : undefined}
      style={{ '--offset': offset } as React.CSSProperties}
    >
      {!selected ? (
        // A <button> cannot validly contain block content (div/h2/ul), so the card surface is a
        // plain container and selection is handled by a real <button> stretched to cover it —
        // the whole card stays a single obvious click/tap/focus target, but the HTML is valid and
        // a screen reader still gets one clear "Select <model>" control identifying the model.
        <div className="model-card-surface model-card-surface-compact">
          <button
            type="button"
            className="model-card-select-overlay"
            onClick={() => onSelect(model.id)}
            aria-label={`Select ${model.displayName}`}
            tabIndex={Math.abs(offset) <= 1 ? 0 : -1}
          />
          <div className="model-card-kicker">
            <span className="model-card-brand" aria-hidden="true">
              <BrandMark size={16} /> torch-dae
            </span>
            <span className="model-card-index">#{String(cardNumber).padStart(3, '0')}</span>
          </div>

          <div className="model-card-compact">
            <ModelVisual modelId={model.id} family={model.family} />
            <p className="model-card-family">{model.family}</p>
            <h2 className="model-card-name">{model.displayName}</h2>
            <div className="pill-row">
              {model.tasks.map((task) => (
                <span className="pill" key={task}>
                  {formatTaskLabel(task)}
                </span>
              ))}
            </div>
            <ul className="model-card-facts">
              <li>{formatSampleRate(model.sampleRateHz)}</li>
              {model.defaultEmbedding && <li>{model.defaultEmbedding.dimension}-D embedding</li>}
              <li className={isRuntimeVerified ? 'is-positive' : ''}>
                <span aria-hidden="true">{isRuntimeVerified ? '✓' : '–'}</span>{' '}
                {isRuntimeVerified ? 'Runtime verified' : formatLifecycleStatus(model.lifecycleStatus)}
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="model-card-surface" role="group" aria-label={`${model.displayName}, selected`}>
          <div className="model-card-kicker">
            <span className="model-card-brand" aria-hidden="true">
              <BrandMark size={16} /> torch-dae
            </span>
            <span className="model-card-index">#{String(cardNumber).padStart(3, '0')}</span>
            <span className="model-card-selected-badge">★ Selected</span>
          </div>

          <div className="model-card-expanded">
            <h2 className="model-card-name">{model.displayName}</h2>
            <p className="model-card-canonical-id">
              <code>{model.id}</code>
            </p>
            <div className="pill-row">
              {model.tasks.map((task) => (
                <span className="pill" key={task}>
                  {formatTaskLabel(task)}
                </span>
              ))}
            </div>

            <div className="model-card-columns">
              <div className="model-card-details">
                <dl className="fact-grid">
                  <div>
                    <dt>Model family</dt>
                    <dd>{model.family}</dd>
                  </div>
                  <div>
                    <dt>Variant</dt>
                    <dd>{model.variant}</dd>
                  </div>
                  <div>
                    <dt>Checkpoint</dt>
                    <dd>{model.checkpoint.name}</dd>
                  </div>
                  {implementationSource && (
                    <div>
                      <dt>Implementation source</dt>
                      <dd>
                        {implementationSource.href ? (
                          <a href={implementationSource.href} target="_blank" rel="noreferrer">
                            {implementationSource.label} <span aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          implementationSource.label
                        )}
                      </dd>
                    </div>
                  )}
                  {model.upstreamMetrics.map((metric) => (
                    <div key={`${metric.name}-${metric.dataset}-${metric.split}`}>
                      <dt>Upstream reported {metric.name}</dt>
                      <dd>
                        {metric.value}
                        {metric.unit ? ` ${metric.unit}` : ''} · {metric.dataset} ({metric.split})
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Input</dt>
                    <dd>
                      {model.input.shape} · {model.input.channels} · {formatSampleRate(model.sampleRateHz)}
                    </dd>
                  </div>
                  <div>
                    <dt>Outputs</dt>
                    <dd>{model.outputs.map((output) => output.name).join(', ')}</dd>
                  </div>
                  {model.defaultEmbedding && (
                    <div>
                      <dt>Default embedding</dt>
                      <dd>
                        {model.defaultEmbedding.name} · {model.defaultEmbedding.dimension} dimensions
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="runtime-verification">
                  <p className="runtime-verification-title">Runtime verification</p>
                  <ul>
                    {verificationBackends.map((backend) => (
                      <li key={backend.backend} data-status={backend.status}>
                        <span aria-hidden="true">{backend.status === 'locally_verified' ? '✓' : '–'}</span>{' '}
                        <strong>{backend.backend.toUpperCase()}</strong> {backendStatusLabel(backend.status)}
                      </li>
                    ))}
                  </ul>
                </div>

                <details className="upstream-caveat-detail">
                  <summary>Upstream metric note</summary>
                  <p className="upstream-caveat">
                    Upstream metrics are officially reported and were not locally reproduced by this catalogue.
                  </p>
                </details>
              </div>

              <div className="model-card-side">
                {reference ? (
                  <PerformanceProfile reference={reference} />
                ) : (
                  <a className="explore-evidence" href="/technical-cards">
                    {model.technicalCardIds.length} canonical Technical Card
                    {model.technicalCardIds.length === 1 ? '' : 's'}
                    <br />
                    Explore runtime evidence <span aria-hidden="true">→</span>
                  </a>
                )}

                <details className="provenance-links-detail">
                  <summary>Provenance links</summary>
                  <div className="provenance-links">
                    {modelCardUrl && (
                      <a href={modelCardUrl} target="_blank" rel="noreferrer">
                        Model Card JSON <span aria-hidden="true">↗</span>
                      </a>
                    )}
                    {verificationUrl && (
                      <a href={verificationUrl} target="_blank" rel="noreferrer">
                        Verification evidence <span aria-hidden="true">↗</span>
                      </a>
                    )}
                    {reference &&
                      (() => {
                        const technicalCardUrl = buildRepositoryFileUrl(
                          metadata,
                          reference.technicalCard.provenance.technicalCardPath,
                        );
                        const rawMeasurementUrl = buildRepositoryRawUrl(
                          metadata,
                          reference.technicalCard.provenance.rawMeasurementPath,
                        );
                        return (
                          <>
                            {technicalCardUrl && (
                              <a href={technicalCardUrl} target="_blank" rel="noreferrer">
                                Technical Card JSON <span aria-hidden="true">↗</span>
                              </a>
                            )}
                            {rawMeasurementUrl && (
                              <a href={rawMeasurementUrl} target="_blank" rel="noreferrer">
                                Raw measurement (NPZ) <span aria-hidden="true">↗</span>
                              </a>
                            )}
                          </>
                        );
                      })()}
                  </div>
                </details>
              </div>
              <div className="model-card-columns-scroll-hint" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
