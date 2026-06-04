---
name: why-review
description: '[Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts.'
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

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[GOAL REMINDER — MUST ATTENTION CRITICAL]**
>
> Ensure every review target is reasonable, correct, proof-backed, and best-practice aligned.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Resolve the requested review target and apply the matching adversarial review path (plan/PBI rationale, code changes, docs/spec/report, findings, or explicit artifact) so decisions, findings, and plans survive adversarial rationale review before downstream work proceeds.

**Summary:**

- DETECT MODE FIRST: `--validate-findings` is TERMINAL — it never re-invokes `$why-review`, never runs the gate, never spawns a sub-agent; full mode may call itself ONCE in validate-findings mode. This recursion guard is non-negotiable.
- Resolve the target type BEFORE reviewing — a commit/PR/diff defaults to code-change review, a PBI/spec/doc to artifact review; "no active plan" is valid ONLY for an unresolved plan-rationale request. Never silently convert target types.
- Default stance is SKEPTIC not validator: complete every box of the Anti-Bias Gate (steel-man rejected alt, unseen alternative, args against, stressed assumptions, pre-mortem, pros/cons symmetry); presence of a section is never a pass — quality depth is.
- Judge by Easy-to-Change (does this lower future change cost?) and gate every finding on `file:line`, severity, and confidence; in full mode the Findings Validation Gate on your OWN findings is the mandatory closing task when any finding exists.
- Dual-feedback validation: when validating findings, a behavior-changing finding MUST carry BOTH a spec-drift verdict (CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT / in-sync) AND a concrete test-feedback action — a missing axis is a HAS-ISSUES flag, not a clean finding; a SPEC-SILENT verdict additionally REQUIRES a spec-enrichment action (add §4 BR/§3 AC + §8 TC) on the spec axis, else HAS-ISSUES.

**Workflow:** Detect mode/target → route path/docs/graph/sub-agent focus → review dimensions/adversarial gates/Easy-to-Change → validate findings via terminal `--validate-findings` → ask next step in full mode.

**Key Rules:** MUST ATTENTION resolve target type BEFORE review. MUST ATTENTION every finding needs `file:line`, severity, confidence, best-practice rationale. NEVER say "No active plan" except unresolved plan-rationale request. NEVER call `$why-review` from `validate-findings`. MUST ATTENTION judge by Easy-to-Change: lower future change cost or reject.

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mode (DETECT FIRST — recursion control)

Detect mode from `$ARGUMENTS` BEFORE any review work:

| Mode                  | Trigger in `$ARGUMENTS`                                                                         | What it runs                                                                                                                                                                                                             | Recursion                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **full** (default)    | no `validate-findings` token                                                                    | Full design-rationale review (Validation Checklist + Adversarial Rounds below), THEN the **Findings Validation Gate** closing task — which re-invokes THIS skill in `validate-findings` mode on its own findings.        | May call itself **ONCE** in `validate-findings` mode (same session).                                      |
| **validate-findings** | `$ARGUMENTS` contains `--validate-findings` / `mode=validate-findings` / `validate findings in` | ONLY the **Findings Validation Routine** against the supplied findings/report — verify each finding is correct, proof-backed, reasonable, best-practice; surface missed enhancements; emit a CLEAN / HAS-ISSUES verdict. | **TERMINAL — NEVER calls `$why-review`, NEVER runs the gate, NEVER spawns a sub-agent.** Stops recursion. |

> **Recursion guard (NON-NEGOTIABLE):** `validate-findings` terminates. MUST NOT invoke `$why-review` or validation gate — prevents infinite recursion. Re-do loop lives in CALLER, max 2 re-dos, SAME main-agent session, NEVER spawned sub-agent.

> **In `validate-findings` mode:** skip full Validation Checklist, Adversarial Rounds, Task Bootstrap, Next-Steps council gate. Jump straight to **Findings Validation Routine**, emit verdict, return to caller.

## Task Bootstrap (full mode — do at skill START)

Before review work, task tracking phase tasks AND required closing task:

