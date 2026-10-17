# `$work-item --mode=challenge` — Dev BA PIC challenge of a task draft reference

> Loaded by `work-item/SKILL.md`'s Mode Dispatch when invoked as `$work-item --mode=challenge [task path] [--reuse=<task review report | task-review>]`. This contract is the whole invocation: run the cross-person Dev BA PIC challenge of a BA drafter's task. It works called directly with no workflow; every rule, flag, output and gate below is the contract of that mode.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

> **AI-SDD Artifact Contract** — M1-M7 are hard gates: M1/M2 keep implementation identifiers in evidence carriers; M3 requires logical IDs plus abstract anchors; M4/M5 require unambiguous, rebuildable behavior; M7 requires demoable business outcomes.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate definitions and carrier rules.

> **Releasable Task Contract** — One task names one actor-facing outcome with a complete entry → result → exit journey, visible/persisted truth, applicable access/error/recovery behavior, and evidence; UI tasks require connected pages/views, navigation, components, states, and demo flow; technical work stays enabling work.
> MUST ATTENTION READ `.claude/skills/shared/releasable-task-contract.md` for the full outcome and full-flow contract.

## Contents

- [Quick Summary](#quick-summary)
- [Why This Skill Exists](#why-this-skill-exists)
- [Risk Assessment](#risk-assessment)
- [Workflow](#workflow)
- [M1-M7 Compliance Gate (BLOCKING — drives the AI Verdict)](#m1-m7-compliance-gate-blocking--drives-the-ai-verdict)
- [Output](#output)
- [Key Rules](#key-rules)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Help a Dev BA PIC challenge a BA drafter's task before planning, surfacing evidence-backed feasibility, AC, authorization, cross-service, M1-M7, releasable-outcome, and full-flow gaps so no infeasible or under-specified task reaches planning as a false APPROVE; AI analyzes, human decides.

**Summary:**

- **Purpose:** CROSS-PERSON review: a different Dev BA PIC challenges the BA drafter's task; NEVER review your own draft—use `$work-item --mode=review --type=task`. — why: external skepticism breaks confirmation bias.
- **Pipeline (8, in order):** (1) locate task → (2) detect + **confirm module via `ask user question tool` before domain docs** → (3) Technical Feasibility → (4) AC Quality + M1-M7 → (5) Cross-Cutting Concerns (auth/seed/migration/performance/UI Layout + releasable/full-flow surface) → (6) generate SPECIFIC challenge prompts with suggested answers → (7) Challenge Prompts FIRST, then AI Verdict → (8) human records final decision via `ask user question tool`.
- **Blocking gates:** Any M1-M5 or M7 failure forces `REQUEST_REVISION` with mandate ID + exact section/line/AC; missing releasable outcome or full-flow surface also forces `REQUEST_REVISION`.
- **Decision:** AI provides analysis; human decides via `ask user question tool`. Verdicts: `APPROVE` / `REQUEST_REVISION` / `ESCALATE_TO_LEAD`; technical veto is unilateral, non-technical decisions require 2/3 BA vote; Next Steps remains user-routed.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Why This Skill Exists

Informal task review misses architecture feasibility, vague AC, auth, and cross-service gaps. `$work-item --mode=refine` creates tasks; `$work-item --mode=review --type=task` is an AI review, even from a fresh context, and leaves drafter blind spots. This skill gives a different Dev BA PIC specific, evidence-backed challenges before planning.

For teams whose Dev BA PIC availability is a chronic bottleneck, an async comment-thread challenge is a valid alternative; it requires the drafter to research responses and an external ticket integration. Human decision ownership remains unchanged.

## Risk Assessment

| Risk                                                                                                                 | Likelihood | Impact | Mitigation                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Automation bias** — Dev BA PIC rubber-stamps AI verdict without independent assessment                             | High       | High   | Workflow Step 7 shows challenge prompts BEFORE the verdict — Dev BA PIC forms their own view first                       |
| **Module misdetection** — AI loads wrong domain context, produces entity conflict analysis for wrong service         | Medium     | High   | Workflow Step 2 confirms detected module with Dev BA PIC via ask user question tool before proceeding                           |
| **Challenge prompts ignored** — Drafter revises task superficially to satisfy reviewer without resolving root gaps    | Medium     | Medium | Decision Record includes drafter-response field; Dev BA PIC re-runs skill on revision, not just reads revised task        |
| **Suggested answers create adoption pressure** — Drafter adopts suggested answer rather than reasoning independently | Medium     | Medium | Suggested answers framed as "consider whether X" options, not corrections; language review in challenge prompt templates |
| **3-way BA vote deadlock** — UX BA, Designer BA, Dev BA PIC all disagree                                             | Low        | Medium | Escalation path per `ba-team-decision-model`: Engineering Manager for tech uncertainty, PO for business value            |

### Frontend/UI Context (if applicable)

For frontend/UI changes, read — every filename below resolves inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

## Workflow

> **After a task review in this run.** When this run's `work-item --mode=review --type=task` report holds rows 10-12 (module, feasibility, cross-cutting), cite its path and start Steps 2, 3 and 5 from those rows: offer the report's module in the Step 2 confirmation, re-read the evidence each row cites against the current task, evaluate each row in full yourself, and report where you disagree with the review and what it missed. These checks stay consumer-owned in the shared coverage map, so the challenge still states its own verdict on each. Spend the depth on what only this mode does: drafter-specific prompts (Step 6), shown before the AI verdict so the Dev BA PIC judges first (Step 7), and the human decision (Step 8).
> **Order.** When the workflow runs this challenge before story slicing, revisions land before stories are cut.

1. **Locate task draft** — Find BA drafter's draft in `tasks/` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) or the user-provided path. Note an optional `--reuse=<task review report>` input (see the M1-M7 gate section below).
2. **Load domain context** — Auto-detect module from task content. **MANDATORY: Use `ask user question tool` to confirm the module with the Dev BA PIC before loading domain docs.** Wrong module = wrong entity context = false APPROVE risk. Then load:
    - `domain-entities-reference.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — entity definitions
    - Relevant feature docs from `{App}/` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)
    - Existing business rules (BR-{MOD}-XXX) from feature docs
3. **Technical Feasibility Analysis:**
     - Can the described feature fit the project architecture?
     - Any domain entity conflicts? Cross-reference entity definitions.
     - Any cross-service implications? Check message-bus events and shared data.
     - Does estimated complexity align with effort points?

4. **AC Quality Analysis:**
     - Vagueness detector: flag "should", "might", "TBD", "etc.", "various", "appropriate".
     - Coverage: happy path + edge case + error case + authorization scenario.
     - Missing scenarios: suggest specific additions for the feature type.
5. **Cross-Cutting Concerns Check:**
     - Authorization section complete? Use roles × CRUD matrix.
     - Seed data addressed, or explicit "N/A"?
     - Data migration implications? Check schema changes.
     - Performance considerations for list/grid/export features?
     - **Releasable outcome and full flow present?** Name the actor-facing result, entry → action → result → exit journey, visible/persisted truth, applicable access/recovery behavior, and no standalone technical/foundation/setup scope.
     - **UI Layout/full-flow surface present?** UI tasks need `## UI Layout` per UI wireframe protocol with required pages/views, navigation map, common/domain/page components, states, and connected mock-app journey. Backend-only needs explicit "N/A" plus observable no-UI reason. Flag isolated screens or missing UI visualization.
6. **Generate Challenge Prompts** — Output specific, actionable questions with suggested answers. Use the Decision Interview protocol's card fields that fit a prompt for a drafter: what is being decided, why it matters, and the options with what each gives and costs. Keep every suggested answer framed as a "consider whether X" option with its reason, never as a correction or a marked recommendation. These prompts go into the report for the BA drafters; they are not questions put to the user in this session. Never write only "needs work" or "improve AC"; e.g., "AC #2 says 'user can filter results' — which filters? Suggest: status, date range, priority."
7. **Present Challenge Prompts first, then AI Verdict** — Show prompts BEFORE the verdict so the Dev BA PIC forms an independent view, then show `APPROVE` / `REQUEST_REVISION` / `ESCALATE_TO_LEAD`.
     - **Technical decisions** (feasibility, dependencies, cross-service impact, security): Dev BA PIC has unilateral veto power; no 2/3 vote.
     - **Non-technical decisions** (UI/UX, visual design, business value): require 2/3 majority (Dev BA PIC + UX BA + Designer BA per `ba-team-decision-model`).
8. **ask user question tool** — Brief the Dev BA PIC first, per the Decision Interview protocol: the task's outcome, the findings by severity, and what each verdict causes next. This mode asks the user at two points only, the module confirmation in Step 2 and this decision; the protocol's rounds do not add others. Then the Dev BA PIC records the FINAL decision (`APPROVE` / `REQUEST_REVISION` / `ESCALATE_TO_LEAD`) in the Decision Record. This is human decision, not Next Steps routing.

## M1-M7 Compliance Gate (BLOCKING — drives the AI Verdict)

> **[BLOCKING] MUST ATTENTION READ `.claude/skills/shared/m1-m7-gates.md`** — the six criteria (M1-M5, M7), the carrier exemption and the M1-vs-M7 rule are defined there once; do not restate them from memory.
>
> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". This challenge enforces M6: a task draft that violates any of M1-M5 or M7 MUST produce an AI Verdict of REQUEST_REVISION with a challenge prompt that names the violated mandate ID and cites the exact task section + line/AC. An APPROVE over an M1-M5 or M7 violation is itself defective. (AI provides the analysis; the human still records the final decision.)

Run the criteria as part of Step 4 (AC Quality) and Step 5 (Cross-Cutting Concerns). Each failure becomes a specific challenge prompt: the section + leaked token or offending `Given`/`When`/`Then` + a business-term or demoable rewrite to consider. If ANY criterion fails → AI Verdict is REQUEST_REVISION; tag each violated mandate ID with its concrete section/line citation in the Challenge Prompts and the AI Verdict Reason.

### Optional input — `--reuse=<task review report>` (or the workflow form `--reuse=task-review`)

Follow "Reusing an earlier verdict" in `.claude/skills/shared/m1-m7-gates.md`. When the caller passes the `work-item --mode=review --type=task` report and the task's recorded identity still matches, cite that report's verdict and evidence ONLY for what the shared coverage map lists — M1-M5/M7 and the releasable-outcome / UI full-flow surface checks. Never skipped, reuse or not: Steps 2-3 (module confirm, feasibility, estimate alignment), the Step 4 vagueness-token check (`TBD`, `etc.`, `various`, `appropriate`) and AC coverage (happy/edge/error + authorization scenario), dependencies, the seed/migration/performance/cross-service checks, the challenge prompts, and the Step 8 human decision. Record the outcome in the output's `Reuse` line. With no `--reuse` input (standalone run), or an identity that does not match (SHA-256 content hash required; see the shared file), evaluate every criterion.

## Output

```markdown
## Task Challenge Review

**Task:** {task filename}
**Reviewer:** Dev BA PIC
**Date:** {date}
**Module:** {detected module code}
**Reuse:** {none — full evaluation | task review report path + identity match + criteria reused}

### Technical Feasibility

**Status:** FEASIBLE | CONCERNS | INFEASIBLE
{Analysis with evidence — cite domain entities, service boundaries, architecture constraints}

### AC Quality

**Status:** GOOD | NEEDS_REVISION | POOR

| AC # | Issue            | Suggested Fix             |
| ---- | ---------------- | ------------------------- |
| {#}  | {specific issue} | {specific fix suggestion} |

### Cross-Cutting Concerns

| Concern        | Status    | Issue    |
| -------------- | --------- | -------- |
| Authorization  | ✅/❌     | {detail} |
| Seed Data      | ✅/❌/N/A | {detail} |
| Data Migration | ✅/❌/N/A | {detail} |
| Performance    | ✅/❌/N/A | {detail} |

### Releasable Outcome and Full-Flow Surface

| Check | Status | Evidence / Challenge |
| ----- | ------ | -------------------- |
| Actor-facing outcome and complete entry → result → exit journey | ✅/❌ | {detail} |
| No standalone technical/foundation/setup/migration outcome | ✅/❌ | {detail} |
| UI page/view inventory + navigation + common/domain/page components + applicable states + connected mock-app demo | ✅/❌/N/A | {detail or explicit backend-only reason} |

### Challenge Prompts for BA Drafters

1. {Specific actionable question with suggested answer}
2. {Specific actionable question with suggested answer}
3. {Specific actionable question with suggested answer}

### AI Verdict

**{APPROVE | REQUEST_REVISION | ESCALATE_TO_LEAD}**
**Reason:** {evidence-based justification}
**Confidence:** {X%} — {what was verified vs. what needs more investigation}

### Decision Record

**Dev BA PIC Decision:** {filled after human review via ask user question tool}
**Vote:** {approve / request-revision / escalate}
**Conditions:** {if any}
**Drafter Response (on revision):** {drafter's response to each challenge prompt — filled when Dev BA PIC re-runs on revised task}
**Resolution:** {how each challenge prompt was addressed, deferred, or accepted as known risk}
**Stored at:** `tmp/reports/task-challenge-{YYMMDD}-{task-id}.md` (save output there for audit trail)
```

## Key Rules

- **AI provides ANALYSIS, human makes DECISION** — Never auto-approve or auto-reject
- **Challenge prompts must be specific** — Include suggested answers, not just questions
- **Domain context required** — Always load entity reference + feature docs before analysis
- **Technical veto scope** — Dev BA PIC CAN veto: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value (see `.claude/skills/shared/protocols/ba-team-decision-model.md`)
- **Evidence-based** — Every concern raised must cite source (protocol section, entity definition, feature doc)
- **Constructive tone** — Focus on improving the task, not criticizing the drafters

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$work-item --mode=dor (Recommended)"** — If APPROVE: validate DoR before planning
- **"$work-item --mode=refine"** — If REQUEST_REVISION: BA drafters revise, then re-run `$work-item --mode=challenge`
- **"Escalate to Engineering Manager"** — If ESCALATE_TO_LEAD: document concern for technical consultation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

<!-- SYNC:ba-team-decision-model -->

> **BA Team Decision Model** — 2/3 majority vote: Dev BA PIC + UX BA + Designer BA per team. 2 of 3 agree = decision final. 3-way split = escalate to full team + Tech Leads + Engineering Manager.
>
> **Technical Veto:** Dev BA PIC can unilaterally veto on: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value, user research.
>
> **Rules:** Disagree-and-commit after vote. Planning override requires >75% non-BA team vote. Record decisions in Task Validation Summary (member, role, vote, notes).
>
> **Escalation:** Tech uncertainty → Engineering Manager. Business value → PO. Design feasibility → UX BA + Designer BA consensus.

<!-- /SYNC:ba-team-decision-model -->

<!-- SYNC:decision-interview -->

> **Decision Interview** — Put decisions to the user so they can judge well; applies whenever a skill asks the user to confirm, choose or validate. The hosting skill keeps its categories, budget, gates, verdicts and record format.
>
> 1. **Facts yours, decisions theirs.** Look up every fact the repository, docs, configuration or a tool can supply. Never ask for a fact you can find; never answer a decision for the user.
> 2. **Brief first.** Before the first question show, in plain language: the goal and what will be done, scope in and out, decisions already taken and why, what is touched, main risks and anything hard to undo, how success is proved, anything blocked; cite the artifact path. Keep it readable in a couple of minutes. The user must never need to open the artifact to answer.
> 3. **Rounds by dependency.** List every material decision, silent default, assumption and conflict; material = a different answer changes scope, behavior, a contract, data, cost, risk or the order of work. A round is every decision whose prerequisites are settled; a decision that depends on an open one waits for a later round. Recompute after each round: an answer can settle, open or remove decisions.
> 4. **One decision card per question.** What is decided, in one plain sentence · why it matters · what is assumed now, with evidence · 2-4 concrete options, each with what it gives, what it costs and who or what it affects · recommended option first, marked, with the reason and what would change it · whether the choice is easy to reverse. When the user needs more information, look it up, show it and ask again.
> 5. **Every material decision, none invented.** Coverage is the goal, not a count. Read linked Decision Records and resolved decision tickets first: reuse confirmed choices only while their scope and premises still hold, citing the source in the hosting record. Missing evidence, open, changed, conflicting or unconfirmed choices remain for the human. Reuse never waives the hosting skill's gates or budget. The hosting skill owns the budget: with a round size or none, run rounds until no material decision is open and tell the user how many remain; with a hard cap, ask the highest-impact decisions first, in dependency order, and record each one left unasked as unconfirmed. A minimum asks you to look wider, never to pad: with fewer genuine decisions, ask those and say so. Never re-ask a settled decision, restate the artifact as a question, or bundle several decisions into one "proceed?".
> 6. **Close the loop.** Play answers back as decision → chosen option → what changes, and record them where the hosting skill says. The user may stop at any round: record every unasked decision as an unconfirmed assumption with its reason, never as confirmed. Do not act on the outcome until the user has seen the playback.
> 7. **No user channel.** A sub-agent or headless run returns the briefing and the open decision cards to the caller as pending. Never self-answer.
>
> **BLOCKED until:** briefed before the first question · every question a decision card · every material decision asked or recorded unconfirmed · answers played back and recorded.

<!-- /SYNC:decision-interview -->

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up; derive EP; min-max range at likely ≥3d. Stack-agnostic baseline: 3-5yr dev, 6 productive hrs/day; AI assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** below — code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Range at `likely_days ≥3`; point allowed `<3`; always record margin
> 7. `man_days_ai` = same range × AI speedup
> 8. Derive `effort_points` from `likely_days` via EP-Days; NEVER driver. >50% disagreement → trust bottom-up
>
> **Existing estimates:** Read `effort_points` first; when absent, reuse an existing authored `story_points` value. Preserve historical metadata and commits. New artifacts write `effort_points` and use EP labels.
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost driver (BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier | Cost |
> | --- | --- |
> | Reuse component on existing screen | 0.1-0.3d |
> | Add control/column to existing screen | 0.3-0.8d |
> | Compose components into NEW screen | 1-2d |
> | NEW screen, custom layout/states/validation | 2-4d |
> | NEW shared/common component (themed, tested) | 3-6d+ |
>
> | Backend tier | Cost |
> | --- | --- |
> | Reuse query/handler from new place | 0.1-0.3d |
> | Small update existing handler/entity | 0.3-0.8d |
> | NEW query on existing repo/model | 0.5-1d |
> | NEW command/handler on existing aggregate (additive) | 1-2d |
> | NEW aggregate/entity (repo, validation, events) | 2-4d |
> | NEW cross-service contract OR schema migration | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule | 3-5d |
>
> **Rule:** Sum UI+backend+test tiers; apply productivity factor; call out reuse shortcuts.
>
> **Test scope:** Compute `test_count` explicitly by driver; never hand-wave "+tests".
>
> | Driver | Count |
> | --- | --- |
> | Happy-path journeys | 1 per story / AC main flow |
> | State-machine transitions | reachable transitions × allowed actors |
> | Multi-entity state combos | state(A) × state(B) — REACHABLE only, not Cartesian |
> | Authorization matrix | (owner, non-owner, elevated, unauth) × each mutation |
> | Validation rules | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only |
> | Negative paths / invariants | 1 per violatable business rule |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost |
> | --- | --- |
> | 1-5 cases, fixtures reused | 0.3-0.5d |
> | 6-12 cases, 1 new fixture | 0.5-1d |
> | 13-25 cases, multi-entity setup | 1-2d |
> | 26-50 cases OR new state-machine coverage | 2-3d |
> | >50 cases OR full E2E journey | 3-5d |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory; code AND tests):**
>
> 1. Count directly modified files/components
> 2. Count complex touches (>500 LOC, multi-handler, central, frequently-modified)
> 3. List downstream callers, event subscribers, cross-service consumers
> 4. Shared/common multi-app touch — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → `risk_factors`; each downstream consumer → +1-3 regression cases; >5 areas OR >2 complex → reconsider SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days | Base margin |
> | --- | --- |
> | <1d trivial | +10% |
> | 1-2d small additive | +20% |
> | 3-4d real feature | +35% |
> | 5-7d large | +50% |
> | 8-10d very large | +75% |
> | >10d | +100% AND **flag SHOULD SPLIT** |
>
> **Additive risk factors — enumerate in `risk_factors`:**
>
> | Factor | +margin |
> | --- | --- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20% |
> | `cross-service-contract` change | +25% |
> | `schema-migration-on-populated-data` | +25% |
> | `new-tech-or-unfamiliar-pattern` | +30% |
> | `regression-fan-out` (≥3 downstream areas re-test) | +20% |
> | `performance-or-latency-critical` | +20% |
> | `concurrency-race-event-ordering` | +25% |
> | `shared-common-code` (multi-consumer/multi-app) | +25% |
> | `unclear-requirements-or-design` | +30% |
>
> **Collapse:** margin >100% → STOP/split, never pad past 2x. Margin <15% at `likely_days ≥5` → widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max EP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **EP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** EP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> effort_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Reject/fix estimates failing these checks:**
>
> - `likely_days ≥3d` single-point → use range
> - Margin <15% at `likely_days ≥5d` → widen
> - Margin >100% → STOP/split
> - Complex touch without regression budget in `(c)` → reject
> - Blast `>5` areas OR `>2` complex without split discussion → reject
> - Additive existing model AND UI → cap EP 3 unless tests >1.5d
> - NEW page/complex form/dashboard → EP 5+ even with one backend endpoint
> - Cross-service/migration/multi-aggregate backend → EP 8+ regardless of UI
> - `bottom_up_hours / 6` vs EP-Days >50% disagreement → trust bottom-up, downgrade EP
> - Without tests EP drops ≥1 bucket → state tests dominate
> - Reasoning must cover UI/backend/blast/risk factors; add omissions

<!-- /SYNC:estimation-framework -->

<!-- SYNC:refinement-dor-checklist -->

> **Refinement DoR Checklist** — ALL 8 criteria MUST ATTENTION pass before planning:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — State the actor/precondition, trigger/action, and expected outcome in the project's accepted format (GWT is one option). No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Releasable outcome defined** — one actor-facing outcome with an entry-to-result journey, visible/persisted truth, applicable access/failure/recovery behavior, scope, and evidence; enabling work is attached rather than emitted as a technical-only task
> 4. **Full-flow wireframes/mock app attached** — UI features: `## UI Layout` or mock-app evidence covering every required page/view, navigation edge, common/domain/page component, applicable state, and end-to-end demo flow. Backend-only: explicit "N/A" plus no-UI reason
> 5. **UI design ready** — Visual design + component decomposition tree + design-spec linked (`$design-spec` artifact or inline UI specs in `## UI Layout`) for any task with UI work. Backend-only: "N/A"
> 6. **AI pre-review passed** — `$work-item --mode=review --type=task` or `$work-item --mode=challenge` returned PASS or WARN (not FAIL)
> 7. **Effort points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 EP → recommend split
> 8. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

<!-- /SYNC:refinement-dor-checklist -->

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
> **Stop conditions:** confidence <70% on any critical decision → stop and escalate via ask user question tool (70-80% → verify first) · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:ui-system-context -->

> **UI System Context** — Apply only to a user-interface surface; `.ts`, `.html`, `.scss`, or `.css` alone does not establish one.
>
> 1. Resolve applicable paths/conventions from `docs/project-config.json`, configured project-reference docs, accepted decisions, and code. Read only relevant frontend, styling, component, design, accessibility, or platform references.
> 2. Respect absent UI and explicit N/A. Require BEM, SCSS, tokens, component tiers, base classes, stores, API wrappers, or teardown helpers only when documented or demonstrated.
> 3. Follow configured/observed styling and component conventions. Use configured `componentSystem.layerClassification`; otherwise describe actual owners without imposing Common/Domain-Shared/Page tiers.
> 4. Before planning, implementing or changing frontend UI, find and read the current project's design system, tokens, shared components and UI controls plus related usage examples. Reuse/compose what fits the contract and platform; document the searched paths and any gap before adding a new control. Do not create shared bases/wrappers to satisfy a checklist.
>
> Config customization: `contextGroups[].rules`, `workflowPatterns`, `styling`, `componentSystem`, and configured reference docs.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:decision-interview:reminder -->

**MUST ATTENTION** interview: look up facts yourself · brief before the first question · ask every material decision the hosting skill's budget allows, in dependency order, as a decision card (options with gains and costs, a reasoned recommendation) · never pad or self-answer · play answers back and record unasked decisions as unconfirmed.

<!-- /SYNC:decision-interview:reminder -->

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** Before planning, implementing or changing frontend UI, find and read the current project's design system, tokens, shared components/UI controls and related usage examples; follow house conventions and reuse what fits. Start with project config and selected UI references, then inspect the actual component owners. Record searched paths and any gap before adding a control; honor explicit N/A. A reminder is not proof of discovery.

<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); EP DERIVED. UI cost usually dominates — bump EP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap EP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. EP 13 SHOULD split, EP 21 MUST split.

<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Help a Dev BA PIC challenge a BA drafter's task before planning, surfacing evidence-backed feasibility, AC, authorization, cross-service, M1-M7, releasable-outcome, and full-flow gaps so no infeasible or under-specified task reaches planning as a false APPROVE; AI analyzes, human decides.

**IMPORTANT MUST ATTENTION Main steps (8, in order):** (1) locate task draft → (2) detect + **confirm module via `ask user question tool` before loading domain docs** → (3) Technical Feasibility → (4) AC Quality (+ M1-M7 checks) → (5) Cross-Cutting Concerns (auth/seed/migration/perf/UI Layout + Releasable Outcome/full-flow surface) → (6) generate SPECIFIC challenge prompts → (7) Challenge Prompts FIRST, then AI Verdict → (8) human records decision via `ask user question tool`. NEVER skip, reorder, or merge steps without explicit user approval — why: the prompts-before-verdict and module-confirm ordering is what defeats automation bias and false APPROVE.

- **Human authority:** analysis is AI-owned, decision is human-owned. Prompts precede `APPROVE`/`REQUEST_REVISION`/`ESCALATE_TO_LEAD`; module confirmation precedes domain docs. Cross-person only; self-review routes to `$work-item --mode=review --type=task`.
- **Blocking mandates:** M1–M5 or M7 failure forces REQUEST_REVISION with mandate ID + exact section/line/AC. Apply the demo test to the BODY, independently of M1 vocabulary. Evidence carriers remain exempt. Technical-only tasks or missing full-flow UI coverage also force revision.
- **Evidence:** cite source + confidence for every concern; >80% to act, <60% do not recommend; insufficient evidence is valid. Search 3+ entity/feature examples in the confirmed module and verify matching constraints before flagging conflicts.
- **Prompts:** specific questions with suggested answers framed as “consider whether X” options, never corrections; re-run on revisions and record the drafter's responses and resolution.
- **Decision scope:** unilateral technical veto covers architecture, dependencies, cross-service impact, performance and security; UI/UX, visual design and business-value decisions require 2/3 BA majority. Preserve BA escalation, bottom-up estimate and all 8 DoR contracts in the full shared bodies.
- **Completion:** track small tasks with one `in_progress`, evidence/skips and final review; after the human decision, ask the user to choose the exact Next Steps options. Never auto-route or skip because the route seems obvious.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| "Verdict first, prompts are just support"        | Verdict-first = automation bias. Prompts FIRST so the human forms their own view.          |
| "I can review my own draft with this"            | This is cross-person review. Use `$work-item --mode=review --type=task` for self-review.            |
| "Minor M1-M5 slip, still APPROVE"                | Any M1-M5 or M7 failure forces REQUEST_REVISION. An APPROVE over a violation is itself defective. |
| "No tech words in it — M7 passes"                | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "Module is obvious, skip the confirm"            | Wrong module = wrong entity context = false APPROVE. Confirm via `ask user question tool`.        |
| "Concern is clearly right, no citation needed"   | Show `file:line` / section / entity ref + confidence. No proof = no verdict.               |
| "Challenge prompt good enough as a question"     | Must be SPECIFIC with a suggested answer, or the drafter satisfies it superficially.       |


**IMPORTANT MUST ATTENTION** closing priorities: human verdict ownership · cross-person evidence · blocking M1–M5/M7 mandates, as specified above.
