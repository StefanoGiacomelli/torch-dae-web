import type {
  CatalogueCondition,
  CatalogueIndex,
  CatalogueModel,
  CatalogueTechnicalCard,
} from '../types/catalogue';

export interface ReferenceRuntimeContext {
  technicalCard: CatalogueTechnicalCard;
  condition: CatalogueCondition;
}

/**
 * Deterministic reference runtime context for the compact/expanded Model Card
 * performance summary.
 *
 * Canonical v0.2.0 does not designate an explicit default Technical Card, so no
 * context is chosen unless the catalogue offers exactly one unambiguous
 * candidate: the single CPU Technical Card profiled under the platform's native
 * default thread regime, evaluated at its canonical (not minimum-duration)
 * single-item batch condition. This matches the specification's illustrative
 * reference context ("CPU · native_default · batch 1 · audio-inference-v1") and
 * holds for every model in the current catalogue; if a future model does not
 * satisfy it, callers must fall back to a neutral "explore runtime evidence"
 * affordance instead of guessing a context.
 */
export function getReferenceRuntimeContext(
  model: CatalogueModel,
  catalogue: CatalogueIndex,
): ReferenceRuntimeContext | null {
  const candidates = catalogue.technicalCards.filter(
    (card) =>
      card.modelId === model.id &&
      card.context.deviceBackend === 'cpu' &&
      card.context.threadRegime === 'native_default',
  );
  if (candidates.length !== 1) return null;

  const technicalCard = candidates[0]!;
  const condition = technicalCard.conditions.find(
    (item) =>
      item.batchSize === 1 &&
      item.status === 'success' &&
      item.durationSeconds === technicalCard.context.canonicalDurationSeconds &&
      item.timing !== null,
  );
  if (!condition) return null;

  return { technicalCard, condition };
}
