---
name: codex-sync
description: '[Codex] Run full Codex mirror sync (migrate → hooks → context → verify) standalone, no npm/package.json needed. Triggers on: codex sync, sync codex, run codex:sync, regenerate AGENTS.md, regenerate CODEX_CONTEXT.md.'
disable-model-invocation: true
---

> **[USER-INVOKED ONLY]** Manually triggered via `/codex-sync`. Claude MUST NOT auto-invoke — `disable-model-invocation: true` enforces this.
> **[FAILS FAST]** First non-zero stage exit aborts chain. Re-run failing stage manually to debug.
> **[REPO ROOT]** Orchestrator auto-resolves repo root from its own path. NEVER pass `--cwd`.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Run full Codex mirror sync standalone — equivalent to `npm run codex:sync` without `package.json` or `npm`.

**Workflow:**

1. **Run** — `node .claude/skills/codex-sync/scripts/run-codex-sync.mjs`
2. **Verify** — Exit code `0` = pass; check stdout summary
3. **Inspect** — On failure, re-run failing stage manually with `--only=<stage>` and `--verbose`

**Key Rules:**

- MUST run all 7 stages in order — orchestrator fails fast on first non-zero exit
- NEVER edit `.agents/skills/codex-sync/**` (auto-mirror) — edit `.claude/skills/codex-sync/**` source instead
- Stages 1-3 mutate `.codex/`, `AGENTS.md`; stages 4-7 are read-only verifiers
- No npm dependency — pure `node` + spawned subprocesses
- Idempotent — safe to re-run; second run produces only timestamp diffs

## Stages

7 stages, sequential, matching `npm run codex:sync` chain (`package.json:25`):

| #   | Stage    | Script                                               | Effect                                                 |
| --- | -------- | ---------------------------------------------------- | ------------------------------------------------------ |
| 1   | migrate  | `scripts/codex/migrate-claude-to-codex.mjs`          | Migrate Claude agents → `.codex/agents/`; setup skills |
| 2   | hooks    | `scripts/codex/sync-hooks.mjs`                       | Generate `.codex/hooks.json` + sync report             |
| 3   | context  | `scripts/codex/sync-context-workflows.mjs`           | Regenerate `.codex/CODEX_CONTEXT.md` + `AGENTS.md`     |
| 4   | tests    | `node --test scripts/codex/tests/*.test.mjs`         | Run codex tooling unit tests                           |
| 5   | wf-cycle | `scripts/codex/verify-workflow-cycle-compliance.mjs` | Verify workflow sequence cycle compliance              |
| 6   | sk-proto | `scripts/codex/verify-skill-protocol-compliance.mjs` | Verify skill strict-execution-contract                 |
| 7   | residue  | `scripts/codex/verify-no-project-residue.mjs`        | Verify no project residue in generated artifacts       |

## Usage

```bash
# Full sync (standalone, no npm):
node .claude/skills/codex-sync/scripts/run-codex-sync.mjs

# Stream live child output:
node .claude/skills/codex-sync/scripts/run-codex-sync.mjs --verbose

# Read-only verifiers (no mutation):
node .claude/skills/codex-sync/scripts/run-codex-sync.mjs --only=tests,wf-cycle,sk-proto,residue

# Skip stages while debugging:
node .claude/skills/codex-sync/scripts/run-codex-sync.mjs --skip=migrate,hooks
```

**Exit codes:** `0` all pass · `1` orchestrator failure · non-zero propagates from failing stage.

## Closing Reminders

**MUST ATTENTION** invoke ONLY when user explicitly requests codex sync — never auto-invoke
**MUST ATTENTION** edit source `.claude/skills/codex-sync/**`, NEVER the `.agents/skills/codex-sync/**` mirror
**MUST ATTENTION** orchestrator fails fast — re-run single failing stage with `--only=<id> --verbose` to debug
**MUST ATTENTION** working directory auto-resolves to repo root from script path — do not pass `--cwd`
**MUST ATTENTION** stages 1-3 mutate; stages 4-7 verify only — use `--only=` for non-destructive validation

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| "Just edit the .agents mirror directly"  | Next sync overwrites it. Always edit `.claude/skills/codex-sync/` source     |
| "Skip a stage to save time"              | Verifiers (4-7) catch drift; skipping = silent regression risk               |
| "Auto-invoke since user mentioned codex" | `disable-model-invocation: true` is binding. Wait for explicit `/codex-sync` |
| "Sync looks idempotent, skip verify"     | Timestamp diffs are normal; structural diffs = bug. Always run verifiers     |

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
