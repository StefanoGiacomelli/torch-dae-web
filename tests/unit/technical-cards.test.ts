import { describe, expect, it } from 'vitest';
import catalogueJson from '../../src/generated/catalogue.json';
import { evaluateComparability } from '../../src/data/technical-cards/comparability';
import { createModelColorMap } from '../../src/data/technical-cards/colors';
import { defaultExplorerSelection, deviceKey, resolveExplorerState } from '../../src/data/technical-cards/selectors';
import type { ExplorerSelection, ResolvedExplorerState } from '../../src/data/technical-cards/types';
import { parseExplorerQuery, serializeExplorerQuery } from '../../src/data/technical-cards/urlState';
import type { CatalogueIndex } from '../../src/data/types/catalogue';

const catalogue = catalogueJson as CatalogueIndex;
const modelIds = catalogue.models.map((model) => model.id);
const cnnResnetIds = modelIds.filter((id) => !id.includes('wavegram'));

function resolve(patch: Partial<ExplorerSelection> = {}) {
  return resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), ...patch });
}

function changedPointState(
  original: ResolvedExplorerState,
  index: number,
  change: (point: ResolvedExplorerState['points'][number]) => void,
) {
  const copy = structuredClone(original);
  const point = copy.points[index];
  if (!point) throw new Error(`Missing fixture point ${index}`);
  change(point);
  return copy;
}

describe('Technical Card adaptive selector state', () => {
  it('discovers the real three-model shared CPU contexts and canonical batches', () => {
    const state = resolve();
    expect(state.selection.modelIds).toEqual(modelIds);
    expect(state.options.devices.map((option) => option.label)).toEqual([
      'CPU · Apple M4 Pro',
      'MPS · Apple GPU (MPS)',
    ]);
    expect(state.options.regimes.map((option) => option.value)).toEqual(['native_default', 'single_thread']);
    expect(state.options.protocols.map((option) => option.value)).toEqual(['audio-inference-v1@1.0.0']);
    expect(state.options.batches.map((option) => option.value)).toEqual([1, 2, 4, 8]);
    expect(state.points).toHaveLength(3);
  });

  it('preserves valid downstream selections and deterministically replaces stale ones', () => {
    const direct = resolve({ regime: 'single_thread', batchSize: 8 });
    expect(direct.selection.regime).toBe('single_thread');
    expect(direct.selection.batchSize).toBe(8);
    const stale = resolve({ deviceKey: 'cuda:missing', regime: 'not-real', protocolKey: 'old@0', batchSize: 999 });
    expect(stale.selection.deviceKey).toBe(direct.options.devices[0]?.value);
    expect(stale.selection.regime).toBe('native_default');
    expect(stale.selection.protocolKey).toBe('audio-inference-v1@1.0.0');
    expect(stale.selection.batchSize).toBe(1);
  });

  it('reports no shared batch without choosing an arbitrary condition', () => {
    const copy = structuredClone(catalogue);
    const target = copy.technicalCards.find((card) => card.modelId === modelIds[1] && card.context.threadRegime === 'single_thread')!;
    target.conditions = target.conditions.filter((condition) => condition.batchSize === 1);
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), regime: 'single_thread', batchSize: 8 });
    expect(state.selection.batchSize).toBe(1);
    expect(state.points).toHaveLength(3);
  });

  it('returns an incompatible state when selected models have disjoint canonical batches', () => {
    const copy = structuredClone(catalogue);
    const selected = modelIds.slice(0, 2);
    const cards = copy.technicalCards.filter((card) => selected.includes(card.modelId) && card.context.threadRegime === 'single_thread');
    cards[0]!.conditions = cards[0]!.conditions.filter((condition) => condition.batchSize === 1);
    cards[1]!.conditions = cards[1]!.conditions.filter((condition) => condition.batchSize === 2);
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), modelIds: selected, regime: 'single_thread', batchSize: 1 });
    expect(state.options.batches).toEqual([]);
    expect(state.resolutionIssues).toContain('no-shared-context');
    expect(evaluateComparability(state).status).toBe('incompatible');
  });

  it('supports a deliberately empty model selection', () => {
    const state = resolve({ modelIds: [] });
    expect(state.points).toEqual([]);
    expect(evaluateComparability(state).status).toBe('incompatible');
  });
});

