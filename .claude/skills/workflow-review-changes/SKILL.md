---
name: workflow-review-changes
version: 4.2.0
description: '[Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure changed work reaches clean review through an initial whole-target adversarial pass run in parallel with dimensional review, validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, fix only validated findings, then repeat the plan→plan-execute→changes-review loop until a complete pass is clean.

**Summary:**

- **Step 0 (FIRST ACTION, pre-sequence):** bind the self-recursive review loop — an always-on protocol loop you self-drive (the BINDING mechanism, hook/command-independent) PLUS, when available, a `/goal` Stop-hook gate as an optional accelerator — so the review→self-fix→whole-diff-re-review loop is unabandonable until it converges to a clean pass at that round's bar (zero findings in rounds 1-2; zero CRITICAL/HIGH/MEDIUM from round 3) — why: a soft "loop until clean" directive gets rationalized away after one fix cycle, and the protocol loop holds even where `/goal` is absent. Session-level wrapper, NOT one of the 20 canonical steps. ALWAYS runs — including as a step inside a parent workflow — because this workflow always runs INLINE in the main session (never a sub-agent), so it owns the loop directly in every case.
- **Initial parallel phase (steps 1–2, all-return barrier):** launch step 2 `/why-review --target=whole-review-target` as a fresh read-only `code-reviewer` sub-agent, then immediately run step 1 `/changes-review` INLINE while it is active. Step 1 owns the dimensional baseline (surface analysis, integration-test/translation/spec-drift gaps, internal UI review); step 2 independently reviews the WHOLE review target + current changes in FULL mode. Neither consumes the other's output. Advance only after BOTH return, then consolidate both reports.
- Step 3 `/why-review` validates the step-1 `/changes-review` findings to drop false positives BEFORE the specialist batch fires. The initial whole-target step 2 already validates its own findings through `/why-review`'s full-mode closing gate.
- Steps 4–10 (`/architecture-review`, `/domain-entities-review` [if entity files], `/performance-review`, `/integration-test-review`, `/security-review`, `/production-readiness-review`, `/ui-review` [if frontend files]) are read-only sub-agents: spawn ALL in ONE message and advance ONLY after every member returns (all-return barrier); the mutating `/code-simplifier` (step 11) waits until the barrier clears and self-reviews its own changes via `/code-review`. (`/ui-review` runs here as a DEDICATED conditional batch member AND still runs internally inside step 1's `/changes-review` — both by design; see the UI-review note below.)
- Fix cycle (steps 12–15 `/plan`→`/plan-review`→`/plan-execute`→`/changes-review`) runs ONLY when validated findings exist; the step-15 re-review runs ONLY if `/plan-execute` changed files, re-reading the full diff from scratch INLINE to counter orchestrator confirmation bias, and loops until the round's exit bar is clear — **zero findings in rounds 1-2, zero CRITICAL/HIGH/MEDIUM from round 3 (a LOW-only round ENDS the loop, deferred not fixed)** — bounded at **3 rounds MAX** (escalate via `AskUserQuestion` at whichever trips first: 2 no-progress repeats of the same blocker, or round 3 completing with CRITICAL/HIGH/MEDIUM still open — cap exhaustion escalates, never PASSes).
- **Step 16 `/why-review` (ALWAYS runs, FULL mode, standalone)** — near-final HOLISTIC review of the settled WHOLE target + current changes as ONE artifact. It remains mandatory even though step 2 uses the same lens at startup: step 2 finds whole-package risks early; step 16 proves the final post-fix state. On findings → re-enter `/plan`→`/plan-execute`→`/changes-review`, then re-run step 16 until a full-mode pass finds zero new findings (bounded by `/why-review`'s own review loop: max 2 re-dos / 3-repeat-blocker → escalate).
- `/docs-update` (step 18) ALWAYS runs and triages internally; SPEC-STALE drift verdicts from step 1 flow here to update the Feature Spec first — the workflow is NOT clean while any behavior-vs-spec divergence stays unadjudicated (green tests do not normalize drift).

**Sequence:** _(Step 0 pre-sequence: bind self-recursive review loop — protocol loop always, `/goal` accelerator when available)_ → **[initial parallel phase]** /changes-review (INLINE; owns dimensional/UI baseline) + `/why-review --target=whole-review-target` (fresh read-only sub-agent; FULL mode over the whole target) → /why-review (validate step-1 findings) → **[specialist parallel batch]** /architecture-review + /domain-entities-review (if entity changes) + /performance-review + /integration-test-review + /security-review + /production-readiness-review + /ui-review (if frontend changes) → /code-simplifier → /plan → /plan-review → /plan-execute → **`/changes-review` (conditional inline re-review)** → **`/why-review` (final HOLISTIC full-mode review of the settled WHOLE target)** → /scan --target=domain-entities → /docs-update → /workflow-end → /watzup

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION carry every unresolved finding or unaccepted risk into validation/fix planning; do not close until fixed or explicitly accepted.
- MUST ATTENTION include unresolved risk register, generated mirror drift, and spec/test/docs drift in the fresh review prompt when relevant.
- MUST ATTENTION launch the whole-target full-mode `/why-review` sub-agent before starting step 1 inline, then advance only after BOTH initial-phase members return; run step 3 `/why-review --validate-findings` on the step-1 findings before spawning the specialist reviewers.

- After `/plan-execute` applies validated fixes (and ONLY if `/plan-execute` changed files) → re-run `/changes-review` INLINE over the current full diff from the first phase; re-read the diff from scratch to counter orchestrator confirmation bias
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = one complete review pass finds zero blocking issues after all validated fixes and verification are included
- Repeated blockers are tracked in conversation context; stop after 2 no-progress full invocations of the same blocker

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

## Step 0 — Bind the Self-Recursive Review Loop (FIRST ACTION — pre-sequence; protocol-first, `/goal` optional)

> **MUST ATTENTION:** Before creating the 20 step tasks below, the VERY FIRST action is to BIND the self-recursive review loop so the session cannot end until the whole workflow loop converges to a clean zero-finding pass. Binding has TWO layers: (1) an **always-on protocol loop** you self-drive — the BINDING mechanism, hook/command-independent, in force on every host; and (2) an **optional `/goal` accelerator** — a mechanical Stop-hook block installed only WHEN the command is available. This is a session-level enforcement WRAPPER — NOT one of the 20 canonical `workflows.json` sequence steps, so it does NOT change the step count or the sequence; it makes the existing loop unabandonable.

**Entry gate:**

- **ALWAYS run** — whether this workflow is the top-level invocation (user ran `/start-workflow workflow-review-changes` or `/changes-review` routed here directly) OR a step inside a parent workflow (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`). Because this workflow always runs INLINE in the main session (never as a sub-agent — see the WORKFLOW-IN-WORKFLOW note), it owns the session Stop hook directly in every case, so the loop binds and enforces identically. There is no "deferred to parent" case.

**Procedure:**

**1. Protocol loop — ALWAYS binding (hook/command-independent).** This is the mechanism that actually holds the loop shut; it binds Claude, Codex, and Copilot equally, whether or not `/goal` exists. You yourself MUST NOT stop until the condition below holds:

> Run the initial parallel phase (`/changes-review` INLINE + `/why-review --target=whole-review-target` in a fresh sub-agent) to its all-return barrier → validate step-1 findings → run the specialist parallel reviewers + `/code-simplifier` → if validated findings exist, `/plan` → `/plan-execute` SELF-FIXES them → re-run `/changes-review` INLINE over the WHOLE current diff → loop until one complete pass clears the round's bar (rounds 1-2: zero findings; round 3+: zero CRITICAL/HIGH/MEDIUM, LOW-only ENDS the loop with the LOWs deferred) → run the final full-mode `/why-review` over the settled whole target → only then `/docs-update` → `/workflow-end`. Stop only when all required review passes are clean (or the same blocker repeats 3× with no progress → escalate via `AskUserQuestion`).

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If `/goal` is registered and permitted on this host, invoke it (the actual built-in command) with the same condition to add a mechanical Stop-hook block on top of the protocol loop:

```
/goal workflow-review-changes self-recursive loop: run the initial parallel phase (/changes-review INLINE + /why-review --target=whole-review-target in a fresh sub-agent) to its all-return barrier → validate step-1 findings → run the specialist parallel reviewers + /code-simplifier → if validated findings exist, /plan → /plan-execute SELF-FIXES them → re-run /changes-review INLINE over the WHOLE current diff → loop until one complete pass clears the round's bar (rounds 1-2: zero findings; round 3+: zero CRITICAL/HIGH/MEDIUM, a LOW-only round ENDS the loop with the LOWs recorded as deferred) → run the final full-mode /why-review over the settled whole target → only then /docs-update → /workflow-end. Stop only when all required review passes are clean (or the same blocker repeats 3× with no progress → escalate via AskUserQuestion).
```

The `/goal` Stop hook then blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** — record ONE line and proceed under the protocol loop (step 1), which is already binding; NEVER error, block, or fake a gate on its absence:

```
/goal accelerator unavailable — review loop bound by protocol (Step 0 step 1)
```

3. Then proceed to create the 20 step tasks below and run the sequence.

> **Why bind the loop on top of the loop prose:** the conditional re-review (step 15) and the "loop until clean" rules are soft directives an orchestrator can rationalize away after one fix cycle. The protocol loop converts them into a self-enforced invariant on every host; the optional `/goal` Stop hook adds a mechanical block, but correctness never depends on it.

## Mandatory Task Creation (ZERO TOLERANCE)

> **Step 0 first:** bind the Step 0 self-recursive review loop (above — protocol loop always, `/goal` accelerator when available) BEFORE creating these tasks — always, including when this workflow is a step inside a parent workflow, since it always runs inline in the main session and owns the loop directly.

Create one task per row in the table below — source of truth is `workflows.json` → `workflow-review-changes.sequence` (currently 20 steps; verify count matches if you suspect drift). The Step 0 loop binding is a pre-sequence wrapper and is NOT counted among these 20:

| #   | Task Subject                                                                                                                                             | Conditional?                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `[Workflow] /changes-review — Inline dimensional baseline, UI dimension, integration/translation/spec-drift checks` ⚡ **INITIAL PARALLEL PHASE**        | No — run INLINE while step 2's sub-agent is active                                                                                                                                        |
| 2   | `[Workflow] /why-review --target=whole-review-target — FULL-mode adversarial review of the WHOLE target + current changes` ⚡ **INITIAL PARALLEL PHASE** | No — launch first as a fresh read-only `code-reviewer` sub-agent; independent of step 1; barrier waits for both                                                                           |
| 3   | `[Workflow] /why-review — Validate the step-1 /changes-review findings before specialist reviewers run`                                                  | No — FINDINGS-VALIDATION gate over step-1 findings; step 2 self-validates its own findings                                                                                                |
| 4   | `[Workflow] /architecture-review — Architecture compliance review` ⚡ **SPECIALIST PARALLEL BATCH**                                                      | No — run as sub-agent in parallel with steps 5/6/7/8/9/10                                                                                                                                 |
| 5   | `[Workflow] /domain-entities-review — DDD quality review of changed domain entity files` ⚡ **SPECIALIST PARALLEL BATCH**                                | Yes — skip if no domain entity files in git diff                                                                                                                                          |
| 6   | `[Workflow] /performance-review — Performance analysis` ⚡ **SPECIALIST PARALLEL BATCH**                                                                 | No — run as sub-agent in parallel with steps 4/5/7/8/9/10                                                                                                                                 |
| 7   | `[Workflow] /integration-test-review — Test quality + change-coverage review` ⚡ **SPECIALIST PARALLEL BATCH**                                           | No — run as sub-agent in parallel with steps 4/5/6/8/9/10                                                                                                                                 |
| 8   | `[Workflow] /security-review — Security vulnerability review` ⚡ **SPECIALIST PARALLEL BATCH**                                                           | No — run as sub-agent in parallel with steps 4/5/6/7/9/10                                                                                                                                 |
| 9   | `[Workflow] /production-readiness-review — Read-only SRE readiness review` ⚡ **SPECIALIST PARALLEL BATCH**                                              | No — run as sub-agent in parallel with steps 4/5/6/7/8/10                                                                                                                                 |
| 10  | `[Workflow] /ui-review — UI/frontend quality review` ⚡ **SPECIALIST PARALLEL BATCH**                                                                    | Yes — skip if no frontend files; dedicated batch member and still runs internally inside step 1                                                                                           |
| 11  | `[Workflow] /code-simplifier — Simplify and refine code, then self-review its changes`                                                                   | No — runs after the specialist barrier                                                                                                                                                    |
| 12  | `[Workflow] /plan — Consolidate validated review findings into fix plan`                                                                                 | Conditional — only when validated findings exist                                                                                                                                          |
| 13  | `[Workflow] /plan-review — Review the fix plan and its rationale`                                                                                        | Conditional — only when a fix plan exists                                                                                                                                                 |
| 14  | `[Workflow] /plan-execute — Implement validated fixes from plan`                                                                                         | Conditional — only when validated findings exist                                                                                                                                          |
| 15  | `[Workflow] /changes-review — Conditional inline re-review after /plan-execute; loop until clean`                                                        | Skip if all reviews pass or `/plan-execute` changed no files                                                                                                                              |
| 16  | `[Workflow] /why-review — Final HOLISTIC full-mode review of the settled WHOLE target + changes`                                                         | Always run — preserves post-fix convergence; on findings re-enter steps 12–15, then re-run step 16                                                                                        |
| 17  | `[Workflow] /scan --target=domain-entities — Refresh the domain-entity reference catalog`                                                                | Conditional — run only when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence; otherwise complete with a cited skip reason |
| 18  | `[Workflow] /docs-update — Update impacted documentation`                                                                                                | Always run — triages internally                                                                                                                                                           |
| 19  | `[Workflow] /workflow-end — End workflow state`                                                                                                          | No                                                                                                                                                                                        |
| 20  | `[Workflow] /watzup — Post-workflow summary and final /understand handoff`                                                                               | No                                                                                                                                                                                        |

> **UI review runs in TWO places by design (keep both).** `/ui-review` runs BOTH (a) INTERNALLY inside step 1 (`/changes-review` invokes it as its UI dimension) AND (b) as a DEDICATED conditional specialist-batch member (step 10, `ui-ux-designer` sub-agent). Both are gated on the same trigger — frontend/UI files in the diff — so both are skipped when no frontend files changed. Create the step-10 `[Workflow] /ui-review` task (conditional) AND keep step 1's internal UI dimension; do NOT collapse them into one.

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` with note "Skipped — all reviews passed".

> **Integration Test Sync:** The `/changes-review` skill (task #1) includes a **mandatory** integration test coverage check for changed command/query/handler files. When gaps are found, the skill uses `AskUserQuestion` to surface them — NOT purely advisory. The user must explicitly choose to run `/integration-test` or confirm tests are already written. No silent skip.

> **Translation Sync:** The `/changes-review` skill (task #1) includes a **mandatory** multilingual UI translation-sync check. When UI text changes in multilingual projects without locale updates, the skill uses `AskUserQuestion` for an explicit user decision — NOT purely advisory.

> **Docs Update:** `/docs-update` (step 18) MUST run after EVERY review — it performs Phase 0 triage and fast-exits automatically when only non-business-code files changed (`.claude/**`, config). When business code is in the changeset, it WILL invoke: Phase 2 `/spec` (business feature doc update), Phase 2.5 `/spec-index [mode=index]` (derived bucket INDEX/ERD refresh — if `docs/specs/` bucket maintains a derived index; note: dirs may be app buckets or flat system folders — probe `ls docs/specs/{name}/` to find a specific service), Phase 2.6 `/tech-spec` when the derived technical view is affected, Phase 3 `/spec [mode=tests]` (test spec sync), Phase 4 `/spec [mode=sync]` (§8 TCs ↔ executing test code). Never skip based on review PASS status alone.

> **Spec Drift Adjudication:** The `/changes-review` skill (task #1) runs a **mandatory** spec-drift adjudication (`SYNC:spec-drift-adjudication`, per `shared/sdd-artifact-contract.md` → Drift Gates) for every behavior-changing file: it classifies each divergence between changed behavior and the canonical Feature Spec as **CODE-WRONG** (BLOCKING — fix the code/test against intended behavior), **SPEC-STALE** (the change is the new intent — the spec documents the old behavior), or **AMBIGUOUS** (escalate). The reviewer never silently picks a side. A **SPEC-STALE** verdict flows downstream: `/docs-update` (step 18) updates the Feature Spec FIRST via `/spec [update]`, then re-syncs `/spec [mode=tests]`. The workflow is NOT clean while any behavior-vs-spec divergence remains unadjudicated — green tests do not normalize drift (green can encode the drift itself).

> **Spec enrichment per cycle (MANDATORY — closes the feedback loop):** Every confirmed finding fixed in the loop (steps 12–15) that changed observable behavior MUST produce a new or updated §8 regression/preservation TC via `/spec [mode=tests]` before the workflow is clean — a code-only fix with no covering §8 TC is an INCOMPLETE cycle, not a clean pass. This applies to EVERY confirmed behavior-changing fix, not only SPEC-STALE drift verdicts or bugfix-workflow paths: a CODE-WRONG fix owes a regression TC describing the now-correct behavior; a behavior change owes a preservation/regression TC guarding the new behavior. So each recursive cycle ENRICHES the spec rather than only mutating code — the inline re-review (step 15) and the `/workflow-end` spec ↔ TDD-test sync gate both treat a behavior-changing fix that left no §8 TC as an open finding.

---

## Initial Parallel Phase (Steps 1–2) — EXECUTION PROTOCOL

Steps 1 and 2 are independent, read-only review lanes over the same starting state:

1. Launch `/why-review --target=whole-review-target` as a **fresh `code-reviewer` sub-agent** in FULL mode. Its target is the whole review target combined with the current changes — the complete changeset plus surrounding code/spec/docs — and it writes its report incrementally under `plans/reports/`.
2. Immediately run `/changes-review` **INLINE in the main session** while that sub-agent is active. It owns surface detection, dimensional review, the internal UI dimension, and integration/translation/spec-drift gates.
3. Treat the pair as one declared all-return barrier. Neither lane consumes or waits on the other's partial output. Advance only after BOTH return; then mark both tasks complete and consolidate both reports.
4. Run step 3 `/why-review --validate-findings` against the step-1 findings. Do not revalidate step 2's findings here because full-mode `/why-review` already owns its closing findings-validation gate.

This phase intentionally mixes one inline member with one sub-agent member: dispatch the sub-agent first, start the inline member immediately, and do not advance past the phase until both complete. The unique sequence token `why-review --target=whole-review-target` prevents the initial occurrence from being confused with the final plain `why-review` occurrence by workflow barrier renderers.

## Specialist Parallel Review Phase (Steps 4–10) — EXECUTION PROTOCOL

> **Note:** Steps 4–10 are the specialist reviewers — architecture compliance, DDD entities,
> performance, integration test quality, security vulnerabilities, production readiness, and
> UI/frontend quality (`/ui-review`, conditional on frontend files). They run as workflow-level
> parallel sub-agents, separate from the DIMENSIONAL review (BE/FE/SCSS/Synthesis + UI dimension)
> that runs INSIDE Step 1 (`/changes-review`).
> **`/ui-review` runs in TWO places by design (keep both):** (a) INTERNALLY inside Step 1 as
> `/changes-review`'s UI dimension, AND (b) here as the DEDICATED step-10 batch member
> (`ui-ux-designer` sub-agent). Both fire only when the diff has files matching the project's
> configured frontend/UI file patterns; both are skipped otherwise.

Steps 4–10 (`/architecture-review`, `/domain-entities-review`, `/performance-review`, `/integration-test-review`, `/security-review`, `/production-readiness-review`, `/ui-review`) are **read-only** and **independent** — no shared mutable state, no ordering dependency between them. Run them as parallel sub-agents to preserve main session context budget and reduce wall-clock time.

### Why parallel?

Each reviewer reads the git diff independently and analyzes one concern. Sequential execution would burn 50K+ tokens in the main session absorbing all seven inline. The `stepMeta` in `workflows.json` marks all seven as `executionMode: subagent, contextBudget: high` — dispatch each as a sub-agent per the model-driven advancement rule (no hook emits a `💡 [SUB-AGENT RECOMMENDED]` hint).

> **UI review runs in TWO places by design (keep both).** `/changes-review` (step 1) invokes `/ui-review` internally as its dimensional-batch UI dimension when frontend files changed, AND step 10 spawns `/ui-review` again as a DEDICATED conditional member of THIS specialist phase. Both fire only when frontend/UI files are in the diff; both are skipped otherwise.

### Execution: spawn in one message

After the initial steps 1–2 barrier clears and step 3 validates the step-1 findings, spawn all active specialist reviewers in **a single response** with multiple `Agent` tool calls:

```
Agent(architecture-review, subagent_type="architect", ...)           ← all in ONE message
Agent(domain-entities-review, subagent_type="code-reviewer", ...)    ← only if entity files in diff
Agent(performance-review, subagent_type="performance-optimizer", ...)
Agent(integration-test-review, subagent_type="integration-tester", ...)
Agent(security-review, subagent_type="security-auditor", ...)
Agent(production-readiness-review, subagent_type="code-reviewer", ...)  ← read-only SRE findings/score mode
Agent(ui-review, subagent_type="ui-ux-designer", ...)                ← only if frontend/UI files in diff
```

Each sub-agent receives:

- The baseline summary from step 1 (what changed, integration test gaps found)
- Instruction to write report to `plans/reports/{skill}-{date}-{slug}.md`
- Full review protocols per `SYNC:review-protocol-injection` (verbatim in prompt — never by file reference)

### State advancement after parallel batch (model-driven — PRIMARY)

Advancement here is **model-driven** — your responsibility against the task list, NOT a hook/tool signal. This is the same rule the universal context files carry ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md), so the batch advances identically under Claude and Codex. The shared kernel is the canonical **`SYNC:parallel-phase-advancement`** block consolidated at the end of this skill — its barrier rule governs this batch: declare the group up-front; spawn ALL members in ONE message; advance ONLY after EVERY member returns (a skipped conditional member counts as "returned"); a sub-agent return advances a step IDENTICALLY to an inline call; defer the mutating `/code-simplifier` step until the barrier clears; hooks are accelerators only.

**Applied to this workflow's specialist batch** — after ALL parallel reviewers (steps 4–10) have returned:

1. `TaskUpdate` step 4 → `completed`
2. `TaskUpdate` step 5 → `completed` (or "Skipped — no entity files" if the conditional `domain-entities-review` member did not run — a skipped conditional counts as "returned")
3. `TaskUpdate` step 6 → `completed`
4. `TaskUpdate` step 7 → `completed`
5. `TaskUpdate` step 8 → `completed`
6. `TaskUpdate` step 9 (`/production-readiness-review`) → `completed`
7. `TaskUpdate` step 10 (`/ui-review`) → `completed` (or "Skipped — no frontend/UI files" if the conditional `ui-review` member did not run — a skipped conditional counts as "returned")
8. Read all sub-agent report files; synthesize findings into a combined review summary
9. Proceed to step 11 (`/code-simplifier`) sequentially — only after the barrier above (it is a code-mutating step and must see the complete review snapshot)

> **Advancement here is model-driven.** This sub-agent batch advances only after every member returns (the all-return barrier) — no step-tracking hook advances it. Claude and Codex both rely entirely on this rule.

### Consolidation before /code-simplifier

Before running `/code-simplifier`, synthesize all parallel sub-agent findings:

- List all Critical/High/Medium/Low findings across all 7 reports (plus the UI-dimension findings folded into step 1's report when frontend files changed)
- Note any conflicts between reviewers (same file, different concerns)
- Pass this summary to `/code-simplifier` as context so simplification is informed by review findings

**Surface Analysis from Step 1:**

Step 1 (`/changes-review`) now emits a surface analysis summary in its report:

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

All four (plus the UI-dimension `/ui-review` findings when frontend files changed) feed into the consolidation summary alongside the step-2 whole-target report and steps 4–10 specialist findings (including the dedicated step-10 `/ui-review` pass).

### What runs sequentially (never parallelize)

| Step                                             | Why sequential                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `why-review` (#3)                                | Validates the step-1 findings after the initial all-return barrier and before the specialist batch                                           |
| `code-simplifier` (#11)                          | Modifies code — specialist batch reviews pre-simplification state; self-reviews its own output via `/code-review` before returning           |
| `plan` → `plan-review` → `plan-execute` (#12–14) | Ordered validated fix-plan cycle — `/plan` consumes already-validated findings and `/plan-review` reviews the fix plan before implementation |
| `why-review` (#16)                               | Final HOLISTIC standalone review — runs in FULL mode over the settled WHOLE target after the step-15 loop converges                          |

---

## Conditional Inline Re-Review Protocol (CRITICAL)

### Decision Logic

```
Reviews (steps 1-11) → ALL PASS (no findings)?
  YES → skip steps 12-15 (/plan → /plan-review → /plan-execute → /changes-review), proceed to final /why-review HOLISTIC full-mode pass (step 16) → /scan --target=domain-entities (step 17, conditional — run on entity/DTO/schema changes, else complete with a cited skip reason) → /docs-update (step 18) → /workflow-end → /watzup → DONE
  NO (findings exist) → /plan → /plan-review → /plan-execute → (if /plan-execute changed files) /changes-review INLINE re-review (step 15) → loop until clean at the round's bar (rounds 1-2: zero findings; round 3+: zero CRITICAL/HIGH/MEDIUM) → final /why-review HOLISTIC full-mode pass (step 16)
Step 16 (ALWAYS): /why-review FULL mode over the settled WHOLE target + changes. If it finds new BLOCKING findings → re-enter /plan → /plan-execute → /changes-review, then re-run step 16; loop until clean at the round's bar (round 3+ ignores LOW-only) → /scan --target=domain-entities (step 17, conditional) → /docs-update (step 18).
Note: /code-simplifier (step 11) self-reviews the code it changes via /code-review before returning.
Note: /why-review has three workflow occurrences: step 2 FULL mode on the whole starting target in parallel with step 1; step 3 `--validate-findings` mode over step-1 findings; step 16 FULL mode over the settled post-fix target. Steps 2 and 16 share a lens but observe different states, while step 3 is a terminal findings-validation gate.
```

### Conditional Inline Re-Review Gate (Step 15) — After `/plan-execute` Applies Fixes

1. **CONDITION (run only if /plan-execute changed files):** Step 15 runs ONLY when `/plan-execute` actually modified files. If `/plan-execute` made no file changes, SKIP step 15 and proceed to the step-16 holistic `/why-review`, then `/docs-update`.
2. **DO** re-run the `/changes-review` protocol **INLINE in the main session** over the current full diff. Create a fresh task breakdown, rerun blast radius, risk detection, surface categorization, diff collection, dimensional reviews, synthesis, and validation gates. (Inline by design for this workflow — cheaper than spawning a fresh sub-agent; accept the mild orchestrator-confirmation-bias tradeoff, and counter it by re-reading the diff from scratch.)
3. **DO** track re-review invocation count and repeated blockers in conversation context
4. **DO** integrate the inline `/changes-review` findings — MUST NOT filter, reinterpret, or override
5. **IF** the inline re-review clears the round's bar — PASS with zero findings (rounds 1-2), or zero CRITICAL/HIGH/MEDIUM with only LOW findings left (round 3+, recorded as deferred) → confirm every behavior-changing fix has its required §8 regression/preservation TC, then proceed to the step-16 holistic `/why-review`; after it is clean, continue to `/docs-update` → `/workflow-end` → `/watzup`.
6. **IF** the inline re-review returns FAIL on a BLOCKING finding (any severity in rounds 1-2; CRITICAL/HIGH/MEDIUM from round 3) and the same blocker has not repeated 3 times → validate findings, run `/plan` + `/plan-execute` again, then re-run `/changes-review` (step 15)
7. **IF** the same validated blocker repeats across 3 invocations with no observable progress → STOP and escalate via `AskUserQuestion` — do NOT silently loop or fall back to any prior protocol

> **Loop-binding tie-in:** the Step 0 protocol loop (and the `/goal` gate when available) stays OPEN until this loop reaches a clean zero-finding pass (or a 3-repeat blocker escalates). The session cannot stop with a validated finding still unfixed by `/plan-execute` or a non-clean re-review outstanding — this binds on every host, whether or not `/goal` is installed. Each re-review reviews the WHOLE current diff from the first phase combined with ALL prior fixes — never just the previous cycle's fix in isolation. (This applies in every case — including when this workflow is a step inside a parent workflow — because it always runs inline in the main session and owns the loop directly.)

> **Specialist finding re-entry (steps 4–10) — DEFAULT is re-run the raising specialist, NOT holistic-only.** The step-15 inline `/changes-review` re-runs only its own BE/FE/SCSS/UI dimensions; it does NOT re-run the specialist reviewers that ran once at steps 4–10. A specialist finding fixed in this cycle MUST therefore receive a scoped re-run of the specialist that raised it. The final step-16 `/why-review` alone may substitute only with explicit written justification. A step-10 UI finding may close on step 15's internal UI dimension because that lens is intentionally duplicated.

### Final Holistic Why-Review Gate (Step 16) — Standalone Full-Mode Review of the Settled Whole Target (ALWAYS RUNS)

> **Why this step remains after the new initial whole-target pass:** step 2 reviews the starting state early, in parallel with dimensional review. Any simplification or fix invalidates that verdict. Step 16 applies the same holistic adversarial lens to the settled final state, so parallelizing discovery does not weaken post-fix convergence.

1. **CONDITION:** ALWAYS run after the step-15 `/changes-review` loop converges or is skipped because no fixes were needed.
2. **MODE:** Invoke `/why-review` in **FULL mode** — pass the review target + the current changes as the target (e.g. `/why-review the whole <feature/diff/target> combined with the current changes`). MUST NOT use `--validate-findings` here (that mode is terminal and only re-checks an existing findings list — it would NOT perform the holistic review this step requires).
3. **SCOPE:** "the whole review target combined with current changes" = the complete changeset AND the surrounding code/spec/docs it touches, reviewed as ONE artifact — not a per-file or per-finding pass. `/why-review` runs its full Validation Checklist + both Adversarial Rounds + Easy-to-Change gate, then validates its own findings via its internal closing gate.
4. **LOOP (run → fix → run until no findings):** If step 16 surfaces ANY new finding, validate it, re-enter `/plan` → `/plan-execute` → `/changes-review` (step 15 loop), then RE-RUN step 16 until a complete pass finds zero new findings.
5. **INLINE INSIDE A PARENT WORKFLOW:** step 16 runs in the main session as part of this 20-step workflow; only the distinct step-2 initial whole-target occurrence is delegated as a sub-agent.
6. **ONLY THEN** proceed to the conditional `/scan --target=domain-entities` (step 17), then `/docs-update` (step 18).

### Iteration Tracking (Conversation-Scoped)

Iteration count is tracked **in conversation context only** — no persistent files. Each new conversation starts fresh at round 0.

**Rules:**

- **Repeated blocker cap** — if the same validated finding repeats for 2 full invocations with no progress, STOP and escalate via `AskUserQuestion` (manual review required)
- **PASS = done** — if no fix cycle happened, initial clean reviews/tests are enough; if a fix cycle happened, PASS requires a complete inline `/changes-review` re-review pass clearing the round's bar: zero findings (rounds 1-2) or zero CRITICAL/HIGH/MEDIUM with deferred LOWs listed (round 3+)
- **Severity floor — from round 3, LOW stops blocking.** Rounds 1-2 of the fix loop converge on a **zero-finding** pass at any severity. **From round 3 the bar is zero validated CRITICAL/HIGH/MEDIUM — a re-review round whose validated findings are ALL LOW ENDS the loop.** Do NOT open another `/plan`→`/plan-execute`→`/changes-review` round for LOW findings alone: record every remaining LOW under `## Deferred LOW Findings (severity floor, round ≥3)` in the report and proceed to step 16. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (a failing test is a failure, not a LOW finding). Severity tiers per `SYNC:severity-rubric`.
- **Issue count increasing** — if round N finds MORE issues than round N-1, STOP and escalate via `AskUserQuestion`
- **Goal Satisfaction FAIL = findings exist** — a required saved criterion at FAIL in the Goal Satisfaction matrix enters the SAME loop as a code finding: validate the gap is real → `/plan` → `/plan-execute` → inline re-review of the affected criteria only. Workflow end requires every required criterion PASS or BLOCKED with a user-facing escalation reason; mark criteria BLOCKED (never silently drop them) when two consecutive iterations show no criterion progress.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). Pass the same goal file reference to every child step; step 1 `/changes-review` emits the Goal Satisfaction matrix against the SAME saved criteria. After each fix cycle, append an Iteration Log entry to the goal file with evidence references.

### Flow Diagram

```
Initial phase: /changes-review INLINE + whole-target /why-review sub-agent → all-return barrier
                                ↓
Main Session: Validate findings → Specialist batch → Plan → Fix → /changes-review re-review
                  │                                          │
                  │ (no issues)                              │ (only if /plan-execute changed files;
                  ↓                                          ↓  else skip to holistic /why-review)
       /why-review HOLISTIC (step 16)          /changes-review re-runs INLINE
       full-mode review of WHOLE target         over the current full diff
                  │                                          │
       new findings? ── yes ──┐                              ↓
                  │ no        │                    Report → PASS? → /why-review HOLISTIC (step 16)
                  ↓           └─→ Validate → Plan → Fix → /changes-review → (re-run step 16)
            /docs-update                  → FAIL? → Validate findings → Plan → Fix
            /workflow-end                          → /changes-review re-review
            /watzup
            DONE ✓
```

---

**IMPORTANT MANDATORY Steps:** /changes-review -> /why-review --target=whole-review-target -> /why-review -> /architecture-review -> /domain-entities-review -> /performance-review -> /integration-test-review -> /security-review -> /production-readiness-review -> /ui-review -> /code-simplifier -> /plan -> /plan-review -> /plan-execute -> /changes-review -> /why-review -> /scan --target=domain-entities -> /docs-update -> /workflow-end -> /watzup

> **[STEP CONDITIONS]** Not every step always runs — the bare list above is the canonical order; these are the run-conditions:
>
> - **Step 0 loop binding (pre-sequence)** — ALWAYS bind the self-recursive review loop. Not one of the 20 counted steps.
> - **Steps 1–2 initial phase** — always run together behind one all-return barrier; step 1 is inline, step 2 is a fresh read-only sub-agent in FULL mode over the whole review target.
> - **Step 5 `/domain-entities-review`** — only if domain entity files are in the diff.
> - **Step 10 `/ui-review`** — only if frontend/UI files are in the diff; it also runs internally inside step 1.
> - **Steps 12–14 `/plan` → `/plan-review` → `/plan-execute`** — only if validated findings require fixes. Skip all three when steps 1–11 PASS clean.
> - **Step 15 `/changes-review` (re-review)** — only if `/plan-execute` changed files; loops until clean within the existing bounds.
> - **Step 16 `/why-review` (HOLISTIC, FULL mode)** — ALWAYS runs over the settled whole target after step 15 converges or is skipped.
> - **Step 17 `/scan --target=domain-entities`** — only if the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence; otherwise complete it with a cited skip reason.
> - **Steps 1–4, 6–9, 11, 16, 18–20** — always run.

> **[BLOCKING SEQUENCING]** Launch step 2 `/why-review --target=whole-review-target` as a fresh `code-reviewer` sub-agent, then immediately run step 1 `/changes-review` inline; advance only after both return. Step 3 validates step-1 findings. Steps 4–10 form the specialist parallel batch. Step 11 `/code-simplifier` waits for that barrier. Steps 12–15 are the sequential fix/re-review cycle. Step 16 is the final FULL-mode whole-target gate, followed by the conditional step 17 `/scan --target=domain-entities` and step 18 `/docs-update`.

> **[WORKFLOW-IN-WORKFLOW: MUST RUN INLINE IN THE MAIN SESSION — never as a sub-agent]** This skill activates the full `workflow-review-changes` workflow (20 steps). When invoked inside a parent workflow, the orchestrator stays INLINE in the main session. Its step-2 whole-target reviewer is still a child sub-agent, as declared by the initial parallel phase.
>
> **Why inline, never a sub-agent:** the workflow orchestrator owns Step 0's session loop and the step-15 live-working-tree re-review. Delegating the orchestrator would lose those guarantees. Context remains bounded because the initial step-2 whole-target reviewer and steps 4–10 specialists are child sub-agents writing full reports to `plans/reports/`.
>
> **Standalone invocation** (not inside a workflow): inline in the main session, identically — no sub-agent.

> **[BLOCKING]** Each step MUST invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[CONDITIONAL INLINE RE-REVIEW]** After validated fixes in `/plan-execute` — and ONLY if files changed — re-run `/changes-review` INLINE (step 15). Either way, step 16 `/why-review` ALWAYS runs next over the settled whole target before `/docs-update`.
> **[REPEATED BLOCKER CAP]** Track re-review invocations in conversation context, not persistent files. After a fix cycle, PASS = a complete inline `/changes-review` re-review pass finds zero findings without more fixes; stop after the same blocker repeats 3 times with no progress.

Activate the `workflow-review-changes` workflow. Run `/start-workflow workflow-review-changes` with the user's prompt as context.

> **Applicability in this workflow:** step 15 applies fresh-context re-review principles INLINE by re-reading the full diff from scratch. The isolated-sub-agent form governs the initial step-2 whole-target reviewer and steps 4–10 specialists; the workflow orchestrator itself always remains inline.

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
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **rounds 1-2** → zero findings at any severity; **round 3+** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop (list those LOWs as deferred instead of spawning another round). If the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure changed work reaches clean review through validated findings, verified fixes, full re-review, and synchronized docs/tests — review all uncommitted changes, validate findings, fix ONLY validated findings, then re-run `/changes-review` INLINE (only when `/plan-execute` changed files), looping plan→plan-execute→changes-review until one complete pass clears the round's bar — **zero findings in rounds 1-2, zero CRITICAL/HIGH/MEDIUM from round 3 (LOW-only ENDS the loop, deferred not fixed)**.

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
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** launch step 2's whole-target FULL-mode `/why-review` as a fresh sub-agent, immediately run step 1 `/changes-review` inline, and advance only after BOTH return; then step 3 validates step-1 findings before the specialist batch.
**IMPORTANT MUST ATTENTION** spawn the steps 4–10 specialist reviewers ALL in ONE message and advance ONLY after EVERY member returns; defer mutating `/code-simplifier` (step 11) until the barrier clears.
**IMPORTANT MUST ATTENTION** every finding, recommendation, and verdict needs `file:line` proof or traced evidence + a confidence % — >80% act, 60–80% verify first, <60% DO NOT recommend; "Insufficient evidence" is valid output — why: speculation is forbidden output and silently encodes false positives into the fix plan.

**MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — create ALL 20 tasks immediately (source of truth = `workflows.json` → `workflow-review-changes.sequence`); mark one `in_progress`, mark `completed` immediately after each step's evidence; on context loss call `TaskList` first — never duplicate.
**MUST ATTENTION** grep 3+ existing patterns and read the target files BEFORE proposing any fix; cite `file:line` evidence in the fix plan — local conventions override generic framework defaults — why: closest example ≠ matching preconditions, verify shared base classes/scope/lifetime before copying.
**MUST ATTENTION** after fixes in `/plan-execute` (and ONLY if `/plan-execute` changed files), re-run `/changes-review` INLINE over the current full diff from Phase 0; re-read the diff from scratch to counter orchestrator confirmation bias — why: the main agent rationalizes findings about its own fixes; loop `/plan`→`/plan-execute`→`/changes-review` until clean at that round's bar — from round 3 a LOW-only re-review is clean, so never spin another round for LOW findings alone.
**MUST ATTENTION** track full re-review invocations and repeated blockers in conversation context (session-scoped, no persistent files) — stop after the same blocker repeats 3 times with no progress and escalate via `AskUserQuestion`; STOP and escalate if round N finds MORE issues than round N-1 — never silently loop.
**MUST ATTENTION** PASS means one complete review pass finds zero blocking issues after all validated fixes and verification are included; a behavior-changing fix that left no covering §8 regression/preservation TC is an OPEN finding, NOT a clean pass — green tests do not normalize spec drift.
**MUST ATTENTION** skip steps 12–15 ONLY when all reviews PASS with zero findings (or, from round 3, with only deferred LOW findings left); step 16 `/why-review` is never skippable and proves the settled post-fix target.
**MUST ATTENTION** step 16 runs `/why-review` STANDALONE in FULL mode over the settled WHOLE review target; if it surfaces BLOCKING findings, re-enter `/plan`→`/plan-execute`→`/changes-review` and re-run step 16 until clean at that round's bar (round 3+ treats a LOW-only result as clean).
**MUST ATTENTION** adjudicate every behavior-vs-spec divergence in step 1 as CODE-WRONG (BLOCKING) / SPEC-STALE (spec is stale, `/docs-update` fixes spec first) / AMBIGUOUS (escalate) — NEVER silently pick a side; the workflow is NOT clean while any divergence stays unadjudicated.
**IMPORTANT MUST ATTENTION** each step MUST invoke its `Skill` tool — marking a task completed without invocation is a workflow violation; NEVER batch-complete validation gates — why: a skipped gate ships unreviewed work.
**IMPORTANT MUST ATTENTION** treat integration-test coverage gaps and multilingual UI translation gaps as mandatory `AskUserQuestion` user-decision gates — surface them, never silently pass when tests or locale updates are missing.
**IMPORTANT MUST ATTENTION** `/why-review` has three occurrences: step 2 FULL-mode whole-target startup review in parallel with step 1; step 3 terminal validation of step-1 findings; step 16 FULL-mode whole-target final review after convergence.
**IMPORTANT MUST ATTENTION** when invoked inside a parent workflow, run this whole 20-step workflow INLINE in the main session; only its declared child reviewers (step 2 and steps 4–10) run as sub-agents.
**IMPORTANT MUST ATTENTION** apply critical + sequential thinking — keep the SKEPTIC default when reviewing: steel-man rejected alternatives, invert each stated reason, stress-test top assumptions; section presence ≠ quality — why: certainty without evidence is the root of hallucination.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding/test/refactor must answer "does this make the next change cheaper?"; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) — reject best practices that raise change cost.

**Anti-Rationalization:**

| Evasion                                                | Rebuttal                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Reviews look clean, skip `/why-review`"               | Step 2 validates findings BEFORE the batch — run it; a false positive entering the fix plan wastes 7 reviewers.                                         |
| "The initial whole-target review passed, skip step 16" | Step 2 reviewed the starting state; step 16 must prove the settled post-fix state.                                                                      |
| "Step 16 can reuse `--validate-findings`"              | No — terminal validation only re-checks an existing findings list; step 16 must run FULL mode over the whole target.                                    |
| "I already know what I fixed, skip re-review"          | Orchestrator confirmation bias — re-read the full diff from scratch INLINE; main-agent self-review is NOT enough.                                       |
| "Tests are green, the spec drift is fine"              | Green can encode the drift itself — adjudicate CODE-WRONG / SPEC-STALE; not clean until every divergence resolved.                                      |
| "Mark the step done, the skill obviously ran"          | Marking completed without invoking the `Skill` tool is a workflow violation — show the invocation evidence.                                             |
| "Same blocker again, one more loop will fix it"        | Cap at 2 no-progress repeats AND 3 rounds MAX → escalate via `AskUserQuestion` at whichever trips first; if issues increase round-over-round, STOP now. |
| "Round 4 turned up two more nits, loop again"          | From round 3 the severity floor ends the loop on a LOW-only round — defer and list those LOWs; only CRITICAL/HIGH/MEDIUM buys another round.            |
| "Fix at the crash site, it's faster"                   | Trace caller (wrong data) vs callee (wrong handling); fix at the responsible layer, never patch the symptom site.                                       |

---

**IMPORTANT MUST ATTENTION** Step 0 binds the self-recursive review loop before the 20-step sequence; the workflow orchestrator always runs inline in the main session.
**IMPORTANT MUST ATTENTION** steps 1–2 form the initial all-return barrier (`/changes-review` inline + whole-target `/why-review` sub-agent); step 3 validates step-1 findings; steps 4–10 form the specialist barrier; `/code-simplifier` waits until it clears.
**IMPORTANT MUST ATTENTION** every finding/verdict needs `file:line` evidence + confidence (>80% act, <60% DO NOT recommend); grep 3+ patterns and read target files before any fix — no speculation.
**IMPORTANT MUST ATTENTION** after `/plan-execute` changes files, re-run `/changes-review` INLINE from scratch and loop until ONE clean pass at the round's bar — **zero findings in rounds 1-2, zero CRITICAL/HIGH/MEDIUM from round 3 (a LOW-only round ENDS the loop; list the LOWs as deferred)** — a behavior change with no covering §8 TC is an OPEN finding at HIGH, never a deferrable LOW; bounded at 3 rounds MAX with repeated blockers capped at 2 → escalate at whichever trips first, never PASS on cap exhaustion.
