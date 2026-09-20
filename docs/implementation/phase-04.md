# Phase 04 — Runtime visualizations, motion, responsive & visual fidelity

## Implemented

- **Full chart family for Technical Cards** (`src/components/technical-cards/RuntimePlots.tsx`,
  rewritten around two shared components, `LineChartCard` for condition-scoped/per-batch metrics and
  `BarChartCard` for card-scoped/single-value metrics): mean latency (line, unchanged heading "Mean
  latency by batch"), throughput (bar, unchanged heading "Throughput at selected batch"), real-time
  factor (line), speed factor (line), RSS sampled-peak memory (bar), and profile energy (bar). Every
  chart renders only when its metric is in the caller's `comparableMetricIds` (the Phase 03
  comparability engine, unmodified) and carries a visible `<ul class="chart-legend">`
  (color swatch + model name as real text) beneath the SVG, in addition to per-point `<title>`
  tooltips — satisfying the "no hover-only critical information" accessibility requirement.
- **Linear/log scale toggle** on the mean-latency chart only (`allowLogScale` prop on
  `LineChartCard`, currently used nowhere else — the real catalogue's RTF/speed-factor/throughput
  ranges don't need it; extending the prop to another metric is a one-line change if a future model
  family needs it). Disabled when any series value is ≤ 0.
- **Normalized Multi-Metric Comparison radar** (`src/data/technical-cards/radar.ts`,
  `src/components/technical-cards/RadarChart.tsx`): comparison-mode only, requires
  `RADAR_MINIMUM_METRICS = 3` eligible axes (registry `normalizationAllowed: true` **and** currently
  comparable) and ≥2 selected models, else omitted entirely (no compact alternate view was added —
  the metric-summary row above it already serves that role). Per-axis min-max normalization within
  the current selection only; "lower is better" axes are inverted for display (labeled "(inv.)");
  a constant-valued axis (including a synthetic duplicate-value case) resolves to the neutral `0.5`
  for every series, never `0`/`1`/`NaN`. Profile energy is excluded solely because the metric
  registry (`src/data/technical-cards/metrics.ts`, unmodified) already marks it
  `normalizationAllowed: false` — the radar module defers to that flag rather than adding its own
  energy special-case. A native `<details>` info disclosure (keyboard/touch operable) documents the
  normalization formula inline, per spec §21's requirement.
- **Metric summary sparklines** (`src/components/technical-cards/MetricSparkline.tsx`): a small
  `aria-hidden` decorative per-model micro bar chart in each comparable metric card's header,
  matching the mockup's small chart icon; `aria-hidden` because the identical raw values are already
  plain text immediately below it in the same card.
- **Motion system** (`src/styles/motion.css`, imported from `global.css` so both pages share it):
  `--motion-duration-sm/md/lg` (180/280/420ms) and `--motion-ease` tokens, plus `plot-card-enter`,
  `chart-series-enter`, and `panel-enter` keyframes applied to the Technical Cards chart grid, chart
  series, and metric-summary/comparability-banner panels. The comparability banner also gets a CSS
  `transition` on background/border/text color for its direct/partial/incompatible changes. The
  existing Phase 01 `prefers-reduced-motion: reduce` rule (previously `transition-duration` only) was
  extended to also collapse `animation-duration`/`animation-iteration-count`, so the new keyframes
  are covered too — verified by a Playwright test using `page.emulateMedia({ reducedMotion: 'reduce' })`.
- **Accessibility**: comparability banner is now `aria-live="polite"` (`role="status"` was already
  present); the scale toggle is a real `<button aria-pressed>` pair; every chart's legend is real DOM
  text, not a hover-only tooltip.
- **Responsive**: `.runtime-plots` changed from a fixed 2-column grid to
  `grid-template-columns: repeat(auto-fit, minmax(15.5rem, 1fr))` with `grid-auto-flow: dense`; the
  radar card spans 2 columns × 2 rows on wide viewports and collapses to a single column at ≤62rem.
  `.metric-summaries` gained a 3-column breakpoint at ≤75rem (it previously jumped from 6 columns
  straight to 1 at ≤40rem).

