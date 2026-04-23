---
name: integration-test-verify
description: '[Testing] Verify integration tests pass after writing and reviewing them. Reads project-specific run guidance from docs/project-config.json (integrationTestVerify section). Generic: supports any test runner via config.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.
> **A verify step that does not actually run tests is not verification. It is theater.**
> Read project config FIRST to understand how to run tests for this specific project.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

## Quick Summary

**Goal:** Run integration tests after `/integration-test` writes them and `/integration-test-review` reviews them. Confirm all pass.

**Workflow:**

1. **Read Config** — Load `docs/project-config.json` → `integrationTestVerify` section for project-specific run guidance
2. **System Check** — Verify required system is healthy before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined test projects
5. **Report** — Pass/fail counts, failed test names, next steps on failure

**Key Rules:**

- MUST read project config `integrationTestVerify` section before doing anything else
- Use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command
- If system check fails → instruct user how to start system (reference `startupScript` from config)
- On test failure → diagnose root cause: test bug or service bug. NEVER weaken assertions.
- Always report exact failure counts and names — "all passed" requires evidence

**Be skeptical. Apply critical thinking. Every pass/fail claim needs actual test runner output.**

---

## Step 1: Read Project Config

Read `docs/project-config.json` and extract the `integrationTestVerify` section.

```
Expected config shape:
{
  "integrationTestVerify": {
    "guidance":             string   — instructions for this project's test run approach
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

---

## Step 2: System Check

**If `systemCheckCommand` exists in config:**

Run the system check via Bash:

```bash
{systemCheckCommand}
```

Evaluate output:

- **Healthy** → proceed to Step 3
- **Partially healthy / no containers** → display startup instructions to user:
    > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `/integration-test-verify`."
    > **STOP** — do not run tests against an unhealthy system. Results would be unreliable.

**If no `systemCheckCommand`:** skip this step and proceed to Step 3.

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

Execute using `quickRunCommand` from config. Example for a .NET project:

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

**Capture output**: count Passed, Failed, Skipped. Note: skipped tests (tests marked with a framework-specific skip annotation, e.g., `[Fact(Skip=...)]` in xUnit, `@Disabled` in JUnit) are expected and not a failure.

---

## Step 5: Report Results

After all tests complete, report:

```
### Integration Test Verify Results

**Run command:** {quickRunCommand}
**Projects tested:** {N}

| Project | Passed | Failed | Skipped |
|---------|--------|--------|---------|
| {Project1} | X | 0 | Y |
| {Project2} | X | 0 | Y |

**Total:** {total_passed} passed, {total_failed} failed, {total_skipped} skipped (expected skip annotations)

Status: ✅ ALL PASS | ❌ {N} FAILURES
```

**On failure:**

1. List each failing test name + failure message
2. Diagnose: test bug (wrong assertion setup) or service bug (handler actually broken)?
3. If test bug → fix in the test file (do NOT weaken assertions — fix setup/data)
4. If service bug → report as finding, do NOT silently fix without telling user
5. After fixing → re-run verify

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

When `runScript` is configured, reference it for the full CI-style run (not run by AI directly — Windows .cmd scripts and CI runners require user/pipeline execution):

> "For a full CI-style run including Docker orchestration and health polling, execute: `{runScript}`"

This script typically: creates networks → removes stale containers → builds images → starts infrastructure (wait healthy) → starts APIs (wait healthy) → runs all tests.

---

## On Test Failure Protocol

**NEVER** do these to make failures go away:

- ❌ Remove or weaken assertions
- ❌ Add skip annotations (e.g., `[Fact(Skip=...)]` in xUnit, `@Disabled` in JUnit) to hide failures
- ❌ Mark passing by ignoring error output
- ❌ Report "all passed" without showing actual runner output

**DO** this instead:

1. Read the failing test method
2. Read the handler/service the test targets
3. Identify: is the assertion wrong, or is the code wrong?
4. Fix at the root cause layer
5. Re-run to confirm green

If a test fails because the system is unavailable → report as "system not ready" and reference `startupScript` / `runScript`. Never change the test.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `test-to-integration` workflow** (Recommended) — scout → integration-test → integration-test-review → integration-test-verify → test → docs-update → watzup → workflow-end
> 2. **Execute `/integration-test-verify` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/workflow-review-changes (Recommended)"** — Review all changes before committing
- **"/integration-test-review"** — If tests fail: review and fix integration tests before re-verify
- **"/docs-update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** read `docs/project-config.json` → `integrationTestVerify` FIRST — project-specific guidance overrides defaults
- **MANDATORY IMPORTANT MUST ATTENTION** use `quickRunCommand` from config, not hardcoded `dotnet test` — this skill is language-agnostic
- **MANDATORY IMPORTANT MUST ATTENTION** run system check before tests — unreliable system = unreliable results
- **MANDATORY IMPORTANT MUST ATTENTION** never weaken assertions to fix failures — diagnose and fix root cause
- **MANDATORY IMPORTANT MUST ATTENTION** show actual test runner output — "all passed" without evidence is not verification
- **MANDATORY IMPORTANT MUST ATTENTION** on failure: diagnose (test bug vs service bug) before fixing anything
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
