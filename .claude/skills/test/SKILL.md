---
name: test
version: 1.0.0
description: '[Testing] Use when a workflow step or the user asks for a local test run and read-only results summary.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** give the user the TRUE test state — accurate pass/fail verdict, exact counts, failing-test names, report path — without applying any fix.
- **Main steps (run in order):** (1) **Delegate** — launch the `tester` subagent with the test scope from arguments; NEVER invoke test commands directly. (2) **Analyze** — review the subagent's summary report; identify failures and patterns. (3) **Report** — summarize pass/fail counts, highlight failing tests, cite the report path. (4) **Goal evidence** — resolve the active Goal Contract, append verification evidence, update the Goal Satisfaction matrix.
- READ-ONLY: stop at reporting; NEVER start implementing fixes — why: fixing is `/fix`'s job and mixing it into the report hides the true test state.
- After the run, append verification evidence (command, exact counts, report path) to the goal file's Iteration Log and update the Goal Satisfaction matrix; record "No active goal — evidence reported inline only." when none exists; NEVER copy sensitive fixture data into the goal file — why: the goal file is the durable PASS/FAIL ledger, not a secrets store.

**Workflow:**

1. **Delegate** — first check the environment can run the suites (what this project, stack and OS need: free disk, RAM, services, toolchain, config; on a gap report `ENVIRONMENT-BLOCKED` with what is missing, since this read-only skill frees nothing), then launch `tester` subagent with test scope from arguments; run every requested tier unless the caller passed `--proven` evidence (Proven-Tier Evidence below)
2. **Analyze** — Review test results, identify failures and patterns
3. **Report** — Summarize pass/fail counts, highlight failing tests

**Key Rules:**

