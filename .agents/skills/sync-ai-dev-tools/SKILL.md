---
name: sync-ai-dev-tools
description: '[AI & Tools] USER-INVOKED. Use when you (the USER) need to reconcile AI dev-tool SOURCE guidance (Claude↔Copilot skills/prompts/agents/instructions) and/or regenerate BOTH generated mirror surfaces by delegating to the two mirror skills (/sync-to-copilot FIRST then /sync-codex) with both divergence oracles.'
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

> **Renamed:** formerly `/ai-dev-tools-sync` — that name no longer resolves as a slash command; use `$sync-ai-dev-tools`.

**Goal:** One USER-authorized entry point for keeping Claude, Codex, and GitHub Copilot working from equivalent guidance — covering BOTH halves of the pipeline:

- **Part A — Source reconciliation** (AI-judgment): research latest tool features, find gaps, and author the SOURCE (`.claude/**` skills/prompts/agents/instructions + root `CLAUDE.md`) so the tools have parity where their surfaces overlap.
- **Part B — Mirror regeneration** (mechanical): regenerate BOTH generated-mirror surfaces by delegating to the two mirror skills as **equal, first-class skill-steps** — `$sync-to-copilot --fast` FIRST, `$sync-codex` SECOND — then run both divergence oracles. The order is **mandatory, not a parallel phase** (see "Why this is ordered, not parallel"). Zero new generation logic — each skill wraps the generator it already owns.

This skill is the **single full-pipeline form**: it authors source parity AND closes the loop by regenerating the mirrors under explicit user authorization — no separate hand-off command.

**Two ways to run it:**

| You need…                                          | Do                                                      |
| -------------------------------------------------- | ------------------------------------------------------- |
| Reconcile source AND ship it to all mirrors        | Part A → Part B (full flow)                             |
| Only regenerate mirrors from already-edited source | Jump straight to **Part B** (skip Part A)               |
| Only edit source, defer the regen                  | Part A only; run Part B (or re-invoke this skill) later |

**Key Rules:**

- **USER-INVOKE-ONLY (`disable-model-invocation: true`, binding).** The AI MUST NOT auto-invoke this skill — mirrors are regenerated only when the USER asks. This guard is inherited transitively from the wrapped `$sync-codex` skill.
- **Part B delegates to two equal skills in a MANDATORY order** — `$sync-to-copilot --fast` BEFORE `$sync-codex` (see "Why this is ordered, not parallel"); reversing OR running them concurrently makes `$sync-codex` RED via TC-WFPROTO-006.
- **NOT a parallel phase** — the two skills are equal peers but have a read-after-write data dependency (`$sync-codex` reads the copilot-written `common-protocol.instructions.md`); they MUST be sequential.
- **Fail-fast between Part B steps** — if `$sync-to-copilot --fast` exits non-zero, STOP; do NOT run `$sync-codex` over a half-regenerated copilot surface.
- **NEVER hand-edit a generated mirror** (`.github/copilot-*`, `.github/instructions/*`, `.agents/`, `.codex/`, `AGENTS.md`) — edit SOURCE (`.claude/**`, root `CLAUDE.md`) and re-run the matching skill.
- **Part B adds ZERO generation logic** — it invokes the two skills, which wrap the existing generators; any future change to either underlying script is inherited for free.
- **Both oracles gate completion** — `copilot:verify:divergence` AND `codex:verify:sync-divergence` must exit `0`.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# AI Dev Tools Sync

Reconcile AI dev-tool SOURCE guidance and regenerate the generated mirrors — one user-authorized command for full Claude/Codex/Copilot parity.

## When to Use

> **Scope vs related skills:** This is the **broadest, full-pipeline** sync — bidirectional source authoring (Claude↔Copilot) **plus** the ordered two-mirror regeneration. For Claude→Copilot **knowledge/docs only** → `$sync-to-copilot` (its `--fast` mode covers the `workflows.json` catalog-only sync, no AI pass). For the **codex/agents mirror only** (single generator) → `$sync-codex`. This skill is the only one that does source reconciliation AND closes the loop by running BOTH mirror generators in the forced order under explicit user authorization.

Activate this skill when:

- User asks to update Claude Code or Copilot setup, or wants both tools to work similarly
- User wants to add/modify skills, prompts, agents, or instructions and propagate them everywhere
- After ANY SOURCE change to `.claude/**` or root `CLAUDE.md` that must reach BOTH the Copilot and Codex/Agents mirrors (skill add/remove/edit, workflow change, hook change, SYNC-block propagation)
- As the single hand-off at the end of a `.claude`-framework change set, instead of remembering to run two generators in the right order

**NOT for**: editing mirrors directly (always edit SOURCE + re-run a generator), or AI self-service invocation (blocked by design — wait for the USER to invoke this skill).

## Quick Reference

