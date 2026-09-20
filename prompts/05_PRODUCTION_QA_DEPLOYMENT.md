# WORK PROMPT 05 — Production Integration, Final QA & Deployment

## Role

Act as a senior release/platform engineer with frontend expertise.

This is **Phase 05 of 05** and the final implementation phase.

Do not redesign the product. The visual/product/data decisions are already defined.

Your task is to make the site reproducible, production-ready, deployable, and verifiably aligned with canonical released `torch-dae` evidence.

---


## Global operating contract for this phase

Before implementing, obey `AGENT_CONTEXT.md`.

This repository is:

```text
/Users/stefano/Documents/torch-dae-web
```

The canonical source repository is separate and read-only:

```text
/Users/stefano/Documents/torch-dae
```

Also read:

```text
TORCH_DAE_WEB_SPEC.md
prompts/00_WEB_IMPLEMENTATION_WORKPLAN.md
```

Read every existing accepted journal under:

```text
docs/implementation/phase-*.md
```

Preserve accepted earlier-phase behavior unless this phase explicitly changes it.

Do not modify the control inputs unless this prompt explicitly requests it:

```text
00_START_HERE.md
AGENT_CONTEXT.md
TORCH_DAE_WEB_SPEC.md
prompts/**
assets/mockups/**
```

Do not stage, commit, push, tag, merge, or deploy.

At the end of the phase, create/update:

```text
docs/implementation/phase-05.md
```

for this phase, and produce the required external review bundle.


# First actions

Read:

```text
TORCH_DAE_WEB_SPEC.md
```

Inspect:

- current website repository;
- all Phase 01–04 docs/tests;
- approved mockups;
- actual `torch-dae` release/tag configuration;
- current canonical release on GitHub/PyPI/ReadTheDocs.

Run the complete current validation suite before making changes.

---

# Objective

Finalize the website as a static production application.

Deliver:

1. deterministic production catalogue source;
2. released-source synchronization;
3. release/ref provenance in UI/build metadata;
4. reproducible CI build;
5. final E2E suite;
6. accessibility/performance smoke gates;
7. deployment workflow;
8. cache/update behavior;
9. complete developer/release documentation;
10. no hidden dependency on local developer paths;
11. final review bundle sufficient for go-live approval.

---

# Production source-of-truth

Production must consume a released `torch-dae` snapshot, not mutable live `main`.

Determine the intended catalogue ref from the actual released repository state.

The initial configured ref is `v0.2.0`, but resolve it at sync time and record its actual current commit SHA. Do not hardcode a remembered SHA or assume that the tag points to a particular historical merge commit.

Configuration should make source explicit, for example:

```text
TORCH_DAE_REPOSITORY=StefanoGiacomelli/torch_dae
TORCH_DAE_REF=v0.2.0
```

Development may still support a local checkout.

Production build must not require:

```text
/Users/stefano/Documents/torch-dae
```

---

# Source synchronization

Implement a deterministic production sync path.

Preferred behavior:

```text
npm run sync:data -- --ref v0.2.0
```

or equivalent.

The sync must:

1. resolve/fetch the requested release/tag;
2. record resolved commit SHA;
3. obtain only required repository artifacts;
4. validate canonical schemas/cards;
5. normalize/generate site data;
6. fail on validation/relationship error;
7. expose release/ref/SHA to UI metadata.

Use GitHub archive/API/raw download according to the simplest reliable approach.

Avoid GitHub API rate-limit dependence where a release archive is sufficient.

---

# Build reproducibility

`npm ci && npm run build` in a clean environment must work without manual local files.

The build should:

- use a configured default production ref;
- produce static output;
- contain deterministic catalogue data aside from explicit generation timestamp if retained;
- report source ref/SHA;
- fail clearly if canonical artifacts are unavailable or invalid.

Do not silently fall back to fixture data in production.

Fixtures are test-only.

---

# CI workflow

Add a GitHub Actions workflow for website CI.

At minimum:

```text
install
data sync/validation
type/lint/check
unit tests
build
Playwright E2E
```

Use caching conservatively.

Pin relevant Actions major versions.

CI must not publish/deploy from pull requests.

---

# Deployment

Prefer **GitHub Pages** for the first production deployment unless the repository or specification already establishes another provider.

If using GitHub Pages:

- configure Astro base/site correctly for the actual repository name;
- add deployment workflow using official GitHub Pages Actions;
- deploy only from protected/default branch or explicit release workflow;
- avoid exposing secrets;
- ensure client-side URL query state works under base path.

If GitHub Pages is technically unsuitable due to the final repository/domain arrangement, prepare a clean static deployment for Cloudflare Pages/Netlify and document the reason instead of forcing Pages.

Do not deploy automatically until the human explicitly approves if deployment credentials/settings are not already configured.

---

# Release-aware update strategy

Document the preferred update sequence:

```text
new torch-dae release
    ↓
update website catalogue ref
    ↓
CI sync + validation
    ↓
review
    ↓
deploy
```

Optionally implement a manual workflow input for testing another `torch-dae` tag/ref.

Do not build an unnecessary backend webhook service.

---

# External links

Verify production navbar links:

```text
GitHub
canonical torch_dae repository

Documentation
Read the Docs latest

PyPI
official torch-deepaudioembedding project page
```

Check actual URLs, not stale placeholders.

---

# Final factual audit

Search the complete website for:

- mockup fictional model names;
- mockup fake metrics;
- unsupported labels;
- hardcoded scientific scores;
- stale package/release versions;
- local filesystem paths;
- TODO/FIXME;
- accidental `N/A` fallback spam;
- raw mockup marketing copy.

