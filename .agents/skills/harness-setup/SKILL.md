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

Codex uses static project-reference loading instead of runtime-injected project docs.
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Wire every feedforward guide and feedback sensor into the greenfield project so all later AI coding agents operate with maximum guidance and self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.

**Summary:**

- BLOCK on the `$linter-setup` prerequisite first — computational sensors (linters, hooks, CI gates) MUST exist before any phase runs; this skill never installs them itself.
- Walk phases A→F as a hard barrier sequence: detect stack → author feedforward guides (CLAUDE.md conventions, anti-patterns, pattern catalog) → confirm computational sensors → wire inferential review skills to lifecycle gates → define behaviour/test strategy → emit inventory.
- Treat every feedforward-guide and sensor choice as a direct user question-gated — never auto-decide content, because harness conventions bind every future agent and silent choices propagate.
- Write `.ai/workspace/harness/harness-inventory.md` incrementally (append per phase, not held in memory), keeping it a living document updated as new sensors are added.

**Produces:**

- Feedforward guides: CLAUDE.md/AGENTS.md conventions, architecture docs, pattern catalogs, skill activation rules
- Computational feedback sensors: configured via `$linter-setup` (linters, formatters, pre-commit hooks, CI gates)
- Inferential feedback sensors: AI review skills wired to lifecycle stages
- Harness inventory: `.ai/workspace/harness/harness-inventory.md`

**When invoked:** After `$scaffold` + `$linter-setup` in greenfield workflow. Assumes scaffolding complete.

**Does NOT do:** Install linters or configure formatters — that is `$linter-setup`'s responsibility.

---

## Activation Guards

**Check 1 — Linter-setup prerequisite (BLOCK if missing):**
Before running any phases, verify `$linter-setup` completed by checking for:

- Linter config file at project root (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`)
- Pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`)
- CI quality gate definition

If any missing → a direct user question: "$linter-setup appears incomplete. Computational feedback sensors must be in place before harness setup. Run $linter-setup first, then return here?"
**BLOCK** Phase A/B/C/D/E until linter-setup verification passes.

**Check 2 — Existing harness inventory:**
Check for `.ai/workspace/harness/harness-inventory.md`

- If found → a direct user question: "Harness inventory already exists — re-run to enhance existing harness, or skip?"
- Proceed even when `CLAUDE.md`/`AGENTS.md` present — those are feedforward guides this skill may enhance, NEVER signals to skip

---

## Phase A — Stack Detection

Read from: `plan.md` frontmatter → architecture-design report → tech-stack-comparison report.

Extract:

- Primary language(s) and framework(s)
- Test framework and test runner
- CI provider/tooling
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
- Add section: "Naming Conventions" — language-idiomatic conventions for this repository
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
"Which inferential sensors should be mandatory vs optional for this repository?"

**Pre-implementation (planning gate):**

- `$why-review` — validate design rationale before committing to implementation approach

**Pre-commit (lightweight review):**

- Document in CLAUDE.md: run `$code-review` before committing significant changes

**Post-implementation (domain model changes):**

- `$review-domain-entities` — when domain entity files are in the changeset

**Pre-release (mandatory gates):**

- `$production-readiness-review` — reliability and operational readiness
- `$security-review` — security review before production release

**Recurring drift detection:**

- `$scan-codebase-health` — schedule quarterly (or on CI schedule) to detect drift

Add the agreed sensor configuration to CLAUDE.md under "## Review Gates".

---

## Phase E — Behaviour Harness (Spec + Test Strategy)

Define the project's behaviour harness plan:

**Functional spec format:**

- a direct user question: "Feature documentation format?" Options: feature-spec (8-section tech-free), TDD specs only, lightweight ADRs
- Establish `docs/specs/` or equivalent spec home

**Test strategy pyramid:**

- Unit: pure functions, domain entities, business logic (no I/O)
- Integration: subcutaneous CQRS tests, repository tests with real DB
- E2E: critical user journeys only (not full coverage — too slow)

**Approved fixtures pattern:**

- Pre-seed reference/lookup data as approved snapshots
- Integration tests are additive (never delete/reset data)

**Test-strength sensors (NOT a line-coverage gate):**

- **Line coverage is a diagnostic only — NEVER gate a build on it.** Low coverage is a useful NEGATIVE signal (an area is untested → investigate); high coverage is NOT evidence of quality (lines can execute with no meaningful assertion). Report it as a diagnostic; do not fail CI on a coverage %.
- **Mutation score is the real test-strength metric — gate on this.** a direct user question: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" A surviving mutant = a fault your tests did not catch = a missing/weak assertion. Add a minimum mutation-score threshold to CI as the computational test-strength sensor.
- **Property coverage (optional second sensor):** each named business invariant guarded by ≥1 property/metamorphic test. Track which invariants have a property test; an unguarded invariant is a gap to fill.
- **Keep behavior/change-coverage (meaningful, not a %):** every behavior-changing file must have a test that asserts the changed outcome — see `$integration-test-review` Gate 7. This is the right notion of "coverage"; the line-% is not.

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

| Stage      | Tool/Hook         | What it catches                                |
| ---------- | ----------------- | ---------------------------------------------- |
| Pre-commit | {linter}          | Style violations, common errors                |
| Pre-commit | {formatter}       | Code formatting drift                          |
| CI         | {type-checker}    | Type errors                                    |
| CI         | {static-analyzer} | Security, complexity, dead code                |
| CI         | {mutation-tool}   | Weak/missing assertions (test-strength GATE)   |
| CI         | {coverage-tool}   | Untested areas (DIAGNOSTIC only — never gated) |

## Feedback Sensors — Inferential