- READ-ONLY: do not implement fixes, only report results
- Activate relevant skills from catalog during process
- Always use `tester` subagent, not direct test commands
- **Single verify run (`SYNC:verify-last-order`):** in a code-changing task this is the ONE test run, made after the static review — never per phase, per wave or per fix. The mutation check is NOT done here (this skill is read-only): `/integration-test --mode=verify` or the main session (`/plan --mode=execute` Step 4) owns it.
- An INTERMITTENT failure (red in one run, green in another) is NOT yet a product defect — route it through the same adjudication `/integration-test --mode=verify` uses before reporting it as one: (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race. Report the verdict with its evidence, or report the failure as UNADJUDICATED — never as a product defect on the strength of one red run

- **Proven-tier evidence (caller-passed only):** `--proven=<report path>[,<report path>…]` names run reports that already show tiers green on the final tree; only then are those tiers not re-run (see Proven-Tier Evidence). Default and every standalone call: run every requested tier.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Use the `tester` subagent to run tests locally and analyze the summary report.

**IMPORTANT**: Stop at reporting results — do not start implementing.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

**Goal Contract evidence (after test run):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json`). When one exists, append the verification evidence to the goal file's Iteration Log — test command, exact pass/fail counts, report path — mapped to the saved success criteria the run verifies, and update the Goal Satisfaction matrix rows for those criteria (PASS/FAIL/BLOCKED). Record `No active goal — evidence reported inline only.` when none exists. Never copy raw sensitive fixture data into the goal file.

## Contents

- [Quick Summary](#quick-summary)
- [Proven-Tier Evidence (caller-passed)](#proven-tier-evidence-caller-passed)
- [Exact-Result Reporting Contract (Read-Only)](#exact-result-reporting-contract-read-only)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Proven-Tier Evidence (caller-passed)

A workflow or caller that already holds a green run on the final tree passes it explicitly: `--proven=<report path>[,<report path>…]` (for example the `/integration-test --mode=verify` report). A workflow registry passes the symbolic `--proven=@verify`, which names the report of this run's latest `/integration-test --mode=verify` occurrence: resolve it from the run's task evidence; when that step did not run in this run, or its report is missing or stale, `@verify` covers nothing and every requested tier runs. With a report in hand:

- Read each named report; a tier counts as covered only when the report shows its exact command, counts and exit status green for the same scope and no source or test file changed after it (`SYNC:verify-last-order` — an edit after the run invalidates it). A missing, unreadable, red or stale report covers nothing.
- Run the `tester` only for the configured tiers the reports do not cover. Record each covered tier as `covered by <report path> — <command, exact counts>`; report the union of covered and freshly run results.
- Every applicable tier covered → skip the `tester` launch, record `simplified: covered by <report path(s)>` as the evidence, and still complete the Goal Contract evidence step.
- No `--proven` input (the default, and every standalone call) → run every requested tier as usual. Never infer that a tier is proven from context you were not handed.

## Exact-Result Reporting Contract (Read-Only)

The `tester` subagent receives the resolved contract matrix and executes only configured commands; this skill never invents a fallback runner or invokes commands directly.

- Select the configured `fullCommand` or `focusedCommand` for the requested scope and report the command verbatim, scope, and any simple Windows/macOS/Linux entry point used. If the tier has no configured command, report evidence-backed `N/A` or `BLOCKED` rather than substituting another command.
- Return exact `exitStatus`, `discovered`, `passed`, `failed`, and `skipped` counts, failing-test names, `runIdentity`, seed/accumulation mode, and repeat/parallel evidence. For applicable persistent-state integration suites, include two consecutive no-reset full-run results; other suites need one fresh green run.
- A zero-match or invalid selection is non-pass even when no test throws; a non-zero exit is non-pass even when text says all tests passed. Never infer counts from a summary or silently pass an empty filter.
- Remain read-only: do not edit tests or production code, seed or reset data, delete fixtures, or widen retries/timeouts to make a result green.

---

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Next Steps

After reporting, choose the appropriate follow-up from the results and the authorized task: `/fix` for failures after root-cause investigation, `/docs-manager --mode=update` for affected documentation, or `/watzup` for a requested wrap-up. Continue an active workflow at its next required step. Keep this test invocation read-only; execute authorized follow-up work through its owning skill. Ask only for indispensable missing information or action authority not already provided.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

- `domain-entities-reference.md`, in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

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


<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Evidence:** ALWAYS cite `file:line` per claim; NEVER speculate without proof.
- **Source/Test Drift:** when source changes, decide from evidence whether test or source is wrong; NEVER assume.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; distinguish harness-amplified from real before calling an intermittent failure a product defect.

**MANDATORY IMPORTANT MUST ATTENTION** READ-ONLY — run tests, report pass/fail counts + failing-test names + report path; NEVER implement fixes here, stop at reporting — why: fixing is `/fix`'s job; mixing the two hides the true test state.
**MANDATORY IMPORTANT MUST ATTENTION** ALWAYS run tests through the `tester` subagent; NEVER invoke test commands directly — why: the subagent isolates the run and produces the canonical summary report this skill analyzes.
**MANDATORY IMPORTANT MUST ATTENTION** resolve the active Goal Contract after the run; append verification evidence (test command, exact pass/fail counts, report path) to the goal file's Iteration Log and update the Goal Satisfaction matrix; record `No active goal — evidence reported inline only.` when none exists; NEVER copy raw sensitive fixture data into the goal file — why: the goal file is the durable PASS/FAIL ledger, not a secrets store.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim about a failure (confidence >80% to act, <80% verify first); NEVER speculate which test failed or why — read the report — why: a guessed failure verdict sends the user to fix the wrong thing.
**MANDATORY IMPORTANT MUST ATTENTION** an INTERMITTENT failure is UNADJUDICATED, not a product defect — classify it as (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race, with evidence, before reporting it as a defect; report it as UNADJUDICATED when the evidence is not there — why: a test-fidelity defect reported as a product defect sends the team to fix code that was never wrong.
**MANDATORY IMPORTANT MUST ATTENTION** before asserting a test/source relationship, grep 3+ similar tests and match the local pattern; apply the source/test drift check — decide from evidence whether a failing test guards intended behavior or the source is the bug — why: a mismatched assumption mislabels a real bug as a flaky test.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, complete immediately after evidence; add a final review todo to verify work quality.
**IMPORTANT** Apply Next Steps after reporting: select the supported follow-up within existing authority, preserving this invocation's read-only boundary and required workflow gates.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Tests obviously pass, skip the run"          | Run via `tester` anyway — a guessed verdict is not a verdict. Report real counts.             |
| "I can run the test command directly"         | NEVER — always delegate to the `tester` subagent; direct runs bypass the canonical report.    |
| "Failure looks trivial, I'll just fix it"     | Stop at reporting. Fixing is `/fix`'s job; this skill is strictly READ-ONLY.                   |
| "No goal file, skip the evidence step"        | Record `No active goal — evidence reported inline only.` Never silently skip the Goal Contract. |
| "I know which test failed"                    | Show `file:line` + the report path. No proof = no claim.                                       |
| "It failed once — that's a product bug"       | Intermittent = unadjudicated. Rule out unrealistic scenario and harness amplification first, with evidence. |

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**IMPORTANT MUST ATTENTION** READ-ONLY — report pass/fail, NEVER fix here (that is `/fix`'s job).
**IMPORTANT MUST ATTENTION** ALWAYS run via the `tester` subagent; cite `file:line` + report path for every failure claim (confidence >80%).
**IMPORTANT MUST ATTENTION Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->
