# WORK PROMPT 03 — Technical Cards Selectors & Comparability Engine

## Role

Act as a senior data-visualization/frontend systems engineer with strong knowledge of experimental benchmarking and reproducibility.

This is **Phase 03 of 05**.

The goal is to implement the logic and interaction architecture of `/technical-cards`.

Visual polish and advanced chart fidelity will be completed in Phase 04.

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
docs/implementation/phase-03.md
```

for this phase, and produce the required external review bundle.


# First actions

Before modifying anything:

1. read `TORCH_DAE_WEB_SPEC.md`;
2. inspect all four approved mockups, especially:
   ```text
   assets/mockups/technical-light.png
   assets/mockups/technical-night.png
   ```
3. inspect Phase 01 canonical data contract;
4. inspect Phase 02 homepage only to preserve global navbar/theme consistency;
5. run the current full validation suite;
6. inspect actual `torch-dae` Technical Cards and normalized runtime contexts.

Do not invent device/backend/protocol combinations.

---

# Objective

Transform `/technical-cards` into a working adaptive runtime evidence explorer.

By the end of this phase it must provide:

- multi-model selection;
- adaptive context selectors;
- deterministic comparability evaluation;
- single-model and multi-model modes;
- metric-availability logic;
- explicit comparable/partial/incomparable states;
- canonical metric summary cards;
- stable model color assignment;
- shareable/reproducible selection state where practical;
- basic plot components sufficient to prove data flow;
- exhaustive unit tests of comparability logic.

The priority is semantic correctness.

---

# Selector system

Implement the selector order:

1. Models
2. Device / Backend
3. Execution Regime
4. Protocol Version
5. Batch Size
6. View Mode

Only expose a selector if the underlying canonical data supports the concept.

If actual schemas distinguish fields differently, adapt labels while preserving the intended interaction.

---

# Adaptive filtering model

Selectors must not operate independently.

Implement a deterministic state reducer or equivalent.

Conceptual behavior:

```text
selected models
    ↓
available shared contexts
    ↓
available device/backend values
    ↓
available execution regimes
    ↓
available protocol versions
    ↓
available batch sizes
    ↓
available metrics
```

Changing an upstream selector must:

- recompute valid downstream options;
- preserve current downstream selections if still valid;
- otherwise choose a deterministic valid fallback;
- never silently retain an invalid context.

Disabled options should explain why they are unavailable where feasible.

---

# Model selection

Support:

- one selected model;
- multiple selected models;
- clear all;
- add/remove model chips;
- maximum comparison count chosen deliberately.

If a maximum is needed for chart readability, use a documented limit such as 5.

Do not rely on mockup model names.

Render only canonical models.

---

# Comparability contract

Implement comparability as pure/testable data logic, separate from UI components.

Inspect actual Technical Card fields and profiling protocol semantics.

A candidate direct comparison should consider relevant shared context dimensions including, when present:

- Technical Card/model identity;
- protocol ID;
- protocol version;
- device class/backend;
- execution regime;
- CPU regime/thread mode;
- batch size;
- input duration;
- relevant input/task context;
- metric availability;
- any profiling-context field that materially changes the meaning of a metric.

Do not over-constrain using fields that are merely descriptive rather than comparability-relevant.

Document every rule.

---

# Comparability result object

Create a typed result similar in spirit to:

```ts
type ComparabilityStatus =
  | "direct"
  | "partial"
  | "incompatible"

type ComparabilityResult = {
  status: ComparabilityStatus
  comparableMetricIds: string[]
  excludedMetricIds: string[]
  reasons: ComparabilityReason[]
  resolvedContext: ...
}
```

Use actual project naming conventions.

Reasons must be machine-readable and human-renderable.

Examples:

```text
protocol-version-mismatch
device-mismatch
execution-regime-mismatch
metric-unavailable
energy-coverage-mismatch
no-shared-batch
```

Only implement reasons supported by real data semantics.

---

# UI comparability banner

Render one of three states.

## Direct

Green:

```text
Selected cards are directly comparable under the chosen context.
```

## Partial

Amber:

```text
Some metrics cannot be compared under the selected context.
```

Explain excluded metrics.

## Incompatible

Clear warning:

```text
Selected cards are not directly comparable.
```

Explain why and do not render misleading normalized comparative charts.

---

# Metric model

Build a canonical frontend metric registry from real Technical Card fields.

For each metric capture:

- stable ID;
- display name;
- unit;
- directionality:
  - lower is better
  - higher is better
  - descriptive/no ranking
- availability accessor;
- whether comparison is valid across selected contexts;
- whether normalization is allowed;
- formatting rules.

Likely metrics include, if present in actual data:

- latency;
- throughput;
- RTF;
- speed factor;
- memory;
- energy.

Do not invent a metric that is not represented canonically.

---

# Energy semantics

Handle energy explicitly.

Never map missing/null energy to zero.

Preserve, when available:

- measured vs estimated semantics;
- coverage completeness;
- unaccounted components;
- energy provider/backend;
- privilege requirements.

Comparative energy charts are allowed only when the selected cards expose meaningfully comparable energy evidence.

Document the rule.

---

# Single-model mode

When one model is selected:

- expose all valid Technical Card contexts for that model;
- allow detailed selection;
- compute metric summaries;
- provide basic plots/table placeholders backed by real data.

The final advanced chart presentation comes in Phase 04.

---

# Multi-model mode

When multiple models are selected:

- adaptive selectors reflect intersection/shared contexts;
- comparability is evaluated before plotting;
- summary metrics show one value/series per model;
- stable model colors are used;
- incomparable metrics disappear or are explicitly disabled.

Do not choose arbitrary Technical Cards behind the user’s back.

Every rendered runtime value must correspond to an explicit resolved context.

---

# Stable model colors

Implement deterministic model-ID → color mapping using the approved palette.

The same model must use the same color:

- selector chip;
- summary card;
- line/bar series;
- legend;
- lower selected-card strip.

Persist deterministically across reloads.

---

# URL / shareable state

If compatible with Astro static routing, encode Technical Card explorer state in URL query parameters.

At minimum consider:

```text
models=
device=
regime=
protocol=
batch=
view=
```

Requirements:

- loading a valid URL restores selection;
- invalid/stale query values are sanitized;
- URL updates without full navigation;
- state remains deterministic.

If this creates disproportionate complexity, implement model/context state serialization to a copy-link function and document the tradeoff.

---

# Basic page composition

Build the structural layout matching the mockup:

```text
Navbar

