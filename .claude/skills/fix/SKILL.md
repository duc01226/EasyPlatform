---
name: fix
version: 1.4.2
description: '[Implementation] Use when a workflow step or the user asks for root-cause fixes with regression coverage. --target={ci|issue|logs|review|test|types|ui} scopes the issue.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.

## Quick Summary

**Goal:** Eliminate each issue's root cause with end-to-start `file:line` evidence, fix the lowest invariant-owning layer (never the crash site), and add or update regression coverage that proves the fix converges.

**Summary:**

- **Purpose:** Diagnose end-to-start, fix the lowest invariant-owning layer, update regression coverage and spec/tests; NEVER patch symptoms.
- **No-flag spine:** Root-Cause Prerequisite Gate → researcher investigation → `investigate --mode=debug` trace (`file:line`, hypothesis matrix, forward proof) → Confidence & Evidence → impact plan → 🛑 Validate-Before-Fix → owning-layer implementation → standalone test update (`/integration-test`, or justified `/test` fallback) → conditional `/spec` check → `/changes-review --defer=whole-target` for production code → `/why-review` → verify once (`/integration-test --mode=verify` or `/test` with the mutation check; fix and re-run to green; re-review only if that edited anything, `SYNC:verify-last-order`); ALWAYS follow this order.
- **Routing:** `--target={ci|issue|logs|review|test|types|ui}` selects a self-contained branch with its own diagnosis; no flag runs the spine. Branches skip standalone §1/§2 duplication, but every direct call passes the Root-Cause Prerequisite Gate.
- **Modes/gates:** HARD is default; fast mode requires ALL 5 trivial-bug conditions. Root-cause proof, `Confidence: X%` (`<70%` STOP), and Validate-Before-Fix are hard gates; approval may skip only when `nested=true` (a `[Workflow]` row that merely exists in `TaskList` does not count), while standalone calls own test/spec/review phases; NEVER bypass a gate.
- **Workflow step (`nested=true`):** after the workflow's `/investigate --mode=debug` (and its `/plan`, when that step ran), consume that cited trace and plan instead of spawning `debugger`, `researcher` or `planner` sub-agents, and adjust the pre-written regression test when the fix changes its seams; tests run only in the workflow's later verify step. See [Fix the issue](#fix-the-issue).

**Workflow:**

1. **Investigation** — Use researcher subagents to explore the issue in parallel; use `/investigate` inline for tracing (an optional graph hint may help).
2. **Diagnose** — Trace root cause through code paths with evidence
3. **Plan** — Create fix plan with impact analysis
4. **Fix** — Implement the fix with its regression test; tests run once in the verify step, not here (`SYNC:verify-last-order`)
5. **Standalone test update** — After the fix, every standalone call invokes `/integration-test` to add or update regression coverage; use `/test` only for a justified unit-test seam. When `nested=true` (a workflow step with its own linked phase tasks), the parent sequence owns these test phases, except that this step adjusts a regression test the workflow wrote before the fix when the fix changes its seams (not run here).

**Key Rules:**

- **Root-Cause Prerequisite Gate (BLOCKING):** no code edit until `/investigate --mode=debug` traced THIS problem in THIS session — evidence, not recall
- Debug Mindset: every claim needs `file:line` evidence
- Use subagents for parallel investigation of multiple hypotheses
- Always create a plan before implementing complex fixes
- **Target flag** (see [Target Routing](#target-routing---target)): `--target={ci|issue|logs|review|test|types|ui}` selects a self-contained branch that scopes the fix to that domain. No flag = full diagnose→fix spine below.

## Contents

- [Quick Summary](#quick-summary)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Default Mode Policy](#default-mode-policy)
- [🛑 Root-Cause Prerequisite Gate (Direct `/fix` Invocation) — BLOCKING](#-root-cause-prerequisite-gate-direct-fix-invocation--blocking)
- [Standalone Mode Minimum Contract (Non-Workflow Only)](#standalone-mode-minimum-contract-non-workflow-only)
- [Debug Mindset (NON-NEGOTIABLE)](#debug-mindset-non-negotiable)
- [⚠️ MANDATORY: Confidence & Evidence Gate](#️-mandatory-confidence--evidence-gate)
- [Target Routing (`--target=`)](#target-routing---target)
- [Workflow:](#workflow)
- [Next Steps (Standalone: after the Minimum Contract completes. Skip only when `nested=true` — a `\[Workflow\]` row that merely exists in `TaskList` does not count.)](#next-steps-standalone-after-the-minimum-contract-completes-skip-only-when-nestedtrue--a-workflow-row-that-merely-exists-in-tasklist-does-not-count)
- [Closing Reminders](#closing-reminders)

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Default Mode Policy

> **Default mode HARD.** Every section below applies: parallel researcher subagents, `file:line` root-cause tracing, Confidence & Evidence Gate, impact plan, and bug-preservation tests.
>
> **Fast mode ONLY when ALL 5 conditions hold** (genuinely trivial bug):
>
> - Root cause obvious from error and already located; no diagnosis needed
> - One file; ≤10 changed lines
> - No cross-service impact or contract change
> - Existing bug test, or non-functional typo/log-message fix
> - Fix confidence ≥95% without further investigation
>
> Any condition fails → full protocol; in doubt use HARD. Non-trivial fixes cannot skip diagnosis.
>
> **Fast mode skips only:** parallel subagent investigation (direct read/grep instead), separate plan (inline change), and regression-test authoring (only when coverage exists). It still runs Confidence & Evidence, Behavioral Delta Matrix, and the existing test suite.

## 🛑 Root-Cause Prerequisite Gate (Direct `/fix` Invocation) — BLOCKING

> **[BLOCKING]** Direct `/fix` MUST NOT edit code until `/investigate --mode=debug` produces THIS problem's root cause in THIS session. The gate runs before the Standalone Mode Minimum Contract, any `--target=` branch, and 🛑 Validate-Before-Fix. — why: an untraced first edit patches the symptom site and ships the disease.
>
> **1. Trigger — ALL direct invocations.** User-typed command or model-selected skill; every `--target={ci|issue|logs|review|test|types|ui}` branch and no-flag spine. Branches skip contract §1/§2 duplication but pass this gate. — why: a branch `debugger`/`tester` step is not an end-to-start trace.
>
> **2. Check — evidence, never memory.** Before the first code edit, accept only same-session, same-problem `/investigate --mode=debug` evidence:
>
> - a `TaskList` row for `investigate --mode=debug` (or its phase tasks) covering this symptom, **or**
> - a written investigation report naming this symptom (e.g. `tmp/analysis/{issue-name}.analysis.md`, `tmp/reports/debug-investigate-*.md`) containing the end-to-start trace.
>
> No evidence → NOT run. Recalling that the cause "is known" is not proof. — why: context compaction preserves belief, not findings.
>
> **3. Act.** Not run → run `/investigate --mode=debug` FIRST, then resume `/fix` at planning with its report. This subsumes the spine's step-1 `debugger`. — why: repeating an existing diagnosis double-runs the spine.
>
> **4. Same-problem test.** A prior `/investigate --mode=debug` for a different symptom does NOT satisfy this gate. If `<issues>` is not covered, the gate fires. — why: one investigation per session would license unlimited untraced fixes.
>
> **5. Skip conditions — explicit, narrow, and recorded.** Record which one applies with its proof; never skip silently:
>
> | Condition                                                                                                                  | Skip? |
> | -------------------------------------------------------------------------------------------------------------------------- | ----- |
> | Same-problem evidence per §2 exists → cite the `file:line` / task-row proof and proceed                                     | YES   |
> | Fast-mode-trivial bug (**ALL 5** `Default Mode Policy` opt-out conditions hold) → MAY inline the end-to-start trace instead of spawning the skill; the trace itself is still REQUIRED | PARTIAL |
> | Active parent workflow row whose sequence **already executed** `investigate --mode=debug` for this problem → cite the completed step | YES   |
> | `--target=review` over VALIDATED review findings, each carrying `file:line` evidence and a named owning layer (validated by `/why-review --validate-findings` or by its reviewer's own validation step) → cite the report | YES   |
> | Active parent workflow row **alone**, with no completed `investigate --mode=debug` step for this problem                            | **NO** |
>
> **The last row is the hole this gate closes.** A parent workflow row may exist while its `investigate --mode=debug` step never ran, covered another symptom, or was skipped. This gate adds completed same-problem proof; it never relaxes the contract. — why: a container task is not evidence that its work happened.
>
> **BLOCKED until:** the §2 check is stated with its evidence (or its explicit skip row + proof) AND a root-cause trace for this problem exists. **NEVER** proceed to plan or edit on "the cause is obvious" alone.

## Standalone Mode Minimum Contract (Non-Workflow Only)

> **Workflow context:** `/fix` normally runs inside `workflow-bugfix`, whose sequence (`investigate --mode=debug → spec [mode=amend] → plan → … → fix → … → spec [mode=sync] → workflow-review-changes`) supplies diagnosis, spec sync, and review. Standalone `/fix` diagnoses and patches but does not guarantee root-cause ownership, alignment with the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides), or review; without this contract it risks symptom-patching + spec drift.
>
> **Scope:** applies with no parent workflow. No-flag runs the full diagnose→fix path; `--target={ci|issue|logs|review|test|types|ui}` branches remain self-contained for diagnosis, skip §1/§2 duplication, and inherit mandatory §3 test-update, §4 spec-correctness, the production-code `/changes-review` gate, and §5 `/why-review` gates. A branch's own `tester` / `code-reviewer` sub-agent step does not replace `/changes-review`.
>
> **Detect mode:** call `TaskList` first (per Nested Task Expansion). A run that is a step of a `[Workflow]` row (THIS run's own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in `TaskList`, such as an abandoned one, does not count) — or a `--target=review` call from a reviewer's fix phase (the `/changes-review --fix-loop` fix step, `changes-review/references/fix-loop.md` step 3) — skips this section because the caller owns these steps, but the Root-Cause Prerequisite Gate still requires a completed, same-problem `investigate --mode=debug` (or, for `--target=review`, its validated-review-finding skip row); presence alone is insufficient. Not nested (no linked parent row, or only a stale/unrelated `[Workflow]` row) → standalone: before the first code edit, MUST ATTENTION create this ordered minimum spine as `TaskCreate` todos:
>
> 1. **`/investigate --mode=debug`** — root cause FIRST; §2 evidence decides whether it already ran. Trace symptom end-to-start to the invariant-owning layer with `file:line`, hypothesis matrix, and forward proof. This is standalone diagnosis and subsumes the spine's step-1 `debugger`; resume at planning with its report. Fast-mode-trivial bugs may inline the trace, but the trace remains required.
> 2. **Fix spine** — this skill's `plan → 🛑 approve → implement` body below; Validate-Before-Fix remains unchanged.
> 3. **`/integration-test` test-update gate** — **MUST ATTENTION — MANDATORY after the fix for every standalone call.** Invoke it first to inspect changed behavior and add/update regression coverage. Use integration coverage across a real process/service boundary or for externally observable behavior; use `/test` only for a justified unit seam and record why. An existing suite run does not replace a regression update. Read `integration-test-reference.md` from the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) first.
> 4. **`/spec` spec-correctness check** — *CONDITIONAL, ensures spec docs aren't left stale.* From the proven root cause, decide which case holds:
>    - **Spec WRONG / stale** — behavior was never true or intended behavior changed without a spec update → run `/spec [mode=amend]` for §1-§7, then `/spec [mode=sync]` for §8 `TC-{FEATURE}-{NNN}` ↔ integration tests.
>    - **Spec CORRECT, code failed it** — no §1-§7 amendment. If the bug case is absent from §8, run `/spec [mode=tests]` to add it, then `/spec [mode=sync]`; if an existing TC covers it, record `Spec verified correct, bug case already in §8 — no spec change (code-only defect)` with `file:line`. Never leave the bug case absent from §8.
>    - **No governing spec** — record `No governing spec — nothing to amend` with `file:line`; if warranted, run `/spec [mode=init]`, then `[mode=tests]` to seed the bug-case regression TC. Decide explicitly; skip only amendment, never the decision.
> 5. **`/why-review`** — the last REVIEW todo after fix, test-update, spec decision, and `/changes-review`; sign off root-cause ownership, lowest-layer fix, no symptom patch, regression coverage, and justified §4 decision. Trivial non-functional fixes may satisfy it inline/briefly.
> 6. **Verify once** (`SYNC:verify-last-order`) — the final todo, after every review: `/integration-test --mode=verify` (or a justified `/test`) runs the regression tests once, then the mutation check (revert the fix → the regression test must fail = the RED proof); fix and re-run to green; re-run the reviews only if that edited anything. Reporting "done" is blocked until 5 passes and 6 is green on the final tree.
>
> **Production-code fixes:** add `/changes-review --defer=whole-target` before §5 (§5's `/why-review` owns the rationale review); the shared Standalone Review Gate owns placement and inside-workflow skip. **Final standalone order:** `investigate --mode=debug → [fix spine] → /integration-test` (or justified `/test`) → spec-check → changes-review (production code) → `/why-review` → verify once (`/integration-test --mode=verify` or `/test` + mutation check = the RED proof).

## Debug Mindset (NON-NEGOTIABLE)

**Skeptical + sequential. Every claim needs traced proof; confidence >80% to act.**

- Verify every hypothesis against an actual code trace; do NOT trust the first guess — why: nearest attention often finds the symptom, not the cause.
- Root-cause claims require `file:line` evidence; without a trace, state "hypothesis, not confirmed".
- Question cause and completeness: trace execution, related paths, and contributing factors.
- No "should fix it" without proof that the fix addresses the traced root cause.

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **70-79%** list unknowns | **<70% STOP — gather more evidence.**

**Ultrathink** plan and start fixing these issues; follow Orchestration Protocol, Core Responsibilities, Subagents Team, Development Rules:
<issues>$ARGUMENTS</issues>

## Target Routing (`--target=`)

`/fix` is an intelligent router. With no flag it runs the full diagnose→fix spine below. Pass `--target=` to scope the run to a self-contained branch:

| `--target` | Behavior                                                                  |
| ---------- | ------------------------------------------------------------------------- |
| `types`    | **Branch in `references/target-types.md`** — TypeScript / type-error resolution.           |
| `ci`       | **Branch in `references/target-ci.md`** — CI / pipeline failure triage.                 |
| `issue`    | **Inline branch (below)** — tracked issue / ticket resolution.            |
| `logs`     | **Branch in `references/target-logs.md`** — log / stack-trace-driven debugging.           |
| `test`     | **Branch in `references/target-test.md`** — failing-test repair.                          |
| `ui`       | **Branch in `references/target-ui.md`** — UI / visual-defect fixes.                     |
| `review`   | **Inline branch (below)** — fix VALIDATED review findings from review report(s). |

No `--target` (or an unrecognized value) → run the full Workflow spine below; infer the right specialization from `<issues>`. When that inference selects a branch (`types|ci|logs|test|ui`), read its `references/target-<name>.md` in full FIRST (BLOCKING), exactly as an explicit `--target` does.

> **Target routing:** `--target=ci|issue|logs|review|test|ui` are `/fix` branches; invoke them through `/fix --target=...`, not separate skill names. `issue` and `review` are below in this file; `types`, `ci`, `logs`, `test` and `ui` live in `references/target-<name>.md`, read in full FIRST (BLOCKING) when that target runs — an invocation of another target never reads them.

### `--target=types` — TypeScript / type-error branch

Read `references/target-types.md` in full FIRST (BLOCKING) — it holds this branch's goal, rules and workflow. The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to it unchanged.

### `--target=ci` — CI / pipeline-failure branch

Read `references/target-ci.md` in full FIRST (BLOCKING) — it holds this branch's goal, rules and workflow. The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to it unchanged.

### `--target=issue` — tracked-issue / ticket branch

**Goal:** Investigate and fix bugs reported as tracked issues (e.g. GitHub issues) with full traceability.

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans/` with `docsRoots.plans.path` in `docs/project-config.json` overriding → create from the issue). Map the ticket's acceptance criteria to the saved success criteria; after the fix, append proof evidence and remaining gaps to the Iteration Log. Closure is blocked while any required criterion remains FAIL.

**Key Rules:**

- Link the fix back to the issue for traceability.
- Verify the fix addresses the specific reproduction steps from the issue.

**Workflow:**

1. Activate `investigate --mode=debug` and follow its workflow; this satisfies the Root-Cause Prerequisite Gate—record its report path as §2 evidence.
   > **AI Debugging Protocol:** frame the observed symptom, trace reader → storage/projection → writer → consumer/job → producer/origin, enumerate feeder paths, record hypotheses, and prove convergence forward.
   > **MUST ATTENTION READ** `.claude/docs/AI-DEBUGGING-PROTOCOL.md` for full search, risk, and confirmation rules.
2. Use external memory at `tmp/analysis/issue-[number].analysis.md` for structured analysis. **Re-read the ENTIRE analysis file before proposing any fix.**
3. **🛑 Present root cause + proposed fix → `ask user question tool` → wait for approval before implementing.**
4. Implement the approved fix.

> **Standalone Review Gate (non-workflow only):** any standalone production-code fix — the no-flag spine (Standalone Mode Minimum Contract above) **or** any `--target={ci|issue|logs|review|test|types|ui}` branch — adds a `/changes-review --defer=whole-target` `TaskCreate` todo as the **final changes-review gate**, placed immediately before the contract's §5 `/why-review` terminal sign-off (test-update → spec-check → changes-review → why-review → verify once). A fix touching no production code (test-only, docs-only) skips it with that reason recorded. Inside a workflow, skip — the sequence handles `/changes-review`.

> **Review-loop severity floor (when `/fix` is the fix half of a review loop):** use the canonical `.claude/scripts/lib/review-policy.cjs` predicate and fix only validated findings that block the current round. Classify by consequence: **CRITICAL** = immediate material security/safety/authority/data-loss risk or a failed binary gate; **HIGH** = material supported-path correctness, contract, privacy, authority, compatibility, or likely-harm risk; **MEDIUM** = bounded but consequential edge/resilience/observability/testability/maintainability risk; **LOW** = evidenced non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact. Round 1 is strict (CRITICAL/HIGH/MEDIUM/LOW); from round 2 onward only CRITICAL/HIGH/MEDIUM reopen a fix or re-review round, while LOW-only findings are recorded as deferred and do **not** reopen the loop. `NOT VERIFIABLE` is unresolved evidence, not LOW, and failed binary gates always block. Never re-tier a finding to reach a pass. This bounds loop work only; a standalone user request to fix a LOW-severity issue remains valid and is not refused.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.

### `--target=review` — validated review-findings branch

**Goal:** Close the validated blocking findings of one or more review reports (e.g. `/changes-review`, the specialist reviewers run with `--report-only`, `/why-review`) directly — the review report IS the diagnosis, so no plan ceremony is needed for local fixes.

**Input:** the report path(s) in `$ARGUMENTS` (or the consolidated review report of the active workflow). Only findings marked validated are in scope; an unvalidated finding goes back to `/why-review --validate-findings` first.

**Workflow:**

1. **Load and track** — re-read every input report; create one task per validated blocking finding (current round bar per the review-loop severity floor above). Record `FIXING` in the report next to each.
2. **Re-confirm before editing** — the cited `file:line` evidence still holds on the current tree; a finding that is a *bug with an unknown cause* (the report names a symptom, not the owning cause) goes to `/investigate --mode=debug` first — the Root-Cause Prerequisite Gate still binds that case.
3. **Fix at the owning layer** — one authoritative correction per violated invariant; group findings that share an owner. For a large or cross-module fix set, `/plan` is RECOMMENDED; it must capture the decisions, owners, risks and final gates without adding an automatic review step.
4. **Tests** — a behavior-changing fix gets a regression/preservation test for the intended behavior, written with the fix. NOT run here when the caller has a later verify step or passes `--tests=defer` — that single verify runs it, and its mutation check is the fix's RED proof (`SYNC:verify-last-order`). With NO later verify step (a standalone `/workflow-review-changes` in its default `--tests=prove` mode), re-run the affected tests and record exact results. A `/fix` that is itself the verify-step repair of a red test re-runs the failing set after each fix and follows the project's test-failure adjudication before any source or test edit.
5. **Write back** — append to the SAME report a `## Fix Log` row per finding: `FIXED` (files changed, test evidence) · `REJECTED` (new evidence that the finding is wrong — never final on the fixer's word: the caller re-validates it via `/why-review --validate-findings` or asks the user) · `DEFERRED` (round-2+ LOW only). The report stays the single living record the re-review reads.
6. **Hand back** — when a reviewer's fix phase or a workflow fix step called this branch (the `/changes-review --fix-loop` fix step, or `/workflow-review-changes`'s `fix --target=review` step), the caller owns re-review, spec and docs: the Standalone Mode Minimum Contract does not apply, skip the approval prompt, and never re-invoke `/changes-review`. Only a user-typed `/fix --target=review` is standalone: it presents the fix set once and ends with `/changes-review` over the fixed diff.

When `nested=true` (a `[Workflow]` row that merely exists in `TaskList` does not count) or in a reviewer's fix phase, skip approval prompts; user-typed standalone, present the fix set once via `ask user question tool` before editing. The Debug Mindset, Confidence & Evidence Gate, the review-loop severity floor above, and all SYNC gates apply to this branch unchanged.

### `--target=logs` — log / stack-trace branch

Read `references/target-logs.md` in full FIRST (BLOCKING) — it holds this branch's goal, rules and workflow. The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to it unchanged.

### `--target=test` — failing-test branch

Read `references/target-test.md` in full FIRST (BLOCKING) — it holds this branch's goal, rules and workflow. The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to it unchanged.

### `--target=ui` — UI / visual-defect branch

Read `references/target-ui.md` in full FIRST (BLOCKING) — it holds this branch's goal, rules and workflow. The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to it unchanged.

## Workflow:

If screenshots or videos are provided, use `visual analysis tooling` to describe the issue so developers can predict root causes.

### Fulfill the request

**Question Everything:** Use `ask user question tool` for probing questions about the request, constraints, and true objective. Do not assume; clarify until 100% certain.

- Use `ask user question tool` to clarify any open questions.
- Ask 1 question at a time; wait for answer before next question.
- No questions → start next step.

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause + plan, present findings + plan via `ask user question tool` and get approval BEFORE code changes; no silent fixes.
> **End-to-Start Trace Gate:** For non-trivial bugs, failed verification, stale/incorrect outputs, or behavior-changing fixes, the root-cause plan MUST ATTENTION include `Debugger Trace: End -> Start`, feeder paths, hypothesis matrix, owning layer, and forward convergence proof. If missing, STOP and run `/investigate --mode=debug` or `/investigate` before planning; the Root-Cause Prerequisite Gate re-checks trace content.

### Fix the issue

**Active-goal read (BEFORE root-cause work):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans/` with `docsRoots.plans.path` in `docs/project-config.json` overriding → create from the issue via `.claude/templates/goal-contract-template.md`. Saved success criteria define "fixed"; a local proof missing any required criterion is NOT complete. After proof, append root cause, evidence, and remaining gaps to the Iteration Log. Tiny fixes may skip deeper gates ONLY with a user-accepted reason in the goal file.

**AI surface?** Only if the defect sits in, or the fix creates or changes, a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md` and apply it; otherwise skip this line.

Use `investigate --mode=debug` for complex problems, and the skills catalog to activate other needed skills.

> **Workflow step after `/investigate --mode=debug` (`nested=true`).** When this run is a step of a `[Workflow]` row (its own phase tasks are linked to that parent row; a row that merely exists in `TaskList` does not count) whose sequence already executed `/investigate --mode=debug` for this problem, consume that step's cited root-cause report and, when the workflow's `/plan` step ran, its plan. The report satisfies the Root-Cause Prerequisite Gate (its completed-parent-step skip row) and is the diagnosis: skip spine steps 1–3, spawning no `debugger`, `researcher` or `planner` sub-agent. Implement the cited plan through step 5, or plan inline from the report when no `/plan` ran. Re-confirm the cited `file:line` evidence on the current tree before editing; a symptom the report does not cover goes back to `/investigate --mode=debug`. Approval follows the `nested=true` rule in the Quick Summary, and the step ends with its report, without step 6's commit question.
>
> **Regression test in the workflow.** The workflow writes the bug's regression test before this step and does not run it. When the fix changes the seams that test drives (names, signatures, setup or fixtures), adjust the test in this step so it still reproduces the bug through the changed seams, never weakening its assertion. Tests run only in the workflow's later verify step (`SYNC:verify-last-order`): RED by reverting the fix through a hand-edit, then GREEN with it.

1. Use `debugger` subagent to find the root cause and report to the main agent. **Skip when the Root-Cause Prerequisite Gate already ran `/investigate --mode=debug` for this problem**; that report subsumes this step, so resume at planning. — why: repeating diagnosis double-runs the spine.
   1.5. Write results to `tmp/analysis/{issue-name}.analysis.md`; re-read the ENTIRE file before planning.
   1.6. Confirm it contains final symptom → reader → storage/projection → writer → consumer/job → producer/origin, all feeders, hypothesis matrix, owning layer, and forward proof.
2. Use `researcher` subagent to research root causes on the internet if needed; report back.
3. Use `planner` subagent to create the implementation plan from reports; report back.
4. **🛑 Present root cause + fix plan → `ask user question tool` → wait for user approval.**
5. Use `/plan --mode=execute` SlashCommand to implement plan step by step.
6. Final Report:

- Report changes, brief explanation, getting-started guidance, and next steps.
- Ask whether to commit and push; if yes, use `git-manager` subagent.

* **IMPORTANT:** Sacrifice grammar for concise reports; list unresolved questions at the end, if any.

**REMEMBER:**

- Generate visual assets with `visual analysis tooling`; read/analyze them against requirements. Use media processing for image edits (background removal, adjustment, cropping).

> **Spec-Loop completion gate (canonical: `SYNC:spec-loop-discipline`).** The fix is NOT done until the touched invariants close the loop: (1) every §4 [HARD] rule / §5 invariant the bug violated has a **universally-quantified property TC** ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case — not just the single reproduction example (this is the property bar the §3 regression-TC must meet, not merely an example case); (2) the fixed core-logic line is **mutation-killed** — if a mutant survives on the changed line the killing test is missing, so the bug can silently return (MUTATION-SCORE bar, not line-coverage %); (3) the finding fed BOTH the spec and the tests per the §3 spec-correctness decision AND a guarding test (Dual-Feedback) — a code-only patch with neither leaves the disease undocumented. Re-verify spec + tests + code together before declaring the fix complete.

---

## Next Steps (Standalone: after the Minimum Contract completes. Skip only when `nested=true` — a `[Workflow]` row that merely exists in `TaskList` does not count.)

> **The Root-Cause Prerequisite Gate and the Standalone Mode Minimum Contract above are NOT optional and NOT a question** — standalone `/fix` has already auto-run `investigate --mode=debug` (gate-enforced) → fix spine → mandatory `/integration-test` test update (or justified `/test` unit-test fallback) → conditional `/spec` check → (`/changes-review --defer=whole-target` for production code) → `/why-review` as the terminal sign-off. Do not re-ask the user whether to do those; they are the guaranteed floor.
>
> **AFTER that floor is met,** MUST ATTENTION use `ask user question tool` to offer what lies BEYOND the minimum (user decides):

- **"Proceed with full workflow (Recommended)"** — Hand off to the best-fit workflow (e.g. `workflow-bugfix`) from here to add the remaining gates the minimum spine omits — `plan --mode=validate`, `integration-test --mode=review`, `integration-test --mode=verify`, `production-readiness-review`, `security-audit`, `docs-manager --mode=update`.
- **"/test"** — Run the full test suite to verify the fix in context.
- **"Commit & push"** — Hand the proven, reviewed change to the `git-manager` subagent.
- **"Stop here"** — Minimum contract satisfied; user takes it from here.

> If THIS run is a step of a `[Workflow]` row (`nested=true`: its own phase tasks are linked to that parent row; a `[Workflow]` row that merely exists in `TaskList`, such as an abandoned one, does not count), skip both the contract and this menu — the workflow sequence handles diagnosis, spec sync, review, and next steps.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Prevents context loss from long files. Keep task depth proportional to the work.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `root-cause-debugging` — Systematic root-cause debugging, never guess-and-check; debugging a failure → .claude/skills/shared/protocols/root-cause-debugging.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** only for relevant entity/VO/aggregate changes, read `domain-analysis/references/entity-quality.md`: establish fit → plan owned decisions/proof → implement through all write/load paths → review the same rules. Keep simple models simple; unresolved material decisions or required proof block. Use one caller-owned review pass.

<!-- /SYNC:domain-entity-change-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Eliminate each issue's root cause with end-to-start `file:line` evidence, fix the lowest invariant-owning layer (never the crash site), and add or update regression coverage that proves the fix converges.

**IMPORTANT MUST ATTENTION — Main steps:** route `--target=` first → pass the Root-Cause Prerequisite Gate → investigate with researcher subagents → diagnose end-to-start with `investigate --mode=debug` → declare confidence/evidence → plan impact → pass Validate-Before-Fix approval → implement at the owning layer → update regression tests → decide spec correctness/sync → run `/changes-review --defer=whole-target` for production code → finish with `/why-review`; standalone calls keep the full spine, while parent workflows own their declared sequence.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** start at observed final output, trace backward through every feeder path before fixing.
- **Root Cause Debugging:** reproduce → isolate → trace → hypothesize → verify → fix the cause, never symptoms.
- **Nested Task Creation:** parent workflow rows don't replace child phase tracking; expand and link phases.
- **Task Tracking & External Report:** bootstrap task tracking; persist plan/review findings to `tmp/reports/` incrementally.
- **Understand Code First:** search 3+ patterns and read code before any modification.
- **Evidence-Based Reasoning:** cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Fix-Layer Accountability:** trace full data flow, fix at the owning layer, not the crash site.
- **Source/Test Drift Check:** when source behavior changes, decide from evidence whether affected tests change.

**IMPORTANT MUST ATTENTION** Root-Cause Prerequisite Gate (BLOCKING, FIRST) — a direct `/fix` call (no-flag spine AND every `--target=` branch) MUST NOT edit code until `/investigate --mode=debug` traced THIS problem in THIS session, proven by a `TaskList` row or a written investigation report; recall is NOT evidence, a prior investigation of a DIFFERENT symptom does NOT count, and a parent workflow row alone is NOT proof its diagnosis step ran — not satisfied → run `/investigate --mode=debug` first, then resume from the planning step — why: without it the first edit lands with zero traced cause and patches the symptom site
**IMPORTANT MUST ATTENTION** trace the symptom end-to-start to the invariant-owning layer and fix there — NEVER at the crash site — why: the crash site is a symptom; the bad state enters at a lower layer and one fix there protects all downstream consumers
**IMPORTANT MUST ATTENTION** declare `Confidence: X%` + `file:line` proof for EVERY claim — 95%+ recommend, 80-94% caveats, 70-79% list unknowns, STOP if <70% — why: speculation patches the wrong layer and ships the disease
**IMPORTANT MUST ATTENTION** 🛑 Validate-Before-Fix — present root cause + plan via `ask user question tool` and get approval BEFORE any code change (skip ONLY when `nested=true`) — why: silent fixes bypass the human gate on irreversible code change
**IMPORTANT MUST ATTENTION** route on `--target=` FIRST — each `{ci|issue|logs|test|types|ui}` branch is self-contained (own diagnosis); no flag = full diagnose→fix spine — why: branches must not re-run §1/§2 of the standalone spine
**IMPORTANT MUST ATTENTION** default mode HARD (full rigor) — opt out to fast mode ONLY when the bug is genuinely trivial (ALL 5 Default Mode Policy conditions met); when in doubt default hard — why: skipping diagnosis on a non-trivial bug fixes the symptom and leaves the disease
**IMPORTANT MUST ATTENTION** standalone (not `nested=true`; a stale `[Workflow]` row alone does not count) self-assembles the spine `investigate --mode=debug → fix → /integration-test test-update (or justified /test unit-test fallback; write only) → /spec correctness check → /changes-review --defer=whole-target (production code) → /why-review → verify once (`/integration-test --mode=verify` or `/test` with the mutation check; fix and re-run to green; re-review only if that edited anything)`; invoke `/integration-test` after every standalone fix to add or update regression coverage, and use `/test` only for an evidence-backed unit-test seam — when `nested=true` SKIP the contract — but NEVER the Root-Cause Prerequisite Gate, which still demands proof the sequence's `investigate --mode=debug` step ran for this problem — why: standalone has no sequence supplying diagnosis, test updates, spec sync, or review; and a container row is not proof its diagnosis step ran
**IMPORTANT MUST ATTENTION** spec-loop completion — the fix is NOT done until the violated §4/§5 invariant has a universally-quantified property TC + boundary case, the changed line is mutation-killed, and the finding fed BOTH spec and tests (Dual-Feedback) — why: a code-only patch leaves the bug case undocumented and able to silently return
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` todos BEFORE starting (one read = one task); call `TaskList` first on context loss to resume, never duplicate — why: long debug files exhaust context and silently lose findings
**IMPORTANT MUST ATTENTION** read required project-reference docs (`lessons.md` always; `integration-test-reference.md` for test branch; the business spec root, default `docs/specs/` and overridable via `specRoots.business.path` in `docs/project-config.json`, for behavior) before target work — why: project conventions override generic debugging assumptions
**IMPORTANT MUST ATTENTION** on a FAILED TEST (`--target=test` or any test failure), FIRST read the `/integration-test --mode=review` skill protocol (assertion-quality, coverage & spec↔test↔code fault gates) to set fix direction — decide whether the fault is a source-code root cause or a test-code setup/assertion issue — why: fixing without that verdict patches the wrong side and can green a broken invariant.
**IMPORTANT MUST ATTENTION** search 3+ similar patterns and read existing code before any fix; evaluate fit before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** add a final review todo to verify work quality, then extract root-cause lessons (`/learn`) if the failure mode would recur without the reminder

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "Add a `?.` / guard and move on"         | Scattered defensive checks = wrong layer. One authoritative fix beats many guards.               |


**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via TaskCreate.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->
