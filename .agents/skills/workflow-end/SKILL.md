---
name: workflow-end
description: '[Process] Use when the active workflow has finished its steps or the user asks to close it: checks outcome evidence and owned changes, then closes the workflow; recovery state stays until an explicit /clear.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.

## Quick Summary

**Goal:** Close the active workflow with evidence-backed coverage, spec-sync, graph, and baseline checks (reusing the run's own coverage and spec-sync evidence when it exists); deliver a diff-gated one-way comprehension recap unless `$watzup` follows and owns it, then retain per-session recovery state until explicit `/clear` (which alone deletes it).

**Summary:**

- **Purpose:** Penultimate closure step before `$watzup`: close workflow evidence, trigger fresh detection next prompt, and explain changes without a diff reread.
- **Main steps (ordered):** (0) outcome-gate evidence check — block on missing evidence; (1) integration-test coverage check (reuse the run's cited coverage evidence, else scan); (2) spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification (reuse a fresh in-run `spec [mode=sync]` result, else run it); (3) sync graph if `.code-graph/` exists; (4) verify owned baseline and classify unowned/ambiguous changes; (5) verify preceding tasks; (6) print diff-gated recap (what / purpose / how / why) unless `$watzup` follows; (7) close only exact owned baseline and verify `closed`/`deletionFailures`; (8) announce `Workflow [name] completed`; (9) confirm state retained until explicit `/clear`.
- **Blocking gates:** missing evidence for any outcome gate (step 0) → refuse to close and name the gap; coverage gap OR unadjudicated spec-vs-code drift → MUST surface via `ask user question tool`; NEVER silent-skip or report `completed` while drift is unadjudicated. Baseline closure requires qualified, user-accepted ambiguity, or explicit N/A.
- **Modes and terminal behavior:** recap only with a diff; recap one-way/no quiz/no block. Completion is model-driven only after all tasks, sync recorded synced-or-accepted-as-is, and baseline closure qualified, user-accepted, or N/A; per-session state is retained until explicit `/clear` (which alone deletes it); no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` except `session-init` on explicit `/clear`.

**Workflow:**

1. **Detect** — classify scope and target artifacts.
2. **Execute** — perform required evidence-backed steps.
3. **Explain** — print diff-gated recap (skip only with no changes, or when `$watzup` follows and owns it).
4. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION first check evidence for every outcome gate (step 0); `review-converged` runs `review-receipt.cjs check` and reads its JSON, or accepts a cited review report logged as a `review-report` deviation-log line. Missing evidence blocks the close.
- MUST ATTENTION when the workflow produced a diff and no `$watzup` occurrence follows, print the comprehension recap (what changed / purpose / how it works / why) — NEVER fully skip it when changes exist and nothing else owns the recap. A following `$watzup` owns it (its Session summary); record `covered by watzup` — if that `$watzup` is later skipped, the recap duty stays with `workflow-end`: print it at that point. An optional `$watzup` whose `applicability.when` does not hold counts as not following. A run with no diff gets the short handoff of step 6 instead of the recap.
- MUST ATTENTION reuse the run's own evidence for steps 1–2 only when it is cited and fresh (step 0 evidence names the report or occurrence, no source/test/spec edit since); with no such evidence — standalone `$workflow-end`, or the run skipped that step — run the full check.
- MUST ATTENTION the recap is one-way — NO quiz, NO teach-back, NEVER blocks. Keep it concise and complete enough to explain the workflow result without routing to another skill.
- MUST ATTENTION run the spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification when behavior-changing files are in the diff — the workflow MUST NOT report completed while a behavior-vs-spec divergence is unadjudicated; surface unsynced drift via `ask user question tool`, never silent-close.
- MUST ATTENTION close the workflow-owned baseline before announcing completion: run the bounded `workflow-baseline.cjs report` for the recorded run ID, classify owned versus unowned changes, and report `AMBIGUOUS` for unowned paths, endpoint-only ownership, or intermediate commits. Persist the final report and resolve the recap step (printed, or skipped as `no changes to explain` / `covered by watzup`) before running `workflow-baseline.cjs close` for that exact run; verify `closed` and `deletionFailures`, preserve any parent run, and never use broad cleanup. Never replace this with `git diff` attribution, claim every dirty file, restore user work, or read expired/sensitive snapshots.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

## Contents

- [Quick Summary](#quick-summary)
- [When This Runs](#when-this-runs)
- [What To Do](#what-to-do)
- [See Also](#see-also)
- [Workflow End](#workflow-end)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## When This Runs

This skill closes workflow state. In workflows with `$watzup`, it runs after final verification/docs and before `$watzup`, which owns the recap when its condition holds; with no `$watzup` running after it, print the one-way recap (or, with no diff, the short handoff) itself. Then retain per-session tracking until explicit `/clear`.

**NOT for:** manual mid-workflow invocation; switch via `$start-workflow`.

---

## What To Do

0. **Outcome-gate evidence check** (FIRST step, before anything else; BR-GWF-03). Read the run's `outcomeGates` from its Tier-2 manifest (`[]` → record `N/A — no outcome gates declared`). Cite evidence for every gate; a gate whose `when` does not hold is `N/A` with that reason. **Missing evidence for any gate blocks the close:** keep this task `in_progress`, name the gate and the missing evidence, and suggest the step that produces it.
    - `review-converged`: run `node .claude/hooks/lib/review-receipt.cjs check` (default target `worktree`) and read its JSON, not its exit code (it exits 0 when no receipt matches). `ERROR` blocks. `CLEAN` passes (nothing to review). `CHANGED` with a non-null `review` passes (a receipt); a `skip` receipt alone is not a receipt. `CHANGED` with `review: null` passes only when the run cites the review report written by the occurrence that satisfies this gate (a step whose skill is in the gate's `outcomeGates[].satisfiedBy`, e.g. `workflow-review-changes`, `work-item --mode=review` or `integration-test --mode=review`; an existing file under the project). Inspect the report's final verdict and its reviewed target/time against the run's last change-producing occurrence: a not-converged verdict, stale report, mismatched target or unknown freshness **blocks the close**; log `not converged: <final status>` or `stale: predates <occurrence-id>` as applicable and keep this task `in_progress`. A cited path alone never satisfies the gate. Read `references/review-report-evidence.md` on this fallback path and run its normalized-evidence checker; `BLOCKED`/`ERROR` blocks. For the declared read-only `architecture --mode=full` diagnostic, require a current `FINISHED` report, `Faces merged: 3/3` and accepted report-validation evidence; target-system findings remain visible and do not imply the target passed or was repaired. Append `<that occurrence-id> · review-report · <report path>` to `tmp/workflow-runs/<runId>/skips.md` only after acceptance; the close message repeats it and states that a commit still needs the receipt (`$workflow-review-changes --fix-loop` mints it). Neither a receipt nor a cited report → block, name the gap, and suggest running the review. On a host that cannot run the command, manually enforce the SAME verdict, coverage, provenance, target and freshness predicates and log the limitation — never waive them.
    - `tests-pass`: cite the test command and its output; those tests cover every behaviour the run changed and ran green in this run (BR-GWF-15). Unrelated green tests are not evidence. The green run must be on the final tree: an edit to any source or test file after the cited run invalidates it, so re-run the verify (`SYNC:verify-last-order`) before closing. Also cite the mutation-check result (`mutants killed n/n`, or `N/A — reason`); a code-changing run with neither is missing evidence.
    - `spec-synced`: cite the spec-sync diff, or a "no behavior change" statement with the diff stat.
    - `root-cause-traced`: cite the root-cause trace (`file:line`) from the investigation report.
    - `plan-approved`: cite the workflow's declared plan approval evidence, such as `$plan --mode=validate`, an explicit user decision, or another registry-declared approval gate.
    - **Nested children:** for each workflow this run ran nested in a writing mode (not `--review-only` or `--report-only`, whose findings are handed off as diagnostics) whose own close was skipped because it ran nested (for example `workflow-e2e`), check that child's outcome gates the same way from its evidence; a child gate without evidence blocks this close like the run's own.
    - `run-closed`: proved by steps 4–7 of this skill; confirm at step 9.
    - **Plan checklist rows** (optional evidence input, only when a `$plan --mode=execute` occurrence ran nested in this run AND its `plan.md` carries a `## Quality Gates & Concerns Checklist`; otherwise record `N/A — no plan checklist` and add no gate): read that checklist and close each row the execute walk recorded `PENDING-PARENT: <step> — evidence expected: …` using the evidence cited for the gates above (test run, mutation result, review receipt or report). A row whose evidence is present → `PASS`; a row whose evidence is missing or failed → `FAIL`, which blocks the close like any missing gate evidence: name the row and suggest the step that produces it. A nested execute run covers one plan phase, so also scan the same checklist for rows still recorded `DEFERRED-BY-PLAN: phase <n>` at close: name them as `unfinished plan phases: <n…>` and treat them like missing gate evidence — the close is refused and surfaced via `ask user question tool` (Option A: "Continue the remaining phases" (Recommended); Option B: "Accept as-is — I will record the reason", the reason captured in the recap or close message). No plan checklist → record `N/A — no plan checklist` for this scan too.

1. **Integration test coverage check** (skip if workflow is docs/design/investigation/e2e-only, or project has no test suite). **Evidence-driven skip:** when step 0 cited a `tests-pass` report from `integration-test --mode=verify` (or the nested review's change-coverage result) for this run's final tree and it covers the changed business files, record `covered by <report path>` and skip the scan. No cited run report (standalone `$workflow-end`, or the run skipped that step) → run the scan:

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

(The second command lists untracked files not yet staged — catches brand-new handler files before first git add) - Scan changed files for those likely requiring integration test coverage: **business logic files** such as handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from the project's existing file patterns (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`). - For each identified file → search for a corresponding test file. Infer the project's test naming convention from existing tests (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects). - If ANY identified file lacks a corresponding test → **MANDATORY**: use `ask user question tool`: - Option A: "Run `$integration-test` now" (Recommended) - Option B: "Tests already written/updated — proceed" - **No silent skip.** Business logic changes without test coverage MUST be surfaced to the user. - If no business logic files changed, or all have matching tests → skip silently

2. **Spec ↔ TDD-test sync gate** (`spec-tdd-test-sync-gate` — runs BEFORE task-completion verification; skip with reason only if the workflow is docs/design/investigation/e2e-only OR the diff has no behavior-changing files):

    The feedback half of the loop closes HERE — a workflow MUST NOT report completed while the spec still diverges from the code that just changed. Green tests do NOT normalize that drift.

    **Evidence-driven skip:** when the run has a completed `spec [mode=sync]` occurrence (task list or registry sequence), step 0's `spec-synced` evidence cites its result with no unadjudicated drift, and no source, test or spec file changed after it (same freshness rule as `SYNC:verify-last-order`), record `synced by <occurrence or report path>` and skip the re-run and the question below. A stale or absent result (standalone `$workflow-end`, or the run skipped the sync) → run this step in full:

    - Scope to the behavior-changing files in the diff (same surface the coverage check above scanned — handlers/commands/queries/services/controllers/entities/event processors and behavior-bearing frontend logic).
    - Resolve or inherit the validated artifact profile from config and required references; unresolved/malformed declarations stay `UNKNOWN`/`BLOCKED`, never default. Run `$spec [mode=sync]` for the affected canonical owner/case/variant identities and declared proof carriers, reconciling cases ↔ inspected assertions and observed results in both directions. Use §8 TCs and `TestSpec` only when neither config nor required references declares a native contract; never create a second registry.
    - Re-check for **unadjudicated spec-vs-code drift** against the selected canonical owner’s intent/contracts: every divergence must be classified CODE-WRONG / SPEC-STALE / AMBIGUOUS / in-sync (per `SYNC:spec-drift-adjudication`). An ID/link alone proves no execution; retain uncovered and unknown outcomes.
    - If `$spec [mode=sync]` finds an unreconciled canonical case/proof carrier, unresolved profile/coverage, OR unadjudicated behavior-vs-spec drift → **MANDATORY**: keep the gate open and surface via `ask user question tool`:
        - Option A: "Reconcile now — run `$spec [mode=sync]` / `$spec [update]` to close the drift" (Recommended)
        - Option B: "Accept as-is — I will record the reason" (the user's accept-as-is reason is captured in the recap, or in the close message when watzup owns the recap)
    - **No silent skip, no silent close.** **Workflow MUST NOT report `completed` while a behavior-vs-spec divergence is unadjudicated** — record the gate outcome (synced / accepted-as-is-with-reason) before proceeding.

3. **Sync knowledge graph** (optional best-effort index refresh; skip if `.code-graph/` dir doesn't exist):
    ```bash
    if [ -d ".code-graph" ]; then python3 .claude/scripts/code_graph sync --json && python3 .claude/scripts/code_graph update --json; fi
    ```
    On Windows use `py -3` in place of `python3`. Skip with reason `no source change` when the run changed no source files (research, audit, planning or docs-only runs). Report results briefly.
4. **Verify workflow ownership baseline** (when `$start-workflow` recorded a run):
   - Run `node .claude/scripts/lib/workflow-baseline.cjs report` with the run ID and project root.
   - Treat `QUALIFIED` as “no observed unowned path changes,” not proof that every hunk was authored by this run.
   - Treat `AMBIGUOUS` as a blocking closure finding until the user accepts the cited reason; include owned paths, unowned paths, intermediate-commit status, and the residual A→B→C shared-file TOCTOU ambiguity.
   - If the record is age ≥24h, report `EXPIRED` and do not read/recover snapshots. Close/cancel performs best-effort deletion of the exact run files; deletion failure never restores eligibility.

5. Verify all preceding workflow tasks are completed or explicitly skipped with evidence. Keep this closure task in progress until its report, recap step (printed, or skipped with its reason) and owned-run close have finished.

5a. **Implementation approval** (only when a `$plan --mode=execute` occurrence ran nested in this run, which skips its own Step 5 — read the task list or the registry sequence, NOT the deviation log, which is evidence only; skip with that reason otherwise, and skip under `--approval=off`): once every outcome gate has evidence, ask ONE `ask user question tool` — "Workflow complete: review converged and tests green on the final tree. Approve the changes?" — with options Approve / Request changes. Approve → continue. Request changes → apply them, re-run the review and verify per `SYNC:verify-last-order`, then ask again. This approval accepts the implementation only; it never authorizes staging, committing, or pushing.

6. **Explain the changes — developer comprehension recap** (the final teaching step; runs after everything else is done):

    Scope what this workflow changed:

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

    - **No diff** (pure investigation/research/docs-only workflow with nothing built) → skip the recap with reason `"no changes to explain"`. When no `watzup` runs after it, print instead a short **handoff** of at most five lines: the artifacts the run produced (paths, including reports under `tmp/`), each outcome gate's verdict, and the next owner or step.
    - **A `watzup` occurrence follows** (the Tier-2 manifest's next occurrence is `watzup`) → skip with reason `"covered by watzup"`: its Session summary owns Done / Key changes / Why / How it works. If that `watzup` is later skipped as a logged deviation, the recap duty stays with `workflow-end`: print the recap at that point.
    - **Nested in a parent workflow** (this workflow runs as a step of another workflow, e.g. a nested `workflow-e2e` whose own `watzup` its registry applicability skips; the parent's tail `workflow-end` → `watzup` owns the whole run's recap) → skip with reason `"covered by the parent workflow's watzup"`. One rule covers every case: `workflow-end` prints the recap exactly when no `watzup` will run after it, in this run or in its parent workflow's tail.
    - **Diff present and nothing follows to own it** (standalone `$workflow-end`, or a workflow without `watzup`) → ALWAYS print a one-way teaching recap so the developer understands the work **without re-reading the diff**. This is one-way — NO quiz, NO teach-back, NEVER blocks.

    When the recap runs, print at least the short recap when a diff exists — NEVER fully skip.

    **Structure (optimize for easiest learning — lead with high-level motivation, then drill into low-level logic; surface what a reader would NOT guess from the diff):**

    1. **What changed** — concrete edits grouped by **behaviour** (not by file); cite `file:line`.
    2. **Purpose / kind** — feature / bug fix / enhancement / refactor / perf / security — and the problem it solves.
    3. **How it works** — mechanism, key logic, invariants relied on, edge cases preserved; focus the **non-obvious**.
    4. **Why this way** — rationale and trade-offs; why over the obvious alternative.

    When the workflow's own skill names a next command for its hand-off (for example `workflow-greenfield-init` names `$workflow-implement-spec --mode=greenfield-slice` with the first slice), print it as one `Next:` line after the recap or handoff; when a `watzup` follows, pass the command to it.

    When no `watzup` runs after it, end the recap or handoff with one `Lessons:` line — `none`, or the one recurring lesson worth `$learn` under the Lesson Extraction Gate.

7. **Close only the workflow-owned baseline run** after the final report is persisted and the recap step is resolved (printed, or skipped as `no changes to explain` / `covered by watzup` / `covered by the parent workflow's watzup`):
   - When `$start-workflow` recorded a run, invoke `node .claude/scripts/lib/workflow-baseline.cjs close` with JSON stdin containing the recorded `rootDir`, `runId`, and `storeDir` when one was recorded. Use the exact same identity as step 4; never guess a replacement run or directory.
   - Inspect the command exit status AND JSON result: require `closed === true` and an empty `deletionFailures` array. A zero exit alone is not proof of cleanup. On error or deletion failure, retain the closure task as incomplete and report each failure without claiming state cleared; retry only that exact run when safe. Do not restore expired eligibility.
   - Nested closure closes only the child run; preserve the parent run and all sibling runs. Never call `cleanup-expired` or delete a store directory as part of this step.
   - If no baseline run was recorded, explicitly mark only this step `N/A — no recorded baseline run`; do not discover or remove another run.
8. Mark this task `completed` and announce to the user: "Workflow **[name]** completed. Next prompt will trigger fresh workflow detection."
9. Workflow end is model-driven — it completes once this skill's the current task list items are all marked done, the outcome-gate check (step 0) cited evidence or `N/A` for every gate, the spec ↔ TDD-test sync gate (step 2) recorded synced-or-accepted-as-is, the owned-baseline report (step 4) recorded qualified or user-accepted ambiguity, and the exact owned-run close (step 7) succeeded or was explicitly not applicable. No hook clears persisted workflow tracking on completion; the actual `CK_TMP_DIR/workflow/{sessionId}.json` is cleaned by `session-init` on an explicit `/clear`. Do not describe normal completion as deleting the per-session tracking file.

---

## See Also

- **Skill:** `$start-workflow` - Start/switch workflows
- **Doc:** `CLAUDE.md` → _Workflow Step Advancement_ - model-driven advancement rule (no step-tracking hook)
- **Hook:** `session-init.cjs` - cleans the per-session `CK_TMP_DIR/workflow/{sessionId}.json` on an explicit `/clear`

---

**IMPORTANT MANDATORY Steps:** outcome-gate-evidence-check -> integration-test-coverage-check -> spec-tdd-test-sync-gate -> sync-knowledge-graph -> verify-owned-baseline -> verify-task-completion -> explain-changes-recap -> close-owned-baseline -> announce-workflow-completion -> confirm-state-retained-until-explicit-clear

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Workflow End

Finalize and close the active workflow while retaining per-session recovery state until an explicit `/clear` event.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Close the active workflow with evidence-backed coverage, spec-sync, graph, and baseline checks (reusing the run's own coverage and spec-sync evidence when it exists); deliver a diff-gated one-way comprehension recap unless `$watzup` follows and owns it, then retain per-session recovery state until explicit `/clear` (which alone deletes it).

**IMPORTANT MUST ATTENTION Main steps (run in order, NEVER skip/merge):** (0) outcome-gate evidence check; (1) integration-test coverage check (reuse the run's cited coverage evidence, else scan); (2) spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification (reuse a fresh in-run `spec [mode=sync]` result, else run it); (3) sync graph if `.code-graph/` exists; (4) verify owned baseline and classify unowned/ambiguous changes; (5) verify preceding tasks; (6) print diff-gated recap (what / purpose / how / why) unless `$watzup` follows; (7) close only exact owned baseline and verify `closed`/`deletionFailures`; (8) announce `Workflow [name] completed`; (9) confirm state retained until explicit `/clear`.
**IMPORTANT MUST ATTENTION** when the workflow changed code (diff present) and no `$watzup` follows to own the recap, print the comprehension recap — what changed / purpose / how it works / why — grouped by behaviour not file, optimized for easiest learning, NEVER fully skip when changes exist — why: the developer must understand the work without re-reading the diff
**IMPORTANT MUST ATTENTION** the spec ↔ TDD-test sync gate runs BEFORE task-completion verification — NEVER report the workflow `completed` while a behavior-vs-spec divergence is unadjudicated; reconcile via `$spec [mode=sync]` or capture an explicit accept-as-is reason — why: green tests do not normalize spec drift; the feedback half of the loop closes here
**IMPORTANT MUST ATTENTION** run the integration-test coverage check on changed business-logic files (handlers/commands/queries/services/controllers/resolvers/event processors) — if ANY lacks a matching test, surface via `ask user question tool`; NEVER silent-skip — why: business-logic change without coverage ships an unguarded regression path
**IMPORTANT MUST ATTENTION** the recap is one-way and NEVER blocks — no quiz, no teach-back, no handoff to another explanation skill — why: workflow closure must not grow a redundant comprehension step
**IMPORTANT MUST ATTENTION** workflow end is model-driven — close ONLY once every the current task list item is done AND the sync gate recorded synced-or-accepted-as-is; NEVER wait for a hook to clear state — why: no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` on completion (only `session-init` cleans it on explicit `/clear`)
**IMPORTANT MUST ATTENTION** break work into small todo tasks with todo tracking BEFORE starting; mark one `in_progress`, complete it immediately after its evidence lands; add a final review todo — why: untracked steps get silently skipped under long context
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code, and verify pattern FIT (same abstraction, owner, scope, lifetime, and preconditions) before copying the nearest example — why: closest example ≠ matching constraints
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim — confidence >80% to act, <60% DO NOT recommend; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** sync the knowledge graph ONLY if `.code-graph/` exists, then announce `Workflow [name] completed` so the next prompt triggers fresh detection

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "No real code changed, skip the recap"           | A diff exists → print at least the short recap. Skip ONLY with reason `no changes to explain` or `covered by watzup`. |
| "No receipt, but the review surely ran"           | Cite the review report path and log it as `review-report`; no receipt and no report → refuse to close. |
| "Tests are green, mark the workflow completed"    | Green ≠ synced. Run the spec↔TDD-test sync gate FIRST; unadjudicated drift blocks `completed`.    |
| "Business file changed but I'm sure it's covered" | Show the matching test `file:line`. No proof → surface coverage gap via `ask user question tool`.        |
| "Workflow feels done, clear state now"            | Model-driven: confirm ALL the current task list items done + sync gate recorded before announcing completion.  |

**IMPORTANT MUST ATTENTION Goal echo:** Close the active workflow with evidence-backed coverage, spec-sync, graph, and baseline checks (reusing the run's own coverage and spec-sync evidence when it exists); deliver a diff-gated one-way comprehension recap unless `$watzup` follows and owns it, then retain per-session recovery state until explicit `/clear` (which alone deletes it).
**IMPORTANT MUST ATTENTION** NEVER silent-skip integration-test coverage or the spec↔TDD-test sync gate — surface gaps via `ask user question tool`; baseline closure requires qualified, user-accepted ambiguity, or explicit N/A.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80%); print the diff-gated recap unless `$watzup` owns it; NEVER report `completed` with unadjudicated drift.
**IMPORTANT MUST ATTENTION Modes/terminal:** recap only with a diff; recap one-way/no quiz/no block. Completion is model-driven; no hook clears `CK_TMP_DIR/workflow/{sessionId}.json` except `session-init` on explicit `/clear`.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
