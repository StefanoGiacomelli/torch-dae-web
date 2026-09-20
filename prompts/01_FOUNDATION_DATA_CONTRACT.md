# WORK PROMPT 01 — Foundation & Canonical Data Contract

## Role

Act as a senior frontend/platform engineer responsible for establishing the implementation foundation of the `torch-dae` website.

This is **Phase 01 of 05**. Work only on this phase.

Do not attempt to implement the polished final homepage or Technical Cards dashboard yet.


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
docs/implementation/phase-01.md
```

for this phase, and produce the required external review bundle.


## Required inputs

Before changing anything, read in full:

```text
TORCH_DAE_WEB_SPEC.md
```

Inspect the four approved mockups:

```text
assets/mockups/home-light.png
assets/mockups/technical-light.png
assets/mockups/home-night.png
assets/mockups/technical-night.png
```

Also inspect the canonical `torch-dae` repository, preferably from:

```text
/Users/stefano/Documents/torch-dae
```

Use the released `v0.2.0` state as the initial catalogue baseline. Prefer the local read-only source checkout and explicitly resolve the `v0.2.0` tag to its current commit SHA. If that checkout is unavailable, use the public GitHub release/tag.

Treat canonical Model Cards, Technical Cards, schemas, and release provenance as authoritative. Do not invent values.

---

# Objective

Create the website repository foundation and a robust build-time data layer capable of consuming actual `torch-dae` Model Cards and Technical Cards.

By the end of this phase the project must have:

1. reproducible Astro + TypeScript + React foundation;
2. strict project/tooling configuration;
3. Day/Night design tokens and base layout shell;
4. routes `/` and `/technical-cards` as functional skeletons;
5. canonical data ingestion from `torch-dae`;
6. schema-aware validation;
7. normalized frontend types;
8. deterministic Model Card → Technical Card joins;
9. catalogue metadata and source revision tracking;
10. unit tests around ingestion/normalization;
11. no hardcoded scientific/runtime catalogue values in UI components.

The focus is data correctness and architecture, not visual polish.

---

# Technology decisions

Use:

```text
Astro
TypeScript (strict)
React islands
npm + package-lock.json
Vitest
Playwright installed/configured for later phases
```

For charts, install **Apache ECharts** or an appropriate React integration now if it simplifies dependency planning, but do not build the final plots yet.

Prefer plain CSS/design-token files over Tailwind unless the existing repository already has a strong reason to use Tailwind.

Do not add:

- backend server
- database
- authentication
- CMS

---

# Repository bootstrap

This repository is **not empty**. It intentionally begins with the accepted planning baseline:

```text
00_START_HERE.md
AGENT_CONTEXT.md
TORCH_DAE_WEB_SPEC.md
prompts/
assets/mockups/
```

Bootstrap the Astro application **in this repository root** without deleting, moving, renaming, or overwriting those control inputs.

Do not create a nested application directory such as `torch-dae-web/torch-dae-web`.

The Git repository already exists. Do not reinitialize Git.

1. scaffold/configure a current stable Astro TypeScript project in place;
2. add React integration;
3. preserve all planning/control files;
4. configure:
   - TypeScript strictness
   - ESLint or equivalent if appropriate
   - Prettier only if it does not conflict with Astro conventions
   - Vitest
   - Playwright
5. pin dependencies in `package-lock.json`.

Create a clear README with local development instructions.

---

# Required repository structure

Aim for this organization unless a technically superior Astro-native structure is justified:

```text
src/
├── components/
│   ├── navigation/
│   ├── model-cards/
│   ├── technical-cards/
│   ├── charts/
│   └── common/
├── data/
│   ├── ingest/
│   ├── normalize/
│   ├── comparability/
│   └── types/
├── generated/
├── layouts/
├── pages/
│   ├── index.astro
│   └── technical-cards.astro
├── styles/
│   ├── tokens.css
│   ├── themes.css
│   └── global.css
└── config/

