# Catalogue data contract

## Authority and release lock

The website is a read-only consumer of `StefanoGiacomelli/torch_dae`. `catalogue-source.json` locks the requested `v0.2.0` release to the commit resolved from the public Git tag. Local sync resolves the ref from the source repository's Git object database and verifies the lock. If the tag object is absent, it may use the locked commit SHA only when that commit object exists locally.

Local ingestion never reads the live working tree. It materializes the resolved commit with `git archive` into `.cache/torch-dae-snapshots/<resolved SHA>/` and ingests that immutable snapshot. Cache identity is the full commit SHA. This excludes uncommitted edits, permits source `HEAD` to advance, and requires no checkout, fetch, reset, worktree, or write in the canonical repository. Missing objects fail with guidance to use GitHub mode.

The browser never fetches canonical repository artifacts. `scripts/sync-data.ts` performs build-time ingestion and writes the ignored, disposable `src/generated/catalogue.json`.

## Validation and discovery

The ingestion layer recursively discovers JSON under `model_cards/` and `technical_cards/`. Ajv 2020 validates each artifact against the canonical `schemas/model-card.schema.json` or `schemas/technical-card.schema.json`. All canonical schemas are registered so their identifiers and references remain available. Ajv strict-schema warnings are disabled because the upstream schemas—not this consumer—control schema vocabulary; artifact validation remains all-errors and format-aware.

The pipeline then fails on duplicate IDs, unknown Model Card references, unresolved default embeddings, missing raw NPZ assets, or an empty catalogue. Raw NPZ content is not loaded for summary rendering.

## Normalized structures

`src/data/types/catalogue.ts` defines:

- `CatalogueModel` for identity, architecture summary, checkpoint/acquisition authority, upstream source identities, scientific reference, datasets, evidence records, tasks, full input constraints, output/embedding contracts, upstream metrics, evidence-aware device states, and deterministic Technical Card links;
- `CatalogueTechnicalCard` for protocol, structured hardware/software environment, execution fingerprint, device identity, precision, thread regime, synthetic-input provenance, batch conditions, timing metrics, memory surfaces, energy method/coverage, raw-evidence links, and profiler/source provenance;
- `CatalogueContext`, `CatalogueMetric`, `CatalogueEnergy`, and `CatalogueProvenance` as reusable semantic units;
- `CatalogueIndex` and `CatalogueMetadata` for the static payload and source revision.

Normalization preserves raw values needed by later comparability work. Nanoseconds are additionally exposed as milliseconds for presentation. Energy method (`hardware_measured`, `software_estimated`, `unavailable`, or `failed`) is independent from availability (`complete`, `partial`, `unavailable`, or `failed`); missing values remain `null`. Provider, scope, privilege, duration, coverage, and unaccounted components remain explicit. Accelerator memory is an array of named CUDA/MPS observations, so peak/current, allocated/reserved, and MPS driver surfaces are never collapsed or summed.

## Canonical v0.2.0 gaps and limits

- Model Cards do not provide a structured minimum input duration. Some limits exist only as prose, while Technical Card minimum-input searches may be non-monotonic. The web contract does not infer a number.
- Technical Cards do not define a separate generic “execution regime” beyond canonical runtime classification, device/backend, precision, thread regime, environment, and protocol fields.
- No canonical default/reference Technical Card is designated for a Model Card. Later UI must not select one arbitrarily.
- Energy is scoped to the isolated resource pass, not per inference. Per-inference energy must not be derived without an approved rule.
- Representative visual identity assets are not canonical v0.2.0 data and must be first-party presentation assets in Phase 02.

## Joins and generated output

Technical Cards join by canonical `model.model_card_id` to `Model Card.card_id`. A Model Card may validly have zero links; each Technical Card must still reference a known Model Card. IDs are sorted before output so joins and generated arrays are deterministic. The generated metadata records repository, mode, requested ref, resolved commit, generation time, counts, and observed schema versions.

## Schema evolution

When `torch-dae` schemas change, first update `catalogue-source.json` through a reviewed release sync. Run validation before changing normalized types. Add mappings only for fields present in canonical schemas, preserve unknown scientific semantics in the raw layer until understood, update deterministic fixtures, and fail rather than infer ambiguous relationships.
