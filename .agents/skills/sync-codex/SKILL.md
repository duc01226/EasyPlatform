---
name: sync-codex
description: '[Codex] Use when you need to run full Codex mirror sync (migrate → hooks → context → verify) standalone, no npm/package JSON needed.'
disable-model-invocation: true
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Run full Codex mirror sync standalone — equivalent to `npm run codex:sync` without `package.json` or `npm`.

> **Renamed:** formerly `/codex-sync` — that name no longer resolves as a slash command; use `$sync-codex`.

Also bootstraps team-wide Codex completion notifications by copying the portable `.claude/scripts/codex/codex-notify.mjs` helper into `.codex/scripts/codex/` and upserting notification plus TUI status-line keys into `.codex/config.toml`.

**Workflow:**

1. **Run** — `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`
2. **Verify** — Exit code `0` = pass; check stdout summary
3. **Inspect** — On failure, re-run failing stage manually with `--only=<stage>` and `--verbose`

**Key Rules:**

- MUST run all 9 stages in order — orchestrator fails fast on first non-zero exit
- NEVER edit `.agents/skills/sync-codex/**` (auto-mirror) — edit `.claude/skills/sync-codex/**` source instead
- `.claude` is the source for skills/workflows/hooks; generated acceptance targets are `.agents/skills/**`, `.codex/CODEX_CONTEXT.md`, and `AGENTS.md`
- Stages 1-4 mutate `.agents/skills/`, `.codex/`, `AGENTS.md`, `.github/` (Copilot mirror); stages 5-9 are read-only verifiers
- Stage 1 upserts `[tui].status_line` to show model+reasoning, current directory, project root, context used, five-hour limit, and weekly limit by default
- Stage 3 mirrors full `CLAUDE.md` into `AGENTS.md`, then appends the generated Codex hook/context mirror and shared AI-SDD markers so Codex has both source instructions and hookless parity context
- Stage 1 must not inline `docs/project-reference/lessons.md` content into `.agents/skills/**`; generated skill mirrors reference the project-reference loading gate instead
- The `SYNC:ai-sdd-artifact-contract` marker must appear after sync in `.codex/CODEX_CONTEXT.md` and `AGENTS.md`
- No npm dependency — pure `node` + spawned subprocesses
- Idempotent — safe to re-run; second run produces only timestamp diffs

## Bootstrap Gate (when AGENTS.md is missing or incomplete)

This skill is the route the agent-files bootstrap gate offers for a missing — **or incomplete** —
root `AGENTS.md`, the generated Codex mirror of `CLAUDE.md`. Because Codex has no hooks, the universal
session-start guides must be embedded in `AGENTS.md` directly; stage 3 produces that mirror (full
`CLAUDE.md` copy, so the `<!-- CK:UNIVERSAL-GUIDES v1 -->` sentinel propagates) + hookless-parity context.

"Incomplete" means the file exists but lacks the universal guides — same three-state detection as the
CLAUDE.md route (`missing` → init, `incomplete` → update smart-merge preserving project content, `ok`
→ no block), decided by the shared sentinel-then-anchors check.

The gate is **user-invoke-only** for this route (`disable-model-invocation: true`) — the AI cannot
self-run `$sync-codex`, so the gate instructs it to _ask the user_ to run it. Detection is shared with
the CLAUDE.md route via `.claude/hooks/lib/agent-files-state.cjs`. Opt out of completeness enforcement
with `portability.requireUniversalGuides: false` in `docs/project-config.json` (default `true`);
`skip init` dismisses both hooks for 24h. Generate `CLAUDE.md` first (via `$claude-md-init`) — stage 3
reads it as the mirror source.

## Stages

9 stages, sequential, matching `npm run codex:sync`:

