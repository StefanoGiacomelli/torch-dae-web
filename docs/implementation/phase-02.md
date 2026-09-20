# Phase 02 — Model Cards homepage

This journal reflects Phase 02 **after two** external-review correction rounds. The original
implementation summary and both correction rounds are recorded below; fresh chats should treat this
whole file, not just the latest section, as current.

## Implemented

- Full-viewport `/` catalogue experience: navbar (extended in the correction round, see below) plus a
  hero header, a React carousel island, and a static factual footer strip, all constrained to the app
  shell's `1fr` row so the document never needs a vertical scrollbar on desktop/laptop viewports.
- High-fidelity card carousel (`Carousel.tsx`) supporting click, Previous/Next buttons, `ArrowLeft`/
  `ArrowRight` keyboard navigation (focus the track first), pointer drag/swipe, trackpad horizontal
  wheel gestures, and pagination-dot direct selection. Selection is index-based and wraps circularly
  (`relativeOffset`), so a future catalogue with more models automatically produces the same
  `-2 … +2` layered composition the mockups show; with the current 3 canonical models only `-1/0/+1`
  are populated.
- In-place card expansion: `ModelCard.tsx` renders the same `<article>` per model and swaps its inner
  content between a compact view (waveform visual, family, name, task pills, sample rate, embedding
  dimension, runtime-verified line) and an expanded view (identity/scientific/input/output/embedding
  facts, per-backend runtime verification, upstream-caveat note, and a performance/provenance side
  column) — no modal, no route change. The non-selected surface is a plain container with a single
  stretched `<button class="model-card-select-overlay">` covering it (see "Compact-card HTML validity"
  in the second correction round below for why); the selected surface is a `role="group"` container,
  because HTML forbids interactive descendants (the provenance links) inside a `<button>`.
- First-party deterministic visual identity: `data/derive/modelVisual.ts` seeds a small PRNG from the
  model ID (`ModelVisual.tsx` renders it as an SVG bar waveform) so each model has a stable, reproducible
  visual with no external imagery.
- Deterministic reference runtime context: `data/derive/referenceContext.ts` picks the single CPU
  Technical Card profiled under `native_default` thread regime at its canonical (not minimum-duration)
  batch-1 condition — this exists unambiguously for all 3 canonical models today and matches the
  specification's own illustrative example. If a model doesn't satisfy this exact shape, `null` is
  returned and the card renders a neutral "N canonical Technical Cards → Explore runtime evidence"
  link to `/technical-cards` instead of guessing a context.
- `PerformanceProfile.tsx` renders mean latency/throughput/RSS-sampled-peak-memory/profile-energy from
  that reference context with raw values, explicit "lower/higher is better" labels, and a segmented bar
  whose fill is a **fixed, documented illustrative ceiling per metric** (not a cross-model or
  cross-device grade — no A–G labels). Energy specifically distinguishes `complete` (raw Joules shown),
  `partial` ("Partial coverage"), `unavailable`, and `failed` — it never renders partial/unavailable
  energy as `0`. This is exercised by real data: the CNN14 reference context has
  `energy.availability === 'partial'` (shows "Partial coverage"), while ResNet38's shows a real
  measured value.
- Provenance links: `data/derive/provenance.ts` builds commit-pinned `github.com/.../blob/<sha>/<path>`
  and `raw.githubusercontent.com/.../<sha>/<path>` URLs from `catalogue.metadata` plus a card's
  `provenance` paths (Model Card JSON, verification report, Technical Card JSON, raw NPZ measurement),
  returning `null` — never fabricating a URL — when a path is absent. It also renders any upstream
  `CatalogueSourceRecord` (repository/implementation/checkpoint/wrapper) as a short
  `formatSourceIdentity()` label (e.g. `owner/repo · path` or `owner/repo @ shortsha`) with a separate
  link, instead of ever printing a raw URL inline in a fact column.
- Background motif (`BackgroundMotif.astro`) and footer strip (`FooterStrip.astro`) are static Astro
  components (no client JS, no animation loop), matching the "no gratuitous decorative motion"
  requirement.

## Compact card fields (exact)

Display name, family (eyebrow-style caption), task pill(s), sample rate, default-embedding dimension
(when present), and a runtime-verified/lifecycle-status line. A `#00N` index badge and the `torch-dae`
kicker mark are shown on every card.

## Expanded card fields (exact)

