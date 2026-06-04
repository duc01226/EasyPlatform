---
name: workflow-review-changes
version: 4.0.0
description: '[Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure changed work reaches clean review through validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, validate findings, fix only validated findings, then re-run `/review-changes` INLINE (only when `/plan-execute` actually changed files), repeating the plan→plan-execute→review-changes loop until a complete pass is clean.

**Summary:**

- Step 1 `/review-changes` runs FIRST and owns the baseline (surface analysis, integration-test/translation-sync gaps, UI review via internal `/review-ui`); step 2 `/why-review` validates those findings to drop false positives BEFORE the parallel batch fires — so steps 3–7 act only on warranted findings.
- Steps 3–7 (`/review-architecture`, `/review-domain-entities` [if entity files], `/performance-review`, `/integration-test-review`, `/security-review`) are read-only sub-agents: spawn ALL in ONE message and advance ONLY after every member returns (all-return barrier); the mutating `/code-simplifier` (step 8) waits until the barrier clears and self-reviews its own changes via `/code-review`.
- Fix cycle (steps 9–12 `/plan`→`/plan-review`→`/plan-execute`→`/review-changes`) runs ONLY when validated findings exist; the step-12 re-review runs ONLY if `/plan-execute` changed files, re-reading the full diff from scratch INLINE to counter orchestrator confirmation bias, and loops until a clean zero-finding pass (cap at 3 no-progress repeats of the same blocker → escalate via `AskUserQuestion`).
- `/docs-update` (step 13) ALWAYS runs and triages internally; SPEC-STALE drift verdicts from step 1 flow here to update the Feature Spec first — the workflow is NOT clean while any behavior-vs-spec divergence stays unadjudicated (green tests do not normalize drift).

**Sequence:** /review-changes (owns UI review — invokes /review-ui internally when frontend changes) → /why-review (validate findings) → **[parallel batch]** /review-architecture + /review-domain-entities (if entity changes) + /performance-review + /integration-test-review + /security-review → /code-simplifier (self-reviews its own changes via /code-review) → /plan → /plan-review → /plan-execute → **/review-changes (conditional inline re-review — only if /plan-execute changed files; loops /plan→/plan-execute→/review-changes until clean)** → /docs-update → /workflow-end → /watzup

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION carry every unresolved finding or unaccepted risk into validation/fix planning; do not close until fixed or explicitly accepted.
- MUST ATTENTION include unresolved risk register, generated mirror drift, and spec/test/docs drift in the fresh review prompt when relevant.
- MUST ATTENTION run `/why-review` at step 2 to validate the `/review-changes` findings BEFORE spawning the parallel reviewers — drop false positives early so the batch and fix cycle act only on warranted findings.

- After `/plan-execute` applies validated fixes (and ONLY if `/plan-execute` changed files) → re-run `/review-changes` INLINE over the current full diff from the first phase; re-read the diff from scratch to counter orchestrator confirmation bias
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = one complete review pass finds zero blocking issues after all validated fixes and verification are included
- Repeated blockers are tracked in conversation context; stop after 3 no-progress full invocations of the same blocker

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Mandatory Task Creation (ZERO TOLERANCE)

Create one task per row in the table below — source of truth is `workflows.json` → `review-changes.sequence` (currently 15 steps; verify count matches if you suspect drift):

