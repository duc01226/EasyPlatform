---
name: git-developer-performance
version: 1.0.0
description: '[Git] Use when generating developer KPI, performance, contribution value, story point, man-day, or code-quality reports from local git commit history.'
---

## Quick Summary

**Goal:** Plan and generate a developer KPI-style quality-work report from local git history only.
**Workflow:**

1. **Set Goal + Plan** - Declare the goal, trigger `$plan`, and create tasks per contributor.
2. **Collect Packets** - Run `scripts/git-developer-performance.cjs` to create commit inventory and work packets.
3. **Analyze Work** - Read patches per contributor; estimate value, story points, man-days, and quality impact.
4. **Synthesize Report** - Write `quality-work-summary.md` and `evidence-proof.md` outside `.claude`.
   **Key Rules:**

- Use only local `git` history. Do not query external services.
- Consolidate people by identity map, then normalized email, then high-confidence aliases such as `DOMAIN\first.lastpart` matching a full name; use `--identity-map` for exceptions.
- This is a large task: plan first, then create one todo task per contributor.
- The script collects evidence; AI must read changes and synthesize contributed value.
- Treat KPI values as evidence-based estimates, not a complete HR assessment.
- Report both `man_days_traditional` (no AI) and `man_days_ai` (AI coding assistant with project context).
- Traverse full merged branch history (not only first-parent) and attribute shared feature-branch implementation to each developer's own direct commits; merge authors get integration/admin signal unless conflict-resolution changes are explicitly inspected.
- Estimate implementation SP from direct authored diffs first; zero-change merge/admin commits are integration signal only.
- Discount generated files, migration designers, docs/spec output, i18n sorting, lockfiles, and repeated follow-up churn.
- For velocity mismatch or recheck requests, synthesize each contributor's direct authored work as one "giant commit" first, then split into atomic 1/2/3/5/8/13 SP clusters.
- Persist large rechecks to a report file outside `.claude` before finalizing, so context loss cannot erase evidence.
- Separate product/domain delivery, infrastructure/tooling work, docs/generated churn, and merge/admin integration; do not mix them silently into one velocity number.
- Run a velocity sanity check: both man-day ranges must be plausible for active days and the selected period.
- Keep output outside `.claude`; default root is `reports/developer-performance/`.

# Git Developer Performance

Use when the user asks for developer KPI/performance, productivity, contribution value, story-point estimates, man-day estimates, quality impact, or quality-work reporting from git commits.

## Required AI Workflow

Before analysis, set or declare this goal:

> Plan and generate a developer performance quality-work report from local git history, then execute the plan and produce the report.
> Then trigger `$plan` or create equivalent plan artifacts. This skill is not a commit-list export. It requires reading direct commits and merge/admin commits per contributor, then synthesizing value. Use ultrathink/deep analysis for final synthesis when contributor count or churn is high.

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
- Treat contributors as people consolidated by identity map/email/high-confidence aliases, not raw display names.
- Count distinct contributors, then create one todo task per contributor from `analysis-plan.md`.
- For each contributor, inspect direct authored commits and merge/admin commits from `work-packets/*.md`.
- Use `git show --stat --find-renames <hash>` and targeted patches for high-impact commits.
- When several developers contribute to one feature branch, analyze each contributor's direct commits separately and never give the whole feature's implementation SP to the merge author or PR owner.
- Estimate work clusters with 1/2/3/5/8/13 story points, no-AI man-days, and AI-assisted man-days; state confidence.
- If a displayed theme is more than 13 SP, state that it is a sum of smaller atomic clusters, not one unsplit story.
- Do not add implementation SP for zero-file merge/admin commits; mention them separately as integration/admin signal.
- Discount non-implementation churn before estimating: generated code, EF designer snapshots, docs/specs, i18n sorting, lockfiles, and repeated follow-ups.
- Reconcile final SP/man-day totals against authored active days and team velocity intuition; if implausible, re-audit before delivery.
- Analyze contributed value: features/changes, bug fixes, refactors, tests/docs, integration/admin, and code quality.
- If there are many contributors, split contributor tasks across subagents with disjoint developer lists.
- Review identity and bulk-change warnings before comparing contributors.
- State that report quality depends on local git data quality when history is incomplete, stale, squashed, or bot/shared authors exist.

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
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Plan and generate a developer KPI-style quality-work report from local git history only.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** trace every KPI/value claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

**IMPORTANT MUST ATTENTION** use local git history only.
**IMPORTANT MUST ATTENTION** trigger planning before qualitative analysis; this is a large task.
**IMPORTANT MUST ATTENTION** default to `develop`, fallback to `main`, and use last 60 days when the user does not specify.
**IMPORTANT MUST ATTENTION** do not present authored or integration signals as complete measures of human performance.
**IMPORTANT MUST ATTENTION** shared feature-branch implementation credit follows direct commit authors, not merge authors; never let raw churn or zero-change merge/admin commits inflate implementation SP or man-day estimates.
**IMPORTANT MUST ATTENTION** never publish a single ambiguous MD number; show no-AI and AI-assisted MD separately.

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->
