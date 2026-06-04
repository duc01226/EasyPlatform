---
name: dor-gate
version: 1.0.0
description: '[Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate a PBI artifact against the Definition of Ready (DoR/M1-M6) checklist so that only grooming-ready PBIs pass the gate — every failure is caught with its concrete section/line citation, blocking ambiguous, untestable, or unimplementable stories from reaching the team.

**Summary:**

- This is an automated quality gate, NOT a collaborative review — it runs two checklists: the 7 Required DoR criteria (story template, testable AC, wireframes, UI design, AI pre-review, story points, dependencies) AND the M1-M6 compliance gate; ANY single failure across either set returns FAIL.
- The DoR is self-contained here (BA Refinement Context section) — no external protocol file is needed; every verdict must cite the concrete PBI section + line/AC, and a PASS over any M1-M5 violation is itself defective.
- Verify story-point estimation frontmatter (Fibonacci 1-21 + complexity, man-days range, blast-radius) per the SYNC estimation framework; story points >13 trigger a SHOULD-SPLIT WARN (not a FAIL).
- Emit the DoR Gate Result template (checklist table + Blocking Items + Verdict), then route via `AskUserQuestion` — never auto-decide the next step.

**Key distinction:** Automated quality gate (not collaborative review — use `/pbi-challenge` for that).

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Workflow

1. **Locate PBI** — Find PBI artifact in `team-artifacts/pbis/` or active plan context. If not found, ask user for path.
2. **Load DoR protocol** — Apply DoR 7-criteria checklist (story template, testable AC, wireframes, UI design, AI pre-review, story points, dependencies)
3. **Evaluate each criterion** — Parse PBI sections against 7 DoR items:
    - Check user story template format ("As a... I want... So that...")
    - Scan AC for vague language ("should", "might", "TBD", "etc.", "various")
    - Verify GIVEN/WHEN/THEN format (min 3 scenarios)
    - Check for wireframe/mockup references (or explicit "N/A" for backend-only)
    - Check for UI design status
    - Verify story_points and complexity fields present with valid values
    - Verify dependencies table with correct columns
4. **Classify result:**
    - **PASS** — All 7 criteria pass → ready for grooming
    - **FAIL** — Any criterion fails → blocked, list fixes needed
5. **Output verdict** — Use the DoR Gate Output Template from protocol

## Checklist (from protocol)

### Required (ALL must pass)

- MUST ATTENTION verify **User story template** — "As a {role}, I want {goal}, so that {benefit}" present
- MUST ATTENTION verify **AC testable** — All AC use GIVEN/WHEN/THEN, no vague language, min 3 scenarios
- MUST ATTENTION verify **Wireframes/mockups** — Present or explicit "N/A" for backend-only
- MUST ATTENTION verify **UI design ready** — Completed or "N/A" for backend-only
- MUST ATTENTION verify **AI pre-review** — `/review-artifact --type=pbi` or `/pbi-challenge` result is PASS or WARN
- MUST ATTENTION verify **Story points** — Valid Fibonacci (1-21) + complexity (Low/Medium/High)
- MUST ATTENTION verify **Dependencies table** — Complete with Type column (must-before/can-parallel/blocked-by/independent)

### M1-M6 Compliance Gate (BLOCKING — each check FAILs the gate)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)". DoR enforces M6: a PBI that violates any of M1-M5 is NOT ready for grooming — return FAIL and name the violated mandate ID with its concrete PBI section + line/AC citation. A DoR PASS over an M1-M5 violation is itself defective.
>
> Carriers are EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only flag leakage in PBI narrative prose (problem statement, AC text, scope, rule descriptions). Banned prose token list: `spec-principles.md` §3.2.

