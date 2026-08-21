---
name: integration-test-verify-loop
version: 1.0.0
description: "[Testing] Use when you need to drive an integration-test suite to fully green — each round runs /integration-test-verify (whole system by default, or the target named in the prompt), and on ANY failure combines /debug-investigate + /integration-test-review (report-only) to adjudicate the fault (test wrong · test not optimal · source wrong), then /fix to resolve it at the owning layer, then /changes-review on that round's fix diff, then re-runs a FRESH full verify — looping until the whole suite passes its 2-consecutive-green-runs gate with zero failures."
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive an integration-test suite to **fully green** by pairing `/integration-test-verify` with a combined fault-adjudication + `/fix` half in a recursive loop — each round runs a FRESH full `/integration-test-verify` over `{scope}` (**the WHOLE system by default**, or the target named in the prompt), and on ANY failure runs `/debug-investigate` **and** `/integration-test-review` (report-only) together to decide _who is at fault_, then `/fix` at the owning layer — stopping only when a fresh full verify passes its **2-consecutive-green-runs-without-DB-reset** gate with **zero failed tests**, proven by actual runner output.

**Summary:**

- **Each round = verify (find) + adjudicate (diagnose) + `/fix` (resolve) + `/changes-review` (prove the fix is sound).** `/integration-test-verify` reports pass/fail but must not own the fix; the adjudication pair decides _test-wrong vs test-not-optimal vs source-wrong_; `/fix` lands the change; `/changes-review` code-reviews that change before the next round. A round is incomplete until all four have run (or the verify returned zero failures).
- **Steps (in order):** (0) resolve `{scope}` + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop { snapshot → run `/integration-test-verify` INLINE over `{scope}` → **on failure:** `/debug-investigate` + `/integration-test-review` report-only → emit ONE Fault Verdict per failure → `/fix` at the owning layer → **CONDITIONAL `/changes-review` on the round's fix diff when any fix landed** → Round Integrity Check → log iteration } → (2) converge on a zero-failure fresh verify OR escalate → (3) terminal spec/doc sync + recap.
- **Every fix gets code-reviewed in the round that lands it.** Whenever a round applies ANY fix — source, test, scenario, or spec — that round runs `/changes-review` (report-only, INLINE) over the round's fix diff; validated findings fold back into the SAME round's fix set. No fix applied → skipped with a recorded reason. — why: a green test cannot see a wrong-layer fix, a broken invariant elsewhere, or a security/performance regression.
- **Default scope is the WHOLE SYSTEM.** With no target in the prompt, `{scope}` = **every** discovered integration-test project (`testProjectPattern` glob > `testProjects` list) — NOT the git-changed subset. The loop passes `{scope}` to `/integration-test-verify` **explicitly** so it never falls through to its change-scoped default (`integration-test-verify/SKILL.md:132,159`).
- **Convergence:** stop ONLY when a **fresh full** `/integration-test-verify` over the CURRENT (post-fix) code reports **zero failed tests across 2 consecutive runs without a DB reset**, with real runner output — never a stale green predating the last fix.
- **Inline invariant:** run `/integration-test-verify`, `/debug-investigate`, and `/integration-test-review` via the `Skill` tool, NEVER the `Agent` tool. `/debug-investigate` requires its `/why-review` gate **in the same session/main agent** (`debug-investigate/SKILL.md:34`), and `/integration-test-review` self-binds its own fix + re-review obligations — a sub-agent cannot own or carry either back to this loop. Their OWN internal fan-outs (verify's `integration-tester` per-project sub-agents, `integration-test-review`'s phase agents) stay sub-agents by their own design, so context stays bounded.
- **No fake green — Round Integrity Check:** a round converges only if the executed test count did **not shrink** and the skipped count did **not grow** versus the prior round. Deleting, skipping, or narrowing tests is a REGRESSION, never convergence.
- **Bounded:** round cap default 3; failing count not shrinking across 2 rounds, or cap hit with failures still open → **STOP & escalate** via `AskUserQuestion`. Increasing failures → STOP (fixes regressing). Environment/infrastructure fault → **BLOCKED**, escalate immediately — never loop against an unhealthy system.

**Why this skill exists (READ FIRST — it is the whole justification):** the obligation to loop already exists as **prose scattered across three skills**, with no mechanism behind it. `/integration-test-verify` says _"After fixing → re-run the full 2-run verify sequence"_ (`integration-test-verify/SKILL.md:238`) and its `SYNC:integration-test-execution-discipline` §5 says _"Loop until the whole suite is green"_ (`:404`) — but there is **no round cap, no Goal Contract, no shrinking-failures gate, and no escalation path**, so an agent that fixes one test and reports success is not violating anything mechanical. Worse, the fix half is **triple-owned and undefined**: `/integration-test-review` fixes tests and re-reviews itself (P5–P8), `/fix --target=test` runs its own unbounded _"if tests fail, repeat from step 2"_ (`fix/SKILL.md:218`), and verify's own failure protocol says fix-and-re-run (`:232-238`) — three overlapping loops that can double-fix the same failure or each assume another owns it. This skill makes the loop a **bounded, evidence-gated convergence contract with one owner**: verify FINDS, the `/debug-investigate` + `/integration-test-review` pair ADJUDICATES fault, `/fix` RESOLVES, and a fresh full verify RE-PROVES — with a Round Integrity Check so the suite can never go "green" by losing tests. Without it, "tests failed, then something fixed them" ships on a single green run over a hand-picked subset.

**Workflow:** resolve `{scope}` (whole system by default) + Goal Contract → bind the convergence loop → **round loop** { run `/integration-test-verify` INLINE → on failure run `/debug-investigate` + `/integration-test-review` report-only → emit Fault Verdict → `/fix` at owning layer → conditional `/changes-review` on the round's fix diff → Round Integrity Check → log iteration } → converge when a fresh full verify is 2/2 green with zero failures → terminal `/spec [mode=sync]` + `/docs-update` + recap.

**Key Rules:**

- **Each round pairs verify (find) + adjudicate (diagnose) + `/fix` (resolve) + `/changes-review` (review the fix).** Never skip the adjudication half and jump straight to a fix — an unadjudicated failure gets "fixed" by whatever is nearest, which is almost always the assertion.
- **CONDITIONAL `/changes-review` every round that lands a fix.** Working tree changed vs the round's snapshot → run `/changes-review` INLINE, report-only, scoped to the round's fix diff; validate its findings and fold them into the SAME round's fix set; unfixable validated findings → STOP & escalate. Working tree unchanged → skip with a recorded reason. NEVER let a round's fixes reach the next round un-reviewed.
- **Default `{scope}` = the WHOLE system**; a target named in the prompt narrows it. Pass `{scope}` to `/integration-test-verify` EXPLICITLY every round — never let it fall back to git auto-detect.
- **MUST run INLINE via the `Skill` tool — NEVER dispatch `/integration-test-verify`, `/debug-investigate`, `/integration-test-review`, or `/changes-review` as a sub-agent** (their in-session gates are lost). Their internal fan-outs remain sub-agents by their own design.
- **`/integration-test-review` runs REPORT-ONLY.** It performs its 8-gate review and STOPS before its P5 fix / P6 re-review / P7 build-and-run — the loop owns fixing and re-running. If it cannot be constrained and self-fixes anyway, treat that as this round's fix half and skip the `/fix` step for that round — never double-fix.
- **One written Fault Verdict per failure BEFORE any edit** — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — with `file:line` evidence and confidence. `AMBIGUOUS` → `AskUserQuestion`, never a silent pick.
- **NEVER force green.** No weakened or removed assertions, no skip annotations, no widened assertion timeouts, no retries around a failing assertion, no repository-hacked domain data, no narrowed scope. Fix the SCENARIO (an ARRANGE barrier on a real observable) or the product defect.
- **Convergence = a fresh full verify over the post-fix code, 2/2 green, zero failures, real runner output, Round Integrity Check passed.** All five, or it is not converged.
- **Round cap (default 3)**; failures not shrinking across 2 rounds, increasing, or cap hit with failures open → **STOP & escalate** via `AskUserQuestion`. `ENVIRONMENT-BLOCKED` → escalate immediately; never loop against an unhealthy system.

---

## First Principle — Convergence, Not Motion

> A round that changes the code is progress **only if** the next fresh verify has fewer failing tests.
> The loop exists to reach a fixed point (a whole suite that is green twice in a row), not to keep editing until something passes.
> If the failing count stops shrinking, that is a signal to **escalate**, not to spin another round.
> And a suite that got greener by having fewer tests did not converge — it regressed.

---

## Step 0 — Resolve Verification Scope + Goal Contract (FIRST ACTION)

1. **Read `docs/project-config.json` → `integrationTestVerify`** before anything else (the same config `/integration-test-verify` obeys, `integration-test-verify/SKILL.md:74-92`). You need `quickRunCommand`, `testProjectPattern`, `testProjects`, `systemCheckCommand`, `startupScript`, and `referenceDocs` to resolve scope and to read the project's integration-test reference docs.
2. **Resolve `{scope}` — WHOLE SYSTEM by default:**

    | Prompt                               | `{scope}`                                                                                                                                    |
    | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
    | **No target named** (default)        | **Every** integration-test project discoverable via `testProjectPattern` glob > `testProjects` list. The WHOLE system.                       |
    | Names a suite/project/module/feature | Only the test projects covering that target, resolved from the same config; state which projects the target maps to and how you resolved it. |
    | Names a diff/branch/PR               | The test projects covering that change set — this is the ONLY case where change-scoping is correct, and it must be explicit in the prompt.   |

    > **NEVER let `/integration-test-verify` resolve scope by itself.** Its Step 3 priority ends in git auto-detect and _"Only run projects relevant to the current change"_ (`integration-test-verify/SKILL.md:132,159`) — correct when it is a workflow step after an edit, WRONG as this loop's default. Pass `{scope}` explicitly in the invocation every round. — why: a loop that silently verifies only the changed subset reports "all green" for a system it never ran.

3. **Record `{scope}` as a stable string** (the resolved project list). The scope is FIXED for the whole loop — it never narrows as rounds progress. If a fix legitimately ADDS a test project, widen `{scope}` and say so in the Iteration Log; narrowing it is forbidden.
4. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:

    > _A fresh full `/integration-test-verify` over `{scope}` reports **zero failed tests** across **2 consecutive runs without a DB reset**, evidenced by actual test-runner output (Passed/Failed/Skipped counts), with no test deleted, skipped, or weakened to get there._

    Record in **Constraints**: `{scope}` (the project list), the round cap (default 3), the baseline executed/skipped test counts once round 1 reports them, and `quickRunCommand`.

## Step 0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (Steps 1–2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop. This mirrors the project rule that hooks/trackers are accelerators only — correctness must not depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run `/integration-test-verify` INLINE over `{scope}` (passed explicitly, never re-derived). After each run, if ANY test failed, adjudicate every failure with `/debug-investigate` + `/integration-test-review` (report-only) into ONE Fault Verdict, apply the fix via `/fix` at the owning layer, then re-run a FRESH full `/integration-test-verify` over `{scope}`. Do NOT stop while the last verify still reported a failing test. Converge ONLY when a fresh full verify reports zero failures across 2 consecutive runs without a DB reset AND the Round Integrity Check passes (executed test count not shrunk, skipped count not grown). Cap at `{N=5}` rounds; if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures still open, or any failure is ENVIRONMENT-BLOCKED → STOP and escalate via `AskUserQuestion`. Never loop open-ended, and NEVER reach green by weakening, skipping, deleting, or de-scoping a test.

Treat this as a standing obligation you re-read at every Step 2 checkpoint — NOT a one-time note you can rationalize away after the first fix cycle. The Goal Contract's required Success Criterion (Step 0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal integration-test green convergence loop: repeatedly run /integration-test-verify INLINE over {scope} (passed explicitly). If any test failed → adjudicate each failure with /debug-investigate + /integration-test-review (report-only) into one Fault Verdict, fix via /fix at the owning layer, and run another round. If a fresh full verify reports zero failures across 2 consecutive runs without DB reset AND executed test count has not shrunk and skipped count has not grown → CONVERGED, run the terminal /spec [mode=sync] + /docs-update and clear the gate. Do NOT stop while the last verify still reported a failing test. Cap at {N=5} rounds; if the failing count does not shrink across 2 consecutive rounds, failures increase, the cap is hit with failures open, or a failure is ENVIRONMENT-BLOCKED → STOP and escalate via AskUserQuestion. Never loop open-ended; never reach green by weakening, skipping, deleting, or de-scoping a test.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (Steps 1–2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** each inner `/debug-investigate` self-binds its own `/why-review` validation gate that clears when its root cause is validated, and `/integration-test-review` runs REPORT-ONLY so its P5 fix / P6 re-review loop is deferred to this caller — no inner fix gate is installed. THIS outer loop owns the single convergence gate. All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear any of them.

## Step 1 — Round Loop (verify → adjudicate → fix → review → integrity-check → log)

Each round couples four halves — **verify to find, adjudicate to diagnose, fix to resolve, `/changes-review` to prove the fix itself is sound.** For each round `R` (starting at 1), do ALL of:

1. **Snapshot before:** record the working-tree fingerprint — `git status --porcelain` + `git diff --stat`. This is the fixes-applied baseline for the round and the objective backstop for convergence detection (Step 2).
2. **Run `/integration-test-verify` INLINE** via the `Skill` tool (NEVER the `Agent` tool), passing `{scope}` **explicitly** so it skips its own scope derivation. It runs its full contract: system check → the named projects → the **2-consecutive-green-runs-without-DB-reset** gate → a report with real Passed/Failed/Skipped counts and failing test names. Let it fan out its own `integration-tester` sub-agents per isolated project (its design, `integration-test-verify/SKILL.md:188-206`) — that fan-out is bounded and correct. **Tell it explicitly that this run IS a round of this loop**, so it returns its counts + failing names to this loop instead of recommending `/workflow-integration-test-green` as a next step — why: that recommendation is correct for a standalone verify but circular here, and would restart the loop that is already running.
3. **Record the round's counts:** executed, passed, failed, skipped — per project and total, from **actual runner output**. These feed the Round Integrity Check (1.8) and the shrinking-failures gate (Step 2). No output = no counts = no claim.
4. **If failures = 0** and the 2-run gate was green → this round converged; go to Step 2 (no adjudication or fix half needed).
5. **If failures > 0 — ADJUDICATE (the combined half). Run BOTH, INLINE, in this order, per failure or per failure cluster:**

    **(a) `/debug-investigate`** — trace the failure end-to-start to the defect's owning layer, producing a `file:line` root cause with a confidence score, validated through its own `/why-review` gate. It is investigation-ONLY — it never patches (`debug-investigate/SKILL.md:22`).

    **(b) `/integration-test-review` — REPORT-ONLY** — scoped to the failing tests **and the production code they exercise**. Its 8 gates supply the test-side verdict: G1 assertion value (mutation probe), G2 data state, G3 repeatability, G4 domain logic (does the test assert only what the handler writes?), G5 spec traceability, G6 three-way sync, G7 change coverage, G8 scenario fidelity. **Direct it to STOP after its findings report** — no P5 fix, no P6 re-review, no P7 build-and-run; this loop owns fixing and re-running.

    **Combine (a) + (b) into ONE written Fault Verdict per failure, BEFORE any edit:**

    | Verdict                 | Meaning                                                                                                                                                                                                                | Evidence required                                                                                                                                          | Resolution                                                                                                                                                                                                                                                            |
    | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **TEST-WRONG**          | The test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior                                                                                                              | The governing spec (§3 AC / §4 BR / §5 invariant / §8 TC) or the handler source shows the production behavior is correct and the test is not (`file:line`) | Fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout.                                                                                                                                                                                  |
    | **TEST-NOT-OPTIMAL**    | The test is directionally right but mis-specified — unrealistic scenario, compressed actor pacing, blind sleep, missing ARRANGE barrier, shared-state repeatability defect, smoke-only or DI-resolution-only assertion | The failing G3/G8 gate plus the ARRANGE block read as a production trace (`file:line`)                                                                     | Repair the SCENARIO — add an ARRANGE-phase settle barrier polling a real observable, unique data per run, real use-case setup. NEVER a widened assertion timeout or a retry around the assertion.                                                                     |
    | **SOURCE-WRONG**        | Production code violates the spec's intended behavior or a clear invariant                                                                                                                                             | `/debug-investigate`'s traced root cause at the invariant-owning layer (`file:line`, confidence ≥60%)                                                      | Fix the source at the **lowest owning layer** (Entity > Service > Handler), never the crash site. **Keep or strengthen** the test that caught it, and route the changed source into `/changes-review` before declaring PASS (`integration-test-verify/SKILL.md:294`). |
    | **ENVIRONMENT-BLOCKED** | Infrastructure, services, containers, or data fixtures are not ready — the system, not the code, is failing                                                                                                            | The `systemCheckCommand` output or the runner error naming the unavailable dependency                                                                      | **STOP the loop and escalate.** Point the user at `startupScript`. NEVER change a test because the system was down (`integration-test-verify/SKILL.md:296`).                                                                                                          |
    | **AMBIGUOUS**           | Intended behavior is unclear — no spec covers it, the spec is silent, or spec and code disagree with no tiebreaker                                                                                                     | State exactly what is undetermined and which artifacts you checked                                                                                         | **`AskUserQuestion` before editing either side.** NEVER silently pick source or test just to make the suite pass.                                                                                                                                                     |

    **Intermittent failures (red in one run of the 2-run gate, green in the other) use the three-way flake adjudication instead** — (a) unrealistic scenario / compressed pacing, (b) harness topology amplification, (c) genuine product race — per `integration-test-verify/SKILL.md:298-316`. Record the verdict with evidence BEFORE any change; do NOT file (c) until (a) and (b) are ruled out.

6. **Run `/fix` on the adjudicated verdicts** (failures > 0 only) — this is the half the loop owns. Resolve each at its owning layer, routed by verdict: `SOURCE-WRONG` → `/fix` (its `--target` routing) or a direct edit at the lowest invariant-owning layer, then `/prove-fix`; `TEST-WRONG` / `TEST-NOT-OPTIMAL` → repair the test or scenario at its root; a missing §8 TC surfaced by G5/G7 → `/spec [mode=tests]`; a spec divergence → adjudicate per `SYNC:spec-drift-adjudication` (`/spec [update]` for SPEC-STALE, a BLOCKING fix for CODE-WRONG). Fix ONLY adjudicated verdicts — never an unadjudicated guess.

    > **If `/integration-test-review` could not be constrained to report-only and already applied its P5 fixes**, treat those as this round's fix half (detect fixes-applied against the 1.1 snapshot) and SKIP this step for that round — never double-fix the same failure.

7. **CONDITIONAL — run `/changes-review` on the round's fix diff, when (and only when) the round applied ANY fix.** Compare the working tree against the 1.1 snapshot: unchanged → SKIP this sub-step and record `No fix applied this round — /changes-review skipped`. Changed → run it, every round, on every round's fixes.
    - **Scope = the round's fix diff**, not the whole branch: exactly the files this round changed since the 1.1 snapshot (source fixes, test fixes, scenario repairs, spec/TC edits alike). — why: the round's own changes are the only thing the prior rounds' reviews have not already seen.
    - **Run it INLINE via the `Skill` tool, REPORT-ONLY** — its full dimensional review, then STOP before its Phase 7 self-fix / Phase 7.5 holistic / Phase 8 docs-update (the documented `$workflow-review-changes` boundary where the caller owns fixing, `changes-review/SKILL.md:52,204`). NEVER dispatch it as a sub-agent — it self-binds its own review-loop obligations, which a sub-agent cannot own or carry back (`changes-review-loop/SKILL.md:37`). Its own Phase 0.7 dimensional reviewers stay sub-agents by its design.
    - **Validate, then fold the surviving findings into THIS round's fix set** — run `/why-review --validate-findings` over its report and apply every VALIDATED finding at its owning layer, exactly as in 1.6. The next round's fresh full verify is what re-proves them, so the test loop stays the single convergence engine — do NOT open a nested review→fix loop here.
    - **Unfixable validated findings → STOP & escalate** via `AskUserQuestion` (Step 2). A round that leaves a validated review finding open has not finished, even if its tests went green.
    - **This subsumes the `SOURCE-WRONG` per-verdict routing** in 1.5: that verdict already demands the changed source reach `/changes-review` before PASS (`integration-test-verify/SKILL.md:294`). Running it once per round over the whole fix diff satisfies that obligation AND extends it to test-side and spec-side fixes — do not run it twice for the same diff.

    — why: the loop's own convergence signal is "the tests went green", and a fix that greens a test can still be wrong in every way a test cannot see — wrong layer, broken invariant elsewhere, dead code, a leaked domain concept, a security or performance regression. Without a per-round review, every fix this loop lands ships un-code-reviewed on the strength of a green suite alone.

8. **Round Integrity Check (no fake green) — BLOCKING before the round can count as progress.** Compare this round's counts (1.3) against the prior round's:

    | Signal                                     | Meaning                                                                           | Action                                                                                       |
    | ------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
    | Executed test count **decreased**          | Tests were deleted, renamed out of discovery, filtered out, or the scope narrowed | **REGRESSION → STOP & escalate.** Restore the tests. A smaller suite is not a greener suite. |
    | Skipped count **increased**                | A failure was hidden behind a skip annotation                                     | **REGRESSION → STOP & escalate.** Remove the skip and adjudicate the failure properly.       |
    | `{scope}` project list **shrank**          | The loop de-scoped its way to green                                               | **REGRESSION → STOP & escalate.** `{scope}` is fixed (Step 0.3).                             |
    | Counts stable or grown, failures shrinking | Genuine progress                                                                  | Continue to Step 2.                                                                          |

    — why: unlike a review loop, a test loop has a cheap fake exit — remove what fails. This check is the only thing standing between "converged" and "quietly deleted the hard tests".

9. **Append an Iteration Log entry** to the Goal Contract: round number, per-project executed/passed/failed/skipped counts, the failing test names, each Fault Verdict with its `file:line` evidence and confidence, the fixes applied (`file:line`), the `/changes-review` verdict for the round's fix diff (or the explicit skip reason when no fix landed), the Round Integrity Check result, and remaining gaps.

## Step 2 — Convergence & Escalation Gate

Evaluate after every round:

| Condition                                                                                                                                                                                                                       | Action                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh full `/integration-test-verify` over `{scope}` reported **zero failures across 2 consecutive runs without a DB reset**, AND the Round Integrity Check passed, AND the working tree is unchanged by that final verify pass | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix (attaching the runner output) → clear the `/goal` gate → go to Step 3.      |
| Failures > 0 AND round `< N` AND the failing count shrank vs the prior round AND integrity held                                                                                                                                 | Apply the adjudicated fixes (Step 1.6), then run round `R+1` (fresh full re-verify over the SAME `{scope}`).                                                 |
| Failing count did **not shrink** across 2 consecutive rounds (same/increasing count)                                                                                                                                            | **STOP & escalate** via `AskUserQuestion` — a non-converging loop is a signal, not a reason to spin.                                                         |
| Round cap `N` hit with failures still open                                                                                                                                                                                      | **STOP & escalate** via `AskUserQuestion` — report the still-failing tests with their Fault Verdicts; do not silently continue.                              |
| Any failure adjudicated **ENVIRONMENT-BLOCKED**                                                                                                                                                                                 | **STOP & escalate immediately** — mark the criterion BLOCKED with a user-facing reason and point at `startupScript`. Never loop against an unhealthy system. |
| Any failure adjudicated **AMBIGUOUS**                                                                                                                                                                                           | **PAUSE and `AskUserQuestion`** before the fix — resume the loop with the user's answer.                                                                     |
| Round Integrity Check failed (tests lost, skips added, scope narrowed)                                                                                                                                                          | **STOP & escalate** — restore the lost coverage first; this is a regression, not progress.                                                                   |
| The round's `/changes-review` (1.7) left **validated findings unfixed**                                                                                                                                                         | **STOP & escalate** via `AskUserQuestion` — a green suite does not clear an open, validated review finding on the fix that greened it.                       |

> **Increasing failures = STOP.** If round `R` has MORE failing tests than round `R-1`, the fixes are regressing the system — STOP and escalate immediately. Never trade one green test for two new red ones across rounds.

## Step 3 — Terminal Spec/Doc Sync + Recap

1. **Terminal sync (MANDATORY once converged, when running STANDALONE).** The loop deferred all downstream sync while it churned, so close it now, in order:
    - **`/spec [mode=sync]`** — reconcile §8 TCs ↔ the executing test code; update every `CoveredBy` field for tests the loop changed or added.
    - **`/docs-update`** — update impacted docs: the integration-test reference doc, feature-doc evidence fields, and version history if coverage changed materially.

    > **When this skill runs as a step inside a workflow that already declares `/spec [mode=sync]`, `/scan --target=integration-tests`, and `/docs-update`** (e.g. `workflow-integration-test-green`), SKIP this sub-step and let the workflow own it — say so explicitly in the recap. — why: running the same sync twice churns the same files and hides which pass actually made the change.

2. **Recap.** Emit a concise convergence recap: rounds run, the shrinking failing-count sequence, each round's Fault Verdicts and the fixes applied, the final zero-failure runner output (both runs), the Round Integrity Check trail (executed/skipped counts per round), and the Goal Satisfaction matrix (required criterion PASS). Point to each round's report under `plans/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks.

---

## Convergence Detection — Why Five Conditions

A round converges ONLY when **all five** hold. Each closes a distinct way a test loop lies to itself:

1. **Fresh verify over the post-fix code** — a green report from a run that predates the last fix proves nothing about that fix. Every applied fix invalidates the prior verdict; re-run, never reuse.
2. **Zero failed tests** — not "only known failures left", not "the important ones pass". A single red test is an unconverged loop.
3. **2 consecutive green runs without a DB reset** — the gate `/integration-test-verify` already owns (`integration-test-verify/SKILL.md:44,169`). One green run hides order-dependent and state-leak flakiness, which is exactly what a fix cycle tends to introduce.
4. **Real runner output** — Passed/Failed/Skipped counts and names. "Looks like it passed" is theater (`integration-test-verify/SKILL.md:339`).
5. **Round Integrity Check passed** — the executed count did not shrink, the skipped count did not grow, `{scope}` did not narrow. This is the condition the other four cannot see: a suite can satisfy 1–4 perfectly by having quietly lost the tests that failed.

**Working-tree-unchanged backstop:** the converging verify pass must land no fix. A "clean" verdict that still mutated files means the round DID fix things → run another round to re-prove clean.

When failures remain but cannot be fixed (product decision, unclear intent, environment) → **escalate**, do not loop. Convergence is a fixed point, not a single green read.

---

**IMPORTANT MANDATORY sequence:** Step 0 (resolve `{scope}` — WHOLE SYSTEM by default — + Goal Contract) → Step 0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step 1 (round loop: `/integration-test-verify` INLINE → on failure `/debug-investigate` + `/integration-test-review` report-only → ONE Fault Verdict per failure → `/fix` at the owning layer → CONDITIONAL `/changes-review` on the round's fix diff when any fix landed → Round Integrity Check → log) → Step 2 (converge on a zero-failure 2/2-green fresh verify / escalate on non-progress, blocked environment, or lost coverage) → Step 3 (terminal `/spec [mode=sync]` + `/docs-update` when standalone + recap).

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
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

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Drive an integration-test suite to fully green — each round runs a FRESH full `/integration-test-verify` over `{scope}` (WHOLE SYSTEM by default), adjudicates every failure with `/debug-investigate` + `/integration-test-review` (report-only) into ONE Fault Verdict, fixes at the owning layer via `/fix`, and re-verifies — until zero failures across 2 consecutive runs without a DB reset, with no test lost, skipped, or weakened.

**IMPORTANT MUST ATTENTION main steps (in order):** (0) resolve `{scope}` + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop: snapshot → `/integration-test-verify` INLINE → record real counts → on failure `/debug-investigate` + `/integration-test-review` report-only → ONE Fault Verdict per failure → `/fix` at the owning layer → CONDITIONAL `/changes-review` on the round's fix diff when any fix landed → Round Integrity Check → append Iteration Log → (2) converge on a zero-failure 2/2-green fresh verify / escalate on non-progress, blocked environment, or lost coverage → (3) terminal `/spec [mode=sync]` + `/docs-update` (standalone only) + recap.

**IMPORTANT MUST ATTENTION [BLOCKING] plan the detailed todo tasks FIRST — before running the loop.** Before the first round, create a detailed todo-task plan that enumerates every planned step and every planned round; a round MUST NOT start until that round's fresh todo-task plan exists. On EVERY re-run (each new round), REGENERATE a fresh loop todo-task plan — NEVER reuse the prior round's task list — so each round's work is explicitly planned before it executes.

**IMPORTANT MUST ATTENTION** `{scope}` defaults to the **WHOLE SYSTEM** (every test project via `testProjectPattern` > `testProjects`) and is passed to `/integration-test-verify` EXPLICITLY every round — NEVER let it fall through to its change-scoped default or git auto-detect (`integration-test-verify/SKILL.md:132,159`) — why: a loop that silently verifies only the changed subset reports "all green" for a system it never ran.
**IMPORTANT MUST ATTENTION** `{scope}` is FIXED for the whole loop — it may widen when a fix adds a test project, but NEVER narrows. De-scoping to green is a regression, not convergence.
**IMPORTANT MUST ATTENTION** each round pairs verify (find) + adjudicate (diagnose) + `/fix` (resolve) — never jump from a red test straight to an edit; an unadjudicated failure gets "fixed" by whatever is nearest, which is almost always the assertion.
**IMPORTANT MUST ATTENTION** run `/integration-test-verify`, `/debug-investigate`, and `/integration-test-review` **INLINE via the `Skill` tool — NEVER as a sub-agent**: `/debug-investigate` requires its `/why-review` gate in the SAME session/main agent (`debug-investigate/SKILL.md:34`) and `/integration-test-review` self-binds its own fix/re-review obligations. Their OWN internal fan-outs (verify's per-project `integration-tester` agents, review's phase agents) stay sub-agents by their own design.
**IMPORTANT MUST ATTENTION** run `/integration-test-review` in **REPORT-ONLY** mode — its 8 gates produce the test-side verdict, then it STOPS before its P5 fix / P6 re-review / P7 build-and-run; this loop owns fixing and re-running. If it self-fixes anyway, treat that as the round's fix half and SKIP `/fix` for that round — NEVER double-fix.
**IMPORTANT MUST ATTENTION** emit ONE written Fault Verdict per failure BEFORE any edit — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — each with `file:line` evidence and confidence; `AMBIGUOUS` → `AskUserQuestion`, NEVER a silent pick between source and test.
**IMPORTANT MUST ATTENTION** `SOURCE-WRONG` → fix at the LOWEST invariant-owning layer (Entity > Service > Handler), never the crash site; KEEP or STRENGTHEN the test that caught it, and route the changed source into `/changes-review` before declaring PASS (`integration-test-verify/SKILL.md:294`).
**IMPORTANT MUST ATTENTION** `TEST-NOT-OPTIMAL` → repair the SCENARIO with an ARRANGE-phase settle barrier polling a real observable — NEVER a widened assertion timeout, a blind sleep, or a retry wrapped around a failing assertion.
**IMPORTANT MUST ATTENTION** on an INTERMITTENT failure (red in one run of the 2-run gate, green in the other) apply the three-way flake adjudication BEFORE any change — (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification, (c) genuine product race — and do NOT file (c) until (a) and (b) are ruled out with evidence.
**IMPORTANT MUST ATTENTION** run `/changes-review` (INLINE, report-only) on the round's fix diff in EVERY round that applied ANY fix — source, test, scenario, or spec alike; validate its findings and fold them into the SAME round's fix set; unfixable validated findings → STOP & escalate; no fix landed → skip with a recorded reason — why: the loop's only convergence signal is "tests went green", and a green test cannot see a wrong-layer fix, a broken invariant elsewhere, or a security/performance regression, so without this every fix the loop lands would ship un-code-reviewed.
**IMPORTANT MUST ATTENTION** the per-round `/changes-review` SUBSUMES the `SOURCE-WRONG` verdict's own "route the changed source into `/changes-review`" obligation — run it ONCE per round over the whole fix diff, never twice for the same diff, and never open a nested review→fix loop inside a round (the next round's fresh full verify is the re-proof).
**IMPORTANT MUST ATTENTION** the **Round Integrity Check is BLOCKING** — executed test count must NOT decrease, skipped count must NOT increase, `{scope}` must NOT shrink; any of the three → STOP & escalate and restore the coverage — why: unlike a review loop, a test loop has a cheap fake exit — remove what fails.
**IMPORTANT MUST ATTENTION** NEVER force green — no weakened or removed assertions, no skip annotations, no widened timeouts, no repository-hacked domain data, no narrowed scope. Fix the scenario or the product defect, then restart the 2-run gate from run 1.
**IMPORTANT MUST ATTENTION** convergence requires ALL FIVE: a fresh full verify over post-fix code · zero failed tests · 2 consecutive green runs without a DB reset · real runner output (Passed/Failed/Skipped counts + names) · Round Integrity Check passed — plus the working-tree-unchanged backstop on the converging pass.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 3)**; failing count not shrinking across 2 rounds, failures increasing, or cap hit with failures still open → **STOP & escalate** via `AskUserQuestion`. `ENVIRONMENT-BLOCKED` → escalate IMMEDIATELY and point at `startupScript` — never loop against an unhealthy system.
**IMPORTANT MUST ATTENTION** run the terminal `/spec [mode=sync]` + `/docs-update` once converged when STANDALONE; SKIP them when a parent workflow already declares those steps, and say so in the recap. Do NOT commit or push unless the user explicitly asks.
**IMPORTANT MUST ATTENTION** resolve and update the active Goal Contract — append per-round counts, Fault Verdicts, and fix evidence to the Iteration Log and matrix; NEVER copy raw sensitive fixture data into goal files.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Only the changed tests matter"               | `{scope}` defaults to the WHOLE system and is passed explicitly. A subset green is not a suite green.                                                                          |
| "That test was flaky, I skipped it"           | Skipped count increasing is a Round Integrity FAILURE → STOP & escalate. Adjudicate the flake (a)/(b)/(c) instead.                                                             |
| "I deleted the obsolete test, now it's green" | Executed count decreasing is a REGRESSION, not convergence. Restore it and prove obsolescence against the spec first.                                                          |
| "Root cause is obvious, just fix it"          | One written Fault Verdict per failure, with `file:line` evidence, BEFORE any edit. Nearest-attention fixes patch the assertion.                                                |
| "The assertion is too strict"                 | Fix the code or the ARRANGE setup, never the assertion. A test that no longer protects its invariant is worse than no test.                                                    |
| "Bump the timeout, it just needs longer"      | Widening a timeout masks all three flake causes. The barrier belongs in ARRANGE, on a real observable.                                                                         |
| "It passed this time, ship it"                | 2 consecutive green runs without a DB reset, with real runner output, or it isn't verified.                                                                                    |
| "Review already fixed it, and so did /fix"    | Report-only mode means `/fix` owns the fix. If review self-fixed, SKIP `/fix` that round — never double-fix.                                                                   |
| "Tests are green, no need to review the fix"  | Green is exactly the blind spot — it cannot see a wrong-layer fix, a broken invariant elsewhere, or a security/perf regression. Any fix landed → `/changes-review` that round. |
| "I'll code-review everything at the end"      | A deferred review lets round 2 build on round 1's unreviewed fix. Review the fix diff in the round that lands it.                                                              |
| "Round 3 hit, close enough"                   | Cap hit with failures open → STOP & escalate with the still-failing tests and their verdicts. Never silently continue.                                                         |
| "The DB was down, I'll relax the test"        | `ENVIRONMENT-BLOCKED` → escalate and point at `startupScript`. NEVER change a test because the system was down.                                                                |

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — analyze task size first.

---

**IMPORTANT MUST ATTENTION Goal:** A fresh full `/integration-test-verify` over `{scope}` reporting ZERO failures across 2 consecutive runs without a DB reset — with no test deleted, skipped, or weakened to get there.
**IMPORTANT MUST ATTENTION** adjudicate EVERY failure with `/debug-investigate` + `/integration-test-review` (report-only) into ONE Fault Verdict BEFORE any edit — test-wrong vs test-not-optimal vs source-wrong vs environment vs ambiguous.
**IMPORTANT MUST ATTENTION** EVERY round that lands a fix runs `/changes-review` (INLINE, report-only) on that round's fix diff — no fix ever reaches the next round un-code-reviewed.
**IMPORTANT MUST ATTENTION** the Round Integrity Check is BLOCKING and the round cap is 3 — a suite that got greener by losing tests regressed, and a loop that stops shrinking escalates instead of spinning.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
