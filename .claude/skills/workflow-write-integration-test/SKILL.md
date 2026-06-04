---
name: workflow-write-integration-test
version: 1.0.0
description: '[Workflow] Use when activating the Write Integration Tests workflow for spec-first integration test authoring. Also covers converting existing test specs into integration test code and verifying integration test stability (repeat-run verification).'
disable-model-invocation: true
---

## Quick Summary

**Goal:** [Workflow] Trigger Write Integration Tests workflow — spec-first test authoring: investigate domain logic → write/update specs → generate test code → 7-gate review (incl. change coverage) → run and verify.

**Absorbed use cases:** converting existing TC specs into integration test code (former test-to-integration — specs already exist, so `/spec [mode=tests]` runs in UPDATE/verify mode instead of authoring from scratch) and stability verification of existing suites (former test-verify — the `/integration-test-verify` step's 3-consecutive-run gate). For spec-only authoring with no test code, use the `/spec [mode=tests]` skill directly.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require integration tests to protect a named business rule/invariant and fail if that intent breaks.
- MUST ATTENTION arrange integration-test data through real use cases or valid seeded fixtures; never create impossible state through repository hacks.
- MUST ATTENTION verify integration suites with 3 consecutive passing runs without DB reset before declaring done.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /scout -> /feature-investigation -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Understand Domain First Gate:** The `/investigate` step is MANDATORY before `/spec [mode=tests]` and `/integration-test`. You MUST read the handler/entity/event source to understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. Assertions written without reading the handler source are guaranteed to be wrong or smoke-only.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the test request). Each generated test maps to a saved goal invariant/criterion — a test protecting NO saved invariant needs a recorded justification. After `/integration-test-verify`, append the verification evidence (pass/fail counts, runner command, report path) to the goal file's Iteration Log and emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `/workflow-end`.

Activate the `workflow-write-integration-test` workflow. Run `/start-workflow workflow-write-integration-test` with the user's prompt as context.

**Steps:** /scout → /feature-investigation → /spec [mode=tests] → /why-review → /review-artifact --type=spec-tests → /integration-test → /integration-test-review → /integration-test-verify → /spec [mode=sync] → /docs-update → /workflow-end → /watzup

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`/scout`** — Find target command/handler files; locate existing integration tests in the same service for pattern matching. Output: list of target files + existing test examples.
> **`/investigate`** — Read handler/entity/event source. Map: fields written, entities created/updated/deleted, event handlers fired, validation rules. Output: domain logic summary to use as assertion blueprint.
> **`/spec [mode=tests]`** — Write/update `TC-{FEATURE}-{NNN}` specs in feature doc Section 8. CREATE mode for new tests, UPDATE mode for changed behavior. Output: TC mapping list (TC code -> covering test method name(s) or annotation filter).
> **`/review-artifact --type=spec-tests`** — Validate spec quality: GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths covered, no collisions with existing TC codes.
> **`/integration-test`** — Generate test files from TC specs using FROM-PROMPT or FROM-CHANGES mode. Non-negotiable: real use-case/valid-seeder data setup, async polling/retry for all DB assertions, unique data generators for all test data, test-spec annotation on every test method (adapt annotation syntax to your framework).
> **`/integration-test-review`** — 7-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage). Gate 7: every behavior-changing production file in the change set maps to a covering test (integration-first; unit fallback needs justification) AND a spec TC. Validate findings, fix only validated issues, then restart the full integration-test review after fixes. NEVER proceed with CRITICAL/HIGH issues outstanding.
> **`/integration-test-verify`** — Run tests via `quickRunCommand` from `docs/project-config.json` for 3 consecutive runs without DB reset. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
> **`/spec [mode=sync]`** — Sync §8 TCs ↔ integration test code (`docs/specs/`). Update each TC's `IntegrationTest` field with **all** covering `{File}::{MethodName}` links (one TC → many tests, 1:N; a test-filter expression when the set is large). Coverage = ≥1 annotation-tagged test; never force one test per TC.
> **`/docs-update`** — Update feature doc evidence fields, version history, and changelog if test coverage changed materially.
> **`/workflow-end`** + **`/watzup`** — Close workflow state, then summarize and run the final `/understand` handoff.

---

**IMPORTANT MANDATORY Steps:** /scout -> /feature-investigation -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /docs-update -> /workflow-end -> /watzup

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `/project-init`.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** read handler source BEFORE writing ANY assertion — domain logic first, test code second
**IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — every test MUST assert specific field values in the database
**IMPORTANT MUST ATTENTION** ALWAYS wrap DB assertions in the project's async polling helper — no exceptions
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