## Data/logic changes

None. `comparability.ts`, `selectors.ts`, and `metrics.ts` are byte-for-byte unmodified from Phase
03 — this phase is presentation built on top of the existing, already-tested contracts.
`plotData.ts`'s `buildMetricBatchSeries` is reused unchanged for the two new condition-scoped line
charts (RTF, speed factor). `npm run audit:comparability` output is unchanged in shape from Phase 03
(same 8 direct / 40 partial shared contexts across the real 3-model catalogue), confirming no
comparability semantics moved.

## Chart-scope rule (new, worth documenting explicitly)

The metric registry (`src/data/technical-cards/metrics.ts`) marks each metric `scope: 'condition'`
or `scope: 'card'`. Condition-scoped metrics (latency, throughput, RTF, speed factor) vary per
batch-size condition within a Technical Card, so they render as a batch-domain line/bar chart via
`buildMetricBatchSeries`. Card-scoped metrics (RSS sampled peak, profile energy) do **not** vary
with the currently selected batch size in the canonical schema — they describe the whole profiling
resource pass for the card, not a specific condition — so they render as a single-value bar chart at
the currently selected context (`BarChartCard`, reusing `metric.value(point)` directly) rather than a
misleading "vs batch" line. This mirrors the distinction the Phase 01/02/03 journals already
established for RSS/energy; Phase 04 only adds the corresponding chart, it does not change the
underlying scope semantics.

## Files introduced

- `src/data/technical-cards/radar.ts`
- `src/components/technical-cards/RadarChart.tsx`
- `src/components/technical-cards/MetricSparkline.tsx`
- `src/styles/motion.css`
- `tests/unit/radar.test.ts`
- `scripts/capture-phase-04-screenshots.mjs`
- `scripts/create-review-bundle-phase-04.mjs`

## Files modified

- `src/components/technical-cards/RuntimePlots.tsx` — rewritten around shared `LineChartCard`/
  `BarChartCard` components; adds RTF, speed factor, memory, energy charts and radar integration;
  keeps the exact pre-existing headings "Mean latency by batch" / "Throughput at selected batch" and
  the exact pre-existing "Timing plots unavailable" fallback condition (based only on
  latency/throughput availability, not on whether card-scoped charts are showing) for e2e-test/
  behavioral compatibility with Phase 03.
- `src/components/technical-cards/TechnicalCardsExplorer.tsx` — `aria-live="polite"` on the
  comparability banner; wires `MetricSparkline` into each metric card's header.
- `src/styles/technical-cards.css` — new styles for the chart grid reflow, scale toggle, chart
  legends, radar card/body/rings/spokes/series/legend, metric sparkline, and the comparability
  banner's color transition; new `≤75rem` breakpoint for the metric-summary grid; radar/legend
  responsive collapse at `≤62rem`.
- `src/styles/global.css` — imports `motion.css`; extends the reduced-motion rule to animations.
- `tests/unit/runtime-plots.test.tsx`, `tests/e2e/technical-cards.spec.ts` — extended with the new
  chart/radar/scale-toggle/legend/reduced-motion coverage described above.

## Intentional deviations from the mockups

- The mockup's "View Mode" selector is a clickable Single/Compare toggle; the implementation keeps
  it **read-only** (unchanged from Phase 03) because it is derived from the model-selection count
  per spec §16/§19, not an independent user choice — a clickable toggle could let the UI imply a
  comparison the current selection doesn't structurally support.
- The mockup's chart grid (3–4 charts) is smaller than the real registered-metric set (6 metrics);
  showing all of them, plus the radar, means `.runtime-plots` is a contained
  `overflow-y: auto` region at the flagship viewport rather than fitting in one uninterrupted
  screen — the same pattern already accepted for the homepage's `.model-card-columns` in Phase 02.
  See `OPEN_ISSUES.md` in the Phase 04 review bundle for the fuller rationale.
