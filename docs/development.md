# Development

## Source configuration

Copy `.env.example` values into your shell or command environment. Use Node.js `^22.12.0`, `^24.0.0`, or `>=26.0.0`; this intersection satisfies the pinned Astro 7.3.3, `@astrojs/react` 6.0.6, and Vitest 5.0.1 engine declarations. The validated environment used Node 24.13.0 and npm 11.6.2.

The default local checkout is read-only. The resolver looks up the requested ref in its Git object database. For the locked release only, a missing local tag is accepted when the locked commit object itself exists. The exact commit is exported with `git archive` into `.cache/torch-dae-snapshots/<commit>/`; ingestion reads only that immutable snapshot. The resolver never fetches, checks out, resets, creates a worktree, or writes inside the source repository, and the source branch/`HEAD` may advance independently. If the commit object is absent, use GitHub mode or provide another read-only clone containing it.

GitHub mode requires network access and clones into ignored `.cache/`. `src/generated/catalogue.json` is also ignored because it contains a generation timestamp; `prebuild` regenerates it.

## Validation workflow

```bash
npm ci
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run test:e2e
npm run build
```

Playwright uses Chromium at `127.0.0.1:4321`. Install its browser once with `npx playwright install chromium`.

## Phase boundaries

Phase 01 intentionally exposes skeleton pages only. Carousel behavior, detailed Model Cards, selectors, comparability, and charts belong to later phases. UI components must consume normalized data rather than importing or reinterpreting raw canonical JSON.