describe('Technical Card comparability matrix', () => {
  it('treats one fully evidenced model/context as direct', () => {
    const resnet = catalogue.models.find((model) => model.id.includes('resnet'))!;
    const result = evaluateComparability(resolve({ modelIds: [resnet.id], regime: 'native_default' }));
    expect(result.status).toBe('direct');
    expect(result.excludedMetricIds).toEqual([]);
  });

  it('finds a real direct two-model comparison under CPU single-thread', () => {
    const result = evaluateComparability(resolve({ modelIds: cnnResnetIds, regime: 'single_thread', batchSize: 4 }));
    expect(result.status).toBe('direct');
    expect(result.comparableMetricIds).toContain('profile-energy');
    expect(result.resolvedContext).toMatchObject({ backend: 'cpu', regime: 'single_thread', batchSize: 4 });
  });

  it('marks real CPU native-default evidence partial when aggregate energy is incomplete', () => {
    const result = evaluateComparability(resolve({ modelIds: cnnResnetIds, regime: 'native_default' }));
    expect(result.status).toBe('partial');
    expect(result.excludedMetricIds).toEqual(['profile-energy']);
    expect(result.reasons).toContainEqual(expect.objectContaining({ code: 'energy-coverage-mismatch' }));
  });

  it.each([
    ['protocol mismatch', (state: ResolvedExplorerState) => { state.points[1]!.card.context.protocolVersion = '2.0.0'; }, 'protocol-mismatch'],
    ['backend mismatch', (state: ResolvedExplorerState) => { state.points[1]!.card.context.deviceBackend = 'mps'; }, 'device-mismatch'],
    ['execution regime mismatch', (state: ResolvedExplorerState) => { state.points[1]!.card.context.threadRegime = 'other'; }, 'execution-regime-mismatch'],
    ['batch mismatch', (state: ResolvedExplorerState) => { state.points[1]!.condition.batchSize = 2; }, 'batch-mismatch'],
  ])('rejects %s', (_name, mutate, reason) => {
    const state = structuredClone(resolve({ regime: 'single_thread' }));
    mutate(state);
    const result = evaluateComparability(state);
    expect(result.status).toBe('incompatible');
    expect(result.reasons.map((item) => item.code)).toContain(reason);
    expect(result.comparableMetricIds).toEqual([]);
  });

  it('keeps available metrics when timing is missing and reports a partial intersection', () => {
    const copy = structuredClone(catalogue);
    const target = copy.technicalCards.find((card) => card.modelId === cnnResnetIds[1] && card.context.threadRegime === 'single_thread')!;
    target.conditions.find((condition) => condition.batchSize === 1 && condition.durationSeconds === target.context.canonicalDurationSeconds)!.timing = null;
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), modelIds: cnnResnetIds, regime: 'single_thread', batchSize: 1 });
    expect(state.points).toHaveLength(2);
    const result = evaluateComparability(state);
    expect(result.status).toBe('partial');
    expect(result.comparableMetricIds).toEqual(['rss-peak-memory', 'profile-energy']);
    expect(result.reasons.filter((reason) => reason.code === 'metric-unavailable')).toHaveLength(4);
  });

  it('never maps unavailable energy to zero', () => {
    const state = changedPointState(resolve({ regime: 'single_thread' }), 0, (point) => {
      point.card.energy.availability = 'unavailable';
      point.card.energy.measurementKind = 'unavailable';
      point.card.energy.totalEnergyKwh = null;
    });
    const result = evaluateComparability(state);
    expect(result.status).toBe('partial');
    expect(result.excludedMetricIds).toContain('profile-energy');
  });

  it('rejects energy with a different provider while preserving other metrics', () => {
    const state = changedPointState(resolve({ modelIds: cnnResnetIds, regime: 'single_thread' }), 0, (point) => {
      point.card.energy.provider = { name: 'CodeCarbon', version: 'different' };
    });
    const result = evaluateComparability(state);
    expect(result.status).toBe('partial');
    expect(result.reasons).toContainEqual(expect.objectContaining({ code: 'energy-method-mismatch' }));
  });

  it.each([
    ['Python implementation/version', (state: ResolvedExplorerState) => { state.points[1]!.card.context.environment.pythonImplementation = 'PyPy'; state.points[1]!.card.context.environment.pythonVersion = '3.99'; }],
    ['CUDA runtime and driver', (state: ResolvedExplorerState) => { state.points[1]!.card.context.environment.cudaRuntimeVersion = '13'; state.points[1]!.card.context.environment.cudaDriverVersion = '999'; }],
    ['cuDNN', (state: ResolvedExplorerState) => { state.points[1]!.card.context.environment.cudnnVersion = '10'; }],
    ['MPS backend info', (state: ResolvedExplorerState) => { state.points[1]!.card.context.environment.mpsBackendInfo = 'different'; }],
  ])('rejects a differing %s environment field', (_name, mutate) => {
    const state = structuredClone(resolve({ modelIds: cnnResnetIds, regime: 'single_thread' }));
    mutate(state);
    expect(evaluateComparability(state).reasons).toContainEqual(expect.objectContaining({ code: 'environment-mismatch' }));
  });

  it('excludes RSS when sampled-peak semantics are not shared', () => {
    const state = changedPointState(resolve({ modelIds: cnnResnetIds, regime: 'single_thread' }), 0, (point) => { point.card.memory.rssSampledPeakIsSampled = false; });
    const result = evaluateComparability(state);
    expect(result.excludedMetricIds).toContain('rss-peak-memory');
    expect(result.reasons).toContainEqual(expect.objectContaining({ code: 'memory-semantics-mismatch' }));
  });

  it.each([
    ['interval', (state: ResolvedExplorerState) => { state.points[1]!.card.energy.intervalSeconds = 99; }],
    ['privilege', (state: ResolvedExplorerState) => { state.points[1]!.card.energy.privilegeUsed = !state.points[0]!.card.energy.privilegeUsed; }],
    ['measurement kind', (state: ResolvedExplorerState) => { state.points[1]!.card.energy.measurementKind = 'software_estimated'; state.points[1]!.card.coverage.energyStatus = 'software_estimated'; }],
  ])('excludes energy for a differing %s acquisition field', (_name, mutate) => {
    const state = structuredClone(resolve({ modelIds: cnnResnetIds, regime: 'single_thread' }));
    mutate(state);
    expect(evaluateComparability(state).reasons).toContainEqual(expect.objectContaining({ code: 'energy-method-mismatch' }));
  });

  it('excludes contradictory complete energy coverage', () => {
    const state = changedPointState(resolve({ modelIds: cnnResnetIds, regime: 'single_thread' }), 0, (point) => { point.card.energy.coverageComplete = false; });
    expect(evaluateComparability(state).reasons).toContainEqual(expect.objectContaining({ code: 'energy-coverage-mismatch' }));
  });

  it('excludes card-scoped metrics when workload coverage differs', () => {
    const state = changedPointState(resolve({ modelIds: cnnResnetIds, regime: 'single_thread' }), 0, (point) => {
      point.card.conditions = point.card.conditions.filter((condition) => condition.durationSeconds === point.card.context.canonicalDurationSeconds);
      point.card.coverage.testedConditionIds = point.card.coverage.testedConditionIds.filter((id) => point.card.conditions.some((condition) => condition.id === id));
    });
    const result = evaluateComparability(state);
    expect(result.comparableMetricIds).toEqual(['latency-mean', 'throughput', 'real-time-factor', 'speed-factor']);
    expect(result.reasons.filter((reason) => reason.code === 'card-workload-mismatch')).toHaveLength(2);
  });
});