Display name, the **stable canonical model ID** (`model.id`, shown as a small monospace line under the
name), identity (family, variant, checkpoint name), **implementation source** (a linked
`formatSourceIdentity()` label — prefers `model.sources.implementation`, falls back to
`model.sources.officialRepository` — never a raw URL), **all** `model.upstreamMetrics` entries (each
labeled "Upstream reported {name}" with value/unit/dataset/split — not just the first one), input
(shape, channels, sample rate), outputs, default embedding (name + dimension), evidence-derived
per-backend runtime verification (`✓ … verified` vs `– … upstream-declared, locally unverified` — see
"Runtime-verification derivation rule" below), an upstream-caveat sentence, and a side column with
either the Performance Profile or the Explore-evidence fallback, plus provenance links.

## Reference-context / no-default policy

Documented and implemented in `getReferenceRuntimeContext`: no default Technical Card is invented.
The function only returns a context when exactly one CPU/`native_default` Technical Card exists for
the model and its canonical batch-1 condition has timing data; otherwise the UI falls back to the
"Explore runtime evidence" link. This currently succeeds for all 3 canonical models.

The reference context is exposed as a **visible, keyboard/touch-operable disclosure**
(`<details class="performance-context">` in `PerformanceProfile.tsx`), not a hover-only `title`
attribute: opening it shows device/backend, execution regime, batch size, and protocol ID/version as
plain text. Metric labels were tightened to match the actual displayed source field rather than a
generic name: `Mean latency` (source: `timing.latencyMeanMs`), `RSS sampled peak` (source:
`memory.rssSampledPeakBytes`), `Profile energy` (source: `energy.totalEnergyKwh`, explicitly scoped —
see the component's scope note — to the whole profiling resource pass, never a fabricated per-inference
figure).

## Runtime-verification derivation rule

`data/derive/verification.ts` (`getEvidencedVerificationBackends`) cross-checks each backend the Model
Card's own `device_support.locally_tested` claims against the model's **linked Technical Cards**: a
backend is rendered `locally_verified` only when at least one linked Technical Card actually ran on
that backend with at least one successful (`status === 'success'`) condition. A backend the Model Card
claims was locally tested but for which no such Technical Card exists is rendered
`upstream_declared`/"locally unverified" instead — the UI never repeats an unevidenced self-declaration.
A backend the Model Card never claimed as locally tested is left untouched (Technical Card coverage
cannot promote a capability the Model Card itself never declared).

This list is precomputed once per model in `src/pages/index.astro` (alongside `references`) and passed
down through `Carousel` → `ModelCard` as a `verificationBackends` prop, rather than each card reading
`model.verificationBackends` directly.

Audited against the real canonical v0.2.0 catalogue: for all 3 current models, the Model Card's
self-declared `verificationBackends` (`cpu`/`mps` locally verified, `cuda` upstream-declared) is fully
backed by an actual successful Technical Card on each of `cpu` and `mps` — the evidence-derived output
is therefore identical to the raw self-declaration today. `tests/unit/derive.test.ts` includes a
regression test that asserts this equality against `src/generated/catalogue.json` directly, plus fixture
tests proving the function actually downgrades an unevidenced self-declared claim (e.g. a fixture Model
Card claiming `mps` was locally tested with no `mps` Technical Card present) and never upgrades a
backend the Model Card didn't claim.

## Footer license and PyTorch-integration copy

`src/data/ingest/pipeline.ts` now reads the SPDX `license` field straight from the canonical source
snapshot's own `pyproject.toml` (`readLicenseIdentifier`, exported for testing) and threads it through
as `CatalogueMetadata.licenseIdentifier`. `FooterStrip.astro` renders `"{licenseIdentifier}-licensed
torch-dae"` (or a neutral "torch-dae source available" if the field is ever absent) instead of a
hand-typed, previously **incorrect** "MIT-licensed torch-dae" string. For the current v0.2.0 snapshot
this resolves to `Apache-2.0` (verified against `torch-dae`'s `LICENSE`/`pyproject.toml`; the Model Card
does not carry this fact so it could not come from `CatalogueModel`). The other footer item's
marketing-flavored "Native tensors, no lock-in" was replaced with the neutral factual "Standard PyTorch
nn.Module interface".

`tests/unit/license.test.ts` covers `readLicenseIdentifier` against fixture `pyproject.toml` files
(present/absent/no-license-field) and against the real synced `src/generated/catalogue.json`
(`licenseIdentifier === 'Apache-2.0'`, `!== 'MIT'`); `tests/e2e/home.spec.ts` asserts the rendered
footer text.

## Navbar overflow menu (narrow viewports)