- [ ] `[Why-Review] Findings Validation Gate — if ANY findings exist, run $why-review --validate-findings on them; re-do until CLEAN (max 2)` — pending **(MANDATORY CLOSING TASK)**

> Create at START. Keep `pending` until findings exist; then execute before skill completes. In `validate-findings` mode, do NOT create it.

## First Principle — Easy to Change

> **Success metric: future change cost.** DRY, SRP, abstraction, design patterns, naming, layering, tests exist to make next change cheaper.

When reviewing code/refactor/test/abstraction, ask: **does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff.
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Prefer simple design easy to change over sophisticated design hard to change.

Apply before any rule/checklist below; if downstream rule raises change cost, this principle wins.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC, not validator. Your job is to find what's wrong, not confirm what's right.**

> **Confirmation bias trap:** After reading a coherent plan, AI naturally finds reasons to agree. Current context (post-plan, post-fix) amplifies this — you already saw the reasoning and rationalized it. This section breaks that loop. — why: a reviewer who already endorsed the reasoning cannot also be its skeptic without a forced reset.

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

### Forbidden Patterns

| Forbidden pattern       | Required correction                                      |
| ----------------------- | -------------------------------------------------------- |
| "Looks good because..." | Lead with challenges first.                              |
| Presence = quality      | Test quality depth; real alternatives, causal rationale. |
| Vague rationale         | Demand metric + cost: better at what cost?               |
| Asymmetric trade-offs   | Treat 3 pros / 1 con as incomplete analysis.             |
| "Looks fine"            | Provide adversarial challenge evidence.                  |

### Anti-Bias Gate (MANDATORY before finalizing verdict)

Complete ALL checks before writing the final verdict (MUST ATTENTION):

- steel-man at least one rejected alternative (argue FOR it)
- identify at least 1 alternative NOT in the plan
- list 2-3 arguments AGAINST the chosen approach
- surface 2-3 hidden assumptions with stress tests
- run the pre-mortem (one concrete failure scenario)
- check pros/cons symmetry

Any check incomplete → adversarial review NOT complete. Go back.

## Target Resolution (DO THIS BEFORE REVIEW)

Analyze user request, not only literal argument shape. Determine target, then choose matching path.

| User request / evidence                              | Review path                        | Required target work                                                                                                                  |
| ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit plan directory, `plan.md`, phase files      | Plan-rationale review              | Read `plan.md` and all `phase-*.md` files.                                                                                            |
| PBI/story/spec planning artifact, rationale request  | PBI/artifact rationale review      | Read the named artifact and related acceptance/design/risk sections; if it references plan files, read those too.                     |
| Commit SHA, `Commit: ...`, PR/merge commit, git diff | Code-change review                 | Establish the diff range, read changed files, run graph impact when available, and apply code-review/adversarial review protocols.    |
| Branch comparison or uncommitted changes             | Code-change review                 | Use the requested branch/diff or `git diff`; read changed files and tests/docs touched by the diff.                                   |
| Docs/spec/report/findings path                       | Artifact review                    | Read the target artifact and verify claims against source evidence; use rationale checklist only where the artifact is a plan/PBI.    |
| Ambiguous request                                    | Infer from evidence; ask if unsafe | Prefer a reasonable target from the request and repo evidence. Ask only when two plausible review paths would produce different work. |

**Important defaults:**

1. Commit hash / `Commit:` block => code-change review, not "no active plan."
2. PBI file => review that PBI/artifact; no `plans/**/plan.md` wrapper required.
3. "No active plan found. Run `$plan` first." valid ONLY for unresolved plan-rationale requests.
4. MUST ATTENTION record target type, evidence, confidence; NEVER silently convert target types.

**Active-goal read (BEFORE judging rationale):** Resolve active Goal Contract per goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). When one exists, review artifact's rationale AGAINST saved Original Request, Purpose, Success Criteria — flag rationale justifying work the saved goal never asked for, and saved required criteria the artifact's reasoning never addresses. When none exists, record `No active goal — rationale reviewed against the current request only.` Full mode only; `--validate-findings` terminal mode skips this read.

### Review Focus Routing

