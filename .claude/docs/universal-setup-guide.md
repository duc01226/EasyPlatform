# Universal Setup Guide — Adopting .claude for Any Project

> **Purpose:** Step-by-step guide to adopt this .claude framework in any project.
> **Prerequisite:** Node.js installed, Claude Code CLI available.

## Overview

This `.claude` framework is project-agnostic. All project-specific knowledge lives in `docs/project-config.json`. The skills, hooks, agents, and workflows work with any tech stack — .NET, Node.js, Python, Go, Java, Ruby, or mixed.

## 5-Step Adoption Path

### Step 1: Copy the .claude Directory

```bash
cp -r .claude/ /path/to/your-project/.claude/
```

Copy the entire `.claude/` directory to your target project. This includes:

- `skills/` — 258 skills for planning, implementation, review, testing, etc.
- `agents/` — 28 specialized agents (code-reviewer, debugger, architect, etc.)
- `hooks/` — 53 hook files with context injection, workflow routing, enforcement
- `workflows/` — 32 workflow definitions (feature, bugfix, refactor, etc.)
- `scripts/` — Catalog generators, audit scripts
- `docs/` — Framework documentation

### Step 2: Initialize Project Configuration

Run the `/project-config` skill to populate `docs/project-config.json`:

```
/project-config
```

This scans your project and generates:

- Tech stack detection (languages, frameworks, package managers)
- Service/module discovery
- Directory structure mapping
- Build and test commands

### Step 3: Scan Project Patterns

Run scan skills to generate reference documentation from your codebase:

```
/scan-project-structure    # Directory tree, ports, module codes
/scan-backend-patterns     # Backend patterns, CQRS, validation, repos
/scan-frontend-patterns    # Frontend components, stores, forms, routing
/scan-code-review-rules    # Code review standards from codebase conventions
```

Optional scans (run if applicable):

```
/scan-design-system        # UI design tokens, BEM conventions
/scan-domain-entities      # Domain entity catalog, relationships
/scan-integration-tests    # Integration test patterns
/scan-e2e-tests            # E2E test patterns, page objects
/scan-seed-test-data       # Seeder/dev-data patterns, idempotency, DI scope
/scan-scss-styling         # SCSS/CSS methodology
/scan-feature-docs         # Business feature documentation index
```

These generate files in `docs/project-reference/` that hooks auto-inject into context.

### Step 4: Generate CLAUDE.md

Run the `/claude-md-init` skill to generate CLAUDE.md from your project configuration:

```
/claude-md-init
```

This reads `docs/project-config.json` and generates a CLAUDE.md with:

- Project description and architecture overview (from config)
- Golden rules (from contextGroups[].rules)
- Key file locations (from modules[].pathRegex)
- Development commands, service ports, infrastructure
- Documentation index and lookup guide
- Static framework sections (search-first, task planning, evidence-based reasoning, etc.)

**Modes:** `init` (first-time), `update` (sync marked sections), `refactor` (optimize token efficiency).

After generation, review and customize the AI-filled sections (project description, golden rules) to match your team's conventions.

### Step 5: Start Working

The framework is ready. Use workflows:

- `/cook` — Implement features step-by-step
- `/fix` — Debug and fix issues
- `/plan` — Create implementation plans
- `/code-review` — Review code changes

The workflow router automatically detects intent and suggests the right workflow.

## What's Project-Agnostic vs Project-Specific

| Component                        | Agnostic? | Notes                                              |
| -------------------------------- | --------- | -------------------------------------------------- |
| Skills (`.claude/skills/`)       | Yes       | Behavioral patterns, not code patterns             |
| Agents (`.claude/agents/`)       | Yes       | Role definitions, not project logic                |
| Hooks (`.claude/hooks/`)         | Yes       | Context injection reads from `project-config.json` |
| Workflows (`.claude/workflows/`) | Yes       | Process definitions, not implementation            |
| `CLAUDE.md`                      | **No**    | Must customize per project                         |
| `docs/project-config.json`       | **No**    | Generated per project via `/project-config`        |
| `docs/project-reference/`        | **No**    | Generated per project via `/scan-*` skills         |
| `docs/business-features/`        | **No**    | Project-specific feature documentation             |

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
| Wrong patterns injected | Re-run `/scan-*` skills to regenerate reference docs          |
| Workflow not detected   | Check `docs/project-config.json` is populated                 |
