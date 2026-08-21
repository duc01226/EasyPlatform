---
name: git-developer-performance
version: 1.0.0
description: '[Git] Use when generating developer KPI, performance, contribution value, story point, man-day, or code-quality reports from local git commit history.'
---

## Quick Summary

**Goal:** Plan and generate a developer KPI-style quality-work report from local git history ONLY, so every story-point, man-day, and value claim in it rests on inspected diffs rather than commit counts.

**Summary:** (read-this-if-nothing-else digest — purpose + ALL main steps)

- **PURPOSE** — turn raw git history into an evidence-backed contribution report. The script collects evidence; **AI reads the changes and synthesizes the value** — a commit-list export is NOT this skill's output.
- **STEP 1 — SET GOAL + PLAN.** Declare the goal, trigger `$plan`, create **one todo task per contributor**. Large task: NEVER analyze before planning.
- **STEP 2 — COLLECT PACKETS.** Run the script (defaults: `--branch develop`→`main`, `--days 60`, `--out reports/developer-performance`). Traverse FULL merged history, not first-parent only.
- **STEP 3 — ANALYZE PER CONTRIBUTOR.** Read direct authored patches + merge/admin commits from `work-packets/*.md`. Attribute shared feature-branch implementation to each developer's OWN direct commits — never to the merge author.
- **STEP 4 — ESTIMATE via the carried `SYNC:estimation-framework`** (the AUTHORITY, and it OUTRANKS the script's legacy size-based rubric): bottom-up hours → `likely_days` → SP **DERIVED**, never assigned from cluster size. Discount generated/docs/lockfile churn FIRST.
- **STEP 5 — SANITY-CHECK, then SYNTHESIZE.** Velocity plausible vs active days; separate product / infra / docs / merge-admin signal; write `quality-work-summary.md` + `evidence-proof.md` **outside `.claude`**.
- **GATE** — run the skill's tests, run the command for the requested range, confirm the output path is outside `.claude`, before delivering anything.

**Workflow:**

1. **Set Goal + Plan** — declare the goal, trigger `$plan`, create tasks per contributor.
2. **Collect Packets** — run `scripts/git-developer-performance.cjs` to build the commit inventory and work packets.
3. **Analyze Work** — read patches per contributor; estimate value, story points, man-days, quality impact.
4. **Synthesize Report** — write `quality-work-summary.md` and `evidence-proof.md` outside `.claude`.

**Key Rules:**

- Local `git` history ONLY — NEVER query external services — why: the report must be reproducible from the repo alone.
- Consolidate people by identity map → normalized email → high-confidence alias (`DOMAIN\first.lastpart` matching a full name); `--identity-map` handles exceptions — why: raw display names split one person into several.
- Large task — plan FIRST, then one todo task per contributor.
- Script collects evidence; **AI reads changes and synthesizes contributed value** — why: this is not a commit-list export.
- KPI values are evidence-based estimates, NEVER a complete HR assessment.
- Report BOTH `man_days_traditional` (no AI) and `man_days_ai` (AI assistant with project context) — NEVER one ambiguous MD number.
- Traverse full merged branch history, not first-parent only; shared feature-branch implementation credits each developer's own direct commits. Merge authors get integration/admin signal unless conflict-resolution changes were explicitly inspected.
- Estimate implementation SP from direct authored diffs; zero-change merge/admin commits are integration signal ONLY.
- Discount before estimating: generated files, migration designers, docs/spec output, i18n sorting, lockfiles, repeated follow-up churn.
- **The carried `SYNC:estimation-framework` is the AUTHORITY for every SP and man-day figure** — SP is DERIVED from `likely_days`, never from cluster size — and it OUTRANKS the size-based rubric the script embeds in its generated prompt.
- Velocity mismatch or recheck request → synthesize each contributor's direct authored work as one "giant commit" first, then split into atomic 1/2/3/5/8/13 SP clusters.
- Persist large rechecks to a report file outside `.claude` BEFORE finalizing — why: context loss otherwise erases the evidence.
- Separate product/domain delivery, infrastructure/tooling, docs/generated churn, merge/admin integration — NEVER mix them silently into one velocity number.
- Velocity sanity check: both man-day ranges plausible for active days and the selected period.
- Keep output outside `.claude`; default root `reports/developer-performance/`.

# Git Developer Performance

Use when the user asks for developer KPI/performance, productivity, contribution value, story-point estimates, man-day estimates, quality impact, or quality-work reporting from git commits.

## Required AI Workflow

Before analysis, set or declare this goal:

> Plan and generate a developer performance quality-work report from local git history, then execute the plan and produce the report.

Then trigger `$plan` or create equivalent plan artifacts. **This skill is NOT a commit-list export** — it requires reading direct commits AND merge/admin commits per contributor, then synthesizing value. Use ultrathink/deep analysis for final synthesis when contributor count or churn is high.

## Command

```bash
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs [options]
```

Options: `--branch <ref>` defaults to `develop` then `main`; `--days <n>` defaults to `60`; `--since <date>` overrides days; `--until <date>` defaults now; `--out <dir>` defaults to `reports/developer-performance`; `--identity-map <csv>` accepts `identity,email,displayName,id`; `--json` prints machine-readable result.

Examples:

```bash
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs --branch release/1.4 --days 30
node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs --since 2026-01-01 --until 2026-03-31 --out reports/dev-performance-q1
```

## Output

Creates a timestamped run folder containing:

- `summary.md` - team evidence report, authored signal sort, warnings, and integration/admin activity.
- `analysis-plan.md` - AI execution plan with one task per contributor.
- `work-packets/*.md` - per-contributor commit/change packets for qualitative analysis.
- `quality-work-summary.md` and `evidence-proof.md` - AI-written value synthesis and proof appendix.
- `analysis/` - target folder for AI-written per-contributor synthesis.
- `contributors.csv`, `commits.csv`, `developers/*.md`, `data/*.json` - source evidence and deterministic aggregates.

## Analysis Rules

- Read `references/analysis-workflow.md` before final synthesis.
- Contributors are PEOPLE — consolidated by identity map / email / high-confidence alias, NEVER raw display names.
- Count distinct contributors, then create one todo task per contributor from `analysis-plan.md`.
- Per contributor, inspect direct authored commits AND merge/admin commits from `work-packets/*.md`.
- Use `git show --stat --find-renames <hash>` plus targeted patches for high-impact commits.
- Several developers on one feature branch → analyze each contributor's direct commits separately; NEVER give the whole feature's implementation SP to the merge author or PR owner — why: branch ownership is not authorship.
- **Estimate every work cluster per the `SYNC:estimation-framework` block this skill carries (below) — it is the AUTHORITY for every SP and man-day figure in the report.** Bottom-up hours first, then `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`, then `story_points` **DERIVED** from `likely_days` via the SP→Days ladder — never assigned from cluster size — plus no-AI and AI-assisted man-days and a stated confidence.
- **Precedence:** where the size-based SP rubric embedded in the generated prompt (`scripts/git-developer-performance.cjs`) disagrees with the carried block, **the carried block WINS**. Treat the script's table as a legacy heuristic pending rewire, and say so in the report if the two would have produced different numbers.
- Displayed theme above 13 SP → state it is a SUM of smaller atomic clusters, never one unsplit story.
- NEVER add implementation SP for zero-file merge/admin commits — report them separately as integration/admin signal.
- Discount non-implementation churn BEFORE estimating: generated code, EF designer snapshots, docs/specs, i18n sorting, lockfiles, repeated follow-ups.
- Reconcile final SP/man-day totals against authored active days and team velocity; implausible → re-audit BEFORE delivery.
- Analyze contributed value across: features/changes, bug fixes, refactors, tests/docs, integration/admin, code quality.
- Many contributors → split contributor tasks across subagents with **disjoint** developer lists — why: overlapping lists double-count one person's work.
- Review identity and bulk-change warnings before comparing contributors.
- History incomplete, stale, squashed, or carrying bot/shared authors → state explicitly that report quality is bounded by local git data quality.

## Verification

Before delivering a generated report:

1. Run `node --test .claude/skills/git-developer-performance/tests/*.test.cjs`.
2. Run the command for the requested repo/range.
3. Confirm the output path is outside `.claude`.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Plan and generate a developer KPI-style quality-work report from local git history ONLY, so every story-point, man-day, and value claim in it rests on inspected diffs rather than commit counts.

**IMPORTANT MUST ATTENTION main steps — execute in order, the skill AI keeps forgetting:** (1) SET GOAL + trigger `$plan` + one todo task per contributor — NEVER analyze before planning; (2) COLLECT PACKETS via the script over the FULL merged history; (3) ANALYZE each contributor's direct authored patches + merge/admin commits, crediting shared branches to the direct author; (4) ESTIMATE every cluster via the carried `SYNC:estimation-framework` — bottom-up hours → `likely_days` → SP DERIVED — discounting generated/docs/lockfile churn first, and the carried block OUTRANKS the script's legacy size rubric; (5) SANITY-CHECK velocity, separate product / infra / docs / merge-admin signal, SYNTHESIZE `quality-work-summary.md` + `evidence-proof.md` outside `.claude`; (6) VERIFY — run tests, re-run the command, confirm the output path. — why: steps buried in the middle get skipped, and a report that skips step 3 or 4 reports churn as effort.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** trace every KPI/value claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

**IMPORTANT MUST ATTENTION** use local git history ONLY — NEVER query an external service.
**IMPORTANT MUST ATTENTION** trigger planning BEFORE qualitative analysis — this is a large task.
**IMPORTANT MUST ATTENTION** default `develop`, fallback `main`, last 60 days when the user does not specify.
**IMPORTANT MUST ATTENTION** NEVER present authored or integration signal as a complete measure of human performance — state the estimate's limits in the report.
**IMPORTANT MUST ATTENTION** shared feature-branch implementation credit follows DIRECT commit authors, never merge authors; NEVER let raw churn or zero-change merge/admin commits inflate implementation SP or man-days.
**IMPORTANT MUST ATTENTION** NEVER publish a single ambiguous MD number — show no-AI and AI-assisted MD separately.
**IMPORTANT MUST ATTENTION** derive every SP from `likely_days` via the carried `SYNC:estimation-framework`, which OUTRANKS the size-based rubric the script embeds; if the two would disagree, say so in the report — why: cluster size measures diff bulk, not effort.
**IMPORTANT MUST ATTENTION** write output outside `.claude` and persist large rechecks to that file BEFORE finalizing — why: context loss erases un-persisted evidence.
**IMPORTANT MUST ATTENTION** add a final review task to verify report quality against the evidence packets.

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| "Few contributors, skip the plan"    | Planning is what creates the per-contributor tasks — without them contributors get merged into one blurred summary. |
| "Commit counts show the picture"     | Counts measure frequency, not value. Read the patches or report nothing.                                            |
| "The script already gave SP numbers" | The script's rubric is a legacy size heuristic; the carried block WINS and SP stays DERIVED from `likely_days`.     |
| "The merge author owns the feature"  | Credit follows the direct authored diff. Branch ownership is not authorship.                                        |
| "One MD number is simpler"           | Ambiguous MD is unusable — no-AI and AI-assisted are different measurements.                                        |

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->