| Detected concern                 | Primary focus / sub-agent route                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Source code / diff               | `code-reviewer` + embedded code-review protocols.                                               |
| Auth, secrets, permissions, data | `security-auditor` if available; otherwise `code-reviewer` with explicit security pass.         |
| Latency, scale, memory, queries  | `performance-optimizer` if available; otherwise `code-reviewer` with explicit performance pass. |
| Plan / PBI / doc / spec          | `general-purpose` with rationale/artifact dimensions.                                           |
| Mixed target                     | Split focused passes by concern; aggregate findings after all passes.                           |

### Code-Change Review Path

When target is code changes:

1. Resolve the diff source:
    - Commit SHA: use `git show --name-status` and diff against its first parent.
    - Merge commit: default to first-parent diff unless the user specifies another parent/range.
    - Branch/range: use the user-supplied range.
    - Uncommitted changes: use `git diff` plus staged diff if relevant.
2. Read the changed files and any nearby tests/docs required to prove behavior.
3. Read project reference docs based on changed file types before judging patterns.
4. If `.code-graph/graph.db` exists, run graph blast-radius or trace on key changed files before concluding.
5. Apply embedded code-review protocols by serial focused pass: bug detection, design patterns quality, logic/intention, test/spec verification, graph investigation, Easy-to-Change.
6. Output findings first, with `file:line` evidence, severity, confidence, and tests/docs gaps.

### Rationale / Artifact Review Dimensions

Run one focused pass per applicable dimension; do NOT scan all dimensions simultaneously.

| Dimension          | Think                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Target fit         | Did we resolve what user asked, with evidence and confidence?                                         |
| Goal alignment     | Does the rationale serve the saved Goal Contract's purpose and success criteria — or drift past them? |
| Rationale depth    | Are alternatives real, causal, symmetric, assumption-aware?                                           |
| Behavioral risk    | What breaks in happy, error, edge, and rollback paths?                                                |
| Test/spec/doc sync | Does evidence prove tests/specs/docs protect the intended invariant and avoid stale claims?           |
| Future change cost | Does recommendation reduce coupling, hidden state, duplication, unclear intent?                       |

## Validation Checklist

For plan/PBI/artifact rationale reviews, read resolved target first. If plan directory, read `plan.md` and all `phase-*.md` files. Check **presence AND quality depth**.

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
- AI-extracted specs/TCs are not accepted evidence unless the canonical owner/review gate accepted them.

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
**Target Type:** {plan/PBI/code changes/docs/spec/report/artifact}
**Target:** {path, commit, branch range, or artifact}
**Date:** {date}
**Verdict:** PASS / NEEDS WORK

### Checklist

| #   | Check                   | Presence  | Quality Depth | Notes                                                                |
| --- | ----------------------- | --------- | ------------- | -------------------------------------------------------------------- |
| 1   | Problem Statement       | ✅/❌     | ✅/⚠️/❌      | {what's strong / what's weak}                                        |
| 2   | Alternatives Considered | ✅/❌     | ✅/⚠️/❌      | {are they real or strawmen?}                                         |
| 3   | Design Rationale        | ✅/❌     | ✅/⚠️/❌      | {causal or just descriptive?}                                        |
| 4   | Risk Assessment         | ✅/❌     | ✅/⚠️/❌      | {concrete mitigations or vague?}                                     |
| 5   | Ownership               | ✅/❌     | ✅/⚠️/❌      | {details}                                                            |
| 6   | Bugfix Debugger Trace   | ✅/❌/N/A | ✅/⚠️/❌      | {final state, feeder paths, hypothesis matrix, owner, forward proof} |

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

### Missing Items (if any)

- {specific item to add before implementation}

### Recommendation

