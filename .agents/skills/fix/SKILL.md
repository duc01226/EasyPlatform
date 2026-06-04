---
name: fix
description: '[Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci|issue|logs|test|types|ui} scopes the fix; --target=types resolves TypeScript errors inline.'
disable-model-invocation: false
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Eliminate the root cause of an issue using parallel subagent investigation — traced end-to-start with `file:line` evidence and fixed at the lowest invariant-owning layer (never the crash site) — then prove the fix with `$prove-fix` so the disease is cured, not just the symptom.

**Workflow:**

1. **Scout** — Use scout/researcher subagents to explore issue in parallel
2. **Diagnose** — Trace root cause through code paths with evidence
3. **Plan** — Create fix plan with impact analysis
4. **Fix** — Implement and verify the fix

**Key Rules:**

- Debug Mindset: every claim needs `file:line` evidence
- Use subagents for parallel investigation of multiple hypotheses
- Always create a plan before implementing complex fixes
- **Target flag** (see [Target Routing](#target-routing---target)): `--target={ci|issue|logs|test|types|ui}` selects a self-contained inline branch that scopes the fix to that domain. No flag = full diagnose→fix spine below.

## Default Mode Policy

> **Default mode HARD (full rigor).** Every section below — parallel scout/researcher subagents, root-cause tracing with `file:line` evidence, Confidence & Evidence Gate, fix plan with impact analysis, preservation tests for the bug — applies by default.
>
> **Opt out to fast mode ONLY when ALL true** (bug genuinely trivial):
>
> - Root cause obvious from error message AND already located (no diagnosis needed)
> - Single-file fix, ≤10 lines changed
> - No cross-service impact, no contract change
> - Test for bug already exists OR bug non-functional (typo, log message)
> - Confidence in fix ≥95% without further investigation
>
> **Any condition fails → use full protocol below.** When in doubt, default hard. Skipping diagnosis on non-trivial bug fixes symptom and leaves disease.
>
> **Fast mode skips (and only skips):** parallel subagent investigation (direct read/grep instead), separate fix plan (inline change), regression-test authoring (only if covering test exists). Does NOT skip Confidence & Evidence Gate, Behavioral Delta Matrix, or running existing test suite.

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

- Verify each hypothesis against an actual code trace before acting — do NOT assume first hypothesis correct — why: the first guess is usually the nearest-attention trap, not the cause
- Every root cause claim must include `file:line` evidence
- If you cannot prove root cause with code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify fix addresses traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

**Ultrathink** plan and start fixing these issues; follow Orchestration Protocol, Core Responsibilities, Subagents Team, Development Rules:
<issues>$ARGUMENTS</issues>

## Target Routing (`--target=`)

`$fix` is an intelligent router. With no flag it runs the full diagnose→fix spine below. Pass `--target=` to scope the run to a self-contained inline branch:

| `--target` | Behavior                                                        |
| ---------- | --------------------------------------------------------------- |
| `types`    | **Inline branch (below)** — TypeScript / type-error resolution. |
| `ci`       | **Inline branch (below)** — CI / pipeline failure triage.       |
| `issue`    | **Inline branch (below)** — tracked issue / ticket resolution.  |
| `logs`     | **Inline branch (below)** — log / stack-trace-driven debugging. |
| `test`     | **Inline branch (below)** — failing-test repair.                |
| `ui`       | **Inline branch (below)** — UI / visual-defect fixes.           |

No `--target` (or an unrecognized value) → run the full Workflow spine below; infer the right specialization from `<issues>`.

> **Formerly standalone skills.** `--target=ci|issue|logs|test|ui` were previously the separate skills `/fix-ci`, `/fix-issue`, `/fix-logs`, `/fix-test`, `/fix-ui`; they are now inline branches of `$fix` (folded — the standalone names no longer exist).

### `--target=types` — TypeScript / type-error branch

Run `tsc --noEmit` (or `nx build` / `bun run typecheck` / `npx tsc`) to gather all type errors, then:

1. **Collect** — Capture every type error with `file:line`.
2. **Classify** — Group by cause: missing types, wrong signatures, import/export issues.
3. **Fix at root** — Give each value its real, specific type (or `unknown` + a narrowing guard). Do NOT use `any` to silence the checker — `any` ships the underlying type defect. Fix the root cause (wrong interface, missing export), not the symptom site. — why: `any` silences the checker and lets the type defect ship.
4. **Repeat** until `tsc --noEmit` is clean — zero type errors.
5. **🛑 Validate Before Fix:** present errors + root cause via a direct user question, get approval before code changes (skip if inside a workflow).
6. **After fixing, run `$prove-fix`** — build code proof traces per change with confidence scores. Never skip.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=ci` — CI / pipeline-failure branch

**Goal:** Analyze CI/CD pipeline logs to identify and fix build/test failures in the configured CI provider/tooling.

**Key Rules:**

- **Infrastructure context:** read `docs/project-config.json` → `infrastructure.cicd.tool` to identify the CI provider/tooling (e.g. `azure-devops`, `github-actions`, `gitlab-ci`); target that provider's pipeline config files.
- Focus on CI-specific issues (env vars, Docker, dependencies, build order).
- Verify the fix does not break local development.

**Workflow:**

1. Use the `debugger` subagent to read the CI logs via the configured CI tool/API (from `docs/project-config.json`), analyze the final failing log/error **backward** to the root cause, and report back. Write findings to `.ai/workspace/analysis/{ci-issue}.analysis.md`; re-read before implementing.
2. **🛑 Present root cause + proposed fix → a direct user question → wait for approval.**
3. Implement the fix from the report.
4. Use the `tester` subagent to verify; report back.
5. If tests fail, repeat from step 2.
6. Report a summary of changes; suggest next steps. Then run `$prove-fix`.

**Notes:** Use the CLI/API for the configured CI provider. If it is GitHub Actions and `gh` is unavailable, instruct the user to install and authorize GitHub CLI first.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=issue` — tracked-issue / ticket branch

**Goal:** Investigate and fix bugs reported as tracked issues (e.g. GitHub issues) with full traceability.

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the issue). Map the ticket's acceptance criteria to the saved success criteria; after the fix, append proof evidence and remaining gaps to the Iteration Log. Closure is blocked while any required criterion remains FAIL.

**Key Rules:**

- Link the fix back to the issue for traceability.
- Verify the fix addresses the specific reproduction steps from the issue.

**Workflow:**

1. Activate the `debug-investigate` skill and follow its workflow. See `.claude/docs/AI-DEBUGGING-PROTOCOL.md` for comprehensive guidelines.
2. Use external memory at `.ai/workspace/analysis/issue-[number].analysis.md` for structured analysis. **Re-read the ENTIRE analysis file before proposing any fix.**
3. **🛑 Present root cause + proposed fix → a direct user question → wait for approval before implementing.**
4. Implement, then run `$prove-fix`.

> **Standalone Review Gate (non-workflow only):** if `$fix --target=issue` runs **outside a workflow**, add a `$review-changes` task tracking todo as the **last** task. Inside a workflow, skip — the sequence handles `$review-changes`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=logs` — log / stack-trace branch

**Goal:** Analyze application logs to diagnose and fix runtime errors or unexpected behavior.

**Key Rules:**

- Focus on log patterns: stack traces, error codes, timing anomalies.
- Cross-reference logs with source code to find the actual root cause.

**Workflow:**

1. Check whether `./logs.txt` exists. If missing, set up permanent log piping in the project's script config (`package.json`, `Makefile`, `pyproject.toml`, …): **Bash/Unix** append `2>&1 | tee logs.txt`; **PowerShell** append `*>&1 | Tee-Object logs.txt`. Run the command to generate logs.
2. Use the `debugger` subagent to analyze `./logs.txt`: read with `Grep` `head_limit: 30` (last 30 lines; increase if needed — avoid loading the whole file). Write analysis to `.ai/workspace/analysis/{issue-name}.analysis.md`; re-read before fixing.
3. Use the `scout` subagent to locate the exact source of the issue; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → a direct user question → wait for approval.**
6. Implement the fix.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 3.
10. Report a summary; suggest next steps. Then run `$prove-fix`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=test` — failing-test branch

**Goal:** Run test suites, analyze failures, and fix the underlying code or test issues.

**Active-goal read (BEFORE fixing):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the reported test failure). Map failing-test evidence (before) and passing-test evidence (after) to the saved success criteria in the Iteration Log — a passing suite that misses a saved required criterion does NOT close the loop.