The Phase 02 CSS previously hid every `target="_blank"` navbar link below 62rem
(`.navbar nav > a[target='_blank'] { display: none; }`), making GitHub/Documentation/PyPI **unreachable**
below that width — a real functionality regression, not just a fidelity gap. `Navbar.astro` now renders
the three external links twice: once in `.navbar-external-links` (visible ≥62rem, the original inline
row) and once inside a native `<details class="navbar-more"><summary>More</summary>…</details>`
disclosure (visible <62rem). Native `<details>`/`<summary>` gives keyboard (Enter/Space toggles focus
built in) and touch operability with no additional JS. Below 62rem, `.navbar-external-links` is
`display: none` (not just visually collapsed — verified in tests) and `.navbar-more` becomes visible.
Technical Cards and the Day/Night toggle were never affected (no `target="_blank"`) and remain always
visible. `tests/e2e/navbar.spec.ts` covers reachability of all four destinations at 390×844, keyboard
open/close of the menu, and the no-scrollbar-regression check.

A related, unrelated-to-navigation regression was caught and fixed in the same pass: `.navbar nav > a`
(the shared link styling: no underline, secondary→primary color on hover) only matched **direct**
children of `<nav>`. Wrapping the external links in `.navbar-external-links`/`.navbar-more` made them
grandchildren, so they silently fell back to unstyled blue/underlined browser default anchors. The
selector was broadened to `.navbar nav a` (descendant, not child) to keep the same styling for both the
inline row and the overflow menu's items.

## Carousel drag/wheel interaction hardening

`Carousel.tsx`'s pointer handling now tracks a `moved` flag across `onPointerMove` using a small
`DRAG_SUPPRESS_CLICK_THRESHOLD_PX` (10px) threshold, separate from the larger
`DRAG_NAVIGATE_THRESHOLD_PX` (60px) that decides whether the drag itself changes the selection. When a
completed drag exceeded the smaller threshold, an `onClickCapture` handler on `.carousel-track`
swallows (`preventDefault` + `stopPropagation`) the very next click event before it can reach a card's
own `onClick` — this is what stops a drag that starts on (or passes over) a side card's `<button>` from
also firing that button's ordinary "select this card" handler and fighting the drag's own outcome. A
400ms safety-net timeout clears a stuck suppression flag if no click ever follows (some touch paths).
`onPointerCancel` resets drag state cleanly. Native `setPointerCapture` was deliberately **not** used:
per the Pointer Events spec, capturing a mouse pointer also retargets the resulting compatibility
`click` event to the capturing element, which would have broken *ordinary* (non-drag) clicks on side
cards outright — the explicit moved-flag/suppression approach was used instead for exactly that reason.

`tests/e2e/carousel-interaction.spec.ts` covers: a deliberate horizontal drag moves the selection by
exactly one step in the expected direction (and a second identical drag moves exactly one more, not
two); a drag started directly on a side card's own surface still resolves to the drag's own direction,
not the side card that happened to be under the pointer; an ordinary click still selects the clicked
side card; and a synthetic horizontal `deltaX` wheel gesture changes the selection per policy.

## Second correction round: accessibility/interaction semantics

A second external review found five bounded accessibility/interaction defects, all fixed without any
visual or data-semantic change.