{Proceed to $feature-implement | Add missing sections first | Add adversarial analysis to plan/PBI | Fix code findings | Update docs/specs | Continue manually}
```

## Round 2: Adversarial Re-Review (MANDATORY)

> **Protocol:** Deep Multi-Round Review (inlined via SYNC:double-round-trip-review above)

After Round 1, execute **second full adversarial round**:

1. **Assume Round 1 was wrong** — start with: "Round 1 missed something. Find it."
2. **Challenge every PASS item** from Round 1 — generate at least 2 sentences arguing the opposite for each
3. **Complete the Anti-Bias Gate** (all 6 boxes from Adversarial Review Mindset section)
4. **Populate Adversarial Analysis** — MANDATORY:
    - At least 2 arguments against the chosen approach
    - At least 1 unexamined alternative
    - At least 2 hidden assumptions with failure consequences
    - Pre-mortem scenario
    - Pros/Cons symmetry count
5. **Focus on Round-1 misses:**
    - Alternatives that are strawmen (too easy to dismiss)
    - Risks stated vaguely without concrete mitigations
    - Assumptions embedded in the problem statement itself
    - Scope creep disguised as "related improvements"
6. **Update verdict** if Round 2 found new issues
7. **Final verdict** incorporates BOTH rounds + Adversarial Analysis

## Scope

- **Applies to:** Features, refactors, architectural changes, commits/diffs/code changes, docs/spec/report reviews
- **Exempt from plan-rationale advisory only:** trivial config changes, tiny single-file tweaks when active workflow permits documented skip
- **Enforcement:** Advisory (soft warning) — does not block implementation

## Important Notes

- Review only — do NOT modify target files or implement changes
- Keep output concise — actionable in <2 minutes
- Simple plans still require Anti-Bias Gate; findings may be brief, but gate cannot be skipped

---

## Findings Validation Gate (full mode — MANDATORY CLOSING TASK when findings exist)

> **Purpose:** Before handoff, re-validate THIS review's OWN findings: **correct, proof-backed, reasonable, best-practice**. Catch finding issues and missed enhancements.

**Trigger:** Full mode with ANY finding, weakness, missing item, or NEEDS WORK verdict. Skip ONLY unconditional PASS with zero findings/missing items; record skip reason. **NEVER run in `validate-findings` mode**.

**Caller-side re-do loop (bounded — owned HERE, not by validate mode):**

1. Ensure findings written to a report (`plans/reports/why-review-{date}.md`).
2. **Invoke `$why-review --validate-findings plans/reports/why-review-{date}.md`** in SAME main-agent session, NOT sub-agent. Returns CLEAN / HAS-ISSUES. Each call terminal.
3. **CLEAN** → append `## Findings Validation` line to report ("All N findings re-validated; correct, proof-backed, reasonable, best-practice; no changes."), gate PASSES, exit loop.
4. **HAS ISSUES** → reconcile: drop/demote unproven or inflated findings, fix proof gaps, add surfaced findings/enhancements, re-derive verdict, record `## Findings Validation Notes` citing what changed and why.
5. **RE-DO** — re-invoke on UPDATED report ONLY because findings changed. Repeat until CLEAN or **max 2 re-do rounds**. Still not CLEAN → record unresolved state and ask user in `## Next Steps`.

## Findings Validation Routine (validate-findings mode body — TERMINAL)

> Executed ONLY in `validate-findings` mode. **TERMINAL: do NOT call `$why-review`, do NOT run gate, do NOT spawn sub-agent, do NOT create closing task.** Validate, emit verdict, return.

Read supplied findings/report (path from `$ARGUMENTS`). For EACH finding, weakness, missing item, adversarial argument, assumption, verify ALL four:

- **Correct** — re-trace cited plan text / `file:line`; finding actually holds (not a misread or stale reference).
- **Proof-backed** — concrete `file:line` or quoted plan/report section present; reject "probably / should be / I think".
- **Reasonable** — severity/weight proportionate, not inflated; steel-man of opposing view does not dissolve it.
- **Best-practice** — recommendation reflects project conventions and Easy-to-Change metric (lowers future change cost), not preference or speculative generality.
- **Dual-feedback (behavior-changing findings only)** — if ANY finding changes observable behavior, confirm that BOTH halves of the feedback are present for it: (1) a spec-drift verdict — CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT / in-sync (per `SYNC:spec-drift-adjudication`) — AND (2) a concrete test-feedback action (regression/preservation TC via `$spec [mode=tests]`, or covering test via `$integration-test`). A behavior-changing finding missing EITHER half is a validation FAIL — flag it as HAS-ISSUES and name the missing axis (`spec verdict absent` or `test feedback absent`). A **SPEC-SILENT** verdict (code correctly enforces an invariant no spec artifact states) REQUIRES a spec-enrichment action on the spec axis — add the §4 BR/§3 AC + a §8 TC via `$spec [update]` + `$spec [mode=tests]`; a SPEC-SILENT finding with no spec-enrichment action is HAS-ISSUES, same as a blank dual-feedback axis. A code-only fix with no spec verdict and no owed TC is an incomplete finding, not a clean one.

