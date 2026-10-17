---
name: changes-review
description: '[Code Quality] Use when a workflow step or the user asks for a focused code-change review: staged, unstaged, branch diff or simple pull request. --fix-loop fixes and re-reviews. Complex pull request: workflow-review-changes; rationale: why-review.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Find real defects in the requested diff and, when requested, converge its fixes without losing coverage or quality.

**Summary:** Triage every changed file and write a short plan → create review tasks, including domain entity quality and performance-test quality when those surfaces change → check connected behavior and applicable concerns → validate findings → report once or fix and freshly re-review. Choose review depth and delegation from risk and available context.

**Workflow:** Resolve scope → plan/tasks → review, with the whole-target `$why-review` rationale pass and a `$performance-review` pass when the change can affect performance → validate → review-only report or fix/re-review → final checks and recap.

**Key Rules:** Review-only is the standalone default; `--fix-loop` enables the shared three-round loop. `--loop-owner=caller` returns a read-only pass to its fixing coordinator. Use the carried `review-policy` protocol for completion and user-approved extensions.

> **Todo first:** create tasks for triage, review, validation, fixes, fresh re-review and final checks before execution; keep one task in progress and attach evidence when completed.

## Contents

- [Quick Summary](#quick-summary)
- [Scope and plan](#scope-and-plan)
- [Review concerns](#review-concerns)
- [Validation, fixes and re-review](#validation-fixes-and-re-review)
- [Closing Reminders](#closing-reminders)

## Scope and plan

Default scope is current working changes: `git status`, `git diff`, `git diff --cached`, and relevant untracked files. Honor staged-only, unstaged-only and named-file requests exactly. Current branch/PR review includes `git diff <base>...HEAD` plus local changes; pin the merge-base before reviewing. Historical commits compare their first parent (empty tree for a root); explicit ranges compare the named endpoints. Do not infer historical PR membership from current branch membership; a merged or squashed PR needs an explicit commit or verified range. Historical assessment is review-only: fixing current files requires an agreed current target, and cannot make an immutable historical diff converge.

Start from metadata and the stated task/plan/goal. Record intent, all target paths, risks, relevant rules, affected callers/tests and how coverage will be checked in `tmp/reports/changes-review-<run>.md`. Before review, read the run's deviation log (`tmp/workflow-runs/<runId>/skips.md`) when present. Decide inline work or authorized reviewers and group related flows as useful; the adaptive planning protocol owns guidance, without fixed file/line limits.

## Review concerns

For every applicable changed behavior, inspect correctness against intent, supported success/error paths, null/empty/boundary states, resource cleanup and async/concurrency concerns. Trace callers and contracts across affected boundaries. Judge responsibility, reuse, naming and maintainability against the project's conventions and actual architecture; absence of a textbook pattern is not a defect.

Check spec/test/code consistency, meaningful test assertions and documentation drift. Treat secrets, authorization, privacy, public contracts, migrations, dependencies, operational behavior, hot paths, UI and AI features as risk signals for relevant deeper review. Skip inapplicable concerns with evidence; do not silently omit required gates.

**Query scan gate (blocking):** every query, search or filter the change adds or alters on data that can grow large uses an index-backed, sargable access path with a bounded result. Apply `$performance-review`'s Query Scan Gate, the single owner of the patterns it blocks, the evidence it needs, its severity floor and its one exception (provably bounded data, or a plan shown cheap at production volume): read it in `performance-review/SKILL.md` and route depth there whenever the change touches data access.

**Performance review (conditional step):** when the diff touches data access (queries, loops over collections, paging, indexes), hot paths, caching, concurrency, batch/job throughput, or render-heavy UI, run `$performance-review` on the changed code as its own step — `--review-only` in review-only mode, `--fix-loop --loop-owner=caller` inside this skill's fixing loop — and validate its findings with this review's. Otherwise record the skip with its evidence: "No data-access, hot-path, caching, concurrency or render-heavy change is in the diff; record the triage evidence." Skip it only when `--defer=specialists` assigns it to a named caller (`workflow-review-changes` runs it as its own conditional step).

**Whole-target rationale:** run `$why-review --target=whole-review-target` on the complete review target so the change's necessity, alternatives and trade-offs are judged, not only its correctness — read-only, as `--fix-loop --loop-owner=caller` inside this skill's fixing loop and `--review-only` otherwise. Skip it only when `--defer=whole-target` assigns it to a named caller (`workflow-review-changes` runs it as its own step).

Route other specialist depth only where applicable: architecture, domain-analysis, integration-test review, security-audit, production-readiness-review, ui-design review and ai-engineering-review. For current AI surfaces run `node .claude/scripts/ai-signal-scan.cjs --json` (add `--base <base>` for branch/PR scope, or `--files <paths>` for named files). `clean` allows skipping; `unknown` requires source inspection and conservative coverage. Historical assessment inspects the selected historical sides directly; a live scan cannot prove them clean.

When integration tests are in the target or guard changed behavior, run `$integration-test --mode=review --report-only` in review-only mode, or `$integration-test --mode=review --fix-loop --loop-owner=caller` inside the fixing loop. This owner applies all eight test-quality gates; a named parent may own the gate, but deferral never waives it.

**Performance-test quality (conditional task):** when changed files add, update, rename or remove performance/load/stress/soak/benchmark scenarios or their harness, workload/data profiles, resource constraints, collectors or gate/report evaluator, create `[Review] Performance tests` and call `$performance-test --mode=review --report-only --loop-owner=caller` on that scope and its affected consumers. Detect from configured native performance paths, runner/config membership and file contents; a document merely mentioning performance tests is not a trigger. This static test-quality pass is distinct from `$performance-review` on product bottlenecks. Use `performance-tester` for authorized delegated depth (embed the full shared reviewer template); otherwise execute inline. Merge its coverage/findings into this review, validate once at the caller, and freshly review affected test/harness repairs. The caller owns every fix and round budget; never run tests or start a nested fixing loop from this task. Deferral is allowed only to a named caller with this exact duty and evidence; otherwise record an evidenced N/A when no executable performance-test surface changed.

Review executable E2E/browser/user-flow changes under `.claude/skills/shared/e2e-quality-protocol.md`; a document merely naming E2E is not a trigger. Invoke `$e2e-test --mode=verify` report-only for applicable executable E2E changes. Run applicable test proof unless `--tests=defer` assigns it to a later named verification step. Required checks that cannot run stay unavailable, never PASS.

### Domain entity quality (conditional task)

Inspect domain meaning and affected write/load paths during triage. New or updated entities, VOs or aggregates → create `[Review] Domain entity quality` and read [the shared gate](../shared/protocols/domain-entity-change-gate.md), then [the quality criteria](../domain-analysis/references/entity-quality.md) only when relevant. No applicable surface → record an explicit skip with inspected paths. Apply project/paradigm fit; simple CRUD does not require rich DDD.

Use one inline pass or the named caller's `domain-entities-design-review` occurrence. Incorporate its current evidence/findings, return uncovered duties from leaves, and complete applicable checks before the verdict; no duplicate pass or opt-in prompt. Existing review-only/fix-loop authority stays intact.

## Validation, fixes and re-review

Report each finding with severity, reachable trigger, consequence, `file:line` and confidence. Keep observations separate. Consolidate duplicate causes while retaining every report and conflicting claim. Any surviving finding requires `$why-review --validate-findings <report>` before fixes or handoff; with `--loop-owner=caller`, the caller's single validation of the merged report satisfies this. Resolve the configured canonical owner, profile-declared canonical scenario/case identity and executing test assertion/result. Carry behavior-changing findings into both the governing spec and guarding tests; adjudicate intended changes rather than rewriting either side merely to pass.

Review-only returns the validated report without source changes. Fix-loop follows `review-policy`: trace the owning cause, apply authorized fixes, then freshly review the whole updated target and affected interactions. Create an explicit re-review task even for a small fix. Update relevant specs/docs before the final pass so no terminal edit escapes review.

`--defer=<duties>` may assign whole-target rationale, specialists, tests, entities or simplification to a named caller; read [references/caller mode](../workflow-review-changes/references/caller-mode.md) when using it. Every duty needs an owner and evidence. The workflow passes `--fix-loop --loop-owner=caller` so all readers join its loop without concurrent writers.

Read [references/fix-loop.md](references/fix-loop.md) when issuing a full-candidate review receipt. Receipt freshness never grants Git authority.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `bug-detection` — Four bug-detection categories checked on every review; reviewing code for defects → .claude/skills/shared/protocols/bug-detection.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `complexity-prevention` — Change-cost lens on complexity (Ousterhout); designing or reviewing code → .claude/skills/shared/protocols/complexity-prevention.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `cross-stack-impact-trace` — Trace the changed area end to end across the client-server seam before judging files; starting a review of a diff that touches more than one tier → .claude/skills/shared/protocols/cross-stack-impact-trace.md
- `design-patterns-quality` — Design quality: one owner per rule, fitted patterns, no speculative abstraction; designing or reviewing code structure → .claude/skills/shared/protocols/design-patterns-quality.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Optional hint: a code-graph query can add callers and dependents when grep may miss a high-risk blast radius, and it can be stale; a high-risk change where grep and reading alone may miss the blast radius → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `integration-test-sync-check` — Changed business logic has matching tests; reviewing changed business logic → .claude/skills/shared/protocols/integration-test-sync-check.md
- `logic-and-intention-review` — Check that what the code does matches why it changed, with happy and error path traces; reviewing a code change against its stated intent → .claude/skills/shared/protocols/logic-and-intention-review.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `systematic-review-batching` — Triage all files and plan adaptive review with complete coverage and no fixed size caps; choosing review assignments or handling working-set overflow → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-spec-verification` — Map changed code to its test specifications; reviewing or verifying changed behavior → .claude/skills/shared/protocols/test-spec-verification.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `translation-sync-check` — Multilingual UI changes must include translation updates or an explicit user decision; reviewing a change that touches user-visible text in a multilingual project → .claude/skills/shared/protocols/translation-sync-check.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md
- `whole-diff-correctness` — Read a behavior-changing diff once as one change and hunt cross-file defects through real situations; reviewing a behavior-changing diff → .claude/skills/shared/protocols/whole-diff-correctness.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:whole-diff-correctness:reminder -->

**MUST ATTENTION** Trace the complete changed behavior, including success/error paths and cross-file interactions. Adapt grouping to context, preserve complete coverage and evidence, and verify the settled post-fix target before PASS.

<!-- /SYNC:whole-diff-correctness:reminder -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** only for relevant entity/VO/aggregate changes, read `domain-analysis/references/entity-quality.md`: establish fit → plan owned decisions/proof → implement through all write/load paths → review the same rules. Keep simple models simple; unresolved material decisions or required proof block. Use one caller-owned review pass.

<!-- /SYNC:domain-entity-change-gate:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** select patterns from project evidence and real needs; keep one owner per rule, justify abstractions by change cost, and grep affected scope for dangling references after extraction, move, or rename.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** assess change amplification, cognitive load, coupling, leaked detail and invariant ownership from project evidence. Extract only when a real owner or consumer lowers change cost; no universal layer order or numeric threshold.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:logic-and-intention-review:reminder -->

**IMPORTANT MUST ATTENTION** verify WHAT the code does matches WHY it changed, and every changed file serves the stated purpose. Trace happy + error paths. Flag scope creep.

<!-- /SYNC:logic-and-intention-review:reminder -->

<!-- SYNC:bug-detection:reminder -->

**IMPORTANT MUST ATTENTION** check null safety, boundary conditions, error handling, resource management for every review.

<!-- /SYNC:bug-detection:reminder -->

<!-- SYNC:test-spec-verification:reminder -->

**IMPORTANT MUST ATTENTION** map every changed function/endpoint/code path to a test case. Search for the project's test spec format near changed files. Flag untested paths and coverage gaps; recommend test creation.

<!-- /SYNC:test-spec-verification:reminder -->

<!-- SYNC:integration-test-sync-check:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

**IMPORTANT MUST ATTENTION** check changed logic files for matching tests. Surface missing tests via `ask user question tool` — mandatory, not advisory.

<!-- /SYNC:integration-test-sync-check:reminder -->

<!-- SYNC:translation-sync-check:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

**IMPORTANT MUST ATTENTION** for multilingual UI text changes, verify translation updates are present or explicitly accepted by the user as risk (`ask user question tool` when missing) before PASS.

<!-- /SYNC:translation-sync-check:reminder -->

<!-- SYNC:cross-stack-impact-trace:reminder -->

**MUST ATTENTION** FIRST review action — note change context + holistically trace full pipeline of main affected area across client↔server seam (BE→FE forward, FE→BE backward). Verify both tiers still agree on route/DTO/field/type/nullability/auth; any mismatch = BREAKING finding. Skip only for single-tier / docs-only changes (state so).

<!-- /SYNC:cross-stack-impact-trace:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

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

<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->



<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

**Goal:** Find real diff defects and converge authorized fixes with complete coverage.

**Main steps:** scope → triage/plan/tasks → connected review, plus domain entity quality when entities change and `$performance-review` when the diff can affect performance → findings validation → report or fix/fresh re-review → final checks.

Preserve exact scope, evidence and applicable gates. Default review-only; fix-loop has three rounds, accepts deferred LOWs and asks about bounded extension for remaining MEDIUM+ or failed checks. Never accept stale pre-fix evidence.
