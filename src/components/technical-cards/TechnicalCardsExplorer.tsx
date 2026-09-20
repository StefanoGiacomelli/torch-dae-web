import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { buildRepositoryFileUrl, buildRepositoryRawUrl } from '../../data/derive/provenance';
import { evaluateComparability } from '../../data/technical-cards/comparability';
import { createModelColorMap } from '../../data/technical-cards/colors';
import { runtimeMetricRegistry } from '../../data/technical-cards/metrics';
import { defaultExplorerSelection, resolveExplorerState } from '../../data/technical-cards/selectors';
import { MAX_SELECTED_MODELS, type ExplorerSelection } from '../../data/technical-cards/types';
import { parseExplorerQuery, serializeExplorerQuery } from '../../data/technical-cards/urlState';
import type { CatalogueIndex } from '../../data/types/catalogue';
import { MetricSparkline } from './MetricSparkline';
import { RuntimePlots } from './RuntimePlots';

interface Props { catalogue: CatalogueIndex }

function updateSelection(
  catalogue: CatalogueIndex,
  current: ExplorerSelection,
  patch: Partial<ExplorerSelection>,
) {
  return resolveExplorerState(catalogue, { ...current, ...patch });
}

export function TechnicalCardsExplorer({ catalogue }: Props) {
  const initial = useMemo(() => resolveExplorerState(catalogue, defaultExplorerSelection(catalogue)), [catalogue]);
  const [resolved, setResolved] = useState(initial);
  const [copied, setCopied] = useState(false);
  const restored = useRef(false);
  const colors = useMemo(() => createModelColorMap(catalogue.models.map((model) => model.id)), [catalogue.models]);
  const comparison = useMemo(() => evaluateComparability(resolved), [resolved]);

  useEffect(() => {
    const restore = () => {
      const requested = parseExplorerQuery(window.location.search, defaultExplorerSelection(catalogue));
      setResolved(resolveExplorerState(catalogue, requested));
      restored.current = true;
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [catalogue]);

  useEffect(() => {
    if (!restored.current) return;
    const query = serializeExplorerQuery(resolved.selection);
    if (`${window.location.pathname}${query}` !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${query}`);
    }
  }, [resolved.selection]);

  const apply = (patch: Partial<ExplorerSelection>) => {
    setResolved((current) => updateSelection(catalogue, current.selection, patch));
  };
  const toggleModel = (modelId: string) => {
    const exists = resolved.selection.modelIds.includes(modelId);
    const modelIds = exists
      ? resolved.selection.modelIds.filter((id) => id !== modelId)
      : [...resolved.selection.modelIds, modelId];
    if (!exists && modelIds.length > MAX_SELECTED_MODELS) return;
    apply({ modelIds });
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const selectedModels = resolved.selection.modelIds.map((id) => catalogue.models.find((model) => model.id === id)).filter(Boolean);
  const energyDetails = resolved.points.map(({ modelId, card }) => {
    const model = catalogue.models.find((candidate) => candidate.id === modelId);
    const provider = card.energy.provider ? `${card.energy.provider.name} ${card.energy.provider.version}` : 'no provider';
    const privilege = card.energy.privilegeUsed ? 'privileged counters' : 'no privilege';
    const gaps = card.energy.unaccountedComponents.length ? `unaccounted: ${card.energy.unaccountedComponents.join(', ')}` : 'full component coverage';
    return {
      modelId,
      modelName: model?.displayName ?? modelId,
      availability: card.energy.availability,
      summary: `${card.energy.measurementKind.replaceAll('_', ' ')} · ${card.energy.availability} · ${provider} · ${privilege} · ${gaps}`,
    };
  });
  // Worst-case state across the selection, used only to pick which non-comparable badge to show —
  // never to fabricate a numeric value. `complete` never appears here because a card-scoped metric
  // with every card `complete` (plus matching method/coverage) would already be comparable above.
  const energyStateBadge = energyDetails.some((detail) => detail.availability === 'failed')
    ? 'failed'
    : energyDetails.some((detail) => detail.availability === 'partial')
      ? 'partial'
      : energyDetails.length > 0
        ? 'unavailable'
        : 'unavailable';
  const energyStateLabel: Record<typeof energyStateBadge, string> = {
    failed: 'Measurement failed',
    partial: 'Partial coverage',
    unavailable: 'Unavailable',
  };
  const statusTitle = comparison.status === 'direct'
    ? resolved.selection.modelIds.length === 1 ? 'Canonical runtime context resolved.' : 'Selected cards are directly comparable under the chosen context.'
    : comparison.status === 'partial'
      ? resolved.selection.modelIds.length === 1 ? 'Some metrics are unavailable in this context.' : 'Some metrics cannot be compared under the selected context.'
      : 'Selected cards are not directly comparable.';

  return (
    <div className="technical-explorer" data-comparability={comparison.status}>
      <section className="model-selector panel" aria-labelledby="model-selector-heading">
        <div className="model-selector-main">
          <div className="section-heading-row">
            <h2 id="model-selector-heading">Models <span>({resolved.selection.modelIds.length} selected)</span></h2>
            <button className="text-button" type="button" onClick={() => apply({ modelIds: [] })} disabled={resolved.selection.modelIds.length === 0}>Clear all</button>
          </div>
          <div className="selected-model-chips">
            {selectedModels.map((model) => model && <span className="model-chip" key={model.id} style={{ '--model-color': colors[model.id] } as CSSProperties}>
              <span className="model-color" aria-hidden="true" />{model.displayName}
              <button type="button" onClick={() => toggleModel(model.id)} aria-label={`Remove ${model.displayName}`}>×</button>
            </span>)}
            {selectedModels.length === 0 && <span className="empty-selection">No models selected</span>}
          </div>
        </div>
        <details className="add-model">
          <summary>＋ Add model</summary>
          <div className="model-options">
            {catalogue.models.map((model) => <label key={model.id}>
              <input type="checkbox" checked={resolved.selection.modelIds.includes(model.id)} onChange={() => toggleModel(model.id)} />
              <span className="model-color" style={{ '--model-color': colors[model.id] } as CSSProperties} aria-hidden="true" />
              {model.displayName}
            </label>)}
          </div>
        </details>
      </section>

      <section className="context-selectors panel" aria-label="Runtime context selectors">
        <label>Device / Backend
          <select aria-label="Device / Backend" value={resolved.selection.deviceKey ?? ''} disabled={!resolved.options.devices.length} onChange={(event) => apply({ deviceKey: event.target.value })}>
            {resolved.options.devices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Execution Regime
          <select aria-label="Execution Regime" value={resolved.selection.regime ?? ''} disabled={!resolved.options.regimes.length} onChange={(event) => apply({ regime: event.target.value })}>
            {resolved.options.regimes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Protocol Version
          <select aria-label="Protocol Version" value={resolved.selection.protocolKey ?? ''} disabled={!resolved.options.protocols.length} onChange={(event) => apply({ protocolKey: event.target.value })}>
            {resolved.options.protocols.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>Batch Size
          <select aria-label="Batch Size" value={resolved.selection.batchSize ?? ''} disabled={!resolved.options.batches.length} onChange={(event) => apply({ batchSize: Number(event.target.value) })}>
            {resolved.options.batches.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="view-mode" aria-label="View Mode">
          <span>View Mode</span>
          <strong>{resolved.selection.view === 'single' ? 'Single model' : 'Comparison'}</strong>
        </div>
      </section>

      <section className="comparability-banner" role="status" aria-live="polite" data-status={comparison.status}>
        <span className="status-icon" aria-hidden="true">{comparison.status === 'direct' ? '✓' : comparison.status === 'partial' ? '!' : '×'}</span>
        <div><strong>{statusTitle}</strong>
          <p>{comparison.reasons.length ? comparison.reasons.map((reason) => reason.message).join(' ') : comparison.resolvedContext ? `${comparison.resolvedContext.backend.toUpperCase()} · ${comparison.resolvedContext.regime.replaceAll('_', ' ')} · batch ${comparison.resolvedContext.batchSize} · ${comparison.resolvedContext.protocolId} v${comparison.resolvedContext.protocolVersion}` : 'Choose models and a shared context.'}</p>
        </div>
        <button type="button" className="copy-link" onClick={copyLink} disabled={resolved.selection.modelIds.length === 0}>{copied ? 'Copied' : 'Copy link'}</button>
      </section>

      <section className="metric-summaries" aria-label="Runtime metric summaries">
        {runtimeMetricRegistry.map((metric) => {
          const comparable = comparison.comparableMetricIds.includes(metric.id);
          const sparklineValues = comparable
            ? resolved.points.map((point) => ({ modelId: point.modelId, value: metric.value(point)!, color: colors[point.modelId]! }))
            : [];
          const isEnergy = metric.id === 'profile-energy';
          return <article className="metric-card" data-available={comparable} data-energy-state={isEnergy ? (comparable ? 'comparable' : energyStateBadge) : undefined} key={metric.id}>
            <header><div><h2>{metric.shortName}</h2><p>{metric.direction === 'lower' ? 'Lower is better' : metric.direction === 'higher' ? 'Higher is better' : 'Descriptive'}</p></div><MetricSparkline values={sparklineValues} /><span>{metric.unit}</span></header>
            {comparable ? <div className="metric-values">{resolved.points.map((point, index) => {
              const value = metric.value(point)!;
              return <div key={point.modelId} style={{ '--model-color': colors[point.modelId] } as CSSProperties} title={catalogue.models.find((model) => model.id === point.modelId)?.displayName}>
                <span><i aria-hidden="true" />#{index + 1}</span><strong>{metric.format(value)}</strong>
              </div>;
            })}</div> : isEnergy ? (
              <p className="metric-unavailable">
                <span className="energy-state-chip" data-state={energyStateBadge}>{energyStateLabel[energyStateBadge]}</span>
                {' '}— not mutually comparable
              </p>
            ) : <p className="metric-unavailable">Not mutually available</p>}
            {isEnergy && energyDetails.length > 0 && (
              <details className="energy-detail">
                <summary>Why{comparable ? '' : ' not comparable'}</summary>
                <ul>
                  {energyDetails.map((detail) => (
                    <li key={detail.modelId}><strong>{detail.modelName}:</strong> {detail.summary}</li>
                  ))}
                </ul>
                <p>Whole profiling resource pass; not per inference or per batch.</p>
              </details>
            )}
          </article>;
        })}
      </section>

      {comparison.status !== 'incompatible' && resolved.points.length > 0
        ? <RuntimePlots points={resolved.points} models={catalogue.models} colors={colors} comparableMetricIds={comparison.comparableMetricIds} view={resolved.selection.view} />
        : <section className="plots-blocked panel"><h2>Comparative plots withheld</h2><p>Resolve the context conflict above before plotting runtime values.</p></section>}

      <section className="evidence-strip panel" aria-labelledby="evidence-heading">
        <div className="section-heading-row"><h2 id="evidence-heading">Resolved Technical Cards</h2><span>{resolved.points.length} explicit context{resolved.points.length === 1 ? '' : 's'}</span></div>
        <div className="evidence-cards">
          {resolved.points.map((point, index) => {
            const model = catalogue.models.find((candidate) => candidate.id === point.modelId)!;
            const json = buildRepositoryFileUrl(catalogue.metadata, point.card.provenance.technicalCardPath);
            const raw = buildRepositoryRawUrl(catalogue.metadata, point.card.provenance.rawMeasurementPath);
            return <article key={point.card.id} style={{ '--model-color': colors[point.modelId] } as CSSProperties} data-technical-card-id={point.card.id}>
              <span className="evidence-index">#{index + 1}</span><div><h3>{model.displayName}</h3><code>{point.card.id}</code><p>{point.card.context.deviceBackend.toUpperCase()} · {point.card.context.threadRegime ?? 'backend default'} · batch {point.condition.batchSize} · ✓ canonical evidence</p></div>
              <div className="evidence-links">{json && <a href={json} target="_blank" rel="noreferrer">Card JSON ↗</a>}{raw && <a href={raw} target="_blank" rel="noreferrer">Raw NPZ ↗</a>}</div>
            </article>;
          })}
          {resolved.points.length === 0 && <p className="empty-selection">No Technical Card is resolved while the selection is empty or incompatible.</p>}
        </div>
      </section>
    </div>
  );
}
