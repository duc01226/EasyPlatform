---
name: harness-setup
description: '[Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors.'
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

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Set up the complete outer agent harness for a greenfield project so all subsequent AI coding agents operate with maximum guidance and earliest-possible quality feedback.

**What this produces:**

- Feedforward guides: CLAUDE.md/AGENTS.md conventions, architecture docs, pattern catalogs, skill activation rules
- Computational feedback sensors: configured via `$linter-setup` (linters, formatters, pre-commit hooks, CI gates)
- Inferential feedback sensors: AI review skills wired to lifecycle stages
- Harness inventory: `.ai/workspace/harness/harness-inventory.md`

**When invoked:** After `$scaffold` and `$linter-setup` in the greenfield workflow. Assumes scaffolding is complete.

**What it does NOT do:** Install linters or configure formatters — that is `$linter-setup`'s responsibility.

---

## Activation Guards

**Check 1 — Linter-setup prerequisite (BLOCK if missing):**
Before running any phases, verify `$linter-setup` has completed by checking for:

- Linter config file at project root (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`)
- Pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`)
- CI quality gate definition

If any of these are missing → a direct user question: "$linter-setup appears incomplete. Computational feedback sensors must be in place before harness setup. Run $linter-setup first, then return here?"
**BLOCK** Phase A/B/C/D/E until linter-setup verification passes.

**Check 2 — Existing harness inventory:**
Check for `.ai/workspace/harness/harness-inventory.md`

- If found → a direct user question: "Harness inventory already exists — re-run to enhance existing harness, or skip?"
- Proceed even when `CLAUDE.md`/`AGENTS.md` are present — those are feedforward guides this skill may enhance, never signals to skip

---

## Phase A — Stack Detection

Read from: `plan.md` frontmatter → architecture-design report → tech-stack-comparison report.

Extract:

- Primary language(s) and framework(s)
- Test framework and test runner
- CI platform (GitHub Actions, GitLab CI, Azure Pipelines, etc.)
- Package manager and monorepo structure (if any)
- Module system and build tooling

Write detection result to `.ai/workspace/harness/stack-profile.md`.

If any field undetectable → a direct user question to confirm before proceeding.

---

## Phase B — Feedforward Guide Setup (Inferential)

For each guide type, check if it exists; if not, create or enhance:

**1. CLAUDE.md / AGENTS.md — Architecture conventions**

- Add section: "Architecture Patterns" — document the patterns chosen in `$architecture-design` (e.g., Clean Architecture, CQRS, Repository)
- Add section: "Anti-Patterns" — explicit list of patterns to avoid for this stack
- Add section: "Naming Conventions" — language-idiomatic conventions for this project
- Add section: "Module Boundaries" — which layers may import which; dependency direction rules

**2. Skill activation rules**

- Document in CLAUDE.md which skills auto-activate for common task types in this stack
- Example: "When modifying domain entities → activate `$review-domain-entities`"
- Example: "Before any commit → run `$code-review`"

**3. Architecture notes**

- Create `docs/architecture/` with:
    - `bounded-contexts.md` — domain boundaries and ownership
    - `dependency-rules.md` — allowed import directions between layers
    - `naming-conventions.md` — project-specific naming for files, classes, functions

**4. Pattern catalog**

- Create `docs/architecture/pattern-catalog.md`
- Document each pattern chosen in `$architecture-design` with DO/DON'T examples
- Anchor to actual project files once scaffolding produces them

Present list of guides created/updated via a direct user question: "Feedforward guides above will be created/enhanced. Confirm or adjust?"

---

## Phase C — Computational Feedback Sensors

Confirm `$linter-setup` has completed:

- Check for linter config file at project root (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`)
- Check for pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`)
- Check for CI quality gate definition

If any missing → invoke `$linter-setup` before continuing.

Output: confirmation that computational sensors are in place, with file paths listed.

---

## Phase D — Inferential Feedback Sensors

Configure which AI review skills fire at each lifecycle stage. Present to user via a direct user question:
"Which inferential sensors should be mandatory vs optional for this project?"

**Pre-implementation (planning gate):**

- `$why-review` — validate design rationale before committing to implementation approach

**Pre-commit (lightweight review):**

- Document in CLAUDE.md: run `$code-review` before committing significant changes

**Post-implementation (domain model changes):**

