---
name: performance-test
version: 1.0.0
description: '[Testing] Use when initializing, writing, reviewing or verifying performance/load/soak/capacity tests. --mode=verify --fix-loop (or --mode=green) diagnoses, fixes and remeasures with performance-review. Static bottleneck audits use performance-review.'
---

## Quick Summary

**Goal:** Build reusable, project-native performance tests and prove useful capacity under explicit data, workload and hardware limits.

**Summary:** Discover the project contract → research/bootstrap if needed → author realistic scenarios → static review/fix (two rounds maximum by default) → return AUTHORED. Only an explicit verification request continues to measurement/report analysis or the bounded green loop. Keep project preferences and honest evidence limits.

**Key Rules:**

- Define the workload/SLO and enforce the resource envelope before measuring; a user count alone proves no capacity.
- Write/init author only: no test execution, service startup, data seeding or smoke/load run. Automatically review/fix the authored artifacts statically, capped at two review rounds by default; offer verification through the host question tool afterward.
- Acceptance uses at least 100k rows per growable table and a 1,000-concurrent-user profile where applicable; smaller smoke runs prove only wiring.
- Green requires correctness, valid offered load, bounded memory/no observed OOM, query/search access-path evidence and recovery. Missing required evidence blocks PASS; preserve targets during repairs.

**Workflow:** Select mode/authority → discover → initialize if needed → author/static review → AUTHORED and optional verification offer; explicit verify/green → measure/analyze → bounded repair when requested → report.

## Contents

