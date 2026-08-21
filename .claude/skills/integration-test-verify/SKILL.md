---
name: integration-test-verify
description: '[Testing] Use when you need to verify integration tests pass after writing and reviewing them.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Prove the reviewed integration tests (written by `/integration-test`, reviewed by `/integration-test-review`) pass repeatably — 2 consecutive green runs without DB reset, using project-configured run commands, against an environment whose doc-declared preconditions were harvested and verified BEFORE the first test command — with every pass/fail claim backed by actual test-runner output, never assumption.

**Summary:** read-this-if-nothing-else digest of the 5 main steps —

- **Step 1 — Read config + reference docs FIRST, then HARVEST preconditions:** load `docs/project-config.json` → `integrationTestVerify` and obey its `quickRunCommand`; READ every `referenceDocs` file (else the project's integration-test reference doc) and harvest from it an explicit **Environment Precondition Checklist** — whatever that doc actually declares (services/containers, DB + migration/seed state, env vars, ports, credentials, startup script, isolation rules). Language-agnostic, so NEVER hardcode `dotnet test`; missing section → Fallback Mode. — why: reading the doc without extracting its preconditions changes nothing — the run still starts blind.
- **Step 2 — Gate on a healthy system AND every harvested precondition:** run `systemCheckCommand` AND verify each checklist item against real evidence; any unmet → STOP, mark ENVIRONMENT-BLOCKED, name the precondition + the doc line declaring it, point user at `startupScript`. — why: `systemCheckCommand` covers only what the config author thought to encode, so a doc-declared precondition it misses becomes a red suite blamed on the tests.
- **Step 3 — Determine test projects:** discover via `testProjectPattern` glob > `testProjects` list > git auto-detect; run only projects the change touches.
- **Step 4 — Run the 2-run gate, fan out when many isolated projects:** each relevant suite passes 2 consecutive green runs WITHOUT DB reset; any failure restarts from run 1. When several independent, per-DB-isolated projects exist, fan out one `integration-tester` sub-agent per project/group in parallel → barrier on ALL returns → aggregate; suites sharing a DB run sequentially. — why: parallel runs over a shared DB cross-contaminate and silently break the no-reset guarantee.
- **Step 5 — Report from real output, fix at root, hand failures to the loop:** report Passed/Failed/Skipped counts + failing names (only actual runner output proves a result); on failure diagnose test-bug vs service-bug and fix at the owning layer — NEVER weaken assertions, add skips, or mutate domain data to force green. ANY failure → recommend `/workflow-integration-test-green`, which owns the converge-to-green loop this skill does not (skip that recommendation when this run IS a round of that loop). — why: a snapshot that reports red and stops leaves the user hand-carrying every failure.

**Workflow:**

1. **Read Config + Reference Docs** — Load `docs/project-config.json` → `integrationTestVerify`, read the project's integration-test reference docs, harvest the Environment Precondition Checklist
2. **System Check + Precondition Gate** — Verify the system is healthy AND every harvested precondition is met before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined test projects for 2 consecutive runs; fan out parallel `integration-tester` sub-agents when many isolated projects must run
5. **Report** — Pass/fail counts, failed test names, next steps on failure

**Key Rules:**

- MUST read project config `integrationTestVerify` section before doing anything else
- MUST read project-specific reference docs named by `integrationTestVerify.referenceDocs` or the project's integration-test doc path before running tests
- MUST harvest an explicit Environment Precondition Checklist from those docs — derive each item from what the doc declares, NEVER from a fixed list in this skill — and verify every item before the first test command
- Use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command
- If system check fails → instruct user how to start system (reference `startupScript` from config)
- Any harvested precondition unmet → STOP, mark ENVIRONMENT-BLOCKED, cite the precondition + its doc line, and point the user at the setup step — NEVER run the suite anyway and NEVER report an environment failure as a failing test
- If config says local infrastructure, databases, services, or full system startup is required, treat that as a blocking prerequisite
- On test failure → diagnose root cause: test bug or service bug. NEVER weaken assertions.
- ANY failing test at the end of the run → recommend `/workflow-integration-test-green` as the next step (it owns the converge-to-green loop); omit that recommendation when this run is itself a round of that loop
- On an INTERMITTENT failure (red in one run, green in another) → adjudicate the cause first — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, or (c) genuine product race — and record the verdict with evidence BEFORE any change. NEVER resolve a flake by widening a timeout, adding a retry, or skipping
- Verification only passes after 2 consecutive successful runs of each relevant suite/project without DB reset
- When many independent, isolated test projects must run, fan out one `integration-tester` sub-agent per project (or balanced group) in parallel to speed it up — barrier on all returns, then aggregate; fall back to sequential when suites share a DB or aren't isolated
- Always report exact failure counts and names — "all passed" requires evidence

**Be skeptical. Apply critical thinking. Every pass/fail claim needs actual test runner output.**

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if downstream rule would raise change cost, this principle wins.

---

## Step 1: Read Project Config + Reference Docs

Read `docs/project-config.json` and extract the `integrationTestVerify` section.

```
Expected config shape:
{
  "integrationTestVerify": {
    "guidance":             string   — instructions for the project's test run approach
    "referenceDocs":        string[] — project docs that explain integration-test setup/run prerequisites
    "quickRunCommand":      string   — test runner command (e.g., "dotnet test --no-build", "npm test", "pytest")
    "testProjectPattern":   string   — glob pattern to discover test projects (e.g., "**/*.IntegrationTests.csproj", "**/*.integration.spec.ts")
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

### Step 1b: Harvest the Environment Precondition Checklist (BLOCKING — before any command)

Reading the reference doc is not the point; **extracting what it requires of the environment** is. From the docs and scripts just read, derive an explicit checklist of every precondition the test run depends on, then carry it into Step 2.

**Derive, never enumerate.** Take the items from what THIS project's doc actually declares — no fixed list here would survive a different stack. Typical shapes the doc may state: required services/containers up and healthy · database reachable, migrated, and seeded to a known baseline · message broker / queue / cache running · env vars, connection strings, ports, credentials, certificates · a startup or bootstrap script that must run first · build/restore performed before the run · per-suite isolation (own DB/schema/namespace) · required test data or fixtures · external dependency stubs.

Record it as a table before proceeding:

```
### Environment Precondition Checklist (harvested)

| # | Precondition | Declared by (doc:line / script) | How to verify | Status |
|---|--------------|---------------------------------|---------------|--------|
| 1 | {what must be true} | {file:line} | {command / observable} | PENDING |
```

Rules:

- MUST cite `file:line` (or script path) for every harvested item — an item with no source is an assumption, not a precondition.
- No reference doc found, or the doc declares no environment prerequisites → record `No environment preconditions declared — proceeding on config values only` and say which doc was checked. NEVER invent preconditions to fill the table — why: a fabricated prerequisite blocks a healthy run and trains the user to ignore the gate.
- A precondition you cannot verify by any command or observable is still recorded, marked `UNVERIFIABLE`, and surfaced to the user — why: an unverifiable prerequisite is a gap in the project's doc, not a reason to skip the gate.

---

## Step 2: System Check + Environment Precondition Gate

**If `systemCheckCommand` exists in config:**

Run the system check via Bash:

```bash
{systemCheckCommand}
```

Evaluate output:

- **Healthy** → proceed to the precondition gate below
- **Partially healthy / no containers** → display startup instructions to user: > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `/integration-test-verify`."
    > **STOP** — do not run tests against an unhealthy system. Results would be unreliable.

**If no `systemCheckCommand`:**

- If `guidance`, reference docs, `runScript`, or `startupScript` indicate required local infrastructure/services, STOP and tell the user the project config needs a concrete readiness check before AI verification can run.
- Otherwise, proceed to the precondition gate and explicitly report that no system check was configured.

### Precondition gate (BLOCKING — every harvested item, evidence-backed)

A green `systemCheckCommand` does NOT discharge the Step 1b checklist: it verifies only what the config author thought to encode, while the reference doc is where the project wrote down what the runner silently assumes. Walk the checklist and settle every row.

1. **Verify each item against real evidence** — a command's actual output, a port/process/container check, a config or env read, a query. NEVER mark an item met by reasoning that it "should" be up.
2. **Mark each row** `MET` (with the evidence) · `UNMET` (with what is missing) · `UNVERIFIABLE` (no observable exists — surface it).
3. **Any `UNMET` → STOP before the first test command.** Report `ENVIRONMENT-BLOCKED`, name the unmet precondition and the `file:line` that declares it, and give the user the concrete setup step (`startupScript`, the doc's setup section, the missing env var). NEVER run the suite anyway — why: a suite run against a half-ready environment reports infrastructure faults as failing tests, which then get "fixed" in the test code.
4. **Never fix an environment gap by editing tests.** An unmet precondition is a setup action for the user or a project-config gap to report — never a reason to weaken a test, add a skip, or relax a timeout.
5. **Emit the settled checklist** (rows + statuses + evidence) into the Step 5 report, so the pass/fail result proves the environment was ready when it ran.

All rows `MET` (or the explicit `no preconditions declared` record) → proceed to Step 3.

---

## Step 3: Determine Test Projects

**Priority order:** `testProjectPattern` (glob auto-discover) > `testProjects` (explicit list) > git auto-detect (fallback).

**If `testProjectPattern` exists in config:**

Discover test projects by running a glob search for the pattern:

```bash
# Example (testProjectPattern from project config, e.g. "**/*.IntegrationTests.csproj")
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

Run this step only after Step 2 passed — system healthy AND every harvested precondition settled `MET` — or the config/reference docs explicitly state no external system is required.

Execute using `quickRunCommand` from config. Run each relevant suite/project 2 consecutive times without resetting data.

**Two-run idempotency gate:** If any run fails, verification fails. Fix the root cause, then restart the 2-run sequence from run 1. If a test is red in one run and green in the other, it is INTERMITTENT — adjudicate the cause per [Intermittent (flaky) failure adjudication](#intermittent-flaky-failure-adjudication--verdict-before-any-change) and record the verdict BEFORE changing anything.

Example for a configured integration-test suite:

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

**Capture output for every run**: count Passed, Failed, Skipped. Note: skipped tests marked with the configured framework's skip annotation are expected and not a failure.

### Parallel execution across multiple test projects (sub-agent fan-out)

> **AI agent note:** When the determined set (Step 3) has **many independent test projects**, do NOT run them one-by-one in the foreground — **fan out one `integration-tester` sub-agent per project (or per balanced group of projects)** in a single message so they run concurrently, then advance only after EVERY sub-agent returns (all-return barrier). This collapses wall-clock from sum-of-suites to slowest-single-suite.

Apply this only when it is actually safe and worthwhile:

- **Threshold.** Skip the fan-out for 1–2 small projects (orchestration overhead outweighs the gain); use it once there are several projects or any long-running suite.
- **Isolation is mandatory.** Parallel suites MUST NOT share mutable state. Fan out only when each project targets its **own isolated DB/schema/container/namespace** (or the project config / reference docs confirm per-suite isolation). If suites share one database, concurrent runs cross-contaminate state and silently break the "2 consecutive green runs without DB reset" guarantee → run those **sequentially** instead. When unsure, ask the user or default to sequential.
- **Each sub-agent owns the full gate for its assignment.** Every sub-agent runs its project(s) through the complete **2-consecutive-green-runs-without-DB-reset** sequence, captures real runner output (Passed/Failed/Skipped counts + failing names), and returns that evidence — partial or single-run results are not acceptable.
- **Each sub-agent inherits this same discipline.** No weakened assertions, no skip annotations, no domain-data hacks; on failure it diagnoses test-bug vs service-bug at the root layer (per the On Test Failure Protocol).
- **Barrier + aggregate.** Wait for all sub-agents, then merge their per-project tables into the single Step 5 report. Any one project failing its 2-run gate fails the overall verification.

```
# Conceptual fan-out (one sub-agent per project / balanced group), launched together:
integration-tester → {testProject1}  → 2-run gate → returns counts + failing names
integration-tester → {testProject2}  → 2-run gate → returns counts + failing names
integration-tester → {testProject3}  → 2-run gate → returns counts + failing names
# ... barrier: aggregate all returns into Step 5 report
```

---

## Step 5: Report Results

After all tests complete, report:

```
### Integration Test Verify Results

**Run command:** {quickRunCommand}
**Projects tested:** {N}
**Repeatability gate:** 2 consecutive runs without DB reset
**Environment preconditions:** {M} harvested from {referenceDoc} — all MET (or: none declared)

| Project | Run | Passed | Failed | Skipped |
|---------|-----|--------|--------|---------|
| {Project1} | 1 | X | 0 | Y |
| {Project1} | 2 | X | 0 | Y |

**Total:** {total_passed} passed, {total_failed} failed, {total_skipped} skipped (expected skip annotations)

Status: ✅ ALL PASS | ❌ {N} FAILURES
```

**On failure:**

1. List each failing test name + failure message
2. Diagnose: test bug (wrong assertion setup) or service bug (handler actually broken)?
3. If test bug → fix in the test file (do NOT weaken assertions — fix setup/data)
4. If service bug → report as finding, do NOT silently fix without telling user
5. After fixing → re-run the full 2-run verify sequence
6. **RECOMMEND `/workflow-integration-test-green` to the user whenever this run ends with ANY failure.** This skill reports a snapshot; it does not own convergence. That workflow runs the loop that clears the suite — each round re-verifies, adjudicates the fault with `/debug-investigate` + `/integration-test-review`, fixes at the owning layer, code-reviews the round's fix diff, and re-verifies from a FRESH full run until the whole suite passes its 2-run gate. Surface it as the recommended next step (see [Next Steps](#next-steps)) rather than hand-carrying failures one by one.
    - **EXCEPTION — do NOT recommend it when this run IS a round of that loop** (invoked by `integration-test-verify-loop` or inside `workflow-integration-test-green`). Return the counts + failing names to the caller instead. — why: the loop already owns convergence; recommending it from inside itself is circular and would restart the very loop that is running.

**Goal Contract evidence (after verify run):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). When one exists, append the verification evidence to the goal file's Iteration Log — run command, per-run pass/fail counts, report path — mapped to the saved success criteria these tests verify, and update the matching Goal Satisfaction matrix rows (PASS on 2/2 green, FAIL with the failing-test list, BLOCKED with a user-facing reason). Record `No active goal — results reported inline only.` when none exists. Never copy raw sensitive fixture data into the goal file.

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
- ❌ Add skip annotations to hide failures
- ❌ Create or mutate domain data through repositories to bypass real use-case paths
- ❌ Mark passing by ignoring error output
- ❌ Report "all passed" without showing actual runner output
- ❌ Widen an assertion timeout, add a retry around a failing assertion, or mark a test flaky-and-skipped to make an intermittent failure go away

**DO** this instead:

1. Read the failing test method
2. Read the handler/service the test targets
3. Identify: is the assertion wrong, or is the code wrong?
4. Fix at the root cause layer; use real use cases or valid seeded fixtures for data setup
5. Re-run to confirm green
6. **If step 3 found the CODE was wrong (SOURCE-WRONG) and your fix changed production/source code**, route that changed source into a fresh `/changes-review` (or emit a HIGH finding requiring it) BEFORE declaring the 2-run green PASS — a source fix that greens a test must not ship un-code-reviewed. (In `workflow-feature`/`workflow-bugfix` the downstream `workflow-review-changes` step already covers this; the route matters for standalone runs.)

If a test fails because the system is unavailable → report as "system not ready" and reference `startupScript` / `runScript`. Never change the test.

### Intermittent (flaky) failure adjudication — verdict BEFORE any change

A test that is red in one run of the 2-run gate and green in another has NOT told you what is wrong. **Emit a written verdict, with evidence, BEFORE editing test code, production code, or any timeout.** An unadjudicated flake gets "fixed" by whatever is nearest — which is almost always the assertion.

**Classify the cause into exactly one of three:**

| Verdict                                          | What it means                                                                                                                                                                                                                                       | Evidence required to claim it                                                                                                                                                    | Resolution                                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Unrealistic scenario / compressed pacing** | The test drives a sequence, timing, or data state production could never reach — most often distinct actor actions fired back-to-back that real usage separates by seconds, minutes, or hours, letting an in-flight async message land out of order | Read the ARRANGE block as a production trace; cite the chained actor actions (`file:line`) and state what separates them in real usage                                           | Fix the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable of the prior step. NEVER a widened assertion timeout                            |
| **(b) Harness topology amplification**           | The trigger is real but the LOCAL topology makes a rare production race routine — shared infrastructure, fan-out consumers over a shared parent, parallel suite execution, cold starts, or a resource-starved runner                                | Name the amplifying topology and cite it (config, fixture, suite settings, another test sharing the data); state whether the trigger exists in production and at what likelihood | Isolate the test's data/topology, or record the amplification explicitly. Report the production likelihood alongside — an amplified race may still be a real one |
| **(c) Genuine product race**                     | The production code itself has an ordering, concurrency, or idempotency defect that a realistic scenario can hit                                                                                                                                    | Trace the failure end-to-start to the defective production path (`file:line`); show the realistic sequence that reaches it                                                       | Report it as a product defect and fix at the owning layer per the fault-adjudication protocol; keep or strengthen the test that caught it                        |

**Rules:**

1. **Verdict first, change second.** Record `Flake verdict: (a) | (b) | (c) — {evidence}` in the Step 5 report before any edit. "Probably flaky" is not a verdict.
2. **Reproduce before concluding.** Re-run the failing test repeatedly (it is a fast local test — see the 60s cap) so the intermittency is characterized, not assumed. State the observed ratio.
3. **NEVER resolve a flake by widening a timeout, adding a retry, or skipping.** Those hide all three causes equally and destroy the signal.
4. **Do not file (c) until (a) and (b) are ruled out with evidence.** Reporting a test-fidelity defect as a product defect burns hours and erodes trust in the suite.
5. **Any resolution restarts the 2-run gate from run 1.** An intermittent test is not verified until it is green twice consecutively without a DB reset.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — scout → investigate → spec-tests → why-review → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec-tests [direction=sync] → docs-update → workflow-end → watzup
> 2. **Execute `/integration-test-verify` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

**Any failures in this run → `/workflow-integration-test-green` is the RECOMMENDED first option** (list it first), because it owns the converge-to-green loop this skill deliberately does not. All green → lead with `/workflow-review-changes` as before.

- **"/workflow-integration-test-green (Recommended when ANY test failed)"** — Drive the whole suite to green: verify → adjudicate the fault → fix at the owning layer → review the fix diff → fresh re-verify, looping until the 2-run gate passes. Omit this option when this run was itself a round of that loop, or when the suite is fully green.
- **"/workflow-review-changes (Recommended when all green)"** — Review all changes before committing
- **"/integration-test-review"** — Review the failing tests only (report-only fault opinion), without entering the convergence loop
- **"/docs-update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.
> **A verify step that does not actually run tests 2 consecutive times is not repeatability verification. It is theater.**
> Read project config FIRST to understand how to run tests for this specific project.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine _who is at fault — the source code or the test code_. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for _intended_ behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure or external state prevents a source/test verdict → preserve diagnostics and stop mutation until the environment is healthy.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and `AskUserQuestion` (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:spec-tests-code-triangulation -->

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior: the governing Feature Spec section(s) (§3 ACs / §4 BRs / §8 TCs), the tests that guard it, and the production code. A missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a [HARD] §4 rule or §5 invariant with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added into §3/§4/§8, and guarded with a test: the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

<!-- /SYNC:spec-tests-code-triangulation -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>     - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>     - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `/spec [mode=update]`, then sync `/spec [mode=tests]` + `/spec [mode=sync]`.
>     - **AMBIGUOUS** — intended behavior is unclear → `AskUserQuestion` (or the canonical spec owner) before editing either side.
>     - **SPEC-SILENT** — the code correctly enforces an invariant/behavior that NO canonical spec artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states → not drift but an UNWRITTEN rule discovered by review. ENRICH the spec via the **Invariant Harvest** pass (`/spec [mode=sync] direction=harvest` → `spec/references/sync.md`): prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, then add the rule to §4 (or §3/§5) AND a §8 TC via `/spec [update]` + `/spec [mode=tests]` and add the guarding test. A discovered invariant left only in code (or only in tests) is INCOMPLETE — this is the highest-value capture (the rule nobody wrote down).
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured (no §4/§8 entry) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the WHOLE system passes — not a hand-picked subset.** `/integration-test-verify` must prove the full relevant suite is green (every test in the system the change can touch), not one cherry-picked test. "All pass" is only true with actual runner output (Passed/Failed/Skipped counts + names) and only after 2 consecutive green runs without a DB reset.
> 2. **Drive state through real use-case paths — NEVER hack seed data.** Set up every precondition exactly as a real user would: real commands, queries, production consumers/messages, or valid idempotent seeders. NEVER create or mutate domain data by direct repository writes — that fabricates states a user could never reach and hides the real workflow bug. Hacking seed data to force a green run is forbidden.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **60-second runtime cap — a slow test is a RED FLAG, not a tuning knob.** Local integration tests run fast. If any single test (or a stalled suite) exceeds ~60s, STOP and treat the slowness itself as a defect signal — deadlock, missing `await`, infinite poll/retry, a real network/external call, or an unbounded query. `/debug-investigate` the cause; NEVER paper over it by raising the timeout or extending the wait.
> 5. **Loop until the whole suite is green.** After fixing the validated root cause, restart the full 2-run verification from run 1. Done means the entire relevant suite passes repeatably — never green-once, never a subset.

<!-- /SYNC:integration-test-execution-discipline -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** _"Can this sequence, timing, and data actually occur in production?"_ If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model real pacing between actor steps.** Two distinct actor actions that production separates by seconds, minutes, or hours MUST NOT be fired back-to-back in the same millisecond. Compressed pacing manufactures races the system was never designed to survive, then reports them as product defects.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.

<!-- /SYNC:real-world-fidelity-testing -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

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
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Prove the reviewed integration tests pass repeatably — 2 consecutive green runs without DB reset, using project-configured run commands — with every pass/fail claim backed by actual test-runner output, never assumption.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift:** On source change, reconcile affected tests vs source-bug from evidence.
- **Spec↔Tests↔Code Triangulation:** judge the WHOLE PACKAGE (spec §3/§4/§8 + tests + code) for mutual consistency; a disagreeing or missing face is a logged finding, NEVER a silent pass.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and harvest unwritten invariants into §4/§8 + a guarding test — NEVER normalize drift to whichever side is green.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; settle barriers on a real observable belong in ARRANGE — NEVER a widened assertion timeout, a blind sleep, or a retry around a failing assertion; distinguish harness-amplified from real before filing a product defect.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases and link parent when nested; one `in_progress`.
- **Task Tracking & External Report:** Bootstrap tracking; persist plan/review findings to `plans/reports/` incrementally.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.
- **Project Reference Docs:** Read required project docs and `lessons.md` before target work; cite them.

**IMPORTANT MUST ATTENTION** read `docs/project-config.json` → `integrationTestVerify` FIRST — project-specific guidance overrides defaults; missing section → Fallback Mode — why: hardcoded assumptions about the runner break on any non-default stack.
**IMPORTANT MUST ATTENTION** use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command — why: this skill is language-agnostic and one repo's runner is another's wrong tool.
**IMPORTANT MUST ATTENTION** read project-specific integration-test reference docs/scripts named by `referenceDocs` before any test command — Codex has no hook injection, so it must open these files directly.
**IMPORTANT MUST ATTENTION** harvest an Environment Precondition Checklist from those docs (Step 1b) BEFORE any command — derive every item from what the doc declares with a `file:line` citation, NEVER from a fixed list and NEVER invented; no declared prerequisites → record that explicitly — why: reading the doc without extracting its preconditions leaves the run just as blind as not reading it.
**IMPORTANT MUST ATTENTION** gate on a healthy system before running — run `systemCheckCommand`, and STOP (point user at `startupScript`) when infrastructure/services aren't ready — why: an unreliable system produces unreliable green/red results that prove nothing.
**IMPORTANT MUST ATTENTION** settle EVERY harvested precondition against real evidence before the first test command — any `UNMET` → STOP, report `ENVIRONMENT-BLOCKED` naming the precondition + its doc line + the setup step, and NEVER run the suite anyway or repair an environment gap by editing tests — why: a half-ready environment reports infrastructure faults as failing tests, which then get "fixed" in the test code.
**IMPORTANT MUST ATTENTION** determine the test-project set BEFORE running — `testProjectPattern` glob > `testProjects` list > git auto-detect — and run only projects the change touches unless the user asks for all — why: running irrelevant suites wastes the gate and muddies the result.
**IMPORTANT MUST ATTENTION** pass requires 2 consecutive green runs of each relevant suite WITHOUT DB reset; any single failure restarts the sequence from run 1 — why: a one-off green run hides order-dependent and state-leak flakiness.
**IMPORTANT MUST ATTENTION** when the set has several independent, per-DB-isolated projects, fan out one `integration-tester` sub-agent per project/balanced group in parallel, barrier on ALL returns, then aggregate into the Step 5 report — each sub-agent owns its full 2-run gate and returns real counts + failing names; suites sharing a DB run sequentially — why: parallel runs over a shared DB cross-contaminate state and silently break the no-reset guarantee.
**IMPORTANT MUST ATTENTION** show actual runner output (Passed/Failed/Skipped counts + failing names) — "all passed" without evidence is theater, not verification — confidence >80% to claim PASS, and that confidence rests on the captured output, never assumption.
**IMPORTANT MUST ATTENTION** on failure, diagnose test-bug vs service-bug at the responsible layer BEFORE any edit — fix the root cause; report service bugs as findings, do NOT silently fix — why: patching the symptom site leaves the real defect live.
**IMPORTANT MUST ATTENTION** the run ended with ANY failing test → RECOMMEND `/workflow-integration-test-green` as the user's next step, listed FIRST in the Next Steps options — it owns the converge-to-green loop (verify → adjudicate → fix → review → fresh re-verify) that this snapshot skill deliberately does not; do NOT recommend it when this run is itself a round of that loop (return counts + failing names to the caller instead) — why: reporting red and stopping leaves the user hand-carrying every failure, while recommending it from inside itself is circular.
**IMPORTANT MUST ATTENTION** on a FAILED TEST, FIRST read the `/integration-test-review` skill protocol (assertion-quality, coverage & spec↔test↔code fault gates) to set investigation/fix direction — decide whether the fault is a source-code root cause or a test-code setup/assertion issue — why: fixing without that verdict patches the wrong side and can green a broken invariant.
**IMPORTANT MUST ATTENTION** on an INTERMITTENT failure (red in one run, green in another) adjudicate the cause BEFORE any change and record the verdict with evidence — (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race; do NOT file (c) until (a) and (b) are ruled out — why: reporting a test-fidelity defect as a product defect burns hours and erodes trust in the suite.
**IMPORTANT MUST ATTENTION** NEVER resolve a flake by widening an assertion timeout, adding a retry around a failing assertion, or skipping the test — repair the SCENARIO (an ARRANGE-phase barrier on a real observable) or the product defect, then restart the 2-run gate from run 1 — why: those three hide all causes equally and destroy the only signal you had.
**IMPORTANT MUST ATTENTION** to make red go green NEVER weaken/remove assertions, add skip annotations, or mutate domain data outside real use-case paths — instead fix the assertion setup or the handler, then re-run the full 2-run sequence — why: a test that no longer protects its invariant is worse than no test.
**IMPORTANT MUST ATTENTION** before authoring or changing any test code, grep 3+ sibling integration tests and follow the local pattern (base fixtures, real DI, no mocks) — cite `file:line` — why: the closest example may not share the same preconditions; verify fit before copying.
**IMPORTANT MUST ATTENTION** bootstrap task tracking before work and mark one task `in_progress` / `completed` at a time; on context loss call `TaskList` first and resume — never blindly duplicate tasks.
**IMPORTANT MUST ATTENTION** resolve and update the active Goal Contract — append per-run pass/fail evidence to the goal file's Iteration Log and matrix; NEVER copy raw sensitive fixture data into goal files.

**Anti-Rationalization:**

| Evasion                                           | Rebuttal                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "One green run is enough"                         | 2 consecutive green runs without DB reset, or it isn't verified. Restart on any red.                                                                      |
| "I'll just hardcode `dotnet test`"                | Read `quickRunCommand` from config — this skill is language-agnostic.                                                                                     |
| "The test asserts too strictly, relax it"         | Fix the code or the setup, never the assertion. Weakened tests protect nothing.                                                                           |
| "It's just flaky, re-run it"                      | Intermittent = unadjudicated. Classify (a) unrealistic scenario, (b) harness amplification, or (c) real product race — with evidence — before any change. |
| "Bump the timeout and move on"                    | Widening a timeout masks all three flake causes. The barrier belongs in ARRANGE, on a real observable.                                                    |
| "Found a race — file it as a product bug"         | Not until (a) and (b) are ruled out. State whether the trigger exists in production and at what likelihood.                                               |
| "Looks like it passed"                            | Show Passed/Failed/Skipped counts from real runner output. No output = no claim.                                                                          |
| "Tests failed — report it and stop"               | Reporting red is half the job. Recommend `/workflow-integration-test-green`; it owns the loop that clears the suite.                                      |
| "System probably ready"                           | Run `systemCheckCommand`. Unhealthy system → STOP, point user at `startupScript`.                                                                         |
| "I read the reference doc, that's the gate"       | Reading is not checking. Harvest the preconditions into a cited checklist and settle every row before the first test command.                             |
| "systemCheckCommand is green, skip the checklist" | It verifies only what the config author encoded. The doc's preconditions are the ones the runner silently assumes — verify each.                          |
| "Env is half-up, run the suite and see"           | A half-ready environment reports infrastructure faults as failing tests. STOP, report ENVIRONMENT-BLOCKED, name the unmet precondition.                   |
| "Too simple to track"                             | Skip depth, never skip task tracking. Wrong assumptions waste more time.                                                                                  |

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — analyze task size first.

---

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably — 2 consecutive green runs, no DB reset, every pass/fail claim backed by actual runner output.
**IMPORTANT MUST ATTENTION** read `integrationTestVerify` config AND the project's integration-test reference docs FIRST, harvest their environment preconditions into a cited checklist, and settle every row before the first test command — use `quickRunCommand` from config, NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** NEVER weaken assertions, add skips, or mutate domain data to force green — fix the root-cause layer (test bug vs service bug) and re-run the full 2-run sequence.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
