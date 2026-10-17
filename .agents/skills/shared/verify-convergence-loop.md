# Verify Convergence Loop — shared contract

Single owner of two rules used by the verify family: `integration-test --mode=verify` (default pass + `--fix-loop`) and `e2e-test --mode=verify --fix-loop`. Each skill keeps only its tier-specific deltas (scope resolution, data/DB rules, browser/visual bring-up, exact commands) and reads this file where its `MUST ATTENTION READ` line says to. Plain reference file, not a `SYNC` block: nothing to propagate, edit it here.

## 1. Intermittent (flaky) failure adjudication — verdict BEFORE any change

Applies when a required test is red in one run and green in another (integration or E2E). A test that fails on one required run and passes another has NOT identified the cause. **Emit an evidence-backed written verdict BEFORE editing tests, production code, or timeouts.** An unadjudicated flake gets fixed at the nearest site, usually the assertion.

**Classify exactly one cause:**

| Verdict | What it means | Evidence required to claim it | Resolution |
| --- | --- | --- | --- |
| **(a) Unrealistic scenario / compressed pacing** | The test drives a sequence, timing, or data state production could never reach — most often distinct actor actions fired back-to-back that real usage separates by seconds, minutes, or hours, letting an in-flight async message land out of order | Read the ARRANGE block as a production trace; cite the chained actor actions (`file:line`) and state what separates them in real usage | Fix the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable of the prior step. NEVER a widened assertion timeout |
| **(b) Harness topology amplification** | The trigger is real but the LOCAL topology makes a rare production race routine — shared infrastructure, fan-out consumers over a shared parent, parallel suite execution, cold starts, or a resource-starved runner | Name the amplifying topology and cite it (config, fixture, suite settings, another test sharing the data); state whether the trigger exists in production and at what likelihood | Isolate the test's data/topology, or record the amplification explicitly. Report the production likelihood alongside — an amplified race may still be a real one |
| **(c) Genuine product race** | The production code itself has an ordering, concurrency, or idempotency defect that a realistic scenario can hit | Trace the failure end-to-start to the defective production path (`file:line`); show the realistic sequence that reaches it | Report it as a product defect and fix at the owning layer per the fault-adjudication protocol; keep or strengthen the test that caught it |

**Rules:**

1. **Verdict first, change second.** Record `Flake verdict: (a) | (b) | (c) — {evidence}` in the run report before any edit. "Probably flaky" is not a verdict.
2. **Reproduce before concluding.** Re-run only the failing test repeatedly (within the runner's per-test time cap) so the intermittency is characterized, not assumed. State the observed ratio.
3. **NEVER resolve a flake by widening a timeout, adding a retry, or skipping.** Those hide all three causes equally and destroy the signal.
4. **Do not file (c) until (a) and (b) are ruled out with evidence.** Reporting a test-fidelity defect as a product defect burns hours and erodes trust in the suite.
5. **Any resolution restarts the configured repeat gate.** An intermittent test is not verified until it satisfies the repeat policy after the fix.

## 2. Convergence-loop skeleton

A loop skill owns ONE bounded loop over a FIXED scope: verify → adjudicate → fix → review the fix → integrity-check → log → fresh re-verify.

### 2.1 Principle — convergence, not motion

A change is progress **only if** the next fresh verify has fewer failures. Reach a fixed point (the required number of consecutive fresh greens), not a merely passing edit. Non-shrinking failures → **escalate**; fewer tests → regression, never convergence.

### 2.2 Loop contract (every loop skill)

- **Scope is fixed and explicit.** Record `{scope}` once as a stable list, pass it explicitly to every round's verify pass (never re-derive it from the diff), widen it only with a logged reason, never narrow it.
- **Goal Contract first.** Resolve or create it per the Goal Contract protocol. When the loop runs as a step of an active workflow run, including a workflow nested under a parent, reuse that run's Goal Contract and record the loop's criterion in it instead of creating a second contract (`$start-workflow` → Workflow-step mode); a standalone loop creates its own. The loop's single required criterion is a fresh full verify over `{scope}` with zero failed tests across the required consecutive fresh runs (2 without a reset for integration tests; 1 for every other suite, E2E included, unless the project configures more), real runner output, and no test deleted, skipped, weakened, or de-scoped to get there. Record round cap (default 3) and baseline executed/skipped counts.
- **Protocol loop is primary, `/goal` is an optional accelerator.** The loop binds on every host with or without the command; if `/goal` is unavailable, record one Goal Contract line `/goal accelerator unavailable — loop bound by protocol` and proceed.
- **Each round runs the skill's DEFAULT pass, never the flag.** No self-invocation with `--fix-loop`; one outer loop, no nesting. The round's default pass reports; every edit lands through the round's fix step.
- **One written Fault Verdict per failure BEFORE any edit** (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`, per the fault-adjudication protocol), with `file:line` evidence and confidence. `AMBIGUOUS` → `ask user question tool`; `ENVIRONMENT-BLOCKED` → stop and escalate.
- **Fresh task plan per round.** Regenerate the round's task list before every re-run; never reuse the prior round's.
- **Never force green.** No skips, weakened assertions, widened assertion timeouts, retries around a failing assertion, repository-hacked data, hidden logs, or narrowed scope.

### 2.3 Round Integrity Check (no fake green) — BLOCKING before a round counts as progress

Compare this round's counts against the prior round's:

| Signal | Meaning | Action |
| --- | --- | --- |
| Executed test/scenario count **decreased** | Tests were deleted, renamed out of discovery, filtered out, or the scope narrowed | **REGRESSION → STOP & escalate.** Restore them. A smaller suite is not a greener suite. |
| Skipped count **increased** | A failure was hidden behind a skip annotation | **REGRESSION → STOP & escalate.** Remove the skip and adjudicate the failure. |
| `{scope}` project/surface list **shrank** | The loop de-scoped its way to green | **REGRESSION → STOP & escalate.** `{scope}` is fixed. |
| Counts stable or grown, failures shrinking | Genuine progress | Continue to the convergence gate. |

Tier deltas add their own rows (E2E: hidden runtime logs, removed screenshot states/viewports, unwired capture triggers, disabled evidence collection). — why: removing what fails is a cheap fake exit; this check protects coverage.

### 2.4 Convergence — all five conditions

A round converges ONLY when all five hold; each blocks a different false-green path:

1. **Fresh verify over post-fix code** — a pre-fix green proves nothing; every fix invalidates the prior verdict.
2. **Zero failed tests** — one red test means unconverged; "known failures" do not count.
3. **Required consecutive green runs without a destructive reset** — 2 for integration tests, where one run hides order/state flakiness; 1 for every other suite, E2E included, unless the project configures more (`e2eTesting.execution.convergence.consecutiveGreen`).
4. **Real runner output** — Passed/Failed/Skipped counts and names; "looks like it passed" is theater.
5. **Round Integrity Check passed** — executed count not shrunk, skipped count not grown, `{scope}` not narrowed.

**Working-tree-unchanged backstop:** the converging verify pass must land no fix. If it mutates files, the round DID fix things; run another round.

### 2.5 Escalation — STOP and `ask user question tool`, never spin

- Failing count did not shrink across 2 consecutive rounds, or failures increased (more failures than round `R-1` is regression).
- Round cap hit with failures still open: report the still-failing tests with their Fault Verdicts.
- Any failure `ENVIRONMENT-BLOCKED`: stop immediately, point at the setup step, never loop against an unhealthy system.
- Any failure `AMBIGUOUS`: pause and ask before editing either side.
- Round Integrity Check failed.
- A validated review finding on the round's fix diff left unfixed: a green suite does not clear it.
