import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewRoot = resolve(process.argv[2] ?? resolve(projectRoot, '..', 'phase-03-review'));
const archivePath = resolve(projectRoot, '..', 'torch-dae-web-phase-03-review.tar.gz');
const screenshotSource = resolve(process.argv[3] ?? '/tmp/phase-03-screenshots');
const replaceExisting = process.argv.includes('--replace');

if (existsSync(reviewRoot) || existsSync(archivePath)) {
  if (!replaceExisting) throw new Error(`Refusing to overwrite existing review output: ${reviewRoot} or ${archivePath}`);
  if (existsSync(reviewRoot)) rmSync(reviewRoot, { recursive: true });
  if (existsSync(archivePath)) rmSync(archivePath);
}

function git(args) { return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }); }
function write(relativePath, contents) {
  const target = join(reviewRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}
function copy(relativePath, destinationRoot) {
  const source = join(projectRoot, relativePath);
  if (!existsSync(source) || !statSync(source).isFile()) return;
  const target = join(destinationRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
function workingTreePaths() {
  const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const entries = status.split('\0').filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const code = entry.slice(0, 2);
    paths.push(entry.slice(3));
    if (code.includes('R') || code.includes('C')) index += 1;
  }
  return paths.sort((a, b) => a.localeCompare(b));
}
function walk(directory, prefix = '') {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('._')) continue;
    if (['.git', '.astro', '.cache', 'coverage', 'dist', 'node_modules', 'playwright-report', 'test-results'].includes(entry.name)) continue;
    const relativePath = join(prefix, entry.name).split(sep).join('/');
    if (entry.isDirectory()) output.push(...walk(join(directory, entry.name), relativePath));
    else output.push(relativePath);
  }
  return output.sort((a, b) => a.localeCompare(b));
}

mkdirSync(join(reviewRoot, 'screenshots'), { recursive: true });
mkdirSync(join(reviewRoot, 'changed-files'), { recursive: true });
mkdirSync(join(reviewRoot, 'selected-source'), { recursive: true });

write('SUMMARY.md', `# Phase 03 review summary

Implemented the complete semantic interaction architecture for \`/technical-cards\`: one-to-five model
selection, adaptive shared-context selectors, exact card/condition resolution, URL-restorable state,
stable model colors, a pure comparability engine, a typed metric registry, energy-aware partial states,
basic SVG plots, and commit-pinned evidence links.

The hardening round decouples canonical condition resolution from timing availability, completes device
and environment identity, makes plots metric-aware, and applies source-grounded acquisition/workload
rules to card-scoped RSS and energy. The real catalogue defaults to a valid partial three-model view;
CNN14 + ResNet38 remain directly comparable on CPU/single-thread and MPS/backend-default.

Final packaging review pinned the directly imported \`@vitejs/plugin-react\` as an explicit devDependency
at the already-resolved version 5.2.0. No runtime or scientific behavior changed.

Phase 04 remains responsible for advanced charting, radar normalization, animation, and final polish.
`);

write('VALIDATION.md', `# Phase 03 validation

- \`npm ci\` — passed; 345 packages installed from lockfile, 346 audited, 0 vulnerabilities.
- \`npm run sync:data\` — passed; 3 Model Cards and 9 Technical Cards from v0.2.0.
- \`npm run validate:data\` — passed; deterministic joins and canonical artifacts valid.
- \`npm run check\` — passed; 0 errors, warnings, or hints across 52 files.
- \`npm run test\` — passed; 7 files / 67 tests.
- \`npm run audit:comparability\` — passed; 48 real shared pair/trio contexts (8 direct, 40 partial).
- \`npm run build\` — passed; both static routes generated.
- \`npm run test:e2e\` — passed; 33 Chromium tests (after the sandboxed first attempt was denied permission to bind localhost).
- Required 1512×827 screenshots captured in both themes and direct/partial/single/multi states.

Both baseline and final validation encountered the sandbox's localhost bind denial on their first E2E
attempt. The final authorized rerun passed 33/33; this was an environment limitation, not a repository failure.
`);

