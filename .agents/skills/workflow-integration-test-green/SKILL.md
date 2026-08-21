---
name: workflow-integration-test-green
description: "[Workflow] Use when activating the Integration Test Green workflow — drive an integration-test suite to fully green with a bounded convergence loop: verify the whole system (or the named target), adjudicate every failure with /debug-investigate + /integration-test-review before any edit, fix at the owning layer, /changes-review each round's fix diff, re-verify from scratch, then sync spec TCs, the integration-test reference doc, and feature docs."
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

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** [Workflow] Trigger the Integration Test Green workflow — run the WHOLE integration-test suite (or the named target), adjudicate every failure into a written Fault Verdict before any edit, fix at the owning layer, loop until a fresh full verify is green twice in a row with zero failures, then leave the spec TCs, the integration-test reference doc, and the feature docs in sync with the suite that actually exists.

**When to use:** "make all integration tests pass", "fix the failing integration tests", "the suite is red after my change", "loop until all integration tests are green", "diagnose this flaky integration test". For AUTHORING new tests from specs use `$workflow-write-integration-test`; this workflow is for driving an EXISTING suite to green.

**Workflow:**

1. **Detect** — resolve the verification scope: the WHOLE system by default, or the target named in the prompt.
2. **Converge** — loop verify → adjudicate → fix → review the fix → re-verify until zero failures across 2 consecutive runs, bounded by a round cap and a Round Integrity Check.
3. **Sync** — reconcile spec TCs, the integration-test reference doc, and impacted feature docs with the final suite.

**Key Rules:**

- MUST ATTENTION default the verification scope to the **WHOLE SYSTEM** — every integration-test project via `testProjectPattern` > `testProjects` — and pass it EXPLICITLY to `$integration-test-verify`; never fall through to its change-scoped git auto-detect default.
- MUST ATTENTION adjudicate EVERY failure with `$debug-investigate` + `$integration-test-review` (report-only) into ONE written Fault Verdict — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — with `file:line` evidence, BEFORE any edit.
- MUST ATTENTION fix at the lowest invariant-owning layer (Entity > Service > Handler), never the crash site; a `SOURCE-WRONG` fix KEEPS or STRENGTHENS the test that caught it.
- MUST ATTENTION run `$changes-review` (INLINE, report-only) on the fix diff of EVERY loop round that landed a fix, folding its validated findings back into that same round — no fix reaches the next round un-code-reviewed.
- MUST ATTENTION back every pass/fail claim with actual test-runner output (Passed/Failed/Skipped counts + failing names) — "all passed" without output is theater.
- MUST ATTENTION treat a shrinking executed-test count, a growing skipped count, or a narrowed scope as a REGRESSION → STOP and escalate; a suite that got greener by losing tests did not converge.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution (the Goal Contract is set FIRST) and loop until observable verification passes.
- MUST ATTENTION require integration tests to protect a named business rule/invariant and fail if that intent breaks.
- MUST ATTENTION arrange integration-test data through real use cases or valid seeded fixtures; never create impossible state through repository hacks.
- MUST ATTENTION verify integration suites with 2 consecutive passing runs without DB reset before declaring done.
- NEVER force green by weakening or removing assertions, adding skip annotations, widening assertion timeouts, wrapping a retry around a failing assertion, or narrowing the scope.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** $scout -> $integration-test-verify-loop -> $debug-investigate [on-failure] -> $fix [on-failure] -> $spec [mode=sync] -> $scan --target=integration-tests -> $docs-update -> $workflow-end -> $watzup

