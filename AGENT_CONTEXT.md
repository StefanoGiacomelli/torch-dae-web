# torch-dae-web — Global Agent Context

## Purpose

This file is the persistent operating contract for every Claude/Codex implementation chat working on `torch-dae-web`.

It contains **global constraints only**. Phase-specific work is defined separately under `prompts/`.

Read and obey this file before any phase prompt.

---

## 1. Repository identity

You are working in the dedicated website repository:

```text
/Users/stefano/Documents/torch-dae-web
```

This repository is intentionally separate from the Python/scientific project:

```text
/Users/stefano/Documents/torch-dae
```

The separation is architectural and must be preserved.

### `torch-dae-web`

Owns:

- Astro/TypeScript/React website code
- build-time catalogue ingestion
- normalized presentation models
- interactive Model Card UI
- Technical Card explorer
- comparability UI logic
- charts
- static deployment
- website tests and documentation

### `torch-dae`

Owns:

- Python package
- CLI
- Model Cards
- Technical Cards
- JSON schemas
- runtime-verification evidence
- profiling evidence
- canonical scientific/runtime provenance

`torch-dae-web` is a **read-only consumer** of `torch-dae`.

---

## 2. Canonical source policy

Canonical scientific/runtime facts must come from the `torch-dae` repository artifacts.

Never invent:

- model IDs
- metric values
- sample rates
- embedding dimensions
- verification states
- Technical Card contexts
- device support
- energy results
- upstream scientific results
- provenance

The approved mockups contain illustrative/fictitious values and labels. Their layout and visual language are normative; their data is not.

Initial production catalogue baseline:

```text
torch-dae release/tag: v0.2.0
```

Always resolve the tag/ref to its actual commit when syncing data. Do not hardcode a remembered SHA.

---

## 3. Source repository is read-only

You may inspect:

```text
/Users/stefano/Documents/torch-dae
```

using read-only filesystem/Git commands.

You must not:

- edit files there
- switch branches there
- pull/fetch/reset there unless explicitly requested
- install dependencies there
- create generated files there
- stage/commit/push there

If an operation could mutate `torch-dae`, do not perform it.

---

## 4. Product scope is fixed

The website has two primary internal pages:

```text
/
Model Cards catalogue

/technical-cards
Technical Card explorer
```

Persistent external navbar destinations:

- GitHub
- Documentation / Read the Docs `latest`
- PyPI

Do not add product pages, backend services, accounts, CMS, database, browser model inference, card editing, or rankings unless explicitly approved after review.

---

## 5. Visual target

These four files are approved design references and must never be overwritten:

```text
assets/mockups/home-light.png
assets/mockups/home-night.png
assets/mockups/technical-light.png
assets/mockups/technical-night.png
```

Target high visual fidelity, especially on desktop.

Scientific correctness and accessibility override mockup-only fictional content.

Do not alter the reference images.

---

## 6. Scientific presentation rules

Keep Model Card scientific information distinct from Technical Card runtime evidence.

Do not:

- imply upstream scientific metrics were locally reproduced unless evidence says so
- convert upstream capability into local runtime verification
- treat missing energy as zero
- generate comparisons across incompatible Technical Card contexts
- create opaque composite performance scores
- use qualitative ranking labels such as “best”, “state-of-the-art”, “production ready”, or `A–G` performance grades without a formally approved rule

Raw canonical values and provenance must remain accessible.

---

## 7. Comparability is a data rule

Comparability logic must be explicit, deterministic, testable, and separate from presentation components.

The UI may render:

- directly comparable
- partially comparable
- incompatible

It must never silently choose arbitrary Technical Cards to manufacture a comparison.

---

## 8. Planning/control files are read-only inputs

Unless the current phase explicitly requests otherwise, do not modify:

```text
AGENT_CONTEXT.md
TORCH_DAE_WEB_SPEC.md
00_START_HERE.md
prompts/**
assets/mockups/**
```

If you discover a contradiction in one of these inputs, stop and report it instead of rewriting the contract.

