# why-review — Full Mode

> Read by `/why-review` full mode as its FIRST action, before any other full-mode step (the router `SKILL.md` → **Mode References**). `validate-findings` mode never reads this file. The router’s protocol guides name the published full `SYNC:*` sources. Read applicable text absent from current context before acting; a guide does not replace a protocol body.

**Whole-target coverage is not one-context loading.** Before source reads, read `.claude/skills/shared/protocols/systematic-review-batching.md` when absent and apply it: bound complete procedure/rules, history, changes and reasoning. The parent may assign overlapping behavior-flow leaves and synthesize their interactions; every entry and applicable full rule remains owned. Read only assigned immutable refs, checkpoint each completed range and resplit oversized work. An immutable completed range check remains completed evidence after compaction; current loaded-context credit does not survive. Outstanding ranges remain incomplete. Recheck target/policy freshness before dispatch and publication. Full/repeated review still covers the settled whole target, never only recent fixes or sampled files.

## Contents

- [Review plan and tasks](#review-plan-and-tasks)
- [Adversarial Review Mindset (NON-NEGOTIABLE)](#adversarial-review-mindset-non-negotiable)
- [Trade-Off Interrogation Gate (MANDATORY — no verdict, no finding, no recommendation without it)](#trade-off-interrogation-gate-mandatory--no-verdict-no-finding-no-recommendation-without-it)
- [Target Resolution (DO THIS BEFORE REVIEW)](#target-resolution-do-this-before-review)
- [Validation Checklist](#validation-checklist)
- [Residual Risk Gate](#residual-risk-gate)
- [Output Format](#output-format)
- [Round 2: Adversarial Re-Review (conditional)](#round-2-adversarial-re-review-conditional)
- [Scope](#scope)
- [Important Notes](#important-notes)
- [Report Closure Contract](#report-closure-contract)
- [Findings Validation Gate (full mode — MANDATORY CLOSING TASK when findings exist)](#findings-validation-gate-full-mode--mandatory-closing-task-when-findings-exist)
- [Evidence and Semantic Coverage](#evidence-and-semantic-coverage)
- [Next Steps](#next-steps)

## Review plan and tasks

Before reviewing, inventory the complete target, risks and required evidence; choose the appropriate depth and authorized delegation. Create tasks for review, terminal findings validation, authorized fixes when in fix-loop, fresh re-review and final checks. Review-only and caller-owned passes stay read-only. Fix-loop uses the single shared three-round policy; there is no separate recursive report loop or required `/goal` command.

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC, not validator. Your job is to find what's wrong, not confirm what's right.**

> **Confirmation bias trap:** A coherent plan or familiar post-fix reasoning invites agreement. Challenge it before endorsing it; prior endorsement does not establish independent scrutiny.

### Adversarial Techniques (apply ALL before concluding)

| Technique              | Think                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Steel-Man              | Argue FOR rejected alternative. Would a 10-year domain senior choose it? If yes, dismissal needs stronger proof. |
| Why NOT?               | For every "chose X because Y", ask what X sacrifices.                                                            |
| Assumption Stress Test | List top 3 assumptions; ask impact if wrong. Strong plan survives 2/3 false.                                     |
| Pre-Mortem             | Assume 3-month production failure; write one plausible scenario.                                                 |
| Unseen Alternatives    | Identify 1-2 approaches not mentioned; absence without exclusion reasoning = weak coverage.                      |
| Pros/Cons Symmetry     | Count chosen-approach pros/cons. Pros > cons by 2:1 means likely bias.                                           |
| Contrarian Pass        | Before finding/verdict, argue opposite conclusion in 2 sentences; choose stronger argument.                      |
| Trade-Off Interrogation | Ask the 3 questions (below): is there a trade-off? · is it worth it? · is it material enough to confirm with the user? |

### Forbidden Patterns

| Forbidden pattern      | Required correction                                      |
| ---------------------- | -------------------------------------------------------- |
| "Looks good because..." | Lead with challenges first.                             |
| Presence = quality     | Test quality depth; real alternatives, causal rationale. |
| Vague rationale        | Demand metric + cost: better at what cost?               |
| Asymmetric trade-offs  | Treat 3 pros / 1 con as incomplete analysis.             |
| "Looks fine"           | Provide adversarial challenge evidence.                  |
| "No trade-off" / "pure win" | Name the dimensions checked and why each is unaffected; unexamined ≠ absent. |
| Material trade-off decided silently | Escalate to the user via `ask user question tool`; a one-way door is never yours to walk through. |

### Anti-Bias Gate (MANDATORY before finalizing verdict)

Complete ALL 7 checks before writing the final verdict (MUST ATTENTION):

- steel-man at least one rejected alternative (argue FOR it)
- identify at least 1 alternative NOT in the plan
- list 2-3 arguments AGAINST the chosen approach
- surface 2-3 hidden assumptions with stress tests
- run the pre-mortem (one concrete failure scenario)
- check pros/cons symmetry
- run the **Trade-Off Interrogation Gate** below (trade-off named · worth-it verdict · materiality escalation decided)

Any check incomplete → adversarial review NOT complete. Go back.

## Trade-Off Interrogation Gate (MANDATORY — no verdict, no finding, no recommendation without it)

> **[BLOCKING]** Ask these THREE questions EVERY time — about the decision under review AND about every recommendation YOU make. — why: a review that names benefits without naming their price is an endorsement, not a review; and the biggest trade-offs are the ones nobody wrote down.

**1. Is there any trade-off?** Name what this decision/recommendation SACRIFICES. Every choice buys something with something. "None" is NOT an acceptable answer — it is an unfinished analysis. To claim no material trade-off, state which dimensions you checked and why each is unaffected:

> future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational/ops load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.

**2. Is it worth it?** Weigh gain against sacrifice EXPLICITLY — **what is gained · what it costs · who pays · when it comes due** — then emit one verdict: **WORTH IT / NOT WORTH IT / UNCLEAR**. Anchor on Easy-to-Change: a trade-off raising future change cost needs a proportionate, named payoff, not a vague one. "Better" without a metric and a cost FAILS this question.

**3. Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. MATERIAL when ANY row below holds:

| Material when the trade-off…                     | Examples                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Is irreversible — a one-way door                 | data migration, public API/contract shape, storage format, framework/vendor lock-in |
| Shifts cost onto someone else                    | another team, ops/on-call, the future maintainer, the end user                     |
| Trades one quality attribute for another          | correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility     |
| Crosses a boundary                               | client↔server tier seam, service contract, event contract, shared library         |
| Sits on a high-consequence path                  | auth, money, data integrity, breaking change, High/Medium residual risk            |
| Cannot be evidenced (worth-it verdict = UNCLEAR) | gain or cost unquantifiable from available evidence                                |

- **MATERIAL → STOP and confirm via `ask user question tool`** BEFORE the verdict stands: state the trade-off, both options, what each sacrifices, your recommendation. NEVER resolve a material trade-off silently on the user's behalf, and NEVER bury it as a Low-severity note.
- **NOT material → record it inline** in the Trade-Off Assessment table with a one-line justification and proceed; no escalation needed.
- In `validate-findings` terminal mode: **assess and record, do NOT escalate** — that mode asks nothing (see Next Steps exemption); flag the unescalated material trade-off in the verdict so the CALLER escalates it.

**Output:** every review emits the `Trade-Off Assessment` table (see Output Format) — one row per reviewed decision and per recommendation you make. An empty table with findings present is an incomplete review.

## Target Resolution (DO THIS BEFORE REVIEW)

Analyze user request, not only literal argument shape. Determine target, then choose matching path.

| User request / evidence                              | Review path                         | Required target work                                                                                                                |
| ---------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Explicit plan directory, `plan.md`, phase files      | Plan-rationale review               | Read `plan.md` and all `phase-*.md` files.                                                                                          |
| Task/story/spec planning artifact, rationale request  | Task/artifact rationale review       | Read the named artifact and related acceptance/design/risk sections; if it references plan files, read those too.                    |
| Commit SHA, `Commit: ...`, PR/merge commit, git diff | Code-change review                  | Establish the diff range, read changed files, assess impact (an optional graph hint may help), and apply code-review/adversarial review protocols.  |
| Branch comparison or uncommitted changes             | Code-change review                  | Use the requested branch/diff or `git diff`; read changed files and tests/docs touched by the diff.                                  |
| Docs/spec/report/findings path                       | Artifact review                     | Read the target artifact and verify claims against source evidence; use rationale checklist only where the artifact is a plan/task.   |
| Ambiguous request                                    | Infer from evidence; ask if unsafe  | Prefer a reasonable target from the request and repo evidence. Ask only when two plausible review paths would produce different work. |

**Important defaults:**

1. Commit hash / `Commit:` block => code-change review, not "no active plan."
2. Task file => review that task/artifact; no `**/plan.md` wrapper under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) required.
3. "No active plan found. Run `/plan` first." valid ONLY for unresolved plan-rationale requests.
4. MUST ATTENTION record target type, evidence, confidence; NEVER silently convert target types.

**Active-goal read (BEFORE judging rationale):** Resolve active Goal Contract per goal-contract-satisfaction-loop protocol (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json`). When one exists, review artifact's rationale AGAINST saved Original Request, Purpose, Success Criteria — flag rationale justifying work the saved goal never asked for, and saved required criteria the artifact's reasoning never addresses. When none exists, record `No active goal — rationale reviewed against the current request only.` Full mode only; `--validate-findings` terminal mode skips this read.

### Review Focus Routing

| Detected concern                 | Primary focus / sub-agent route                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Source code / diff               | `code-reviewer` + embedded code-review protocols.                                                |
| Integration/E2E tests in the target, OR a behavior change whose code has covering integration tests | Apply the **Integration-Test-Review Linkage** below — `/integration-test --mode=review` owns the 8 test-quality gates; this skill reads its protocol (Mode A) or delegates to it (Mode B), never re-derives them. |
| Auth, secrets, permissions, data | `security-auditor` if available; otherwise `code-reviewer` with explicit security pass.          |
| Latency, scale, memory, queries  | `performance-optimizer` if available; otherwise `code-reviewer` with explicit performance pass.  |
| Plan / task / doc / spec          | `general-purpose` with rationale/artifact dimensions.                                            |
| Mixed target                     | Split focused passes by concern; aggregate findings after all passes.                            |

### Route References (read at point of use — BLOCKING)

State which route reference you read, or why none applies, beside the recorded target type.

- **[BLOCKING]** When the review path is code-change review, the integration/E2E row above fires for any target, or the target is mixed or unresolved, read `references/code-change-path.md` in full FIRST, before the first review pass; it owns the Code-Change Review Path and the Integration-Test-Review Linkage.

### Rationale / Artifact Review Dimensions

Run one focused pass per applicable dimension; do NOT scan all dimensions simultaneously.

| Dimension          | Think                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Target fit         | Did we resolve what user asked, with evidence and confidence?                              |
| Goal alignment     | Does the rationale serve the saved Goal Contract's purpose and success criteria — or drift past them? |
| Rationale depth    | Are alternatives real, causal, symmetric, assumption-aware?                                |
| Trade-off honesty  | What does this SACRIFICE, is it worth it, and is the trade-off material enough to confirm with the user? An unpriced benefit is a rationale gap. |
| Behavioral risk    | What breaks in happy, error, edge, and rollback paths?                                     |
| Cross-boundary impact | Does a changed contract break a consumer on the other client↔server tier (BE↔FE), or a loosely-coupled/external service or event consumer? (tier seam + service/event) |
| Test/spec/doc sync | Does evidence prove tests/specs/docs protect the intended invariant and avoid stale claims? |
| Future change cost | Does recommendation reduce coupling, hidden state, duplication, unclear intent?            |

## Validation Checklist

For plan/task/artifact rationale reviews, read resolved target first. If plan directory, read `plan.md` and all `phase-*.md` files. Check **presence AND quality depth**.

For code-change reviews, use Code-Change Review Path instead of forcing plan checklist. Still include adversarial analysis, pre-mortem, assumptions, evidence, findings validation.

> **Rule:** Presence alone is NOT a pass. A section that exists but contains weak, asymmetric, or unverified reasoning FAILS quality depth.

### Required Sections (in plan.md or phase files)

| #   | Section                     | Presence Check                                    | Quality Depth Check (adversarial)                                                                                                                                                  |
| --- | --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Problem Statement**       | 2-3 sentences describing the problem              | Is the problem scoped correctly? Could it be framed differently to lead to a different solution? Are symptoms confused with root cause?                                            |
| 2   | **Alternatives Considered** | Minimum 2 alternatives listed with pros/cons      | Are alternatives real (not strawmen)? Would a domain expert seriously consider each? Are the cons of the CHOSEN approach listed, not just cons of the others?                      |
| 3   | **Design Rationale**        | Explicit reasoning linking decision to trade-offs | Is reasoning causal (X leads to Y) or just descriptive (X is better)? Are hidden assumptions surfaced? Does it address failure modes, not just success modes?                      |
| 4   | **Risk Assessment**         | At least 1 risk per phase                         | Are risks ranked by severity? Are mitigations concrete actions or vague intentions ("monitor closely")? Is there at least one risk about the approach itself (not just execution)? |
| 5   | **Ownership**               | Clear who maintains code post-merge               | Implicit OK (author owns), explicit better                                                                                                                                         |

## Residual Risk Gate

- Challenge over-broad scope, weak rejected alternatives, and any High/Medium residual risk.
- High/Medium risks must be fixed, reduced, or explicitly accepted by user/owner before PASS.
- AI-extracted spec or test-case artifacts are not accepted evidence unless the configured canonical owner/review gate accepted them.

### Optional (Flag if Missing, Don't Fail)

| #   | Section                  | When Required                           | Quality Depth Check                                                |
| --- | ------------------------ | --------------------------------------- | ------------------------------------------------------------------ |
| 6   | **Operational Impact**   | Service-layer or API changes            | Are rollback steps defined? What breaks if this is reverted?       |
| 7   | **Cross-Service Impact** | Changes touching multiple microservices | Are all downstream consumers identified? Who needs to be notified? |
| 8   | **Migration Strategy**   | Database schema or data changes         | Is there a rollback plan? Is it tested on a data sample?           |

## Output Format

```markdown
## Why-Review Results

**Plan:** {plan path}
**Target Type:** {plan/task/code changes/docs/spec/report/artifact}
**Target:** {path, commit, branch range, or artifact}
**Date:** {date}
**Verdict:** PASS / NEEDS WORK

### Checklist

| #   | Check                   | Presence | Quality Depth | Notes                            |
| --- | ----------------------- | -------- | ------------- | -------------------------------- |
| 1   | Problem Statement       | ✅/❌    | ✅/⚠️/❌      | {what's strong / what's weak}    |
| 2   | Alternatives Considered | ✅/❌    | ✅/⚠️/❌      | {are they real or strawmen?}     |
| 3   | Design Rationale        | ✅/❌    | ✅/⚠️/❌      | {causal or just descriptive?}    |
| 4   | Risk Assessment         | ✅/❌    | ✅/⚠️/❌      | {concrete mitigations or vague?} |
| 5   | Ownership               | ✅/❌    | ✅/⚠️/❌      | {details}                        |
| 6   | Bugfix Debugger Trace   | ✅/❌/N/A | ✅/⚠️/❌     | {final state, feeder paths, hypothesis matrix, owner, forward proof} |
| 7   | Trade-Off Gate          | ✅/❌    | ✅/⚠️/❌      | {trade-off named? worth-it verdict? material → user confirmed?}  |

> ✅ Strong ⚠️ Weak/Partial ❌ Missing

### Adversarial Analysis

**Strongest arguments AGAINST the chosen approach:**

1. {argument 1 — cite specific plan text that weakens under this pressure}
2. {argument 2}
3. {argument 3 if applicable}

**Unexamined alternatives** (not mentioned in the plan):

- {alternative A} — why it might be worth considering
- {alternative B if applicable}

**Weakest assumptions** (if wrong, the plan breaks):

1. {assumption} — impact if false: {consequence}
2. {assumption} — impact if false: {consequence}

**Bugfix trace challenge** (required for bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix plans):

- Observed final state and final reader proven? {yes/no/N/A}
- All feeder paths enumerated or explicitly bounded? {yes/no/N/A}
- Hypothesis matrix includes ruled-out and latent causes, not only the chosen cause? {yes/no/N/A}
- Owning fix layer protects all downstream consumers? {yes/no/N/A}
- Forward convergence proof and tests/proof mapping make the symptom impossible or detect recurrence? {yes/no/N/A}

**Pre-mortem** (assume it ships and fails in 3 months):

> {One concrete, plausible failure scenario based on the plan's approach}

**Pros/Cons symmetry:** Pros listed: {N} | Cons listed: {N} | Bias: {balanced / leans toward pros / leans toward cons}

### Trade-Off Assessment (MANDATORY — one row per reviewed decision AND per recommendation you make)

| # | Decision / recommendation | Trade-off — what it sacrifices | Gain (metric) | Who pays, when | Worth it? | Material? | Confirmed with user? |
| - | ------------------------- | ------------------------------ | ------------- | -------------- | --------- | --------- | -------------------- |
| 1 | {decision or my recommendation} | {sacrifice — or dimensions checked + why unaffected} | {gain + metric} | {payer / when due} | WORTH IT / NOT WORTH IT / UNCLEAR | YES / NO ({which materiality row}) | asked / N/A (not material) |

> Material trade-off with `Confirmed with user? = no` → verdict CANNOT be PASS. Escalate via `ask user question tool` first.

**Cross-Boundary Impact:** (code-change targets) {per client↔server seam AND per service/event/external touchpoint: NONE / ADDITIVE / BREAKING with routed fix; or `Single-tier / monolith — N/A`}

### Missing Items (if any)

- {specific item to add before implementation}

### Recommendation

{Proceed to /feature-implement | Add missing sections first | Add adversarial analysis to plan/task | Fix code findings | Update docs or specs | Continue manually}
```

## Round 2: Adversarial Re-Review (conditional)

> **Protocol:** Deep Multi-Round Review (published full owner `.claude/skills/shared/protocols/review-policy.md`; read it when absent from current context)

**When it runs:** only when Round 1 found at least one MEDIUM or higher finding, or the target is a one-way door (irreversible or costly to walk back: a public contract, data or schema, an architecture boundary, a security or money path). Otherwise skip it and record `Round 2: SKIPPED — Round 1 found no MEDIUM+ finding and the target is two-way`; Round 1 then fills the Adversarial Analysis itself (at least 2 arguments against, 1 unexamined alternative, 2 hidden assumptions with consequences, a pre-mortem and the Trade-Off Assessment), so every review keeps its anti-bias floor.

When it runs, execute a **second full adversarial round** after Round 1:

1. **Assume Round 1 was wrong** — start with: "Round 1 missed something. Find it."
2. **Challenge every PASS item** from Round 1 — generate at least 2 sentences arguing the opposite for each
3. **Complete the Anti-Bias Gate** (all 7 boxes from Adversarial Review Mindset section, including the Trade-Off Interrogation Gate)
4. **Populate Adversarial Analysis** — MANDATORY:
    - At least 2 arguments against the chosen approach
    - At least 1 unexamined alternative
    - At least 2 hidden assumptions with failure consequences
    - Pre-mortem scenario
    - Pros/Cons symmetry count
    - Trade-Off Assessment table — every decision AND every recommendation of yours: trade-off named, worth-it verdict, materiality decided; re-ask the 3 questions on any trade-off Round 1 called "none" — why: Round 1's most common miss is an unpriced benefit.
5. **Focus on Round-1 misses:**
    - Alternatives that are strawmen (too easy to dismiss)
    - Risks stated vaguely without concrete mitigations
    - Assumptions embedded in the problem statement itself
    - Scope creep disguised as "related improvements"
6. **Update verdict** if Round 2 found new issues
7. **Final verdict** incorporates every round that ran + Adversarial Analysis

## Scope

- **Applies to:** Features, refactors, architectural changes, commits/diffs/code changes, docs/spec/report reviews
- **Exempt from plan-rationale advisory only:** trivial config changes, tiny single-file tweaks when active workflow permits documented skip
- **Enforcement:** Advisory (soft warning) — does not block implementation

## Important Notes

- Review only — do NOT modify target files or implement changes (the opt-in `--fix-loop` mode lands validated fixes only through its validated repair phase; every review pass inside it stays review-only)
- Keep output concise — actionable in <2 minutes
- Simple plans still require Anti-Bias Gate; findings may be brief, but gate cannot be skipped

---

## Report Closure Contract

**CLEAN validates the report, not the target.** A full review with complete coverage may return a CLEAN findings-validation result while retaining CRITICAL/HIGH/MEDIUM findings. Preserve every retained target finding in the handoff, with severity, proof, trade-offs and dual-feedback; mark the target NEEDS WORK rather than PASS. A clean empty finding set may support target PASS only when all required review and evidence gates are complete.

This skill is report-only. Shared fix/re-review guidance applies here as validated repair handoff, not authority to edit the target. The fixing caller (for example, this skill's own `--fix-loop` mode or `/workflow-review-changes`) owns repairs, durable target-round eligibility and fresh post-fix review. Local re-dos repair report quality and never reset the caller's target-round budget. Terminal validation remains non-recursive; it neither edits the report nor performs target fixes.

## Findings Validation Gate (full mode — MANDATORY CLOSING TASK when findings exist)

> **Purpose:** Before handoff, re-validate THIS review's OWN findings: **correct, proof-backed, reasonable, best-practice**. Catch finding issues and missed enhancements.

**Trigger:** Full mode with ANY finding, weakness, missing item, or NEEDS WORK verdict — of ANY severity (Critical, High, Medium, OR Low). A Medium or Low severity NEVER exempts a finding from validation; even one low-severity nit triggers the gate. Skip ONLY unconditional PASS with a literally empty finding set (zero findings/missing items of any severity); record skip reason. Also skip when called with `--loop-owner=caller`: the caller validates the merged report once (`/start-workflow` → Workflow-step mode). **NEVER run in `validate-findings` mode**. — why: "it's only Low" is itself a severity claim the validation pass must confirm, not a reason to skip it.

**Findings validation:** Run `/why-review --validate-findings` once on the current report when findings exist. Reconcile rejected or inflated claims with evidence and retain valid findings for the fixing owner. Fix-loop then repairs validated findings and freshly re-runs the complete target review; review-only hands them off. Any unresolved report/evidence issue remains blocked under the same round budget, never a second nested loop.

## Evidence and Semantic Coverage

Search 3+ comparable patterns and read target files before judging conventions; verify their preconditions. Read the project references selected by the Project Reference Docs Gate, including the configured lessons owner. Persist long-review evidence incrementally to `tmp/reports/` and add a final quality-review task.

Judge the whole package: configured canonical owner requirements/invariants and profile-declared canonical scenario/case identities, mapped executing tests and assertions, and changed code. A missing or disagreeing face is a finding (CODE-WRONG / SPEC-STALE / TEST-GAP / SPEC-SILENT); use §3 AC / §4 BR / §8 TC only for the strict default profile. Every behavior-changing finding requires a spec-drift verdict AND a profile-mapped test-feedback action. SPEC-SILENT requires canonical requirement/scenario enrichment and an actual guarding assertion, never an invariant left only in code or tests.

For bugfix, regression or behavior-changing reviews, walk the End-to-Start trace and produce the Behavioral Delta Matrix (≥3 rows, including ≥1 outside the bug report). A REGRESSION delta blocks until a preservation test covers it. Fix recommendations name the contract owner supported by architecture and source evidence; a layer order or number of touched files does not establish ownership.

Gate every finding on concrete file:line evidence, severity and confidence (>80% to act; <60% do not recommend; ≥85% to retain a finding). Evaluate repeated responsibilities for sharing only when actual consumers or an evidenced change axis justify one owner and lower future change cost. Similar names/text or occurrence counts alone neither require nor forbid an abstraction. For any review round using sub-agents, spawn fresh reviewers, include all 11 verbatim prompt protocols, integrate their findings raw and never filter, soften or override them.

## Next Steps

Apply `SYNC:review-decision-autonomy`: choose and record the best supported next step without asking the user to choose your recommendation. Return the validated findings/report in standalone or report-only mode; continue the already-authorized caller workflow. A clean review does not authorize unrelated implementation. Material trade-offs retain their assessment and evidence; supported reviewer decisions do not waive residual-risk or quality gates.

Terminal validation returns its verdict without a next-step prompt. Read-only leaves return findings and recommended remedies to their fixing owner. At an exhausted budget or genuine evidence/authority blocker, report the unresolved state and concrete recommended recovery; ask only for indispensable facts or missing operation authority. At the round limit, ask the user whether to extend by a bounded number of rounds or stop.


### Conditional council recommendation

Preserve the existing council eligibility and workflow suppression before recommending deeper decision review:

1. **Workflow suppression first:** resolve the current `workflowId` from host-injected workflow context; when it is not already present, read the host's documented state owner — `.claude/hooks/lib/workflow-state.cjs` owns `CK_TMP_DIR/workflow/{sessionId}.json` in this repository, while a host may use a legacy `.workflow-state.json` at the plans root (default `plans/`; relocated by `docsRoots.plans.path` in `docs/project-config.json`) only when that file is actually present. Never assume the legacy file exists. If no state is available, record `workflowId = unavailable` and continue to the frontmatter gate without fabricating a workflow. Suppress council for `workflow-refactor`, `workflow-bugfix`, and `test-*`; these routine/reversible/test-only workflows use the existing rationale review without the council's 11-call cost.
2. **Frontmatter gate:** read active plan or task frontmatter. Consider council only for `cross_service_impact != NONE`, `breaking_changes`, `complexity in {high, critical}`, `effort_points >= 13`, `new_framework`, `irreversible`, `security_critical`, `performance_critical` or `cost_high`. Absent fields default no-fire; `council_suppress: true` suppresses the recommendation and records its reason.
3. **Supported choice:** if suppressed or no-fire, return without a council prompt. If eligible, judge whether the existing review evidence is sufficient and select the best supported recommendation under review autonomy, recording cost and rationale. A read-only leaf returns that recommendation; the caller acts only within its existing authority and the council owner's invocation contract. Do not manufacture a second user-choice question.

**Anti-Rationalization:**

| Evasion                 | Rebuttal                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------- |
| "No active plan"        | Valid only for unresolved plan-rationale requests; commits/diffs/tasks/docs are targets. |
| "Just code review"      | Still resolve target, read docs, map tests/specs/docs.                       |
| "Findings look obvious" | Validate every finding via terminal `--validate-findings`.                              |
| "Report zero findings, skip the gate" | Suppressing/demoting findings to dodge validation is the exact bias the SKEPTIC stance forbids; surface them, THEN validate. |
| "Validate inline, don't re-invoke" | The second pass is a real terminal `/why-review --validate-findings` call on the written report — not a mental once-over. |
| "All dimensions at once" | One focused pass per dimension; split attention catches misses.                        |
| "Ask the user to choose my recommendation" | Choose the evidence-supported review decision and record it; preserve round-extension approval and action authority. |
| "Looks good / faces agree" | Default SKEPTIC; complete all 7 Anti-Bias boxes; triangulate spec↔tests↔code — any disagreeing face is a finding. |
| "No trade-off here / pure win" | Unexamined ≠ absent. Name the dimensions checked (change cost, complexity, perf, coupling, reversibility, ops, security, delivery) and why each is unaffected. |
| "Trade-off is obvious, it's fine" | Emit the explicit WORTH IT / NOT WORTH IT / UNCLEAR verdict with gain, cost, who pays, when. "Obvious" is not a verdict. |
| "Autonomy means risk acceptance" | A supported review decision never closes an open finding or waives an action permission. |
| "Just a review, not my decision to escalate" | Surfacing a material trade-off for the user's call IS the review's job; silence hands the decision to no one. |
| "Behavior change, no spec impact" | Emit a spec-drift verdict + profile-mapped test action; SPEC-SILENT requires requirement/invariant and scenario/case enrichment at the configured owner plus a guarding test. Strict default only: §4 BR/§3 AC + §8 TC. |
| "Fix where it crashes"  | Trace the invariant owner from the actual architecture; retain validation at untrusted boundaries.       |
| "High risk, but ship"   | High/Medium residual risk must be fixed, reduced, or owner-accepted before PASS.        |