- No A–G grades, marketing badges, or arbitrary ranking were added anywhere (unchanged policy from
  every prior phase).

## Validation

```text
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run audit:comparability
npm run build
npm run test:e2e
```

All commands passed. Astro check: 0 errors/warnings/hints (56 files). Vitest: 8 files / 76 tests (up
from 67: +1 new file `radar.test.ts` with 6 tests, +3 tests appended to `runtime-plots.test.tsx`).
`audit:comparability` output unchanged in shape from Phase 03. Playwright: 37/37 (up from 25 after
Phase 02/03: +5 new tests in `tests/e2e/technical-cards.spec.ts`). Zero browser console errors or
hydration warnings observed during manual Browser-pane QA across both themes, the 5 required
screenshot states, and the mobile/tablet viewports.

Full performance and accessibility details are in the Phase 04 review bundle's `PERFORMANCE.md` and
`ACCESSIBILITY.md`; the mockup-vs-implementation comparison is in `VISUAL_FIDELITY.md`.

## Constraints to preserve (Phase 05 must not break)

- Do not weaken the chart-scope rule above: condition-scoped metrics render as batch-domain
  line/bar charts via `buildMetricBatchSeries`; card-scoped metrics (RSS, energy) render as a
  single-value bar at the current context, never a fabricated "vs batch" series.
- Keep the radar's axis eligibility deferring entirely to `metric.normalizationAllowed` from the
  shared registry — never hardcode an energy (or any other metric) exclusion directly inside
  `radar.ts`; if a metric's normalizability ever changes, it should change in `metrics.ts` and the
  radar should pick it up automatically.
- Keep `RuntimePlots`'s "Timing plots unavailable" fallback keyed only on latency/throughput
  availability (`!anyTimingData`), not on whether other card-scoped charts are rendering alongside
  it — Phase 03's own unit test asserts this exact independent-condition behavior.
- Keep every chart's visible DOM legend (`chart-legend`/`radar-legend`) — do not fall back to
  SVG-`<title>`-only tooltips, which would reintroduce hover-only critical information.
- Keep the reduced-motion rule covering both `transition-duration` and
  `animation-duration`/`animation-iteration-count` in `global.css`; a future animation added to
  either page must not bypass it.
- `MetricSparkline` must stay `aria-hidden` and redundant with visible text — never make it the sole
  carrier of a metric value.

## Correction round

The initial Phase 04 round shipped the chart-family expansion and radar but did not perform the
homepage fidelity pass the prompt required, and its default Technical Cards chart layout forced an
internal scrollbar at the flagship viewport (hiding the radar below the fold). This round addresses
both, plus a set of chart-quality/accessibility items identified in external review. No canonical
data logic, comparability rules, selectors, ingestion, or provenance code was touched.

### 1. Homepage fidelity pass (previously skipped)

- **Brand mark** (`src/components/common/BrandMark.tsx`): a first-party inline SVG 5-bar waveform
  glyph (deterministic, not copied from any external logo) replaces the placeholder `▥` character
  everywhere it appeared — the navbar (`Navbar.astro`) and both Model Card kicker rows
  (`ModelCard.tsx`, compact and expanded). `currentColor` fill makes it theme-aware with one asset.
- **Model visual identity upgrade**: `getModelWaveformVisual` (1-D seeded bar heights) was replaced
  by `getModelSpectrogramVisual` (`src/data/derive/modelVisual.ts`) — a seeded 26×12 intensity grid
  with 2–3 elevated "formant bands" for a genuinely spectrogram-like texture, still fully
  deterministic from `modelId`/`family` and still purely decorative (the `<svg>` `aria-label`
  explicitly says "Decorative generated identity artwork ... not a measured spectrogram", so it is
  never presented as real measured output). `ModelVisual.tsx` renders it as a grid of `<rect>` cells
  with `fillOpacity` per cell, `fill: var(--accent)`, so it is theme-aware without a filter hack.
  `tests/unit/derive.test.ts` was updated to the new function name/shape (determinism, cross-ID
  difference, value-range, and grid-dimension tests).
