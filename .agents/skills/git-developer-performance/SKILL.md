---
name: git-developer-performance
description: '[Git] Use when generating developer KPI, performance, contribution value, story point, man-day, or code-quality reports from local git commit history.'
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

**Goal:** Plan and generate a developer KPI-style quality-work report from local git history only.
**Workflow:**

1. **Set Goal + Plan** - Declare the goal, trigger `$plan`, and create tasks per contributor.
2. **Collect Packets** - Run `scripts/git-developer-performance.cjs` to create commit inventory and work packets.
3. **Analyze Work** - Read patches per contributor; estimate value, story points, man-days, and quality impact.
4. **Synthesize Report** - Write `quality-work-summary.md` and `evidence-proof.md` outside `.claude`.
   **Key Rules:**

- Use only local `git` history. Do not query external services.
- Consolidate people by identity map, then normalized email, then high-confidence aliases such as `DOMAIN\first.lastpart` matching a full name; use `--identity-map` for exceptions.
- This is a large task: plan first, then create one todo task per contributor.
- The script collects evidence; AI must read changes and synthesize contributed value.
- Treat KPI values as evidence-based estimates, not a complete HR assessment.
- Report both `man_days_traditional` (no AI) and `man_days_ai` (AI coding assistant with project context).
- Traverse full merged branch history (not only first-parent) and attribute shared feature-branch implementation to each developer's own direct commits; merge authors get integration/admin signal unless conflict-resolution changes are explicitly inspected.
- Estimate implementation SP from direct authored diffs first; zero-change merge/admin commits are integration signal only.
- Discount generated files, migration designers, docs/spec output, i18n sorting, lockfiles, and repeated follow-up churn.
- For velocity mismatch or recheck requests, synthesize each contributor's direct authored work as one "giant commit" first, then split into atomic 1/2/3/5/8/13 SP clusters.
- Persist large rechecks to a report file outside `.claude` before finalizing, so context loss cannot erase evidence.
- Separate product/domain delivery, infrastructure/tooling work, docs/generated churn, and merge/admin integration; do not mix them silently into one velocity number.
- Run a velocity sanity check: both man-day ranges must be plausible for active days and the selected period.
- Keep output outside `.claude`; default root is `reports/developer-performance/`.

# Git Developer Performance

Use when the user asks for developer KPI/performance, productivity, contribution value, story-point estimates, man-day estimates, quality impact, or quality-work reporting from git commits.

## Required AI Workflow

Before analysis, set or declare this goal:

> Plan and generate a developer performance quality-work report from local git history, then execute the plan and produce the report.
> Then trigger `$plan` or create equivalent plan artifacts. This skill is not a commit-list export. It requires reading direct commits and merge/admin commits per contributor, then synthesizing value. Use ultrathink/deep analysis for final synthesis when contributor count or churn is high.

## Command

```bash
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs [options]
```

Options: `--branch <ref>` defaults to `develop` then `main`; `--days <n>` defaults to `60`; `--since <date>` overrides days; `--until <date>` defaults now; `--out <dir>` defaults to `reports/developer-performance`; `--identity-map <csv>` accepts `identity,email,displayName,id`; `--json` prints machine-readable result.

Examples:

```bash
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs --branch release/1.4 --days 30
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs --since 2026-01-01 --until 2026-03-31 --out reports/dev-performance-q1
```

## Output

Creates a timestamped run folder containing:

- `summary.md` - team evidence report, authored signal sort, warnings, and integration/admin activity.
- `analysis-plan.md` - AI execution plan with one task per contributor.
- `work-packets/*.md` - per-contributor commit/change packets for qualitative analysis.
- `quality-work-summary.md` and `evidence-proof.md` - AI-written value synthesis and proof appendix.
- `analysis/` - target folder for AI-written per-contributor synthesis.
- `contributors.csv`, `commits.csv`, `developers/*.md`, `data/*.json` - source evidence and deterministic aggregates.

## Analysis Rules

- Read `references/analysis-workflow.md` before final synthesis.
- Treat contributors as people consolidated by identity map/email/high-confidence aliases, not raw display names.
- Count distinct contributors, then create one todo task per contributor from `analysis-plan.md`.
- For each contributor, inspect direct authored commits and merge/admin commits from `work-packets/*.md`.
- Use `git show --stat --find-renames <hash>` and targeted patches for high-impact commits.
- When several developers contribute to one feature branch, analyze each contributor's direct commits separately and never give the whole feature's implementation SP to the merge author or PR owner.
- Estimate work clusters with 1/2/3/5/8/13 story points, no-AI man-days, and AI-assisted man-days; state confidence.
- If a displayed theme is more than 13 SP, state that it is a sum of smaller atomic clusters, not one unsplit story.
- Do not add implementation SP for zero-file merge/admin commits; mention them separately as integration/admin signal.
- Discount non-implementation churn before estimating: generated code, EF designer snapshots, docs/specs, i18n sorting, lockfiles, and repeated follow-ups.
- Reconcile final SP/man-day totals against authored active days and team velocity intuition; if implausible, re-audit before delivery.
- Analyze contributed value: features/changes, bug fixes, refactors, tests/docs, integration/admin, and code quality.
- If there are many contributors, split contributor tasks across subagents with disjoint developer lists.
- Review identity and bulk-change warnings before comparing contributors.
- State that report quality depends on local git data quality when history is incomplete, stale, squashed, or bot/shared authors exist.

## Verification

Before delivering a generated report:

1. Run `node --test .claude/skills/git-developer-performance/tests/*.test.cjs`.
2. Run the command for the requested repo/range.
3. Confirm the output path is outside `.claude`.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** - Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact. Cite evidence, admit uncertainty, self-check output, and stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset -->

## Closing Reminders

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking - every KPI/value claim needs traced git evidence and confidence >80% to act.

<!-- /SYNC:critical-thinking-mindset:reminder -->

**IMPORTANT MUST ATTENTION** use local git history only.
**IMPORTANT MUST ATTENTION** trigger planning before qualitative analysis; this is a large task.
**IMPORTANT MUST ATTENTION** default to `develop`, fallback to `main`, and use last 60 days when the user does not specify.
**IMPORTANT MUST ATTENTION** do not present authored or integration signals as complete measures of human performance.
**IMPORTANT MUST ATTENTION** shared feature-branch implementation credit follows direct commit authors, not merge authors; never let raw churn or zero-change merge/admin commits inflate implementation SP or man-day estimates.
**IMPORTANT MUST ATTENTION** never publish a single ambiguous MD number; show no-AI and AI-assisted MD separately.

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
