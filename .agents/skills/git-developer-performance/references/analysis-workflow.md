# Developer Quality Work Analysis Workflow

Use after running `scripts/git-developer-performance.cjs`.

## Required Sequence

1. Read `analysis-plan.md`.
2. Count distinct contributors from the plan/data and create one todo task per contributor. Contributors are person-consolidated by identity map, email, and high-confidence aliases unless an identity map overrides them.
3. For many contributors, split disjoint developer lists across subagents; merge findings afterward.
4. For each contributor, read `work-packets/{developer}.md`.
5. Inspect representative commits with `git show --stat --find-renames <hash>`.
6. Inspect patches for high-impact, unclear, risky, or quality-related commits.
7. Distinguish direct authored work from merge/admin integration work.
8. For shared feature branches, attribute implementation value to each developer's own direct commits, not to the merge author or PR owner.
9. Treat zero-file merge/admin commits as integration signal only; do not add them to implementation SP.
10. Discount generated, migration-designer, docs/spec, i18n-sorting, lockfile, and repeated follow-up churn before estimating.
11. For rechecks or velocity mismatch, write an external analysis file first and synthesize each contributor's direct work as one "giant commit."
12. Split the giant commit into atomic 1/2/3/5/8/13 SP clusters; displayed theme totals over 13 SP must be explicit sums, not one unsplit story.
13. Separate product/domain delivery, infrastructure/tooling, docs/generated churn, and merge/admin integration before producing team velocity totals.
14. Synthesize value; do not stop at commit counts, file counts, or churn.
15. Estimate both no-AI (`man_days_traditional`) and AI-assisted (`man_days_ai`) ranges.
16. Run a velocity sanity check against active days and selected period; re-audit implausible SP/man-day ranges.
17. Write per-contributor synthesis to `analysis/{developer}.md`.
18. Write `quality-work-summary.md` and `evidence-proof.md`.

## Work Cluster Estimation

Cluster commits by intent, module, date proximity, and subject.

- 1 SP: small isolated change, docs tweak, simple config, narrow fix.
- 2 SP: small feature/fix touching a few files.
- 3 SP: moderate change across files/modules with clear business value.
- 5 SP: complex feature, refactor, bug investigation, or integration impact.
- 8 SP: large multi-module work with non-trivial test/integration risk.
- 13 SP: very large or ambiguous work; split if possible.

Man-days: report both ranges. `man_days_traditional` is no-AI baseline: 3-5yr developer, 6 productive hours/day. `man_days_ai` assumes an AI coding assistant plus project context; apply plan-skill AI speedup (SP 1 about 2x, 2-3 about 3x, 5-8 about 4x, 13+ about 5x) with review overhead.

Anti-inflation guardrails: estimate authored implementation work first. In no-ff multi-author feature branch merges, implementation follows the original direct commit authors. Merge/admin work is separate unless the merge commit itself has substantive resolved changes. Generated files, EF designer snapshots, docs/specs, i18n sorting, lockfiles, and repeated feedback/fix commits must reduce confidence or be discounted.

Velocity sanity: when estimates feel too high or low, do not tune numbers by intuition. Re-open representative patches, synthesize the contributor as one giant commit, split into atomic clusters, and then revise.

## KPI-Style Evaluation

Use evidence-backed dimensions, not opaque scores:

- Delivery value: user-facing features, workflow enablement, integration impact.
- Bug-fix value: defect severity, root-cause depth, regression risk reduced.
- Refactor value: simplification, maintainability, migration, performance, infrastructure quality.
- Quality value: tests, observability, docs, error handling, safer APIs, deleted dead code.
- Risk/caveat: generated/bulk changes, revert churn, unclear ownership, missing local history.

## Per-Contributor Output

Include:

- Distinct identity and commit counts.
- Consolidated aliases in `originalIdentities`, when present.
- Direct commits vs merge/admin commits.
- Work clusters with story points, `man_days_traditional`, and `man_days_ai`.
- Proof basis for each estimate: direct commit hashes, changed paths, discounted churn, and confidence.
- Value contributed: feature/change, bug fix, refactor, quality/test/docs, integration/admin.
- Code-quality impact: improved maintainability, risk, tests, generated/bulk changes, risky churn.
- Evidence: commit hashes and changed paths.
- Confidence and caveats.

## Final Summary Output

Include:

- Total distinct contributors.
- Total estimated story points, no-AI man-days, and AI-assisted man-days.
- Top contributed values, not only commit counts.
- Separate authored work from merge/admin integration.
- Avoid ranking by commits/lines alone; compare only evidence-backed value.
- Include a velocity sanity note when estimates are high relative to active days or team expectations.
- Warnings for identity splits, bulk changes, squashed commits, generated changes, and low-confidence estimates.
