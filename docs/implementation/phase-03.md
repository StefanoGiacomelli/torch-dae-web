# Phase 03 — Technical Cards selector and comparability engine

## Implemented

- `/technical-cards` is a hydrated React evidence explorer inside the existing Astro shell. It renders
  only normalized `CatalogueIndex` data and preserves the Phase 02 navbar/theme behavior.
- Adaptive selectors resolve in this order: models → device/backend plus hardware fingerprint → CPU
  thread regime/backend default → protocol ID/version → canonical successful batch → derived view
  mode. An upstream change preserves still-valid downstream values and otherwise picks the first
  deterministic sorted fallback. It never chooses among multiple matching Technical Cards.
- One to five models are supported (`MAX_SELECTED_MODELS = 5`); the current three-model catalogue is
  selected by default. Empty selection is explicit and incompatible. One model derives single mode;
  two or more derive comparison mode.
- URL query state (`models`, `device`, `regime`, `protocol`, `batch`, `view`) restores on load, is
  sanitized through the same selector resolver, and updates through `history.replaceState` without a
  navigation. Copy link copies the current canonicalized URL.
- Stable colors are assigned from the approved five-color palette by sorted canonical model ID and
  reused by chips, metrics, plots, and evidence cards.
- Basic dependency-free SVG plots prove the Phase 03 data flow: metric-valid canonical mean-latency
  series over the shared comparison batch domain and selected-batch throughput bars. Missing timing
  suppresses timing plots without removing the resolved condition or substituting zero. Phase 04 owns advanced charts,
  normalized radar, legends/tooltips, and final visual polish.

## Comparability and metric contracts

- Pure logic lives in `src/data/technical-cards/`; UI components do not determine comparability.
- `selectors.ts` defines exact context resolution. A canonical successful condition requires success,
  canonical duration, and canonical sample count; timing availability is deliberately left to the
  metric registry. Minimum-duration conditions remain distinct.
- `comparability.ts` requires equal protocol/version, backend plus hardware fingerprint, execution
  regime, precision/autocast, runtime classification, canonical duration, material synthetic-input
  semantics, every normalized runtime-environment field, and batch. Device identity is backend plus
  hardware fingerprint plus `deviceIndex` when present, and indexed labels are disambiguated.
- Native sample rate/sample count and model identity are intentionally not equality constraints:
  protocol v1 benchmarks equal-duration model-native waveform inputs, so 16 kHz and 32 kHz models can
  be compared under the same canonical protocol without pretending their tensor lengths are equal.
  `executionContextFingerprint` is not compared opaquely; its material fields are compared explicitly.
- The registry in `metrics.ts` defines mean latency, throughput, RTF, speed factor, RSS sampled peak,
  and whole-profile energy with stable IDs, units, directionality, availability, formatting, scope, and
  normalization eligibility. RSS is exposed only when its sampled-peak semantic flag is true and remains
  a separate host-memory surface; accelerator observations are not summed into it.
- Direct means all registered metrics are mutually valid. Partial means the runtime context matches and
  at least one metric is excluded. Incompatible means the runtime context is unresolved/mismatched and
  comparative plots are withheld.
- Energy is comparable only when every selected card has internally consistent complete finite aggregate
  energy and identical kind, provider/version, scope, interval, privilege, and coverage semantics.
  Partial/unavailable/failed energy is never
  zero. Profile energy is labeled as the whole profiling resource pass, never per inference or per batch.
- Canonical-source audit confirms RSS sampling and energy wrap the full isolated profiling worker/card
  workload, including construction/loading and its resource pass. Therefore both card-scoped metrics
  additionally require equal normalized condition/coverage signatures (duration, batch, status and
  support semantics; model-native sample counts and condition IDs are intentionally excluded).

## Real v0.2.0 catalogue findings

- 3 models, each with 3 Technical Cards; 9 cards total.
- Shared context families across all three models: CPU/native-default, CPU/single-thread, and
  MPS/backend-default, all under `audio-inference-v1/1.0.0`, float32/no-autocast, canonical 10-second
  input, batches 1/2/4/8.
- CNN14 + ResNet38 CPU/single-thread and MPS/backend-default are direct for all six registry metrics at
  every batch. Their CPU/native-default family is partial because CNN14 energy coverage is incomplete.
- Comparisons involving Wavegram are partial: timing metrics remain comparable, while RSS and energy are
  excluded because Wavegram lacks the supplemental minimum-duration workload present on the other cards.
- The exhaustive data-derived audit discovers 48 shared comparison contexts: 8 direct and 40 partial;
  no naturally incompatible context is selectable through the adaptive intersections.

## Important files

- `src/data/technical-cards/{types,selectors,comparability,metrics,plotData,urlState,colors}.ts`
- `src/components/technical-cards/{TechnicalCardsExplorer,RuntimePlots}.tsx`
- `src/styles/technical-cards.css`
- `tests/unit/technical-cards.test.ts`
- `tests/unit/runtime-plots.test.tsx`
- `tests/e2e/technical-cards.spec.ts`
- `scripts/audit-comparability.ts`
- `scripts/capture-phase-03-screenshots.mjs`

## Validation

The final packaging review confirmed that Vitest's production-component TSX import requires the React
Vite transform in this configuration. `@vitejs/plugin-react` is therefore declared directly and pinned
to the already-resolved compatible version `5.2.0`; `npm ci` succeeds from the updated lockfile with no
dependency upgrades or Phase 03 behavior changes.

Required final gates:

```text
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run audit:comparability
npm run build
npm run test:e2e
```

The pre-change baseline passed all gates; its first sandboxed E2E attempt could not bind localhost
(`EPERM`) and passed 25/25 when rerun with local-server permission. Final results are recorded in the
Phase 03 review bundle.

## Constraints to preserve

- Keep context resolution and comparability pure and outside React presentation components.
- Never weaken exact-card resolution into an arbitrary `find()`/first-card choice when multiple cards
  match a selector context.
- Keep canonical-condition filtering; minimum-duration batch-1 conditions are not interchangeable with
  canonical-duration batch-1 conditions.
- Keep device keys tied to the hardware fingerprint, even if the visible label is shortened.
- Keep energy scope/method/coverage checks and the non-normalizable registry flag; Phase 04 radar must
  not include profile energy without an explicitly reviewed normalization rule.
- Do not combine RSS and accelerator/unified-memory surfaces.
- Preserve URL sanitization through `resolveExplorerState`; never trust query values directly.
- Incompatible state must continue to withhold comparative plots.
