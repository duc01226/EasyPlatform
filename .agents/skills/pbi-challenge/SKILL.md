---
name: pbi-challenge
description: '[Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Break drafter confirmation bias before grooming — by helping **Dev BA PIC** (Person In Charge — development Business Analyst responsible for technical review sign-off per squad) review BA drafters' PBI drafts with specific, actionable challenge prompts, surface every architectural-feasibility, vague-AC, missing-auth, cross-service, and M1-M6 gap so an INFEASIBLE or under-specified PBI never reaches grooming with a false APPROVE. AI provides analysis; human makes decision.

**Summary:**

- This is a CROSS-PERSON review, not self-review: a _different_ reviewer (Dev BA PIC) challenges the BA drafter's PBI — never run on your own draft (use `$review-artifact --type=pbi` for that). The whole value is external skepticism that breaks the drafter's blind spots.
- Confirm the auto-detected module via a direct user question BEFORE loading domain docs (Step 2) — wrong module = wrong entity context = false APPROVE; then load domain-entities-reference + relevant `docs/specs/{App}/` feature docs.
- The M1-M6 Compliance Gate is BLOCKING and drives the verdict: any M1-M5 mandate failure forces REQUEST_REVISION with a challenge prompt naming the violated mandate ID + exact section/line/AC citation; an APPROVE over an M1-M5 violation is itself defective.
- Order matters to fight automation bias: present Challenge Prompts FIRST so the Dev BA PIC forms their own view, THEN the AI Verdict (APPROVE / REQUEST_REVISION / ESCALATE_TO_LEAD); challenges must be SPECIFIC with suggested answers, and the human records the final decision via a direct user question.

**Key distinction:** Collaborative review tool (drafter → reviewer flow), NOT self-review (use `$review-artifact --type=pbi` for AI self-review).

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Why This Skill Exists

PBI drafts routinely pass informal review unchallenged on architectural feasibility, vague AC, missing auth scenarios, cross-service impact. `$refine` generates PBIs but does not adversarially challenge them — creation tool, not review tool. `$review-artifact --type=pbi` provides AI self-review for drafter, but drafter has inherent blind spots about own assumptions. Separate reviewer (Dev BA PIC) applying AI-assisted challenge prompts breaks drafter confirmation bias before grooming — catches gaps drafter cannot catch themselves.

**Why not just `$review-artifact --type=pbi`?** Drafter runs it on own work; even with adversarial prompts, drafter rationalizes own choices. `pbi-challenge` invoked by different person with different mandate — external skepticism requires different author, not different tool on same author.

## Alternatives Considered

| Approach                                                                      | Pros                                                                     | Cons                                                                                                                | Decision                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Extend `$review-artifact --type=pbi` with a reviewer-role flag                | No new skill, single codebase                                            | Drafter runs it themselves in practice; role separation breaks down without enforcement                             | Rejected — role separation requires a distinct invocation point owned by a different person      |
| Fully autonomous AI verdict (no human decision)                               | Faster, no Dev BA PIC scheduling needed                                  | Automation bias: AI wrong on domain specifics propagates unchecked; no human accountability for false APPROVE       | Rejected — cost of false APPROVE on infeasible PBIs exceeds review time saved                    |
| Static DoR checklist given to Dev BA PIC (no AI)                              | Simple, no AI dependency                                                 | No domain entity context loading, no AC vagueness flagging; manual effort is high and inconsistent across reviewers | Rejected — AI domain lookup provides non-trivial value for cross-service entity detection        |
| Async comment-thread model (AI generates questions posted as ticket comments) | Eliminates scheduling bottleneck; drafter can research before responding | Slower feedback loop; requires external ticket integration                                                          | Valid alternative for async teams; prefer if Dev BA PIC availability is chronically a bottleneck |

## Risk Assessment

| Risk                                                                                                                 | Likelihood | Impact | Mitigation                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Automation bias** — Dev BA PIC rubber-stamps AI verdict without independent assessment                             | High       | High   | Workflow Step 7 shows challenge prompts BEFORE the verdict — Dev BA PIC forms their own view first                       |
| **Module misdetection** — AI loads wrong domain context, produces entity conflict analysis for wrong service         | Medium     | High   | Workflow Step 2 confirms detected module with Dev BA PIC via ask the user directly before proceeding                     |
| **Challenge prompts ignored** — Drafter revises PBI superficially to satisfy reviewer without resolving root gaps    | Medium     | Medium | Decision Record includes drafter-response field; Dev BA PIC re-runs skill on revision, not just reads revised PBI        |
| **Suggested answers create adoption pressure** — Drafter adopts suggested answer rather than reasoning independently | Medium     | Medium | Suggested answers framed as "consider whether X" options, not corrections; language review in challenge prompt templates |
| **3-way BA vote deadlock** — UX BA, Designer BA, Dev BA PIC all disagree                                             | Low        | Medium | Escalation path per `ba-team-decision-model`: Engineering Manager for tech uncertainty, PO for business value            |

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