> **[BLOCKING] Step 0 — CREATE THE FULL TASK LIST BEFORE ANY VERIFICATION WORK.** Call the current task list first (resume, never duplicate), then task tracking EVERY task below in one pass — before `$scout`, before the first test run. A workflow that starts verifying with an empty task list has already lost the ability to show where it is, and an interrupted run cannot be resumed. — why: this loop can span many rounds and a context compaction mid-round; the task list is the only state that survives it.
>
> **Fixed tasks — created 1:1 from the canonical `sequence` in `.claude/workflows.json`, in order:**
>
> 1. `[1] scout — resolve verification scope to a concrete project/suite list`
> 2. `[2] integration-test-verify-loop — drive the suite to green (parent of the per-round tasks)`
> 3. `[3] debug-investigate [on-failure] — traced root cause behind every Fault Verdict` _(CONDITIONAL)_
> 4. `[4] fix [on-failure] — resolve every verdict at the owning layer` _(CONDITIONAL)_
> 5. `[5] spec [mode=sync] — reconcile §8 TCs with the executing tests`
> 6. `[6] scan --target=integration-tests — regenerate the integration-test reference doc`
> 7. `[7] docs-update — update every other impacted doc`
> 8. `[8] workflow-end — close workflow state`
> 9. `[9] watzup — summarize the convergence trail`
> 10. `[10] final review — verify work quality + extract lessons` _(not a sequence step — the standing close-out task)_
>
> **`[3]` and `[4]` are ROLL-UPS, not separate invocations.** They appear in the canonical sequence so the conditional fix half is visible in the task list from the start, but `$integration-test-verify-loop` is their single executing owner: each firing happens INSIDE a round as `[2.N.2]` / `[2.N.5]` below. Complete `[3]`/`[4]` once the loop converges, summarizing which rounds fired them — or, if no round ever failed, complete them with the reason recorded (`no failure in any round`). NEVER run them a second time at workflow level after the loop returns — that would be a parallel fix loop the Inline Execution Gate forbids.
>
> **Per-round tasks (created when EACH round opens — round N is not planned until round N-1 reported):**
>
> - `[2.N.1] verify — full run over {scope}, capture real counts` _(always)_
> - `[2.N.2] debug-investigate — trace root cause of each failure` _(CONDITIONAL: only if round N reported failures — the round-N instance of `[3]`)_
> - `[2.N.3] integration-test-review — report-only fault gates` _(CONDITIONAL: same trigger)_
> - `[2.N.4] fault verdict — one written verdict per failure` _(CONDITIONAL: same trigger)_
> - `[2.N.5] fix — resolve at the owning layer` _(CONDITIONAL: same trigger — the round-N instance of `[4]`)_
> - `[2.N.6] changes-review — review this round's fix diff` _(CONDITIONAL: only if a fix landed)_
> - `[2.N.7] round integrity check — counts not shrunk, scope not narrowed` _(always)_
>
> A conditional task whose trigger never fires is marked **completed with the reason recorded** (`no failures this round`), NEVER silently dropped — why: a skipped-and-unrecorded gate is indistinguishable from a forgotten one when someone audits the run later.

> **[BLOCKING]** Each step MUST ATTENTION invoke its skill invocation — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Adjudicate-Before-Fix Gate:** inside `$integration-test-verify-loop`, no edit may land before that failure has a written Fault Verdict backed by `$debug-investigate`'s traced root cause AND `$integration-test-review`'s gate findings. An unadjudicated failure gets "fixed" by whatever is nearest — which is almost always the assertion, and a weakened assertion protects nothing.

> **[CRITICAL] Per-Round Review Gate:** the loop's only convergence signal is "the tests went green" — and a green test cannot see a fix made at the wrong layer, an invariant broken elsewhere, dead code, a leaked domain concept, or a security/performance regression. So EVERY round that lands a fix must run `$changes-review` (INLINE, report-only) over that round's fix diff, validate its findings, and resolve them in the SAME round. A round that leaves a validated review finding open has not finished, even if its tests are green. This subsumes the `SOURCE-WRONG` verdict's own changes-review obligation — once per round over the whole fix diff, never twice, and never as a nested review→fix loop.

> **[CRITICAL] Inline Execution Gate:** `$integration-test-verify-loop` and the skills it drives (`$integration-test-verify`, `$debug-investigate`, `$integration-test-review`, `$changes-review`) run **INLINE via the skill invocation — NEVER as sub-agents**. `$debug-investigate` requires its `$why-review` gate in the SAME session/main agent, and `$integration-test-review` self-binds its own fix + re-review obligations; a sub-agent cannot own either or carry it back to the loop. Their OWN internal fan-outs (verify's per-project `integration-tester` agents, review's phase agents) remain sub-agents by their own design, so context stays bounded.

> **[CRITICAL] Documentation Sync Is Part Of Done:** the loop deliberately defers ALL doc work while it churns, so steps 3–5 are not an optional tail. `$spec [mode=sync]` reconciles §8 TCs ↔ the executing test code, `$scan --target=integration-tests` regenerates the integration-test reference doc from the suite as it now stands, and `$docs-update` catches every other impacted doc. A converged-but-undocumented suite leaves the next agent reading a reference doc describing tests that no longer exist.

> **Goal Contract propagation (workflow-owned):** At workflow start — BEFORE round 1 — resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the request). Its single required Success Criterion: _a fresh full `$integration-test-verify` over the resolved scope reports ZERO failed tests across 2 consecutive runs without a DB reset, with no test deleted, skipped, or weakened to get there._ Record the scope string, the round cap (default 3), and the baseline executed/skipped counts in **Constraints**. After every round, append the per-project counts, Fault Verdicts, and fixes to the Iteration Log; emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `$workflow-end`.

Activate the `workflow-integration-test-green` workflow. Run `$start-workflow workflow-integration-test-green` with the user's prompt as context.

**Steps:** $scout → $integration-test-verify-loop → $debug-investigate [on-failure] → $fix [on-failure] → $spec [mode=sync] → $scan --target=integration-tests → $docs-update → $workflow-end → $watzup

