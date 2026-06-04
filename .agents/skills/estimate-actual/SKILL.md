---
name: estimate-actual
description: '[Planning] Use when calibrating estimates from actual code, diff, PR scope, and developer time.'
disable-model-invocation: false
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

## Quick Summary

**Goal:** Produce a 3-way estimation calibration report — `pre_impl_estimate` (from plan) vs `true_estimate` (from observed scope) vs `actual_time` (from git/user) — yielding two INDEPENDENT signals: developer execution variance and estimation model calibration variance.

**Why two signals matter:** They are confounded if not separated. If actual >> pre-impl, the bug could be (a) developer was slow, OR (b) the model under-estimated scope. Without computing TRUE from observed scope, you cannot tell which. Single-sample calibration has near-zero statistical power — the skill always reports this.

**Workflow:**

1. **Detect input mode** — plan-file path / `--changes` / `--pr <n>`
2. **Read pre-impl estimate** from plan frontmatter (if present)
3. **Observe actual scope** — git diff, file list, line counts, blast radius from the diff
4. **Compute TRUE estimate** — apply the canonical estimation framework (inlined below) to the OBSERVED scope (post-hoc, with full visibility)
5. **Get actual time** — derive from git timestamps if available; ask user to confirm/override (timestamps ≠ coding time)
6. **Compute variances** — scope variance (TRUE vs pre-impl) and execution variance (actual vs TRUE)
7. **Per-layer breakdown** — UI tier, backend tier, test count, blast radius — predicted vs observed
8. **Report** — calibration verdict + suggested model adjustments (only if pattern across ≥3 samples)

**Key Rules:**

- MUST ATTENTION compute TRUE estimate using the SAME canonical framework that was used for pre-impl — fair comparison requires identical methodology
- MUST ATTENTION separate developer execution signal from model calibration signal — never collapse to a single "good/bad estimate" verdict
- NEVER claim a model adjustment from a single sample — explicitly state "needs ≥3 samples for signal"
- NEVER trust git timestamps as actual coding time — they include sleep, meetings, context switches; ALWAYS ask user to validate
- MUST ATTENTION list per-layer deltas (UI/backend/tests/blast) — aggregate variance hides where the model went wrong
- Use min-max range for both pre-impl and TRUE — comparing single points is dishonest about uncertainty

## Input Modes

| Mode      | Trigger             | What's read                                                           |
| --------- | ------------------- | --------------------------------------------------------------------- |
| Plan-file | `<path/to/plan.md>` | Plan frontmatter (pre-impl estimate) + git diff scoped to plan branch |
| Changes   | `--changes`         | `git diff` working tree + last commit timestamps                      |
| PR        | `--pr <n>`          | `gh pr view <n>` + `gh pr diff <n>` + PR open/merge times             |

If multiple modes detected (e.g., plan file AND `--changes`), prefer plan-file (carries the original estimate); use changes for the diff source.

## Workflow Detail

### Step 1: Detect mode and gather pre-impl estimate

- Plan-file mode: read frontmatter, extract `man_days_traditional`, `story_points`, `risk_margin_pct`, `risk_factors`, `blast_radius`, `estimate_reasoning` if present
- Changes/PR mode without plan: skip pre-impl; report only TRUE vs actual
- If plan exists but uses old single-point format (no range, no `risk_factors`), flag in report — comparison is approximate

### Step 2: Observe actual scope from diff

Run (PowerShell or Bash via tool):

- `git diff --stat <base>..<head>` — file count, lines added/removed
- `git diff --name-only <base>..<head>` — file list
- `git log --format='%H %ai %s' <base>..<head>` — commit timeline

Classify changed files:

- UI files (component/template/style) — count, group by screen
- Backend handlers/entities/repos — count, classify per backend tier table
- Tests (unit/integration/e2e) — count test files, count test cases (grep `describe|it|Fact|Test\b`)
- Migrations / contracts / shared code — flag separately

### Step 3: Run Blast Radius pass on observed scope

- Touched files / components — count
- Of those, complex (>500 LOC area, multi-handler, central) — count
- Downstream consumers — use code graph trace if available: `python .claude/scripts/code_graph trace <file> --direction both --json` for changed entry-point files
- Shared/common code touched — yes/no
- Regression scope — list affected areas