write('OPEN_ISSUES.md', `# Open issues for Phase 04

- The Phase 03 SVG plots intentionally prove data flow only. Phase 04 should add polished axes,
  non-color series markers/line styles, accessible legends/tooltips, transitions, and the reviewed
  normalized radar implementation.
- View mode is deterministic from model cardinality (one = single, two or more = comparison) and shown
  as a resolved control rather than an independently selectable state. Revisit only if Phase 04 defines
  a meaningful multi-model non-comparison mode.
- The 1512×827 desktop layout is scroll-free and visually coherent; smaller responsive layouts use
  document scrolling below 62rem. Phase 04 owns final breakpoint density and mobile polish.
- Profile energy is deliberately card/resource-pass scoped, non-normalizable, and repeated across
  batch choices. Do not relabel it as per-inference energy without new canonical evidence.
`);

write('COMPARABILITY_RULES.md', `# Comparability rules

## Resolution

Selectors form a strict pipeline: selected model IDs → device/backend plus hardware fingerprint and
device index when present →
thread regime (or explicit backend-default sentinel) → protocol ID/version → shared successful
canonical batches. Current downstream values survive only while valid; otherwise the resolver chooses
the first sorted valid option. Exactly one Technical Card and one canonical condition must resolve per
model. Ambiguity is incompatible, never first-card-wins.

Canonical successful conditions require successful status plus canonical duration and canonical sample
count. Timing is not a resolution requirement; metric availability is owned by the registry. This keeps
minimum-duration batch-1 runs distinct from canonical-duration batch-1 runs.

## Fields required equal

- protocol ID and version;
- device backend, hardware fingerprint, and device index when present;
- CPU thread regime or backend-default regime;
- precision and autocast;
- runtime classification;
- canonical duration;
- input channel count, dtype, distribution, and seed;
- material environment: hardware fingerprint, OS/version, Python implementation/version, torch version,
  CUDA runtime/driver, cuDNN, and MPS backend information (including equal nulls when inapplicable);
- selected batch size.

## Intentionally ignored

- model/Technical Card identity: identity distinguishes the compared items;
- native sample rate and sample count: protocol v1 compares equal-duration, model-native waveform
  inputs, so these differ legitimately between 16 kHz and 32 kHz models;
- opaque execution-context fingerprint: material dimensions are compared explicitly, avoiding an
  over-constraining model-specific hash;
- creation timestamp and descriptive provenance identifiers.

## Status

- **Direct:** context matches and every registered metric is mutually available and valid.
- **Partial:** context matches, but at least one metric is excluded; valid shared metrics remain shown.
- **Incompatible:** context is absent, ambiguous, or materially mismatched; comparison plots are hidden.

Machine-readable reason codes cover no selection/shared context, ambiguity, missing condition,
protocol/device/regime/precision/classification/duration/input/environment/batch mismatches, generic
metric absence, and energy coverage/method mismatch.

## Metrics and energy

Registry metrics are mean latency, throughput, RTF, speed factor, RSS sampled peak, and profile energy.
RSS is exposed only under sampled-peak semantics and is never summed with accelerator or unified-memory
observations. Canonical-source inspection confirms RSS and energy wrap the full isolated profiling worker
and are card/workload scoped, so both require equal normalized condition/coverage signatures; opaque IDs
and model-native sample counts are excluded from that signature. Energy requires internally consistent
complete finite aggregate energy for every card and equal kind, provider/version, scope, interval,
privilege usage, and coverage semantics. Partial,
unavailable, and failed energy never become zero. Profile energy means the whole isolated profiling
resource pass (including construction/loading overhead), not per inference or per selected batch, and
is not eligible for normalized radar use.
`);