1. **Mobile hidden side cards stayed keyboard-focusable.** At ≤48rem the non-selected `±1` cards were
   hidden with `opacity: 0; pointer-events: none`, but `ModelCard`'s own `tabIndex={Math.abs(offset) <=
   1 ? 0 : -1}` logic has no awareness of that breakpoint, so their select overlay kept `tabIndex={0}`
   and remained reachable by <kbd>Tab</kbd> despite being invisible. Fixed by adding `visibility:
   hidden` alongside the existing `opacity`/`pointer-events` rules in the `≤48rem` media query — an
   element with `visibility: hidden` is removed from the tab order by the browser itself, regardless of
   its React-assigned `tabIndex`. Desktop/laptop side-card focusability (where these cards are visible
   and interactive) is untouched, since the rule only applies inside that media query. Covered by
   `tests/e2e/navbar.spec.ts`'s "visually hidden mobile side cards cannot receive keyboard focus via
   Tab" test (25 forward Tabs from a known starting point at 390×844; any focused select-overlay must
   belong to the `data-offset="0"` card).
2. **Carousel arrow keys could be hijacked from inner controls.** The track's `keydown` listener was
   attached via `addEventListener` directly on the track `<div>`, but `keydown` bubbles, so pressing
   <kbd>ArrowLeft</kbd>/<kbd>ArrowRight</kbd> while focus was on any interactive descendant (a
   provenance link, the reference-context `<summary>`, another card's own select button) also
   re-triggered carousel navigation — arrow keys used for, say, moving a text cursor or a link's own
   semantics would unexpectedly change the selected model. Fixed with a single guard,
   `if (event.target !== trackRef.current) return;`, at the top of the handler: `event.target` is the
   original dispatch target and does not change as the event bubbles, so this only lets the handler act
   when the *track itself* — not a descendant — is the actual keyboard focus. Covered by
   `tests/e2e/home.spec.ts`'s new "ArrowLeft/ArrowRight while an inner interactive control is focused
   does not change the selection" test, alongside the pre-existing "ArrowRight/ArrowLeft keyboard
   navigation moves the selection" test (which focuses the track itself and still works).
3. **Incorrect ARIA menu semantics on the navbar overflow disclosure.** `role="menu"`/`role="menuitem"`
   on the `<details>` "More" panel implied the full WAI-ARIA menu keyboard-interaction contract (arrow-
   key item navigation, `Escape` handling, roving tabindex, etc.), none of which this component
   implements — it is native `<details>` containing ordinary links. Both roles were removed; the panel
   is now just an unstyled `<div>` around plain `<a>` elements, which already have correct native link
   semantics and were never dependent on the removed roles for their keyboard/touch behavior.
   `tests/e2e/navbar.spec.ts` was updated from `getByRole('menuitem', …)` to
   `.navbar-more-menu.getByRole('link', …)` (scoped to the menu container, since the always-present
   `.navbar-external-links` copy of the same links would otherwise also match `getByRole('link')` on
   viewports where it isn't hidden by `display: none`... at ≤62rem it *is* `display: none` and therefore
   excluded from the accessibility tree, but the explicit scoping keeps the test unambiguous regardless
   of viewport).
4. **Incorrect tab/tablist semantics on the carousel pagination dots.** `role="tablist"`/`role="tab"`/
   `aria-selected` implied a WAI-ARIA tabs widget (arrow-key roving focus between tabs, an associated
   `tabpanel`), which the dots never implemented — they are ordinary buttons that jump directly to a
   model, not tab-panel switches. Replaced with `role="group"` on the container (an ordinary labeled
   button group) and `aria-current="true"` (not `aria-selected`) on the active dot, which is the
   semantically correct way to mark "the current item" outside a tabs/listbox widget. Visual appearance
   and click-to-select behavior are unchanged (the CSS keyed off `data-active`, not the removed ARIA
   attributes). `tests/e2e/home.spec.ts`'s pagination-dots test was updated from
   `getByRole('tab', …)` to `getByRole('button', …)`.
5. **Compact card HTML validity.** The non-selected `.model-card-surface` was a `<button>` containing
   block-level content (`div`, `h2`, `ul`) — invalid per the HTML `<button>` content model (phrasing
   content only), and a real (if usually tolerated) authoring defect. Refactored so the card surface is
   a plain `<div class="model-card-surface model-card-surface-compact">`, with a single
   `<button class="model-card-select-overlay">` absolutely positioned (`inset: 0`) to cover the entire
   card and carry `aria-label={"Select " + displayName}` plus the existing `tabIndex` logic. The whole
   card remains one obvious click/tap/focus target (the overlay's hit area *is* the card), and there is
   still exactly one accessible, labeled control per card for assistive technology — verified by
   `tests/e2e/home.spec.ts`'s new "exposes exactly one focusable, labeled select control" test. Because
   `.model-card-surface` clips overflow, the overlay's default `outline-offset: 3px` focus ring would
   have rendered outside the clipped box and been invisible; `.model-card-select-overlay:focus-visible {
   outline-offset: -3px; }` draws it inset instead, so keyboard focus is still clearly visible around
   the whole card (also asserted in that same test, via a non-zero computed `outlineWidth`). The hover
   lift-on-hover rule, previously keyed off `button.model-card-surface:hover`, now targets the added
   `.model-card-surface-compact:hover` class instead, since the surface is no longer a `<button>`
   element. The selected card's non-button `role="group"` container and its provenance links are
   unchanged (out of scope for this fix, and not affected by it).

## Responsive strategy

- Desktop/laptop (≥ 48rem / 768px width, e.g. 1512×827, 1440×900, 1280×800, 1024×768): unchanged
  layout; verified via Playwright that `document.documentElement.scrollHeight <= window.innerHeight`
  at 1512×827 and 1440×900 (also true at 1280×800 and 1024×768 in manual verification).
- ≤ 62rem: the header's right-hand tagline block and the far `±2` neighbor cards are hidden; the navbar
  switches from the inline external-link row to the `More` overflow menu (see above).
- ≤ 48rem (tablet portrait 768×1024, mobile 390×844): **documented deviation** — only the selected
  card is shown (side cards are hidden rather than peeked; a peek at this width produced overlapping,
  unreadable text) at `min(100vw - 6.5rem, 420px)` so the fixed Previous/Next buttons stay clear of its
  edges, and its own detail column keeps a bounded, internally scrollable region
  (`.model-card-columns` / `.model-card-surface`) so the *document* itself still never needs to scroll.
  The navbar wordmark also shrinks under 40rem so it stays on one line.
- On every breakpoint tested (1512×827, 1440×900, 1280×800, 1024×768, 768×1024, 390×844),
  `document.documentElement.scrollHeight === window.innerHeight` (no page-level scrollbar), including
  after the correction round's additional model-ID line and navbar changes.
- Even on desktop, the expanded card's own two-column detail area (`.model-card-columns`) is an
  `overflow-y: auto` region with a thin styled scrollbar: the current PANNs fact set is slightly taller
  than the available vertical budget on a 1512×827/1280×800 viewport. This is a contained widget
  scroll, not a document scrollbar. Left as-is per the correction round's explicit instruction to keep
  desktop internal-scroll density out of scope; still tracked in `OPEN_ISSUES.md` for Phase 04.

## Files introduced

- `src/components/model-cards/{Carousel.tsx, ModelCard.tsx, ModelVisual.tsx, PerformanceProfile.tsx,
  BackgroundMotif.astro, FooterStrip.astro}`
- `src/data/derive/{referenceContext.ts, modelVisual.ts, provenance.ts, format.ts, verification.ts}`
- `src/styles/model-cards.css` (imported only by `src/pages/index.astro`)
- Tests: `tests/unit/derive.test.ts`, `tests/unit/license.test.ts`, `tests/e2e/home.spec.ts`,
  `tests/e2e/navbar.spec.ts`, `tests/e2e/carousel-interaction.spec.ts`; `tests/e2e/smoke.spec.ts`
  updated for the two-island hydration marker.
- `scripts/create-review-bundle-phase-02.mjs` — Phase 02's own review-bundle generator (see below).

## Modified files

- `src/pages/index.astro` — replaced the Phase 01 skeleton grid with the carousel composition; now also
  precomputes `verificationBackends` per model alongside `references` and passes
  `catalogue.metadata.licenseIdentifier` to `FooterStrip`.
- `src/components/navigation/Navbar.astro` — added the `.navbar-more` overflow disclosure (correction
  round).
- `src/data/types/catalogue.ts` — added `CatalogueMetadata.licenseIdentifier: string | null` (correction
  round).
- `src/data/ingest/pipeline.ts` — added `readLicenseIdentifier` and wired it into `buildCatalogue`'s
  `normalizeCatalogue` metadata (correction round).
- `src/styles/global.css` — shrink the navbar wordmark under 40rem width; added `.navbar-external-links`
  / `.navbar-more` / `.navbar-more-menu` styling; broadened `.navbar nav > a` to `.navbar nav a`
  (correction round, see "Navbar overflow menu" above).
- `tests/e2e/smoke.spec.ts` — the original hydration assertion assumed exactly one `astro-island`;
  the page now legitimately has two (`ThemeToggle`, `Carousel`), so the assertion now checks
  `astro-island[ssr]` has count 0 instead of asserting on a single (now ambiguous) locator.
- `tests/unit/normalization.test.ts`, `tests/unit/derive.test.ts` — fixture `metadata` objects updated
  for the new required `licenseIdentifier` field (correction round).
- `.gitignore` — added `.claude/` (this session's local dev-server launch config; not a deliverable).

## Intentional deviations from the mockups

- No `A`–`G` grade badges or "Popular"/"Research Grade"/"Production Ready" marketing chips — forbidden
  by the specification's MVP rule; the mockups' fictional badges are not reproduced.
- The expanded card does not show the waveform visual (traded for the identity/runtime/performance
  facts, as in the mockup's own selected-card composition).
- Mobile shows one card only (no side "peek"), documented above.
- The mockups' logo mark is a placeholder glyph (`▥`), not final brand artwork — unchanged in this
  correction round per its explicit "visual polish stays out of scope" instruction; tracked in
  `OPEN_ISSUES.md`.

## Validation

```text
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run build
npm run test:e2e
```

All commands passed after both correction rounds. Astro check: 0 errors/warnings/hints (39 files).
Vitest: 5 files / 34 tests (unchanged by the second round — it only touched markup/CSS/ARIA, not
data/derive logic). Playwright: 25/25 (up from 22 after round one: +1 mobile Tab-focus-order test in
`tests/e2e/navbar.spec.ts`, +1 inner-control-arrow-key test and +1 compact-card semantics/focus-ring
test in `tests/e2e/home.spec.ts`; the navbar overflow-menu and pagination-dots tests were updated in
place for the corrected ARIA roles rather than added).

React-island interaction tests must wait for `astro-island[ssr]` to reach count 0 before dispatching
clicks/keyboard input — asserting only on SSR-rendered `data-*` attributes (which exist before
hydration) makes a keyboard-navigation test race the hydration boundary and flake.

A benign, expected React hydration console warning appears in the dev-mode webServer log during the
`test:e2e` run: opening the `<performance-context>` `<details>` disclosure via keyboard in one test,
before the Carousel island has finished hydrating, leaves the DOM node with `open=""` at the moment
React's `hydrateRoot` reconciles it, which React logs as "won't be patched up" (it correctly keeps the
user's actual open state rather than reverting it). This is native `<details>` behavior interacting with
async island hydration, not a data or logic defect, and does not fail any test.

## Constraints to preserve (Phase 03/04 must not break)

- Do not hardcode Model/Technical Card facts in `src/pages/index.astro` or the `model-cards`
  components — they must keep reading only from `CatalogueIndex`.
- Keep `getReferenceRuntimeContext`'s "exactly one unambiguous CPU/native_default candidate, canonical
  (non-minimum) batch-1 condition" rule; do not loosen it to guess among multiple candidates.
- Keep energy's `partial`/`unavailable`/`failed` states rendered distinctly from a real numeric value;
  never coerce a missing `totalEnergyKwh` to `0`.
- Keep `ModelCard`'s selected-state container as a non-`<button>` element (interactive provenance/
  explore-evidence links live inside it); keep the non-selected surface as a plain container with its
  single stretched `.model-card-select-overlay` `<button>` — do not put block content back inside an
  actual `<button>` element (invalid HTML), and do not remove the `:focus-visible { outline-offset:
  -3px }` override on that overlay (the surface's `overflow: hidden` would otherwise clip an
  outward-offset ring entirely, making keyboard focus invisible).
- Keep `getEvidencedVerificationBackends` as the single source of truth for rendered runtime-verification
  status; do not read `model.verificationBackends` directly in UI components again — a backend must
  remain evidence-cross-checked against linked Technical Cards, not just self-declared.
- Keep `CatalogueMetadata.licenseIdentifier` sourced from the canonical snapshot's own
  `pyproject.toml` (`readLicenseIdentifier`); never hardcode a license string in UI components.
- Keep the navbar's external links present in **both** `.navbar-external-links` and `.navbar-more`
  (one always `display: none` depending on viewport width) — do not remove either copy or the site loses
  GitHub/Documentation/PyPI reachability on narrow viewports again.
- Keep the Carousel's drag-vs-click suppression (`onClickCapture` + moved-threshold tracking); do not
  introduce `setPointerCapture` on the track for mouse pointers without re-verifying it doesn't break
  ordinary side-card clicks (see "Carousel drag/wheel interaction hardening" above for why it was
  avoided).
- `src/styles/model-cards.css` is scoped to the homepage only (imported from `index.astro`); the
  `/technical-cards` skeleton is unchanged and out of scope for this phase.
- Keep the `≤48rem` media query's `visibility: hidden` on the non-selected `±1`/`±2` cards — `opacity:
  0`/`pointer-events: none` alone do not remove an element from the keyboard tab order.
- Keep the carousel track's `keydown` handler guarded by `event.target !== trackRef.current`; without
  it, arrow keys pressed on any focused descendant (links, `<summary>`, other cards' buttons) would
  hijack carousel navigation.
- Do not reintroduce `role="menu"`/`role="menuitem"` on the navbar overflow panel or
  `role="tablist"`/`role="tab"`/`aria-selected` on the carousel dots unless the corresponding full
  ARIA widget keyboard-interaction pattern is actually implemented; use `aria-current` for "the active
  dot", not `aria-selected`.