**Key Rules:**

- Distinguish between code bugs and flawed test expectations.
- Re-run tests after the fix to confirm all pass.
- Read `docs/project-reference/integration-test-reference.md` before reviewing/writing integration tests; consult `docs/specs/` for expected-behavior context when diagnosing failures.

**Workflow:**

1. Use the `tester` subagent to compile the code and fix any syntax errors.
2. Use the `tester` subagent to run the tests; report back. Write failure analysis to `.ai/workspace/analysis/{test-issue}.analysis.md`; re-read before fixing.
3. If tests fail, use the `debugger` subagent to find the root cause; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → a direct user question → wait for approval.**
6. Implement the plan step by step.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 2.
10. Report a summary; suggest next steps. Then run `$prove-fix`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=ui` — UI / visual-defect branch

**Goal:** Diagnose and fix UI/UX issues — layout, styling, responsiveness, and visual bugs.

**Key Rules:**

- Always use BEM classes on template elements.
- Check responsive breakpoints when fixing layout issues.
- **Pre-read (design system):** load `designSystem.canonicalDoc` + `tokenFiles` from `docs/project-config.json` so fixes use real token names (`--brand-*`, `$brand-*`) and canonical component classes — not invented values.

**Required skills (priority order):** `ui-ux-pro-max` (design-intelligence DB) → `web-design-guidelines` (principles) → `frontend-design` (implementation patterns).

**Workflow:**

**FIRST** — run `ui-ux-pro-max` searches to understand context and common issues:

```bash
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product-type>" --domain product
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<style-keywords>" --domain style
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "z-index animation" --domain ux
```

If the user provides screenshots/videos, use the `visual analysis tooling` skill to describe the issue in detail so developers can predict the root causes.

> **🛑 After identifying the UI root cause, present findings + proposed fix → a direct user question → wait for approval before any code change.**

1. Use the `ui-ux-designer` subagent to implement the fix step by step (against the design guideline — `designSystem.canonicalDoc`).
2. Capture screenshots (at the exact parent container, not the whole page) and analyze with the appropriate Gemini skill (`visual analysis tooling`, `video-analysis`, or `document-extraction`) so the result matches the design guideline and addresses all issues. Repeat until addressed.
3. Use the browser automation tooling to verify the fix matches the design guideline.
4. Use the `tester` subagent to compile and test; report back. Repeat until all tests pass.
5. **If the user approves:** run the `project-manager` and `docs-manager` subagents in parallel to update plan progress and `./docs`; have `project-manager` also create/update a project roadmap at `./docs/project-roadmap.md`.
6. Report a summary; suggest next steps. Then run `$prove-fix`.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

## Workflow:

If user provides screenshots or videos, use `visual analysis tooling` skill to describe issue in detail; ensure developers can predict root causes from description.

### Fulfill the request

**Question Everything:** Use a direct user question tool to ask probing questions to fully understand user's request, constraints, true objectives. Don't assume — clarify until 100% certain.

- Use a direct user question to clarify any open questions.
- Ask 1 question at a time; wait for answer before next question.
- No questions → start next step.

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause + plan creation, MUST ATTENTION present findings + proposed fix plan to user via a direct user question and get explicit approval BEFORE any code changes. No silent fixes.
> **End-to-Start Trace Gate:** For non-trivial bugs, failed verification, stale/incorrect final outputs, or behavior-changing fixes, the root-cause plan MUST ATTENTION include `Debugger Trace: End -> Start`, feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and run `$debug-investigate` or `$investigate` before planning code changes.

### Fix the issue

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the reported issue via `.claude/templates/goal-contract-template.md`. The saved success criteria define what "fixed" means — a proven local fix that misses a saved required criterion is NOT complete. After proof, append root cause, proof evidence, and remaining goal gaps to the Iteration Log. Tiny fixes may skip deeper gates ONLY with user-accepted reason recorded in the goal file.

Use `sequential-thinking` skill to break complex problems into sequential thought steps.
Use `problem-solving` skills to tackle issues.
Analyze skills catalog and activate other needed skills during the process.

1. Use `debugger` subagent to find root cause and report back to main agent.
   1.5. Write investigation results to `.ai/workspace/analysis/{issue-name}.analysis.md`. Re-read ENTIRE file before planning fix.
   1.6. Confirm the report contains final symptom -> reader -> storage/projection -> writer -> consumer/job -> producer/origin, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof.
2. Use `researcher` subagent to research root causes on internet (if needed) and report back.
3. Use `planner` subagent to create implementation plan based on reports; report back.
4. **🛑 Present root cause + fix plan → a direct user question → wait for user approval.**
5. Use `$code` SlashCommand to implement plan step by step.
6. Final Report:

- Report back to user with summary of changes; explain briefly; guide user to get started; suggest next steps.
- Ask user whether to commit and push to git; if yes, use `git-manager` subagent.

* **IMPORTANT:** Sacrifice grammar for concision when writing reports.
* **IMPORTANT:** List unresolved questions at end of reports, if any.

**REMEMBER:**

- Generate images with `visual analysis tooling` skills on the fly for visual assets.
- Read and analyze generated assets with `visual analysis tooling` skills to verify they meet requirements.
- For image editing (removing background, adjusting, cropping), use media processing tooling as needed.

- **After fixing, MUST ATTENTION run `$prove-fix`** — build code proof traces per change with confidence scores. Never skip.

---

## Next Steps (Standalone: MUST ATTENTION ask user via a direct user question. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, MUST ATTENTION use a direct user question to present these options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"Proceed with full workflow (Recommended)"** — Detect best workflow to continue from here (fix applied). Ensures prove-fix, review, testing, docs steps aren't skipped.
- **"$prove-fix"** — Prove fix correctness with code traces
- **"$test"** — Run tests to verify fix
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — workflow handles sequencing.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:root-cause-debugging -->

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

<!-- /SYNC:root-cause-debugging -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
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

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

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
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `$project-init`.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Eliminate the root cause of an issue — traced end-to-start with `file:line` evidence and fixed at the lowest invariant-owning layer (never the crash site) — then prove the fix with `$prove-fix` so the disease is cured, not just the symptom.

**IMPORTANT MUST ATTENTION** default mode HARD — opt out to fast mode ONLY when bug is genuinely trivial (all 5 conditions met)
**IMPORTANT MUST ATTENTION** break work into small todo tasks via task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** trace data flow and fix at owning layer — NEVER at crash site
**IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts — report outcomes, ask user before #4
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via task tracking.

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