Technical Cards title/context

Selector row

Comparability banner

Metric summary cards

Basic chart workspace

Selected model/evidence strip
```

Do not spend excessive time on final chart styling.

A basic line/bar implementation using the final chart library is acceptable and useful to validate data transformations.

---

# Evidence strip

For each selected model/context show compact evidence information:

- model name;
- Technical Card ID or count/resolved card;
- protocol;
- device/backend;
- verification/evidence indicator;
- links to canonical JSON/raw evidence where configured.

Do not add model detail pages.

---

# Tests

Comparability logic requires strong unit tests.

Create matrix-style tests covering:

- same model/context;
- multiple models direct comparison;
- protocol mismatch;
- backend/device mismatch;
- execution regime mismatch;
- no shared batch;
- missing metric;
- energy unavailable;
- partial metric intersection;
- selector fallback after removing an option;
- URL restore/sanitization if implemented.

Use fixture data plus at least one test against the normalized shape of the real current catalogue.

Do not require network in unit tests.

---

# E2E tests

Add Playwright tests for:

- select one model;
- select multiple models;
- change backend/context;
- remove model;
- comparability banner changes;
- incompatible context cannot silently render comparison;
- theme remains functional;
- navigation back to `/`.

---

# Validation

Run at minimum:

```text
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run build
npm run test:e2e
```

Also run a direct comparability-data audit script/report against real canonical Technical Cards.

Produce a report such as:

```text
actual shared comparison contexts discovered
per-model Technical Card counts
shared metric sets
energy availability patterns
```

This report is important for external review.

---

# Scope boundaries

Do not:

- redesign homepage;
- add backend/database;
- add rankings;
- normalize scientific upstream scores with runtime metrics;
- invent composite score;
- finalize radar normalization yet;
- over-polish animations/charts.

If actual data cannot support a mockup control, omit/adapt it and document why.

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

Create:

```text
../phase-03-review/
```

with:

```text
SUMMARY.md
VALIDATION.md
OPEN_ISSUES.md
COMPARABILITY_RULES.md
REAL_DATA_AUDIT.md
CHANGED_FILES.txt
GIT_STATUS.txt
phase-03.patch
TREE.txt
screenshots/
selected-source/
```

## COMPARABILITY_RULES.md

This is mandatory.

Document:

- fields considered;
- fields intentionally ignored;
- direct/partial/incompatible semantics;
- metric availability rules;
- energy rules;
- deterministic fallback behavior.

## REAL_DATA_AUDIT.md

Using the actual current canonical catalogue, document:

- model IDs;
- Technical Card counts;
- distinct devices/backends;
- execution regimes;
- protocols/versions;
- batch sets;
- metric coverage;
- actual directly comparable groups discovered.

Do not include invented values.

## Screenshots

Capture at 1512×827:

```text
technical-single-light.png
technical-single-night.png
technical-multi-direct-light.png
technical-multi-direct-night.png
technical-partial-or-incompatible.png
```

If current canonical data contains no naturally incompatible selectable group under the adaptive UI, create the screenshot using deterministic test fixture mode and label it as fixture-only.

## selected-source

Include:

- selector state logic;
- comparability engine;
- metric registry;
- Technical Cards page;
- URL/state serialization;
- tests.

Create:

```text
../torch-dae-web-phase-03-review.tar.gz
```

Final response must provide:

1. bundle path;
2. selector/comparability summary;
3. actual direct comparison contexts discovered;
4. validation summary;
5. known issues;
6. screenshots;
7. `git status --short`;
8. `No commit or push performed.`

Then stop.
