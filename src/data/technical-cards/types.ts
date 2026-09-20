import type { CatalogueCondition, CatalogueTechnicalCard } from '../types/catalogue';

export const BACKEND_DEFAULT_REGIME = 'backend_default';
export const MAX_SELECTED_MODELS = 5;

export type ExplorerViewMode = 'single' | 'comparison';

export interface ExplorerSelection {
  modelIds: string[];
  deviceKey: string | null;
  regime: string | null;
  protocolKey: string | null;
  batchSize: number | null;
  view: ExplorerViewMode;
}

export interface SelectorOption<T extends string | number = string> {
  value: T;
  label: string;
}

export interface ExplorerSelectorOptions {
  devices: SelectorOption[];
  regimes: SelectorOption[];
  protocols: SelectorOption[];
  batches: SelectorOption<number>[];
}

export interface ResolvedRuntimePoint {
  modelId: string;
  card: CatalogueTechnicalCard;
  condition: CatalogueCondition;
}

export interface ResolvedExplorerState {
  selection: ExplorerSelection;
  options: ExplorerSelectorOptions;
  points: ResolvedRuntimePoint[];
  resolutionIssues: Array<'no-model-selection' | 'no-shared-context' | 'ambiguous-card' | 'missing-condition'>;
}

export type RuntimeMetricId =
  | 'latency-mean'
  | 'throughput'
  | 'real-time-factor'
  | 'speed-factor'
  | 'rss-peak-memory'
  | 'profile-energy';

export type ComparabilityStatus = 'direct' | 'partial' | 'incompatible';

export type ComparabilityReasonCode =
  | 'no-model-selection'
  | 'no-shared-context'
  | 'ambiguous-context'
  | 'missing-condition'
  | 'protocol-mismatch'
  | 'device-mismatch'
  | 'execution-regime-mismatch'
  | 'precision-mismatch'
  | 'runtime-classification-mismatch'
  | 'canonical-duration-mismatch'
  | 'input-context-mismatch'
  | 'environment-mismatch'
  | 'batch-mismatch'
  | 'metric-unavailable'
  | 'memory-semantics-mismatch'
  | 'card-workload-mismatch'
  | 'energy-coverage-mismatch'
  | 'energy-method-mismatch';

export interface ComparabilityReason {
  code: ComparabilityReasonCode;
  message: string;
  metricId?: RuntimeMetricId;
}

export interface ResolvedComparisonContext {
  deviceKey: string;
  backend: string;
  deviceLabel: string;
  regime: string;
  protocolId: string;
  protocolVersion: string;
  batchSize: number;
  canonicalDurationSeconds: number;
  precision: string;
}

export interface ComparabilityResult {
  status: ComparabilityStatus;
  comparableMetricIds: RuntimeMetricId[];
  excludedMetricIds: RuntimeMetricId[];
  reasons: ComparabilityReason[];
  resolvedContext: ResolvedComparisonContext | null;
}