| #   | Task Subject                                                                                                                                                                                                                       | Conditional?                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `[Workflow] /review-changes — Surface detection + dimensional review tasks (BE/FE/SCSS/Synthesis/General) + UI dimension via /review-ui (if frontend changes) + integration test sync check + multilingual translation sync check` | No                                                                                                                                                                                               |
| 2   | `[Workflow] /why-review — Validate the /review-changes findings before parallel reviewers run (each finding warranted, evidence-backed, not a false positive)`                                                                     | No — FINDINGS-VALIDATION gate over the /review-changes findings; the fix plan's design is reviewed by /plan-review (step 10); if step 1 found zero issues, pass through with nothing to validate |
| 3   | `[Workflow] /review-architecture — Architecture compliance review` ⚡ **PARALLEL BATCH**                                                                                                                                           | No — run as sub-agent in parallel with steps 4/5/6/7                                                                                                                                             |
| 4   | `[Workflow] /review-domain-entities — DDD quality review of changed domain entity files` ⚡ **PARALLEL BATCH**                                                                                                                     | Yes — skip if no domain entity files (Domain/, Entities/, ValueObjects/) in git diff                                                                                                             |
| 5   | `[Workflow] /performance-review — Performance analysis` ⚡ **PARALLEL BATCH**                                                                                                                                                      | No — run as sub-agent in parallel with steps 3/4/6/7                                                                                                                                             |
| 6   | `[Workflow] /integration-test-review — 7-gate test quality review + Gate 7 change coverage (every behavior change → covering test + spec TC)` ⚡ **PARALLEL BATCH**                                                                | No — run as sub-agent in parallel with steps 3/4/5/7                                                                                                                                             |
| 7   | `[Workflow] /security-review — Security vulnerability review` ⚡ **PARALLEL BATCH**                                                                                                                                                | No — run as sub-agent in parallel with steps 3/4/5/6                                                                                                                                             |
| 8   | `[Workflow] /code-simplifier — Simplify and refine code (self-reviews its own changes via /code-review before returning)`                                                                                                          | No — runs AFTER parallel batch (modifies code; batch reviews pre-simplification state; simplifier owns review of its own output)                                                                 |
| 9   | `[Workflow] /plan — Consolidate validated review findings into fix plan`                                                                                                                                                           | Conditional — run ONLY if reviews surfaced validated findings to fix; skip if all reviews PASS                                                                                                   |
| 10  | `[Workflow] /plan-review — Architecture/design review of fix plan (includes adversarial design-rationale pass + internal /why-review --validate-findings of its own findings)`                                                     | Conditional — run ONLY if there is a fix plan (i.e. findings exist); skip if all reviews PASS                                                                                                    |
| 11  | `[Workflow] /plan-execute — Implement fixes from plan`                                                                                                                                                                             | Conditional — run ONLY if there are validated findings to fix; skip if all reviews PASS                                                                                                          |
| 12  | `[Workflow] /review-changes — Conditional inline re-review after /plan-execute (re-runs the review over the current diff); loop /plan→/plan-execute→/review-changes until clean`                                                   | Skip if all reviews PASS, OR if /plan-execute applied no file changes                                                                                                                            |
| 13  | `[Workflow] /docs-update — Update impacted documentation`                                                                                                                                                                          | Always run — /docs-update triages internally (fast-exits when only config/tool files changed)                                                                                                    |
| 14  | `[Workflow] /workflow-end — End workflow state (prints the concise change recap, then clears state)`                                                                                                                               | No                                                                                                                                                                                               |
| 15  | `[Workflow] /watzup — Post-workflow summary and final /understand handoff`                                                                                                                                                         | No                                                                                                                                                                                               |

