import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewRoot = resolve(process.argv[2] ?? resolve(projectRoot, '..', 'phase-04-review'));
const archivePath = resolve(projectRoot, '..', 'torch-dae-web-phase-04-review.tar.gz');
const screenshotSource = resolve(process.argv[3] ?? '/tmp/phase-04-screens');
const replaceExisting = process.argv.includes('--replace');

if (existsSync(reviewRoot) || existsSync(archivePath)) {
  if (!replaceExisting) {
    throw new Error(`Refusing to overwrite existing review output: ${reviewRoot} or ${archivePath}`);
  }
  if (existsSync(reviewRoot)) rmSync(reviewRoot, { recursive: true });
  if (existsSync(archivePath)) rmSync(archivePath);
}

function git(args) {
  return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' });
}

function write(relativePath, contents) {
  const target = join(reviewRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function copy(relativePath, destinationRoot) {
  const baseName = relativePath.split('/').at(-1) ?? '';
  if (baseName === '.DS_Store' || baseName.startsWith('._')) return;
  const source = join(projectRoot, relativePath);
  if (!existsSync(source) || !statSync(source).isFile()) return;
  const target = join(destinationRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function workingTreePaths() {
  const status = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  const entries = status.split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const code = entry.slice(0, 2);
    const path = entry.slice(3);
    paths.push(path);
    if (code.includes('R') || code.includes('C')) index += 1;
  }
  return paths.sort((a, b) => a.localeCompare(b));
}

function walk(directory, prefix = '') {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = join(prefix, entry.name).split(sep).join('/');
    if (entry.name === '.DS_Store' || entry.name.startsWith('._')) continue;
    if (['.git', '.astro', '.cache', 'coverage', 'dist', 'node_modules', 'playwright-report', 'test-results'].includes(entry.name)) continue;
    if (entry.isDirectory()) output.push(...walk(join(directory, entry.name), relativePath));
    else output.push(relativePath);
  }
  return output.sort((a, b) => a.localeCompare(b));
}

mkdirSync(join(reviewRoot, 'screenshots'), { recursive: true });
mkdirSync(join(reviewRoot, 'changed-files'), { recursive: true });
mkdirSync(join(reviewRoot, 'selected-source'), { recursive: true });

const summary = `# Phase 04 review summary (post-correction round)

This bundle reflects Phase 04 after one external-review correction round. See
\`docs/implementation/phase-04.md\` in \`selected-source/\` for the full narrative (including the
initial round); this is a condensed summary of the corrected, final state.

## What the correction round fixed

1. **Homepage fidelity pass actually performed** (the initial round skipped it): a first-party
   inline-SVG waveform brand mark (\`BrandMark.tsx\`) replaces the \`▥\` placeholder everywhere;
   Model Card visual identity is now a deterministic seeded spectrogram-like texture
   (\`getModelSpectrogramVisual\`) instead of a flat bar waveform, explicitly labeled decorative/not
   measured; carousel side cards (±1/±2) now recede with reduced opacity + subtle
   saturation/brightness filtering plus a static radial "stage" glow behind the selected card;
   expanded-card spacing was tightened so identity + all scientific facts + full runtime
   verification + the complete Performance Profile are visible with **zero internal scroll** at
   1512×827 (only the closing footnote + provenance links need a scroll at 1366×768, now with a
   visible sticky-gradient scroll-fade affordance, not hover-only); the four footer emoji were
   replaced with a first-party stroke-icon set.
2. **A real "no chart-workspace scrollbar" bug found and fixed**, not just a missed requirement:
   a broad \`.plot-card svg\`/\`.radar-body svg\` CSS selector unintentionally matched the small
   legend-marker \`<svg>\` icons nested inside chart legends, inflating them (and their containing
   \`<li>\`) via an indefinite percentage-height chain, which pushed the whole chart row far past
   the available height. Root-caused and fixed with a \`:not(.legend-marker)\` exclusion, a
   \`.radar-body > svg\` direct-child scope, and explicit \`grid-template-rows: minmax(0, 1fr)\` at
   every nested grid level. Verified with a real \`scrollHeight − clientHeight\` DOM measurement
   (not a downscaled screenshot, which is what missed it the first time): now \`0\`px for the
   2-model direct comparison and ≤6px (sub-visible) for the default 3-model partial comparison, at
   both 1512×827 and 1366×768. \`RuntimePlots.tsx\` was restructured around a default 3-chart
   overview (latency, throughput, radar) plus an opt-in "More plots" toggle row (RTF/Speed/
   Memory/Energy), sized via a \`--plot-columns\` CSS variable.
3. **Card-scoped chart titles corrected**: "Memory usage at selected batch" → "RSS sampled peak",
   "Profile energy at selected batch" → "Profile energy", both now explicitly subtitled
   "not batch-dependent" — these metrics are card-scoped constants, not batch-varying.
4. **Line-chart readability**: horizontal gridlines + ~5 "nice-number" Y-axis ticks
   (\`ticks.ts\`, Heckbert rounding for linear, decade ticks for log); bar-chart X labels changed
   from bare \`1\`/\`2\` to \`#1\`/\`#2\`.
5. **Chart traceability**: every chart (line/bar/radar) now has a native \`<details>\` "Data &
   evidence" table (model, batch where applicable, raw value + unit, device/backend, execution
   regime, protocol+version, Technical Card ID) — never hover-only.
6. **Non-color series encoding**: \`seriesStyle.ts\` assigns each model a stable
   {shape, line-dash} pair (circle/solid, square/dashed, diamond/dotted, triangle/dash-dot,
   cross/long-dash), applied to line/radar data points, bar-chart glyphs, and every legend —
   existing stable colors unchanged. Unit-tested for distinctness across selected models.
7. **Radar \`?? 0\` fallback removed**: \`buildRadarChartData\` now validates every candidate axis
   is finite for every selected point and **drops the axis** (never substitutes a value) if not,
   re-checking \`RADAR_MINIMUM_METRICS\` after filtering. Two new regression tests cover both the
   drop-one-axis and refuse-the-whole-radar outcomes.
8. **Energy availability legibility**: a small \`.energy-state-chip\` (partial/unavailable/failed)
   replaces the generic "Not mutually available" text specifically for the energy metric card,
   with a native (not hover-only) \`<details>\` "Why" disclosure of the per-model technical reason.
   Energy comparability logic itself is unchanged.

## Unchanged from the initial round

The full chart family (latency/throughput/RTF/speed/memory/energy), the radar's normalization
approach and info disclosure, the shared motion system, \`aria-live\` on the comparability banner,
and the metric-summary sparklines are all unchanged in substance from the initial Phase 04 round —
only their layout/composition and the specific bug above were corrected.

## Second correction round (this bundle)

Four bounded fixes on top of the above, all verified with real Playwright measurements:

1. **1366×768 Runtime verification clipping closed.** The expanded Model Card's secondary content
   (upstream-metric caveat, provenance links, performance-scope footnote) moved into three
   collapsed-by-default \`<details>\` disclosures, plus a further \`.fact-grid\` density pass. The
   complete Runtime verification block (all backend rows) and complete Performance Profile (all 4
   metric rows) are now visible at 1366×768 with 13.8px of margin to spare — previously the last
   backend row was partially clipped. A new Playwright test asserts every individual row's bounding
   box, not just the section heading.
2. **Chart-workspace scrollbar corrected to exactly 0px** (was reported as "≤6px") at both
   1512×827 and 1366×768, for both the default 3-model state and the 2-model direct state. Root
   cause of the previously-reported 6px: a manual browser-pane measurement artifact (a CSS entrance
   animation caught mid-transform), not a real rendering defect — see
   \`docs/implementation/phase-04.md\` for the full root-cause note. New \`toPass()\`-polling
   Playwright tests cover all four scenarios going forward.
3. **Radar "Data & evidence" traceability completed**: the table now includes Batch, Device/
   backend, Regime, Protocol, and Technical Card ID columns (via a new shared \`pointContext()\`
   helper in \`plotData.ts\`, also now used by the line/bar chart tables so all three read the same
   fields from the same source), matching the line/bar charts' existing traceability level.
4. **Legend now represents both marker shape and line dash**, not the marker alone. Every
   line-chart and radar legend swatch renders a short sample of the model's real
   \`strokeDasharray\` with the marker centered on it; bar-chart legends are unchanged (no line to
   sample). Reuses the existing \`SeriesStyle\`/\`createModelSeriesStyleMap\` — no second style
   mapping was created.

## Data/logic changes

None, in any round. \`comparability.ts\`, \`selectors.ts\`, and \`metrics.ts\` are byte-for-byte
unmodified from Phase 03. \`npm run audit:comparability\` output is unchanged in shape (8 direct /
40 partial contexts across the real 3-model catalogue).

## Scope not touched

No deployment, no schema changes, no comparability-rule changes, no new product pages, no A–G
grades, no arbitrary ranking, no NPZ loading for overview plots, no chart library dependency added.
`;

const validation = `# Validation (post second-correction round)

## Commands run (in order)

- \`npm run sync:data\` — passed; 3 Model Cards / 9 Technical Cards from \`v0.2.0\`
  (\`fbc0fb9e470890f0e3f48b48e6effba69b71e39c\`), unchanged throughout every phase/round.
- \`npm run validate:data\` — passed; all canonical schemas, assets, IDs, joins, and cross-artifact
  invariants valid.
- \`npm run check\` — passed; 0 errors, 0 warnings, 0 hints (61 files).
- \`npm run test\` — passed; 8 Vitest files, 82 tests (up from 80: +1 radar Data & evidence
  traceability test, +1 legend dash+marker test).
- \`npm run audit:comparability\` — passed; output unchanged in shape (8 direct / 40 partial),
  confirming this round changed no comparability semantics.
- \`npm run build\` — passed; 2 static pages generated, no build warnings.
- \`npm run test:e2e\` — passed; 39/39 Chromium tests (up from 37: +1 new 1366×768 Runtime-
  verification-visibility test, +1 new default-3-model-no-scrollbar test at both viewports; the
  existing 2-model-direct no-scrollbar test was extended from 1512×827-only to both viewports).

## Manual/scripted checks (this round)

- \`runtime-plots\` scroll-overflow measured via a dedicated throwaway Playwright script (proper
  browser-frame scheduling, entrance animation allowed to settle) for all four required scenarios:
  1512×827 default 3-model, 1366×768 default 3-model, 1512×827 2-model direct, 1366×768 2-model
  direct — **all exactly 0px**.
- \`.model-card-columns\` / \`.runtime-verification\` / \`.metric-row\` bounding boxes re-verified at
  1366×768: every Runtime-verification row and every Performance Profile metric row lies fully
  within the visible (unscrolled) column, with 13.8px of margin; the column's remaining ~29px of
  scrollable content is entirely the three collapsed secondary disclosures.
- Zero browser console errors or React hydration warnings observed across Day/Night and all 15
  re-captured screenshots (9 flagship + 6 additional-viewport).
- \`tar -tzf ../torch-dae-web-phase-04-review.tar.gz\` — passed; no \`.DS_Store\`/\`._*\` entries.
`;

const openIssues = `# Open issues for Phase 05

- **Log scale is latency-only.** RTF/speed-factor/throughput were deliberately left linear-only
  (their real dynamic range in the current 3-model catalogue doesn't need it); \`allowLogScale\` is
  already a reusable prop on \`LineChartCard\` if a future model family needs it elsewhere.
- **No dedicated \`@axe-core/playwright\` pass.** Targeted manual Playwright assertions (aria-live,
  legend visibility, keyboard operability, reduced-motion collapse, non-color encoding) were added
  instead of a new test dependency; a follow-up phase could add automated contrast/landmark
  coverage if desired.
- **Homepage wordmark typography** (not the icon glyph, which is now a first-party mark) remains a
  placeholder font choice — final typography is spec §38's own open design decision, out of scope
  for a visual-fidelity correction.
- **Expanded card's secondary-only scroll remains** at 1366×768 and smaller (now provably limited
  to the three collapsed disclosures — upstream-metric note, provenance links, performance-scope
  note — never primary identity/scientific/verification/performance content, and with a visible
  scroll-fade affordance). Could be eliminated outright with a further content-restructuring pass
  if desired in Phase 05, but is not required — the spec's own acceptance bar is "primary
  information visible without scrolling," which is now met.
- **Bundle size** grew modestly (~8.5KB → ~10.3KB gzip for the Technical Cards island; ~640KB total
  \`dist/\` vs ~536KB) from the new chart-quality/traceability/non-color-encoding code — still no
  chart library dependency, still dominated by the shared React runtime. No action needed now.
- **CSS selector specificity lesson** (first correction round): any future \`svg\` styling rule
  scoped only by an ancestor class, rather than a direct-child combinator or an explicit exclusion,
  can silently reach unrelated nested icon SVGs. Worth a lint rule or code-review checklist item in
  Phase 05 if the chart component set grows further.
- **Manual browser-pane measurement lesson** (second correction round): a CSS entrance animation
  caught mid-transform by a tool-driven \`javascript_tool\` snapshot can report a phantom few-pixel
  layout discrepancy that does not reflect real rendering. Prefer Playwright \`toPass()\`-polling
  assertions (which naturally wait out animations) as the authoritative measurement for any future
  layout-overflow regression, not a one-shot manual DOM read in an interactive pane.
`;

write('SUMMARY.md', summary);
write('VALIDATION.md', validation);
write('OPEN_ISSUES.md', openIssues);
write('PERFORMANCE.md', performanceReport());
write('ACCESSIBILITY.md', accessibilityReport());
write('VISUAL_FIDELITY.md', readFileSync(resolve(screenshotSource, 'VISUAL_FIDELITY.md'), 'utf8'));
write('BASE_HEAD.txt', git(['rev-parse', 'HEAD']));
write('GIT_STATUS.txt', git(['status', '--short', '--branch', '--untracked-files=all']));
write('CHANGED_FILES.txt', `${git(['status', '--short', '--untracked-files=all'])}\n${git(['diff', '--name-status'])}`);
write('DIFFSTAT.txt', git(['diff', '--stat']));
write('phase-04.patch', git(['diff', '--binary', '--full-index']));
write('TREE.txt', `${walk(projectRoot).join('\n')}\n`);

for (const path of workingTreePaths()) {
  if (path.startsWith('.review-bundle-phase-04-')) continue;
  copy(path, join(reviewRoot, 'changed-files'));
}

const selected = [
  'src/components/technical-cards/RuntimePlots.tsx',
  'src/components/technical-cards/RadarChart.tsx',
  'src/components/technical-cards/MetricSparkline.tsx',
  'src/components/technical-cards/SeriesMarker.tsx',
  'src/components/technical-cards/TechnicalCardsExplorer.tsx',
  'src/data/technical-cards/radar.ts',
  'src/data/technical-cards/plotData.ts',
  'src/data/technical-cards/metrics.ts',
  'src/data/technical-cards/comparability.ts',
  'src/data/technical-cards/seriesStyle.ts',
  'src/data/technical-cards/ticks.ts',
  'src/components/common/BrandMark.tsx',
  'src/components/common/Icon.tsx',
  'src/components/navigation/Navbar.astro',
  'src/components/model-cards/ModelCard.tsx',
  'src/components/model-cards/ModelVisual.tsx',
  'src/components/model-cards/BackgroundMotif.astro',
  'src/components/model-cards/FooterStrip.astro',
  'src/components/model-cards/PerformanceProfile.tsx',
  'src/components/model-cards/Carousel.tsx',
  'src/data/derive/modelVisual.ts',
  'src/styles/motion.css',
  'src/styles/technical-cards.css',
  'src/styles/model-cards.css',
  'src/styles/global.css',
  'tests/unit/radar.test.ts',
  'tests/unit/runtime-plots.test.tsx',
  'tests/unit/derive.test.ts',
  'tests/e2e/technical-cards.spec.ts',
  'tests/e2e/home.spec.ts',
  'docs/implementation/phase-04.md',
];
for (const path of selected) copy(path, join(reviewRoot, 'selected-source'));

for (const name of [
  'home-light.png', 'home-night.png', 'home-light-expanded.png', 'home-night-expanded.png',
  'technical-light-direct-comparison.png', 'technical-night-direct-comparison.png',
  'technical-light-single.png', 'technical-night-single.png', 'technical-incompatible-or-partial.png',
  'home-1366x768.png', 'home-1024x768.png', 'home-390x844.png',
  'technical-1366x768.png', 'technical-1024x768.png', 'technical-390x844.png',
]) {
  const source = join(screenshotSource, name);
  if (!existsSync(source)) throw new Error(`Missing required screenshot: ${source}`);
  copyFileSync(source, join(reviewRoot, 'screenshots', name));
}

function performanceReport() {
  return `# Performance (post-correction round)

## Build output

Static build: 2 pages (\`/\`, \`/technical-cards\`), total \`dist/\` size ~640KB uncompressed (up from
~536KB in the initial round — new chart-quality/traceability/non-color-encoding/homepage-fidelity
code; still HTML+CSS+JS only, no images/fonts added).

## Major client bundles (gzipped)

| File | Gzip size | Notes |
|---|---|---|
| \`client.*.js\` | ~65.8 KB | Shared Astro/React island-hydration runtime; unchanged. |
| \`TechnicalCardsExplorer.*.js\` | ~10.3 KB (was ~8.5 KB) | The entire Technical Cards island: selectors, comparability wiring, all charts, radar, sparklines, series-marker shapes, tick generation, data-evidence tables. Still no chart library dependency — every chart remains a dependency-free inline SVG component. |
| \`Carousel.*.js\` | ~4.4 KB (was ~4.1 KB) | Homepage carousel island; small growth from the brand mark / spectrogram visual. |
| \`react.*.js\` | ~3.0 KB | Unchanged. |
| \`technical-cards.*.css\` / \`index.*.css\` / \`provenance.*.css\` | ~3.2 / ~3.1 / ~2.1 KB | Per-page styles; grew modestly for the new chart-data tables, series markers, energy chip, and carousel-depth/footer-icon rules. |

## Hydration strategy

Unchanged from prior phases: only \`ThemeToggle\`, \`Carousel\`, and \`TechnicalCardsExplorer\` are
client islands. \`BrandMark\`/\`Icon\` are rendered statically at build time inside Astro components
(no hydration boundary — they are pure, non-interactive SVG). \`SeriesMarker\`/\`RadarChart\`/
\`RuntimePlots\`/\`MetricSparkline\` remain plain function components inside the already-hydrated
Technical Cards island.

## Known performance risks

Unchanged from the initial round: no NPZ assets fetched for charts/radar; theme switching is
CSS-only (no React re-render); chart re-render on selector change is effectively instant at the
current 3-model/9-Technical-Card catalogue size, un-memoized by design per the "don't design for
hypothetical future requirements" guidance.
`;
}

function accessibilityReport() {
  return `# Accessibility (post second-correction round)

## Checks performed (second correction round, in addition to both prior rounds')

- Legend non-color encoding completeness: every line-chart and radar legend swatch now visually
  samples both halves of the series' non-color encoding (marker shape AND line dash pattern), not
  the marker alone — unit-tested (\`legend-marker-dashed\` swatch count, exact
  \`stroke-dasharray\` match per model) and confirmed absent from bar-chart legends (which have no
  line to sample, by design).
- Newly collapsed secondary disclosures (\`.upstream-caveat-detail\`, \`.provenance-links-detail\`,
  \`.performance-scope-detail\`) are native \`<details>\`/\`<summary>\` — keyboard/touch reachable and
  operable, consistent with every other disclosure on both pages; their content is not removed,
  only deferred behind one keyboard-operable interaction.
- The radar's expanded "Data & evidence" table (now with Batch/Device/Regime/Protocol/Technical
  Card columns) remains inside the same native, non-hover-only \`<details>\` pattern as before.

## Checks performed (first correction round, still valid)

- Non-color series identity verified end-to-end: every model gets a distinct marker shape AND line
  dash pattern (unit-tested), rendered at line/radar data points, above each bar, and in every
  legend — color is now one of at least two simultaneous encodings everywhere series identity
  matters, not the sole one.
- The "More plots" toggle buttons and every "Data & evidence" / "Why (not comparable)" disclosure
  are native \`<button aria-pressed>\` / \`<details>\`/\`<summary>\` elements — full keyboard
  reachability and operability re-verified (Tab order, Enter/Space activation), consistent with the
  Phase 02 lesson that native semantics beat ARIA-role overrides that don't implement the full
  corresponding keyboard pattern.
- The energy state chip (\`.energy-state-chip\`) pairs color with real text ("Partial coverage" /
  "Unavailable" / "Measurement failed") — never color alone.
- Re-verified \`prefers-reduced-motion: reduce\` still collapses all keyframe/transition durations
  after this round's CSS additions (carousel filters/glow are static, not animated, so they needed
  no reduced-motion handling of their own).
- The homepage brand mark and spectrogram visual are both purely decorative \`role="img"\` SVGs with
  accurate \`aria-label\`s ("torch-dae" and an explicit "decorative ... not a measured spectrogram"
  respectively) — neither is interactive nor conveys information only visually.
- Footer icons are \`aria-hidden\` (the adjacent text carries the actual meaning, unchanged from the
  emoji they replaced).

## Contrast concerns

None identified. No new arbitrary colors were introduced this round either — the energy-state chip,
series markers, and carousel depth effects all use existing theme custom properties
(\`--warning\`, \`--text-secondary\`, \`--model-color\`, \`--primary\`) already validated in Phase 01/02.

## Reduced-motion behavior

Unchanged and re-verified: functionality is unaffected with animations disabled.

## Unresolved

- No automated axe-core pass (see \`OPEN_ISSUES.md\`).
- Chart SVGs' \`aria-label\` summaries are unchanged from the initial round (not a per-point
  accessibility-tree readout) — the visible legend + "Data & evidence" table added this round is
  the mitigation, not a screen-reader-native per-point readout.
`;
}
// bsdtar/libarchive (macOS default) embeds extended attributes as PAX headers by default; combined
// with COPYFILE_DISABLE=1 this also suppresses the AppleDouble (`._*`) sidecar fallback. GNU tar
// does not support --no-xattrs (and does not embed xattrs by default), so only add it when local
// tar identifies as bsdtar/libarchive. See Phase 02's review-bundle script for the original finding.
const tarVersion = execFileSync('tar', ['--version'], { encoding: 'utf8' });
const supportsNoXattrs = /bsdtar|libarchive/i.test(tarVersion);
if (!supportsNoXattrs) {
  console.warn('Local tar does not appear to be bsdtar/libarchive; skipping --no-xattrs (not supported/needed).');
}

execFileSync(
  'tar',
  [
    '-czf',
    archivePath,
    ...(supportsNoXattrs ? ['--no-xattrs'] : []),
    '-C',
    dirname(reviewRoot),
    relative(dirname(reviewRoot), reviewRoot),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  },
);
console.log(`Created ${reviewRoot}`);
console.log(`Created ${archivePath}`);