Then **sweep for misses** — apply Adversarial Techniques once more: unexamined alternative, hidden assumption, enhancement opportunity?

**Emit a verdict** to `plans/reports/why-review-validate-{date}.md`:

- **CLEAN** — every finding passes all four checks AND nothing new surfaced.
- **HAS ISSUES** — list each finding to drop/demote/fix (reason + `file:line`) and each newly surfaced finding/enhancement (`file:line`).

Return verdict path + status. **Caller owns reconciliation and bounded re-do; routine does NOT modify caller report and does NOT loop.**

---

## Next Steps

> **EXEMPT in `validate-findings` mode:** terminal mode returns verdict; skip `## Next Steps`, a direct user question, council gate.

**MANDATORY — FULL MODE:** after review, use a direct user question; user owns next step.

- **"$feature-implement (Recommended)"** — Begin implementation after design rationale is validated
- **"$plan-execute"** — If implementing a simpler change
- **"Skip, continue manually"** — user decides

### Additionally — conditional $llm-council escalation

After first next-step question, evaluate gate:

1. **Workflow suppression first:** read `plans/.workflow-state.json` or equivalent `workflowId`. Suppress council for `workflow-refactor`, `workflow-bugfix`, and `test-*`. Rationale: council costs 11 LLM calls; these workflows are routine/reversible/test-only enough for `$why-review`. Matches `.claude/skills/llm-council/SKILL.md` "Workflow Integration".
2. **Frontmatter gate:** read active `plan.md` or PBI frontmatter. Gate fires when ANY true: `cross_service_impact != NONE`; `breaking_changes`; `complexity in {high, critical}` or `story_points >= 13`; `new_framework`; `irreversible`; `security_critical`; `performance_critical`; `cost_high`.
3. **Override/defaults:** absent fields default no-fire; `council_suppress: true` skips prompt and logs reason.

If suppressed or no-fire, do NOT mention `$llm-council`. If gate fires, ask a **SECOND** separate follow-up question:

- **"Escalate to $llm-council (Recommended)"** — Gate fired (high-stakes signal detected). Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Use when `$why-review` alone is insufficient. Cheaper alternatives already exhausted at this point: `$plan-validate` is the prior rung.
- **"Skip — proceed without council"** — Acknowledge the gate; proceed with current decision anyway.

> **[BLOCKING — full mode only]** MUST ATTENTION ask at least one user question before completing. `validate-findings` asks nothing because it only returns verdict.
> **[IMPORTANT]** Use task tracking before work, including file-read tasks; simple tasks need documented skip decision.
> **Critical Purpose:** Ensure quality: no flaws, bugs, missing updates, or stale content. Verify code AND documentation.
> **External Memory:** Long reviews write intermediate + final results to `plans/reports/`.
> **Evidence Gate:** MANDATORY every claim/finding/recommendation requires `file:line` proof or trace with confidence (>80% act, <80% verify).
> **OOP & DRY Enforcement:** MANDATORY flag 3+ duplicated patterns for extraction; same-group/suffix classes (`*Entity`, `*Dto`, `*Service`) should share a base when it lowers future change cost.

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

<!-- SYNC:behavioral-delta-matrix -->

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

<!-- /SYNC:behavioral-delta-matrix -->

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
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

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

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

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

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Resolve the requested review target and apply the matching adversarial review path (plan/PBI rationale, code changes, docs/spec/report, findings, or explicit artifact) so decisions, findings, and plans survive adversarial rationale review before downstream work proceeds.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** these are signposts — the canonical bodies above are binding; MUST ATTENTION honor each, NEVER treat a digest line as the full rule.

