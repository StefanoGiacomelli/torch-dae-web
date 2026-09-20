import type { CatalogueIndex, CatalogueModel, VerificationBackend } from '../types/catalogue';

/**
 * Cross-checks each self-declared verification backend against the model's linked Technical
 * Cards, rather than trusting the Model Card's own `device_support.locally_tested` claim as-is.
 *
 * A backend is rendered "locally verified" only when at least one linked Technical Card actually
 * ran on that backend with at least one successful condition (real profiling evidence). A backend
 * the Model Card claims was locally tested, but for which no such Technical Card exists, is
 * rendered as upstream-declared/locally-unverified instead — the UI never repeats an unevidenced
 * claim. Backends the Model Card never claimed as locally tested are left untouched (upstream
 * declared / not represented), since Technical Card coverage cannot upgrade a capability the
 * Model Card itself never declared.
 */
export function getEvidencedVerificationBackends(
  model: CatalogueModel,
  catalogue: CatalogueIndex,
): VerificationBackend[] {
  const linkedTechnicalCards = catalogue.technicalCards.filter((card) => model.technicalCardIds.includes(card.id));
  const evidencedBackends = new Set(
    linkedTechnicalCards
      .filter((card) => card.conditions.some((condition) => condition.status === 'success'))
      .map((card) => card.context.deviceBackend),
  );

  return model.verificationBackends.map((backend) =>
    backend.status === 'locally_verified' && !evidencedBackends.has(backend.backend)
      ? { backend: backend.backend, status: 'upstream_declared' }
      : backend,
  );
}