- **Carousel depth/hierarchy** (`src/styles/model-cards.css`): side cards (`±1`) now render at
  `opacity: 0.86` with a slight `saturate()/brightness()` filter (previously full opacity, flat);
  `±2` cards similarly recede further (`opacity: 0.42`, more desaturation, a 0.3px blur). A static
  radial "stage" glow (`.carousel::before`) sits behind the selected card so the composition reads
  as intentional even with only 3 models cycling through `-1/0/+1`. `--card-gap` was tightened
  slightly so the layered composition feels grouped rather than spread thin. No added 3D
  tilt/motion — everything here is a static transform/filter, unchanged transition timing.
- **Expanded card density** (`src/styles/model-cards.css`, `ModelCard.tsx`): the fact grid, runtime
  verification list, performance profile, and metric rows were all tightened (smaller gaps/font
  sizes, not below practical readability) to reclaim real vertical space rather than just shrinking
  text arbitrarily. Verified with real canonical data: at 1512×827 identity + all scientific facts +
  full runtime verification + the complete Performance Profile are now visible with zero internal
  scroll; at 1366×768 the same is true except the closing performance-scope footnote sentence and
  the provenance links, which remain in a contained, internally-scrollable secondary region. A
  visible (non-hover-only) scroll-fade affordance (`.model-card-columns-scroll-hint`, a `position:
  sticky` gradient at the bottom edge) was added for exactly that remaining secondary-detail case.
- **Footer iconography** (`src/components/common/Icon.tsx`, `FooterStrip.astro`): the four
  heterogeneous emoji (📖🔬🔥🏷️) were replaced with a small first-party stroke-icon set (book,
  flask, layers, tag) sharing one visual language with the new brand mark. Footer copy/meaning is
  unchanged.

### 2. Technical Cards default layout: no chart-workspace scrollbar (previously forced one)

`RuntimePlots.tsx` was restructured around a **default overview** (mean latency line, throughput
bar, and — in comparison mode with ≥3 eligible metrics — the radar) plus an **opt-in "More plots"
toggle row** (`RTF`, `Speed`, `Memory`, `Energy`, each a real `<button aria-pressed>`, shown only
for metrics currently in `comparableMetricIds`). The default three-chart row is sized to the
flagship viewport via a `--plot-columns` CSS custom property so `.runtime-plots` uses exactly as
many columns as there are default charts, instead of Phase 04-round-1's fixed/auto-fit grid.

**A genuine layout bug was found and fixed while verifying this** (not just discovered by
inspection — the first "it looks fine" pass was a scaled-screenshot illusion; the actual
`scrollHeight − clientHeight` was re-measured programmatically and found to be 114–465px depending
on selection): two CSS rules using a broad descendant selector — `.plot-card svg { width: 100%;
height: 100% }` and `.radar-body svg { width: 100%; height: 100% }` — unintentionally matched the
small `<svg class="legend-marker">` icons nested inside `.chart-legend`/`.radar-legend` (they are
also `<svg>` descendants of `.plot-card`/`.radar-body`), overriding their own `width={12}
height={12}` attributes. Combined with an indefinite percentage-height ancestor chain, this
inflated each legend marker to ~190px square, which inflated its containing `<li>`, which inflated
`.radar-legend`, which forced the whole chart row far past the available height. Fixed by (a)
excluding `.legend-marker` explicitly (`.plot-card svg:not(.legend-marker)`) and (b) scoping the
radar rule to a direct-child combinator (`.radar-body > svg`) so it can never reach the nested
legend icons. `.radar-body`/`.radar-legend` also needed explicit `grid-template-rows: minmax(0,
1fr)` — without it, CSS Grid's default `grid-auto-rows: auto` re-introduces the same "indefinite
percentage-height ancestor" problem even with a definite-height *container*, because the
*implicit row* inside that container is still content-sized by default.