| #   | Stage    | Script                                                       | Effect                                                                                                                                                                                         |
| --- | -------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | migrate  | `.claude/scripts/codex/migrate-claude-to-codex.mjs`          | Migrate Claude agents → `.codex/agents/`; mirror skills → `.agents/skills/`; setup Codex notifications                                                                                         |
| 2   | hooks    | `.claude/scripts/codex/sync-hooks.mjs`                       | Generate `.codex/hooks.json` + sync report                                                                                                                                                     |
| 3   | context  | `.claude/scripts/codex/sync-context-workflows.mjs`           | Regenerate `.codex/CODEX_CONTEXT.md` + `AGENTS.md` with workflow context and shared AI-SDD markers                                                                                             |
| 4   | copilot  | `.claude/scripts/sync-copilot-workflows.cjs`                 | Regenerate `.github/copilot-instructions.md` + `.github/instructions/*` from `workflows.json` (MUST precede `tests` — TC-WFPROTO-006 byte-matches the committed mirror against this generator) |
| 5   | tests    | `node --test .claude/scripts/codex/tests/*.test.mjs`         | Run codex tooling unit tests                                                                                                                                                                   |
| 6   | wf-cycle | `.claude/scripts/codex/verify-workflow-cycle-compliance.mjs` | Verify workflow sequence cycle compliance                                                                                                                                                      |
| 7   | sk-proto | `.claude/scripts/codex/verify-skill-protocol-compliance.mjs` | Verify skill strict-execution-contract                                                                                                                                                         |
| 8   | residue  | `.claude/scripts/codex/verify-no-project-residue.mjs`        | Verify no project residue in generated and generic source artifacts                                                                                                                            |
| 9   | sdd      | `.claude/scripts/codex/verify-sdd-semantic-compliance.mjs`   | Verify AI-SDD semantic contract coverage                                                                                                                                                       |

## Usage

```bash
# Full sync (standalone, no npm):
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs

# Stream live child output:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verbose

# Full sync while forcing skill copy mode:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --copy-skills

# Read-only verifiers (no mutation):
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,wf-cycle,sk-proto,residue,sdd

# Skip stages while debugging:
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=migrate,hooks
```

**Exit codes:** `0` all pass · `1` orchestrator failure · non-zero propagates from failing stage.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

## Closing Reminders

**MUST ATTENTION** invoke ONLY when user explicitly requests codex sync — never auto-invoke
**MUST ATTENTION** edit source `.claude/skills/sync-codex/**`, NEVER the `.agents/skills/sync-codex/**` mirror
**MUST ATTENTION** keep `.codex/scripts/codex/codex-notify.mjs` generated from `.claude/scripts/codex/codex-notify.mjs`; edit the `.claude` source first
**MUST ATTENTION** keep Codex config upserts surgical; preserve unrelated `.codex/config.toml` keys and tables while updating the managed notification/status-line keys
**MUST ATTENTION** keep `AGENTS.md` sync comprehensive; mirror full `CLAUDE.md` plus generated hook/context blocks, and preserve unmanaged `AGENTS.md` preface text
**MUST ATTENTION** keep learned-lessons content out of `.agents/skills/**`; skills may point to `docs/project-reference/lessons.md` but must not embed its entries
**MUST ATTENTION** orchestrator fails fast — re-run single failing stage with `--only=<id> --verbose` to debug
**MUST ATTENTION** working directory auto-resolves to repo root from script path — do not pass `--cwd`
**MUST ATTENTION** stages 1-4 mutate; stages 5-9 verify only — use `--only=` for non-destructive validation

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| "Just edit the .agents mirror directly"  | Next sync overwrites it. Always edit `.claude/skills/sync-codex/` source     |
| "Skip a stage to save time"              | Verifiers (4-8) catch drift; skipping = silent regression risk               |
| "Auto-invoke since user mentioned codex" | `disable-model-invocation: true` is binding. Wait for explicit `$sync-codex` |
| "Sync looks idempotent, skip verify"     | Timestamp diffs are normal; structural diffs = bug. Always run verifiers     |

> **[USER-INVOKED ONLY]** Manually triggered via `$sync-codex`. Claude MUST NOT auto-invoke — `disable-model-invocation: true` enforces this.
> **[FAILS FAST]** First non-zero stage exit aborts chain. Re-run failing stage manually to debug.
> **[REPO ROOT]** Orchestrator auto-resolves repo root from its own path. NEVER pass `--cwd`.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
