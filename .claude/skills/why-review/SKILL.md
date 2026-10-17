---
name: why-review
version: 1.7.1
description: '[Code Quality] Use when a workflow step or the user asks for rationale evaluation or critical judgment of a decision, claim or statement: necessity, options, trade-offs. --validate-findings checks findings; --fix-loop fixes. Diffs: changes-review.'
---

## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Review whether the requested target is correct, evidence-backed and worth its trade-offs, so the caller can make a justified next decision.

**Summary:** Detect mode → load its owner → resolve target and goal → review → validate/reconcile findings → return verdict. Terminal validation returns immediately; opt-in fix-loop pairs validated fixes with fresh full review. Preserve report-only authority and material-decision handoff.

Judge future change cost; resolve target type before choosing the review path.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

- **STEP 1 — DETECT MODE FIRST:** terminal validation takes precedence; load its owner and return a verdict.
- **STEP 2 — FULL-MODE FIRST ACTION:** read `references/full-mode.md` in full, then plan its review tasks.
- **STEP 3 — RESOLVE TARGET:** resolve target, Goal Contract, project references and concern routes; read `references/code-change-path.md` when its Route References trigger holds (BLOCKING); honor the exact requested source/diff scope.
- **STEP 4 — REVIEW:** complete seven Anti-Bias checks, Trade-Off Gate, Validation Checklist and the Adversarial Analysis, plus the second adversarial pass when Round 1 found MEDIUM+ or the target is a one-way door; retain integration linkage's four-context deferral guard.
- **STEP 5 — VALIDATE FINDINGS:** any finding triggers terminal validation. Reconcile report defects in the current pass; unresolved evidence stays with the shared round owner. CLEAN validates the report; hand off retained target findings with severity, evidence and dual feedback.

<!-- FIX-LOOP-MODE:START -->
- `--fix-loop`: read [references/fix-loop.md](references/fix-loop.md) before execution. Standalone owns authorized fixes; `--loop-owner=caller` joins its caller's loop through a read-only validated pass. Terminal findings validation takes precedence.
<!-- FIX-LOOP-MODE:END -->

**Workflow:** detect mode → read active reference → execute its ordered review/validation steps → return evidence-backed verdict. Full mode returns its validated review report; terminal and report-only sub-agent contexts return those decisions to the caller.

## Contents