## Workflow

1. **Locate PBI draft** — Find BA drafters' draft PBI in `team-artifacts/pbis/` or path provided by user
2. **Load domain context** — Auto-detect module from PBI content. **MANDATORY: Use a direct user question to confirm detected module with Dev BA PIC before loading domain docs.** Wrong module = wrong entity context = false APPROVE risk. Then load:
    - `docs/project-reference/domain-entities-reference.md` (entity definitions)
    - Relevant feature docs from `docs/specs/{App}/`
    - Existing business rules (BR-{MOD}-XXX) from feature docs
3. **Technical Feasibility Analysis:**
    - Can described features be built with the project's architecture?
    - Any domain entity conflicts? (cross-reference entity definitions)
    - Any cross-service implications? (message bus events, shared data between services)
    - Estimated complexity alignment (does scope match story points?)

4. **AC Quality Analysis:**
    - Vagueness detector: flag "should", "might", "TBD", "etc.", "various", "appropriate"
    - Coverage check: happy path + edge case + error case + authorization scenario
    - Missing scenarios: suggest specific additions based on feature type
5. **Cross-Cutting Concerns Check:**
    - Authorization section present and complete? (roles × CRUD matrix)
    - Seed data requirements addressed? (or explicit "N/A")
    - Data migration implications? (schema changes)
    - Performance considerations? (list/grid/export features)
    - **UI Layout section present?** If PBI involves UI: must have `## UI Layout` per UI wireframe protocol with wireframe + components (with tiers) + states + design tokens. If backend-only: explicit "N/A". Flag missing UI visualization as a gap.
6. **Generate Challenge Prompts** — Output specific, actionable questions:
    - NOT vague: "needs work" or "improve AC"
    - SPECIFIC: "AC #2 says 'user can filter results' — which filters exactly? Suggest: status, date range, priority"
7. **Present Challenge Prompts first, then AI Verdict** — Output challenge prompts BEFORE the verdict to prevent automation bias. Dev BA PIC reads and forms their preliminary view, THEN sees: APPROVE / REQUEST_REVISION / ESCALATE_TO_LEAD
    - **Technical decisions** (feasibility, dependencies, cross-service impact, security): Dev BA PIC has unilateral veto power — no 2/3 vote needed
    - **Non-technical decisions** (UI/UX design, visual design, business value): 2/3 majority vote required (Dev BA PIC + UX BA + Designer BA per `ba-team-decision-model`)
8. **ask the user directly** — Dev BA PIC records their FINAL decision (APPROVE / REQUEST_REVISION / ESCALATE_TO_LEAD) in the Decision Record. This is the human decision step — NOT the workflow routing step (handled separately in Next Steps)

## M1-M6 Compliance Gate (BLOCKING — drives the AI Verdict)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)". This challenge enforces M6: a PBI draft that violates any of M1-M5 MUST produce an AI Verdict of REQUEST_REVISION with a challenge prompt that names the violated mandate ID and cites the exact PBI section + line/AC. An APPROVE over an M1-M5 violation is itself defective. (AI provides the analysis; the human still records the final decision.)
>
> Carriers are EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only challenge leakage in PBI narrative prose (problem statement, AC text, scope, rule descriptions). Banned prose token list: `docs/project-reference/spec-principles.md` §3.2.

Run these five checks as part of Step 4 (AC Quality) and Step 5 (Cross-Cutting Concerns); any failure becomes a specific challenge prompt and forces REQUEST_REVISION:

- **MUST ATTENTION M1 — Tech-agnostic prose.** FAIL if problem statement, AC, or rule prose names framework/product, language-native type, or product/design-pattern class name (banned list `spec-principles.md` §3.2). Challenge: cite section + leaked token + business-term replacement. — why: stack-named prose locks the PBI to one implementation.
- **MUST ATTENTION M2 — No source code in prose.** FAIL if requirement expressed as class/method/file-path/namespace instead of business operation. Source identifiers belong only in evidence carriers. Challenge: cite section + line.
- **MUST ATTENTION M3 — Abstract-IDs-first.** FAIL if requirement/rule lacks logical ID (`FR-/BR-/OP-`), has logical ID but no `[Source: namespace/service/id]` abstract-anchor evidence, uses physical code coordinates or repository-root paths instead of abstract anchor, or makes anchor its primary citation. Evidence REQUIRED and KEPT, but SECONDARY to logical ID (physical coordinates live only in provenance sidecar).
- **MUST ATTENTION M4 — Unambiguous AC.** FAIL if any AC uses vague language ("should", "might", "appropriate", "various", "as needed"), two engineers could implement it differently while both claiming conformance, or no observable completion state / named error condition exists. (Extends Step-4 vagueness detector to M4 verdict.)
- **MUST ATTENTION M5 — Implementable from artifact alone.** FAIL if competent team with ZERO codebase knowledge could not build PBI on different stack from PBI alone (relies on reading source to understand it). Challenge: cite section + missing detail.

