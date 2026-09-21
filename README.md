# torch-dae web

Static Astro catalogue for canonical `torch-dae` Model Cards and Technical Cards. It presents scientific identity separately from reproducible runtime evidence and never authors canonical data.

Production catalogue source: `StefanoGiacomelli/torch_dae` release `v0.2.0`, locked to its resolved commit in `catalogue-source.json`.

## Requirements

- Node.js `^22.12.0`, `^24.0.0`, or `>=26.0.0` (`.nvmrc` selects Node 24)
- npm 11
- Git and network access for the default production sync
- Playwright browsers for browser tests

## Local setup

```bash
npm ci
npm run sync:data
npm run dev
```

The default sync is production-equivalent: it clones the locked released ref from GitHub into an ignored Git object/ref cache, verifies the resolved SHA, materializes that commit with `git archive` under `.cache/torch-dae-snapshots/<SHA>/`, validates the immutable snapshot, then writes ignored `src/generated/catalogue.json`. The clone working tree is never ingested, so dirty cache files cannot affect the catalogue. Sync does not depend on a developer-specific filesystem path and never falls back to fixtures.

For read-only local-source development:

```bash
npm run sync:data -- --source local --repo-path /path/to/torch-dae --ref v0.2.0
```

Local mode reads only Git objects, exports an immutable commit snapshot, and never changes the canonical checkout.

## Commands

- `npm run sync:data -- --ref v0.2.0` — sync, validate, normalize, and generate the released catalogue.
- `npm run validate:data` — validate canonical artifacts and deterministic joins without writing generated output.
- `npm run check` — strict Astro and TypeScript checks.
- `npm run test` — Vitest unit tests.
- `npm run audit:comparability` — enumerate real shared comparison contexts.
- `npm run audit:catalogue` — produce machine-readable production data/comparability evidence under `.cache/phase-05-audit/`.
- `npm run build` — production-source sync and static Astro build.
- `npm run test:e2e` — production-build Playwright suite in Chromium, Firefox, and WebKit.
- `npm run test:a11y` — production-build semantic/keyboard accessibility smoke tests.
- `npm run test:pages` — build and test the GitHub Pages project base path, including a deep-route reload.
- `npm run audit:content` — scan built output for mockup-only, unsupported, stale, and local-path content.
- `npm run audit:performance` — report static and JavaScript byte budgets.
- `npm run audit:deployment` — verify the Pages workflow is manual-only, main-ref guarded, and assigns the deployment environment only to the deploy job.
- `npm run preview` — serve the built static output locally.

Install browser engines once with:

```bash
npx playwright install chromium firefox webkit
```

## Deployment and release updates

CI validates every pull request and `main` push without publishing from pull requests. The Pages workflow prepares a static project-site build at `/torch-dae-web/`; it is manual-only and rejects dispatches from refs other than `main`. A repository owner must enable GitHub Pages with GitHub Actions as its source before the first reviewed deployment.

See:

- [Data contract](docs/data-contract.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [Release update](docs/release-update.md)