- **End-To-Start Debugger Trace:** for non-trivial bugs, trace observed final state backward to trigger.
- **Behavioral Delta Matrix:** bugfix verdict needs ≥3-row pre/post delta table, one outside report.
- **Nested Task Creation:** workflow rows still expand child phase tasks; link parent when nested.
- **Project Reference Docs:** read scoped project docs (always `lessons.md`) before judging conventions.
- **Task Tracking & External Report:** bootstrap tasks; persist long-review findings to `plans/reports/` incrementally.
- **Critical Thinking:** every claim traced + proof-backed; confidence >80% to act, stay self-skeptical.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Evidence-Based Reasoning:** cite `file:line`/grep/docs for every claim; no proof, no recommendation.
- **Double Round-Trip Review:** review → validate → fix validated → full re-review until clean ends loop.
- **Fresh Context Review:** after a fix cycle restart full review with fresh zero-memory sub-agents.
- **Review Protocol Injection:** embed all 11 protocol bodies VERBATIM into each fresh sub-agent prompt.
- **Graph Impact Analysis:** run blast-radius when graph.db exists; impacted minus changed = stale files.
- **Severity Rubric:** classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS.

**IMPORTANT MUST ATTENTION** default stance SKEPTIC, NOT validator — before ANY verdict complete all 6 Anti-Bias Gate boxes: steel-man ≥1 rejected alternative, name ≥1 unseen alternative, list 2-3 arguments AGAINST chosen approach, stress-test 2-3 hidden assumptions, run a pre-mortem, check pros/cons symmetry. — why: section presence is never a pass, and a reviewer who already endorsed the reasoning needs a forced reset to find what's wrong.
**IMPORTANT MUST ATTENTION** resolve target type BEFORE reviewing: plan/PBI rationale, code changes, docs/spec/report, findings, or another artifact. Commit/PR/diff input defaults to code-change review; say "no active plan" ONLY for unresolved plan-rationale requests, NEVER silently convert target types. — why: wrong target type reviews the wrong artifact against the wrong checklist.
**IMPORTANT MUST ATTENTION** recursion guard is non-negotiable: full mode may call `$why-review --validate-findings` at most ONCE; validate-findings mode is TERMINAL — NEVER re-invokes why-review, NEVER runs the gate, NEVER spawns a sub-agent. — why: any of these from terminal mode causes infinite recursion.