The production catalogue must display only actual canonical data or explicitly static product copy.

---

# Final comparability audit

Using real production data:

1. enumerate all selectable model combinations within supported max size;
2. enumerate shared contexts;
3. ensure every directly comparable state resolves to actual Technical Card evidence;
4. ensure incompatible states cannot render normalized comparative results;
5. ensure missing energy never becomes zero;
6. ensure every displayed Technical Card ID/link exists in source data.

Create a machine-readable or Markdown final audit report.

---

# Final visual QA

Capture production-build screenshots using the built static site, not only the dev server.

Required at 1512×827:

```text
home-light
home-night
home-expanded-light
home-expanded-night
technical-single-light
technical-single-night
technical-compare-light
technical-compare-night
```

Also capture:

```text
1366×768
1024×768
390×844
```

for both routes.

Compare again with approved mockups.

Do not make large design changes unless required to correct an obvious regression.

---

# Final browser QA

Test at least:

- Chromium;
- Firefox;
- WebKit if Playwright environment supports it.

Check:

- no console errors;
- no hydration errors;
- theme persistence;
- carousel navigation;
- selector logic;
- URL state;
- external links;
- responsive layout;
- reload on deep `/technical-cards` route under production hosting/base path.

---

# Accessibility

Run automated accessibility smoke checks if available.

Manual requirements:

- keyboard-only use;
- visible focus;
- theme contrast;
- chart non-color encodings;
- reduced motion;
- meaningful labels;
- no keyboard traps.

Fix serious issues.

---

# Performance

Use Lighthouse or equivalent if practical.

Targets are not rigid numeric gates unless justified, but investigate:

- excessive JS;
- huge image assets;
- chart hydration cost;
- layout shift;
- large unused packages.

Optimize obvious issues.

Do not sacrifice scientific functionality for arbitrary score chasing.

---

# Documentation

Finalize:

```text
README.md
docs/data-contract.md
docs/development.md
docs/deployment.md
docs/release-update.md
```

README should explain:

- what the site is;
- local setup;
- required Node version;
- development;
- data sync;
- tests;
- build;
- deployment;
- how catalogue updates follow `torch-dae` releases.

---

# Production metadata

Expose somewhere unobtrusive:

```text
torch-dae catalogue ref
resolved source SHA
site build version/date where useful
```

This may appear in the lower strip/info tooltip.

Do not crowd the main UI.

---

# Dependency audit

Review dependencies.

Remove packages that are no longer needed.

Run:

```text
npm audit
```

Document findings.

Do not perform risky major-version upgrades merely to clear non-exploitable dev-only notices unless required.

---

# Final validation

A clean checkout equivalent must pass:

```text
npm ci
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run build
npm run test:e2e
```

Also run any:

```text
npm run test:a11y
npm run audit:catalogue
npm run preview
```

that were implemented.

The final static build must be served and smoke-tested.

---

# Deployment safety

Do not push or publish/deploy unless explicitly authorized in the current chat/environment.

Preparing deployment workflow/configuration is required.

Actually triggering production deployment is not required unless permission is explicit.

---


Before creating the bundle:

- record the phase-start/current base HEAD in `BASE_HEAD.txt`;
- record `git status --short --branch --untracked-files=all`;
- record `git diff --name-status`;
- record `git diff --stat`;
- create a binary-safe tracked patch;
- populate `changed-files/` with exact copies of every modified or untracked source/config/documentation/test file, preserving repository-relative paths;
- populate `selected-source/` with the key supporting files requested below.

The review bundle must be self-contained enough for an external reviewer to inspect new untracked files without access to the live working tree.

Do not include caches/build outputs listed in `AGENT_CONTEXT.md`.

# REQUIRED FINAL HANDOFF

Do **not stage, commit, or push** unless explicitly instructed.

Create:

```text
../phase-05-review/
```

containing:

```text
SUMMARY.md
VALIDATION.md
OPEN_ISSUES.md
PRODUCTION_DATA_AUDIT.md
COMPARABILITY_AUDIT.md
VISUAL_FIDELITY_FINAL.md
ACCESSIBILITY_FINAL.md
PERFORMANCE_FINAL.md
DEPLOYMENT_PLAN.md
CHANGED_FILES.txt
GIT_STATUS.txt
phase-05.patch
TREE.txt
screenshots/
selected-source/
```

## PRODUCTION_DATA_AUDIT.md

Must state:

- source repository;
- configured ref/tag;
- resolved commit SHA;
- Model Card count;
- Technical Card count;
- schema versions;
- no fixture fallback;
- any source inconsistency.

## COMPARABILITY_AUDIT.md

Must report real selectable contexts and confirm no misleading comparison state.

## DEPLOYMENT_PLAN.md

Must give exact steps for the human to enable/trigger production deployment after review.

## VISUAL_FIDELITY_FINAL.md

Compare final production screenshots against the four approved references.

## selected-source

Include key final files:

- production data sync;
- build config;
- CI/deployment workflows;
- main routes;
- critical components;
- tests;
- docs.

Create:

```text
../torch-dae-web-phase-05-review.tar.gz
```

Final response must print:

1. review bundle path;
2. full validation summary;
3. production source ref + resolved SHA;
4. real Model/Technical Card counts;
5. browser/E2E summary;
6. accessibility/performance summary;
7. deployment status;
8. all remaining issues, if any;
9. screenshot paths;
10. `git status --short`;
11. statement whether any commit/push/deployment occurred.

Then stop.