- [Quick Summary](#quick-summary)
- [Mode dispatch](#mode-dispatch)
- [Discover the project contract](#discover-the-project-contract)
- [Initialize once and reuse](#initialize-once-and-reuse)
- [Write realistic tests](#write-realistic-tests)
- [Review the test contract](#review-the-test-contract)
- [Verify and drive to green](#verify-and-drive-to-green)
- [Output and completion](#output-and-completion)
- [Optional handoff from system reviews](#optional-handoff-from-system-reviews)
- [Closing Reminders](#closing-reminders)

## Mode dispatch

| Invocation | Outcome | Required reference |
| --- | --- | --- |
| No flag / `--mode=write <scope>` | Write or extend tests; bootstrap missing foundation; auto static review/fix, default maximum two rounds; stop AUTHORED without running tests | Read [harness.md](references/harness.md) for first setup or harness changes, and [quality-gates.md](references/quality-gates.md) before authoring |
| `--mode=init` | Research, install/pin tools and author a reusable harness plus one representative scenario; same two-round static review; runtime validation deferred | Read [harness.md](references/harness.md) and [quality-gates.md](references/quality-gates.md) |
| `--mode=review [--review-only|--fix-loop] <scope>` | Default read-only quality report; optional shared review/fix/re-review loop for the selected test/harness only, without load execution | Read [quality-gates.md](references/quality-gates.md); apply the carried review-policy |
| `--mode=verify <scope>` | Run the full selected performance contract and analyze evidence; no product/test fixes | Read [quality-gates.md](references/quality-gates.md) and [verification.md](references/verification.md) |
| `--mode=verify --fix-loop` / `--mode=green` | Same verification with one bounded fixing owner, performance-review and fresh proof after repairs | Read [quality-gates.md](references/quality-gates.md) and [verification.md](references/verification.md) |

Use the current working project when scope is omitted. Inventory its applicable surfaces; record exclusions before running. A focused run cannot certify whole-system capacity. Reject unknown modes. Keep verification orchestration inline so one owner controls budgets, fixes and final evidence. `--report-only` aliases review-only; review fix-loop is static quality convergence, while verify fix-loop proves runtime performance.

**Execution authority:** Writing, initialization, a static review or a suggested next step never authorizes a test run. Run only for an explicit user request to run/verify/green, including an already-authorized “write and verify” request. Without it, author lifecycle code and validation cases but do not execute them, even as a small smoke/foundation test. Tool availability/version probes and dependency installation are setup, not performance execution; keep install lifecycle hooks from starting tests/services. Review mode remains static and never runs tests. Verification authorization alone does not authorize repairs; those require green/fix-loop.

Read [sources.md](references/sources.md) when selecting tools, interpreting a gate or refreshing external guidance; verify current official documentation for the selected versions. These are starting points, not a universal tool choice.

## Discover the project contract

1. Create tracked tasks for discovery, conditional initialization, cases/harness changes, review, final proof and report. Maintain one active task and persist evidence under project-root `tmp/reports/`. Retain the original goal and requested acceptance scope.
2. Resolve optional project config, configured reference roots, docs index, lessons and overlays. **MUST READ** the selected `performance-test-reference.md` before planning, writing, reviewing, running or fixing performance tests; follow a relocated owner selected by project references. Read matching code, integration/E2E and seed conventions for the files/boundaries actually used. Missing config is supported: inspect manifests, scripts, CI and neighboring tests. Missing selected reference routes to its init/scan owner before relying on it.
3. Inspect at least three relevant existing patterns when available: test runner/lifecycle, data setup and monitoring/reporting. Cite `file:line`; record absent patterns rather than inventing a base class, database, container or service. Reuse existing performance tooling unless evidence justifies changing it.
4. Map API/search/query/command paths, jobs/queues, realtime connections, CLI/batch/library and frontend journeys that exist. Trace runtime entry points, data owners, predicates, result bounds and dependency calls; include authorization, cache hits/misses and async completion. Record unexercised paths as gaps, not successful tests.
5. Save the workload and evidence contract described in the gates: numerical budgets, data shape/volume, resource allocation, offered load, duration/repeats, observability and stop conditions. Use existing SLOs; if absent, author clearly provisional targets with rationale. A provisional local benchmark cannot claim an accepted production SLA. Preserve native case identities/carriers where present; do not create a duplicate spec registry.

## Initialize once and reuse

First authoring with no usable harness must complete [harness.md](references/harness.md) before adding a suite of scenarios. Ask a `researcher` agent to compare current stack-compatible tools against the actual project manifests, protocols and local/CI constraints. Give it read-only scope and a report path; inspect its cited primary sources and recommendation. If the host has no subagent capability, perform the same research inline and disclose that limitation.

Choose a maintained runner and the smallest required telemetry/profiling stack. Install/pin dependencies through the project owner; create reusable clients, authenticated actors, fixtures/seeders, workload profiles, assertions, collectors and reporting. Do not add an HTTP load generator to a library-only project or thousands of browser processes to test server concurrency.

Author a documented, platform-neutral one-command local run that provisions/checks prerequisites, starts isolated dependencies and the release build, seeds data, confirms enforced limits, runs selected profiles, evaluates gates, writes reports and tears down only owned resources. Use the project's runtime; Node is an example, not a new dependency requirement. Author success/failure validation cases now; execute them and label the command runtime-verified only after explicit verify authorization.

Persist project-specific commands, helpers, policies and extension conventions in the performance-test reference, linked from the docs index. Keep numeric budgets in one executable owner and reference them from prose. Future scenarios should add a case/profile and reuse the harness.

## Write realistic tests

Apply [quality-gates.md](references/quality-gates.md) before setup and assertions. Organize by the project's actual modules/journeys. Each scenario names its protected outcome, workload/data preconditions, numerical budget, observable failure and case identity where available.

- Cover smoke, expected-load, stress/breakpoint, spike, endurance, data growth and post-overload recovery where applicable; distinguish acceptance from deliberate beyond-capacity experiments.
- Use real production entry paths, release settings and relevant authentication, read/write mix, payloads, user pacing and data skew. Validate response semantics and committed/consumed outcomes; fast errors, empty responses and dropped work are not throughput.
- Use an isolated synthetic dataset with at least `max(100000, documented target-volume)` rows in **every growable table/collection**, preserving relational cardinality and realistic row widths. Enumerate the whole schema and justify bounded lookup/system-table exceptions. For systems without such storage, declare N/A with evidence and use representative files/events/objects instead.
- Test selective and broad/empty searches, tenant skew, pagination extremes, joins, updates/deletes, exports/imports and cache churn that the system supports. Capture actual query/search plans and memory growth on adverse paths, not only a fast primary-key read.
- Use bounded setup batches, client concurrency, response consumption and evidence retention. Ensure both seeders and generators fit their own budgets; avoid loading the entire large fixture per virtual user.
- Implement pass/fail thresholds, correctness checks, zero-match detection, evidence completeness and nonzero failure exit in the shared evaluator. A report/dashboard alone is insufficient.

## Review the test contract

Review each applicable gate serially. Trace source + expected behavior + executor/assertions, data manifest and resource/telemetry setup. A green runner with missing query or memory proof fails the evidence gate.

For a static review, judge whether the authored mechanisms and scenarios enforce every applicable gate; mark runtime observations NOT RUN without inventing them or demanding an unauthorized run. Missing enforcement/coverage is a static finding; missing execution evidence prevents capacity PASS but does not by itself prevent complete authoring.

Statically inspect whether the harness and authored validation cases detect a deliberately broken budget or omitted telemetry. Keep thresholds intact; review cleanup, cancellation and stale-report handling. Executing even stub-based harness tests belongs to an explicitly requested verification step.

For production bottleneck analysis use `/performance-review --report-only --loop-owner=caller` with the complete selected system paths and observed reports. The caller owns merged findings, repairs, round limits and runtime proof. A static review cannot substitute for a load run, and a clean load run cannot substitute for access-path/memory review.

**Automatic post-write review:** write/init own a static fix loop with a default ceiling of **two review rounds**, including every reviewer pass. Review the entire authored test/harness scope, validate findings before repairs, fix authorized test/setup issues, and freshly review the settled scope; never repair product bottlenecks or execute tests here. The author performs round 1. Use a fresh read-only `performance-tester` for round 2 when an independent pass or post-fix review is required; it runs `--mode=review --report-only --loop-owner=caller` and returns findings without another loop or delegation. Give exact scope, contract and report path; embed the complete shared reviewer template at dispatch. If that role is unavailable use `performance-optimizer` for test concerns or `code-reviewer` for general correctness; disclose unavailable independence. At the cap retain open blockers, report NEEDS_WORK, and ask before a bounded extension. A fix after the last pass cannot count as reviewed. Explicit standalone review/fix-loop keeps the shared review-policy default; the two-round cap belongs to post-authoring review.

`performance-tester` also handles delegated write/update work under this skill; one author owns the post-write loop. Read-only/caller-owned occurrences return to their coordinator without spawning, fixing or asking. Green repairs receive a fresh static review before runtime proof under the caller's remaining budget.

## Verify and drive to green

Enter only on explicit execution authorization; follow [verification.md](references/verification.md). Preflight hardware, disk, toolchain, target identity, fixture ownership and collector capability before each run. Collect resource/lifecycle evidence from startup and seeding through drain; verify services/limits before load and preserve evidence after exit/cancellation.

Verify mode runs and analyzes without product/test edits. Green mode permits scoped repairs: measure → classify → `/investigate --mode=debug` → validate performance findings → fix at the owning layer → sync affected cases/docs → review → rerun the full acceptance scope with unchanged targets. Invoke performance-review in report-only caller-owned mode; preserve its applicable findings-validation gates. Never recursively start another green loop.

Default cap: **three measured rounds**; repetitions inside a round are declared in the contract. Stop earlier on unsafe target, ambiguous intent, environmental failure or two consecutive rounds without progress. At the cap return unresolved evidence; ask before any bounded extension. Do not shrink data/load, raise memory/CPU, remove cases/index evidence, relax budgets or suppress OOM to manufacture green.

## Output and completion

Return status `AUTHORED`, `NEEDS_WORK`, `PASS`, `FAIL`, `ENVIRONMENT-BLOCKED` or `INCONCLUSIVE`, scope, command, report paths, gate outcomes, changes and gaps. For write/init report static verdict/rounds and **runtime NOT RUN**; show the next command as prospective. AUTHORED means complete authoring with a clean required static review, never measured capacity. If blockers remain use NEEDS_WORK. For executed work, read the machine-readable result **and** underlying failed/required artifacts before concluding.

After a successful write/init, if verification is not already authorized, optionally use the host question tool: “Performance tests are written and statically reviewed. Run verification now?” with “Keep authored; run later” and “Run verify”. Wait for an explicit affirmative before running; silence/timeout is not consent. A delegated leaf returns the offer to its parent. A user who already asked for write+verify needs no second question; complete static review before the authorized run.

Use the report/scaling contract in [verification.md](references/verification.md). Only claim capacity demonstrated by repeated valid runs on the recorded hardware/data/workload. Report observed absence of OOM within that envelope; no finite test proves every workload safe. Initialization, smoke-only runs and static review never earn a system-capacity PASS.

**Compatibility:** Intended for Claude Code, Codex and OpenCode with shell/browser capabilities appropriate to the target. Record actual host/model/runner versions in evaluation evidence; unavailable model/OS trials remain NOT RUN. This skill generates a project-specific harness; it does not ship an executable load runner for every stack.

## Optional handoff from system reviews

At the end of `performance-review` or `production-readiness-review`, when the report identifies missing performance regression/capacity evidence, the interactive owner may give a scoped hint: “Use `/performance-test --mode=write <scope>` to add repeatable workload, query and memory checks.” This is optional after delivering the review, and never changes its verdict. When useful, offer through the host question tool: “Write performance tests for these paths?” with “Keep report only” and “Write tests only”. Only an explicit affirmative starts authoring, with its static review; it never authorizes execution. Existing user authorization persists. Report-only/caller-owned/sub-agent occurrences return the hint in their report without asking or starting another skill. No routine question is required.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**Goal:** Build reusable, project-native performance tests and prove useful capacity under explicit data, workload and hardware limits.

Define demand/SLO and hardware limits. Discover → research/init → author → static review/fix (default two rounds) → AUTHORED/runtime NOT RUN → optional question-tool offer. Only explicit verify/green authorization continues to measure/read evidence → bounded diagnose/fix/performance-review/retest when requested → report. Keep one fixing owner and unchanged targets. Review mode defaults read-only and static; never run tests from write/init/review. Prove applicable 100k-table/1,000-user profiles, query/search paths, bounded memory/no observed OOM and recovery only with runtime evidence.

| Evasion | Required action |
| --- | --- |
| “The runner was green” | Read correctness, delivered-load, query-plan, memory and recovery evidence before PASS. |
| “Use a smaller dataset or bigger container” | Retain the acceptance envelope; label alternative experiments separately. |
| “An index exists; 1,000 VUs are configured” | Prove the access path and achieved useful demand at the declared volume. |

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->




<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
