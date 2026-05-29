---
name: integration-test-verify
description: '[Testing] Use when you need to verify integration tests pass after writing and reviewing them.'
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

**Goal:** Run integration tests after `$integration-test` writes them and `$integration-test-review` reviews them. Confirm all pass and remain repeatable.

**Workflow:**

1. **Read Config** — Load `docs/project-config.json` → `integrationTestVerify` section for project-specific run guidance
2. **System Check** — Verify required system is healthy before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined test projects for 3 consecutive runs
5. **Report** — Pass/fail counts, failed test names, next steps on failure

**Key Rules:**

- MUST read project config `integrationTestVerify` section before doing anything else
- MUST read project-specific reference docs named by `integrationTestVerify.referenceDocs` or the project's integration-test doc path before running tests
- Use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command
- If system check fails → instruct user how to start system (reference `startupScript` from config)
- If config says local infrastructure, databases, services, or full system startup is required, treat that as a blocking prerequisite
- On test failure → diagnose root cause: test bug or service bug. NEVER weaken assertions.
- Verification only passes after 3 consecutive successful runs of each relevant suite/project without DB reset
- Always report exact failure counts and names — "all passed" requires evidence

**Be skeptical. Apply critical thinking. Every pass/fail claim needs actual test runner output.**

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Step 1: Read Project Config

Read `docs/project-config.json` and extract the `integrationTestVerify` section.

```
Expected config shape:
{
  "integrationTestVerify": {
    "guidance":             string   — instructions for this project's test run approach
    "referenceDocs":        string[] — project docs that explain integration-test setup/run prerequisites
    "quickRunCommand":      string   — test runner command (e.g., "dotnet test --no-build", "npm test", "pytest")
    "testProjectPattern":   string   — glob pattern to discover test projects (e.g., "src/Services/**/*.IntegrationTests.csproj")
    "testProjects":         string[] — explicit list of test project paths (fallback if no pattern)
    "systemCheckCommand":   string   — shell command to check system readiness
    "runScript":            string   — path to CI-style full run script (reference only)
    "startupScript":        string   — path to system startup script (reference only)
  }
}
```

**Config priority:** `testProjectPattern` (auto-discovers via glob) > `testProjects` (explicit list) > git auto-detect (fallback).