### Step 4: Apply canonical estimation framework to observed scope

Apply each tier table (UI / backend / test / risk margin / risk factors) from the inline framework below to the OBSERVED scope. Output:

- `true_likely_days` (single midpoint)
- `true_min_days = likely × 0.9`
- `true_max_days = likely × (1 + risk_margin)`
- `true_estimate = '<min>-<max>d'` range

### Step 5: Get actual time

Try in order:

1. Git: timestamp of first commit on feature branch → timestamp of last commit (or merge commit). Convert to working days (8h business days, exclude weekends).
2. PR: open time → merge time. Same conversion.
3. Ask user via a direct user question: "Git suggests N working days from first commit to merge. How much was actual coding time? (excludes meetings, code-review wait, context switches, vacations)"

ALWAYS surface the gap between elapsed time and reported coding time — they are different signals.

### Step 6: Compute variances

```
scope_variance_pct  = (true_likely - preimpl_likely) / preimpl_likely × 100
exec_variance_pct   = (actual_time - true_likely) / true_likely × 100
```

Interpretation matrix:

| scope_var  | exec_var   | Verdict                                                                                                              |
| ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| ~0% (±15%) | ~0% (±15%) | Estimate matched scope; developer matched estimate. Healthy.                                                         |
| ~0%        | >+25%      | Model OK; developer slower than expected. **Performance signal.**                                                    |
| ~0%        | <-25%      | Model OK; developer faster than expected. Either skilled or scope simpler than apparent.                             |
| >+25%      | ~0%        | Model UNDER-estimated scope; developer matched the harder-than-predicted reality. **Model signal — too optimistic.** |
| <-25%      | ~0%        | Model OVER-estimated scope; actual work was simpler. **Model signal — too pessimistic.**                             |
| >+25%      | >+25%      | Both — scope was harder AND developer slower. Disambiguate over multiple samples.                                    |
| <-25%      | <-25%      | Original estimate was way over; developer also fast. Likely simple task padded heavily.                              |

### Step 7: Per-layer breakdown (where the model went wrong)

| Layer        | Pre-impl tier (from plan)                 | Observed tier (from diff)             | Delta                   |
| ------------ | ----------------------------------------- | ------------------------------------- | ----------------------- |
| UI           | e.g. "Compose components into NEW screen" | e.g. "Add control to existing screen" | -1 tier (~0.7d over)    |
| Backend      | e.g. "NEW command on existing aggregate"  | e.g. "Small update existing handler"  | -1 tier (~0.5d over)    |
| Tests        | e.g. "13 cases"                           | e.g. "5 cases"                        | -8 cases (~0.5d over)   |
| Blast        | e.g. "4 areas, 1 complex"                 | e.g. "2 areas, 0 complex"             | lower regression risk   |
| Risk factors | predicted list                            | applicable in retrospect              | call out missing/unused |

### Step 8: Report

Produce a markdown report with sections:

1. **Summary table** — three numbers (pre-impl range, TRUE range, actual single)
2. **Variance verdict** — interpretation matrix row + plain-English explanation
3. **Per-layer breakdown** — table above
4. **Risk factors** — predicted vs applicable; note any new factors that surfaced (e.g., regression-fan-out not flagged but should have been)
5. **Calibration suggestion** — ONLY if user has run this skill ≥3 times with consistent direction. Single-sample → state "no statistical power, log this sample for future calibration"
6. **Confidence** — state confidence level for each verdict; uncertainty about actual time goes here

### Step 9: Persist sample (optional)

If user wants longitudinal tracking, append the calibration row to `plans/_estimation-samples.csv`:

```
date,plan,preimpl_min,preimpl_max,true_min,true_max,actual,scope_var_pct,exec_var_pct,risk_factors_predicted,risk_factors_applicable
```

After ≥5 rows, run pattern detection on the CSV: if `scope_var_pct` is consistently negative (model over-estimates), suggest tier adjustment; if consistently positive (under-estimates), suggest adding risk factors or widening tier.

## Estimation Framework (canonical — applied in Step 4)

The canonical framework lives in the **Estimation Framework** sync block at the end of this skill; Step 4 applies it verbatim to the observed (post-hoc) scope.

## Output Report Template

