import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewRoot = resolve(process.argv[2] ?? resolve(projectRoot, '..', 'phase-02-review'));
const archivePath = resolve(projectRoot, '..', 'torch-dae-web-phase-02-review.tar.gz');
const screenshotSource = resolve(process.argv[3] ?? '/tmp/phase-02-final-screens');
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

const summary = `# Phase 02 review summary (post-correction, round 2)

This bundle reflects Phase 02 after two external-review correction rounds. See
\`docs/implementation/phase-02.md\` in \`selected-source/\` for the full narrative; this is a condensed
summary of the corrected, final state.

## Implemented

- Full-viewport \`/\` Model Cards catalogue: hero header, a React carousel island (\`Carousel.tsx\`),
  navbar (extended with a compact overflow menu, see below), and a static factual footer strip.
- Carousel navigation: click, Previous/Next buttons, \`ArrowLeft\`/\`ArrowRight\` keyboard, pointer
  drag/swipe, trackpad horizontal wheel, and pagination dots. Selection uses a circular signed-offset
  layout (\`-2 … +2\`) so a larger future catalogue renders the same layered composition automatically;
  with 3 canonical models only \`-1/0/+1\` are populated today.
- In-place expansion: the same \`<article>\` per model swaps between a compact view and an expanded view
  (identity, canonical model ID, implementation source, all upstream metrics, input/output/embedding
  facts, evidence-derived per-backend runtime verification, upstream caveat, performance/provenance
  side column) — no modal, no route change.
- Deterministic first-party visual identity (seeded waveform SVG per model ID, no external imagery).
- Deterministic reference-runtime-context rule (single CPU/\`native_default\` Technical Card, canonical
  batch-1 condition) with a documented no-default fallback ("Explore runtime evidence"), now exposed
  through a visible keyboard/touch-operable disclosure instead of a hover-only tooltip, with metric
  labels tightened to match their actual source fields (Mean latency, RSS sampled peak, Profile energy).
- Real energy-semantics handling: \`complete\` shows a raw Joule value, \`partial\`/\`unavailable\`/\`failed\`
  render a distinct label and never a fabricated \`0\` — exercised against real catalogue data (CNN14's
  reference context is \`partial\`; ResNet38's is \`complete\`).
- Commit-pinned provenance links, plus non-URL "owner/repo @ shortsha" / "owner/repo · path" labels
  (\`formatSourceIdentity\`) for upstream source records — never a raw URL printed inline in a fact row.

## Correction-round changes (this review round)

1. **Footer license fix.** The footer previously stated "MIT-licensed torch-dae", which is factually
   wrong — torch-dae is Apache-2.0. \`readLicenseIdentifier\` now reads the SPDX \`license\` field from
   the canonical snapshot's own \`pyproject.toml\` at sync time (\`CatalogueMetadata.licenseIdentifier\`);
   the footer renders that value, never a hardcoded string. "Native tensors, no lock-in" (marketing
   language) was replaced with the neutral "Standard PyTorch nn.Module interface". Guarded by
   \`tests/unit/license.test.ts\` (fixture + real-catalogue assertions) and an e2e footer-text test.
2. **Navbar reachability on narrow viewports.** GitHub/Documentation/PyPI were previously hidden
   entirely below 62rem (\`a[target='_blank'] { display: none }\`), making them unreachable on
   mobile/tablet. A native \`<details>\`/\`<summary>\` "More" overflow menu now carries them below 62rem
   (keyboard- and touch-operable with no added JS); Technical Cards and Day/Night were never affected.
   A related regression (external links silently losing their color/underline styling because the
   \`.navbar nav > a\` child selector stopped matching once they were wrapped in a container) was found
   and fixed in the same pass. Covered by \`tests/e2e/navbar.spec.ts\`.
3. **Expanded-card completeness audit.** Added the stable canonical \`model.id\` (compact monospace
   line), a linked "Implementation source" fact (prefers \`sources.implementation\`, falls back to
   \`sources.officialRepository\`, rendered as a short label — never a raw URL), and all
   \`model.upstreamMetrics\` entries (previously only the first was shown).
4. **Runtime-verification backend audit.** \`getEvidencedVerificationBackends\` now cross-checks each
   Model Card's self-declared \`locally_verified\` claim against its linked Technical Cards, downgrading
   to \`upstream_declared\` if no successful Technical Card actually evidences that backend. For the real
   v0.2.0 catalogue the result is unchanged (fully evidenced already) — verified by a regression test
   comparing the evidenced output to \`model.verificationBackends\` in \`src/generated/catalogue.json\`
   — plus fixture tests proving the function does downgrade an unevidenced claim and never invents one.
5. **Accessible reference context + metric relabeling.** The reference runtime context is now a visible
   \`<details>\` disclosure (device/backend, execution regime, batch size, protocol) instead of a
   hover-only \`title\`. Metric labels: \`Latency\`→\`Mean latency\`, \`Memory\`→\`RSS sampled peak\`,
   \`Energy\`→\`Profile energy\` (still explicitly scoped to the whole resource pass, never per-inference).
6. **Drag/wheel interaction hardening.** A completed drag (tracked via a small moved-threshold, separate
   from the larger navigation threshold) now suppresses the trailing click via an \`onClickCapture\`
   guard, so a drag that starts on or passes over a side card's own select button can no longer have
   that button's click override the drag's own outcome. Native \`setPointerCapture\` was deliberately
   avoided because it retargets the mouse \`click\` compatibility event to the capturing element, which
   would have broken ordinary (non-drag) side-card clicks. Covered by
   \`tests/e2e/carousel-interaction.spec.ts\` (drag-changes-selection-once, drag-over-a-side-card,
   ordinary-click-still-works, wheel-deltaX-changes-selection).
7. **Review-bundle housekeeping.** The tar command now adds \`--no-xattrs\` when the local \`tar\` is
   bsdtar/libarchive (detected via \`tar --version\`), alongside the existing \`COPYFILE_DISABLE=1\` — the
   combination removes both the PAX \`LIBARCHIVE.xattr.*\`/\`SCHILY.xattr.*\` headers and libarchive's
   AppleDouble (\`._*\`) fallback that appears if xattrs can't be embedded and \`COPYFILE_DISABLE\` isn't
   set. GNU tar (which doesn't support the flag and doesn't embed xattrs by default) is left unchanged.

## Second correction round: accessibility/interaction semantics

A second external review found five bounded accessibility/interaction defects, fixed with no visual
or data-semantic change:

1. **Mobile hidden side cards stayed keyboard-focusable.** \`opacity: 0; pointer-events: none\` at
   ≤48rem didn't remove the non-selected ±1 cards' select overlay from the tab order (React's
   \`tabIndex\` logic has no awareness of the breakpoint). Fixed by adding \`visibility: hidden\` in that
   media query — which does remove an element from the tab order — without touching desktop/laptop
   side-card focusability. Covered by a new 25-Tab traversal regression test at 390×844.
2. **Carousel arrow keys could be hijacked from inner controls.** The track's \`keydown\` listener
   received bubbled \`ArrowLeft\`/\`ArrowRight\` from any focused descendant (links, the reference-context
   \`<summary>\`, other cards' buttons). Fixed with \`if (event.target !== trackRef.current) return;\` so
   only the track itself being the actual keyboard focus triggers navigation. Covered by a new test
   (focus an inner control, press arrows, confirm no selection change) alongside the pre-existing
   track-focused-arrows-navigate test.
3. **Incorrect ARIA menu semantics.** Removed \`role="menu"\`/\`role="menuitem"\` from the navbar's native
   \`<details>\` overflow panel — it never implemented the full ARIA menu keyboard pattern. Native link
   semantics are unchanged and unaffected. Tests updated to query ordinary \`link\` roles.
4. **Incorrect tab/tablist semantics.** Removed \`role="tablist"\`/\`role="tab"\`/\`aria-selected\` from the
   carousel pagination dots (ordinary jump-to-model buttons, not a tabs widget) in favor of
   \`role="group"\` + \`aria-current="true"\` on the active dot. Visual appearance and click-to-select
   behavior unchanged (CSS keys off \`data-active\`, not the removed ARIA attributes). Test updated to
   query the \`button\` role.
5. **Compact card HTML validity.** The non-selected \`.model-card-surface\` was a \`<button>\` containing
   block content (\`div\`/\`h2\`/\`ul\`) — invalid per the \`<button>\` content model. Refactored to a plain
   container with a single stretched \`<button class="model-card-select-overlay">\` (\`inset: 0\`,
   \`aria-label="Select {model}"\`) as the sole click/tap/focus target — same one-target selectability,
   still exactly one labeled accessible control per card. Because the surface clips overflow, the
   overlay's focus ring needed \`outline-offset: -3px\` (inset) instead of the default outward offset, or
   it would have been invisible; verified by a new test asserting a non-zero computed \`outlineWidth\`
   on focus. The hover lift-on-hover rule was retargeted from \`button.model-card-surface:hover\` to a
   new \`.model-card-surface-compact:hover\` class. The selected card's container and provenance links
   are unchanged.

## Runtime-verification derivation result (from real canonical data)

For all 3 canonical v0.2.0 models, the evidence-derived backend list is identical to the Model Card's
own self-declaration: \`cpu\` and \`mps\` are \`locally_verified\` (each has a real, successful Technical
Card on that backend), \`cuda\` is \`upstream_declared\` (no CUDA Technical Card exists). The derivation
function exists to make this an *enforced, tested* property rather than an implicit trust of the Model
Card's self-declaration.

## Carousel mechanics (unchanged from initial Phase 02)

Selection is an index into the (build-time sorted) model array. \`relativeOffset(i, selected, total)\`
computes each card's signed distance from the selection, wrapped to the shortest direction around the
circle. CSS attribute selectors (\`[data-offset='0'|'±1'|'±2']\`) position and scale cards via \`calc()\`
against shared width/gap custom properties — avoiding a dependency on CSS \`abs()\`. The selected card's
height is a percentage of its absolutely-positioned containing block (\`.carousel\`), not a raw
viewport-height clamp, so it never overflows into the pagination dots below it.

## Compact card fields (exact)

Display name, family, task pill(s), sample rate, embedding dimension (when present), runtime-verified/
lifecycle-status line, \`#00N\` index badge, waveform visual.

## Expanded card fields (exact)

Display name, canonical model ID, identity (family, variant, checkpoint), implementation source (linked
label), all upstream metrics (each explicitly labeled "Upstream reported …"), input, outputs, default
embedding, evidence-derived per-backend runtime verification (verified vs. upstream-declared/
locally-unverified — never collapsed), upstream-caveat sentence, Performance Profile (or
Explore-evidence fallback), and provenance links.

## Responsive strategy

Desktop/laptop (≥768px: 1512×827, 1440×900, 1280×800, 1024×768) is unchanged and scroll-free
(verified programmatically, including after this round's additional model-ID line). ≤62rem hides the
header's right-hand tagline, the far ±2 neighbor cards, and switches the navbar to the "More" overflow
menu. ≤48rem (768×1024 tablet portrait, 390×844 mobile) is a **documented deviation**: only the selected
card is shown (no side peek — it produced overlapping text at this width), sized to clear the fixed
Previous/Next buttons, with its own detail column remaining internally scrollable so the *document*
still never scrolls. The navbar wordmark also shrinks under 40rem.

## Fidelity assessment

Side-by-side against \`assets/mockups/home-light.png\` / \`home-night.png\`: navbar density, hero
title/eyebrow, layered carousel composition, selected-card glow/border, pill styling, footer strip,
and the acoustic background motif all track the mockups closely in both themes; the mobile "More" menu
and expanded-card additions read as native extensions of the existing visual language, not bolted-on
UI. Known gaps for Phase 04 are listed in \`OPEN_ISSUES.md\` (unchanged from the initial round per this
correction's explicit "keep visual polish out of scope" instruction).
`;

