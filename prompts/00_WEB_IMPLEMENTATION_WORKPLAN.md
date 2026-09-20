# torch-dae Web — Five-Prompt Implementation Workplan

## Architecture

`torch-dae-web` is a **separate repository** from `torch-dae`.

```text
/Users/stefano/Documents/torch-dae-web
    website implementation

/Users/stefano/Documents/torch-dae
    canonical source data / Python project
```

The source repository is read-only for website implementation agents.

The website consumes released canonical Model Cards, Technical Cards, schemas, and provenance. It does not author them.

---

# Operating model

The entire website is intentionally implemented in **five main work prompts**.

Each phase uses:

```text
1 phase
=
1 fresh Claude/Codex chat
+
zero or more correction rounds in that same chat
+
external review
+
one accepted commit
```

Do not continue directly from one phase to another in the same agent chat.

---

# Per-chat sequence

## First message

Paste:

```text
prompts/00_CHAT_BOOTSTRAP.md
```

Wait for `READY`.

## Second message

Instruct the agent to execute the phase file from disk, e.g.:

```text
Execute prompts/01_FOUNDATION_DATA_CONTRACT.md exactly as written.
```

Using the repository file as the source avoids prompt drift.

## Completion

The agent must:

- stop at the phase boundary;
- leave changes unstaged/uncommitted;
- update the phase implementation journal;
- run required validation;
- create the external review bundle;
- print the bundle path and concise summary.

## Review

Upload the bundle to the external review conversation.

If corrections are required, return to the same phase chat with the targeted correction request.

Only after acceptance should the human commit the phase.

---

# Recommended agent assignment

| Phase | Main concern | Suggested agent |
|---|---|---|
| 01 | scaffold, canonical ingestion, normalized contracts | Codex |
| 02 | high-fidelity Model Cards homepage | Claude |
| 03 | adaptive selectors + comparability engine | Codex |
| 04 | charts, motion, responsive/theme fidelity | Claude |
| 05 | production sync, E2E QA, deployment | Codex |

Agents may be swapped.

---

# Phase 01 — Foundation & Canonical Data Contract

Creates the Astro/TypeScript/React application **in the existing planning-only repository root**, preserving:

```text
00_START_HERE.md
AGENT_CONTEXT.md
TORCH_DAE_WEB_SPEC.md
prompts/
assets/mockups/
```

Implements:

- project/tooling foundation;
- theme tokens/base layout;
- local/release-aware data ingestion;
- canonical schema validation;
- normalized types;
- Model Card ↔ Technical Card joins;
- deterministic fixtures/tests;
- route skeletons;
- Phase 01 implementation journal.

Acceptance:

> Real released/local `torch-dae` data can be validated and normalized without hardcoded catalogue facts; build/tests pass.

---

# Phase 02 — Model Cards Homepage

Implements the final `/` experience:

- fixed-viewport desktop layout;
- navbar;
- Day/Night;
- high-fidelity carousel;
- selected-card in-place expansion;
- canonical model details;
- evidence-aware verification semantics;
- responsive/accessibility behavior;
- screenshots against approved references.

Acceptance:

> Desktop rendering tracks the approved Model Card mockups while showing only canonical data.

---

# Phase 03 — Technical Cards Engine

Implements semantic behavior of `/technical-cards`:

- multi-model selection;
- adaptive selectors;
- deterministic comparability;
- metric registry;
- energy semantics;
- single/multi-model state;
- stable colors;
- URL/shareable state where practical;
- basic data-backed visualization layout.

Acceptance:

> Incompatible Technical Card contexts cannot silently produce misleading comparisons.

---

# Phase 04 — Visualization & Polish

Completes visual/interaction fidelity:

- final charts;
- raw-value tooltips;
- normalized multi-metric radar;
- motion;
- theme polish;
- homepage fidelity pass;
- responsive behavior;
- accessibility;
- performance.

Acceptance:

> Both pages closely match approved mockups on target desktop viewports and remain usable on smaller devices.

---

# Phase 05 — Production QA & Deployment

Productionizes:

- released-source synchronization;
- resolved ref/SHA provenance;
- clean reproducible build;
- CI;
- final cross-browser E2E;
- accessibility/performance smoke;
- deployment workflow;
- release-update docs;
- final real-data audit.

Acceptance:

> Static production build is reproducible from a canonical released `torch-dae` snapshot and is ready for human-approved deployment.

---

# Persistent implementation journal

Fresh chats recover accepted decisions from:

```text
docs/implementation/
├── phase-01.md
├── phase-02.md
├── phase-03.md
├── phase-04.md
└── phase-05.md
```

Each phase owns exactly its journal file.

These files are committed with the accepted phase.

---

# Standard review bundle

Every phase creates outside the repository:

```text
../phase-XX-review/
├── SUMMARY.md
├── VALIDATION.md
├── OPEN_ISSUES.md
├── BASE_HEAD.txt
├── GIT_STATUS.txt
├── CHANGED_FILES.txt
├── DIFFSTAT.txt
├── phase-XX.patch
├── TREE.txt
├── screenshots/
├── changed-files/
└── selected-source/
```

and:

```text
../torch-dae-web-phase-XX-review.tar.gz
```

## Why both patch and changed-files?

`git diff` does not contain untracked files.

Therefore:

- `phase-XX.patch` captures tracked modifications;
- `changed-files/` contains exact copies of **every modified or untracked source/config/doc/test file** from the phase.

This makes the review bundle self-contained.

## Exclude

Never include:

```text
.git/
node_modules/
dist/
.astro/
coverage/
playwright-report/
test-results/
large caches
```

---

# Commit policy

Agents do not stage, commit, or push.

After review acceptance, the human commits.

Suggested commits:

```text
01  feat(web): establish catalogue foundation and data contract
02  feat(web): implement Model Card catalogue experience
03  feat(web): implement Technical Card comparison engine
04  feat(web): add runtime visualizations and interaction polish
05  chore(web): productionize catalogue build and deployment
```

---

# Product scope

Two primary internal pages only:

```text
/
Model Cards

/technical-cards
Technical Card explorer
```

External navbar destinations:

```text
GitHub
Read the Docs latest
PyPI
```

Do not expand the MVP into a CMS, backend, account system, inference service, or multi-page documentation site.

---

# Review rule

A phase is not considered complete merely because the coding agent says it is complete.

Completion requires:

1. agent validation;
2. review bundle;
3. external review;
4. correction loop if needed;
5. accepted clean commit.

Only then start the next fresh chat.
