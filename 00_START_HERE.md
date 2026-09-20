# START HERE — torch-dae-web

This repository is implemented in five reviewed phases using fresh Claude/Codex chats.

The repository begins as a **planning baseline**, not as an Astro application.

## Expected initial repository contents

```text
torch-dae-web/
├── 00_START_HERE.md
├── AGENT_CONTEXT.md
├── TORCH_DAE_WEB_SPEC.md
├── assets/
│   └── mockups/
│       ├── home-light.png
│       ├── home-night.png
│       ├── technical-light.png
│       └── technical-night.png
└── prompts/
    ├── 00_CHAT_BOOTSTRAP.md
    ├── 00_WEB_IMPLEMENTATION_WORKPLAN.md
    ├── 01_FOUNDATION_DATA_CONTRACT.md
    ├── 02_MODEL_CARDS_HOME.md
    ├── 03_TECHNICAL_CARDS_ENGINE.md
    ├── 04_VISUALIZATION_AND_POLISH.md
    └── 05_PRODUCTION_QA_DEPLOYMENT.md
```

The canonical source repository remains separate:

```text
/Users/stefano/Documents/torch-dae
```

The website repository is expected at:

```text
/Users/stefano/Documents/torch-dae-web
```

---

## One-time repository setup

Create/clone the new GitHub repository, then copy this starter package into its root.

Before Phase 01, create one baseline commit containing only the specification, prompts, context, and mockups.

Recommended:

```bash
cd "/Users/stefano/Documents/torch-dae-web" || exit 1

git status --short --branch

git add \
  00_START_HERE.md \
  AGENT_CONTEXT.md \
  TORCH_DAE_WEB_SPEC.md \
  assets/mockups \
  prompts

git diff --cached --check
git diff --cached --name-status

git commit -m "docs: add web specification and implementation plan"
git push -u origin main
```

This baseline commit is important: every implementation phase can then be reviewed cleanly as a diff from an accepted state.

Do not scaffold Astro manually before Phase 01. Phase 01 owns the application bootstrap.

---

# Chat workflow for every phase

Each main phase uses **one fresh Claude/Codex chat**.

## Message 1 — bootstrap/context

Paste the full contents of:

```text
prompts/00_CHAT_BOOTSTRAP.md
```

The agent should only inspect context and reply `READY`; it must not implement anything yet.

## Message 2 — execute the phase

Either paste the full phase prompt or, preferably, tell the coding agent:

```text
Execute prompts/01_FOUNDATION_DATA_CONTRACT.md exactly as written.
```

Use the corresponding file for later phases.

Because the agent has repository access, it must read the prompt from disk rather than relying on conversational copies.

## During the phase

Let the agent work until it reaches the phase stop condition.

Do not ask it to commit or push.

It must produce the required external review bundle.

## External review

Upload:

```text
../torch-dae-web-phase-XX-review.tar.gz
```

to the main review conversation.

The phase is then reviewed independently.

## If corrections are required

Return to the **same phase chat**.

Paste the targeted correction prompt produced during review.

The agent must:

- apply only the requested corrections;
- rerun affected validation;
- update `docs/implementation/phase-XX.md`;
- regenerate the complete review bundle.

Repeat until accepted.

## After acceptance

Commit the accepted phase manually.

Suggested commits:

```text
Phase 01
feat(web): establish catalogue foundation and data contract

Phase 02
feat(web): implement Model Card catalogue experience

Phase 03
feat(web): implement Technical Card comparison engine

Phase 04
feat(web): add runtime visualizations and interaction polish

Phase 05
chore(web): productionize catalogue build and deployment
```

Only after the accepted commit is clean should you start the next phase in a new chat.

---

# Recommended agent split

```text
Phase 01 → Codex
Phase 02 → Claude
Phase 03 → Codex
Phase 04 → Claude
Phase 05 → Codex
```

This is a recommendation, not a requirement.

---

# What to send back for review

The review conversation should receive only the generated `.tar.gz` unless specifically asked for another artifact.

The bundle is designed to include:

- summary
- validation evidence
- complete changed-file copies
- tracked patch
- screenshots
- current Git status
- open issues
- selected supporting source

This prevents lengthy terminal copy/paste and keeps each review deterministic.

---

# Important rules

- One main work prompt = one chat.
- Revisions remain in that same phase chat.
- New phase = new clean chat.
- Agents never commit/push/deploy unless explicitly instructed.
- `torch-dae` source repository is read-only.
- Mockups are visual references and are never overwritten.
- The site consumes canonical data; it never invents it.
- Do not skip external review between phases.