- MUST ATTENTION verify **M1 — Tech-agnostic prose** — FAIL if problem statement, AC, or rule prose names a framework/product, language-native type, or product/design-pattern class name (banned list in `spec-principles.md` §3.2). Cite section + token.
- MUST ATTENTION verify **M2 — No source code in prose** — FAIL if a requirement is expressed as a class/method/file-path/namespace instead of a business operation. Source identifiers belong only in evidence carriers. Cite section + line.
- MUST ATTENTION verify **M3 — Abstract-IDs-first** — FAIL if a requirement/rule lacks a logical ID (`FR-/BR-/OP-`), has a logical ID but no `[Source: namespace/service/id]` abstract-anchor evidence, uses physical code coordinates or repository-root paths instead of an abstract anchor, or makes the anchor its primary citation. Evidence is REQUIRED and KEPT, but SECONDARY to the logical ID (physical coordinates live only in the provenance sidecar).
- MUST ATTENTION verify **M4 — Unambiguous AC** — FAIL if any AC uses vague language ("handle appropriately", "process normally", "as needed"), two engineers could implement it differently while both claiming conformance, or no observable completion state / named error condition exists. (Reinforces the "AC testable" required criterion above.)
- MUST ATTENTION verify **M5 — Implementable from artifact alone** — FAIL if a competent team with ZERO codebase knowledge could not implement the PBI on a different stack from the PBI alone (relies on reading source to understand it). Cite section + missing detail.

If ANY box fails → DoR result is FAIL; list each violated mandate ID with its concrete section/line citation in the Blocking Items.

## BA Refinement Context (canonical DoR)

> Applies to Writes under `team-artifacts/pbis/`. Mirrored for Codex via `SYNC:refinement-dor-checklist` / `SYNC:ba-team-decision-model` in AGENTS.md (do not hand-edit the mirror). This is the self-contained DoR source — no external protocol-file dependency required to run the gate.

**Decision Model:** 2/3 majority vote (UX BA + Designer BA + Dev BA PIC). Dev BA PIC has technical veto. Disagree-and-commit after decision. Grooming override requires >75% remaining-team vote.

**DoR Gate (ALL must pass before grooming):**

- [ ] User story template (As a... I want... So that...)
- [ ] AC testable (GIVEN/WHEN/THEN, no vague language; min 3 scenarios + 1 auth scenario)
- [ ] Wireframes attached (UX BA) + UI design ready (Designer BA); backend-only → explicit "N/A"
- [ ] AI pre-review passed (`/review-artifact --type=pbi` or `/pbi-challenge` returned PASS or WARN)
- [ ] Story points estimated (Fibonacci 1-21 + complexity); >13 SP → recommend split
- [ ] Dependencies table complete (Dependency · Type must-before/can-parallel/blocked-by/independent · Status)

**Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

## Output

```markdown
## DoR Gate Result

**PBI:** {PBI filename}
**Status:** PASS | FAIL
**Date:** {date}

### Checklist Results

| #   | Criterion                   | Status    | Evidence / Issue |
| --- | --------------------------- | --------- | ---------------- |
| 1   | User story template         | ✅/❌     | {evidence}       |
| 2   | AC testable and unambiguous | ✅/❌     | {evidence}       |
| 3   | Wireframes/mockups          | ✅/❌/N/A | {evidence}       |
| 4   | UI design ready             | ✅/❌/N/A | {evidence}       |
| 5   | AI pre-review passed        | ✅/❌     | {evidence}       |
| 6   | Story points estimated      | ✅/❌     | {evidence}       |
| 7   | Dependencies complete       | ✅/❌     | {evidence}       |

### Blocking Items (if FAIL)

1. {Fix instruction}

### Verdict

**{READY_FOR_GROOMING | FIX_REQUIRED}**
```

## Key Rules

