# CHAT BOOTSTRAP — paste this as the first message in every fresh Claude/Codex phase chat

You are working in the local repository:

```text
/Users/stefano/Documents/torch-dae-web
```

This is a fresh phase chat. Do not assume prior conversational context.

Before doing any implementation work:

1. read `AGENT_CONTEXT.md` in full;
2. read `TORCH_DAE_WEB_SPEC.md` in full;
3. read `prompts/00_WEB_IMPLEMENTATION_WORKPLAN.md`;
4. inspect the four files under `assets/mockups/`;
5. inspect `docs/implementation/phase-*.md` if that directory already exists;
6. inspect the current Git branch, `git status --short --branch`, and recent history.

The canonical source project is separate and read-only:

```text
/Users/stefano/Documents/torch-dae
```

Do not modify it.

At this bootstrap step:

- do not edit files;
- do not install dependencies;
- do not scaffold anything;
- do not run side-effecting commands;
- do not stage, commit, push, merge, tag, or deploy;
- do not begin a phase on your own.

After reading the required context, reply only with a concise readiness report containing:

```text
READY
Repository:
Branch:
Working tree:
Prior accepted phases detected:
Required control files found:
Mockups found:
```

If a required file is missing or the working tree contains unexplained changes, report `BLOCKED` instead and explain exactly why.

Then wait for the phase instruction.
