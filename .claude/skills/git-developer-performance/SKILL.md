---
name: git-developer-performance
version: 1.0.0
description: '[Git] Use when generating developer KPI, contribution, effort point, man-day or code-quality reports from git history.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Plan and generate a developer KPI-style quality-work report from local git history ONLY, so every effort-point, man-day, and value claim in it rests on inspected diffs rather than commit counts.

**Summary:** (read-this-if-nothing-else digest — purpose + ALL main steps)

- **PURPOSE** — turn raw git history into an evidence-backed contribution report. The script collects evidence; **AI reads the changes and synthesizes the value** — a commit-list export is NOT this skill's output.
- **STEP 1 — SET GOAL + PLAN.** Declare the goal, trigger `/plan`, create **one todo task per contributor**. Large task: NEVER analyze before planning.
- **STEP 2 — COLLECT PACKETS.** Run the script (defaults: `--branch develop`→`main`, `--days 60`, `--out reports/developer-performance`). Traverse FULL merged history, not first-parent only.
- **STEP 3 — ANALYZE PER CONTRIBUTOR.** Read direct authored patches + merge/admin commits from `work-packets/*.md`. Attribute shared feature-branch implementation to each developer's OWN direct commits — never to the merge author.
- **STEP 4 — ESTIMATE via the carried `SYNC:estimation-framework`** (the AUTHORITY, and it OUTRANKS the script's legacy size-based rubric): bottom-up hours → `likely_days` → EP **DERIVED**, never assigned from cluster size. Discount generated/docs/lockfile churn FIRST.
- **STEP 5 — SANITY-CHECK, then SYNTHESIZE.** Velocity plausible vs active days; separate product / infra / docs / merge-admin signal; write `quality-work-summary.md` + `evidence-proof.md` **outside `.claude`**.
- **GATE** — run the skill's tests, run the command for the requested range, confirm the output path is outside `.claude`, before delivering anything.

**Workflow:**

1. **Set Goal + Plan** — declare the goal, trigger `/plan`, create tasks per contributor.
2. **Collect Packets** — run `scripts/git-developer-performance.cjs` to build the commit inventory and work packets.
3. **Analyze Work** — read patches per contributor; estimate value, effort points, man-days, quality impact.
4. **Synthesize Report** — write `quality-work-summary.md` and `evidence-proof.md` outside `.claude`.

**Key Rules:**

- Local `git` history ONLY — NEVER query external services — why: the report must be reproducible from the repo alone.
- Consolidate people by identity map → normalized email → high-confidence alias (`DOMAIN\first.lastpart` matching a full name); `--identity-map` handles exceptions — why: raw display names split one person into several.
- Large task — plan FIRST, then one todo task per contributor.
- Script collects evidence; **AI reads changes and synthesizes contributed value** — why: this is not a commit-list export.
- KPI values are evidence-based estimates, NEVER a complete HR assessment.
- Report BOTH `man_days_traditional` (no AI) and `man_days_ai` (AI assistant with project context) — NEVER one ambiguous MD number.
- Traverse full merged branch history, not first-parent only; shared feature-branch implementation credits each developer's own direct commits. Merge authors get integration/admin signal unless conflict-resolution changes were explicitly inspected.
- Estimate implementation EP from direct authored diffs; zero-change merge/admin commits are integration signal only.
- Discount generated files, migration designers, docs/spec output, i18n sorting, lockfiles, and repeated follow-up churn before estimating.
- **The carried `SYNC:estimation-framework` is the AUTHORITY for every EP and man-day figure** — EP is DERIVED from `likely_days`, never from cluster size — and it OUTRANKS the size-based rubric the script embeds in its generated prompt.
- Velocity mismatch or recheck request → synthesize each contributor's direct authored work as one "giant commit" first, then split into atomic 1/2/3/5/8/13 EP clusters.
- Persist large rechecks to a report file outside `.claude` BEFORE finalizing — why: context loss otherwise erases the evidence.
- Separate product/domain delivery, platform/tooling work, docs/generated churn, merge/admin integration — NEVER mix them silently into one velocity number.
- Velocity sanity check: both man-day ranges plausible for active days and the selected period.
- Keep output outside `.claude`; default root `reports/developer-performance/`.

## Contents

- [Quick Summary](#quick-summary)
- [Git Developer Performance](#git-developer-performance)
- [Required AI Workflow](#required-ai-workflow)
- [Command](#command)
- [Output](#output)
- [Analysis Rules](#analysis-rules)
- [Verification](#verification)
- [Closing Reminders](#closing-reminders)

# Git Developer Performance

Use when the user asks for developer KPI/performance, productivity, contribution value, effort-point estimates, man-day estimates, quality impact, or quality-work reporting from git commits.

## Required AI Workflow

Before analysis, set or declare this goal:

> Plan and generate a developer performance quality-work report from local git history, then execute the plan and produce the report.

Then trigger `/plan` or create equivalent plan artifacts. **This skill is NOT a commit-list export** — it requires reading direct commits AND merge/admin commits per contributor, then synthesizing value. Use ultrathink/deep analysis for final synthesis when contributor count or churn is high.

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
- Several developers on one feature branch → analyze each contributor's direct commits separately; NEVER give the whole feature's implementation EP to the merge author or PR owner — why: branch ownership is not authorship.
- **Estimate every work cluster per the `SYNC:estimation-framework` block this skill carries (below) — it is the AUTHORITY for every EP and man-day figure in the report.** Bottom-up hours first, then `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`, then `effort_points` **DERIVED** from `likely_days` via the EP→Days ladder — never assigned from cluster size — plus no-AI and AI-assisted man-days and a stated confidence.
- **Precedence:** where the size-based EP rubric embedded in the generated prompt (`scripts/git-developer-performance.cjs`) disagrees with the carried block, **the carried block WINS**. Treat the script's table as a legacy heuristic pending rewire, and say so in the report if the two would have produced different numbers.
- Displayed theme above 13 EP → state it is a SUM of smaller atomic clusters, never one unsplit story.
- NEVER add implementation EP for zero-file merge/admin commits — report them separately as integration/admin signal.
- Discount non-implementation churn BEFORE estimating: generated code, EF designer snapshots, business spec files (default root `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path), i18n sorting, lockfiles, repeated follow-ups.
- Reconcile final EP/man-day totals against authored active days and team velocity; implausible → re-audit BEFORE delivery.
- Analyze contributed value across: features/changes, bug fixes, refactors, tests/docs, integration/admin, code quality.
- Many contributors → split contributor tasks across subagents with **disjoint** developer lists — why: overlapping lists double-count one person's work.
- Review identity and bulk-change warnings before comparing contributors.
- History incomplete, stale, squashed, or carrying bot/shared authors → state explicitly that report quality is bounded by local git data quality.

## Verification

Before delivering a generated report:

1. Run `node --test .claude/skills/git-developer-performance/tests/*.test.cjs`.
2. Run the command for the requested repo/range.
3. Confirm the output path is outside `.claude`.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `estimation-framework` — Bottom-up estimation with derived effort points and a min-max range; estimating effort → .claude/skills/shared/protocols/estimation-framework.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Plan and generate a developer KPI-style quality-work report from local git history ONLY, so every effort-point, man-day, and value claim in it rests on inspected diffs rather than commit counts.

**IMPORTANT MUST ATTENTION main steps — execute in order, the skill AI keeps forgetting:** (1) SET GOAL + trigger `/plan` + one todo task per contributor — NEVER analyze before planning; (2) COLLECT PACKETS via the script over the FULL merged history; (3) ANALYZE each contributor's direct authored patches + merge/admin commits, crediting shared branches to the direct author; (4) ESTIMATE every cluster via the carried `SYNC:estimation-framework` — bottom-up hours → `likely_days` → EP DERIVED — discounting generated/docs/lockfile churn first, and the carried block OUTRANKS the script's legacy size rubric; (5) SANITY-CHECK velocity, separate product / infra / docs / merge-admin signal, SYNTHESIZE `quality-work-summary.md` + `evidence-proof.md` outside `.claude`; (6) VERIFY — run tests, re-run the command, confirm the output path. — why: steps buried in the middle get skipped, and a report that skips step 3 or 4 reports churn as effort.

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); EP DERIVED. UI cost usually dominates — bump EP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap EP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. EP 13 SHOULD split, EP 21 MUST split.

<!-- /SYNC:estimation-framework:reminder -->

**IMPORTANT MUST ATTENTION** use local git history ONLY — NEVER query an external service.
**IMPORTANT MUST ATTENTION** trigger planning BEFORE qualitative analysis — this is a large task.
**IMPORTANT MUST ATTENTION** default `develop`, fallback `main`, last 60 days when the user does not specify.
**IMPORTANT MUST ATTENTION** NEVER present authored or integration signal as a complete measure of human performance — state the estimate's limits in the report.
**IMPORTANT MUST ATTENTION** shared feature-branch implementation credit follows DIRECT commit authors, never merge authors; NEVER let raw churn or zero-change merge/admin commits inflate implementation EP or man-days.
**IMPORTANT MUST ATTENTION** NEVER publish a single ambiguous MD number — show no-AI and AI-assisted MD separately.
**IMPORTANT MUST ATTENTION** derive every EP from `likely_days` via the carried `SYNC:estimation-framework`, which OUTRANKS the size-based rubric the script embeds; if the two would disagree, say so in the report — why: cluster size measures diff bulk, not effort.
**IMPORTANT MUST ATTENTION** write output outside `.claude` and persist large rechecks to that file BEFORE finalizing — why: context loss erases un-persisted evidence.
**IMPORTANT MUST ATTENTION** add a final review task to verify report quality against the evidence packets.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "Few contributors, skip the plan" | Planning is what creates the per-contributor tasks — without them contributors get merged into one blurred summary. |
| "Commit counts show the picture" | Counts measure frequency, not value. Read the patches or report nothing. |
| "The script already gave EP numbers" | The script's rubric is a legacy size heuristic; the carried block WINS and EP stays DERIVED from `likely_days`. |
| "The merge author owns the feature" | Credit follows the direct authored diff. Branch ownership is not authorship. |
| "One MD number is simpler" | Ambiguous MD is unusable — no-AI and AI-assisted are different measurements. |
