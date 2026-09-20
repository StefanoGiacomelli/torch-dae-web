import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateComparability } from '../src/data/technical-cards/comparability';
import { canonicalSuccessfulConditions, defaultExplorerSelection, deviceKey, protocolKey, regimeKey, resolveExplorerState } from '../src/data/technical-cards/selectors';
import type { ComparabilityStatus } from '../src/data/technical-cards/types';
import type { CatalogueIndex } from '../src/data/types/catalogue';

const catalogue = JSON.parse(await readFile(resolve('src/generated/catalogue.json'), 'utf8')) as CatalogueIndex;

function combinations<T>(values: T[], minimum = 2): T[][] {
  return values.flatMap((_, index) => {
    const result: T[][] = [];
    const visit = (cursor: number, current: T[]) => {
      if (current.length >= minimum) result.push([...current]);
      for (let next = cursor; next < values.length; next += 1) visit(next + 1, [...current, values[next]!]);
    };
    if (index === 0) visit(0, []);
    return result;
  });
}

const statusCounts: Record<ComparabilityStatus, number> = { direct: 0, partial: 0, incompatible: 0 };
const groups: string[] = [];
const seen = new Set<string>();
for (const modelIds of combinations(catalogue.models.map((model) => model.id))) {
  const cards = catalogue.technicalCards.filter((card) => modelIds.includes(card.modelId));
  for (const device of new Set(cards.map(deviceKey))) {
    for (const regime of new Set(cards.filter((card) => deviceKey(card) === device).map(regimeKey))) {
      for (const protocol of new Set(cards.filter((card) => deviceKey(card) === device && regimeKey(card) === regime).map(protocolKey))) {
        const batches = [...new Set(cards
          .filter((card) => deviceKey(card) === device && regimeKey(card) === regime && protocolKey(card) === protocol)
          .flatMap((card) => canonicalSuccessfulConditions(card).map((condition) => condition.batchSize)))].sort((a, b) => a - b);
        for (const batch of batches) {
          const state = resolveExplorerState(catalogue, { ...defaultExplorerSelection(catalogue), modelIds, deviceKey: device, regime, protocolKey: protocol, batchSize: batch });
          if (state.selection.deviceKey !== device || state.selection.regime !== regime || state.selection.protocolKey !== protocol || state.selection.batchSize !== batch) continue;
          const result = evaluateComparability(state);
          const identity = `${modelIds.join(',')}|${device}|${regime}|${protocol}|${batch}`;
          if (seen.has(identity)) continue;
          seen.add(identity);
          statusCounts[result.status] += 1;
          groups.push(`${result.status.toUpperCase()}\t${modelIds.join(',')}\t${result.resolvedContext?.backend ?? 'none'}\t${regime}\t${protocol}\tbatch=${batch}\tmetrics=${result.comparableMetricIds.join(',') || 'none'}\texcluded=${result.excludedMetricIds.join(',') || 'none'}`);
        }
      }
    }
  }
}

console.log(`Catalogue: ${catalogue.metadata.requestedRef} @ ${catalogue.metadata.resolvedCommitSha}`);
console.log(`Models: ${catalogue.models.length}; Technical Cards: ${catalogue.technicalCards.length}`);
for (const model of catalogue.models) {
  console.log(`- ${model.id}: ${model.technicalCardIds.length} cards`);
}
console.log(`Discovered comparison contexts: direct=${statusCounts.direct}, partial=${statusCounts.partial}, incompatible=${statusCounts.incompatible}`);
console.log(groups.join('\n'));
