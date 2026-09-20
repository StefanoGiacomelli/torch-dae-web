# WORK PROMPT 02 — High-Fidelity Model Cards Homepage

## Role

Act as a senior product frontend engineer and interaction designer.

This is **Phase 02 of 05**.

Implement the approved Model Cards homepage at `/` with high visual fidelity to the supplied mockups while preserving canonical `torch-dae` data semantics.

Do not work on the final Technical Cards dashboard beyond maintaining its existing skeleton.

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
docs/implementation/phase-02.md
```

for this phase, and produce the required external review bundle.


# First actions

Before editing anything:

1. read `TORCH_DAE_WEB_SPEC.md` completely;
2. inspect:
   ```text
   assets/mockups/home-light.png
   assets/mockups/home-night.png
   assets/mockups/technical-light.png
   assets/mockups/technical-night.png
   ```
3. inspect the Phase 01 architecture, data contract, tests, and normalized catalogue types;
4. run the Phase 01 validation suite once to establish a clean baseline;
5. inspect actual normalized Model Card data before deciding what fields can be shown.

Do not assume that fictional text or values in mockups exist in canonical data.

---

# Objective

Make `/` closely resemble the approved Model Cards mockups.

The page must become the actual model catalogue, not a conventional scrolling landing page.

Deliver:

- full-viewport non-scrollable desktop composition;
- persistent navbar;
- Day/Night theme;
- high-fidelity card carousel;
- keyboard/mouse/trackpad/swipe navigation;
- selected central card;
- in-place expansion of selected card;
- canonical compact fields;
- canonical expanded details;
- evidence-aware runtime verification;
- tasteful performance-summary section only where canonical Technical Card context permits;
- responsive adaptation;
- accessible interactions.

---

# Visual target

Treat these as high-fidelity targets:

```text
assets/mockups/home-light.png
assets/mockups/home-night.png
```

Replicate the overall design language:

- restrained scientific premium aesthetic;
- large “Model Cards” heading;
- background acoustic/waveform motif;
- layered card carousel;
- subtle depth/perspective;
- strongly dominant selected card;
- blue/cyan product identity;
- high-quality dark theme;
- compact factual footer strip.

Do not reproduce mockup-only fictional claims.

---

# Navbar

Implement the final navbar:

```text
torch-dae logo/title

Day / Night

Technical Cards
GitHub ↗
Documentation ↗
PyPI ↗
```

Destinations:

```text
Technical Cards
/technical-cards

GitHub
https://github.com/StefanoGiacomelli/torch_dae

Documentation
https://torch-dae.readthedocs.io/en/latest/

