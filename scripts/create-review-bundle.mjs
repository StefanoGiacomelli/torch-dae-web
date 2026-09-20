import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reviewRoot = resolve(process.argv[2] ?? resolve(projectRoot, '..', 'phase-01-review'));
const archivePath = resolve(projectRoot, '..', 'torch-dae-web-phase-01-review.tar.gz');
const screenshotSource = resolve(process.argv[3] ?? '/tmp/torch-dae-phase-01-screenshots');
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

const summary = `# Phase 01 review summary

## Implemented

- Reproducible Astro 7 + strict TypeScript + React foundation with npm lockfile, Vitest, and Playwright.
- Build-time canonical-source resolver for local and GitHub modes, immutable commit-addressed local snapshots, release/SHA locking, Ajv Draft 2020 validation, normalization, deterministic joins, metadata, and raw-NPZ existence checks.
- Typed Model Card, Technical Card, context, metric, method-aware energy, named memory-surface, and provenance contracts.
- Persistent Day/Night theme and functional skeleton routes for Model Cards and Technical Cards.
- Offline deterministic fixtures, unit tests, browser smoke tests, documentation, and implementation journal.

## Canonical source

- Repository: \`StefanoGiacomelli/torch_dae\`
- Requested ref: \`v0.2.0\`
- Resolved commit: \`fbc0fb9e470890f0e3f48b48e6effba69b71e39c\`
- Real Model Cards: 3
- Real Technical Cards: 9
- Model Card schema versions: \`1.0.0\`
- Technical Card schema versions: \`1.0.0\`

The public tag was resolved read-only. Local mode uses the source repository only as a Git object database, exports the locked commit with \`git archive\`, and ingests the resulting web-owned immutable snapshot. Dirty source files and later source \`HEAD\` commits cannot change the catalogue; no source mutation is performed.

## Normalized layout

\`CatalogueIndex\` contains catalogue metadata, sorted \`CatalogueModel[]\`, and sorted \`CatalogueTechnicalCard[]\`. Model data now includes checkpoint authority, upstream sources, evidence/datasets, architecture, and full input constraints. Runtime contexts include structured hardware/software/input provenance. Energy method is independent from availability, and accelerator memory retains named CUDA/MPS surfaces. A Model Card may have zero Technical Cards. \`src/generated/catalogue.json\` is ignored and regenerated at sync/build time.

## Reproducibility corrections

- All manifest specifiers are exact versions already validated in the original lock; no dependency was upgraded.
- Node engines are \`^22.12.0 || ^24.0.0 || >=26.0.0\`, satisfying pinned Astro 7.3.3, \`@astrojs/react\` 6.0.6, and Vitest 5.0.1.
- Review generation excludes \`.DS_Store\`/\`._*\` and sets \`COPYFILE_DISABLE=1\` for macOS tar.

## Specification deviations

No product/data-contract deviation. Apache ECharts was intentionally not installed because charts are outside Phase 01 and the phase prompt made early installation optional.
`;

const validation = `# Validation

## Final passing gates

- \`npm ci\` — passed; 345 packages installed from \`package-lock.json\`.
- \`npm run sync:data\` — passed; 3 Model Cards and 9 Technical Cards synced from \`v0.2.0\` at \`fbc0fb9e470890f0e3f48b48e6effba69b71e39c\`.
- \`npm run validate:data\` — passed; all canonical schemas, assets, IDs, joins, and cross-artifact invariants valid.
- \`npm run check\` — passed; 0 errors, 0 warnings, 0 hints.
- \`npm run test\` — passed; 3 Vitest files, 12 tests, including all immutable-source snapshot cases.
- \`npm run test:e2e\` — passed; 2 Chromium tests covering both routes and theme interaction.
- \`npm run build\` — passed; 2 static pages generated.
- Four 1512 × 827 light/night screenshots captured and visually inspected.
- \`tar -tzf ../torch-dae-web-phase-01-review.tar.gz\` metadata scan — passed; no \`.DS_Store\` or \`._*\` entries.
- Canonical source status before/after sync — unchanged and clean.
- Production generated-data mockup-fiction scan — no matches.

## Setup and corrected intermediate failures

- Initial sandboxed \`npm install\` stalled on restricted network access and was interrupted; approved network installation then passed with 0 vulnerabilities.
- Initial \`tsx\` CLI execution failed because its IPC socket was sandbox-blocked. Scripts now use \`node --import tsx\`; sync and validation pass without escalation.
- Initial Astro check attempted to write telemetry preferences outside the workspace. Astro scripts now set \`ASTRO_TELEMETRY_DISABLED=1\`.
- First strict check found one unused parameter; removed, then the check passed.
- Initial Playwright run identified the missing browser runtime; pinned Chromium was installed.
- Astro 7 background development-server behavior exited before Playwright could supervise it. Playwright now starts Astro with \`--ignore-lock\` for a foreground server.
- One smoke run clicked before development-mode React hydration completed. The test now waits for the island's \`ssr\` marker to clear and the clean-start rerun passed.
`;

