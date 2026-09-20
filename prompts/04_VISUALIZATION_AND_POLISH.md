# WORK PROMPT 04 — Runtime Visualizations, Motion, Responsive & Visual Fidelity

## Role

Act as a senior data-visualization engineer, interaction designer, and frontend performance specialist.

This is **Phase 04 of 05**.

The data contract and comparability semantics are already established. Do not redesign those rules unless a verified bug is found.

The goal is to turn both pages into the final approved visual experience.

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
docs/implementation/phase-04.md
```

for this phase, and produce the required external review bundle.


# First actions

Read:

```text
TORCH_DAE_WEB_SPEC.md
```

Inspect all mockups side-by-side with the current implementation:

```text
assets/mockups/home-light.png
assets/mockups/home-night.png
assets/mockups/technical-light.png
assets/mockups/technical-night.png
```

Inspect:

- Phase 02 homepage;
- Phase 03 comparability engine and `COMPARABILITY_RULES.md`;
- current real canonical data.

Run the current full validation suite before changes.

---

# Objective

Achieve high visual and interaction fidelity to the approved mockups while preserving scientific correctness.

Complete:

1. production-quality runtime charts;
2. responsive chart grid;
3. normalized multi-metric comparison;
4. energy-specific rendering;
5. animated selector/chart transitions;
6. final Model Card carousel polish;
7. final Day/Night visual system;
8. full desktop viewport fidelity;
9. laptop/tablet/mobile adaptation;
10. accessibility and reduced-motion behavior;
11. frontend performance optimization.

---

# Technical Cards visual target

Treat the approved Technical Cards mockups as the primary layout reference.

Target composition:

```text
Navbar

compact heading + acoustic motif

adaptive selector row

comparability banner

metric summary cards

chart workspace

selected model/evidence strip
```

Make the real current canonical data fit this structure.

---

# Chart implementation

Use the chart library already selected/installed.

Required plot families when supported by actual metrics:

## Single-model

- latency vs batch size;
- throughput vs batch size;
- memory vs batch size;
- RTF vs batch size;
- speed factor vs batch size;
- energy vs batch size where valid.

## Multi-model

- comparative latency curves;
- comparative throughput;
- comparative memory;
- RTF comparison;
- energy comparison where valid;
- normalized multi-metric radar.

Choose line/bar presentation according to metric semantics and available x dimensions.

Do not force every metric into the same chart type.

---

# Raw values and tooltips

Every chart must expose canonical raw values.

Tooltip should include, when relevant:

- model name;
- metric value;
- unit;
- batch;
- device/backend;
- execution regime;
- protocol version;
- evidence/Technical Card identity.

Avoid clutter but preserve traceability.

---

# Scale rules

Use linear/log controls only where meaningful.

If log scale is offered:

- never use it for zero/negative values;
- make current scale visible;
- maintain raw tooltip values;
- test accessibility/readability.

---

# Normalized multi-metric radar

Implement only for directly comparable selected models.

Rules:

1. only include metrics available for all selected models;
2. never include upstream scientific metrics;
3. define the normalization formally in code/docs;
4. keep values within `[0, 1]`;
5. “lower is better” metrics may be inverted only for the normalized display;
6. “higher is better” retain positive direction;
7. constant-valued dimensions must be handled without division-by-zero;
8. raw values must be available via tooltip/adjacent summary;
9. chart title must say:
   ```text
   Normalized Multi-Metric Comparison
   ```
10. provide an info tooltip explaining normalization.

If fewer than three valid metrics remain, omit the radar and use an alternate compact comparison.

---

# Normalization requirement

Implement the simplest transparent normalization consistent with selected comparable models, e.g. min-max normalization within the currently selected comparison set.

Document this explicitly.

Do not call it an absolute performance score.

Do not persist normalized values as canonical data.

---

# Energy visualization

Use energy only when the comparability engine authorizes it.

Visual states:

```text
measured / comparable
partial coverage
unavailable
```

Missing energy must never appear as zero.

If coverage is partial:

- label it;
- expose details in tooltip;
- avoid implying complete device-level energy accounting.

---

# Metric summary row

Polish the summary cards to match the approved mockup.

Each card should show:

- icon;
- metric name;
- directionality;
- raw value(s);
- stable model colors;
- optional microchart/sparkline;
- unit.

Use factual microcopy:

```text
Lower is better
Higher is better
```

only where directionality is defined.

---

# Home page fidelity pass

Revisit the Phase 02 homepage and close visible gaps.

Focus on:

- card proportions;
- selected-card hierarchy;
- carousel depth;
- spacing;
- navbar density;
- typography;
- theme consistency;
- bottom strip;
- acoustic background;
- hover/focus;
- expansion transition.

Do not change which canonical fields are shown unless required for layout correctness.

---

# Theme polish

Both themes must feel intentionally designed.

Night theme:

- deep navy, not pure black;
- high contrast without neon overload;
- cyan/blue glow controlled;
- charts readable.

Day theme:

- clean off-white/light-blue background;
- soft border/shadow;
- same information hierarchy;
- not merely inverted dark mode.

Charts, tooltips, SVG icons, gradients, borders, and focus states must be theme-aware.

---

# Motion system

Create a small reusable motion system.

Target durations:

```text
150–350 ms
```

Longer only for selected-card expansion.

Animate:

- carousel movement;
- card expansion/collapse;
- selector-dependent metric cards;
- chart series entering/exiting;
- layout reflow;
- comparability banner changes;
- theme transitions.

Avoid:

- looping decorative animations;
- motion that obscures data;
- excessive spring/bounce.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

and ensure all functionality remains usable with animation disabled.

---

# Responsive behavior

Test at:

```text
1920 × 1080
1512 × 827
1440 × 900
1366 × 768
1280 × 800
1024 × 768
768 × 1024
390 × 844
```

Requirements:

## Desktop/laptop
- no document vertical scroll on flagship sizes;
- all primary selectors visible;
- chart workspace fits;
- selected Model Card remains dominant.

## Tablet
- selectors may wrap into two compact rows;
- chart grid may reduce columns;
- maintain readability.

## Mobile
The product may deviate from strict non-scroll behavior where unavoidable.

Prefer:
- one dominant card;
- touch carousel;
- compact navbar/menu;
- Technical Card selectors in controlled drawer/accordion;
- vertical chart flow if needed.

Do not reduce font sizes below practical readability just to avoid scrolling.

Document the final responsive policy.

---

# Accessibility

Perform an accessibility pass.

Required:

- keyboard access to all interactive elements;
- focus order;
- focus visibility;
- labels for chart controls;
- color + shape/marker distinction;
- adequate contrast;
- no hover-only critical information;
- reduced motion;
- external-link semantics;
- sensible heading structure.

If feasible, add `axe`/Playwright accessibility checks.

---

# Performance

Optimize:

- avoid loading NPZ assets for standard rendering;
- lazy-load visual assets;
- avoid unnecessary React hydration;
- keep chart islands scoped;
- avoid giant client-side catalogue payloads;
- ensure no accidental repeated source-data fetch;
- ensure theme switch does not rerender the whole site unnecessarily.

Record final bundle/build size.

---

# Visual regression screenshots

Capture high-resolution deterministic screenshots.

Required:

```text
1512 × 827
```

## Homepage
- home-light
- home-night
- home-light-expanded
- home-night-expanded

## Technical Cards
- technical-light-direct-comparison
- technical-night-direct-comparison
- technical-light-single
- technical-night-single
- technical-incompatible-or-partial

Also:

```text
1366 × 768
1024 × 768
390 × 844
```

for both main pages.

---

# Visual fidelity review

Create `VISUAL_FIDELITY.md`.

For each approved mockup:

```text
reference:
assets/mockups/...