PyPI
https://pypi.org/project/torch-deepaudioembedding/
```

Requirements:

- external-link indicator;
- keyboard accessible;
- responsive;
- visible but compact;
- theme control persists;
- logo returns to `/`.

---

# Full-viewport requirement

On target desktop/laptop sizes:

```text
height: 100dvh
overflow: hidden
```

No document-level vertical scrollbar.

The major regions must fit within the viewport:

- navbar;
- title/context;
- carousel;
- pagination;
- lower factual strip.

Use responsive scaling rather than shrinking text to unusable sizes.

Use:

- CSS Grid/Flexbox;
- `clamp()`;
- container queries if useful;
- `aspect-ratio`;
- responsive gaps and typography.

---

# Carousel

Implement a robust carousel component.

Required navigation:

- click a visible card;
- previous/next buttons;
- keyboard ArrowLeft/ArrowRight;
- pointer drag/swipe;
- trackpad/mouse horizontal gesture where practical;
- pagination dots.

For the current small catalogue, handle three canonical models elegantly.

Do not fabricate additional models just to fill the five-card mockup.

With three cards:

- center one card;
- show meaningful side cards;
- allow subtle partial/edge composition without fake content;
- maintain the same visual concept.

Future catalogues with more models must work automatically.

---

# Card states

## Compact state

Use only factual canonical/derived fields that exist.

Recommended priority:

1. display name;
2. stable model ID or short index;
3. family;
4. primary task;
5. sample rate;
6. embedding dimension;
7. runtime-verification status;
8. representative first-party visual.

If a field is absent, omit it cleanly rather than displaying `N/A` everywhere.

## Hover/focus state

Use:

- subtle scale;
- elevation;
- border/glow;
- visible focus ring.

Avoid excessive 3D effects.

## Selected / expanded state

On selection:

1. card animates toward center;
2. card grows;
3. neighbor cards shift outward;
4. detail area unfolds inside the same card;
5. no modal and no route change.

The expanded card should expose canonical information in a compact visual hierarchy.

---

# Expanded card content

Render, when available:

## Identity
- model name;
- family;
- model ID;
- variant;
- checkpoint/source identity.

## Scientific profile
- task;
- dataset/evaluation context;
- upstream reported metric(s).

Clearly label upstream metrics as upstream reported.

Never imply local reproduction unless evidence says so.

## Input
- representation;
- tensor shape;
- sample rate;
- constraints/minimum duration if normalized data exposes them.

## Outputs
- logits/probabilities/embedding where available;
- dimensions.

## Embedding
- canonical/default embedding name;
- dimension.

## Runtime verification
Show backend/device states with distinct semantics:

```text
verified
upstream-declared but locally unverified
not represented
```

Never turn upstream capability into local verification.

---

# Performance summary inside expanded card

If Phase 01 provides enough normalized Technical Card information to identify a deterministic default/reference context, show a compact runtime summary.

The context must be discoverable via caption/tooltip.

Possible metrics:

- latency;
- throughput;
- RTF;
- memory;
- energy when valid.

Always display raw values.

Use segmented/color scales only as secondary visual encoding.

Do not implement `A/B/C/...` grades.

If no scientifically defensible default context exists, render a compact link/indicator such as:

```text
3 canonical Technical Cards
Explore runtime evidence →
```

rather than choosing an arbitrary Technical Card.

Document the decision.

---

# Visual performance bars

Implement the appliance-label-inspired treatment only as:

```text
numeric value
+ directionality
+ segmented/gradient visual scale
```

No categorical A–G labels in the MVP.

Ensure scales cannot be interpreted as cross-device universal ratings unless they are actually normalized within an explicitly disclosed context.

---

# Model visual identities

Create first-party visual assets for the current canonical models.

Preferred style:

- waveform/spectrogram-derived;
- abstract acoustic patterns;
- coherent with dark/light theme;
- no copyright-sensitive external images.

Assets may be generated procedurally/SVG/CSS or designed locally.

Do not use unrelated stock imagery.

Keep mapping deterministic by model ID/family.

---

# Background motif

Implement a subtle acoustic/waveform line motif similar to the approved mockups.

Requirements:

- first-party SVG/CSS;
- low visual dominance;
- theme-aware;
- no continuous expensive animation;
- does not interfere with content/readability.

---

# Footer strip

Implement a compact factual strip inspired by the mockup.

Use factual statements only, e.g.:

```text
Open source
Reproducible evidence
PyTorch ecosystem
torch-dae catalogue · <release/ref>
```

Avoid unsupported marketing claims.

---

# Interaction quality

Transitions should usually be:

```text
150–350 ms
```

Major expansion may take slightly longer.

Support `prefers-reduced-motion`.

No looping decorative motion.

---

# Responsive behavior

Test at minimum:

```text
1512 × 827
1440 × 900
1280 × 800
1024 × 768
768 × 1024
390 × 844
```

Desktop is the flagship.

On narrow layouts:

- keep one dominant card;
- allow side peek where feasible;
- preserve navbar functionality;
- controlled internal overflow is acceptable if required;
- do not allow unusable text scaling.

Document any deliberate mobile deviation from strict non-scroll behavior.

---

# Accessibility

Required:

- semantic buttons;
- keyboard carousel navigation;
- focus states;
- ARIA labels where needed;
- theme control accessible;
- external link semantics;
- sufficient contrast;
- color not sole indicator;
- reduced motion support.

---

# Testing

Add/extend tests for:

- catalogue renders only canonical models;
- carousel selects models;
- ArrowLeft/ArrowRight navigation;
- selected card expands;
- theme toggles/persists;
- no fictitious model from mockups appears;
- external links are correct;
- runtime verification labels preserve semantics;
- no unsupported qualitative badges.

Add Playwright coverage for major interactions.

---

# Visual validation

Run the site against real canonical data.

Capture deterministic screenshots at:

```text
1512 × 827
```

for:

```text
home-light.png
home-night.png
```

Also capture:

```text
home-light-expanded.png
home-night-expanded.png
```

with the same selected model in both themes.

Capture one laptop and one mobile screenshot.

Compare manually against approved mockups and document:

- major visual matches;
- intentional deviations;
- remaining fidelity gaps for Phase 04.

---

# Scope limits

Do not implement the final Technical Cards selectors/charts in this phase.

Do not change ingestion contracts unless a real bug is found.

If Phase 01 data architecture needs adjustment, make the smallest justified change and document it explicitly.

Do not add internal model-detail routes.

---

# Validation required

At minimum run:

```text
npm run sync:data
npm run validate:data
npm run check
npm run test
npm run build
npm run test:e2e
```

Also verify no vertical scrollbar at 1512×827 and 1440×900.

Use browser automation to assert:

```js
document.documentElement.scrollHeight <= window.innerHeight + tolerance
```

for target desktop sizes.

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
../phase-02-review/
```

with:

```text
SUMMARY.md
VALIDATION.md
OPEN_ISSUES.md
CHANGED_FILES.txt
GIT_STATUS.txt
phase-02.patch
TREE.txt
screenshots/
selected-source/
```

## screenshots

Must include:

```text
approved-reference-home-light.png   # copy/reference if useful
approved-reference-home-night.png

implemented-home-light.png
implemented-home-night.png
implemented-home-light-expanded.png
implemented-home-night-expanded.png
implemented-home-laptop.png
implemented-home-mobile.png
```

Do not modify the original approved mockups.

## Phase implementation journal

Create/update:

```text
docs/implementation/phase-02.md
```

Record durable facts needed by the next fresh chat: architecture/components introduced, interfaces/contracts, intentional deviations, validation commands, and constraints to preserve.

## SUMMARY.md

Explain:

- components implemented;
- carousel mechanics;
- exact compact card fields;
- exact expanded card fields;
- runtime summary/default-context policy;
- responsive strategy;
- fidelity assessment.

## VALIDATION.md

List commands and results.

## OPEN_ISSUES.md

List any remaining visual/interaction issue to be handled in Phase 04.

## selected-source

Include key:

- homepage;
- navbar;
- carousel;
- card components;
- theme/style files;
- relevant tests.

Create:

```text
../torch-dae-web-phase-02-review.tar.gz
```

Final response must print:

1. bundle path;
2. implementation summary;
3. validation summary;
4. screenshot paths;
5. remaining fidelity gaps;
6. `git status --short`;
7. `No commit or push performed.`

Then stop.
