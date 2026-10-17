---
name: workflow-review-changes
version: 5.0.0
description: '[Workflow] Use when reviewing a pull request or changes that are complex, risky or cross-module and need specialist reviewers: reviews, applies validated fixes, re-reviews. Defaults to --fix-loop; --review-only reports. Simple PR: changes-review.'
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-review-changes` together with this skill. Call [`/start-workflow workflow-review-changes`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `review-only`: [`/changes-review --defer=whole-target,specialists,tests,entities --review-only`](../changes-review/SKILL.md) (gate) → [`/why-review --target=whole-review-target --review-only`](../why-review/SKILL.md) (core) → [`/architecture --mode=review --review-only`](../architecture/SKILL.md) (optional; conditional) → [`/domain-analysis --mode=review --review-only`](../domain-analysis/SKILL.md) (optional; conditional) → [`/performance-review --review-only`](../performance-review/SKILL.md) (optional; conditional) → [`/integration-test --mode=review --prove-tests --review-only`](../integration-test/SKILL.md) (gate) → [`/security-audit --review-only`](../security-audit/SKILL.md) (optional; conditional) → [`/production-readiness-review --review-only`](../production-readiness-review/SKILL.md) (optional; conditional) → [`/ui-design --mode=review --review-only`](../ui-design/SKILL.md) (optional; conditional) → [`/ai-engineering-review --review-only`](../ai-engineering-review/SKILL.md) (optional; conditional) → [`/experience-review --review-only`](../experience-review/SKILL.md) (optional; conditional) → [`/why-review --validate-findings`](../why-review/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (optional; conditional) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Review (12; exit review-converged, tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:review-only fingerprint:2dafcd8d8ef1c1610bd60517125e16cc64bcc51a2b93c557cf4c4a28a7ae4aca -->
- Mode `fix-loop`: [`/changes-review --defer=whole-target,specialists,tests,entities --fix-loop --loop-owner=caller`](../changes-review/SKILL.md) (gate) → [`/why-review --target=whole-review-target --fix-loop --loop-owner=caller`](../why-review/SKILL.md) (core) → [`/architecture --mode=review --fix-loop --loop-owner=caller`](../architecture/SKILL.md) (optional; conditional) → [`/domain-analysis --mode=review --fix-loop --loop-owner=caller`](../domain-analysis/SKILL.md) (optional; conditional) → [`/performance-review --fix-loop --loop-owner=caller`](../performance-review/SKILL.md) (optional; conditional) → [`/integration-test --mode=review --prove-tests --fix-loop --loop-owner=caller`](../integration-test/SKILL.md) (gate) → [`/security-audit --fix-loop --loop-owner=caller`](../security-audit/SKILL.md) (optional; conditional) → [`/production-readiness-review --fix-loop --loop-owner=caller`](../production-readiness-review/SKILL.md) (optional; conditional) → [`/ui-design --mode=review --fix-loop --loop-owner=caller`](../ui-design/SKILL.md) (optional; conditional) → [`/ai-engineering-review --fix-loop --loop-owner=caller`](../ai-engineering-review/SKILL.md) (optional; conditional) → [`/code-simplifier --report-only`](../code-simplifier/SKILL.md) (optional; conditional) → [`/experience-review --fix-loop --loop-owner=caller`](../experience-review/SKILL.md) (optional; conditional) → [`/why-review --validate-findings`](../why-review/SKILL.md) (optional; conditional) → [`/investigate --mode=debug`](../investigate/SKILL.md) (optional; conditional) → [`/fix --target=review`](../fix/SKILL.md) (optional; conditional) → [`/scan --target=domain-entities`](../scan/SKILL.md) (optional; conditional) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (core) → [`/workflow-end`](../workflow-end/SKILL.md) (optional; conditional) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Review (17; exit review-converged, tests-pass, root-cause-traced) → Close (2; exit run-closed)
<!-- workflow-mode:fix-loop fingerprint:48e839382d243c9794151bbdd574d57cedf9db2c310280fc8126f87b8c11d506 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.

## Quick Summary

**Goal:** Review the requested changes, fix validated findings and re-review until the shared quality bar clears.

**Summary:** This workflow defaults to `--fix-loop`. Triage all files and plan tasks → run general/rationale and applicable specialist reviews, including domain entity quality when entities change, with the simplifier as a report-only lens → consolidate and validate once → fix at the owner and refresh affected domain docs and docs → re-review the settled target, doc edits included → check required tests and specs. Every review child joins the same coordinator-owned loop.

**Workflow:** Activate `/start-workflow workflow-review-changes`; resolve the registry and selected occurrences, create their todo tasks, and execute the dependencies below.

**Key Rules:** Default maximum two rounds; stop earlier when current evidence clears the bar. LOW-only at the cap is acceptable with disclosure; MEDIUM/HIGH/CRITICAL, unresolved required evidence or failed required checks need an explicit extension decision before round 3. Review-only is available through `--review-only` or `--report-only`; both select mode `review-only`. Keep one fixing owner and preserve all applicable checks.

**Workflow budget:** The coordinator enforces this workflow's two-round default before consulting the shared `review-policy` eligibility helper. The shared three-round default/ceiling in protocols, reminders or tooling does not authorize a third workflow round. All child lenses, repair re-reviews and resumed or nested invocations share the coordinator's spent budget; they never start a separate loop or reset it.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Scope, triage and tasks](#scope-triage-and-tasks)
- [Reviews and ownership](#reviews-and-ownership)
- [Fix and fresh review](#fix-and-fresh-review)
- [Final quality gates](#final-quality-gates)
- [Closing Reminders](#closing-reminders)

## Scope, triage and tasks

Run INLINE in the main session, including when nested in another workflow. Preserve the requested target and include fixes in subsequent rounds. Current branch/PR scope is the pinned merge-base contribution plus local work; historical assessment remains review-only unless a current fix target is agreed.

Before review, read the run's deviation log (`tmp/workflow-runs/<runId>/skips.md`) when present and include its justified deviations in the evidence.

Inventory every file, intent, risks, required rules, dependencies and mechanical outputs. Write a short review plan and coverage record under `tmp/reports/` before reviewing. Choose inline work or authorized specialists and how to group connected changes from risk, context headroom and cost. There are no fixed file/line/byte caps. After compaction, resume from persisted tasks and evidence.

Always create the phase todos, one row per occurrence, before running a skill, including conditional ones. Each round also has explicit validation, fix, fresh re-review and final-check tasks. Mark inapplicable specialist tasks with evidence; never discard their duties silently.

**IMPORTANT MANDATORY Steps:** /changes-review --defer=whole-target,specialists,tests,entities --fix-loop --loop-owner=caller -> /why-review --target=whole-review-target --fix-loop --loop-owner=caller -> /architecture --mode=review --fix-loop --loop-owner=caller -> /domain-analysis --mode=review --fix-loop --loop-owner=caller -> /performance-review --fix-loop --loop-owner=caller -> /integration-test --mode=review --prove-tests --fix-loop --loop-owner=caller -> /security-audit --fix-loop --loop-owner=caller -> /production-readiness-review --fix-loop --loop-owner=caller -> /ui-design --mode=review --fix-loop --loop-owner=caller -> /ai-engineering-review --fix-loop --loop-owner=caller -> /code-simplifier --report-only -> /experience-review --fix-loop --loop-owner=caller -> /why-review --validate-findings -> /investigate --mode=debug -> /fix --target=review -> /scan --target=domain-entities -> /docs-manager --mode=update -> /workflow-end -> /watzup

## Reviews and ownership

Execute registry calls through the active host. General changes review and independent rationale review cover the complete target; applicable specialists add domain depth. Review children default to `--fix-loop --loop-owner=caller`: they review the current pass read-only, holding each finding to the evidence bar, and return all findings/coverage without a separate terminal validation call. The main session owns their fix-and-re-review loop. Terminal findings validation remains one pass.

Independent read-only reviews may run together: the applicable specialists, the `code-simplifier --report-only` lens and experience review; choose the grouping from risk, dependencies and context headroom (the registry forces no topology). Wait for every report before fixing. Choose specialists from the actual risks, preserve domain gates and reconcile cross-file interactions and coverage. Applicable spec compliance runs before code-quality judgment. Do not force subagents for tiny work; use the appropriate specialist when expertise or independent judgment is needed.

Read [references/caller-mode.md](references/caller-mode.md) when delegating duties or using `--tests=defer`; it defines child ownership and review-only precedence.

For entity/VO/aggregate or write/load/event-path changes, including indirect handler/import/job changes, `domain-entities-design-review` owns [the conditional quality task](../changes-review/SKILL.md#domain-entity-quality-conditional-task). Pass scope, project/paradigm fit, rules and affected callers/tests; merge evidence once. Otherwise record the registry skip: "No domain entity, value-object, aggregate or affected write/load/event path changes; record the inspected paths." Re-evaluate after repairs; general reviewers do not duplicate this pass.

## Fix and fresh review

Consolidate reports and validate findings once through `/why-review --validate-findings` before edits; children called with `--loop-owner=caller` return their findings without their own terminal validation (`/start-workflow` → Step Execution Protocol, Workflow-step mode). Trace untraced defects, fix validated findings at their owning component, and apply the validated simplifications the simplifier lens reported, only where they improve the requested change. Update spec/test/doc drift in the same repair work: the domain-entities refresh and docs-manager run right after the fix and before the fresh re-review, so their edits are reviewed in the same pass. Read-only workflow mode reports the validated results and stops before source mutation.

Re-run general, whole-target rationale and every applicable specialist lens on the settled post-fix target, including new risks introduced by repairs and docs edits. Any fix, simplification, spec/doc/test repair or validated blocking finding the fix step rejects needs this fresh re-review; a narrower spot check never replaces it. The re-review re-invokes those same occurrences as `rerun N`, with no separate post-fix rationale step; when its fix edits code again, re-run the docs steps before the next pass. Each full current-target pass counts toward one shared round budget; leaf reviews do not create nested budgets. Repeat the registry's review/fix duties as needed, preserving completed-round evidence.

At two rounds, stop cleanly when required checks pass and only LOWs remain; list them as deferred. Remaining MEDIUM/HIGH/CRITICAL, unresolved required evidence or failed checks require the host question tool: show the issues and ask whether to extend by a stated bounded number of rounds or stop with the unresolved report. Wait for an explicit answer before further fixes or review rounds; silence never extends the budget. Record approval and the extra-round limit, preserve spent rounds and inherited findings/scope, and ask again when that extension is exhausted. If the executable record is exhausted, use a linked bounded run only after approval. A child returns this decision to the main session.

Read [references/fix-loop.md](references/fix-loop.md) for final evidence and receipt handling. `--fix-loop` is the default, not an extra wrapper around another loop.

## Final quality gates

Preserve intent, evidence-based severity, full-flow correctness, findings validation and spec/test/code consistency: resolve the configured canonical owner, profile-declared canonical scenario/case identity and executing test assertion/result. Inspect applicable E2E/browser/user-flow concerns under `.claude/skills/shared/e2e-quality-protocol.md`. Experience review runs only on applicable observable surfaces; unavailable proof stays blocked.

`--tests={prove|defer}`: `--tests=prove` is default for standalone review. Deferred child calls run without `--prove-tests` and hand execution to the named later verifier. `--tests=defer` keeps this review static and assigns execution to the parent's later verification step; propagate it to child reviews. Tests, parity and required artifacts are binary checks and cannot be waived by LOW deferral. Changes from verification or doc sync require fresh review before acceptance.

Refresh domain docs only when affected domain/data contracts justify it. Docs-manager runs for relevant updates before the fresh re-review, which reviews any edits it lands; then perform terminal workflow close only at the top level. Nested runs return control to their caller.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `parallel-phase-advancement` — Run a declared parallel batch together and advance only after every member returns; a workflow declares parallel steps → .claude/skills/shared/protocols/parallel-phase-advancement.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `whole-diff-correctness` — Read a behavior-changing diff once as one change and hunt cross-file defects through real situations; reviewing a behavior-changing diff → .claude/skills/shared/protocols/whole-diff-correctness.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:whole-diff-correctness:reminder -->

**MUST ATTENTION** Trace the complete changed behavior, including success/error paths and cross-file interactions. Adapt grouping to context, preserve complete coverage and evidence, and verify the settled post-fix target before PASS.

<!-- /SYNC:whole-diff-correctness:reminder -->

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

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->

<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->

## Closing Reminders

**Goal:** Converge validated fixes on the complete current target.

**Main steps:** triage/plan/todo tasks → applicable reviews (domain entity quality when entities change; one specialist batch, simplifier lens included) → validate once → fix → domain/docs refresh → fresh whole-target and specialist re-review → final checks → close.

Default fix-loop includes all review children under one fixing coordinator. Maximum two rounds by default, even where shared guidance names a three-round ceiling; disclose LOWs, ask and wait before any additional round for MEDIUM+, unresolved required evidence or failed checks. Every extension is explicitly bounded. Preserve coverage and applicable gates; no stale verdict or hidden scope reduction.
