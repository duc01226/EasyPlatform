# integration-test --mode=verify — Fix-Loop Mode

> Read by `/integration-test --mode=verify --fix-loop` FIRST, before Step 1 (the `references/mode-verify.md` → **Mode: `--fix-loop`** pointer). Steps 1–5, the On Test Failure Protocol, Next Steps and the `SYNC:*` protocol bodies this mode cites live in `references/mode-verify.md`. Shared loop skeleton (Round Integrity, convergence conditions, escalation, flake adjudication): `.claude/skills/shared/verify-convergence-loop.md` — read it before round 1.

## Contents

- [Mode: `--fix-loop` (OPTIONAL convergence loop — verify · adjudicate · fix · re-verify)](#mode---fix-loop-optional-convergence-loop--verify--adjudicate--fix--re-verify)
- [Fix-Loop Quick Summary](#fix-loop-quick-summary)
- [Fix-Loop First Principle — Convergence, Not Motion](#fix-loop-first-principle--convergence-not-motion)
- [FL-0 — Resolve Verification Scope + Goal Contract (FIRST ACTION in `--fix-loop` mode)](#fl-0--resolve-verification-scope--goal-contract-first-action-in---fix-loop-mode)
- [FL-0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)](#fl-0b--bind-the-convergence-loop-protocol-first-goal-is-an-optional-accelerator)
- [FL-1 — Round Loop (verify → adjudicate → fix → review → integrity-check → log)](#fl-1--round-loop-verify--adjudicate--fix--review--integrity-check--log)
- [FL-2 — Convergence & Escalation Gate](#fl-2--convergence--escalation-gate)
- [FL-3 — Terminal Spec/Doc Sync + Recap](#fl-3--terminal-specdoc-sync--recap)
- [Fix-Loop Convergence Detection — Why Five Conditions](#fix-loop-convergence-detection--why-five-conditions)

<!-- FIX-LOOP-MODE:START -->

## Mode: `--fix-loop` (OPTIONAL convergence loop — verify · adjudicate · fix · re-verify)

> **Activation:** ONLY when the invocation carries `--fix-loop` (e.g. `/integration-test --mode=verify --fix-loop <target>`, or the `integration-test --mode=verify --fix-loop` step of `workflow-integration-test --mode=green`). Without the flag, skip this whole section — Steps 1–5, Fallback Mode, the On Test Failure Protocol, the flake adjudication, and Next Steps behave exactly as documented in `references/mode-verify.md`. With the flag, every default gate still binds on each round's verification pass: config + reference docs, the Environment Precondition Checklist, the system check, the tier matrix, focused diagnostics, and the repeat policy from `integrationTestVerify.guidance`. Next Steps after FL-3 omit `/workflow-integration-test --mode=green`.

### Fix-Loop Quick Summary

**Goal:** Drive the fixed integration-test scope to a truthful, repeatable green result: every fix is adjudicated and reviewed at the invariant-owning component, then fresh full default verification passes over `{scope}` satisfy `integrationTestVerify.guidance` with real counts and preserved coverage.

- **MUST ATTENTION Contract first:** resolve `{scope}` (WHOLE SYSTEM by default; an explicit target/diff may narrow it), the Goal Contract, and the Unit/Integration/System/E2E preflight: applicability, owner/root/data, copy-ready full/focused commands, zero-match behavior, CI/Windows entry, identity, isolation, and repeat proof.
- **MUST ATTENTION Round path:** snapshot → inline default verify pass (Steps 1–5, WITHOUT `--fix-loop`) with explicit `{scope}` → record exact counts → on failure, inline `/investigate --mode=debug` + `/integration-test --mode=review` report-only → one Fault Verdict → owning-layer `/fix` → conditional inline report-only `/changes-review` on the fix diff → Round Integrity Check → Iteration Log.
- **MUST ATTENTION Gates:** use config/reference evidence and valid project data setup; require the configured fresh-run/reset policy (default: two no-reset green runs for persistent/shared-state scopes), real runner output, no executed-test shrink, no skipped-count growth, fixed scope, and a bounded cap (default 3). Intermittent failures use the three-way flake adjudication before any change. Non-progress, regression, blocked environment, ambiguity, or open review findings escalate.
- **MUST ATTENTION Terminal/mode:** the protocol loop is primary; `/goal` is optional. Converged standalone runs do `/spec [mode=sync]` → `/docs-manager --mode=update`; parent workflows own declared `/spec [mode=sync]` + `/docs-manager --mode=update` (its impact map escalates to `/scan --target=integration-tests` when the reference doc needs a rebuild). NEVER force green.

**Why this mode exists (READ FIRST):** the default pass says _"After any fix → rerun the full 2-run sequence"_ (Step 5 → On failure) and `SYNC:integration-test-execution-discipline` §5 says _"Loop until the whole suite is green"_, but neither adds a round cap, Goal Contract, shrinking-failure gate, or escalation path — and the default pass only REPORTS service faults. This mode gives the fix path one owner: `/integration-test --mode=review` supplies one read-only adjudication pass, `/fix --target=test` applies the caller-owned repair, and this outer loop re-runs the fixed scope.

This mode gives the loop one bounded, evidence-gated owner: the default verify pass FINDS, `/investigate --mode=debug` + `/integration-test --mode=review` ADJUDICATE (the review only while a test-side fault stays possible, Step 5), `/fix` RESOLVES, and a fresh full default pass RE-PROVES. Round Integrity rejects lost tests, so "something fixed it" cannot ship on one hand-picked green run.

**Fix-Loop Workflow:** FL-0 resolve `{scope}` + Goal Contract + testability preflight → FL-0b bind the convergence loop → FL-1 repeat { snapshot → default verify pass → exact counts → on failure adjudicate → fix → conditional fix-diff review → integrity check → log } → FL-2 converge on fresh 2/2 zero-failure output → FL-3 terminal spec/doc sync + recap.

**Fix-Loop Key Rules:**

- **MUST ATTENTION NEVER self-invoke with the flag.** Each round's verification is THIS skill's default pass (Steps 1–5) WITHOUT `--fix-loop` — one outer loop, no nesting. Step 4's fan-out `integration-tester` sub-agents receive only the default per-project gate; a sub-agent that receives `--fix-loop` refuses the flag and runs the default pass.
- **MUST ATTENTION Inside a round the default pass REPORTS; it does not fix.** It returns scope, exact counts, and failing names; its Step 5 On-failure fixes and its `/workflow-integration-test --mode=green` recommendation do not fire — that recommendation would restart this loop. Every edit lands through FL-1 steps 5–7.
- **MUST ATTENTION Every round pairs verify → adjudicate → fix → fix-diff review.** Never edit an unadjudicated failure; the nearest fix is usually a bad assertion.
- **MUST ATTENTION Run `/changes-review` INLINE, report-only, on every round's fix diff.** Validate findings and fold them into the same round; unchanged tree → record the skip. Open validated findings block the next round.
- **MUST ATTENTION Default `{scope}` is the WHOLE system.** A named target narrows it; pass `{scope}` explicitly every round, never git auto-detect.
- **MUST ATTENTION Run the default verify pass, `/investigate --mode=debug`, `/integration-test --mode=review`, and `/changes-review` INLINE in the main session (via `Skill`, or Steps 1–5 in this session), NEVER as sub-agents.** Never dispatch this mode itself as a sub-agent. Their internal fan-outs remain their own design.
- **MUST ATTENTION `/integration-test --mode=review` is REPORT-ONLY.** Stop before P5/P6/P7; if it self-fixes, treat that as this round's fix and skip `/fix` to avoid double-fixing.
- **MUST ATTENTION Write one Fault Verdict per failure BEFORE edits:** `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`, with `file:line` evidence and confidence. Ambiguous → `ask user question tool`.
- **MUST ATTENTION NEVER force green.** Preserve assertions; repair ARRANGE on real observables or fix the product defect. No skips, weakened assertions, widened assertion timeouts, retries around failing assertions, repository-hacked data, or narrowed scope.
- **MUST ATTENTION Converge only on fresh full post-fix output:** zero failures in 2/2 no-reset runs, real runner output, integrity pass, and unchanged working tree on the converging verify. Cap default 3; non-progress, rising failures, cap hit, or blocked environment → escalate.
- **MUST ATTENTION [BLOCKING] task plan:** create detailed tasks before round 1 and regenerate a fresh round plan before EVERY re-run; NEVER reuse the prior round's task list.

### Fix-Loop First Principle — Convergence, Not Motion

> A code change is progress **only if** the next fresh verify has fewer failures.
> Reach a fixed point (whole suite green twice), not a merely passing edit.
> Non-shrinking failures → **escalate**; fewer tests → regression, never convergence.

### FL-0 — Resolve Verification Scope + Goal Contract (FIRST ACTION in `--fix-loop` mode)

1. **Read `docs/project-config.json` → `integrationTestVerify`** before other loop work (the same config Step 1 obeys). Extract `quickRunCommand`, `testProjectPattern`, `testProjects`, `systemCheckCommand`, `startupScript`, and `referenceDocs` for scope and reference-doc resolution.
2. **Resolve `{scope}` — WHOLE SYSTEM by default:**

   | Prompt                               | `{scope}`                                                                                                                                    |
   | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
   | **No target named** (default)        | **Every** integration-test project discoverable via `testProjectPattern` glob > `testProjects` list. The WHOLE system.                       |
   | Names a suite/project/module/feature | Only the test projects covering that target, resolved from the same config; state which projects the target maps to and how you resolved it. |
   | Names a diff/branch/PR               | The test projects covering that change set — this is the ONLY case where change-scoping is correct, and it must be explicit in the prompt.   |

   > **NEVER let the default pass resolve scope by itself.** Step 3's priority ends in git auto-detect and its Filter says _"Run only projects relevant to the current change"_ — correct when it is a workflow step after an edit, WRONG as this loop's default. Pass `{scope}` explicitly to every round's pass. — why: a loop that silently verifies only the changed subset reports "all green" for a system it never ran.

3. **Record `{scope}` as a stable project list.** Keep it FIXED across rounds. If a fix legitimately adds a test project, widen it and log why; narrowing is forbidden.
4. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (carried in `references/mode-verify.md`; `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` — plans root default `plans`, a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`; template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:

   > _A fresh full default `/integration-test --mode=verify` pass over `{scope}` reports **zero failed tests** across **2 consecutive runs without a DB reset**, evidenced by actual test-runner output (Passed/Failed/Skipped counts), with no test deleted, skipped, or weakened to get there._

   Record in **Constraints**: `{scope}`, round cap (default 3), baseline executed/skipped counts after round 1, and `quickRunCommand`.

#### Fix-Loop Test Architecture Contract Preflight (before Round 1)

Before round 1, carry the Step 3b tier contract into the loop. Mark Unit, Integration/System, and E2E `APPLICABLE` only with runner/framework/configuration evidence; otherwise record `N/A — <evidence>` and never fabricate a project or command.

| Tier | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation | Simple Windows/macOS/Linux entry point |
| ---- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ | --------------------------- |
| Unit | `{copy-ready command or N/A + evidence}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |
| Integration/System | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |
| E2E | `{configured command or N/A + evidence}` | `{configured command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |

- Use only config/reference/script-backed commands. When focused scope applies, the round's default pass returns exact Passed/Failed/Skipped counts and exit status; invalid or zero-match selection must fail or follow documented non-green behavior and never count as green.
- Preserve supported public-path setup, realistic pacing/barriers, idempotent count-before-create reference data, keyed/additive persistence, and isolated mutable roots every round. Focused output is evidence, not a substitute for fixed full scope.
- Append the matrix, commands/scopes, identity, seed/accumulation mode, exact results, and repeat proof to the Goal Contract Iteration Log; missing evidence blocks convergence.

### FL-0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

Two layers bind the loop. The **protocol loop (FL-1–FL-2) is BINDING** and self-driven on every host, with or without a command or hook. `/goal` is an **OPTIONAL accelerator**, never the primary mechanism; its absence NEVER weakens the loop. Hooks/trackers accelerate only — correctness cannot depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** Do not stop until convergence or bounded escalation. This binds Claude, Codex, and Copilot whether or not `/goal` exists:

> Repeatedly run the default `/integration-test --mode=verify` pass (WITHOUT `--fix-loop`) INLINE over `{scope}` (passed explicitly, never re-derived). After each run, if ANY test failed, adjudicate every failure with `/investigate --mode=debug` + `/integration-test --mode=review` (report-only) into ONE Fault Verdict, apply the fix via `/fix` at the owning layer, then re-run a FRESH full default pass over `{scope}`. Do NOT stop while the last verify still reported a failing test. Converge ONLY when a fresh full verify reports zero failures across 2 consecutive runs without a DB reset AND the Round Integrity Check passes (executed test count not shrunk, skipped count not grown). Cap at `{N=3}` rounds (default 3); if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures still open, or any failure is ENVIRONMENT-BLOCKED → STOP and escalate via `ask user question tool`. Never loop open-ended, and NEVER reach green by weakening, skipping, deleting, or de-scoping a test.

Re-read this obligation at every FL-2 checkpoint; it is not a one-time note. The Goal Contract's required Success Criterion (FL-0) is the durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If permitted and available, ALSO invoke it as a real command with the SAME condition; do not paraphrase it or substitute the Goal Contract, so the session Stop hook can enforce the loop:

```
/goal integration-test green convergence loop: repeatedly run the default /integration-test --mode=verify pass (WITHOUT --fix-loop) INLINE over {scope} (passed explicitly). If any test failed → adjudicate each failure with /investigate --mode=debug + /integration-test --mode=review (report-only) into one Fault Verdict, fix via /fix at the owning layer, and run another round. If a fresh full verify reports zero failures across 2 consecutive runs without DB reset AND executed test count has not shrunk and skipped count has not grown → CONVERGED, run the terminal /spec [mode=sync] + /docs-manager --mode=update and clear the gate. Do NOT stop while the last verify still reported a failing test. Cap at {N=3} rounds (default 3); if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures open, or a failure is ENVIRONMENT-BLOCKED → STOP and escalate via ask user question tool. Never loop open-ended; never reach green by weakening, skipping, deleting, or de-scoping a test.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met; do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot or a Claude run without it): DO NOT error, block, or invent a stand-in gate. Record ONE Goal Contract line — `/goal accelerator unavailable — loop bound by protocol (FL-1–FL-2) + this Goal Contract` — and proceed. The protocol loop plus Goal Contract remain the gate.

> **Nested gates (by design):** `/investigate --mode=debug` self-binds `/why-review`; `/integration-test --mode=review` is a one-pass REPORT-ONLY adjudicator and installs no inner fix or re-review gate. THIS outer loop owns repair and execution convergence; all gates self-clear on satisfaction. Do NOT tell the user to clear them.

### FL-1 — Round Loop (verify → adjudicate → fix → review → integrity-check → log)

Each round has four halves — **verify finds, adjudication diagnoses, fix resolves, `/changes-review` proves the fix.** For round `R` (start at 1), do ALL:

1. **Snapshot before:** record `git status --porcelain` + `git diff --stat`. This fixes-applied baseline also backstops FL-2 convergence detection.
2. **Run the default verify pass INLINE** — Steps 1–5 of this skill in the main session, or `/integration-test --mode=verify {scope}` WITHOUT `--fix-loop` via `Skill` (NEVER `Agent`) — passing `{scope}` **explicitly**. Its contract is system check → named projects → applicable focused/partial scope with exact counts/status → **2-consecutive-green-runs-without-DB-reset** full gate → real Passed/Failed/Skipped counts and failing names. Let it fan out bounded `integration-tester` sub-agents per isolated project (Step 4 → Parallel execution across multiple test projects). Mark this IS a loop round, so it returns counts/names instead of fixing or recommending `/workflow-integration-test --mode=green`; that recommendation would restart this loop.
3. **Record counts:** focused/partial command, scope, status when applicable; per-project and total executed/passed/failed/skipped from **actual runner output**; run identity and seed/accumulation mode. These feed integrity and shrinking-failure gates. No output = no counts = no claim.
4. **If failures = 0** and the 2-run gate was green → this round converged; go to FL-2 (no adjudication or fix half needed).
5. **If failures > 0 — ADJUDICATE.** Run BOTH, INLINE, in this order, per failure or cluster — except that (b) runs only when (a) leaves a test-side fault possible (a provisional `TEST-WRONG` or `TEST-NOT-OPTIMAL`, or an unresolved side). A failure (a) traces to the source with its catching test intact (`SOURCE-WRONG`) is adjudicated by (a), the fix-diff review and the Round Integrity Check; record `(b) skipped — source-side verdict` in the Fault Verdict (same rule as `workflow-integration-test` → `references/variant-green.md`):

   **(a) `/investigate --mode=debug`** — trace end-to-start to the owning layer; produce a confidence-scored `file:line` root cause validated by `/why-review`. Investigation ONLY; never patch (`investigate/references/mode-debug.md:20`).

   **(b) `/integration-test --mode=review` — REPORT-ONLY** — review failing tests **and exercised production code**. Its 8 gates supply the test-side verdict: G1 assertion value/mutation probe, G2 data state, G3 repeatability, G4 domain logic, G5 spec traceability, G6 three-way sync, G7 change coverage, G8 scenario fidelity. **STOP after the one-pass findings report**; this loop owns fixing and re-running.

   **Combine (a) + (b) into ONE written Fault Verdict per failure, BEFORE any edit:**

   | Verdict                 | Meaning                                                                                                                                                                                                                | Evidence required                                                                                                                                          | Resolution                                                                                                                                                                                                                                                            |
   | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **TEST-WRONG**          | The test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior                                                                                                              | The governing spec (§3 AC / §4 BR / §5 invariant / §8 TC) or the handler source shows the production behavior is correct and the test is not (`file:line`) | Fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout.                                                                                                                                                                                  |
   | **TEST-NOT-OPTIMAL**    | The test is directionally right but mis-specified — unrealistic scenario, compressed actor pacing, blind sleep, missing ARRANGE barrier, shared-state repeatability defect, smoke-only or DI-resolution-only assertion | The failing G3/G8 gate plus the ARRANGE block read as a production trace (`file:line`)                                                                     | Repair the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable, unique data per run, real use-case setup. NEVER a widened assertion timeout or a retry around the assertion.                                                                     |
   | **SOURCE-WRONG**        | Production code violates the spec's intended behavior or a clear invariant                                                                                                                                             | `/investigate --mode=debug`'s traced root cause at the invariant-owning layer (`file:line`, confidence ≥60%)                                                      | Fix the source at the **lowest owning layer** (Entity > Service > Handler), never the crash site. **Keep or strengthen** the test that caught it, and route the changed source into `/changes-review` before declaring PASS (On Test Failure Protocol step 6). |
   | **ENVIRONMENT-BLOCKED** | Infrastructure, services, containers, or data fixtures are not ready — the system, not the code, is failing                                                                                                            | The `systemCheckCommand` output or the runner error naming the unavailable dependency                                                                      | **STOP the loop and escalate.** Point the user at `startupScript`. NEVER change a test because the system was down (On Test Failure Protocol).                                                                                                          |
   | **AMBIGUOUS**           | Intended behavior is unclear — no spec covers it, the spec is silent, or spec and code disagree with no tiebreaker                                                                                                     | State exactly what is undetermined and which artifacts you checked                                                                                         | **`ask user question tool` before editing either side.** NEVER silently pick source or test just to make the suite pass.                                                                                                                                                     |

   **Intermittent failures (red in one run of the 2-run gate, green in the other) use the three-way flake adjudication instead** — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, (c) genuine product race — per `.claude/skills/shared/verify-convergence-loop.md` § 1 (Intermittent (flaky) failure adjudication). Record the verdict with evidence BEFORE any change; do NOT file (c) until (a) and (b) are ruled out.

6. **Run `/fix` on adjudicated verdicts** (failures > 0 only). Resolve at the owning layer: `SOURCE-WRONG` → `/fix` (`--target` routing) or lowest invariant-owning layer; `TEST-WRONG`/`TEST-NOT-OPTIMAL` → repair test/scenario at root; missing §8 TC from G5/G7 → `/spec [mode=tests]`; spec divergence → `SYNC:spec-drift-adjudication` (`/spec [update]` for SPEC-STALE, BLOCKING fix for CODE-WRONG). Fix ONLY adjudicated verdicts.

   > **Contract guard:** if `/integration-test --mode=review` changed source or tests, stop with a reviewer-boundary violation. Do not absorb the edit as this round's fix; restore authority by adjudicating the changed candidate before continuing.

7. **CONDITIONAL — run `/changes-review` on the round's fix diff only when ANY fix landed.** Compare the tree with the FL-1.1 snapshot: unchanged → record `No fix applied this round — /changes-review skipped`; changed → run it on every round's fixes.

   - **Scope = exactly this round's changed files**, not the whole branch: source, tests, scenarios, specs/TCs since the FL-1.1 snapshot — why: prior reviews have not seen only these changes.
   - **Run INLINE via `Skill`, REPORT-ONLY**; stop before Phase 7 self-fix, 7.5 holistic, and 8 docs-manager --mode=update (`changes-review` `--report-only` mode ends after Phase 5). NEVER dispatch as a sub-agent; its own Phase 0.7 reviewers remain sub-agents (`changes-review/SKILL.md` Scale Strategy).
   - **Validate, then fold findings into THIS round's fix set:** run `/why-review --validate-findings`; apply every VALIDATED finding at its owning layer. The next fresh full verify re-proves them; do NOT open a nested review→fix loop.
   - **Unfixable validated finding → STOP & escalate** via `ask user question tool` (FL-2); green tests do not close it.
   - This once-per-round diff review subsumes the `SOURCE-WRONG` routing obligation (On Test Failure Protocol step 6) and also covers test/spec fixes.

   — why: green tests cannot see a wrong layer, broken invariant, dead code, leaked domain concept, or security/performance regression.

8. **Round Integrity Check (no fake green) — BLOCKING before the round can count as progress.** Compare this round's counts (FL-1.3) against the prior round's:

   Signals and actions (executed count decreased · skipped count increased · `{scope}` project list shrank → **REGRESSION → STOP & escalate**; counts stable or grown with failures shrinking → continue to FL-2): `.claude/skills/shared/verify-convergence-loop.md` § 2.3 — read it before round 1.

    — why: removing what fails is a cheap fake exit; this check protects coverage.

9. **Append an Iteration Log entry** to the Goal Contract: round; full/focused commands, scopes, and statuses; identity and seed/accumulation mode; per-project counts; failing names; each Fault Verdict with `file:line` evidence/confidence; fixes (`file:line`); `/changes-review` verdict or explicit skip; integrity result; remaining gaps.

### FL-2 — Convergence & Escalation Gate

After every round, apply this gate:

| Condition                                                                                                                                                                                                                       | Action                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh full default verify pass over `{scope}` reported **zero failures across 2 consecutive runs without a DB reset**, AND the Round Integrity Check passed, AND the working tree is unchanged by that final verify pass       | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix (attaching the runner output) → clear the `/goal` gate → go to FL-3.        |
| Failures > 0 AND round `< N` AND the failing count shrank vs the prior round AND integrity held                                                                                                                                 | Apply the adjudicated fixes (FL-1.6), then run round `R+1` (fresh full re-verify over the SAME `{scope}`).                                                   |
| Failing count did **not shrink** across 2 consecutive rounds (same/increasing count)                                                                                                                                            | **STOP & escalate** via `ask user question tool` — a non-converging loop is a signal, not a reason to spin.                                                         |
| Round cap `N` hit with failures still open                                                                                                                                                                                      | **STOP & escalate** via `ask user question tool` — report the still-failing tests with their Fault Verdicts; do not silently continue.                              |
| Any failure adjudicated **ENVIRONMENT-BLOCKED**                                                                                                                                                                                 | **STOP & escalate immediately** — mark the criterion BLOCKED with a user-facing reason and point at `startupScript`. Never loop against an unhealthy system. |
| Any failure adjudicated **AMBIGUOUS**                                                                                                                                                                                           | **PAUSE and `ask user question tool`** before the fix — resume the loop with the user's answer.                                                                     |
| Round Integrity Check failed (tests lost, skips added, scope narrowed)                                                                                                                                                          | **STOP & escalate** — restore the lost coverage first; this is a regression, not progress.                                                                   |
| The round's `/changes-review` (FL-1.7) left **validated findings unfixed**                                                                                                                                                      | **STOP & escalate** via `ask user question tool` — a green suite does not clear an open, validated review finding on the fix that greened it.                       |

> **Increasing failures = STOP.** More failures than round `R-1` means regression; escalate immediately. Never trade one green test for two red ones.

### FL-3 — Terminal Spec/Doc Sync + Recap

1. **Terminal sync (MANDATORY once converged, when STANDALONE).** Run deferred downstream sync in order:
   - **`/spec [mode=sync]`** — reconcile §8 TCs ↔ the executing test code; update every `CoveredBy` field for tests the loop changed or added.
   - **`/docs-manager --mode=update`** — update impacted docs: the integration-test reference doc, feature-doc evidence fields, and version history if coverage changed materially.

    > **When a parent workflow already declares `/spec [mode=sync]` and `/docs-manager --mode=update`** (e.g. `workflow-integration-test --mode=green`), SKIP this sub-step, let the workflow own it, and say so in the recap. — why: duplicate sync churns the same files and obscures ownership.

2. **Recap.** Report rounds, shrinking failure counts, each round's Fault Verdicts/fixes, both final zero-failure outputs, integrity trail (executed/skipped per round), Goal Satisfaction matrix (required criterion PASS), round reports under `tmp/reports/`, and Goal Contract Iteration Log. Do NOT commit or push unless explicitly asked.

### Fix-Loop Convergence Detection — Why Five Conditions

A round converges ONLY when all five conditions in `.claude/skills/shared/verify-convergence-loop.md` § 2.4 hold (fresh verify over post-fix code · zero failed tests · 2 consecutive green runs without a DB reset — the default pass owns this gate (Key Rules; Step 4 two-run idempotency gate) · real runner output · Round Integrity Check passed); each blocks a different false-green path. Working-tree-unchanged backstop: the converging verify pass must land no fix; if it mutates files, run another round.

Unfixable failures (product decision, unclear intent, environment) → **escalate**, do not loop. Convergence is a fixed point, not one green read.

**IMPORTANT MANDATORY `--fix-loop` sequence:** FL-0 (resolve `{scope}` — WHOLE SYSTEM by default — + Goal Contract) → FL-0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → FL-1 (round loop: default verify pass INLINE WITHOUT the flag → on failure `/investigate --mode=debug` + `/integration-test --mode=review` report-only → ONE Fault Verdict per failure → `/fix` at the owning layer → CONDITIONAL `/changes-review` on the round's fix diff when any fix landed → Round Integrity Check → log) → FL-2 (converge on a zero-failure 2/2-green fresh verify / escalate on non-progress, blocked environment, or lost coverage) → FL-3 (terminal `/spec [mode=sync]` + `/docs-manager --mode=update` when standalone + recap). Shared protocols this mode relies on — `SYNC:goal-contract-satisfaction-loop`, `SYNC:test-failure-fault-adjudication`, `SYNC:integration-test-execution-discipline`, `SYNC:real-world-fidelity-testing`, `SYNC:spec-tests-code-triangulation`, `SYNC:spec-drift-adjudication`, `SYNC:source-test-drift-check`, `SYNC:trade-off-interrogation-gate`, `SYNC:test-architecture-execution-contract` — are carried once (guide lines in `integration-test/SKILL.md`, full bodies in `references/mode-verify.md`); never re-copy them into this section.

<!-- FIX-LOOP-MODE:END -->