- **FAIL blocks grooming** — If ANY required criterion fails, PBI cannot enter grooming. List specific fixes.
- **No guessing** — Every check must reference specific content (line numbers) in the PBI artifact.
- **Protocol is source of truth** — Always reference `refinement-dor-checklist-protocol.md` for criteria definitions.
- **Story points >13** — Flag recommendation to split (not a FAIL, but a strong WARN).

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/prioritize (Recommended)"** — If PASS: PBI is grooming-ready; prioritize into the backlog
- **"/refine"** — If FAIL: revise PBI
- **"/pbi-challenge"** — If collaborative review needed before re-checking DoR
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Only grooming-ready PBIs pass the gate — every DoR/M1-M6 failure caught with its concrete section/line citation, so no ambiguous, untestable, or unimplementable story reaches the team.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above, NEVER a replacement):**

- **AI Mistakes:** holistic-first debugging, fix at responsible layer, surgical diff, verify all outputs.
- **Estimation:** bottom-up phase hours drive man-days; SP derived; >13 SHOULD-SPLIT.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess.

**MANDATORY IMPORTANT MUST ATTENTION** FAIL blocks grooming — ANY of the 7 required criteria OR any M1-M5 mandate fails → return FAIL, name the violated ID with its concrete PBI section + line/AC citation. NEVER PASS over an M1-M5 violation — a PASS over one is itself defective. — why: an unready story poisons grooming and ships ambiguity downstream.
**IMPORTANT MUST ATTENTION** automated quality gate, NOT collaborative review — run both checklists (7 required + M1-M6); route `/pbi-challenge` for collaborative review. — why: conflating gate with review lets soft-pass judgments through a hard gate.
**IMPORTANT MUST ATTENTION** cite `file:line`/section evidence for EVERY verdict (confidence >80% to act, <60% DO NOT decide) — every check references the concrete PBI section + line/AC; NEVER guess a criterion's status. — why: an uncited PASS/FAIL is unauditable and pattern-matched, not verified.
**IMPORTANT MUST ATTENTION** carriers EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**`, YAML frontmatter, ` ```mermaid ``` `; flag leakage ONLY in PBI narrative prose (banned tokens: `spec-principles.md` §3.2). — why: flagging a carrier as a violation is a false FAIL that blocks a ready PBI.
**IMPORTANT MUST ATTENTION** verify story-point frontmatter per the SYNC estimation framework — Fibonacci 1-21 + complexity, bottom-up `man_days` range, blast-radius; story points >13 → SHOULD-SPLIT WARN, NOT a FAIL. — why: a WARN escalated to a FAIL wrongly blocks a groomable large story.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks via `TaskCreate` BEFORE starting; add a final review todo verifying every verdict cites its PBI section/line.
**MANDATORY IMPORTANT MUST ATTENTION** emit the DoR Gate Result template (checklist table + Blocking Items + Verdict), then route via `AskUserQuestion` — never auto-decide the next step.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| "AC looks testable enough, pass it"              | Show GIVEN/WHEN/THEN ×3 + 1 auth scenario, no vague tokens. No proof = FAIL.                      |
| "M1-M5 is minor, the rest passes — PASS overall" | ANY M1-M5 violation = FAIL. A PASS over an M1-M5 violation is itself defective.                   |
| "Source name in `[Source: ...]` — flag it M1/M2" | Carriers are EXEMPT. Flag leakage ONLY in narrative prose, never in evidence carriers.            |
| "Story points >13, fail the gate"                | >13 SP = SHOULD-SPLIT WARN, not a FAIL. Do not escalate a WARN to a FAIL.                         |
| "Skip `AskUserQuestion`, result is obvious"      | NEVER auto-decide. Emit the result template, then route via `AskUserQuestion` — the user decides. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

**IMPORTANT MUST ATTENTION** FAIL blocks grooming on ANY required-criterion or M1-M5 failure — name the violated ID + cite PBI section/line; NEVER PASS over an M1-M5 violation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section for EVERY verdict (>80% confidence to act); NEVER guess a check's status.
**IMPORTANT MUST ATTENTION** emit the DoR Gate Result template, then route via `AskUserQuestion` — never auto-decide.