const validation = `# Validation (post-correction, round 2)

## Commands run (in order)

- \`npm run sync:data\` — passed; 3 Model Cards / 9 Technical Cards synced from \`v0.2.0\`
  (\`fbc0fb9e470890f0e3f48b48e6effba69b71e39c\`), unchanged from Phase 01/round 1.
  \`catalogue.metadata.licenseIdentifier\` still resolves to \`Apache-2.0\`.
- \`npm run validate:data\` — passed; all canonical schemas, assets, IDs, joins, and cross-artifact
  invariants valid.
- \`npm run check\` — passed; 0 errors, 0 warnings, 0 hints (39 files).
- \`npm run test\` — passed; 5 Vitest files, 34 tests (unchanged from round 1 — this round only touched
  markup/CSS/ARIA, not data/derive logic).
- \`npm run build\` — passed; 2 static pages generated.
- \`npm run test:e2e\` — passed; 25/25 Chromium tests (up from 22 after round 1: +1 mobile Tab-focus-order
  regression test in \`tests/e2e/navbar.spec.ts\`, +1 inner-control-arrow-key test and +1 compact-card
  semantics/focus-ring test in \`tests/e2e/home.spec.ts\`; the navbar overflow-menu link-role assertions
  and the pagination-dots test were updated in place for the corrected ARIA roles, not added).
- Manual/scripted (Playwright, ad hoc) verification that
  \`document.documentElement.scrollHeight === window.innerHeight\` also holds at 1280×800, 1024×768,
  768×1024, and 390×844 after all correction-round changes; ordinary side-card click, drag, and wheel
  navigation re-verified working; track-focused arrow-key navigation re-verified working alongside the
  new inner-control-does-not-navigate test.
- \`tar -tzf ../torch-dae-web-phase-02-review.tar.gz\` — passed; no \`.DS_Store\`/\`._*\` entries, and
  (with \`--no-xattrs\` + \`COPYFILE_DISABLE=1\`) no \`LIBARCHIVE.xattr.*\`/\`SCHILY.xattr.*\` PAX headers
  either.

## Notable fix during this round (round 2)

Fixing the compact-card HTML validity (item 5) introduced a transient regression, caught before
finalizing: moving the select \`<button>\` from being the card surface itself to a descendant overlay
meant the global \`:focus-visible { outline-offset: 3px }\` ring — previously unclipped because an
element's own \`overflow: hidden\` does not clip its own outline — was now being clipped by the
*ancestor* surface's \`overflow: hidden\`, since the ring is now descendant content from that ancestor's
perspective. Verified by screenshot (focus was completely invisible) before applying the fix
(\`outline-offset: -3px\` on \`.model-card-select-overlay:focus-visible\`) and re-verified visible after.

## Notable fixes during round 1 (re-verified still correct in round 2)

- **Navbar link styling regression** (self-caught while fixing the overflow-menu reachability bug):
  wrapping the external links in \`.navbar-external-links\`/\`.navbar-more\` containers meant they were no
  longer *direct* children of \`<nav>\`, so \`.navbar nav > a\` stopped matching them and they rendered as
  unstyled, underlined, default-blue browser links. Fixed by broadening the selector to the descendant
  combinator \`.navbar nav a\`.
- **Percentage-height indefinite-parent bug**: confirmed still fixed — the expanded card's height is
  set on the absolutely-positioned \`.model-card[data-offset='0']\` itself (percentage against its
  positioned, definite-height containing block \`.carousel\`), not on a normal-flow descendant, which
  would silently ignore the percentage.
- The pagination-dots/Next-button layout collision and the keyboard-navigation-vs-hydration test race
  (both from the very first Phase 02 round) remain fixed and covered.
`;

