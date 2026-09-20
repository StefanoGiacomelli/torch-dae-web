# REVIEW WORKFLOW — human checklist

Use this after every Claude/Codex phase.

## 1. Do not commit yet

The agent should leave an unstaged working tree and provide:

```text
../torch-dae-web-phase-XX-review.tar.gz
```

## 2. Upload the bundle to the review conversation

The reviewer checks:

- `SUMMARY.md`
- `VALIDATION.md`
- `OPEN_ISSUES.md`
- `BASE_HEAD.txt`
- Git status/diffstat
- tracked patch
- all files under `changed-files/`
- key supporting files under `selected-source/`
- screenshots
- phase-specific audit documents

## 3. Possible outcomes

### Accepted

The reviewer provides exact commit commands.

Commit, confirm clean status, then open a new chat for the next phase.

### Corrections required

Return to the **same agent chat** for that phase.

Use the targeted correction prompt produced by the reviewer.

Do not start the next phase.

The agent must regenerate the entire review bundle after corrections.

### Structural blocker

Do not improvise around it.

Resolve the specification/data-contract question before continuing.

## 4. Keep phase chats

Do not delete/archive the active phase chat until the phase is accepted and committed.

It is the correction workspace for that phase.

## 5. New phase means clean chat

Once committed:

- start a new Claude/Codex chat;
- paste `prompts/00_CHAT_BOOTSTRAP.md`;
- wait for `READY`;
- instruct it to execute the next prompt file.

This preserves reproducibility without relying on conversational memory.
