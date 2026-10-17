# fix — `--target=ci` — CI / pipeline-failure branch

> Read by `$fix --target=ci` FIRST, before any other step of the branch (the router `SKILL.md` → **Target Routing**). The Debug Mindset, Confidence & Evidence Gate, Root-Cause Prerequisite Gate and the `SYNC:*` protocol bodies this branch cites live in `SKILL.md`.

## `--target=ci` — CI / pipeline-failure branch

**Goal:** Analyze CI/CD pipeline logs to identify and fix build/test failures in the configured CI provider/tooling.

**Key Rules:**

- **Infrastructure context:** read `docs/project-config.json` → `infrastructure.cicd.tool` to identify the CI provider/tooling (e.g. `azure-devops`, `github-actions`, `gitlab-ci`); target that provider's pipeline config files.
- Focus on CI-specific issues (env vars, Docker, dependencies, build order).
- Verify the fix does not break local development.

**Workflow:**

1. Use the `debugger` subagent to read the CI logs via the configured CI tool/API (from `docs/project-config.json`), analyze the final failing log/error **backward** to the root cause, and report back. Write findings to `tmp/analysis/{ci-issue}.analysis.md`; re-read before implementing.
2. **🛑 Present root cause + proposed fix → `ask user question tool` → wait for approval.**
3. Implement the fix from the report.
4. Use the `tester` subagent to verify; report back.
5. If tests fail, repeat from step 2.
6. Report a summary of changes; suggest next steps.

**Notes:** Use the CLI/API for the configured CI provider. If it is GitHub Actions and `gh` is unavailable, instruct the user to install and authorize GitHub CLI first.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.
