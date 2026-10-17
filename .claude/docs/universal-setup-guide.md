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
- `workflows/` + `workflows.json` — <!-- COUNT:workflows -->17<!-- /COUNT --> workflow definitions (feature, bugfix, refactor, E2E verification, etc.)
- `scripts/` — Catalog generators, audit scripts, Codex sync/verification tooling
- `docs/` — Framework documentation

### Step 2: Run Project Init

Run the `/project-init` skill as the canonical setup and re-evaluation entry point:

```
/project-init
```

This assesses the folder state and routes the required lower-level setup steps:

- `/project-config` for `docs/project-config.json`
- `/docs-manager --mode=init`, `/scan-all`, or targeted `/scan --target=<key>` for project-reference docs
- `/ai-context-refresh` for the root AI context and its Codex mirror handoff
- `/sync-codex` for `AGENTS.md`, `.agents`, and `.codex` mirrors — on Codex, trust the project and review the new handlers in `/hooks` afterwards, because the universal rules and the workflow route arrive only through hooks (see `hooks/README.md#hook-only-delivery-host-requirements`; OpenCode sub-agent delivery is unverified; a host that runs no hooks is unsupported)
- `/graph-code --mode=build` after config/docs are populated

`/project-init` is idempotent. Run it again after pulling changes, changing project structure, or noticing missing/stale setup files.

### Step 3: Review Generated Context

Review the generated project-specific files:

- `docs/project-config.json`
- the project-reference docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
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

`/ai-context-refresh`, when routed by `/project-init`, reads project config and generates the root AI context in `CLAUDE.md` with:

- Project description and architecture overview (from config)
- Golden rules (from contextGroups[].rules)
- Key file locations (from modules[].pathRegex)
- Development commands, service ports, infrastructure
- Documentation index and lookup guide
- The skill-activation table (path-scoped conventions)

The universal framework rules (search-first, task planning, evidence-based reasoning, etc.) are not written into `CLAUDE.md`: the universal hook delivers them to every session and sub-agent.

**Modes:** `init` (first-time), `update` (sync marked sections), `refactor` (optimize token efficiency).

After generation, review and customize AI-filled sections such as project description and golden rules to match your team's conventions.

### Step 4: Start Working

The framework is ready. Use workflows:

- `/feature-implement` — Implement features step-by-step
- `/fix` — Debug and fix issues
- `/plan` — Create implementation plans
- `/code-quality-review` — Review code changes

The workflow router injects the catalog; on the first task of a session, when the prompt matches a workflow, the model asks you one question before starting it — the full workflow, a slimmer custom route, or direct execution, recommended option first. Mid-session it never starts a workflow or asks to — it works directly or with a lean chain of skills unless you call a workflow skill or ask for one in words, which always runs.

## What's Project-Agnostic vs Project-Specific

| Component                        | Agnostic? | Notes                                                                                                                                                      |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills (`.claude/skills/`)       | Yes       | Behavioral patterns, not code patterns                                                                                                                     |
| Agents (`.claude/agents/`)       | Yes       | Role definitions, not project logic                                                                                                                        |
| Hooks (`.claude/hooks/`)         | Yes       | Context injection reads from `project-config.json`                                                                                                         |
| Workflows (`.claude/workflows/`) | Yes       | Process definitions, not implementation                                                                                                                    |
| `CLAUDE.md`                      | **No**    | Must customize per project                                                                                                                                 |
| `docs/project-config.json`       | **No**    | Generated per project via `/project-init`                                                                                                                  |
| Project-reference docs root      | **No**    | Generated per project via `/project-init`; default `docs/project-reference`, overridden by `docsRoots.projectReference.path` in `docs/project-config.json` |
| Business spec root               | **No**    | Project-specific tech-free Feature Specs; default `docs/specs`, overridden by `specRoots.business.path` in `docs/project-config.json`                      |

## Greenfield Projects

For new projects with no existing code:

```
/workflow-greenfield-init
```

This activates the greenfield workflow: idea → research → architecture → plan → scaffold → reviewed foundation, then it hands the first slice to `/workflow-implement-spec --mode=greenfield-slice`.

## Troubleshooting

| Issue                   | Solution                                                      |
| ----------------------- | ------------------------------------------------------------- |
| Skills not discovered   | Run `python .claude/scripts/generate_catalogs.py --skills`    |
| Hooks failing           | Run `node .claude/hooks/tests/test-all-hooks.cjs` to diagnose |
| Wrong patterns injected | Re-run `/project-init` or targeted `/scan --target=<key>`     |
| Workflow not detected   | Run `/project-init` and verify `docs/project-config.json`     |