| Stage               | Skill/Agent                  | What it catches                |
| ------------------- | ---------------------------- | ------------------------------ |
| Pre-implementation  | $why-review                  | Design rationale gaps          |
| Pre-commit          | $code-review                 | Convention drift, logic errors |
| Post-implementation | $review-domain-entities      | Domain model quality           |
| Pre-release         | $production-readiness-review | Operational readiness          |
| Pre-release         | $security-review             | Security vulnerabilities       |

## Open Gaps

| Area                     | Reason   | Risk           |
| ------------------------ | -------- | -------------- |
| {area not yet harnessed} | {reason} | {LOW/MED/HIGH} |
```

Present inventory to user for review via a direct user question.

---

## Next Steps

a direct user question:

- **"$feature-implement (Recommended)"** — Begin implementing the project plan with full harness in place
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
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:harness-setup -->

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                                           | Frequency        |
> | ----------- | ------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries                                 | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs                       | Always-on        |
> | Feedback    | Computational | Linters, type checks, pre-commit hooks, ArchUnit/arch-fitness tests, mutation-score gate, CI gates | Pre-commit → CI  |
> | Feedback    | Inferential   | `$code-review` skill, `$production-readiness-review`, `$security-review`, LLM-as-judge passes      | Post-commit → CI |
>
> **Test-strength sensor — gate on mutation score, NOT line coverage.** Line coverage is a DIAGNOSTIC only: low coverage is a useful NEGATIVE signal (something is untested); high coverage is NOT evidence of quality (tests can execute lines without asserting intent) — NEVER fail a build on a line-coverage %. The real test-strength metric is **mutation score** (inject faults into changed code; surviving mutant = a missing/weak assertion = write the killing test); gate the build on it where a mutation tool exists. Add **property coverage** as a second sensor — each [HARD] §4 rule / §5 invariant guarded by ≥1 property/metamorphic test. The property tests themselves are REQUIRED for invariant-owning behaviors (`spec [mode=tests]` + `integration-test` force them, not opt-in); what is optional is only wiring property coverage as an _automated CI sensor_ on top. Keep **behavior/change-coverage** (does each behavior-changing file have a test that asserts the changed outcome) — that notion is meaningful and stays.
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, line-coverage (diagnostic only — never a gate), style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions.
> 3. **Behaviour** — Functional correctness. Hardest: gate on mutation score + property coverage; line coverage stays a diagnostic.
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

**IMPORTANT MUST ATTENTION Goal:** Wire every feedforward guide and feedback sensor into the project so all later AI agents self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** critical + sequential thinking; every claim traced, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Harness Engineering:** feedforward + feedback loops; gate on mutation score, never line-coverage %, keep quality left.

**IMPORTANT MUST ATTENTION** BLOCK on the `$linter-setup` prerequisite first — ALWAYS verify computational sensors (linter config, pre-commit hook, CI gate) exist before any phase runs — why: keep quality left; cheapest gates must precede inferential ones, and this skill never installs them itself
**IMPORTANT MUST ATTENTION** NEVER auto-decide feedforward-guide or sensor content — present the draft and confirm via a direct user question — why: harness conventions bind every future agent; silent choices propagate to all later sessions
**IMPORTANT MUST ATTENTION** write `.ai/workspace/harness/harness-inventory.md` incrementally (append after each phase) — NEVER hold findings in memory — why: long context drifts and silently drops findings
**IMPORTANT MUST ATTENTION** walk phases A→F as a hard barrier sequence — NEVER skip or reorder; each phase BLOCKS the next until its guard passes — why: a later phase consumes the prior phase's verified output
**IMPORTANT MUST ATTENTION** gate the behaviour harness on mutation score + property coverage — NEVER fail a build on a line-coverage % — why: lines execute without asserting intent, so coverage % is a diagnostic only, never a quality gate
**IMPORTANT MUST ATTENTION** research tool choices per detected stack — NEVER hardcode a linter/formatter/mutation tool — present top 2-3 options, enforce strictest defaults, loosen only with explicit approval — why: harnessability depends on the actual stack, not a default
**IMPORTANT MUST ATTENTION** harness inventory is a LIVING document — update it when new sensors are added later — why: a stale inventory misrepresents the active feedback loop
**IMPORTANT MUST ATTENTION** grep 3+ existing guides/sensors before authoring a new one; verify fit (same stack, gate stage, lifecycle) before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** cite `file:line` / config-path evidence for every detected sensor and stack fact (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate a tool exists; grep the config to confirm — why: a hallucinated sensor leaves a real gap unguarded
**IMPORTANT MUST ATTENTION** bootstrap task tracking before phases — task tracking one todo per phase, mark `in_progress`/`completed` as you go; on context loss the current task list first — why: resume work, never duplicate phases

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| "Linter probably set up — skip the prereq check" | Grep for the config files. No `file:line` proof = BLOCK Phase A/B/C/D/E until verified.            |
| "I'll pick the obvious linter myself"            | NEVER auto-decide — present top 2-3 via a direct user question; the user owns binding conventions. |
| "High line coverage means tests are strong"      | Coverage is a diagnostic, not a gate. Gate on mutation score; lines run without asserting.         |
| "Inventory's small, I'll hold it in memory"      | Append per phase to the inventory file — context loss silently drops findings.                     |
| "CLAUDE.md exists, harness already done"         | CLAUDE.md is a feedforward guide to ENHANCE, never a signal to skip phases.                        |

**IMPORTANT MUST ATTENTION** BLOCK on `$linter-setup` before any phase · NEVER auto-decide harness content (a direct user question-gate) · gate behaviour on mutation score, NEVER on line-coverage %.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

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
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