**Verified with real programmatic measurement, not a visual screenshot glance**, for every
captured screenshot scenario: `runtime-plots.scrollHeight − clientHeight` is `0` for the 2-model
direct comparison, and `≤ 6px` (a sub-visible rounding/border artifact, not an actual scrollbar) for
the default 3-model partial comparison — at both 1512×827 and 1366×768. `tests/e2e/technical-cards.spec.ts`'s
rewritten radar test asserts this with `toPass()` polling on the real DOM measurement, not a
screenshot diff, specifically so this class of bug cannot silently return.

### 3. Card-scoped chart titles corrected

"Memory usage at selected batch" → **"RSS sampled peak"** and "Profile energy at selected batch" →
**"Profile energy"**, both with subtitles explicitly stating "not batch-dependent" / "whole
profiling process/resource pass" — these two metrics are card-scoped (constant across the batch
conditions within a card), so the old titles falsely implied a batch dependency that does not
exist in the canonical schema.

### 4. Line-chart readability

`src/data/technical-cards/ticks.ts` (new): `linearAxisTicks` (Heckbert "nice number" rounding, ~5
ticks from 0) and `logAxisTicks` (decade ticks). `LineChartCard`/`BarChartCard` now render subtle
horizontal gridlines and Y-axis tick labels at those values, using the metric's own `format()` (no
fabricated precision). Bar-chart X labels changed from bare `1`/`2` to `#1`/`#2`, matching the
same `#N` numbering already used in the metric-summary cards and evidence strip.

### 5. Chart traceability: a "Data & evidence" disclosure per chart

Every `LineChartCard`/`BarChartCard`/`RadarChart` now has a native `<details class="chart-data">`
(closed by default, keyboard/touch operable, never hover-only) containing a real `<table>` of every
plotted point: model, batch (omitted for card-scoped/non-batch-dependent metrics — never inventing
a batch association for RSS/energy), raw value + unit, device/backend, execution regime, protocol
+ version, and Technical Card ID (`point.card.id`). The SVG `<title>` hover tooltips are unchanged
(still present as a pointer convenience) but are no longer the only way to reach this information.

### 6. Non-color series encoding (color + shape/marker + line style)

`src/data/technical-cards/seriesStyle.ts` (new): `createModelSeriesStyleMap`, keyed by the same
sorted-model-ID order `createModelColorMap` already uses, assigns each model a stable
`{shape, dashArray}` pair from a 5-entry palette (circle/solid, square/dashed, diamond/dotted,
triangle/dash-dot, cross/long-dash) — never randomized per render, never changing the existing
stable colors. `SeriesMarker.tsx` (new) renders each shape as an SVG primitive at data points (line
charts, radar vertices) and as a small legend glyph (`LegendMarkerIcon`) in every
`chart-legend`/`radar-legend`. Bar charts additionally render the shape glyph above each bar (on
top of the `#N` text label) so identity there isn't color-only either. `tests/unit/runtime-plots.test.tsx`
asserts every selected model gets a distinct shape AND a distinct dash array.

### 7. Radar: removed the `?? 0` fallback, added defensive axis validation

`buildRadarChartData` (`src/data/technical-cards/radar.ts`) previously wrote
`metric.value(point) ?? 0` when building each axis point — defensively wrong even though the
comparability engine should already guarantee non-null values for any metric in
`comparableMetricIds`. It now validates every candidate axis with `points.every(point =>
Number.isFinite(metric.value(point)))` and **drops the whole axis** (never substitutes a value) if
any point is missing it, re-checking `RADAR_MINIMUM_METRICS` only after that filtering. Two new
regression tests in `tests/unit/radar.test.ts` cover both outcomes: dropping the affected axis
while keeping the radar (enough other valid axes remain) and refusing the whole radar (`null`) when
too few valid axes remain — in neither case does a raw value of exactly `0` appear for the mutated
metric.

### 8. Energy availability legibility