- [Quick Summary](#quick-summary)
- [Your Mission](#your-mission)
- [Review Mode (DETECT FIRST — recursion control)](#review-mode-detect-first--recursion-control)
- [Mode References (read at point of use — BLOCKING)](#mode-references-read-at-point-of-use--blocking)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mode (DETECT FIRST — recursion control)

Detect from `$ARGUMENTS` before any review work:

| Mode | Trigger | Execution |
| --- | --- | --- |
| **full** (default) | no `validate-findings` or `--fix-loop` token | Read the full-mode owner, execute Round 1 and, when it found MEDIUM+ or the target is a one-way door, the second adversarial pass, then the Findings Validation Gate when findings exist. Each report cycle has one terminal validation call; reconcile report defects within the same pass. |
| **validate-findings** | `--validate-findings`, `mode=validate-findings` or `validate findings in` | Read only the terminal validator reference, validate the supplied report, emit CLEAN / HAS ISSUES and return. TERMINAL — NEVER calls `/why-review`, runs the full gate, binds a loop, asks the user or spawns a sub-agent. |
| **fix-loop** (opt-in) | `$ARGUMENTS` contains `--fix-loop` AND no `validate-findings` token | Read fix-loop first; each round uses ordinary full mode INLINE without the flag. |

> **Recursion guard (NON-NEGOTIABLE):** `validate-findings` beats `--fix-loop`; terminal mode ignores the flag, never reads `references/full-mode.md` or `references/fix-loop.md`, and skips Task Bootstrap, Adversarial Rounds, full Validation Checklist, Next Steps and council. The full caller owns report reconciliation under the shared round policy; never delegate terminal validation to another reviewer.

> **Full-mode sub-agent callers (parallel, report-only):** applies when spawned, named a parallel/barrier member, or assigned a nested report-only occurrence. Keep the target read-only. Return evidenced trade-offs, supported remedy decisions and indispensable fact/authority gaps under `SYNC:review-decision-autonomy`; never call `ask user question tool`, Next Steps, `/llm-council` or the caller. Run your own terminal findings validation INLINE in this sub-agent context, without spawning another agent — unless the caller passed `--loop-owner=caller`: then hold each finding to the evidence bar inside the pass and make no separate terminal call; the caller validates its merged report once (`/start-workflow` → Workflow-step mode). Retain the caller’s spent rounds. A caller may pass `--fix-loop --loop-owner=caller`; return a read-only validated pass for its fixing coordinator.

## Mode References (read at point of use — BLOCKING)

- **Full mode (default):** your FIRST action after mode detection is to read `references/full-mode.md` in full (BLOCKING). It owns Task Bootstrap, target/concern routing, all review gates, report/output contract, reconciliation and Next Steps.
- **Full-mode route reference (BLOCKING; full mode only):** `references/code-change-path.md` — read in full when the target is a code change (commit, PR, diff, branch, uncommitted changes), holds integration/E2E tests, or is mixed or unresolved; `references/full-mode.md` → Route References is the trigger. It owns the Code-Change Review Path and the Integration-Test-Review Linkage.
- **Terminal `validate-findings`:** read `references/validate-findings.md` in full before validation. It owns every finding check, the ≥85% survival bar, dual spec/test feedback and CLEAN / HAS ISSUES output. Load neither full nor fix-loop mode.
- **`--fix-loop`:** read `references/fix-loop.md` first (BLOCKING), then read full-mode for each review pass. It owns fixed target, severity floor, round budget, material-fix decisions, fresh post-fix review and receipt issuance.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `behavioral-delta-matrix` — Before and after behavior table required before a bugfix review verdict; reviewing a bugfix plan or change → .claude/skills/shared/protocols/behavioral-delta-matrix.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `cross-stack-impact-trace` — Trace the changed area end to end across the client-server seam before judging files; starting a review of a diff that touches more than one tier → .claude/skills/shared/protocols/cross-stack-impact-trace.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-impact-analysis` — Optional blast-radius query that suggests files a high-risk change may affect, a hint that can be stale and never proof; assessing the impact of a high-risk change while the code graph exists → .claude/skills/shared/protocols/graph-impact-analysis.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:cross-stack-impact-trace:reminder -->

**MUST ATTENTION** FIRST review action — note change context + holistically trace full pipeline of main affected area across client↔server seam (BE→FE forward, FE→BE backward). Verify both tiers still agree on route/DTO/field/type/nullability/auth; any mismatch = BREAKING finding. Skip only for single-tier / docs-only changes (state so).

<!-- /SYNC:cross-stack-impact-trace:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review whether the requested target is correct, evidence-backed and worth its trade-offs, so the caller can make a justified next decision.

Resolve the target accurately: commit/PR/diff means code changes; “no active plan” applies only to an unresolved plan-rationale request. Protocol guides are discovery; read absent applicable full text before acting. Every emitted fresh reviewer prompt carries all 11 complete protocol bodies VERBATIM.

**IMPORTANT MUST ATTENTION Main steps:** detect mode → read active owner → execute every required gate → validate/reconcile report → hand off retained findings. Never suppress, demote or under-report a finding to avoid validation; CLEAN validates the report, not the target. A finding survives only with proof, a reachable trigger and ≥85% confidence. Behavioral findings retain spec verdict and mapped test-feedback action. Material decisions need their own confirmation before the next-step question and any PASS; terminal/sub-agent runs return them for caller escalation.

**IMPORTANT MUST ATTENTION** execute the review loop: any finding triggers terminal validation; reconcile report defects within the current pass, with unresolved evidence governed by the shared round budget. Preserve whole-target coverage and applicable rules; persist completed evidence across compaction and reopen it when source changes.

<!-- FIX-LOOP-MODE:START -->
- `--fix-loop`: read [references/fix-loop.md](references/fix-loop.md) before execution. Standalone owns authorized fixes; `--loop-owner=caller` joins its caller's loop through a read-only validated pass. Terminal findings validation takes precedence.
<!-- FIX-LOOP-MODE:END -->

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