If ANY check fails → AI Verdict is REQUEST_REVISION; tag each violated mandate ID with its concrete section/line citation in the Challenge Prompts and the AI Verdict Reason.

## Output

```markdown
## PBI Challenge Review

**PBI:** {PBI filename}
**Reviewer:** Dev BA PIC
**Date:** {date}
**Module:** {detected module code}

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

### Challenge Prompts for BA Drafters

1. {Specific actionable question with suggested answer}
2. {Specific actionable question with suggested answer}
3. {Specific actionable question with suggested answer}

### AI Verdict

**{APPROVE | REQUEST_REVISION | ESCALATE_TO_LEAD}**
**Reason:** {evidence-based justification}
**Confidence:** {X%} — {what was verified vs. what needs more investigation}

### Decision Record

**Dev BA PIC Decision:** {filled after human review via ask the user directly}
**Vote:** {approve / request-revision / escalate}
**Conditions:** {if any}
**Drafter Response (on revision):** {drafter's response to each challenge prompt — filled when Dev BA PIC re-runs on revised PBI}
**Resolution:** {how each challenge prompt was addressed, deferred, or accepted as known risk}
**Stored at:** `plans/reports/pbi-challenge-{YYMMDD}-{pbi-id}.md` (save output there for audit trail)
```

## Key Rules

- **AI provides ANALYSIS, human makes DECISION** — Never auto-approve or auto-reject
- **Challenge prompts must be specific** — Include suggested answers, not just questions
- **Domain context required** — Always load entity reference + feature docs before analysis
- **Technical veto scope** — Dev BA PIC CAN veto: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value (see `ba-team-decision-model-protocol.md` §2)
- **Evidence-based** — Every concern raised must cite source (protocol section, entity definition, feature doc)
- **Constructive tone** — Focus on improving the PBI, not criticizing the drafters

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$dor-gate (Recommended)"** — If APPROVE: validate DoR before grooming
- **"$refine"** — If REQUEST_REVISION: BA drafters revise, then re-run `$pbi-challenge`
- **"Escalate to Engineering Manager"** — If ESCALATE_TO_LEAD: document concern for technical consultation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

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

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:ba-team-decision-model -->

> **BA Team Decision Model** — 2/3 majority vote: Dev BA PIC + UX BA + Designer BA per squad. 2 of 3 agree = decision final. 3-way split = escalate to full squad + Tech Leads + Engineering Manager.
>
> **Technical Veto:** Dev BA PIC can unilaterally veto on: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value, user research.
>
> **Rules:** Disagree-and-commit after vote. Grooming override requires >75% non-BA squad vote. Record decisions in PBI Validation Summary (member, role, vote, notes).
>
> **Escalation:** Tech uncertainty → Engineering Manager. Business value → PO. Design feasibility → UX BA + Designer BA consensus.

<!-- /SYNC:ba-team-decision-model -->

<!-- SYNC:refinement-dor-checklist -->

> **Refinement DoR Checklist** — ALL 7 criteria MUST ATTENTION pass before grooming:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — GIVEN/WHEN/THEN. No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Wireframes attached** — UI features: `## UI Layout` with wireframe + components + states + tokens. Backend-only: explicit "N/A"
> 4. **UI design ready** — Visual design + component decomposition tree. Backend-only: "N/A"
> 5. **AI pre-review passed** — `$review-artifact --type=pbi` or `$pbi-challenge` returned PASS or WARN (not FAIL)
> 6. **Story points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 SP → recommend split
> 7. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

<!-- /SYNC:refinement-dor-checklist -->

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
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
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
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
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

<!-- /SYNC:estimation-framework -->

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

<!-- SYNC:ui-system-context:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
  <!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Break drafter confirmation bias before grooming — surface every architectural-feasibility, vague-AC, missing-auth, cross-service, and M1-M6 gap as a specific challenge prompt so an INFEASIBLE or under-specified PBI never reaches grooming with a false APPROVE.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each canonical body still governs:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **UI System Context:** ALWAYS read frontend-patterns, scss-styling, design-system before any UI change.