**If `integrationTestVerify` section is missing:** proceed to [Fallback Mode](#fallback-mode-no-project-config).

**If section exists:** display the `guidance` value to the user verbatim — it contains project-specific instructions the implementer wrote intentionally.

Then read the project-specific setup guidance before any system check or test command:

1. Read every file listed in `integrationTestVerify.referenceDocs`, if present.
2. If no `referenceDocs` list exists, read the integration-test reference doc indicated elsewhere in `docs/project-config.json` (for example a framework/testing integration test doc path), if present.
3. If config names `runScript` or `startupScript`, read those scripts when needed to understand startup, health checks, arguments, or labels. Use them as project-specific evidence, not generic assumptions.
4. If no project-specific reference exists, proceed only with the explicit config values and call out that the project should add reference docs to `integrationTestVerify`.

---

## Step 2: System Check

**If `systemCheckCommand` exists in config:**

Run the system check via Bash:

```bash
{systemCheckCommand}
```

Evaluate output:

- **Healthy** → proceed to Step 3
- **Partially healthy / no containers** → display startup instructions to user: > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `$integration-test-verify`."
    > **STOP** — do not run tests against an unhealthy system. Results would be unreliable.

**If no `systemCheckCommand`:**

- If `guidance`, reference docs, `runScript`, or `startupScript` indicate required local infrastructure/services, STOP and tell the user the project config needs a concrete readiness check before AI verification can run.
- Otherwise, proceed to Step 3 and explicitly report that no system check was configured.

---

## Step 3: Determine Test Projects

**Priority order:** `testProjectPattern` (glob auto-discover) > `testProjects` (explicit list) > git auto-detect (fallback).

**If `testProjectPattern` exists in config:**

Discover test projects by running a glob search for the pattern:

```bash
# Example for .NET projects (pattern: "src/Services/**/*.IntegrationTests.csproj")
find . -path "{testProjectPattern}" -type f
# or use language-appropriate glob tool
```

Use all discovered `.csproj` files (or equivalent) as the test project list. Exclude any paths outside the pattern scope.

**If no `testProjectPattern` but `testProjects` list exists:**

Use the explicit list from config directly.

**If neither exists — auto-detect from git:**

```bash
# Auto-detect changed test projects
git diff --name-only HEAD | grep -i "IntegrationTest" | sed 's|/[^/]*$||' | sort -u
```

If auto-detect finds nothing (no uncommitted test changes), ask user: "No changed test files detected. Run all test projects or skip?"

**Filter rule:** Only run projects relevant to the current change. If user explicitly asks to run all → run all discovered/configured projects.

---

## Step 4: Run Tests

Run this step only after Step 2 passed or the config/reference docs explicitly state no external system is required.

Execute using `quickRunCommand` from config. Run each relevant suite/project 3 consecutive times without resetting data.

**Three-run idempotency gate:** If any run fails, verification fails. Fix the root cause, then restart the 3-run sequence from run 1.

Example for a.NET project:

```bash
# Run each test project individually for clear per-project results
{quickRunCommand} {testProject1}
{quickRunCommand} {testProject2}
# ...
```

Or run all at once using the solution filter if supported:

```bash
{quickRunCommand} --filter "Category=integration"
```

**Capture output for every run**: count Passed, Failed, Skipped. Note: skipped tests (tests marked with a framework-specific skip annotation, e.g., `[Fact(Skip=...)]` in xUnit, `@Disabled` in JUnit) are expected and not a failure.

---

## Step 5: Report Results

After all tests complete, report:

```
### Integration Test Verify Results

**Run command:** {quickRunCommand}
**Projects tested:** {N}
**Repeatability gate:** 3 consecutive runs without DB reset

| Project | Run | Passed | Failed | Skipped |
|---------|-----|--------|--------|---------|
| {Project1} | 1 | X | 0 | Y |
| {Project1} | 2 | X | 0 | Y |
| {Project1} | 3 | X | 0 | Y |

**Total:** {total_passed} passed, {total_failed} failed, {total_skipped} skipped (expected skip annotations)

Status: ✅ ALL PASS | ❌ {N} FAILURES
```

**On failure:**

1. List each failing test name + failure message
2. Diagnose: test bug (wrong assertion setup) or service bug (handler actually broken)?
3. If test bug → fix in the test file (do NOT weaken assertions — fix setup/data)
4. If service bug → report as finding, do NOT silently fix without telling user
5. After fixing → re-run the full 3-run verify sequence

---

## Fallback Mode (No Project Config)

When `docs/project-config.json` has no `integrationTestVerify` section:

1. Detect project type from root files:
    - `*.sln` or `*.csproj` → `dotnet test`
    - `package.json` → `npm test` or `npx jest`
    - `pytest.ini` / `setup.py` / `pyproject.toml` → `pytest`
    - `go.mod` → `go test ./...`

2. Auto-detect changed test files from git:

    ```bash
    git diff --name-only HEAD
    ```

3. Run detected command on changed test projects.

4. Report results and recommend: "Add `integrationTestVerify` to `docs/project-config.json` for project-specific run guidance."

---

## CI-Style Full Run (Reference)

When `runScript` is configured, reference it for the full CI-style run (not run by AI directly — Windows.cmd scripts and CI runners require user/pipeline execution):

> "For a full CI-style run including Docker orchestration and health polling, execute: `{runScript}`"

This script typically: creates networks → removes stale containers → builds images → starts infrastructure (wait healthy) → starts APIs (wait healthy) → runs all tests.

---

## On Test Failure Protocol

**NEVER** do these to make failures go away:

- ❌ Remove or weaken assertions
- ❌ Add skip annotations (e.g., `[Fact(Skip=...)]` in xUnit, `@Disabled` in JUnit) to hide failures
- ❌ Create or mutate domain data through repositories to bypass real use-case paths
- ❌ Mark passing by ignoring error output
- ❌ Report "all passed" without showing actual runner output

**DO** this instead:

1. Read the failing test method
2. Read the handler/service the test targets
3. Identify: is the assertion wrong, or is the code wrong?
4. Fix at the root cause layer; use real use cases or valid seeded fixtures for data setup
5. Re-run to confirm green

If a test fails because the system is unavailable → report as "system not ready" and reference `startupScript` / `runScript`. Never change the test.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `test-to-integration` workflow** (Recommended) — scout → integration-test → integration-test-review → integration-test-verify → test → docs-update → watzup → workflow-end
> 2. **Execute `$integration-test-verify` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$workflow-review-changes (Recommended)"** — Review all changes before committing
- **"$integration-test-review"** — If tests fail: review and fix integration tests before re-verify
- **"$docs-update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.
> **A verify step that does not actually run tests 3 consecutive times is not repeatability verification. It is theater.**
> Read project config FIRST to understand how to run tests for this specific project.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix.

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

<!-- /SYNC:ai-mistake-prevention -->

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
>
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

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

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** read `docs/project-config.json` → `integrationTestVerify` FIRST — project-specific guidance overrides defaults
- **MANDATORY IMPORTANT MUST ATTENTION** read project-specific integration-test reference docs/scripts from config before any test command — Codex has no hook injection
- **MANDATORY IMPORTANT MUST ATTENTION** use `quickRunCommand` from config, not hardcoded `dotnet test` — this skill is language-agnostic
- **MANDATORY IMPORTANT MUST ATTENTION** run system check before tests — unreliable system = unreliable results
- **MANDATORY IMPORTANT MUST ATTENTION** never weaken assertions to fix failures — diagnose and fix root cause
- **MANDATORY IMPORTANT MUST ATTENTION** show actual test runner output — "all passed" without evidence is not verification
- **MANDATORY IMPORTANT MUST ATTENTION** on failure: diagnose (test bug vs service bug) before fixing anything

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

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