describe('Technical Card URL state and stable colors', () => {
  it('round-trips a resolved selection', () => {
    const selection = resolve({ regime: 'single_thread', batchSize: 4 }).selection;
    expect(parseExplorerQuery(serializeExplorerQuery(selection), defaultExplorerSelection(catalogue))).toEqual(selection);
  });

  it('parses stale query values for the resolver to sanitize', () => {
    const parsed = parseExplorerQuery('?models=missing&device=bad&batch=nan&view=broken', defaultExplorerSelection(catalogue));
    const state = resolveExplorerState(catalogue, parsed);
    expect(state.selection.modelIds).toEqual([]);
    expect(state.selection.deviceKey).toBeNull();
    expect(state.selection.batchSize).toBeNull();
  });

  it('assigns the same palette color deterministically', () => {
    const first = createModelColorMap(modelIds);
    const second = createModelColorMap([...modelIds].reverse());
    expect(first).toEqual(second);
    expect(new Set(Object.values(first))).toHaveLength(modelIds.length);
  });

  it('device keys include backend and hardware identity', () => {
    const cpu = catalogue.technicalCards.find((card) => card.context.deviceBackend === 'cpu')!;
    expect(deviceKey(cpu)).toContain(cpu.context.environment.hardwareFingerprint);
  });

  it('device keys and labels distinguish indexed accelerators', () => {
    const copy = structuredClone(catalogue);
    const selected = [copy.models[0]!.id];
    const card = copy.technicalCards.find((candidate) => candidate.modelId === selected[0] && candidate.context.deviceBackend === 'mps')!;
    card.context.deviceIndex = 2;
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), modelIds: selected, deviceKey: null });
    expect(deviceKey(card)).toContain(':device-2');
    expect(state.options.devices.find((option) => option.value === deviceKey(card))?.label).toContain('device 2');
  });

  it('does not resolve identical accelerator hardware fingerprints with different device indices as shared', () => {
    const copy = structuredClone(catalogue);
    copy.technicalCards = copy.technicalCards.filter((card) => cnnResnetIds.includes(card.modelId) && card.context.deviceBackend === 'mps');
    copy.technicalCards[0]!.context.deviceIndex = 0;
    copy.technicalCards[1]!.context.deviceIndex = 1;
    const state = resolveExplorerState(copy, { ...defaultExplorerSelection(copy), modelIds: cnnResnetIds });
    expect(state.options.devices).toEqual([]);
    expect(state.resolutionIssues).toContain('no-shared-context');
  });
});
