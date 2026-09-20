import type { CatalogueIndex, CatalogueTechnicalCard } from '../types/catalogue';
import {
  BACKEND_DEFAULT_REGIME,
  MAX_SELECTED_MODELS,
  type ExplorerSelection,
  type ExplorerSelectorOptions,
  type ResolvedExplorerState,
  type SelectorOption,
} from './types';

export function deviceKey(card: CatalogueTechnicalCard): string {
  const index = card.context.deviceIndex;
  return `${card.context.deviceBackend}:${card.context.environment.hardwareFingerprint}${index === null ? '' : `:device-${index}`}`;
}

export function regimeKey(card: CatalogueTechnicalCard): string {
  return card.context.threadRegime ?? BACKEND_DEFAULT_REGIME;
}

export function protocolKey(card: CatalogueTechnicalCard): string {
  return `${card.context.protocolId}@${card.context.protocolVersion}`;
}

export function canonicalSuccessfulConditions(card: CatalogueTechnicalCard) {
  return card.conditions.filter((condition) =>
    condition.status === 'success'
    && condition.durationSeconds === card.context.canonicalDurationSeconds
    && condition.sampleCount === card.context.sampleCount,
  );
}

function intersection<T>(sets: Set<T>[]): Set<T> {
  const first = sets[0];
  if (!first) return new Set();
  return new Set([...first].filter((value) => sets.slice(1).every((set) => set.has(value))));
}

function sharedValues(
  cards: CatalogueTechnicalCard[],
  modelIds: string[],
  getValues: (card: CatalogueTechnicalCard) => Array<string | number>,
): Set<string | number> {
  return intersection(modelIds.map((modelId) => new Set(
    cards.filter((card) => card.modelId === modelId).flatMap(getValues),
  )));
}

function choose<T extends string | number>(requested: T | null, options: SelectorOption<T>[]): T | null {
  return options.some((option) => option.value === requested) ? requested : options[0]?.value ?? null;
}

function deviceLabel(card: CatalogueTechnicalCard): string {
  const backend = card.context.deviceBackend.toUpperCase();
  const hardware = card.context.deviceBackend === 'cpu'
    ? card.context.hardware.cpuModel
    : card.context.hardware.acceleratorModel;
  const index = card.context.deviceIndex;
  const indexed = index === null ? '' : ` · device ${index}`;
  return hardware ? `${backend} · ${hardware}${indexed}` : `${backend} · ${card.context.deviceLabel}${indexed}`;
}

function regimeLabel(value: string): string {
  return value === BACKEND_DEFAULT_REGIME ? 'Backend default' : value.replaceAll('_', ' ');
}

function normalizeModelIds(catalogue: CatalogueIndex, requested: string[]): string[] {
  const known = new Set(catalogue.models.map((model) => model.id));
  return [...new Set(requested)].filter((id) => known.has(id)).slice(0, MAX_SELECTED_MODELS);
}

export function defaultExplorerSelection(catalogue: CatalogueIndex): ExplorerSelection {
  return {
    modelIds: catalogue.models.slice(0, MAX_SELECTED_MODELS).map((model) => model.id),
    deviceKey: null,
    regime: null,
    protocolKey: null,
    batchSize: null,
    view: catalogue.models.length > 1 ? 'comparison' : 'single',
  };
}

export function resolveExplorerState(
  catalogue: CatalogueIndex,
  requested: ExplorerSelection,
): ResolvedExplorerState {
  const modelIds = normalizeModelIds(catalogue, requested.modelIds);
  const issues: ResolvedExplorerState['resolutionIssues'] = [];
  const emptyOptions: ExplorerSelectorOptions = { devices: [], regimes: [], protocols: [], batches: [] };
  if (modelIds.length === 0) {
    return {
      selection: { ...requested, modelIds, deviceKey: null, regime: null, protocolKey: null, batchSize: null, view: 'single' },
      options: emptyOptions,
      points: [],
      resolutionIssues: ['no-model-selection'],
    };
  }

  const selectedCards = catalogue.technicalCards.filter((card) => modelIds.includes(card.modelId));
  const sharedDevices = sharedValues(selectedCards, modelIds, (card) => [deviceKey(card)]);
  const devices = [...sharedDevices].map(String).sort().map((value) => {
    const card = selectedCards.find((candidate) => deviceKey(candidate) === value)!;
    return { value, label: deviceLabel(card) };
  });
  const selectedDevice = choose(requested.deviceKey, devices);
  if (!selectedDevice) issues.push('no-shared-context');

  const deviceCards = selectedCards.filter((card) => deviceKey(card) === selectedDevice);
  const sharedRegimes = sharedValues(deviceCards, modelIds, (card) => [regimeKey(card)]);
  const regimes = [...sharedRegimes].map(String).sort().map((value) => ({ value, label: regimeLabel(value) }));
  const selectedRegime = choose(requested.regime, regimes);
  if (selectedDevice && !selectedRegime) issues.push('no-shared-context');

  const regimeCards = deviceCards.filter((card) => regimeKey(card) === selectedRegime);
  const sharedProtocols = sharedValues(regimeCards, modelIds, (card) => [protocolKey(card)]);
  const protocols = [...sharedProtocols].map(String).sort().map((value) => {
    const card = regimeCards.find((candidate) => protocolKey(candidate) === value)!;
    return { value, label: `${card.context.protocolId} · v${card.context.protocolVersion}` };
  });
  const selectedProtocol = choose(requested.protocolKey, protocols);
  if (selectedRegime && !selectedProtocol) issues.push('no-shared-context');

  const protocolCards = regimeCards.filter((card) => protocolKey(card) === selectedProtocol);
  const sharedBatches = sharedValues(protocolCards, modelIds, (card) =>
    canonicalSuccessfulConditions(card).map((condition) => condition.batchSize),
  );
  const batches = [...sharedBatches].map(Number).sort((a, b) => a - b).map((value) => ({ value, label: String(value) }));
  const selectedBatch = choose(requested.batchSize, batches);
  if (selectedProtocol && selectedBatch === null) issues.push('no-shared-context');

  const points = modelIds.flatMap((modelId) => {
    const cards = protocolCards.filter((card) => card.modelId === modelId);
    const card = cards[0];
    if (cards.length !== 1 || !card) {
      issues.push(cards.length > 1 ? 'ambiguous-card' : 'no-shared-context');
      return [];
    }
    const conditions = canonicalSuccessfulConditions(card).filter((condition) => condition.batchSize === selectedBatch);
    const condition = conditions[0];
    if (conditions.length !== 1 || !condition) {
      issues.push(conditions.length > 1 ? 'ambiguous-card' : 'missing-condition');
      return [];
    }
    return [{ modelId, card, condition }];
  });

  return {
    selection: {
      modelIds,
      deviceKey: selectedDevice,
      regime: selectedRegime,
      protocolKey: selectedProtocol,
      batchSize: selectedBatch,
      view: modelIds.length > 1 ? 'comparison' : 'single',
    },
    options: { devices, regimes, protocols, batches },
    points,
    resolutionIssues: [...new Set(issues)],
  };
}
