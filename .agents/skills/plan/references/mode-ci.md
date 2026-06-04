# `$plan --mode=ci` — CI / GitHub Actions failure-analysis reference

> Loaded by `plan/SKILL.md`'s Mode Dispatch when invoked as `$plan --mode=ci <github-actions-log-url>`. Adds a CI-failure domain focus on top of the standard plan engine + `$plan-review` gate + `planner` agent — it does NOT replace them. (Migrated verbatim from the former `plan-ci` skill, consolidation M22.)

## Goal

Analyze GitHub Actions CI logs and create a plan to fix the identified issues.

## Positional argument

`$ARGUMENTS` = the GitHub Actions run / log URL.

## Intake + focus

1. **Fetch** — Download / read the CI logs from the GitHub Actions run URL.
2. **Analyze** — Identify root causes from build/test failures. Focus on CI-specific failure classes: **build, test, env, Docker, dependencies**.
3. **Plan** — Create an implementation plan to fix the CI issues.

Use the `planner` subagent to read the GitHub Actions logs, analyze and find the root causes of the issues, then provide a detailed plan for implementing the fixes.

## Plan frontmatter overrides (vs the standard `plan` defaults)

```yaml
priority: P1
tags: [ci, bugfix]
```

## Output

Provide at least 2 implementation approaches with clear trade-offs, explain the pros and cons of each, and provide a recommended approach.

## Key rules

- PLANNING-ONLY: do not implement, only create the fix plan.
- Always offer `$plan-review` after plan creation (standard `plan` gate — unchanged).
- Be skeptical; every claim needs traced proof, confidence >80% to act.