```markdown
# Estimation Calibration Report — <plan or branch name>

## Summary

| Metric            | Range / Value              | Source                                   |
| ----------------- | -------------------------- | ---------------------------------------- |
| Pre-impl estimate | <min>-<max>d (likely <m>d) | <plan path frontmatter>                  |
| TRUE estimate     | <min>-<max>d (likely <m>d) | observed scope (post-hoc)                |
| Actual time       | <n>d                       | git <first commit→merge>, user-confirmed |

**Scope variance** (TRUE vs pre-impl): <±n>% — <under/over/matched>
**Execution variance** (actual vs TRUE likely): <±n>% — <fast/slow/matched>

## Verdict

| Signal              | Direction                                       | Magnitude | Confidence        |
| ------------------- | ----------------------------------------------- | --------- | ----------------- |
| Estimation model    | <too optimistic / too pessimistic / calibrated> | <±n>%     | <low/medium/high> |
| Developer execution | <fast / slow / on-pace>                         | <±n>%     | <low/medium/high> |

## Per-Layer Breakdown

| Layer        | Predicted tier     | Observed tier      | Delta           |
| ------------ | ------------------ | ------------------ | --------------- |
| UI           | …                  | …                  | …               |
| Backend      | …                  | …                  | …               |
| Tests        | … cases            | … cases            | …               |
| Blast radius | … areas, … complex | … areas, … complex | …               |
| Risk factors | <predicted list>   | <applicable list>  | <added/removed> |

## Calibration Suggestions

- <If single sample> No model adjustment from one data point. Logged to `plans/_estimation-samples.csv` (row N). Re-run $estimate-actual on future plans to build calibration corpus. Suggested adjustment after ≥3-5 samples with consistent direction.
- <If pattern across samples> e.g. "UI tier 'Compose components into NEW screen' overshoots in 4/5 samples by ~0.5d → suggest splitting into two tiers OR widening band to 1-2.5d"

## Caveats

- Actual time derived from <git/user>; <list any uncertainty: weekends, code-review days, vacations excluded?>
- Pre-impl estimate format <range/single-point/missing> — comparison <exact/approximate>
- Confidence in TRUE estimate: <high/medium/low> — observed scope <fully visible / partially obscured>
```

## Anti-Rationalization Anchors

| Evasion                                                | Rebuttal                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Single sample is enough — clearly the dev was slow"   | NO. Without separating scope from execution variance, you confound model error and performance. State signal + caveat.                            |
| "Use git timestamps as actual time"                    | Wrong. Includes weekends, meetings, code-review wait, sleep. Always confirm with user.                                                            |
| "Skip TRUE estimate — just compare pre-impl vs actual" | That's the data point that's MISSING and exactly why estimates don't improve over time. Never skip Step 4.                                        |
| "Apply hindsight to pump up TRUE estimate"             | Use the SAME framework that was used for pre-impl. Hindsight bias inflates TRUE and falsely vindicates the original estimate.                     |
| "One signal is fine, no need to split"                 | Two signals is the entire point. Performance review needs execution variance; model tuning needs scope variance. Confounded data is unactionable. |

---

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

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Estimation Framework:** Bottom-up first, blast-radius pass, min-max range, tier + risk-margin tables.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act, no guess-as-fact.

**IMPORTANT MUST ATTENTION** compute TRUE estimate using the SAME canonical framework — fair comparison requires identical methodology
**IMPORTANT MUST ATTENTION** separate developer execution signal from model calibration signal — never collapse to single verdict
**IMPORTANT MUST ATTENTION** never claim model adjustment from a single sample — explicitly state "needs ≥3 samples for signal"
**IMPORTANT MUST ATTENTION** never trust git timestamps as coding time — always ask user to confirm/override
**IMPORTANT MUST ATTENTION** list per-layer deltas (UI/backend/tests/blast) — aggregate variance hides where model went wrong
**IMPORTANT MUST ATTENTION** use min-max ranges for both pre-impl and TRUE — comparing single points is dishonest about uncertainty
**IMPORTANT MUST ATTENTION** apply Blast Radius pass on observed diff before applying tier tables
**IMPORTANT MUST ATTENTION** persist samples to `plans/_estimation-samples.csv` for longitudinal calibration
**IMPORTANT MUST ATTENTION** state confidence per verdict — uncertainty about actual time goes in caveats

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