write('REAL_DATA_AUDIT.md', `# Real canonical data audit

Source: \`StefanoGiacomelli/torch_dae\` ref \`v0.2.0\`, resolved commit
\`fbc0fb9e470890f0e3f48b48e6effba69b71e39c\`.

## Inventory

| Model ID | Technical Cards |
|---|---:|
| \`panns-cnn14-16k-map-0438\` | 3 |
| \`panns-resnet38-map-0434\` | 3 |
| \`panns-wavegram-logmel-cnn14-map-0439\` | 3 |

- Backends/hardware: CPU / Apple M4 Pro; MPS / Apple GPU (MPS).
- Regimes: CPU \`native_default\`, CPU \`single_thread\`, MPS backend default.
- Protocol: \`audio-inference-v1/1.0.0\`; runtime classification \`canonical\`.
- Canonical duration: 10 seconds; successful shared batches: 1, 2, 4, 8.
- Precision/input: float32, no autocast, mono uniform synthetic waveform, seed 1337.
- Metric coverage: timing (latency, throughput, RTF, speed factor) and RSS sampled peak on all 9 cards.
- Energy: hardware-measured via CodeCarbon 2.8.4; 7 complete cards and 2 partial cards. Partial cards are
  CNN14 CPU/native-default and Wavegram-Logmel CNN14 MPS/backend-default; CPU is unaccounted and total
  aggregate energy is null. No energy value is treated as zero.

## Directly comparable groups discovered

The exhaustive audit evaluated every pair and the three-model group across shared contexts/batches:
48 contexts total, 8 direct and 40 partial, with no naturally incompatible option surviving adaptive
intersection.

Direct families (each at batches 1, 2, 4, 8):

- CNN14 + ResNet38: CPU/single-thread and MPS/backend-default.

Partial families (timing/RSS valid, profile energy excluded; each at batches 1, 2, 4, 8):

- CNN14 + ResNet38: CPU/native-default because CNN14 energy coverage is incomplete;
- every pair/trio involving Wavegram in each shared context: RSS and energy are excluded because its
  card-level workload lacks the supplemental minimum-duration condition present on CNN14/ResNet38.
`);

write('BASE_HEAD.txt', git(['rev-parse', 'HEAD']));
write('GIT_STATUS.txt', git(['status', '--short', '--branch', '--untracked-files=all']));
write('CHANGED_FILES.txt', git(['status', '--short', '--untracked-files=all']));
write('DIFFSTAT.txt', git(['diff', '--stat']));
write('phase-03.patch', git(['diff', '--binary', '--full-index']));
write('TREE.txt', `${walk(projectRoot).join('\n')}\n`);

for (const path of workingTreePaths()) copy(path, join(reviewRoot, 'changed-files'));

const selected = [
  'src/data/types/catalogue.ts',
  'src/data/technical-cards/types.ts',
  'src/data/technical-cards/selectors.ts',
  'src/data/technical-cards/comparability.ts',
  'src/data/technical-cards/metrics.ts',
  'src/data/technical-cards/plotData.ts',
  'src/data/technical-cards/urlState.ts',
  'src/data/technical-cards/colors.ts',
  'src/components/technical-cards/TechnicalCardsExplorer.tsx',
  'src/components/technical-cards/RuntimePlots.tsx',
  'src/pages/technical-cards.astro',
  'src/styles/technical-cards.css',
  'tests/unit/technical-cards.test.ts',
  'tests/unit/runtime-plots.test.tsx',
  'tests/e2e/technical-cards.spec.ts',
  'scripts/audit-comparability.ts',
  'docs/implementation/phase-03.md',
];
for (const path of selected) copy(path, join(reviewRoot, 'selected-source'));

for (const name of [
  'technical-single-light.png', 'technical-single-night.png',
  'technical-multi-direct-light.png', 'technical-multi-direct-night.png',
  'technical-partial-or-incompatible.png',
]) {
  const source = join(screenshotSource, name);
  if (!existsSync(source)) throw new Error(`Missing required screenshot: ${source}`);
  copyFileSync(source, join(reviewRoot, 'screenshots', name));
}

const tarVersion = execFileSync('tar', ['--version'], { encoding: 'utf8' });
const supportsNoXattrs = /bsdtar|libarchive/i.test(tarVersion);
execFileSync('tar', ['-czf', archivePath, ...(supportsNoXattrs ? ['--no-xattrs'] : []), '-C', dirname(reviewRoot), relative(dirname(reviewRoot), reviewRoot)], {
  stdio: 'inherit', env: { ...process.env, COPYFILE_DISABLE: '1' },
});
console.log(`Created ${reviewRoot}`);
console.log(`Created ${archivePath}`);
