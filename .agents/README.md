# .agents Directory

This directory is used by Codex for project-level skills and plugins.

In this repository:

- `skills` is a local generated mirror of `.claude/skills`
- each mirrored `SKILL.md` is sanitized so Codex only reads compatible frontmatter
- create/update it with:

```bash
npm run codex:sync
```

`npm run codex:sync:copy-skills` is kept as a compatibility alias.

Read-only verification can be run without regenerating mirrors:

```bash
node .claude/skills/codex-sync/scripts/run-codex-sync.mjs --only=tests,wf-cycle,sk-proto,residue
```