- **BA Team Decision Model:** 2/3 BA vote; Dev BA PIC technical veto; escalate 3-way splits.
- **Refinement DoR Checklist:** All 7 DoR criteria pass before grooming; testable AC, wireframes, estimate.
- **Estimation Framework:** Bottom-up phase hours drive man-days; SP derived; UI usually dominates.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act, <60% reject.
- **Sequential Thinking:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS; NEVER skip confidence closer.

**IMPORTANT MUST ATTENTION** AI provides ANALYSIS, human makes DECISION — present Challenge Prompts FIRST, AI Verdict (APPROVE / REQUEST_REVISION / ESCALATE_TO_LEAD) SECOND, then record the human decision via a direct user question. NEVER auto-approve or auto-reject — why: verdict-first triggers automation bias and the Dev BA PIC rubber-stamps without independent assessment.
**IMPORTANT MUST ATTENTION** this is CROSS-PERSON review, not self-review — run only on a BA drafter's draft, NEVER on your own; route self-review to `$review-artifact --type=pbi` — why: external skepticism breaks the drafter's blind spots that self-review rationalizes away.
**IMPORTANT MUST ATTENTION** M1-M6 Compliance Gate is BLOCKING and drives the verdict — any M1-M5 failure forces REQUEST_REVISION with a challenge prompt naming the violated mandate ID + exact section/line/AC; an APPROVE over an M1-M5 violation is itself defective. Carriers (`[Source: ...]`, `**Evidence**`, `**IntegrationTest**`, YAML, mermaid) are EXEMPT — challenge leakage only in PBI narrative prose — why: stack-named or under-specified prose locks the PBI to one implementation and ships ambiguity to grooming.
**IMPORTANT MUST ATTENTION** confirm the auto-detected module via a direct user question BEFORE loading domain docs — wrong module = wrong entity context = false APPROVE — why: entity-conflict analysis built on the wrong service is worse than none.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; keep one `in_progress`; add a final review todo to verify work quality — why: untracked multi-step work loses state on compaction.
**IMPORTANT MUST ATTENTION** every concern raised must cite source (`file:line`, protocol section, entity definition, feature doc) with confidence — >80% to act, <60% DO NOT recommend; "Insufficient evidence" is valid output. NEVER present a guess as a verdict — why: a false APPROVE on an infeasible PBI costs more than the review.
**IMPORTANT MUST ATTENTION** challenge prompts must be SPECIFIC with suggested answers, not vague ("needs work") — frame suggestions as "consider whether X" options, never corrections — why: vague challenges get superficially satisfied; corrections create adoption pressure that suppresses independent reasoning.
**IMPORTANT MUST ATTENTION** search 3+ existing entity definitions + feature docs in the detected module before flagging a conflict or feasibility gap; verify the PBI's context shares the same constraints before reusing a nearby pattern as evidence — why: closest example ≠ matching preconditions.
**IMPORTANT MUST ATTENTION** Technical-veto scope (architecture feasibility, dependency correctness, cross-service impact, performance, security) is the Dev BA PIC's unilateral call — no 2/3 vote; non-technical decisions (UI/UX, visual design, business value) require 2/3 BA majority per `ba-team-decision-model` — why: routing a technical veto through a vote dilutes accountability for false APPROVE.
**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use a direct user question to present Next Steps (`$dor-gate` on APPROVE, `$refine` on REQUEST_REVISION, escalate on ESCALATE_TO_LEAD, or skip) — the user decides; never skip because the task seems obvious.

**Anti-Rationalization:**

| Evasion                                        | Rebuttal                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| "Verdict first, prompts are just support"      | Verdict-first = automation bias. Prompts FIRST so the human forms their own view.           |
| "I can review my own draft with this"          | This is cross-person review. Use `$review-artifact --type=pbi` for self-review.             |
| "Minor M1-M5 slip, still APPROVE"              | Any M1-M5 failure forces REQUEST_REVISION. An APPROVE over a violation is itself defective. |
| "Module is obvious, skip the confirm"          | Wrong module = wrong entity context = false APPROVE. Confirm via a direct user question.    |
| "Concern is clearly right, no citation needed" | Show `file:line` / section / entity ref + confidence. No proof = no verdict.                |
| "Challenge prompt good enough as a question"   | Must be SPECIFIC with a suggested answer, or the drafter satisfies it superficially.        |

**IMPORTANT MUST ATTENTION** AI provides ANALYSIS, human makes DECISION — challenge prompts FIRST, verdict SECOND, human records via a direct user question.
**IMPORTANT MUST ATTENTION** M1-M5 violation forces REQUEST_REVISION with mandate ID + section/line citation — an APPROVE over a violation is defective.
**IMPORTANT MUST ATTENTION** cite `file:line`/section/entity evidence for every concern (confidence >80% to act); never run on your own draft — cross-person review only.

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
