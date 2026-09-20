# torch-dae web

Static Astro catalogue for canonical `torch-dae` Model Cards and Technical Cards. This repository consumes evidence; it does not author or modify the scientific source.

## Requirements

- Node.js `^22.12.0`, `^24.0.0`, or `>=26.0.0` (matching Astro 7 and Vitest 5 engine ranges)
- npm
- a read-only `torch-dae` checkout at `/Users/stefano/Documents/torch-dae`, or source variables configured as described below

## Start locally

```bash
npm ci
npm run sync:data
npm run dev
```

The default source is the local Git object database and the locked release is `v0.2.0`. Override with:

```bash
TORCH_DAE_SOURCE=local TORCH_DAE_REPO_PATH=/path/to/torch-dae TORCH_DAE_REF=v0.2.0 npm run sync:data
```

Local mode resolves the requested commit without changing the source checkout, then uses `git archive` to materialize an immutable, commit-addressed snapshot under this repository's ignored `.cache/`. Uncommitted source changes and the source checkout's current branch/`HEAD` cannot affect the catalogue. Set `TORCH_DAE_SOURCE=github` to clone the release tag into `.cache/` instead. No browser-side canonical-data fetch is performed.

## Commands

- `npm run dev` — development server (run sync first)
- `npm run sync:data` — validate, normalize, join, and generate the catalogue
- `npm run validate:data` — validate source artifacts and cross-artifact invariants
- `npm run check` — strict Astro/TypeScript checks
- `npm run test` — deterministic Vitest unit tests
- `npm run test:e2e` — Playwright route/theme smoke tests
- `npm run build` — sync canonical data and generate the static site

See [docs/data-contract.md](docs/data-contract.md) and [docs/development.md](docs/development.md).
