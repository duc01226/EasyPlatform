# `/integration-test --mode=verify` — integration-test verification reference

> Loaded by `integration-test/SKILL.md`'s Mode Dispatch when invoked as `/integration-test --mode=verify [--fix-loop] <target>`. This contract REPLACES test generation for the invocation: prove reviewed integration tests pass under the project's repeat/isolation policy with real runner evidence. It is the verify step of `workflow-integration-test` (both variants) and every workflow that verifies integration tests. `--fix-loop` (optional) reads `references/fix-loop.md` first.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Contents

- [Quick Summary](#quick-summary)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Step 1: Read Project Config + Reference Docs](#step-1-read-project-config--reference-docs)
- [Step 2: System Check + Environment Precondition Gate](#step-2-system-check--environment-precondition-gate)
- [Step 3: Determine Test Projects](#step-3-determine-test-projects)
- [Step 4: Run Tests](#step-4-run-tests)
- [Step 5: Report Results](#step-5-report-results)
- [Fallback Mode (No Project Config)](#fallback-mode-no-project-config)
- [CI-Style Full Run (Reference)](#ci-style-full-run-reference)
- [On Test Failure Protocol](#on-test-failure-protocol)
- [Mode: `--fix-loop` — Read `references/fix-loop.md` First (BLOCKING)](#mode---fix-loop--read-referencesfix-loopmd-first-blocking)
- [Next Steps](#next-steps)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Prove reviewed integration tests pass under the project's repeat/isolation policy using configured commands and verified preconditions, then report actual runner evidence or an invariant-owner failure verdict.

**Summary:** read-this-if-nothing-else digest —
- **MUST ATTENTION — Contract first:** read `integrationTestVerify` and its docs; derive evidence-backed Unit/Integration/System/E2E applicability, owner/root/data, full/focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, run identity, repeat proof, and supported host/container/environment reach. Unresolved applicable fields block; non-applicable tiers need evidence-backed `N/A`.
- **MUST ATTENTION — Steps 1–2:** harvest documented environment preconditions, persistently repair a required missing Python using **Persistent Python readiness**, then run `systemCheckCommand` and settle every row. Exhausted recovery or another unmet item remains `ENVIRONMENT-BLOCKED`.
- **MUST ATTENTION — Steps 3–4:** discover projects by `testProjectPattern` > `testProjects` > git fallback; run the applicable focused scope, then each relevant full suite under `integrationTestVerify.guidance`. Fan out one `integration-tester` per project/group only with isolated mutable state, wait for all returns before aggregation, and serialize suites that share mutable infrastructure.
- **MUST ATTENTION — Step 5 + failures:** report exact Passed/Failed/Skipped counts, names, exit status, checklist, identity, and Goal Contract evidence; adjudicate before edits, fix test faults at root, report service faults, and recommend `/workflow-integration-test --mode=green` unless this run is already its round.
- **`--fix-loop` (OPTIONAL mode flag — absent by default, and absence changes nothing in this skill):** drives the fixed scope (WHOLE SYSTEM by default) to green in a bounded loop — Goal Contract first, then each round runs this skill's default pass WITHOUT the flag, adjudicates every failure with `/investigate --mode=debug` + report-only `/integration-test --mode=review` into one five-way Fault Verdict, fixes at the invariant-owning component via `/fix`, reviews the fix diff with `/changes-review`, and passes a BLOCKING Round Integrity Check — until `integrationTestVerify.guidance` is satisfied (default: two zero-failure fresh runs without destructive shared-state reset for persistent/shared-state scopes; cap default 3; non-progress, regression, `ENVIRONMENT-BLOCKED`, or `AMBIGUOUS` escalate). **When `--fix-loop` is passed, read `references/fix-loop.md` FIRST (BLOCKING) — see `## Mode: --fix-loop` below.**

**Workflow:**

1. **Read Config + Reference Docs** — Load `docs/project-config.json` → `integrationTestVerify`, read the project's integration-test reference docs, harvest the Environment Precondition Checklist
2. **System Check + Precondition Gate** — Verify the system is healthy AND every harvested precondition is met before running
3. **Determine Test Projects** — Discover via `testProjectPattern` glob, `testProjects` list, or git auto-detect
4. **Run Tests** — Execute `quickRunCommand` on determined projects for the repeat policy declared by `integrationTestVerify.guidance`; when absent, run twice for persistent/shared-state scopes. Fan out parallel `integration-tester` sub-agents only when project boundaries and test-data isolation support it.
5. **Report** — Pass/fail counts, failed test names, mutation-check result (mutants killed n/n per changed core-logic line, or `N/A — reason`), next steps on failure

**Key Rules:**

- MUST read project config `integrationTestVerify` section before doing anything else
- MUST read project-specific reference docs named by `integrationTestVerify.referenceDocs` or the project's integration-test doc path before running tests
- MUST harvest an explicit Environment Precondition Checklist from those docs — derive each item from what the doc declares, NEVER from a fixed list in this skill — and verify every item before the first test command
- Use `quickRunCommand` from config — NEVER hardcode `dotnet test` or any language-specific command
- If system check fails → instruct user how to start system (reference `startupScript` from config)
- Any harvested precondition unmet → STOP, mark ENVIRONMENT-BLOCKED, cite the precondition + its doc line, and point the user at the setup step — NEVER run the suite anyway and NEVER report an environment failure as a failing test
- If config says local infrastructure, databases, services, or full system startup is required, treat that as a blocking prerequisite
- On test failure → diagnose root cause: test bug or service bug. NEVER weaken assertions.
- ANY failing test at the end of the run → recommend `/workflow-integration-test --mode=green` as the next step (it owns the converge-to-green loop); omit that recommendation when this run is itself a round of that loop
- **Verify-last (`SYNC:verify-last-order`):** this is the single verify step of a code-changing task — run once, after the static review, never per phase or per fix. It also owns the mutation check on every changed core-logic line and new rule (project mutation tool when configured, else break the line, run only its covering tests, expect red, restore); a surviving mutant is a missing test — write it and re-run. When its fix loop edits any source or test file, the caller re-runs the static review (`/workflow-review-changes --tests=defer`) before the task is done.
- On an INTERMITTENT failure (red in one run, green in another) → adjudicate the cause first — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, or (c) genuine product race — and record the verdict with evidence BEFORE any change. NEVER resolve a flake by widening a timeout, adding a retry, or skipping
- Verification must satisfy `integrationTestVerify.guidance`; when absent, require two fresh successful runs for each relevant persistent/shared-state suite, preserving its documented cleanup/reset policy
- When many independent, isolated test projects must run, fan out one `integration-tester` sub-agent per project (or balanced group) in parallel to speed it up — barrier on all returns, then aggregate; fall back to sequential when suites share a DB or aren't isolated
- Always report exact failure counts and names — "all passed" requires evidence

**Be skeptical. Apply critical thinking. Every pass/fail claim needs actual test runner output.**

---

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (a guide line in `integration-test/SKILL.md`; a hook delivers its text); its closing digest ends that file.

---

## Step 1: Read Project Config + Reference Docs

Read `docs/project-config.json`; extract `integrationTestVerify`.

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

**Config priority:** `testProjectPattern` (glob) > `testProjects` (explicit list) > git auto-detect.

**Missing `integrationTestVerify`:** use [Fallback Mode](#fallback-mode-no-project-config).

**If present:** display `guidance` verbatim; it contains intentional project instructions.

Read project setup guidance before any system check or test command:

1. Read every file in `integrationTestVerify.referenceDocs`, when present.
2. Otherwise read any integration-test reference path elsewhere in `docs/project-config.json`.
3. If `runScript` or `startupScript` is named, read it as evidence for startup, health checks, arguments, or labels.
4. If no project reference exists, use only explicit config values and tell the user to add `referenceDocs`.

### Step 1b: Harvest the Environment Precondition Checklist (BLOCKING — before any command)

**Extract environment requirements, not just read the reference.** From the docs/scripts, derive every test-run precondition and carry the checklist into Step 2.

**Derive, never enumerate.** Use only what THIS project's docs declare; never apply a fixed stack-specific list. Possible declarations include healthy services/containers; reachable, migrated, seeded DB; broker/queue/cache; env vars, connections, ports, credentials, certificates; required startup/bootstrap; build/restore; per-suite isolation; fixtures; external stubs.

Record before proceeding:

```
### Environment Precondition Checklist (harvested)

| # | Precondition | Declared by (doc:line / script) | How to verify | Status |
|---|--------------|---------------------------------|---------------|--------|
| 1 | {what must be true} | {file:line} | {command / observable} | PENDING |
```

Rules:

- MUST cite `file:line` or script path for every item; no source means assumption, not precondition.
- No reference doc or no declared prerequisite → record `No environment preconditions declared — proceeding on config values only` and name the checked doc. NEVER invent rows — why: fabricated prerequisites block healthy runs and train users to ignore the gate.
- Record unverifiable items as `UNVERIFIABLE` and surface them; a documentation gap is not permission to skip the gate.

---

## Step 2: System Check + Environment Precondition Gate

**Environment readiness (before any test command):** decide from this project, its stack and the OS what the run needs, then check it: free disk on the workspace and temp volumes (`df -h` on macOS/Linux, `Get-PSDrive` on Windows) and available memory (`vm_stat` on macOS, `free -m` on Linux, `Get-CimInstance Win32_OperatingSystem` on Windows) against a floor the project documents, else the last measured run's peak with headroom, else the measured values recorded as evidence; plus the required services, toolchain versions, environment variables, config and ports. On a gap, free only disposable output this step's own earlier runs created and no other run is using, or report `ENVIRONMENT-BLOCKED` with what is missing; never run into it and read the failures as defects. Record the result as a row of the settled checklist (item 5 below).

### Persistent Python readiness

**Required when the resolved runner/tool declares Python.** Repair the machine environment before the readiness checks; installation is preparation, never a test assertion or an assertion retry. Keep one setup record in the run report with OS/architecture, required version, discovery evidence, installer command/exit/log, persistent location, PATH changes and fresh-shell proof.

1. **Discover before installing.** Read the consumer's declared Python version. Probe actual execution, version and `sys.executable`: macOS/Linux `python3`, then `python`; Windows `python`, then literal `py` with `['-3']`. Reject Python 2, inadequate versions and non-executing Store aliases. A compatible runtime means **no install**, even if another command name is absent. Check existing manager installations outside PATH before downloading a duplicate; repair discovery instead.
2. **Provision persistently if absent.** Use the project's supported runtime/bootstrap owner first. Otherwise try one available native manager with a finite outer deadline (default 300 seconds), noninteractive flags and a verified compatible package ID/version. Keep the existing system Python and user data. Never use `sudo`, force an externally managed Python, or retry indefinitely.

   | Environment | Native route when already available and permitted |
   | --- | --- |
   | macOS | Homebrew: `brew install <verified-python-formula>`; derive its installed prefix from `brew --prefix <formula>`, never a hardcoded Intel/Apple Silicon path. |
   | Windows | WinGet: `winget install --exact --id <verified-python-id> --scope user --silent --disable-interactivity --accept-source-agreements --accept-package-agreements`; resolve the installed executable from manager metadata. |
   | Linux | The detected distribution's existing manager (`apt-get`, `dnf`, `apk`, etc.), its verified Python package and noninteractive form, only with existing installation rights; otherwise use the user-local fallback below. |

3. **Persistent user-local fallback.** If the native route is unavailable or fails, reuse an installed `uv`; if absent, obtain its official OS/architecture release or standalone installer following [uv installation](https://docs.astral.sh/uv/getting-started/installation/). Download to run-owned temp storage, inspect the installer and verify published integrity metadata when available, then install to its persistent user location. No Python/pip prerequisite, privilege escalation or permanent execution-policy change. Bound this bootstrap to one attempt, 300 seconds. Then run `uv python install --default <required-version>` once with the same deadline and resolve the actual executable with `uv python find <required-version>`. Follow [Python installation](https://docs.astral.sh/uv/guides/install-python/) for version selection and executable support. Keep Python in the manager's persistent user data directory; never set its installation directory to `tmp/`, a test fixture, an ephemeral virtualenv or this run's disposable root. Do not use `--reinstall`, `--force` or upgrade a working installation. If network, policy, disk, permissions or platform support prevents recovery, record the real diagnostic and remain `ENVIRONMENT-BLOCKED`.
4. **Persist discovery and verify twice.** Use the manager's supported PATH setup (`uv python update-shell` for its executables), preserving existing shell/profile content and Windows user PATH entries. When needed, add only the verified executable directory to this process's PATH so immediate consumers can run; that alone is **not** persistent repair. Start a fresh native login shell on macOS/Linux or a fresh Windows process with reloaded persisted user/system PATH, then execute the consumer's normal Python candidate and version probe without the temporary PATH override. Verify the actual runner's Python-dependent readiness check too. Never claim persistence from an absolute-path-only invocation or a cache flag. Unsupported shell integration stays `ENVIRONMENT-BLOCKED` until discovery is resolved.
5. **Reuse on later invocations.** Begin every run with step 1; when the fresh discovery/version probe passes, bypass all installers. Remove only downloaded run-owned installer files, never the persistent runtime. Declared third-party Python packages remain with their existing dependency owner; runtime provisioning does not authorize installing arbitrary names from import errors.

**Acceptance:** compatible installed Python → zero installer calls; missing runtime → bounded persistent install plus fresh-shell and consumer proof; installed but absent from PATH → repair discovery without reinstall; failed recovery → visible `ENVIRONMENT-BLOCKED`, no suite execution or test weakening. Record Windows/macOS/Linux paths as implemented policy, and name which native environments were actually exercised.

**If config has `systemCheckCommand`:**

Run the system check via Bash:

```bash
{systemCheckCommand}
```

Evaluate output:

- **Healthy** → proceed to the precondition gate.
- **Partially healthy / no containers** → tell the user: > "System not fully ready. To start: run `{startupScript}` (or follow the guidance above). Wait for all services to be healthy, then re-run `/integration-test --mode=verify`."
    > **STOP** — do not run tests against an unhealthy system. Results would be unreliable.

**If absent:**

- If `guidance`, reference docs, `runScript`, or `startupScript` require local infrastructure/services, STOP: config needs a concrete readiness check before AI verification.
- Otherwise proceed to the precondition gate and report that no system check is configured.

### Precondition gate (BLOCKING — every harvested item, evidence-backed)

A green `systemCheckCommand` does NOT discharge Step 1b: it covers only encoded checks; docs contain runner assumptions. Settle every row.

1. **Verify each item with real evidence** — command output, port/process/container check, config/env read, or query. NEVER mark it met because it "should" be up.
2. **Mark each row** `MET` (with the evidence) · `UNMET` (with what is missing) · `UNVERIFIABLE` (no observable exists — surface it).
3. **Any `UNMET` → STOP before the first test command.** Report `ENVIRONMENT-BLOCKED`, name the precondition and declaring `file:line`, and give the concrete setup step (`startupScript`, doc section, or missing env var). NEVER run the suite — why: half-ready infrastructure turns setup faults into test failures.
4. **Never fix an environment gap in tests.** Apply required Python recovery above in the machine environment, then re-probe readiness. If it cannot recover, report the concrete setup action or config gap; do not weaken assertions, add skips, or relax timeouts.
5. **Emit the settled checklist** (rows, statuses, evidence) in the Step 5 report; it proves the run's environment was ready.

All rows `MET` (or the explicit `no preconditions declared` record) → proceed to Step 3.

---

## Step 3: Determine Test Projects

**Priority:** `testProjectPattern` (glob) > `testProjects` (explicit list) > git auto-detect.

**If `testProjectPattern` exists:**

Run a glob search for the pattern:

```bash
# Example (testProjectPattern from project config, e.g. "**/*.IntegrationTests.csproj")
find . -path "{testProjectPattern}" -type f
# or use language-appropriate glob tool
```

Use discovered `.csproj` files (or equivalent); exclude paths outside the pattern scope.

**If no pattern but `testProjects` exists:**

Use the config list.

**If neither exists — auto-detect from git:**

```bash
# Auto-detect changed test projects
git diff --name-only HEAD | grep -i "IntegrationTest" | sed 's|/[^/]*$||' | sort -u
```

If auto-detect finds nothing, ask: "No changed test files detected. Run all test projects or skip?"

**Filter:** Run only projects relevant to the current change, unless the user explicitly asks for all.

### Step 3b: Test Architecture Contract Scope (before Step 4)

Before the first test command, record the applicable tier matrix and required report evidence:

| Tier | Applicability + evidence | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation |
| ---- | ------------------------- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ |
| Unit | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{copy-ready command or N/A + evidence}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` |
| Integration/System | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` |
| E2E | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{configured command or N/A + evidence}` | `{configured command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` |

- Use only commands from `docs/project-config.json`, named reference docs, or existing runner scripts. Missing focused/partial or simple Windows/macOS/Linux command → record `N/A — <evidence>`; do not invent filters, browser stacks, or `.cmd`/`.ps1`/`.sh` wrappers.
- For applicable focused/partial scope, capture exact Passed/Failed/Skipped counts and exit status. Invalid or zero-match selection must fail or follow documented non-green behavior; zero matches never pass.
- Record unique run identity/data suffix, supported public-path setup, realistic data, idempotent count-before-create setup, keyed/additive persistence, and parallel-worker isolation. These supplement—not replace—the environment and real-DI/use-case gates.

---

## Step 4: Run Tests

Run only after Step 2 passes — healthy system and every harvested precondition `MET` — or docs explicitly state no external system is required.

Use configured `quickRunCommand`. Run the applicable focused/partial scope first and record its exact result; it is diagnostic, never a full-scope substitute. Then run each relevant suite/project under `integrationTestVerify.guidance`; absent guidance, repeat persistent/shared-state suites twice without destructive shared-state reset.

**Repeatability gate:** Any failed required run fails verification. Fix the root cause, then restart the configured repeat sequence. A red/green sequence is INTERMITTENT; use [Intermittent (flaky) failure adjudication](#intermittent-flaky-failure-adjudication--verdict-before-any-change) and record the verdict BEFORE changing anything.

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

**Capture every run:** scope, command, exit status, exact Passed/Failed/Skipped counts, and failing names. Configured skip annotations are expected skips, not failures.

### Parallel execution across multiple test projects (sub-agent fan-out)

> **AI agent note:** When Step 3 yields **many independent projects**, NEVER run them one-by-one in the foreground. **Fan out one `integration-tester` sub-agent per project or balanced group in one message**, then advance only after EVERY sub-agent returns (all-return barrier); this reduces wall-clock to the slowest suite.

Apply fan-out only when safe and worthwhile:

- **Threshold:** Skip for 1–2 small projects; use for several projects or any long-running suite.
- **Isolation is mandatory:** Parallel suites MUST NOT share mutable state. Fan out only with per-project isolated DB/schema/container/namespace confirmed by config/docs. Shared DB → run **sequentially**; when unsure, ask or default sequential.
- **Each sub-agent owns its configured gate:** complete the repeat policy in `integrationTestVerify.guidance` (default: two fresh no-reset runs for persistent/shared-state scopes), real counts/names, and evidence.
- **Same discipline:** no weakened assertions, skips, or domain-data hacks; failures use the On Test Failure Protocol.
- **Barrier + aggregate:** wait for all, merge per-project tables into Step 5, and fail overall if any project fails its configured repeat gate.

```
# Conceptual fan-out (one sub-agent per project / balanced group), launched together:
integration-tester → {testProject1}  → configured repeat gate → returns counts + failing names
integration-tester → {testProject2}  → configured repeat gate → returns counts + failing names
integration-tester → {testProject3}  → configured repeat gate → returns counts + failing names
# ... barrier: aggregate all returns into Step 5 report
```

---

## Step 5: Report Results

After all tests complete, emit:

```
### Integration Test Verify Results

**Run command:** {quickRunCommand}
**Projects tested:** {N}
**Focused/partial scope:** {scope and command, exact counts + exit status, or `N/A — evidence`}
**Repeatability gate:** {policy from integrationTestVerify.guidance, or default: two fresh no-reset runs for persistent/shared-state suites}
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
2. Diagnose test bug (wrong setup/assertion) vs service bug (broken handler).
3. Test bug → fix setup/data in the test; NEVER weaken assertions.
4. Service bug → report it; do NOT silently fix it.
5. After any fix → rerun the full configured repeat sequence.
6. **RECOMMEND `/workflow-integration-test --mode=green` whenever this run ends with ANY failure.** This skill reports a snapshot; it does not own convergence. The workflow repeatedly verifies, adjudicates with `/investigate --mode=debug` + `/integration-test --mode=review`, fixes at the invariant-owning component, reviews the fix diff, and runs fresh until the configured repeat policy passes. Surface it in [Next Steps](#next-steps).
   - **EXCEPTION:** when this run IS a round of that loop (a round's default pass inside this skill's `--fix-loop` mode or inside `workflow-integration-test --mode=green`), return counts and failing names instead; recommending the loop inside itself is circular.

**Goal Contract evidence:** Resolve the active Goal Contract (`goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`; plans root default `plans`, with a `docsRoots.plans.path` entry in `docs/project-config.json` winning and `.ck.json` `paths.plans` as the fallback). If present, append command, per-run counts, report path, and mapped success-criteria evidence to its Iteration Log; update Goal Satisfaction rows (`PASS` only when the configured repeat policy is met, `FAIL` with names, `BLOCKED` with user-facing reason). Otherwise record `No active goal — results reported inline only.` NEVER copy raw sensitive fixture data into the goal file.

---

## Fallback Mode (No Project Config)

When `docs/project-config.json` lacks `integrationTestVerify`:

1. Detect project type from root files:
    - `*.sln` or `*.csproj` → `dotnet test`
    - `package.json` → `npm test` or `npx jest`
    - `pytest.ini` / `setup.py` / `pyproject.toml` → `pytest`
    - `go.mod` → `go test ./...`

2. Auto-detect changed test files:

    ```bash
    git diff --name-only HEAD
    ```

3. Run the detected command on changed test projects.

4. Report results and recommend: "Add `integrationTestVerify` to `docs/project-config.json` for project-specific run guidance."

---

## CI-Style Full Run (Reference)

When `runScript` is configured, reference it for the full CI-style run; do not run it directly because OS-specific wrapper scripts (Windows `.cmd`/`.ps1`, macOS/Linux `.sh`) and CI runners require user/pipeline execution:

> "For a full CI-style run including Docker orchestration and health polling, execute: `{runScript}`"

Typical sequence: create networks → remove stale containers → build images → start infrastructure and wait healthy → start APIs and wait healthy → run all tests.

---

> **SDD artifact contract** — Resolve spec/code/test disagreement to canonical intent; classify code-wrong, spec-stale, ambiguous, or spec-silent, and capture unwritten invariants in the spec, TC, and guarding test.
>
> **MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` → Drift Gates before adjudicating spec drift.**

## On Test Failure Protocol

**NEVER** do these to make failures disappear:

- ❌ Remove or weaken assertions
- ❌ Add skip annotations to hide failures
- ❌ Create or mutate domain data through repositories to bypass real use-case paths
- ❌ Mark passing by ignoring error output
- ❌ Report "all passed" without showing actual runner output
- ❌ Widen an assertion timeout, add a retry around a failing assertion, or mark a test flaky-and-skipped to make an intermittent failure go away

**DO** this:

1. Read the failing test method
2. Read the handler/service the test targets
3. Identify: is the assertion wrong, or is the code wrong?
4. Fix at the root cause layer; use real use cases or valid seeded fixtures for data setup
5. Re-run to confirm green
6. **If step 3 found the CODE was wrong (SOURCE-WRONG) and your fix changed production/source code**, route that changed source into a fresh `/changes-review` (or emit a HIGH finding requiring it) BEFORE declaring verification PASS — a source fix that greens a test must not ship un-code-reviewed. (In `workflow-feature`/`workflow-bugfix` the `workflow-review-changes --tests=defer` gate runs BEFORE this verify; a source or test edit made here re-runs that review over the settled tree (`SYNC:verify-last-order` step 5), which covers this route. The route itself matters for standalone runs.)

If the system is unavailable, report `system not ready` and reference `startupScript` / `runScript`. NEVER change the test.

### Intermittent (flaky) failure adjudication — verdict BEFORE any change

**MUST ATTENTION READ `.claude/skills/shared/verify-convergence-loop.md` § 1 whenever a required test is red in one run and green in another.** It holds the three-way verdict table — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, (c) genuine product race — with the evidence each needs. Non-negotiable here: record `Flake verdict: (a) | (b) | (c) — {evidence}` in the Step 5 report BEFORE any edit; reproduce and state the observed ratio; NEVER resolve a flake by widening a timeout, adding a retry, or skipping; Do not file (c) until (a) and (b) are ruled out with evidence; Any resolution restarts the configured repeat gate.

**Verdict first, change second. Reproduce before concluding.** Characterize intermittency by repeating the failing local test under the documented 60s cap; state the observed ratio. The read-first owner and non-negotiable verdict/no-timeout-retry-skip/product-race/repeat-reset rules above govern.

---

## Mode: `--fix-loop` — Read `references/fix-loop.md` First (BLOCKING)

**Trigger:** `/integration-test --mode=verify --fix-loop <target>` (or the `integration-test --mode=verify --fix-loop` step of `workflow-integration-test --mode=green`). Optional. When the flag is present, read `references/fix-loop.md` in full FIRST (BLOCKING) — before Step 1 and before any loop work. It holds the whole mode: FL-0 scope + Goal Contract, FL-0b loop binding, FL-1 round loop, FL-2 convergence gate, FL-3 terminal sync + recap. Without the flag, skip it: Steps 1–5, Fallback Mode, the On Test Failure Protocol, the flake adjudication, and Next Steps run exactly as documented in this file. Each loop round runs this skill's default pass WITHOUT the flag; a sub-agent that receives `--fix-loop` refuses the flag and runs the default pass.

---

## Next Steps

**Inside a workflow** (THIS run is a step of a `[Workflow]` row: its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in `TaskList`, such as an abandoned one, does not count): skip the prompt below — the workflow's own next step is the next action; return the counts, failing names and any Fault Verdicts to it. **Otherwise (standalone, or only an unrelated `[Workflow]` row exists):**

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** after this skill, use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious":

**Any failure → list `/workflow-integration-test --mode=green` first**; it owns the converge-to-green loop this snapshot skill does not. All green → lead with `/workflow-review-changes`.

- **"/workflow-integration-test --mode=green (Recommended when ANY test failed)"** — verify → adjudicate → fix at the owning layer → review the fix diff → fresh re-verify until the 2-run gate passes. Omit when this run was a round of that loop or the suite is fully green.
- **"/workflow-review-changes (Recommended when all green)"** — Review all changes before committing
- **"/integration-test --mode=review"** — Review the failing tests only (report-only fault opinion), without entering the convergence loop
- **"/docs-manager --mode=update"** — Update documentation if test counts changed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.
> **[IMPORTANT]** A verify step without 2 consecutive test runs is not repeatability verification.
> Read project config FIRST for this project's run command.

## Mode protocols

The protocols below are carried in full because only this mode needs them; the protocols shared with test generation are guide lines in `integration-test/SKILL.md`.

<!-- SYNC:environment-fault-hypothesis -->

> **Environment-Fault Hypothesis** — A bug report, failing test, error, crash, or unexpected output is NOT proof of a code defect. The ENVIRONMENT is a first-class competing hypothesis in every debug / investigation / adjudication — weighed from the start, never a fallback reached only after the code looks fine.
>
> 1. **Sweep environment preconditions BEFORE deep tracing** — it is cheap and it reframes everything downstream: toolchain/runtime/SDK version · dependency install state (lockfile drift, partial restore, stale build/cache/generated artifacts) · env vars, secrets, config or profile selection · service dependencies actually up, migrated and seeded (DB, broker, cache, container/compose, external API) · ports, network, proxy, DNS, TLS/cert, system clock · OS/platform, path separators, line endings, locale/timezone · permissions and file locks · leftover state from a prior run (stale processes, containers, volumes, held ports, test data, dirty working tree).
> 2. **Name resource pressure and transience as explicit suspects** — RAM/OOM and swap pressure · CPU saturation or throttling (parallel test workers, noisy neighbour, small CI runner) · disk, inode or temp-dir exhaustion · file-handle and connection-pool limits · network flakiness and rate limits · a timeout that is really slowness. **Tell-tale shape:** non-deterministic · timing-dependent · passes alone but fails in parallel · fails only on one machine or only on CI · the error names resources, not business rules.
> 3. **Discriminate — then cite the discriminator.** Does it reproduce deterministically on a clean environment? Did code on the failing path change since it last passed (`git log` / `git diff` that path)? Does it fail for every machine/actor or exactly one? Does concurrency 1, a clean rebuild, or a fresh container change the result? A verdict without a discriminator you actually ran is a guess — for the environment AND for the code.
> 4. **Report an environment cause AS an environment cause.** Preserve diagnostics (exact command, exit code, full output, resource evidence, timestamps), name the setup/cleanup/provisioning remedy and its owner, and STOP mutating source or tests. NEVER edit product code, weaken an assertion, relax a timeout, or skip a test to absorb an environment fault — that hides the real defect and permanently rots the test.
> 5. **Flaky is a symptom, not a verdict.** A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named. Record it with its evidence; fix the environment or the test seam. Retry-until-green is not a resolution.
>
> **BLOCKED until:** `- [ ]` Precondition sweep done `- [ ]` Resource/transience suspects considered `- [ ]` Discriminator run and cited `- [ ]` Verdict names CODE or ENVIRONMENT with evidence
>
> **NEVER:** Treat "the test failed" as "the code is wrong". Conclude "just flaky" without a mechanism. Absorb an environment fault into source or tests. Chase a code hypothesis while an unchecked environment precondition is still in play.

<!-- /SYNC:environment-fault-hypothesis -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.

**IMPORTANT MUST ATTENTION** record exact scope, commands, exit status, counts, failure names, identity, and repeat proof from real runner output before reporting a verdict.
**IMPORTANT MUST ATTENTION** preserve owned business-outcome assertions and diagnose the responsible layer; never substitute broker, scheduler, or other infrastructure bookkeeping for the system state this suite owns.

**IMPORTANT MUST ATTENTION — Main steps (in order):** (1) read config/reference docs; (2) harvest a cited environment checklist; (3) run system + precondition gates; (4) record the tier matrix and determine touched projects; (5) run focused diagnostics, then two consecutive no-reset full runs; (6) report exact output and Goal Contract evidence; (7) adjudicate failures at the owning layer and route the convergence workflow when needed.

**IMPORTANT MUST ATTENTION — Modes/gates:** missing config → Fallback Mode and root-file runner detection; configured `runScript` → CI-style reference only; standalone failures → recommend `/workflow-integration-test --mode=green` in Next Steps, except when this run is already that loop's round or a `--fix-loop` round. Applicable Unit/Integration/System/E2E/Performance tiers require runner evidence or `N/A`; record copy-ready full/focused commands, zero-match non-green behavior, simple Windows/macOS/Linux and host/container entries when supported, environment reach, identity/data mode, and isolation.

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** without the flag nothing below applies and the default pass is unchanged.

- **MUST ATTENTION** FL-0 first: resolve `{scope}` (WHOLE SYSTEM by default, passed explicitly every round, NEVER shrinks), the Goal Contract with its zero-failure / 2-consecutive-no-reset / no-test-lost criterion, and the testability preflight; FL-0b binds the protocol loop (primary) + optional `/goal` accelerator.
- **MUST ATTENTION** each round runs THIS skill's default pass WITHOUT `--fix-loop` (never a recursive self-invocation with the flag), INLINE in the main session; the round's pass reports counts/names and does not fix or recommend `/workflow-integration-test --mode=green`.
- **MUST ATTENTION** every failure gets ONE written Fault Verdict BEFORE any edit — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — from INLINE `/investigate --mode=debug` + REPORT-ONLY `/integration-test --mode=review` (self-fixed → skip `/fix`, NEVER double-fix); `SOURCE-WRONG` fixes use the lowest invariant-owning layer and keep/strengthen the catching test.
- **MUST ATTENTION** any fix landed → INLINE report-only `/changes-review` over that round's fix diff, validate with `/why-review --validate-findings`, fold validated findings into the same round; an open validated finding blocks convergence.
- **MUST ATTENTION** Round Integrity is BLOCKING: executed count must not decrease, skipped count must not increase, `{scope}` must not shrink — otherwise STOP, escalate, restore coverage.
- **MUST ATTENTION** converge only on ALL FIVE: fresh post-fix full verify · zero failures · 2 consecutive no-reset green runs · real counts/names · integrity pass, plus an unchanged working tree on the converging pass; round cap default 3; non-shrinking failures across 2 rounds, rising failures, cap with open failures, `ENVIRONMENT-BLOCKED`, `AMBIGUOUS`, lost coverage, or open validated review findings → STOP & escalate via `ask user question tool`.
- **MUST ATTENTION** converged standalone → `/spec [mode=sync]` + `/docs-manager --mode=update`; a parent workflow declaring them owns them. Ask the 3 trade-off questions before every fix; a MATERIAL trade-off pauses the loop for user confirmation.

**IMPORTANT MUST ATTENTION — SYNC protocol digest:**

- **MUST ATTENTION — Source/test + spec/test/code drift:** reconcile to canonical intent; classify every disagreement and capture spec-silent invariants with a TC and guarding test — NEVER silently pass a missing or disagreeing face.
- **Real-world fidelity:** use reachable pacing and real ARRANGE observables; NEVER widen assertion timeouts, add assertion retries, blind sleeps, skips, or weaker invariants.
- **AI/task discipline:** use evidence-backed `file:line` claims, root-cause ownership, nested one-`in_progress` tracking, and `lessons.md`/project-reference routing.

**IMPORTANT MUST ATTENTION** read `docs/project-config.json` → `integrationTestVerify` FIRST; missing section → Fallback Mode — why: runner assumptions do not transfer across stacks.
**IMPORTANT MUST ATTENTION** use config `quickRunCommand` — NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** read configured reference docs/scripts before any test command and harvest every declared precondition with `file:line` evidence; NEVER invent rows.
**IMPORTANT MUST ATTENTION** required missing Python on Windows/macOS/Linux → **Persistent Python readiness** before system checks: reuse compatible installs, bound provisioning, persist discovery, and prove it from a fresh shell plus the actual consumer. Temporary PATH alone never proves persistence; exhausted recovery remains `ENVIRONMENT-BLOCKED`.
**IMPORTANT MUST ATTENTION** run `systemCheckCommand`, settle every checklist row with real evidence, and STOP `ENVIRONMENT-BLOCKED` on any unmet row; point to `startupScript` and NEVER repair environment gaps in tests.
**IMPORTANT MUST ATTENTION** determine projects by `testProjectPattern` > `testProjects` > git fallback; run only the touched set unless the user asks for all.
**IMPORTANT MUST ATTENTION** pass requires two consecutive green full runs without DB reset; any failure restarts at run 1. Focused output is diagnostic, never a full-scope substitute.
**IMPORTANT MUST ATTENTION** resolve the full/focused scope before any test command; record exact exit status and documented zero-match behavior.
**IMPORTANT MUST ATTENTION** preserve unique run identity, realistic data, idempotent reference setup, additive state, and isolated mutable roots.
**IMPORTANT MUST ATTENTION** use supported public use-case paths and keep the final business assertion intact; never substitute infrastructure bookkeeping for owned outcome evidence.
**IMPORTANT MUST ATTENTION** fan out only independent projects with confirmed isolated mutable state; shared DBs run sequentially, and the all-return barrier precedes aggregation.
**IMPORTANT MUST ATTENTION** report actual runner output: scope, command, exit status, exact Passed/Failed/Skipped counts, failing names, checklist, identity, and repeat proof.
**IMPORTANT MUST ATTENTION** on failure, FIRST read `/integration-test --mode=review`, diagnose test-vs-service fault; fix test faults at root, report service faults instead of silently fixing them, and NEVER weaken assertions, add skips, or mutate domain data through repositories.
**IMPORTANT MUST ATTENTION** adjudicate intermittent failures before any change as (a) unrealistic pacing, (b) harness amplification, or (c) genuine product race; do NOT file (c) until (a)/(b) are ruled out.
**IMPORTANT MUST ATTENTION** any standalone failure → recommend `/workflow-integration-test --mode=green` first; omit that recommendation inside its own round. Resolve and update the active Goal Contract, and NEVER copy raw sensitive fixture data into it.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| "The test asserts too strictly, relax it"     | Fix the code or the setup, never the assertion. Weakened tests protect nothing.  |
| "It's just flaky, re-run it"                  | Intermittent = unadjudicated. Classify (a) unrealistic scenario, (b) harness amplification, or (c) real product race — with evidence — before any change. |
| "Bump the timeout and move on"                | Widening a timeout masks all three flake causes. The barrier belongs in ARRANGE, on a real observable. |
| "Found a race — file it as a product bug"     | Not until (a) and (b) are ruled out. State whether the trigger exists in production and at what likelihood. |
| "Tests failed — report it and stop"           | Reporting red is half the job. Recommend `/workflow-integration-test --mode=green`; it owns the loop that clears the suite. |
| "`--fix-loop`: review already fixed it, and so did /fix" | Report-only mode means `/fix` owns the fix. If review self-fixed, SKIP `/fix` that round — never double-fix. |
| "`--fix-loop`: tests are green, no need to review the fix" | Green cannot see a wrong-layer fix, a broken invariant elsewhere, or a security/perf regression. Any fix landed → `/changes-review` that round. |

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — analyze task size first.

> **Closing principle — Easy to Change:** judge every test, fix, or abstraction by whether it lowers future change cost; reject added coupling, hidden state, duplicated knowledge, or unclear intent.

---

**IMPORTANT MUST ATTENTION Goal:** Prove reviewed integration tests pass repeatably: run each relevant suite twice without DB reset using configured commands and verified doc-declared preconditions, then report actual runner evidence or an owning-layer failure verdict.
**IMPORTANT MUST ATTENTION** read `integrationTestVerify` config and project reference docs FIRST, harvest cited preconditions, settle every row before the first test command, and use `quickRunCommand` — NEVER hardcode a language-specific runner.
**IMPORTANT MUST ATTENTION** NEVER weaken assertions, add skips, or mutate domain data to force green — fix the root-cause layer and rerun the full 2-run sequence.
**IMPORTANT MUST ATTENTION** `--fix-loop` (optional) = bounded verify → Fault Verdict → owning-layer fix → fix-diff review → integrity check loop over a fixed WHOLE-SYSTEM scope until 2 consecutive zero-failure runs; each round is the default pass WITHOUT the flag, and escalation beats spinning.

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->
