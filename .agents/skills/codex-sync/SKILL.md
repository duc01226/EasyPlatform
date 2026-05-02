---
name: codex-sync
description: '[Codex] Run full Codex mirror sync (migrate → hooks → context → verify) standalone, no npm/package.json needed. Triggers on: codex sync, sync codex, run codex:sync, regenerate AGENTS.md, regenerate CODEX_CONTEXT.md.'
disable-model-invocation: true
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[USER-INVOKED ONLY]** Manually triggered via `$codex-sync`. Claude MUST NOT auto-invoke — `disable-model-invocation: true` enforces this.
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
| "Auto-invoke since user mentioned codex" | `disable-model-invocation: true` is binding. Wait for explicit `$codex-sync` |
| "Sync looks idempotent, skip verify"     | Timestamp diffs are normal; structural diffs = bug. Always run verifiers     |

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