> **[CRITICAL] Recursive Until Green — the loop is the workflow, not a step inside it.** Step 2 does NOT run once. It RECURSES: run the full suite → if ANY test fails, adjudicate and fix that failure → run the FULL suite again from scratch → repeat. The workflow is finished only when a fresh full run reports **zero failures twice consecutively** with no test deleted, skipped, or weakened. Reporting failures and stopping is NOT an outcome this workflow permits — either it converges, or it **bounded-escalates** by asking the user directly (round cap 3 · failures not shrinking across 2 rounds · failures increasing · coverage lost · an open validated review finding · `ENVIRONMENT-BLOCKED`). — why: "the tests fail" is a status, not a deliverable; the caller asked for a green suite, and a workflow that hands back a red one has done the diagnosis and skipped the job.
>
> **`$debug-investigate` and `$fix` are CONDITIONAL steps of the loop, executed INSIDE `$integration-test-verify-loop`.** They fire on every round that reports a failure and are skipped (with a recorded reason) on a round that is already green. They are tracked as their own tasks per round (Step 0) so they are visible in the task list, but `$integration-test-verify-loop` remains their single executing owner — NEVER invoke them as a second, parallel fix loop at workflow level. — why: the fix half was previously triple-owned across three skills, which let two loops double-fix one failure or each assume the other owned it; one owner with visible sub-tasks keeps both the accountability and the visibility.
>
> **Step 2 RECURSES:** `$integration-test-verify` → _(on failure)_ `$debug-investigate` → `$integration-test-review` → Fault Verdict → `$fix` → `$changes-review` → fresh full re-verify — repeating until the suite is green twice consecutively. Steps 3 and 4 of the sequence are the workflow-level roll-ups of that conditional half; `$integration-test-verify-loop` executes them inside each round, never again after it returns.

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`$scout`** — Resolve the verification scope to a concrete test-project list. No target in the prompt → the WHOLE system (every project via `testProjectPattern` > `testProjects` from `docs/project-config.json` → `integrationTestVerify`). A named suite/module/feature/diff narrows it — state how the target maps to projects. Output: the fixed scope string the loop will reuse every round.
> **`$integration-test-verify-loop`** — The convergence engine, and the only step that changes code. Sets the Goal Contract first, then loops: `$integration-test-verify` INLINE over the fixed scope (2 consecutive green runs, no DB reset, real counts) → on ANY failure run `$debug-investigate` + `$integration-test-review` (report-only) → ONE Fault Verdict per failure → `$fix` at the owning layer → **conditional `$changes-review`** (INLINE, report-only, over the round's fix diff — runs in EVERY round that landed a fix; validated findings fold back into that same round's fix set) → **Round Integrity Check** (executed count must not shrink, skipped count must not grow, scope must not narrow) → fresh full re-verify. Round cap 3; not shrinking across 2 rounds, increasing failures, cap hit with failures open, lost coverage, an open validated review finding, or `ENVIRONMENT-BLOCKED` → STOP and escalate by asking the user directly. Output: zero-failure runner evidence for both runs + the per-round verdict/fix/review trail.
> **`$debug-investigate`** _(CONDITIONAL — only on a round with failures)_ — Trace each failure end-to-start to its root cause BEFORE any edit; produces the traced cause that the Fault Verdict rests on. Skipped on a green round, with the skip recorded.
> **`$fix`** _(CONDITIONAL — only on a round with an adjudicated failure)_ — Resolve the verdict at the lowest invariant-owning layer (Entity > Service > Handler), never the crash site. A `SOURCE-WRONG` fix KEEPS or STRENGTHENS the test that caught it. NEVER runs before a written Fault Verdict exists for that failure.
> **`$spec [mode=sync]`** — Reconcile §8 `TC-{FEATURE}-{NNN}` specs ↔ the executing test code under `docs/specs/`. Update each TC's `CoveredBy` field with **all** covering `{File}::{MethodName}` links (one TC → many tests, 1:N; a test-filter expression when the set is large). Coverage = ≥1 annotation-tagged test; never force one test per TC. Runs AFTER convergence so it syncs the final tests, not intermediate ones.
> **`$scan --target=integration-tests`** — Regenerate the integration-test project-reference doc from the suite as it now stands: patterns, base fixtures, async-wait and unique-data helper conventions, suite/project inventory, and lessons. This is the doc every future agent reads before touching a test — a loop that changed test structure without regenerating it leaves the next agent following stale conventions.
> **`$docs-update`** — Update every OTHER impacted doc: feature-doc evidence fields, version history, and any doc embedding test counts or coverage claims the loop changed. Covers what `$spec [mode=sync]` (spec TCs) and `$scan --target=integration-tests` (the reference doc) do not.
> **`$workflow-end`** + **`$watzup`** — Close workflow state, then summarize the convergence trail and run the final handoff.

