# Universal Setup Guide — Adopting .claude for Any Project

> **Purpose:** Step-by-step guide to adopt this .claude framework in any project.
> **Prerequisite:** Node.js installed, Claude Code CLI available.

## Overview

This `.claude` framework is project-agnostic. All project-specific knowledge lives in `docs/project-config.json`. The skills, hooks, agents, and workflows work with any tech stack — .NET, Node.js, Python, Go, Java, Ruby, or mixed.

## Recommended Adoption Path

### Step 1: Copy the .claude Directory

```bash
cp -r .claude/ /path/to/your-project/.claude/
```

Copy the entire `.claude/` directory to your target project. This includes:

- `skills/` — planning, implementation, review, testing, setup, and sync skills
- `agents/` — specialized agents (code-reviewer, debugger, architect, etc.)
- `hooks/` — context injection, workflow routing, enforcement, and setup gates
- `workflows/` + `workflows.json` — 17 workflow definitions (feature, bugfix, refactor, etc.)
- `scripts/` — Catalog generators, audit scripts, Codex sync/verification tooling
- `docs/` — Framework documentation

### Step 2: Run Project Init

Run the `/project-init` skill as the canonical setup and re-evaluation entry point:

```
/project-init
```

This assesses the folder state and routes the required lower-level setup steps:

- `/project-config` for `docs/project-config.json`
- `/docs-init`, `/scan-all`, or targeted `/scan --target=<key>` for project-reference docs
- `/claude-md-init` for `CLAUDE.md`
- `/sync-codex` for `AGENTS.md`, `.agents`, and `.codex` mirrors
- `/graph-build` after config/docs are populated

`/project-init` is idempotent. Run it again after pulling changes, changing project structure, or noticing missing/stale setup files.

### Step 3: Review Generated Context

Review the generated project-specific files:

- `docs/project-config.json`
- `docs/project-reference/`
- `CLAUDE.md`
- `AGENTS.md`

For existing projects, `/project-init` can populate reference documentation from scan skills such as:

```
/scan --target=project-structure    # Directory tree, ports, module codes
/scan --target=backend-patterns     # Backend patterns, CQRS, validation, repos
/scan --target=frontend-patterns    # Frontend components, stores, forms, routing
/scan --target=code-review-rules    # Code review standards from codebase conventions
```

Optional scans (run if applicable):

```
/scan --target=design-system        # UI design tokens, BEM conventions
/scan --target=domain-entities      # Domain entity catalog, relationships
/scan --target=integration-tests    # Integration test patterns
/scan --target=e2e-tests            # E2E test patterns, page objects
/scan --target=seed-test-data       # Seeder/dev-data patterns, idempotency, DI scope
/scan --target=scss-styling         # SCSS/CSS methodology
/scan --target=feature-spec         # Business feature documentation index
```

`/claude-md-init`, when routed by `/project-init`, reads project config and generates a `CLAUDE.md` with:

- Project description and architecture overview (from config)
- Golden rules (from contextGroups[].rules)
- Key file locations (from modules[].pathRegex)
- Development commands, service ports, infrastructure
- Documentation index and lookup guide
- Static framework sections (search-first, task planning, evidence-based reasoning, etc.)

**Modes:** `init` (first-time), `update` (sync marked sections), `refactor` (optimize token efficiency).

After generation, review and customize AI-filled sections such as project description and golden rules to match your team's conventions.

### Step 4: Start Working

The framework is ready. Use workflows:

- `/feature-implement` — Implement features step-by-step
- `/fix` — Debug and fix issues
- `/plan` — Create implementation plans
- `/code-review` — Review code changes

The workflow router injects the catalog; the model auto-selects and activates the best-matching workflow (no confirmation step).

## What's Project-Agnostic vs Project-Specific

| Component                        | Agnostic? | Notes                                              |
| -------------------------------- | --------- | -------------------------------------------------- |
| Skills (`.claude/skills/`)       | Yes       | Behavioral patterns, not code patterns             |
| Agents (`.claude/agents/`)       | Yes       | Role definitions, not project logic                |
| Hooks (`.claude/hooks/`)         | Yes       | Context injection reads from `project-config.json` |
| Workflows (`.claude/workflows/`) | Yes       | Process definitions, not implementation            |
| `CLAUDE.md`                      | **No**    | Must customize per project                         |
| `docs/project-config.json`       | **No**    | Generated per project via `/project-init`          |
| `docs/project-reference/`        | **No**    | Generated per project via `/project-init`          |
| `docs/specs/`                    | **No**    | Project-specific tech-free Feature Specs           |

## Greenfield Projects

For new projects with no existing code:

```
/greenfield
```

This activates the greenfield workflow: idea → research → architecture → plan → scaffold → implement.

## Troubleshooting

| Issue                   | Solution                                                      |
| ----------------------- | ------------------------------------------------------------- |
| Skills not discovered   | Run `python .claude/scripts/generate_catalogs.py --skills`    |
| Hooks failing           | Run `node .claude/hooks/tests/test-all-hooks.cjs` to diagnose |
| Wrong patterns injected | Re-run `/project-init` or targeted `/scan --target=<key>`     |
| Workflow not detected   | Run `/project-init` and verify `docs/project-config.json`     |