The energy metric-summary card (`TechnicalCardsExplorer.tsx`) now shows a small, color-and-text
`.energy-state-chip` (`data-state="partial"|"unavailable"|"failed"`) instead of the same generic
"Not mutually available" text every other non-comparable metric uses, whenever energy specifically
is not comparable — energy comparability logic itself (`comparability.ts`) is unchanged. The
previous always-visible `<small title="...">` per-card technical breakdown (hover-only) is now a
native `<details class="energy-detail">` disclosure ("Why" / "Why not comparable"), shown for both
comparable and non-comparable states, listing each selected model's measurement kind, availability,
provider, privilege, and component-coverage gaps as real text.

### Files introduced (this round)

- `src/components/common/BrandMark.tsx`, `src/components/common/Icon.tsx`
- `src/components/technical-cards/SeriesMarker.tsx`
- `src/data/technical-cards/seriesStyle.ts`, `src/data/technical-cards/ticks.ts`

### Files modified (this round, beyond the files already listed above)

- `src/components/navigation/Navbar.astro`, `src/components/model-cards/ModelCard.tsx`,
  `src/components/model-cards/ModelVisual.tsx`, `src/components/model-cards/FooterStrip.astro`
- `src/data/derive/modelVisual.ts` (renamed export)
- `src/styles/model-cards.css`, `src/styles/global.css` (brand-mark rule)
- `src/data/technical-cards/radar.ts`, `src/components/technical-cards/RadarChart.tsx`,
  `src/components/technical-cards/RuntimePlots.tsx`, `src/components/technical-cards/TechnicalCardsExplorer.tsx`
- `src/styles/technical-cards.css`
- `tests/unit/derive.test.ts`, `tests/unit/radar.test.ts`, `tests/unit/runtime-plots.test.tsx`,
  `tests/e2e/technical-cards.spec.ts`
- `scripts/capture-phase-04-screenshots.mjs`, `scripts/create-review-bundle-phase-04.mjs`

### Validation (correction round)

Same command sequence as before (`sync:data` → `validate:data` → `check` → `test` →
`audit:comparability` → `build` → `test:e2e`), all passing: Astro check 0/0/0 (61 files); Vitest 8
files / 80 tests (up from 76: +4 in `derive.test.ts` for the spectrogram rename, unit counts for
radar/runtime-plots unchanged in file count but content updated); `audit:comparability` output
unchanged in shape (8 direct / 40 partial); Playwright 37/37 (3 tests updated for the new default
opt-in-plot behavior and energy-chip UI, 1 new assertion added for the scrollbar regression). Zero
console/hydration errors observed.

### Additional constraints to preserve (this round)

- Never write a bare `svg { width/height: 100% }`-style rule scoped only by an ancestor class
  (`.plot-card svg`, `.radar-body svg`, etc.) without excluding `.legend-marker` or using a
  direct-child combinator — this exact mistake silently broke the "no chart-workspace scrollbar"
  requirement once already (see §2 above) and is easy to reintroduce with a similarly broad
  selector on a future chart addition.
- Any CSS grid/flex container that must give a percentage-sized child (typically an `<svg
  height="100%">`) a real definite height needs an unbroken chain of `min-height: 0` (flex) and
  explicit `grid-template-rows: minmax(0, 1fr)` (grid, NOT just `grid-auto-rows` on a container
  with only implicit rows) at every level — verify with a real `scrollHeight`/`clientHeight`
  JS measurement after any change to `.runtime-plots`/`.radar-body`, not a downscaled screenshot.
- Keep `getModelSpectrogramVisual`'s `aria-label` explicit about the artwork being decorative and
  not a measured spectrogram — do not let a future visual upgrade drop that qualifier.
- Keep the "More plots" toggle row's default state empty (RTF/Speed/Memory/Energy start hidden) —
  the flagship no-scrollbar guarantee depends on the default composition staying at ≤3 charts.
- Keep `buildRadarChartData`'s per-axis finite-value validation; never reintroduce a `?? 0`
  (or any other) fallback for a missing metric value.

## Second correction round

Four bounded fixes, verified with real Playwright measurements (not manual visual/screenshot
checks — see the note below on why that distinction mattered this round). No canonical data,
comparability logic, or Phase 03 code was touched.