scripts/
tests/
assets/mockups/
```

`src/generated/` may be gitignored if generation is deterministic. If so, ensure tests/build can regenerate it.

---

# Canonical source strategy

Implement one small ingestion layer.

Do not scatter knowledge of raw repository JSON schemas throughout presentation components.

The target pipeline is:

```text
torch-dae release snapshot
    ↓
discover canonical Model Cards / Technical Cards / schemas
    ↓
validate
    ↓
parse
    ↓
normalize
    ↓
join
    ↓
generate frontend catalogue data
```

Production should be release-aware.

At minimum support:

```text
repository: StefanoGiacomelli/torch_dae
release/tag: v0.2.0
```

Also support development from the local checkout:

```text
/Users/stefano/Documents/torch-dae
```

Prefer configuration through a small typed config or environment variables, e.g.:

```text
TORCH_DAE_SOURCE=local|github
TORCH_DAE_REPO_PATH=...
TORCH_DAE_REF=v0.2.0
```

Do not make browser clients fetch `raw.githubusercontent.com` on every page load.

Data ingestion must happen at build/sync time.

---

# Source validation

Inspect the real schemas and current canonical artifacts before designing normalized types.

Do not infer field names from the mockups.

Validation should fail loudly when:

- required schema validation fails;
- a canonical Model Card cannot be normalized;
- a Technical Card references an unknown model;
- duplicate IDs are present;
- expected evidence relationships are inconsistent.

If validation code from `torch-dae` itself cannot reasonably be reused in TypeScript, use JSON Schema validation (e.g. Ajv) against the repository schemas.

Document any field that cannot be validated directly.

---

# Normalized frontend data

Create compact typed structures based on the real schemas.

The conceptual goal is:

```ts
CatalogueModel
CatalogueTechnicalCard
CatalogueMetric
CatalogueContext
CatalogueProvenance
CatalogueIndex
```

but exact fields must reflect actual canonical artifacts.

The normalized model object should expose enough information for later phases to render:

- display name / stable ID;
- family / variant;
- task;
- sample rate;
- embedding contract/dimension where available;
- upstream scientific metrics and provenance;
- input/output summary;
- runtime-verification states;
- linked Technical Card IDs.

The Technical Card representation should expose:

- Technical Card ID;
- model ID;
- protocol ID/version;
- device/backend context;
- execution regime;
- batch information;
- runtime metrics and availability;
- energy/coverage semantics;
- source/provenance;
- raw NPZ reference where available.

Do not flatten away information needed to determine comparability later.

---

# Generated catalogue metadata

Generate catalogue-level metadata including:

- source repository;
- requested source ref;
- resolved source commit SHA if possible;
- catalogue generation timestamp;
- number of canonical models;
- number of canonical Technical Cards;
- relevant schema versions.

The UI footer can use this later.

---

# Test fixtures

Tests must not depend on live network access.

Create small deterministic fixture data representing:

- at least two models;
- multiple Technical Cards;
- one-to-many relationships;
- at least one missing optional metric;
- at least one differing runtime context.

Use fixtures only for tests.

The development sync/build path should still be exercised against the **real** local `torch-dae` 0.2.0 artifacts during this phase.

---

# Skeleton UI

Implement only enough UI to prove normalized data reaches both routes.

`/` should render a simple debug/skeleton list of canonical models.

`/technical-cards` should render a simple debug/skeleton view showing Technical Card counts and contexts.

Do not spend time matching the visual mockups yet.

However establish:

- navbar shell;
- Day/Night theme mechanism;
- base typography;
- design token files;
- full-viewport root layout;
- external links configuration.

The final navbar behavior will be polished in Phase 02.

---

# Theme foundation

Implement persistent Day/Night theme selection.

Requirements:

- tokens based on `TORCH_DAE_WEB_SPEC.md`;
- no flash of wrong theme on initial load where practical;
- persist user preference in local storage;
- respect system preference on first visit;
- theme implementation must work with later React islands.

---

# Required scripts

Provide simple commands similar to:

```text
npm run dev
npm run sync:data
npm run validate:data
npm run test
npm run test:e2e
npm run build
npm run check
```

Exact command names may vary, but document them.

`npm run build` must either ensure canonical data is present or clearly fail with an actionable message.

---

# Validation required before stopping

Run all relevant checks.

At minimum:

```text
npm ci or npm install
npm run sync:data       # against real torch-dae 0.2.0/local checkout
npm run validate:data
npm run check
npm run test
npm run build
```

Run a basic Playwright smoke test for both routes.

Verify:

- `/` returns successfully;
- `/technical-cards` returns successfully;
- theme toggle does not throw;
- real canonical model/Technical Card counts match what is actually discovered;
- no fictitious mockup model IDs appear in generated production data.

If a command is unavailable or changed, document the exact substitute.

---

# Explicit non-goals

Do not implement in this phase:

- polished carousel;
- card expansion animation;
- final Technical Card selectors;
- comparability engine;
- final charts;
- radar visualization;
- detailed responsive polish;
- deployment.

Do not hardcode the fictional models or values shown in mockups.

---

# Documentation required

Add/update:

```text
README.md
docs/data-contract.md
docs/development.md
```

or equivalent.

`docs/data-contract.md` must explain:

- canonical source;
- release/ref behavior;
- validation;
- normalized types;
- joins;
- generated outputs;
- how future torch-dae schema evolution should be handled.

---

# Stop conditions

Stop if:

- the canonical schemas cannot be interpreted reliably;
- actual artifacts reveal a structural assumption that conflicts with the specification;
- a Model Card ↔ Technical Card relationship is ambiguous.

In that case, document the exact conflict rather than improvising.

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

Do **not stage, commit, or push**.

Create a review directory outside the tracked repository:

```text
../phase-01-review/
```

containing:

```text
SUMMARY.md
VALIDATION.md
OPEN_ISSUES.md
CHANGED_FILES.txt
GIT_STATUS.txt
phase-01.patch
TREE.txt
screenshots/
selected-source/
```

## Phase implementation journal

Create/update:

```text
docs/implementation/phase-01.md
```

Record durable facts needed by the next fresh chat: architecture/components introduced, interfaces/contracts, intentional deviations, validation commands, and constraints to preserve.

## SUMMARY.md

Include:

- what was implemented;
- architecture decisions;
- exact canonical source/ref used;
- discovered counts of real Model Cards and Technical Cards;
- normalized type overview;
- generated data layout;
- any deviation from `TORCH_DAE_WEB_SPEC.md`.

## VALIDATION.md

Include every command run and its result.

## OPEN_ISSUES.md

List:

- unresolved decisions;
- technical debt;
- schema ambiguities;
- anything Phase 02 must know.

If none, explicitly write `None`.

## CHANGED_FILES.txt

Record:

```bash
git status --short
git diff --name-status
```

## phase-01.patch

Capture the full working-tree patch. Include new files by ensuring the review bundle contains them even if Git does not include untracked files in a normal diff.

## Screenshots

Capture at least:

```text
screenshots/home-skeleton-light.png
screenshots/home-skeleton-night.png
screenshots/technical-skeleton-light.png
screenshots/technical-skeleton-night.png
```

Use a desktop viewport close to:

```text
1512 × 827
```

## selected-source

Include the key source files needed to independently review:

- ingestion;
- normalization;
- types;
- theme foundation;
- route skeletons;
- package/config/test files.

Do not include `node_modules`, `.git`, build caches, or `dist`.

Finally create:

```text
../torch-dae-web-phase-01-review.tar.gz
```

Print in the final response:

1. exact bundle path;
2. short implementation summary;
3. exact validation results;
4. real model/Technical Card counts discovered;
5. known issues;
6. `git status --short`;
7. statement: `No commit or push performed.`

Then stop.
