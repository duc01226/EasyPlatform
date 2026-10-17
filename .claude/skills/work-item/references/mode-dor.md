# `/work-item --mode=dor` — readiness check gate reference

> Loaded by `work-item/SKILL.md`'s Mode Dispatch when invoked as `/work-item --mode=dor [task path] [--reuse=<task review report | task-review>]`. This contract is the whole invocation: the readiness check (`--mode=dor`) verifies a task against the DoR criteria and the M1-M7 gates before planning. It works called directly with no workflow; every rule, flag, output and gate below is the contract of that mode.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [Workflow](#workflow)
- [Checklist (self-contained DoR; M1-M7 gate below)](#checklist-self-contained-dor-m1-m7-gate-below)
- [Output](#output)
- [Key Rules](#key-rules)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Validate each task against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable tasks reach planning, with every failure cited to its task section/line.

**Summary:**

- **Purpose:** Automated quality gate, not collaborative review (`/work-item --mode=challenge` handles collaboration). Run 8 required DoR criteria, the story rows ST1-ST4 when the task has stories, plus M1-M7; any failure returns `FAIL`.
- **Execution:** Before step 1, use `TaskCreate` for every step plus a final review; keep one `in_progress` and record evidence/skips. Then run: (1) locate task → (2) apply self-contained DoR checklist → (3) evaluate all 8 criteria (story template; GIVEN/WHEN/THEN ×3 + auth; full-flow surface; UI design; AI review; estimate; dependencies; releasable outcome) → (4) run M1-M7 → (5) verify estimation → (6) classify → (7) emit result template → (8) route via `ask user question tool` (`/prioritize`, `/work-item --mode=refine`, `/work-item --mode=challenge`, or skip).
- **Evidence/gates:** the Checklist below is self-contained; cite concrete task section + line/AC for every verdict; any M1-M5 or M7 violation forces `FAIL`; M1/M2 carriers are exempt.
- **Contract/estimate:** Apply the shared releasable-task contract; technical-only/foundation/setup tasks fail, UI tasks need a connected multi-view flow, and effort-point frontmatter needs Fibonacci 1-21, complexity, man-day, risk, and blast-radius evidence. `>13` EP = SHOULD-SPLIT `WARN`, not `FAIL`.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Workflow

1. **Locate task** — Find the artifact in `tasks/` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) or in active plan context; if absent, ask the user for its path. Note an optional `--reuse=<task review report>` input (see the M1-M7 gate section).
2. **Apply DoR checklist** — Use the self-contained 8-criteria checklist below.
3. **Evaluate all 8 criteria** — Check story format; AC vagueness, GIVEN/WHEN/THEN (minimum 3 plus 1 auth scenario); full-flow page/view, navigation, component, state, and mockup coverage; UI design; AI pre-review; effort points/complexity; dependency columns; and the releasable actor-facing outcome with entry → result, evidence, and no standalone technical/foundation/migration/setup scope.
4. **Run M1-M7 gate** — Apply each mandate from `.claude/skills/shared/m1-m7-gates.md`; M1-M5 or M7 failure forces `FAIL`. Distinguish M1 vocabulary from M7 demoability and exempt carriers from M1/M2.
5. **Verify estimation** — Check frontmatter against the SYNC estimation framework: `effort_points` Fibonacci 1-21, complexity, man-day range, risk, and blast radius. `>13` EP is a SHOULD-SPLIT `WARN`, not a `FAIL`.
6. **Classify result** — `PASS` only when all 8 criteria, the story rows ST1-ST4 when the task has stories, and applicable M1-M5/M7 checks pass; otherwise `FAIL` and list fixes.
7. **Output verdict** — Emit the DoR Gate Result template; cite evidence for every criterion and mandate.
8. **Route next step** — After output, use `ask user question tool` to present the options in **Next Steps**; never decide the user's route.

### Shared contract references

> **Releasable Task Contract** — One task names one independently releasable actor-facing outcome with complete entry → result → exit, visible/persisted truth, applicable access/error/recovery behavior, and evidence; UI tasks need page/view, navigation, component, state, and connected mock-app coverage; technical work remains enabling work.
> MUST ATTENTION READ `.claude/skills/shared/releasable-task-contract.md` for the full outcome and full-flow contract.

> **AI-SDD Artifact Contract** — M1-M7 are hard gates: M1/M2 restrict implementation identifiers to carriers; M3 requires logical IDs plus abstract anchors; M4/M5 require unambiguous, rebuildable behavior; M6 requires gate failure; M7 requires demoable business outcomes.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate definitions and carrier rules.

## Checklist (self-contained DoR; M1-M7 gate below)

### Required (ALL must pass)

- MUST ATTENTION verify **User story template** — "As a {role}, I want {goal}, so that {benefit}" present
- MUST ATTENTION verify **AC testable** — All AC use GIVEN/WHEN/THEN, no vague language, min 3 scenarios + 1 auth scenario
- MUST ATTENTION verify **Releasable outcome** — The task names one independently releasable actor-facing outcome, demonstrates entry → action → result → exit, covers applicable visible/persisted truth and recovery, and does not make technical/foundation/migration/setup work the outcome
- MUST ATTENTION verify **Wireframes/mockups and full-flow surface** — For UI tasks, all required pages/views, navigation, common/domain/page components, applicable states, and a connected demo/mockup are present; backend-only requires an explicit "N/A" reason
- MUST ATTENTION verify **UI design ready** — Completed incl. design-spec linked (`/design-spec` artifact or inline UI specs in `## UI Layout`) for UI tasks; or "N/A" for backend-only
- MUST ATTENTION verify **AI pre-review** — `/work-item --mode=review --type=task` or `/work-item --mode=challenge` result is PASS or WARN
- MUST ATTENTION verify **Effort points** — Valid Fibonacci (1-21) + complexity (Low/Medium/High)
- MUST ATTENTION verify **Dependencies table** — Complete with Dependency, Type (must-before/can-parallel/blocked-by/independent), and Status columns

### Stories (Required when the task has stories)

When the task has been sliced (its story files under `tasks/stories/`, or this run's `--mode=story` output), the DoR covers the task and its stories: rows ST1-ST4 also block `READY_TO_PLAN`. They are the checks of `--mode=review --type=story` (`references/review-type-story.md`), so a DoR run over the stories covers that review. They are DoR-owned and never satisfied from a `--reuse` report. Before slicing, record `Stories: N/A — not sliced yet`.

- MUST ATTENTION verify **ST1 INVEST per story** — each story is Independent, Negotiable, Valuable, Estimable, Small (≤8 effort points or one delivery slice) and Testable (`references/mode-story.md` → INVEST Criteria); an implicit order between stories needs a Story Dependencies row, with no cycles
- MUST ATTENTION verify **ST2 Task AC → story coverage** — every task acceptance criterion maps to at least one story; an unmapped AC is a missing story
- MUST ATTENTION verify **ST3 Story scenarios** — each story has at least 3 GIVEN/WHEN/THEN scenarios (happy, edge, error) with a meaningful GIVEN, plus 1 authorization scenario
- MUST ATTENTION verify **ST4 M1-M7 per story** — each story file passes M1-M5 and M7 of `.claude/skills/shared/m1-m7-gates.md` (carrier exemption applies), the gate `--mode=review --type=story` applied; name the mandate ID and the story line for each violation

### M1-M7 Compliance Gate (BLOCKING — each check FAILs the gate)

> **[BLOCKING] MUST ATTENTION READ `.claude/skills/shared/m1-m7-gates.md`** — the six criteria (M1-M5, M7), the carrier exemption and the M1-vs-M7 rule are defined there once; do not restate them from memory.
>
> **M6 enforcement:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". A task, or one of its stories when the DoR covers them (row ST4), violating any of M1-M5 or M7 is NOT ready to plan — return `FAIL` and name the mandate ID with its concrete task section + line/AC citation. A DoR `PASS` over an M1-M5 or M7 violation is defective.

If ANY criterion fails → DoR result is FAIL; list each violated mandate ID with its concrete section/line citation in the Blocking Items.

**Optional input — `--reuse=<task review report>` (or the workflow form `--reuse=task-review`):** follow "Reusing an earlier verdict" in the shared file. When the caller passes the `work-item --mode=review --type=task` report and the task's recorded identity still matches, cite that report's verdict and evidence ONLY for what the shared coverage map lists — M1-M5/M7 and checklist rows 3 (releasable outcome) and 4 (full-flow surface). DoR-owned checks are ALWAYS evaluated in full, reuse or not: row 1 user-story template, row 2 GIVEN/WHEN/THEN format with minimum 3 scenarios + 1 auth scenario, row 5 UI design ready, row 6 AI pre-review presence, row 7 effort points/estimation frontmatter, row 8 dependency table Type and Status columns. A reused FAIL stays a FAIL. With no `--reuse` input (standalone run) or an identity that does not match (SHA-256 content hash required; see the shared file), evaluate every row and every mandate. Record the outcome in the output's `Reuse` line.

**Failure fixes:** Vague AC → specify exact CRUD + roles; missing auth → add roles × CRUD table; no wireframes → UX BA creates; TBD AC → replace with a decision.

## Output

```markdown
## DoR Gate Result

**Task:** {task filename}
**Status:** PASS | FAIL
**Date:** {date}
**Reuse:** {none — full evaluation | task review report path + identity match + rows/mandates reused}

### Checklist Results

| #   | Criterion                   | Status    | Evidence / Issue |
| --- | --------------------------- | --------- | ---------------- |
| 1   | User story template         | ✅/❌     | {evidence}       |
| 2   | AC testable and unambiguous | ✅/❌     | {evidence}       |
| 3   | Releasable actor-facing outcome | ✅/❌  | {evidence}       |
| 4   | Full-flow wireframes/mock app | ✅/❌/N/A | {evidence}       |
| 5   | UI design ready             | ✅/❌/N/A | {evidence}       |
| 6   | AI pre-review passed        | ✅/❌     | {evidence}       |
| 7   | Effort points estimated      | ✅/❌     | {evidence}       |
| 8   | Dependencies complete       | ✅/❌     | {evidence}       |

### Stories ({count} | N/A — not sliced yet)

| #   | Criterion | Status | Evidence / Issue |
| --- | --------- | ------ | ---------------- |
| ST1 | INVEST per story | ✅/❌/N/A | {evidence} |
| ST2 | Task AC → story coverage | ✅/❌/N/A | {evidence} |
| ST3 | 3+ GIVEN/WHEN/THEN + 1 authorization scenario per story | ✅/❌/N/A | {evidence} |
| ST4 | M1-M5/M7 per story | ✅/❌/N/A | {mandate ID + story line per violation} |

| Task AC | Covered By Story | Status |
| ------- | ---------------- | ------ |

### Blocking Items (if FAIL)

1. {Fix instruction}

### Verdict

**{READY_TO_PLAN | FIX_REQUIRED}**
```

## Key Rules

- **FAIL blocks planning** — If ANY required criterion fails, task cannot enter planning. List specific fixes.
- **No guessing** — Every check must reference specific content (line numbers) in the task artifact.
- **Checklist is the source of truth** — the Required list above defines the criteria; `.claude/skills/shared/protocols/refinement-dor-checklist.md` is its shared projection.
- **Effort points >13** — Flag recommendation to split (not a FAIL, but a strong WARN).
- **A verdict is evidence, not a state change** — this check never edits the task's `status`, assignee or `tracking` block. After `READY_TO_PLAN`, the person records readiness through `/task-track --mode=lifecycle` ([record shape](../../task-track/references/integration-guide.md#records-another-skill-authors)).

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/prioritize (Recommended)"** — If PASS: task is ready to plan; prioritize into the planned work
- **"/work-item --mode=refine"** — If FAIL: revise task
- **"/work-item --mode=challenge"** — If collaborative review needed before re-checking DoR
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

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

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); EP DERIVED. UI cost usually dominates — bump EP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap EP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. EP 13 SHOULD split, EP 21 MUST split.

<!-- /SYNC:estimation-framework:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Validate each task against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable tasks reach planning, with every failure cited to its task section/line.

**IMPORTANT MUST ATTENTION Purpose:** Automated DoR gate, NOT collaborative review: run 8 required criteria plus M1-M7; the user chooses the next route.

**IMPORTANT MUST ATTENTION Main steps (1-8):** Before step 1, use `TaskCreate` for every step plus final review and track evidence/skips → (1) locate task → (2) apply self-contained DoR → (3) evaluate story, AC, full-flow/UI, AI review, estimate, dependencies, and releasable outcome → (4) run M1-M7 → (5) verify estimation frontmatter → (6) classify `PASS`/`FAIL` → (7) emit DoR Gate Result → (8) use `ask user question tool` for `/prioritize`, `/work-item --mode=refine`, `/work-item --mode=challenge`, or skip. NEVER skip, reorder, or merge without approval.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above, NEVER a replacement):**

- **AI Mistakes:** holistic-first debugging, fix at responsible layer, surgical diff, verify all outputs.
- **Estimation:** bottom-up phase hours drive man-days; EP derived; >13 SHOULD-SPLIT.

**MANDATORY IMPORTANT MUST ATTENTION** `FAIL` blocks planning — any required criterion or M1-M5/M7 failure returns `FAIL` with mandate ID + concrete task section/line/AC; NEVER pass an M1-M5/M7 violation, technical-only task, or UI task missing full-flow pages/components/states. — why: unready stories ship ambiguity downstream.
**IMPORTANT MUST ATTENTION** every verdict cites `file:line`/section evidence (confidence >80% to act, <60% DO NOT decide); NEVER guess a criterion's status. — why: uncited PASS/FAIL is unauditable.
**IMPORTANT MUST ATTENTION** carriers are EXEMPT from M1/M2: source identifiers are valid inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**`, YAML frontmatter, and ` ```mermaid ``` `; inspect narrative prose only (banned tokens: `spec-principles.md` §3.2). — why: carrier flagging creates a false FAIL.
**IMPORTANT MUST ATTENTION** verify estimation frontmatter via the SYNC framework: Fibonacci 1-21 + complexity, bottom-up `man_days` range, risk, and blast radius; `>13` EP = SHOULD-SPLIT `WARN`, NOT `FAIL`. — why: a WARN must not block a story that is ready to plan.
**IMPORTANT MUST ATTENTION** Decision Model: 2/3 BA majority; Dev BA PIC has technical veto; planning override requires >75% remaining-team vote.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks, keep one `in_progress`, record evidence/skips, and add a final review task.
**MANDATORY IMPORTANT MUST ATTENTION** emit the DoR Gate Result template (checklist table + Blocking Items + Verdict), then use `ask user question tool` — never auto-decide the next step.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "AC looks testable enough, pass it"              | Show GIVEN/WHEN/THEN ×3 + 1 auth scenario, no vague tokens. No proof = FAIL.                      |
| "M1-M5 is minor, the rest passes — PASS overall" | ANY M1-M5 or M7 violation = FAIL. A PASS over one is itself defective.                            |
| "No tech words in it — M7 passes"                | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "Source name in `[Source: ...]` — flag it M1/M2" | Carriers are EXEMPT. Flag leakage ONLY in narrative prose, never in evidence carriers.            |
| "Effort points >13, fail the gate"                | >13 EP = SHOULD-SPLIT WARN, not a FAIL. Do not escalate a WARN to a FAIL.                         |
| "Skip `ask user question tool`, result is obvious"      | NEVER auto-decide. Emit the result template, then route via `ask user question tool` — the user decides. |

**[TASK-PLANNING]** Before acting, analyze scope and break it into small tasks and sub-tasks with `TaskCreate`.

---

**IMPORTANT MUST ATTENTION** FAIL blocks planning on ANY required-criterion or M1-M5/M7 failure — name the violated ID + cite task section/line; NEVER PASS over an M1-M5 or M7 violation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section for EVERY verdict (>80% confidence to act); NEVER guess a check's status.
**IMPORTANT MUST ATTENTION** emit the DoR Gate Result template, then route via `ask user question tool` — never auto-decide.