### 1. Complete Runtime verification visible at 1366×768

The expanded Model Card's secondary content (the "Upstream metric note" caveat and the
"Provenance links") is now behind two collapsed-by-default `<details>` disclosures
(`.upstream-caveat-detail`, `.provenance-links-detail`) instead of always-rendered inline text —
they remain one click away, never removed. `PerformanceProfile`'s explanatory footnote is
similarly now a collapsed `.performance-scope-detail`. Combined with a further density pass on
`.fact-grid` (gap 0.2rem→0.14rem, `dd` font-size 0.76rem→0.74rem), the complete Runtime
verification block (all backend rows) and the complete Performance Profile (all 4 metric rows) are
now visible at 1366×768 with **13.8px of margin to spare**, without shrinking any primary text
below its previous size. At 1512×827 the detail column now has **zero** internal overflow (down
from provenance-links alone previously requiring scroll there too).

New regression: `tests/e2e/home.spec.ts` — "at 1366x768 the complete Runtime verification block is
visible ... without scrolling the detail column" asserts every `.runtime-verification li` AND
every `.metric-row`'s bottom edge lies within `.model-card-columns`'s visible bounds (not just the
section heading).

### 2. Default 3-model runtime-plots overflow

Investigation found the previously-reported "~6px" was **not a real layout defect**: manual
`javascript_tool` measurements in this session's own Browser pane were catching the chart cards'
`plot-card-enter` entrance animation (`transform: translateY(6px) → translateY(0)`) mid-flight,
because tool-call-driven navigation in that pane doesn't reliably let a CSS animation reach its
`animation-fill-mode: both` end state before the next measurement — `getComputedStyle` on a probe
card showed `animationPlayState: "running"` with a live `translateY(6, ...)` transform matrix
seconds after load. A dedicated throwaway Playwright script (real, properly-scheduled browser
frames, not the interactive pane) measured **exactly 0px** overflow for all four required
scenarios (1512/1366 × default-3-model/2-model-direct) both before and after this round's CSS
changes. The lesson generalizes: **`toPass()`-polling Playwright assertions, not manual browser-
pane `javascript_tool` snapshots, are the authoritative measurement for this kind of layout
regression** — the pane can be occluded/backgrounded during a long tool-call sequence in ways a
real test runner is not.

That said, several defensive CSS robustness fixes were applied while investigating (harmless, and
arguably correct regardless): `.runtime-plots-panel` changed from `display: flex` to
`display: grid; grid-template-rows: auto minmax(0, 1fr);` (grid's row-track algorithm is more
predictable than flex's hypothetical-size-then-shrink model for a deeply nested grid-in-grid);
`.chart-legend li` gained `white-space: nowrap` (parity with `.radar-legend li`, prevents
individual legend text from wrapping at narrow column widths); `.radar-legend` gained explicit
`min-height: 0; overflow: hidden` (defends against the same automatic-minimum-size class of issue
documented in the first correction round's CSS-selector finding).

New regression: `tests/e2e/technical-cards.spec.ts` — "the default initial 3-model partial state
has no chart-workspace scrollbar at 1512x827 or 1366x768" exercises the actual default (unmodified
selection) 3-model state at both viewports with `toPass()` polling; the existing 2-model direct
test was extended to check both viewports too (previously 1512×827 only).

### 3. Radar Data & evidence traceability

`RadarChart` now receives `points: ResolvedRuntimePoint[]` (threaded from `RuntimePlots`, which
already had them) and builds a `Map<modelId, PlotPointContext>` via a new shared helper,
`pointContext()` in `src/data/technical-cards/plotData.ts` — extracted from what was a
`RuntimePlots`-local `contextLabel()` function so all three chart families (line, bar, radar) read
the exact same fields from the exact same source (`point.condition.batchSize`,
`point.card.context.{deviceBackend,deviceLabel,threadRegime,protocolId,protocolVersion}`,
`point.card.id`) — nothing invented. The radar's "Data & evidence" table gained `Batch`,
`Device / backend`, `Regime`, `Protocol`, and `Technical Card` columns ahead of the existing
per-axis raw-value columns.

New regression: `tests/unit/runtime-plots.test.tsx` — "gives the radar chart a Data & evidence
table with full runtime context/provenance" asserts, for every resolved point, that its Technical
Card ID, batch size, device backend, and protocol ID appear within the radar section of the
rendered markup.

### 4. Legend represents both marker shape and line dash

`LegendMarkerIcon` (`SeriesMarker.tsx`) gained an optional `showLine`/`dashArray` mode: when
`showLine` is true (now passed by every line-chart and the radar legend), it renders a short
horizontal line sampled in the model's real `strokeDasharray` (including `undefined` → solid,
which is itself a meaningful pattern, not "no line") with the marker centered on it, inside a
wider `viewBox="0 0 28 16"`; when false (bar-chart legends, unchanged), it renders the original
marker-only glyph. No second style-mapping was created — both paths read the same
`SeriesStyle`/`createModelSeriesStyleMap` values already established in the first correction
round.