const openIssues = `# Open issues for Phase 04

- The expanded card's own detail column (\`.model-card-columns\`) is an \`overflow-y: auto\` region, not
  fully static, on 1512×827 and 1280×800: the current PANNs fact set is slightly taller than the
  available vertical budget once the header/footer/pagination-dot rows take their share. This is a
  contained widget scroll (the document itself never scrolls). Explicitly kept out of scope for this
  correction round; Phase 04 should reconsider content density, typography scale, or per-section
  disclosure to remove the need for it entirely on desktop.
- Mobile/tablet (≤48rem) intentionally shows only the selected card, with no lateral "peek" of
  neighbors — the spec's suggested peek treatment produced overlapping, unreadable text at this width.
  Explicitly kept out of scope for this correction round; Phase 04 (or a dedicated responsive pass)
  could revisit a genuine peek treatment if desired.
- The appliance-style metric bars use a fixed, documented illustrative ceiling per metric (e.g.
  latency ceiling 250 ms) purely to size the fill within a single card; this is intentionally not a
  cross-model/cross-device normalization and should stay that way per the specification, but Phase 04
  should double-check the chosen ceilings still read sensibly once more model families/backends exist.
- Model visual identity is a seeded abstract waveform bar chart (SVG rects), not a
  spectrogram/mel-spectrogram-style visual as in the mockups; a richer first-party visual (e.g. an
  actual small spectrogram rendering) is a reasonable Phase 04 visual-polish candidate. Explicitly kept
  out of scope for this correction round.
- **Branding/logo fidelity**: the navbar/card kicker mark is still the placeholder glyph \`▥\`, not final
  brand artwork. The specification lists "final logo asset and typography" as an open design decision
  (§38); Phase 04 (or a dedicated branding pass) should resolve and apply it consistently across the
  navbar, compact cards, and expanded cards.
- Comparison-color-per-model assignment (spec §6.3) is out of scope here (it belongs to the Technical
  Cards comparison engine, Phase 03) and was not implemented.
- A benign React hydration console warning can appear in dev mode if a user (or a test) opens the
  Performance Profile's \`<details>\` reference-context disclosure via keyboard before the Carousel
  island finishes hydrating (native \`<details>\` state set before \`hydrateRoot\` reconciles it). React
  correctly keeps the user's actual open state; this does not affect production static output or any
  test outcome, but is noted here in case Phase 04's performance pass investigates dev-console noise.
`;