---

## 9. Fresh-chat continuity

Every main phase runs in a fresh chat.

Do not assume any conversational memory.

Recover prior state from:

1. current repository files;
2. Git history;
3. `docs/implementation/phase-*.md`;
4. the current phase prompt.

Before coding in Phases 02–05, read every existing accepted implementation journal under:

```text
docs/implementation/
```

Do not rely on review bundles from earlier phases unless they are explicitly supplied.

---

## 10. Scope discipline

Work only on the current phase.

Do not “helpfully” start the next phase.

If a future-phase improvement is obvious, record it in the current phase’s `OPEN_ISSUES.md` / implementation journal rather than implementing it prematurely.

Prefer the smallest architecture that satisfies the specification and current phase.

---

## 11. Git discipline

Implementation agents must not:

- `git add`
- commit
- push
- force-push
- create/delete tags
- merge branches
- deploy production

unless the user explicitly authorizes that exact action in the current chat.

The normal phase ends with an **unstaged working tree** plus a review bundle.

The human/reviewer decides when the phase is accepted and committed.

---

## 12. Modification discipline

Before making changes:

- inspect the current branch;
- inspect `git status`;
- inspect relevant existing code/tests;
- establish a clean validation baseline where the phase prompt requires it.

Do not erase unrelated user work.

Do not use broad destructive commands such as reset/clean unless explicitly authorized.

---

## 13. Quality discipline

Every phase must:

- add tests for new logic;
- run the phase validation commands;
- report failures honestly;
- distinguish implementation defects from environment/tool limitations;
- leave no knowingly broken required gate;
- avoid hardcoded catalogue values in production UI.

Browser/network-dependent tests should have deterministic local fixtures where practical.

---

## 14. Implementation journal

Each phase creates/updates exactly one journal file:

```text
docs/implementation/phase-XX.md
```

It must record durable facts needed by the next fresh chat:

- what was implemented;
- important components/files;
- interfaces/contracts introduced;
- accepted deviations;
- validation commands;
- constraints to preserve.

Keep it concise and factual.

---

## 15. Review bundle contract

Every phase produces a review bundle outside the repository:

```text
../torch-dae-web-phase-XX-review.tar.gz
```

The review directory must include at least:

```text
SUMMARY.md
VALIDATION.md
OPEN_ISSUES.md
BASE_HEAD.txt
GIT_STATUS.txt
CHANGED_FILES.txt
DIFFSTAT.txt
phase-XX.patch
TREE.txt
screenshots/
changed-files/
selected-source/
```

### `changed-files/`

This is mandatory.

Copy the exact current contents of every modified or untracked source/config/documentation/test file created by the phase, preserving relative paths.

Exclude generated caches/build output.

This makes external review possible even when untracked files are absent from a Git patch.

### `selected-source/`

Include key supporting files useful for review even when unchanged.

### `phase-XX.patch`

Capture the tracked diff relative to phase start/HEAD. Use binary-safe Git diff where relevant.

### Bundle exclusions

Never bundle:

```text
.git/
node_modules/
dist/
.astro/
playwright-report/
test-results/
coverage/
large caches
```

---

## 16. Revision loop

After external review, the user may return to the same phase chat with a targeted correction request.

When that happens:

- modify only the requested issues;
- rerun affected gates;
- rerun full phase gates if the correction can affect them;
- update the implementation journal;
- regenerate the review bundle completely;
- do not start a new phase.

---

## 17. Stop and ask/report rather than improvise when

Stop if:

- canonical schemas contradict the planned data model;
- evidence semantics are ambiguous;
- required source artifacts are missing;
- a requested comparison would be scientifically misleading;
- the repository contains unrelated dirty changes you cannot attribute safely;
- a planning file conflicts with the phase prompt;
- a destructive operation appears necessary.

Report the exact blocker and evidence.

---

## 18. Final operating principle

The mockups define the intended experience.

The `torch-dae` canonical artifacts define the truth.

The current phase prompt defines the scope.

Preserve all three.