New regression: `tests/unit/runtime-plots.test.tsx` — "represents both the marker shape AND the
line dash pattern in line/radar legend samples" asserts at least `2 × modelCount` dashed-line
legend swatches are present (latency chart + radar, 2 models each in the fixture), that every
non-solid model's exact `stroke-dasharray` value appears in the markup, and that the throughput
bar chart's legend section contains **no** dashed-line swatch.

### Files modified (second correction round)

- `src/components/model-cards/ModelCard.tsx`, `src/components/model-cards/PerformanceProfile.tsx`,
  `src/styles/model-cards.css` (item 1)
- `src/styles/technical-cards.css` (item 2, defensive fixes)
- `tests/e2e/home.spec.ts`, `tests/e2e/technical-cards.spec.ts` (items 1–2 regressions)
- `src/data/technical-cards/plotData.ts` (new `pointContext` export),
  `src/components/technical-cards/RadarChart.tsx`, `src/components/technical-cards/RuntimePlots.tsx`
  (item 3)
- `src/components/technical-cards/SeriesMarker.tsx`, `src/components/technical-cards/RuntimePlots.tsx`,
  `src/components/technical-cards/RadarChart.tsx` (item 4)
- `tests/unit/runtime-plots.test.tsx` (items 3–4 regressions)

### Validation (second correction round)

Full gate re-run, all passing: Astro check 0/0/0 (61 files); Vitest 8 files / 82 tests (up from 80:
+1 radar-evidence test, +1 legend-dash test); `audit:comparability` unchanged (8 direct / 40
partial); Playwright 39/39 (up from 37: +2 new tests for items 1–2, the existing 2-model-direct
test extended to cover both viewports).

### Additional constraints to preserve (second correction round)

- Keep `.upstream-caveat-detail`/`.provenance-links-detail`/`.performance-scope-detail` as
  collapsed-by-default `<details>`, not always-rendered text — reintroducing always-visible
  secondary content at this density will reopen the 1366×768 clipping this round closed.
- When measuring any chart-workspace/detail-column overflow by hand in a tool-driven browser
  session, wait for (or explicitly re-check after) the `plot-card-enter`/`chart-series-enter`
  entrance animations to finish, or prefer a Playwright `toPass()`-polling assertion — a
  `javascript_tool` snapshot taken while the pane is occluded can report a phantom ~6px offset
  from a stuck mid-animation transform that does not reflect real user-facing rendering.
- Keep `pointContext()` as the single source of per-point runtime-context fields for chart evidence
  tables (line, bar, and radar) — do not let the radar (or any future chart) re-derive or hardcode
  these fields separately.
- Keep `LegendMarkerIcon`'s `showLine` opt-in explicit per caller (`true` for line/radar, omitted
  for bar) rather than inferring it from `dashArray` being defined/undefined — `dashArray:
  undefined` is a valid, meaningful "solid line" value for a line/radar series, not an absence of
  a line to draw.