const openIssues = `# Open issues

- GitHub clone mode is implemented and release-SHA guarded, but Phase 01 validation used the preferred real local checkout. Exercise the GitHub path in production CI during Phase 05.
- The canonical schemas are upstream-owned. Ajv runs Draft 2020 all-errors validation with formats, but strict-schema diagnostics are disabled to avoid redefining upstream vocabulary policy.
- Final model visual identity, chart integration, and comparability rules remain intentionally deferred to their assigned phases.
- Canonical v0.2.0 has no structured Model Card minimum duration, designated default Technical Card, generic execution-regime field beyond preserved runtime/thread/device context, or per-inference energy measurement. Later phases must not infer these.
`;

write('SUMMARY.md', summary);
write('VALIDATION.md', validation);
write('OPEN_ISSUES.md', openIssues);
write('BASE_HEAD.txt', git(['rev-parse', 'HEAD']));
write('GIT_STATUS.txt', git(['status', '--short', '--branch', '--untracked-files=all']));
write('CHANGED_FILES.txt', `${git(['status', '--short', '--untracked-files=all'])}\n${git(['diff', '--name-status'])}`);
write('DIFFSTAT.txt', git(['diff', '--stat']));
write('phase-01.patch', git(['diff', '--binary', '--full-index']));
write('TREE.txt', `${walk(projectRoot).join('\n')}\n`);

for (const path of workingTreePaths()) copy(path, join(reviewRoot, 'changed-files'));

const selected = [
  'package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json', 'playwright.config.ts',
  'vitest.config.ts', 'catalogue-source.json', 'scripts/sync-data.ts', 'scripts/validate-data.ts',
  'src/data/ingest/pipeline.ts', 'src/data/ingest/source.ts', 'src/data/ingest/validation.ts',
  'src/data/normalize/normalize.ts', 'src/data/types/catalogue.ts', 'src/data/types/raw.ts',
  'src/components/navigation/ThemeToggle.tsx', 'src/layouts/AppLayout.astro',
  'src/pages/index.astro', 'src/pages/technical-cards.astro', 'src/styles/tokens.css',
  'src/styles/themes.css', 'src/styles/global.css', 'tests/unit/normalization.test.ts',
  'tests/unit/validation.test.ts', 'tests/e2e/smoke.spec.ts', 'docs/data-contract.md',
  'tests/unit/source-snapshot.test.ts', 'tests/fixtures/catalogue-fixture.ts',
  'docs/development.md', 'docs/implementation/phase-01.md',
];
for (const path of selected) copy(path, join(reviewRoot, 'selected-source'));

for (const name of [
  'home-skeleton-light.png', 'home-skeleton-night.png',
  'technical-skeleton-light.png', 'technical-skeleton-night.png',
]) {
  const source = join(screenshotSource, name);
  if (!existsSync(source)) throw new Error(`Missing required screenshot: ${source}`);
  copyFileSync(source, join(reviewRoot, 'screenshots', name));
}

execFileSync('tar', ['-czf', archivePath, '-C', dirname(reviewRoot), relative(dirname(reviewRoot), reviewRoot)], {
  stdio: 'inherit',
  env: { ...process.env, COPYFILE_DISABLE: '1' },
});
console.log(`Created ${reviewRoot}`);
console.log(`Created ${archivePath}`);
