import type { ExplorerSelection } from './types';

export function parseExplorerQuery(search: string, fallback: ExplorerSelection): ExplorerSelection {
  const params = new URLSearchParams(search);
  const hasModels = params.has('models');
  const models = hasModels ? (params.get('models') ?? '').split(',').filter(Boolean) : fallback.modelIds;
  const batchValue = params.get('batch');
  const parsedBatch = batchValue === null ? fallback.batchSize : Number(batchValue);
  const view = params.get('view');
  return {
    modelIds: models,
    deviceKey: params.get('device') ?? fallback.deviceKey,
    regime: params.get('regime') ?? fallback.regime,
    protocolKey: params.get('protocol') ?? fallback.protocolKey,
    batchSize: Number.isFinite(parsedBatch) ? parsedBatch : fallback.batchSize,
    view: view === 'single' || view === 'comparison' ? view : fallback.view,
  };
}

export function serializeExplorerQuery(selection: ExplorerSelection): string {
  const params = new URLSearchParams();
  params.set('models', selection.modelIds.join(','));
  if (selection.deviceKey) params.set('device', selection.deviceKey);
  if (selection.regime) params.set('regime', selection.regime);
  if (selection.protocolKey) params.set('protocol', selection.protocolKey);
  if (selection.batchSize !== null) params.set('batch', String(selection.batchSize));
  params.set('view', selection.view);
  return `?${params.toString()}`;
}