**IMPORTANT MUST ATTENTION** cite `file:line` evidence + severity + confidence for EVERY finding (>80% act, <60% do NOT recommend); reject "probably / should be / I think" — why: an unproven finding is speculation, not a review result.
**IMPORTANT MUST ATTENTION** judge by Easy-to-Change — every finding, test, refactor, abstraction must lower future change cost; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent, premature irreversible decisions) or reject the recommendation. — why: this metric overrides any downstream "best practice" that raises change cost.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read target files BEFORE judging conventions; evaluate fit before flagging a nearby pattern as "wrong" (closest example ≠ matching preconditions). — why: local conventions override generic framework defaults; pattern-matching without context manufactures false findings.
**IMPORTANT MUST ATTENTION** break work into small todo tasks via task tracking BEFORE starting; in full mode create the **Findings Validation Gate** closing task at skill START (Task Bootstrap) and run it whenever findings exist — re-invoke `$why-review --validate-findings` (TERMINAL, SAME session) to confirm every finding is correct, proof-backed, reasonable, best-practice; RE-DO ONLY on surfaced finding issues/enhancements (max 2 re-dos, then escalate via a direct user question). — why: the gate catches inflated, misread, or unproven findings before handoff.
**IMPORTANT MUST ATTENTION** execute the review loop: review → validate findings → fix validated findings → full re-review; a complete review pass with zero findings ENDS the review. NEVER fix unvalidated findings; NEVER reuse a sub-agent across rounds (spawn NEW `spawn_agent` calls); main agent reads sub-agent reports but does NOT filter or override. — why: every fix invalidates the prior verdict, and orchestrator confirmation bias hides regressions a fresh zero-memory reviewer catches.
**IMPORTANT MUST ATTENTION** judge the WHOLE PACKAGE, not the diff alone — load the behavior's spec (§3 AC / §4 BR / §8 TC), its tests, and the changed code together and triangulate; a missing or disagreeing face is itself a finding (CODE-WRONG / SPEC-STALE / TEST-GAP / SPEC-SILENT). NEVER mark PASS while any face disagrees without a logged finding. — why: the diff is the entry point, the package is the unit of judgment.
**IMPORTANT MUST ATTENTION** every behavior-changing finding carries BOTH a spec-drift verdict (CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT / in-sync) AND a concrete test-feedback action; a SPEC-SILENT verdict additionally REQUIRES a spec-enrichment action (§4 BR/§3 AC + §8 TC). A missing axis is HAS-ISSUES, never a clean finding. — why: code-only fixes silently drop the invariant from the spec and leave it unguarded.
**IMPORTANT MUST ATTENTION** for bugfix / regression / behavior-changing reviews, walk the End-to-Start debugger trace (observed final state → backward → feeder paths → hypothesis matrix → owning layer → forward convergence proof) and produce the Behavioral Delta Matrix (≥3 rows, ≥1 row outside the bug report) BEFORE the verdict; any REGRESSION delta → FAIL until a preservation test covers it. — why: narrative claims hide regressions and symptom-first fixes the matrix and trace force into view.
**IMPORTANT MUST ATTENTION** require fixes at the owning layer — the lowest layer that owns the invariant — NEVER at the symptom/crash site; a fix touching 3+ files with defensive checks signals the wrong layer, go lower. — why: symptom-site patches leave every other consumer exposed.
**IMPORTANT MUST ATTENTION** High/Medium residual risk must be fixed, reduced, or explicitly accepted by the user/owner before PASS; AI-extracted specs/TCs are not accepted evidence unless the canonical owner/review gate accepted them. — why: unowned residual risk is a deferred failure, not a pass.
**IMPORTANT MUST ATTENTION** flag 3+ duplicated patterns for extraction and same-suffix classes (`*Entity`/`*Dto`/`*Service`) for a shared base when it lowers future change cost; NEVER recommend a pattern with fewer than 3 occurrences (YAGNI). — why: both over- and under-abstraction raise future change cost.
**IMPORTANT MUST ATTENTION** read reference docs chosen by Project Reference Docs Gate (always include `docs/project-reference/lessons.md`); persist long-review findings to `plans/reports/` incrementally; validate the next step with the user via a direct user question in full mode — NEVER auto-proceed. — why: project docs override generic assumptions, external memory survives compaction, and the review gate is user-owned.
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **[GOAL REMINDER — MUST ATTENTION CRITICAL]**
>
> Ensure every review target is reasonable, correct, proof-backed, and best-practice aligned.

**Anti-Rationalization:**

| Evasion                           | Rebuttal                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "No active plan"                  | Valid only for unresolved plan-rationale requests; commits/diffs/PBIs/docs are targets.                           |
| "Just code review"                | Still resolve target, read docs, run graph, map tests/specs/docs.                                                 |
| "Findings look obvious"           | Validate every finding via terminal `--validate-findings`.                                                        |
| "All dimensions at once"          | One focused pass per dimension; split attention catches misses.                                                   |
| "Ask later"                       | Full mode asks user next step before completion.                                                                  |
| "Looks good / faces agree"        | Default SKEPTIC; complete all 6 Anti-Bias boxes; triangulate spec↔tests↔code — any disagreeing face is a finding. |
| "Behavior change, no spec impact" | Emit spec-drift verdict + test-feedback action; SPEC-SILENT requires §4 BR/§3 AC + §8 TC enrichment.              |
| "Fix where it crashes"            | Fix at the owning layer (lowest invariant owner); the crash site is the symptom, not the cause.                   |
| "High risk, but ship"             | High/Medium residual risk must be fixed, reduced, or owner-accepted before PASS.                                  |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

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
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

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
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
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
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