> **UI review is owned by step 1.** `/review-ui` is NOT a separate workflow step — `/review-changes` (step 1) invokes it internally (ui-ux-designer sub-agent) as its UI dimension whenever the diff contains frontend/UI files. Do NOT create a separate `[Workflow] /review-ui` task.

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` with note "Skipped — all reviews passed".

> **Integration Test Sync:** The `/review-changes` skill (task #1) includes a **mandatory** integration test coverage check for changed command/query/handler files. When gaps are found, the skill uses `AskUserQuestion` to surface them — NOT purely advisory. The user must explicitly choose to run `/integration-test` or confirm tests are already written. No silent skip.

> **Translation Sync:** The `/review-changes` skill (task #1) includes a **mandatory** multilingual UI translation-sync check. When UI text changes in multilingual projects without locale updates, the skill uses `AskUserQuestion` for an explicit user decision — NOT purely advisory.

> **Docs Update:** `/docs-update` MUST run after EVERY review — it performs Phase 0 triage and fast-exits automatically when only non-business-code files changed (`.claude/**`, config). When business code is in the changeset, it WILL invoke: Phase 2 `/spec` (business feature doc update), Phase 2.5 `/spec-index [mode=index]` (derived bucket INDEX/ERD refresh — if `docs/specs/` bucket maintains a derived index; note: dirs may be app buckets or flat system folders — probe `ls docs/specs/{name}/` to find a specific service), Phase 3 `/spec [mode=tests]` (test spec sync), Phase 4 `/spec [mode=sync]` (§8 TCs ↔ integration test code). Never skip based on review PASS status alone.

> **Spec Drift Adjudication:** The `/review-changes` skill (task #1) runs a **mandatory** spec-drift adjudication (`SYNC:spec-drift-adjudication`, per `shared/sdd-artifact-contract.md` → Drift Gates) for every behavior-changing file: it classifies each divergence between changed behavior and the canonical Feature Spec as **CODE-WRONG** (BLOCKING — fix the code/test against intended behavior), **SPEC-STALE** (the change is the new intent — the spec documents the old behavior), or **AMBIGUOUS** (escalate). The reviewer never silently picks a side. A **SPEC-STALE** verdict flows downstream: `/docs-update` (step 13) updates the Feature Spec FIRST via `/spec [update]`, then re-syncs `/spec [mode=tests]`. The workflow is NOT clean while any behavior-vs-spec divergence remains unadjudicated — green tests do not normalize drift (green can encode the drift itself).

> **Spec enrichment per cycle (MANDATORY — closes the feedback loop):** Every confirmed finding fixed in the loop (steps 9–12) that changed observable behavior MUST produce a new or updated §8 regression/preservation TC via `/spec [mode=tests]` before the workflow is clean — a code-only fix with no covering §8 TC is an INCOMPLETE cycle, not a clean pass. This applies to EVERY confirmed behavior-changing fix, not only SPEC-STALE drift verdicts or bugfix-workflow paths: a CODE-WRONG fix owes a regression TC describing the now-correct behavior; a behavior change owes a preservation/regression TC guarding the new behavior. So each recursive cycle ENRICHES the spec rather than only mutating code — the inline re-review (step 12) and the `/workflow-end` spec ↔ TDD-test sync gate both treat a behavior-changing fix that left no §8 TC as an open finding.

---

## Parallel Review Phase (Steps 3–7) — EXECUTION PROTOCOL

> **Note:** Steps 3–7 are ARCHITECTURAL/SECURITY reviewers (architecture compliance,
> DDD entities, performance, integration test quality, security vulnerabilities). They are
> separate from the DIMENSIONAL review (BE/FE/SCSS/Synthesis + UI via `/review-ui`) that runs
> inside Step 1 (`/review-changes`).
> Both operate in parallel — Steps 3–7 as explicit workflow parallel sub-agents; dimensional agents
> (including the UI dimension) inside Step 1 as its internal parallel batch. No overlap in responsibility.
> **UI/frontend quality is NOT a step 3–7 reviewer** — `/review-changes` (step 1) owns it and invokes
> `/review-ui` internally (ui-ux-designer sub-agent) only when the diff has files matching the project's
> configured frontend/UI file patterns.

Steps 3–7 (`/review-architecture`, `/review-domain-entities`, `/performance-review`, `/integration-test-review`, `/security-review`) are **read-only** and **independent** — no shared mutable state, no ordering dependency between them. Run them as parallel sub-agents to preserve main session context budget and reduce wall-clock time.

### Why parallel?

Each reviewer reads the git diff independently and analyzes one concern. Sequential execution would burn 50K+ tokens in the main session absorbing all five inline. The `stepMeta` in `workflows.json` marks all five as `executionMode: subagent, contextBudget: high` — dispatch each as a sub-agent per the model-driven advancement rule (no hook emits a `💡 [SUB-AGENT RECOMMENDED]` hint).

> **UI review runs inside step 1, not here.** `/review-changes` invokes `/review-ui` (ui-ux-designer sub-agent) as part of its own internal dimensional batch when frontend files changed — do NOT spawn a separate `review-ui` agent in this parallel phase.

### Execution: spawn in one message

After steps 1 and 2 (`/review-changes` and `/why-review`) complete, spawn all active parallel reviewers in **a single response** with multiple `Agent` tool calls:

```
Agent(review-architecture, subagent_type="architect", ...)           ← all in ONE message
Agent(review-domain-entities, subagent_type="code-reviewer", ...)    ← only if entity files in diff
Agent(performance-review, subagent_type="performance-optimizer", ...)
Agent(integration-test-review, subagent_type="integration-tester", ...)
Agent(security-review, subagent_type="security-auditor", ...)
```

Each sub-agent receives:

- The baseline summary from step 1 (what changed, integration test gaps found)
- Instruction to write report to `plans/reports/{skill}-{date}-{slug}.md`
- Full review protocols per `SYNC:review-protocol-injection` (verbatim in prompt — never by file reference)

### State advancement after parallel batch (model-driven — PRIMARY)

Advancement here is **model-driven** — your responsibility against the task list, NOT a hook/tool signal. This is the same rule the universal context files carry ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md), so the batch advances identically under Claude and Codex. The shared kernel is the canonical **`SYNC:parallel-phase-advancement`** block consolidated at the end of this skill — its barrier rule governs this batch: declare the group up-front; spawn ALL members in ONE message; advance ONLY after EVERY member returns (a skipped conditional member counts as "returned"); a sub-agent return advances a step IDENTICALLY to an inline call; defer the mutating `/code-simplifier` step until the barrier clears; hooks are accelerators only.

**Applied to this workflow's batch** — after ALL parallel reviewers (steps 3–7) have returned:

1. `TaskUpdate` step 3 → `completed`
2. `TaskUpdate` step 4 → `completed` (or "Skipped — no entity files" if the conditional `review-domain-entities` member did not run — a skipped conditional counts as "returned")
3. `TaskUpdate` step 5 → `completed`
4. `TaskUpdate` step 6 → `completed`
5. `TaskUpdate` step 7 → `completed`
6. Read all sub-agent report files; synthesize findings into a combined review summary
7. Proceed to step 8 (`/code-simplifier`) sequentially — only after the barrier above (it is a code-mutating step and must see the complete review snapshot)

> **Advancement here is model-driven.** This sub-agent batch advances only after every member returns (the all-return barrier) — no step-tracking hook advances it. Claude and Codex both rely entirely on this rule.

### Consolidation before /code-simplifier

Before running `/code-simplifier`, synthesize all parallel sub-agent findings:

- List all Critical/High/Medium/Low findings across all 5 reports (plus the UI-dimension findings folded into step 1's report when frontend files changed)
- Note any conflicts between reviewers (same file, different concerns)
- Pass this summary to `/code-simplifier` as context so simplification is informed by review findings

**Surface Analysis from Step 1:**

Step 1 (`/review-changes`) now emits a surface analysis summary in its report:

```
## Change Surface Analysis
BE files: {N}
FE-Logic files: {M}
SCSS files: {P}
Review Mode: [DIMENSIONAL | BE-ONLY | FE-ONLY | FE-SPLIT | TOOLING]
```

Include this surface analysis in the consolidation summary passed to `/code-simplifier`.
This lets the simplifier focus attention on the dominant surface without re-analyzing the diff.

Dimensional agent reports (if mode = DIMENSIONAL):

- `plans/reports/review-be-{date}.md` — BE findings
- `plans/reports/review-fe-logic-{date}.md` — FE-Logic findings
- `plans/reports/review-scss-{date}.md` — SCSS findings (if spawned)
- `plans/reports/synthesis-review-{date}.md` — Cross-boundary findings

All four (plus the UI-dimension `/review-ui` findings when frontend files changed) feed into the consolidation summary alongside steps 3–7 architectural findings.

### What runs sequentially (never parallelize)

| Step                                            | Why sequential                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-changes` (#1)                           | Establishes baseline — must run first                                                                                                                                                                                                                                  |
| `why-review` (#2)                               | Validates the `review-changes` findings before the batch — gates which findings the batch and fix cycle act on                                                                                                                                                         |
| `code-simplifier` (#8)                          | Modifies code — batch reviews pre-simplification state; self-reviews its own output via `/code-review` before returning                                                                                                                                                |
| `plan` → `plan-review` → `plan-execute` (#9–11) | Ordered validated fix-plan cycle — `/plan` consumes already-validated review findings; `/plan-review` reviews the fix plan's design (adversarial rationale pass + internal `/why-review --validate-findings` of its own findings) before `/plan-execute` implements it |

---

## Conditional Inline Re-Review Protocol (CRITICAL)

### Decision Logic

```
Reviews (steps 1-8) → ALL PASS (no findings)?
  YES → skip steps 9-12 (/plan//plan-review//plan-execute//review-changes), proceed to /docs-update (step 13) → /workflow-end → /watzup → DONE
  NO (findings exist) → /plan → /plan-review → /plan-execute → (if /plan-execute changed files) /review-changes INLINE re-review (step 12) → loop until clean
Note: /code-simplifier (step 8) self-reviews the code it changes via /code-review before returning — there is no separate workflow-level code-review step.
Note: /why-review runs ONCE (step 2) as a FINDINGS-VALIDATION gate over the /review-changes findings before the parallel batch. The fix plan's design rationale is reviewed by /plan-review (step 10) — which applies its own adversarial rationale pass and self-invokes /why-review --validate-findings on its own findings — so no separate post-plan-review /why-review step is needed.
```

### Conditional Inline Re-Review Gate (Step 12) — After `/plan-execute` Applies Fixes

1. **CONDITION (run only if /plan-execute changed files):** Step 12 runs ONLY when `/plan-execute` actually modified files (validated fixes were applied). If `/plan-execute` made no file changes — nothing was wrong, or the plan resolved to no-ops — SKIP step 12 entirely and proceed to `/docs-update`.
2. **DO** re-run the `/review-changes` protocol **INLINE in the main session** over the current full diff. Create a fresh task breakdown, rerun blast radius, risk detection, surface categorization, diff collection, dimensional reviews, synthesis, and validation gates. (Inline by design for this workflow — cheaper than spawning a fresh sub-agent; accept the mild orchestrator-confirmation-bias tradeoff, and counter it by re-reading the diff from scratch.)
3. **DO** track re-review invocation count and repeated blockers in conversation context
4. **DO** integrate the inline `/review-changes` findings — MUST NOT filter, reinterpret, or override
5. **IF** the inline re-review returns PASS with zero findings → first confirm every confirmed behavior-changing fix applied in this loop produced a new/updated §8 regression/preservation TC via `/spec [mode=tests]` (per "Spec enrichment per cycle" above); a behavior-changing fix that left no covering §8 TC is an OPEN finding — re-enter the loop to add it before proceeding. Only once spec enrichment is complete → proceed through `/docs-update` → `/workflow-end` → `/watzup` → DONE
6. **IF** the inline re-review returns FAIL and the same blocker has not repeated 3 times → validate findings, run `/plan` + `/plan-execute` again, then re-run `/review-changes` (step 12)
7. **IF** the same validated blocker repeats across 3 invocations with no observable progress → STOP and escalate via `AskUserQuestion` — do NOT silently loop or fall back to any prior protocol

### Iteration Tracking (Conversation-Scoped)

Iteration count is tracked **in conversation context only** — no persistent files. Each new conversation starts fresh at round 0.

**Rules:**

- **Repeated blocker cap** — if the same validated finding repeats for 3 full invocations with no progress, STOP and escalate via `AskUserQuestion` (manual review required)
- **PASS = done** — if no fix cycle happened, initial clean reviews/tests are enough; if a fix cycle happened, PASS requires a complete inline `/review-changes` re-review pass with zero findings
- **Issue count increasing** — if round N finds MORE issues than round N-1, STOP and escalate via `AskUserQuestion`
- **Goal Satisfaction FAIL = findings exist** — a required saved criterion at FAIL in the Goal Satisfaction matrix enters the SAME loop as a code finding: validate the gap is real → `/plan` → `/plan-execute` → inline re-review of the affected criteria only. Workflow end requires every required criterion PASS or BLOCKED with a user-facing escalation reason; mark criteria BLOCKED (never silently drop them) when two consecutive iterations show no criterion progress.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). Pass the same goal file reference to every child step; step 1 `/review-changes` emits the Goal Satisfaction matrix against the SAME saved criteria. After each fix cycle, append an Iteration Log entry to the goal file with evidence references.

### Flow Diagram

```
Main Session: Review → Validate findings → Plan → Fix (/plan-execute) → /review-changes re-review
                  │                                          │
                  │ (no issues)                              │ (only if /plan-execute changed files;
                  ↓                                          ↓  else skip to /docs-update)
            /docs-update                        /review-changes re-runs INLINE
            /workflow-end                       over the current full diff
            /watzup                                          │
            DONE ✓                                           ↓
                                                  Report → PASS? → DONE ✓
                                                         → FAIL? → Validate
                                                                 findings → Plan → Fix
                                                                 → /review-changes re-review
```

---

**IMPORTANT MANDATORY Steps:** /review-changes -> /why-review -> /review-architecture -> /review-domain-entities -> /performance-review -> /integration-test-review -> /security-review -> /code-simplifier -> /plan -> /plan-review -> /plan-execute -> /review-changes -> /docs-update -> /workflow-end -> /watzup

> **[STEP CONDITIONS]** Not every step always runs — the bare list above is the canonical order; these are the run-conditions:
>
> - **Step 4 `/review-domain-entities`** — only if domain entity files (Domain/, Entities/, ValueObjects/) are in the diff.
> - **Steps 9–11 `/plan` → `/plan-review` → `/plan-execute`** — only if reviews surfaced validated findings to fix (i.e. there are findings / code changes to make). Skip all three when steps 1–8 PASS clean.
> - **Step 12 `/review-changes` (re-review)** — only if `/plan-execute` actually changed files; re-runs INLINE and loops `/plan`→`/plan-execute`→`/review-changes` until a clean pass (3-repeat blocker cap).
> - **Steps 1–3, 5–8, 13–15** — always run.

> **[BLOCKING SEQUENCING]** Step 1 `/review-changes` is SEQUENTIAL and MUST run FIRST — it produces the baseline (surface analysis + integration-test/translation gap detection) consumed by all downstream reviewers, AND owns the UI review (invokes `/review-ui` internally via a ui-ux-designer sub-agent when the diff has frontend/UI files). Step 2 `/why-review` is SEQUENTIAL and runs immediately after — it validates the `/review-changes` findings (drops false positives) before any parallel reviewer spawns. Steps 3–7 (`/review-architecture`, `/review-domain-entities`, `/performance-review`, `/integration-test-review`, `/security-review`) form a PARALLEL BATCH — spawn all in ONE message via specialized `Agent` tool calls (`architect`, `code-reviewer`, `performance-optimizer`, `integration-tester`, `security-auditor`). Step 8 `/code-simplifier` is SEQUENTIAL and waits until ALL parallel batch sub-agents return + consolidation summary is built; it self-reviews the code it changes via `/code-review` (scoped to its own changed files) before returning, so there is no separate workflow-level code-review step. Steps 9+ proceed sequentially as listed.

> **[WORKFLOW-IN-WORKFLOW: MUST RUN AS SUB-AGENT when inside another workflow]** This skill activates the full `workflow-review-changes` workflow (15 steps). When invoked as a step inside a parent workflow (e.g., `workflow-feature`, `workflow-bugfix`, `workflow-refactor`), it MUST execute via `Agent` tool (`subagent_type: "code-reviewer"`) — NEVER as an inline `Skill` tool call. Inline execution absorbs 15 steps of context into the parent session.
>
> **Sub-agent prompt must include:** current git diff, feature/task description, instruction to return SYNC:subagent-return-contract summary and write full findings to `plans/reports/`.
>
> **Standalone invocation** (not inside a workflow): inline execution is fine — no sub-agent required.

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[CONDITIONAL INLINE RE-REVIEW]** After validated fixes in `/plan-execute` — and ONLY if `/plan-execute` changed files — re-run `/review-changes` INLINE (step 12) over the current full diff. If `/plan-execute` made no changes, skip step 12. Clean review passes with zero findings end the loop; repeated blockers stop after 3 no-progress invocations.
> **[REPEATED BLOCKER CAP]** Track re-review invocations in conversation context, not persistent files. After a fix cycle, PASS = a complete inline `/review-changes` re-review pass finds zero findings without more fixes; stop after the same blocker repeats 3 times with no progress.

Activate the `workflow-review-changes` workflow. Run `/start-workflow workflow-review-changes` with the user's prompt as context.

<!-- SYNC:parallel-phase-advancement -->

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude and Codex — neither depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `Agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Codex runs with no hooks and advances entirely by this rule.
>
> **Blocked until:** `- [ ]` all members spawned in one message `- [ ]` every member returned (incl. skipped conditional) `- [ ]` each member marked completed/skipped `- [ ]` mutating step deferred until after the barrier.

<!-- /SYNC:parallel-phase-advancement -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

> **Applicability in this workflow (reconciles with step 12):** the canonical block below is the general fresh-context mechanism. In `workflow-review-changes` the **step-12 post-fix re-review applies its _principle_ — zero memory, re-read the full diff from scratch, no self-filtering — INLINE in the main session** (the deliberate cost tradeoff documented at step 12), NOT via an isolated sub-agent. The isolated-sub-agent form below governs (a) the parallel dimensional reviewers in steps 3–7 (already sub-agents) and (b) the case where this entire workflow is invoked as a sub-agent inside a parent workflow. So "with isolated sub-agents **where applicable**" resolves to _inline_ for the step-12 self-re-review — no contradiction.

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
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
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure changed work reaches clean review through validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, validate findings, fix ONLY validated findings, then re-run `/review-changes` INLINE (only when `/plan-execute` changed files), looping plan→plan-execute→review-changes until one complete pass is clean.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each line is a signpost to its canonical body above; NEVER act on the digest alone, read the cited block):**

- **Parallel-Phase Advancement:** spawn batch in one message; advance only after all-return barrier.
- **End-to-Start Debugger Trace:** trace observed end state backward before fixing.
- **Fresh Context Re-Review:** restart full review post-fix; zero-memory re-read counters confirmation bias.
- **Incremental Persistence:** append findings to report file per item; never hold in memory.
- **Sub-Agent Return Contract:** return only the summary shape; full report on disk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** parent workflow row never replaces child phase tasks.
- **Task Tracking & External Report:** bootstrap task breakdown and report path before work.
- **Critical Thinking:** every claim needs traced proof; confidence >80% to act.
- **Project Reference Docs:** read required project-reference docs first; conventions override generic defaults.

**IMPORTANT MUST ATTENTION** run the sequence in order — step 1 `/review-changes` owns the baseline (surface analysis + UI review via internal `/review-ui` + integration-test/translation-sync/spec-drift gates), step 2 `/why-review` validates those findings BEFORE the parallel batch fires — so steps 3–7 act only on warranted findings — why: validating after fixing wastes the batch on false positives.
**IMPORTANT MUST ATTENTION** spawn the steps 3–7 read-only reviewers (`/review-architecture`, `/review-domain-entities` [if entity files], `/performance-review`, `/integration-test-review`, `/security-review`) ALL in ONE message and advance ONLY after EVERY member returns (all-return barrier) — defer mutating `/code-simplifier` (step 8) until the barrier clears — why: a code-mutating step must see the complete review snapshot, not a partial one.
**IMPORTANT MUST ATTENTION** every finding, recommendation, and verdict needs `file:line` proof or traced evidence + a confidence % — >80% act, 60–80% verify first, <60% DO NOT recommend; "Insufficient evidence" is valid output — why: speculation is forbidden output and silently encodes false positives into the fix plan.

**MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — create ALL 15 tasks immediately (source of truth = `workflows.json` → `review-changes.sequence`); mark one `in_progress`, mark `completed` immediately after each step's evidence; on context loss call `TaskList` first — never duplicate.
**MUST ATTENTION** grep 3+ existing patterns and read the target files BEFORE proposing any fix; cite `file:line` evidence in the fix plan — local conventions override generic framework defaults — why: closest example ≠ matching preconditions, verify shared base classes/scope/lifetime before copying.
**MUST ATTENTION** after fixes in `/plan-execute` (and ONLY if `/plan-execute` changed files), re-run `/review-changes` INLINE over the current full diff from Phase 0; re-read the diff from scratch to counter orchestrator confirmation bias — why: the main agent rationalizes findings about its own fixes; loop `/plan`→`/plan-execute`→`/review-changes` until clean.
**MUST ATTENTION** track full re-review invocations and repeated blockers in conversation context (session-scoped, no persistent files) — stop after the same blocker repeats 3 times with no progress and escalate via `AskUserQuestion`; STOP and escalate if round N finds MORE issues than round N-1 — never silently loop.
**MUST ATTENTION** PASS means one complete review pass finds zero blocking issues after all validated fixes and verification are included; a behavior-changing fix that left no covering §8 regression/preservation TC is an OPEN finding, NOT a clean pass — green tests do not normalize spec drift.
**MUST ATTENTION** skip steps 9–12 ONLY when all reviews PASS with zero findings (no fixes needed); mark conditional tasks `completed` with note "Skipped — all reviews passed" — NEVER consolidate, rename, or omit steps.
**MUST ATTENTION** adjudicate every behavior-vs-spec divergence in step 1 as CODE-WRONG (BLOCKING) / SPEC-STALE (spec is stale, `/docs-update` fixes spec first) / AMBIGUOUS (escalate) — NEVER silently pick a side; the workflow is NOT clean while any divergence stays unadjudicated.
**IMPORTANT MUST ATTENTION** each step MUST invoke its `Skill` tool — marking a task completed without invocation is a workflow violation; NEVER batch-complete validation gates — why: a skipped gate ships unreviewed work.
**IMPORTANT MUST ATTENTION** treat integration-test coverage gaps and multilingual UI translation gaps as mandatory `AskUserQuestion` user-decision gates — surface them, never silently pass when tests or locale updates are missing.
**IMPORTANT MUST ATTENTION** `/why-review` runs ONCE at step 2 as a FINDINGS-VALIDATION gate (drops false positives before the parallel batch); the fix-plan rationale check is owned by `/plan-review` (step 10), which self-invokes `/why-review --validate-findings` internally — no separate explicit step needed.
**IMPORTANT MUST ATTENTION** when invoked as a step inside a parent workflow, run this whole 15-step workflow via `Agent` (`subagent_type: "code-reviewer"`), NEVER inline — why: inline execution absorbs 15 steps of context into the parent session.
**IMPORTANT MUST ATTENTION** apply critical + sequential thinking — keep the SKEPTIC default when reviewing: steel-man rejected alternatives, invert each stated reason, stress-test top assumptions; section presence ≠ quality — why: certainty without evidence is the root of hallucination.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding/test/refactor must answer "does this make the next change cheaper?"; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) — reject best practices that raise change cost.

**Anti-Rationalization:**

| Evasion                                         | Rebuttal                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "Reviews look clean, skip `/why-review`"        | Step 2 validates findings BEFORE the batch — run it; a false positive entering the fix plan wastes 5 reviewers.    |
| "I already know what I fixed, skip re-review"   | Orchestrator confirmation bias — re-read the full diff from scratch INLINE; main-agent self-review is NOT enough.  |
| "Tests are green, the spec drift is fine"       | Green can encode the drift itself — adjudicate CODE-WRONG / SPEC-STALE; not clean until every divergence resolved. |
| "Mark the step done, the skill obviously ran"   | Marking completed without invoking the `Skill` tool is a workflow violation — show the invocation evidence.        |
| "Same blocker again, one more loop will fix it" | Cap at 3 no-progress repeats → escalate via `AskUserQuestion`; if issues increase round-over-round, STOP now.      |
| "Fix at the crash site, it's faster"            | Trace caller (wrong data) vs callee (wrong handling); fix at the responsible layer, never patch the symptom site.  |

---

**IMPORTANT MUST ATTENTION** step 1 `/review-changes` runs FIRST and owns the baseline; step 2 `/why-review` validates findings BEFORE the steps 3–7 parallel batch — spawn the batch in ONE message, advance only after the all-return barrier, defer `/code-simplifier` until it clears.
**IMPORTANT MUST ATTENTION** every finding/verdict needs `file:line` evidence + confidence (>80% act, <60% DO NOT recommend); grep 3+ patterns and read target files before any fix — no speculation.
**IMPORTANT MUST ATTENTION** after `/plan-execute` changes files, re-run `/review-changes` INLINE from scratch and loop until ONE clean zero-finding pass — a behavior change with no covering §8 TC is an OPEN finding; cap repeated blockers at 3 → escalate.
