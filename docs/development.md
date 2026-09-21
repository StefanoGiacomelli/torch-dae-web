# Development

## Runtime and installation

Use Node.js `^22.12.0`, `^24.0.0`, or `>=26.0.0`; `.nvmrc` selects Node 24. Install exactly the locked dependency graph with `npm ci`.

## Source configuration

The default is the production GitHub source locked by `catalogue-source.json`:

```bash
npm run sync:data
npm run sync:data -- --ref v0.2.0
```

The GitHub resolver clones the released ref into ignored `.cache/`, records its actual `HEAD`, and rejects it if the configured release resolves to a SHA other than the lock. That clone is only a Git object/ref cache: ingestion uses a `git archive` snapshot materialized at `.cache/torch-dae-snapshots/<SHA>/`, so dirty cached-clone files cannot leak into generated data. No fixture fallback exists.

Local development is explicitly opt-in:

```bash
npm run sync:data -- --source local --repo-path /path/to/torch-dae --ref v0.2.0
```

The resolver never fetches, checks out, resets, creates a worktree, or writes in that source checkout. It exports the resolved Git object to an immutable cache snapshot; dirty source working-tree content and later `HEAD` commits cannot affect the catalogue.

Equivalent environment variables are `TORCH_DAE_SOURCE`, `TORCH_DAE_REPO_PATH`, and `TORCH_DAE_REF`. CLI options take precedence.

## Complete local gate

```bash
npm ci
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run audit:comparability
npm run audit:catalogue
npm run build
npm run audit:content
npm run audit:performance
npm run audit:deployment
npm run test:e2e
npm run test:a11y
npm run test:pages
```

`test:e2e` serves the built static site and runs Chromium, Firefox, and WebKit. Install those browsers with `npx playwright install chromium firefox webkit`. `test:pages` rebuilds with the `/torch-dae-web/` project base and verifies internal navigation, query state, and deep-route reload.

## Generated and cache state

`src/generated/catalogue.json`, `.cache/`, `dist/`, `.astro/`, Playwright reports, and test results are disposable and ignored. The generated catalogue is deterministic except for the explicit `generatedAt` timestamp. All arrays and joins are sorted deterministically.
