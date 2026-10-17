# `$plan --mode=review` — plan review modes

> Read in full on `$plan --mode=review [--review-only|--fix-loop]`. Standalone defaults to review-only; fix-loop repairs validated findings and freshly reviews, up to three rounds. Caller-owned leaves stay read-only. Apply the entrypoint’s shared `review-policy`.

## Quick Summary

**Goal:** Check whether the plan serves the user's intent and whether its important choices are necessary and worth their cost.

**Summary:** Resolve goal, plan and evidence → read the checklist owner → challenge rationale → validate findings → report verdict and hand off → stop. Review-only reports once; fix-loop revises the plan and re-runs the complete review under the common policy. Test execution remains with the verification owner.

- **Mode boundary:** review-only writes only the report; fix-loop may revise the requested plan after findings validation.
- Apply the simplified rationale pass; write the concise review report under `tmp/reports/`. Review-only and caller-owned leaves keep the target read-only.

## Contents

- [Quick Summary](#quick-summary)
- [Modes and Round Ownership](#modes-and-round-ownership)
- [Scope and Evidence](#scope-and-evidence)
- [Simplified Why-Review Pass](#simplified-why-review-pass)
- [Finding Validation and Verdict](#finding-validation-and-verdict)
- [Report and Handoff](#report-and-handoff)
- [Mode protocols](#mode-protocols)
- [Closing Reminders](#closing-reminders)

## Modes and Round Ownership

Create tasks for triage/plan, review, findings validation, authorized fixes, fresh re-review and final checks before execution. In review-only, run the full domain pass once and hand off. In fix-loop, validate findings, repair at the owner, then freshly review the settled target. Keep one shared three-round budget and the LOW/extension rules in `review-policy`; caller-owned leaves never start another loop or edit.

## Scope and Evidence

Read the active Goal Contract, target plan and intentional phase files, governing intent/spec, and cited evidence needed to judge material choices. Spot-check affected owners/consumers where the decision depends on them. Create `tmp/reports/plan-review-{YYMMDD}-{HHmm}-{slug}.md` before recording findings.

If a supplied spec baseline exists, review against that baseline and separate proposed additions.

## Simplified Why-Review Pass

**[BLOCKING]** Read `references/plan-quality-checklist.md` in full before the core review; its Review duty owns the defect classes and severities.

Challenge the reasoning, not section length or presentation:

1. **Purpose:** What outcome does this serve? Does every phase advance it without expanding scope? Is the outcome governed by a clear owner/spec, with non-goals and no silent expansion? Does the `Not yet specified` list hold only items that cannot yet be stated as a precise question, and no product-intent, public-contract or irreversible decision parked there?
2. **Necessity:** Why is each important change needed? Could reuse, a smaller change, or doing nothing satisfy the same intent?
3. **Choice and cost:** Steel-man the strongest alternative. What does the chosen approach sacrifice, who pays, and is the gain worth it? Hand unresolved material trade-offs to the caller/user before PASS.
4. **Assumptions:** Stress-test the top 2–3 assumptions and one plausible failure. Does the plan bound discovery and name how uncertainty is settled?
5. **Proof:** Will acceptance evidence demonstrate the intended outcome and preserved invariants? Apply the loaded checklist owner's Review duty and required gates within this pass.

| Execution check | Question |
| --- | --- |
| Plan altitude | Does the plan give direction, owners and bounded discovery without prescribing every edit? |
| Dependency order | Do phases reflect real dependencies or disjoint ownership rather than ceremony? |
| Verify-last | Are tests authored with implementation and executed only after all implementation and static review? |

**User-facing UI:** apply journey, design-system, accessibility, state, and container-fit plan checks.

**Domain work:** when the plan may create/update entities, VOs, aggregates or their write/load paths, read `.claude/skills/domain-analysis/references/entity-quality.md`. Check applicable decisions, invariant owners and planned proof; unresolved material choices are findings. Skip this detail when no domain surface exists.

Apply required domain/safety protocols only where the plan triggers them, inline in this pass. For an AI-feature plan, retain the AI-engineering gate. This mode does not dispatch a panel of specialist reviewers or invoke full `$why-review`; it uses the concise rationale protocol above.

## Finding Validation and Verdict

Keep only evidenced consequences for intent, execution or future change cost; deduplicate by root cause. When findings exist, run `$why-review --validate-findings <report-path>` as terminal validation within this pass. Missing evidence is `NOT VERIFIABLE`, never an invented defect.

- `PASS`: no validated blocking finding, required evidence gap or failed Goal Contract criterion.
- `PASS_WITH_NOTES`: only non-blocking LOW observations.
- `CHANGES_REQUESTED`: validated findings require plan revision.
- `BLOCKED`: required intent, evidence or user decision is unavailable.

Review-only stops after the validated report. Fix-loop repairs validated findings, then repeats the complete review; defer LOWs and ask at the shared cap as the common policy requires.

## Report and Handoff

Keep the report short: verdict and `Review rounds: {spent}/{budget}`; purpose-fit judgment; material findings with location/evidence, consequence and plan-level correction; trade-off assessment; evidence limits; Goal Satisfaction matrix. End with `Bias check:` stating the strongest alternative and what would change the verdict. Omit repeated plan descriptions and empty audit sections.

Return the verdict/report path and any unresolved material decision to the caller. The fixing owner owns revisions; inside workflows, return the report to that owner.

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `plan` skill already carries `core-engineering-principles`, `evidence-based-reasoning`, `goal-contract-satisfaction-loop`, `plan-granularity`, `plan-quality` and `verify-last-order`.

**AI surface?** Only if the plan creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md` and apply it; otherwise skip this line.

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a todo tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Check whether the plan serves the user's intent and whether its important choices are necessary and worth their cost.

**MUST ATTENTION Main steps:** resolve goal/plan/evidence → read checklist owner → challenge rationale → validate findings → report and hand off → stop.

- **MUST ATTENTION** review-only reports once; fix-loop validates → fixes → freshly reviews within the shared three-round cap.
- **MUST ATTENTION** resolve the active Goal Contract and emit its Goal Satisfaction matrix before a PASS verdict.
- **MUST ATTENTION** review-only and caller-owned leaves never edit; standalone fix-loop repairs validated plan findings and freshly re-reviews.
- **MUST ATTENTION** challenge purpose, necessity, alternatives, trade-offs and proof; keep the report concise.
- **MUST ATTENTION** apply triggered safety gates inline; do not dispatch multiple perspective reviews.
- **MUST ATTENTION** inside workflows return the verdict/report path without a next-step prompt.

**Anti-Rationalization:**

| Evasion | Required action |
| --- | --- |
| "Fixing it is faster" | Review-only/caller-owned passes report the correction; standalone fix-loop repairs validated findings before fresh review. |
| "One more round will prove it" | Review-only stops after its pass; fix-loop uses the shared three-round cap and asks before a bounded extension. |
| "The report mentions the trade-off" | Hand off every unconfirmed material decision in the returned verdict. |