- `$review-domain-entities` — when domain entity files are in the changeset

**Pre-release (mandatory gates):**

- `$sre-review` — reliability and operational readiness
- `$security` — security review before production release

**Recurring drift detection:**

- `$scan-codebase-health` — schedule quarterly (or on CI schedule) to detect drift

Add the agreed sensor configuration to CLAUDE.md under "## Review Gates".

---

## Phase E — Behaviour Harness (Spec + Test Strategy)

Define the project's behaviour harness plan:

**Functional spec format:**

- a direct user question: "Feature documentation format?" Options: feature-docs (17-section), TDD specs only, lightweight ADRs
- Establish `docs/business-features/` or equivalent spec home

**Test strategy pyramid:**

- Unit: pure functions, domain entities, business logic (no I/O)
- Integration: subcutaneous CQRS tests, repository tests with real DB
- E2E: critical user journeys only (not full coverage — too slow)

**Approved fixtures pattern:**

- Pre-seed reference/lookup data as approved snapshots
- Integration tests are additive (never delete/reset data)

**Coverage threshold:**

- a direct user question: "Minimum test coverage threshold for CI gate?" (Recommended: 80% line coverage)
- Add threshold to CI configuration (computational sensor)

Document agreed test strategy to `docs/architecture/test-strategy.md`.

---

## Phase F — Harness Inventory Report

Write `.ai/workspace/harness/harness-inventory.md`:

```markdown
# Harness Inventory

Generated: {date}
Stack: {detected stack from Phase A}

## Feedforward Guides

| Type          | File/Skill                           | Purpose                         |
| ------------- | ------------------------------------ | ------------------------------- |
| Inferential   | CLAUDE.md §Architecture Patterns     | Shapes AI architectural choices |
| Inferential   | CLAUDE.md §Anti-Patterns             | Prevents known bad patterns     |
| Inferential   | docs/architecture/pattern-catalog.md | DO/DON'T examples per pattern   |
| Computational | .editorconfig                        | Cross-IDE consistency           |

## Feedback Sensors — Computational

| Stage      | Tool/Hook         | What it catches                 |
| ---------- | ----------------- | ------------------------------- |
| Pre-commit | {linter}          | Style violations, common errors |
| Pre-commit | {formatter}       | Code formatting drift           |
| CI         | {type-checker}    | Type errors                     |
| CI         | {static-analyzer} | Security, complexity, dead code |

## Feedback Sensors — Inferential

| Stage               | Skill/Agent             | What it catches                |
| ------------------- | ----------------------- | ------------------------------ |
| Pre-implementation  | $why-review             | Design rationale gaps          |
| Pre-commit          | $code-review            | Convention drift, logic errors |
| Post-implementation | $review-domain-entities | Domain model quality           |
| Pre-release         | $sre-review             | Operational readiness          |
| Pre-release         | $security               | Security vulnerabilities       |

## Open Gaps

| Area                     | Reason   | Risk           |
| ------------------------ | -------- | -------------- |
| {area not yet harnessed} | {reason} | {LOW/MED/HIGH} |
```

Present inventory to user for review via a direct user question.

---

## Next Steps

a direct user question:

- **"$cook (Recommended)"** — Begin implementing the project plan with full harness in place
- **"$why-review"** — Review harness design rationale before proceeding
- **"Skip"** — Proceed manually without workflow guidance

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:harness-setup -->

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, pre-commit hooks, ArchUnit/arch-fitness tests, CI gates | Pre-commit → CI  |
> | Feedback    | Inferential   | `$code-review` skill, `$sre-review`, `$security`, LLM-as-judge passes         | Post-commit → CI |
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, coverage, style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions.
> 3. **Behaviour** — Functional correctness. Hardest: requires approved fixtures or strong spec-first discipline.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

<!-- /SYNC:harness-setup -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**MUST ATTENTION** never auto-decide feedforward guide content — present draft and confirm with a direct user question
**MUST ATTENTION** verify `$linter-setup` completed before Phase C passes
**MUST ATTENTION** write harness-inventory.md incrementally (append after each phase) — never hold in memory
**MUST ATTENTION** harness is a living document — update inventory when new sensors are added later

**[TASK-PLANNING]** Before acting, analyze task scope and break it into small todo tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
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
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