| Source surface    | Managed/peer surface              | Location                                                         |
| ----------------- | --------------------------------- | ---------------------------------------------------------------- |
| SKILL.md          | Codex skill mirror                | `.claude/skills/` -> `.agents/skills/`                           |
| Context/workflows | Codex context mirror              | `.claude/**`, `.claude/workflows.json` -> `.codex/`, `AGENTS.md` |
| SKILL.md          | Copilot skill/prompt              | `.claude/skills/` + `.github/skills/` / `.github/prompts/`       |
| agents/\*.md      | agents/\*.md                      | `.github/agents/` (shared)                                       |
| CLAUDE.md         | Copilot + Codex root instructions | Root `CLAUDE.md`, `AGENTS.md`, `.github/`                        |
| -                 | chatmodes/\*.chatmode.md          | `.github/chatmodes/`                                             |

---

## Part A — Source Reconciliation

> AI-judgment work: research → gap analysis → author SOURCE. Skip to **Part B** if you only need to regenerate mirrors from already-edited source.

### Step 1: Understand Current Setup

Read these files to understand current configuration:

```
.claude/workflows/orchestration-protocol.md
.claude/workflows/primary-workflow.md
.github/copilot-instructions.md
.github/instructions/*.instructions.md
.github/AGENTS.md
CLAUDE.md
```

### Step 2: Research Latest Features

Search web for:

- "GitHub Copilot features setup 2026"
- "GitHub Copilot custom instructions agents skills prompts"
- "GitHub Copilot agent mode workspace context"

See [references/copilot-features.md](references/copilot-features.md) for feature catalog.

### Step 3: Identify Sync Opportunities

Compare capabilities and identify gaps:

- Skills missing in one tool host
- Inconsistent prompt/instruction behavior
- Agent definitions that differ

### Step 4: Implement Source Changes

For each change, edit SOURCE first:

1. **Skills**: Create in both `.claude/skills/` and `.github/skills/`
2. **Prompts**: Create in both `.claude/skills/` and `.github/prompts/`
3. **Instructions**: Update `CLAUDE.md` + `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`
4. **Agents**: Update `.github/agents/` (shared by both)

When source authoring is done and the codex/agents mirror must reflect it, proceed to **Part B** (this skill regenerates the mirror itself — no separate `$sync-codex` hand-off needed, because the USER already authorized the regen by invoking this skill).

---

## Part B — Mirror Regeneration

Part B delegates to the two mirror skills as **two equal, first-class skill-steps** — but in a **mandatory order**, not a parallel phase (see "Why this is ordered, not parallel"). Invoke them in sequence, fail-fast between them, then gate on both oracles.

### Step 1 — `$sync-to-copilot --fast` (FIRST)

Regenerates the Copilot surface (`.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`) via the script only — **no AI enrichment pass** (enrichment is Part A judgment work, so Part B uses `--fast` to stay purely mechanical).

- If it exits non-zero → **STOP**. Do NOT proceed to `$sync-codex` over a stale/half-written copilot surface.

### Step 2 — `$sync-codex` (SECOND)

Runs the 9-stage codex generator (regenerates `.agents/`, `.codex/`, `AGENTS.md`, and — via its own `copilot` stage — the `.github/` copilot mirror). Its `tests` stage re-derives `common-protocol.instructions.md` from `workflows.json` and asserts equality with the **committed** copilot file; the `copilot` stage regenerates that file immediately before, so `$sync-codex` stays green on its own. Step 1 above still runs first as the canonical copilot-authoring step — its workflows-mirror regen now overlaps `$sync-codex`'s `copilot` stage (redundant-but-harmless reinforcement, not a dependency).

### Step 3 — Both divergence oracles (BOTH must exit `0`)

```bash
npm run copilot:verify:divergence
npm run codex:verify:sync-divergence
```

**Exit gate:** Step 1, Step 2, and both Step 3 oracles must exit `0`. Any non-zero → stop and fix before treating the mirrors as synced.

> **Underlying commands (for debugging or non-skill contexts):** `$sync-to-copilot --fast` wraps `node .claude/scripts/sync-copilot-workflows.cjs` (preview with `--dry-run`); `$sync-codex` wraps `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` (debug a stage with `--only=<stage> --verbose`). Part B invokes the **skills**, not the raw scripts — the scripts are listed only so a human can reproduce a single step in isolation.

---

## Why this is ordered, not parallel

The two skills are **equal peers**, but they CANNOT run as a true parallel phase — they have a hard **read-after-write data dependency**. `$sync-codex`'s `tests` stage runs `review-workflow-tooling-regressions.test.mjs` (TC-WFPROTO-006, `.claude/scripts/codex/tests/review-workflow-tooling-regressions.test.mjs:84`), which reads the **committed** `.github/instructions/common-protocol.instructions.md` — the file written by `$sync-to-copilot` — and asserts byte-equality with fresh generator output (`:90-94`). Running the two concurrently races: `$sync-codex` can read a stale or half-written copilot file and go RED intermittently. Running `$sync-to-copilot --fast` FIRST guarantees a fresh committed copilot surface before `$sync-codex` verifies against it. A human running two commands can reverse or overlap them; this skill bakes the order in so it can't be gotten wrong. (Canonical constraint: TC-WFPROTO-006.)

---

## How It Works