implementation:
screenshots/...
```

Assess:

- layout;
- typography;
- spacing;
- palette;
- cards;
- navbar;
- controls;
- charts;
- footer;
- motion.

Classify remaining differences:

```text
intentional semantic correction
responsive necessity
implementation gap
```

There should be no unexplained major gap.

---

# Tests

Extend tests for:

- chart metric transformations;
- normalized radar;
- directionality inversion;
- constant-value normalization;
- missing energy;
- reduced metric intersection;
- theme;
- responsive smoke tests;
- keyboard interaction;
- reduced-motion setting.

Run E2E interactions with real canonical data.

---

# Validation

Run full:

```text
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run build
npm run test:e2e
```

Also measure:

- build output size;
- browser console errors;
- hydration errors;
- page scroll dimensions at flagship viewport.

There must be zero console errors in normal navigation.

---

# Scope limits

Do not:

- add deployment yet;
- redesign data schema;
- change comparability rules without explicit bug evidence;
- add new product pages;
- add A–G grades;
- add arbitrary model ranking;
- load raw NPZ for overview plots.

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
../phase-04-review/
```

containing:

```text
SUMMARY.md
VALIDATION.md
OPEN_ISSUES.md
VISUAL_FIDELITY.md
PERFORMANCE.md
ACCESSIBILITY.md
CHANGED_FILES.txt
GIT_STATUS.txt
phase-04.patch
TREE.txt
screenshots/
selected-source/
```

## PERFORMANCE.md

Include:

- build size;
- major client bundles;
- hydration strategy;
- known performance risks.

## ACCESSIBILITY.md

Include:

- checks performed;
- keyboard behavior;
- contrast concerns;
- reduced-motion behavior;
- any unresolved issue.

## Screenshots

Include all required viewport/theme states listed above.

## selected-source

Include:

- charts;
- visualization transforms;
- homepage main visual components;
- Technical Cards layout;
- motion/theme styles;
- relevant tests.

Create:

```text
../torch-dae-web-phase-04-review.tar.gz
```

Final response must print:

1. bundle path;
2. high-level fidelity assessment;
3. validation results;
4. performance summary;
5. accessibility summary;
6. known remaining deviations;
7. screenshot list;
8. `git status --short`;
9. `No commit or push performed.`

Then stop.