write('SUMMARY.md', summary);
write('VALIDATION.md', validation);
write('OPEN_ISSUES.md', openIssues);
write('BASE_HEAD.txt', git(['rev-parse', 'HEAD']));
write('GIT_STATUS.txt', git(['status', '--short', '--branch', '--untracked-files=all']));
write('CHANGED_FILES.txt', `${git(['status', '--short', '--untracked-files=all'])}\n${git(['diff', '--name-status'])}`);
write('DIFFSTAT.txt', git(['diff', '--stat']));
write('phase-02.patch', git(['diff', '--binary', '--full-index']));
write('TREE.txt', `${walk(projectRoot).join('\n')}\n`);

for (const path of workingTreePaths()) {
  if (path.startsWith('.review-bundle-phase-02-')) continue;
  copy(path, join(reviewRoot, 'changed-files'));
}

const selected = [
  'src/pages/index.astro',
  'src/components/navigation/Navbar.astro',
  'src/components/navigation/ThemeToggle.tsx',
  'src/components/model-cards/Carousel.tsx',
  'src/components/model-cards/ModelCard.tsx',
  'src/components/model-cards/ModelVisual.tsx',
  'src/components/model-cards/PerformanceProfile.tsx',
  'src/components/model-cards/BackgroundMotif.astro',
  'src/components/model-cards/FooterStrip.astro',
  'src/data/derive/referenceContext.ts',
  'src/data/derive/modelVisual.ts',
  'src/data/derive/provenance.ts',
  'src/data/derive/format.ts',
  'src/data/derive/verification.ts',
  'src/data/ingest/pipeline.ts',
  'src/data/types/catalogue.ts',
  'src/styles/tokens.css',
  'src/styles/themes.css',
  'src/styles/global.css',
  'src/styles/model-cards.css',
  'tests/unit/derive.test.ts',
  'tests/unit/license.test.ts',
  'tests/e2e/home.spec.ts',
  'tests/e2e/navbar.spec.ts',
  'tests/e2e/carousel-interaction.spec.ts',
  'tests/e2e/smoke.spec.ts',
  'docs/implementation/phase-02.md',
];
for (const path of selected) copy(path, join(reviewRoot, 'selected-source'));

for (const name of [
  'approved-reference-home-light.png',
  'approved-reference-home-night.png',
  'implemented-home-light.png',
  'implemented-home-night.png',
  'implemented-home-light-expanded.png',
  'implemented-home-night-expanded.png',
  'implemented-home-laptop.png',
  'implemented-home-mobile.png',
]) {
  const source = join(screenshotSource, name);
  if (!existsSync(source)) throw new Error(`Missing required screenshot: ${source}`);
  copyFileSync(source, join(reviewRoot, 'screenshots', name));
}

// bsdtar/libarchive (macOS default) embeds extended attributes (e.g. the Gatekeeper-assigned
// `com.apple.provenance` xattr on downloaded/quarantined files) as PAX headers by default, which
// external `tar -tzf`/extraction can surface as noise even though no `.DS_Store`/`._*` file is
// present. `--no-xattrs` disables that; combined with `COPYFILE_DISABLE=1` it also suppresses the
// AppleDouble (`._*`) sidecar fallback bsdtar would otherwise write instead. GNU tar does not
// support `--no-xattrs` (and does not embed xattrs by default), so the flag is only added when the
// local tar identifies itself as bsdtar/libarchive.
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