- **Part A owns:** source-authoring judgment (research → gap analysis → edit `.claude/**` + `CLAUDE.md`).
- **Part B owns ONLY:** the skill-step ordering + the fail-fast seam between the two skills + the two-oracle gate. It adds NO generation logic.
- **Part B delegates to (unchanged):** `$sync-to-copilot --fast` (which wraps `.claude/scripts/sync-copilot-workflows.cjs`, the copilot generator) and `$sync-codex` (which wraps `.claude/skills/sync-codex/scripts/run-codex-sync.mjs`, the codex generator's 9 fail-fast stages).
- **No `workflows.json` entry** — this is a standalone utility skill (like `$sync-codex`), not part of any workflow sequence.
- **Delegated dependency:** the `$sync-codex` and `$sync-to-copilot` skills are load-bearing-retained (`$sync-codex` is DO-NOT-REMOVE infra; `$sync-to-copilot --fast` is the sole script-only copilot regen path — the former `/sync-copilot-workflows` skill was absorbed into `$sync-to-copilot --fast`, the underlying script keeps its name). Any future plan that removes or renames either skill MUST repoint or retire this skill's Part B first.

## Compatibility Notes

- Copilot reads `.claude/skills/` automatically (backward compatibility)
- Both read `.github/prompts/*.prompt.md`
- Both read `.github/agents/*.md`
- Both read `AGENTS.md` in root or `.github/`
- Both support path-based instruction files via `applyTo` in frontmatter

## References

- [Copilot Features Catalog](references/copilot-features.md)
- [Sync Patterns](references/sync-patterns.md)

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** invoke ONLY when the USER explicitly requests a sync — never auto-invoke (`disable-model-invocation: true` is binding, inherited from the wrapped `$sync-codex` guard)
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** in Part B, invoke `$sync-to-copilot --fast` BEFORE `$sync-codex` — reversing OR running them concurrently makes `$sync-codex` RED (read-after-write on the committed copilot file, TC-WFPROTO-006)
- **MANDATORY IMPORTANT MUST ATTENTION** treat the two skills as equal peers in a MANDATORY sequence — NEVER as a parallel phase
- **MANDATORY IMPORTANT MUST ATTENTION** fail fast — if `$sync-to-copilot --fast` exits non-zero, STOP before invoking `$sync-codex`
- **MANDATORY IMPORTANT MUST ATTENTION** edit SOURCE (`.claude/**`, root `CLAUDE.md`) then re-run the matching skill; NEVER hand-edit `.github/copilot-*`, `.github/instructions/*`, `.agents/`, `.codex/`, or `AGENTS.md`
- **MANDATORY IMPORTANT MUST ATTENTION** gate completion on BOTH oracles (`copilot:verify:divergence` AND `codex:verify:sync-divergence`) exiting `0`
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act); add a final review todo task to verify work quality

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Auto-run since the user mentioned mirrors/sync"   | `disable-model-invocation: true` is binding. Wait for an explicit invocation from the USER.                                                                                   |
| "They're equal peers, so run them in parallel"     | No. `$sync-codex` reads the copilot-written `common-protocol.instructions.md` (TC-WFPROTO-006); concurrent = read-after-write race → flaky RED. Equal peers, MANDATORY order. |
| "Run codex first, copilot second — same thing"     | No. `$sync-codex` verifies against the committed copilot file; stale copilot → RED. `$sync-to-copilot --fast` FIRST.                                                          |
| "Copilot step printed a warning, run codex anyway" | Fail-fast seam exists for this. Non-zero `$sync-to-copilot` exit → STOP; fix before `$sync-codex`.                                                                            |
| "Use full `$sync-to-copilot` in Part B"            | Part B is mechanical — use `--fast` (script only). The AI enrichment pass is Part A judgment work.                                                                            |
| "Just hand-edit the mirror to match"               | Next sync overwrites it. Edit SOURCE, re-run the matching skill.                                                                                                              |
| "Skip the oracles, the skills succeeded"           | Skills mutating ≠ surfaces in parity. Both divergence oracles must exit 0.                                                                                                    |

> **[USER-INVOKED ONLY]** Manually triggered via `$sync-ai-dev-tools`. Claude MUST NOT auto-invoke — `disable-model-invocation: true` enforces this (inherited transitively from the wrapped `$sync-codex` guard).
> **[FAILS FAST]** In Part B, a non-zero `$sync-to-copilot --fast` exit aborts before `$sync-codex`. `$sync-codex` is itself fail-fast across its 9 stages.
> **[ORDERED, NOT PARALLEL]** Part B invokes `$sync-to-copilot --fast` FIRST, `$sync-codex` SECOND — two equal skills in a MANDATORY sequence. They are NOT a parallel phase: BOTH write `.github/**` (Step 1 directly; `$sync-codex` via its `copilot` stage, which TC-WFPROTO-006 then byte-checks), so concurrent execution would race on those files. Sequential order avoids the write race — note `$sync-codex` no longer _depends_ on Step 1's output (it regenerates the copilot mirror itself), so the order is now race-avoidance, not a correctness dependency.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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
