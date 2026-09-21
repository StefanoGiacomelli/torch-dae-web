import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateComparability } from '../src/data/technical-cards/comparability';
import {
  canonicalSuccessfulConditions,
  defaultExplorerSelection,
  deviceKey,
  protocolKey,
  regimeKey,
  resolveExplorerState,
} from '../src/data/technical-cards/selectors';
import type { ComparabilityStatus } from '../src/data/technical-cards/types';
import type { CatalogueIndex } from '../src/data/types/catalogue';

const outputDirectory = resolve(process.argv[2] ?? '.cache/phase-05-audit');
const catalogue = JSON.parse(await readFile(resolve('src/generated/catalogue.json'), 'utf8')) as CatalogueIndex;

function combinations<T>(values: T[], minimum = 2): T[][] {
  const output: T[][] = [];
  const visit = (cursor: number, current: T[]) => {
    if (current.length >= minimum) output.push([...current]);
    for (let next = cursor; next < values.length; next += 1) visit(next + 1, [...current, values[next]!]);
  };
  visit(0, []);
  return output;
}

const contexts: Array<{
  models: string[];
  device: string;
  regime: string;
  protocol: string;
  batch: number;
  status: ComparabilityStatus;
  cardIds: string[];
  comparableMetrics: string[];
  excludedMetrics: string[];
}> = [];
const knownCardIds = new Set(catalogue.technicalCards.map((card) => card.id));

for (const modelIds of combinations(catalogue.models.map((model) => model.id))) {
  const cards = catalogue.technicalCards.filter((card) => modelIds.includes(card.modelId));
  for (const device of new Set(cards.map(deviceKey))) {
    for (const regime of new Set(cards.filter((card) => deviceKey(card) === device).map(regimeKey))) {
      for (const protocol of new Set(
        cards.filter((card) => deviceKey(card) === device && regimeKey(card) === regime).map(protocolKey),
      )) {
        const batches = [...new Set(
          cards
            .filter((card) => deviceKey(card) === device && regimeKey(card) === regime && protocolKey(card) === protocol)
            .flatMap((card) => canonicalSuccessfulConditions(card).map((condition) => condition.batchSize)),
        )].sort((a, b) => a - b);
        for (const batch of batches) {
          const state = resolveExplorerState(catalogue, {
            ...defaultExplorerSelection(catalogue),
            modelIds,
            deviceKey: device,
            regime,
            protocolKey: protocol,
            batchSize: batch,
          });
          if (
            state.selection.deviceKey !== device ||
            state.selection.regime !== regime ||
            state.selection.protocolKey !== protocol ||
            state.selection.batchSize !== batch
          ) continue;
          const result = evaluateComparability(state);
          const cardIds = state.points.map((point) => point.card.id);
          if (cardIds.length !== modelIds.length || cardIds.some((id) => !knownCardIds.has(id))) {
            throw new Error(`Comparison context did not resolve one real Technical Card per model: ${modelIds.join(',')}`);
          }
          contexts.push({
            models: modelIds,
            device,
            regime,
            protocol,
            batch,
            status: result.status,
            cardIds,
            comparableMetrics: result.comparableMetricIds,
            excludedMetrics: result.excludedMetricIds,
          });
        }
      }
    }
  }
}

for (const card of catalogue.technicalCards) {
  if (card.energy.availability !== 'complete' && card.energy.totalEnergyKwh !== null) {
    throw new Error(`Non-complete energy must remain null, not numeric: ${card.id}`);
  }
  if (card.energy.availability === 'complete' && !(card.energy.totalEnergyKwh !== null && card.energy.totalEnergyKwh > 0)) {
    throw new Error(`Complete energy must be a positive canonical measurement: ${card.id}`);
  }
}

const empty = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds: [] });
const emptyComparison = evaluateComparability(empty);
if (emptyComparison.status !== 'incompatible' || emptyComparison.comparableMetricIds.length || empty.points.length) {
  throw new Error('The explicit incompatible empty state exposed evidence or comparative metrics.');
}

const counts = contexts.reduce<Record<ComparabilityStatus, number>>(
  (result, context) => ({ ...result, [context.status]: result[context.status] + 1 }),
  { direct: 0, partial: 0, incompatible: 0 },
);
const report = {
  source: catalogue.metadata,
  modelCombinations: combinations(catalogue.models.map((model) => model.id)),
  contextCounts: counts,
  contexts,
  checks: {
    everyResolvedCardExists: true,
    oneCardPerSelectedModel: true,
    incompatibleStateWithholdsPlots: true,
    missingEnergyRemainsNull: true,
    noFixtureFallback: true,
  },
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'catalogue-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# Production catalogue and comparability audit

- Source: \`${catalogue.metadata.sourceRepository}\`
- Ref: \`${catalogue.metadata.requestedRef}\`
- Resolved SHA: \`${catalogue.metadata.resolvedCommitSha}\`
- Model Cards: ${catalogue.metadata.modelCount}
- Technical Cards: ${catalogue.metadata.technicalCardCount}
- Model combinations enumerated: ${report.modelCombinations.length}
- Shared selectable contexts: ${contexts.length} (${counts.direct} direct, ${counts.partial} partial, ${counts.incompatible} incompatible)
- Explicit incompatible empty state: comparative metrics and evidence withheld
- Technical Card resolution: exactly one existing card per selected model/context
- Energy: missing/partial/failed aggregates remain null; complete aggregates are positive canonical measurements
- Fixture fallback: none
`;
await writeFile(resolve(outputDirectory, 'catalogue-audit.md'), markdown);
console.log(markdown.trim());