---

**IMPORTANT MANDATORY Steps:** $scout -> $integration-test-verify-loop -> $debug-investigate [on-failure] -> $fix [on-failure] -> $spec [mode=sync] -> $scan --target=integration-tests -> $docs-update -> $workflow-end -> $watzup

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `$integration-test`, `$integration-test-review`, and `$integration-test-verify` identically.
>
> 1. **Verify the WHOLE system passes — not a hand-picked subset.** `$integration-test-verify` must prove the full relevant suite is green (every test in the system the change can touch), not one cherry-picked test. "All pass" is only true with actual runner output (Passed/Failed/Skipped counts + names) and only after 2 consecutive green runs without a DB reset.
> 2. **Drive state through real use-case paths — NEVER hack seed data.** Set up every precondition exactly as a real user would: real commands, queries, production consumers/messages, or valid idempotent seeders. NEVER create or mutate domain data by direct repository writes — that fabricates states a user could never reach and hides the real workflow bug. Hacking seed data to force a green run is forbidden.
> 3. **On ANY failure → `$debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `$integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **60-second runtime cap — a slow test is a RED FLAG, not a tuning knob.** Local integration tests run fast. If any single test (or a stalled suite) exceeds ~60s, STOP and treat the slowness itself as a defect signal — deadlock, missing `await`, infinite poll/retry, a real network/external call, or an unbounded query. `$debug-investigate` the cause; NEVER paper over it by raising the timeout or extending the wait.
> 5. **Loop until the whole suite is green.** After fixing the validated root cause, restart the full 2-run verification from run 1. Done means the entire relevant suite passes repeatably — never green-once, never a subset.

<!-- /SYNC:integration-test-execution-discipline -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine _who is at fault — the source code or the test code_. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `$debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for _intended_ behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure or external state prevents a source/test verdict → preserve diagnostics and stop mutation until the environment is healthy.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and ask the user directly (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

<!-- /SYNC:test-failure-fault-adjudication -->

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
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `$project-init` or the narrow route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `$sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

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
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every protocol below — each is a signpost to its canonical body above.

- **Integration Test Execution Discipline:** verify the WHOLE system, drive state through real use cases, `$debug-investigate` before any fix, 60s runtime cap, loop until the whole suite is green.
- **Test-Failure Fault Adjudication:** decide WHO is at fault (source vs test) against the governing spec before touching either side; never weaken an assertion or change source to satisfy a broken test.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; settle barriers belong in ARRANGE, never a widened assertion timeout.
- **AI Mistakes:** holistic-first debug, fix at responsible layer, surgical diff, verify all outputs.
- **Nested Tasks:** expand child phases, link parent workflow row when nested.
- **Project Reference Docs:** read required docs first, cite, `lessons.md` always.
- **Task Tracking:** bootstrap tasks; persist plan/review findings to disk incrementally.
- **Critical Thinking:** traced `file:line` proof, confidence >80%, never guess.
- **Incremental Persistence:** append findings per file to report; never hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** set the Goal Contract FIRST — before round 1 — with the zero-failures / 2-consecutive-green / no-test-lost success criterion
**IMPORTANT MUST ATTENTION** the verification scope defaults to the WHOLE SYSTEM and is passed to `$integration-test-verify` EXPLICITLY every round — never let it fall through to change-scoped git auto-detect
**IMPORTANT MUST ATTENTION** adjudicate EVERY failure into ONE written Fault Verdict BEFORE any edit — `$debug-investigate` for the traced root cause, `$integration-test-review` (report-only) for the test-side gates
**IMPORTANT MUST ATTENTION** every loop round that lands a fix runs `$changes-review` (INLINE, report-only) on that round's fix diff — validated findings fold into the same round; an open validated finding blocks the round even when the tests are green
**IMPORTANT MUST ATTENTION** run `$integration-test-verify-loop` and the skills it drives INLINE via the skill invocation — NEVER as sub-agents
**IMPORTANT MUST ATTENTION** NEVER force green — no weakened assertions, no skips, no widened timeouts, no retries around a failing assertion, no repository-hacked data, no narrowed scope
**IMPORTANT MUST ATTENTION** the Round Integrity Check is BLOCKING — a shrinking executed-test count, a growing skipped count, or a narrowed scope is a REGRESSION, not convergence
**IMPORTANT MUST ATTENTION** show actual runner output for every pass/fail claim (Passed/Failed/Skipped counts + failing names)
**IMPORTANT MUST ATTENTION** documentation sync is part of DONE — `$spec [mode=sync]` + `$scan --target=integration-tests` + `$docs-update` all run after convergence
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

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
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
