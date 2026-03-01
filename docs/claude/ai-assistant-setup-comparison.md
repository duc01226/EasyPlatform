# AI Assistant Setup Comparison: Claude Code vs GitHub Copilot

## Executive Summary

BravoSUITE supports two AI coding assistants with equivalent capabilities. Claude Code uses hooks for dynamic workflow orchestration while Copilot relies on static markdown instructions. Both share the same core patterns, prompts, and code quality standards. Critical gap: Copilot lacks programmatic event triggers - workaround is manual prompt invocation.

## Architecture Comparison

| Aspect              | Claude Code                             | GitHub Copilot                           |
| ------------------- | --------------------------------------- | ---------------------------------------- |
| Main Config File    | `CLAUDE.md`                             | `.github/common.copilot-instructions.md` + `.github/workspace.copilot-instructions.md` |
| Path-Specific Rules | `.claude/skills/*/SKILL.md`             | *(deleted — use `docs/` reference docs)* |
| Prompts/Commands    | `.claude/skills/*/SKILL.md`             | `.github/prompts/*.prompt.md`            |
| Agent Definitions   | `.claude/settings.json` (subagent_type) | `.github/AGENTS.md` (documentation only) |
| Workflow Config     | `.claude/workflows.json`                | Embedded in `workspace.copilot-instructions.md` |
| Hooks/Automation    | `.claude/hooks/*.cjs` (JS scripts)      | **Not supported**                        |

## Feature Comparison

### Workflow Detection

| Feature                    | Claude Code                  | GitHub Copilot                    |
| -------------------------- | ---------------------------- | --------------------------------- |
| Automatic Intent Detection | Hook: `workflow-router.cjs`  | Manual: User reads workflow table |
| Workflow Sequences         | Programmatic enforcement     | Documentation-based               |
| Skip Override              | `quick:` prefix              | `quick:` prefix                   |
| Confirmation Flow          | Hook-injected system message | User follows documented protocol  |

### Code Review

| Feature      | Claude Code                 | GitHub Copilot                  |
| ------------ | --------------------------- | ------------------------------- |
| Code Review  | Command: `/review/codebase` | Prompt: `code-review.prompt.md` |
| Auto-Trigger | Via workflow detection      | Manual invocation only          |

### Path-Specific Instructions

| Feature         | Claude Code                      | GitHub Copilot                          |
| --------------- | -------------------------------- | --------------------------------------- |
| Format          | YAML frontmatter in SKILL.md     | YAML frontmatter in .instructions.md    |
| applyTo Pattern | Not automatic (skill invocation) | Glob patterns, auto-applied             |
| excludeAgent    | Not applicable                   | Supported (e.g., code-review exclusion) |

## File Structure Mapping

```
Claude Code                          GitHub Copilot
├── CLAUDE.md                   ←→   .github/common.copilot-instructions.md
│                                     .github/workspace.copilot-instructions.md
├── .claude/                         .github/
│   ├── settings.json           ←→   AGENTS.md (doc only)
│   ├── workflows.json          ←→   workspace.copilot-instructions.md (embedded)
│   ├── hooks/                       (not supported)
│   │   └── workflow-router.cjs
│   ├── commands/               ←→   prompts/
│   │   ├── cook.md            ←→   cook.prompt.md
│   │   ├── plan.md            ←→   plan.prompt.md
│   │   ├── review/codebase.md ←→   code-review.prompt.md
│   │   └── ...                ←→   ...
│   └── skills/                 ←→   instructions/
└── docs/claude/                ←→   docs/claude/ (shared)
```

## Workflow Sequences (Both Platforms)

| Workflow          | Sequence                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature**       | `/plan` → `/plan-review` → `/plan-validate` → `/cook` → `/code-simplifier` → `/code-review` → `/changelog` → `/test` → `/docs-update` → `/watzup`                      |
| **Bug Fix**       | `/scout` → `/investigate` → `/debug` → `/plan` → `/plan-review` → `/plan-validate` → `/fix` → `/code-simplifier` → `/code-review` → `/changelog` → `/test` → `/watzup` |
| **Refactoring**   | `/plan` → `/plan-review` → `/plan-validate` → `/code` → `/code-simplifier` → `/code-review` → `/changelog` → `/test` → `/watzup`                                       |
| **Documentation** | `/scout` → `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/docs-update` → `/watzup`                                                                   |
| **Code Review**   | `/code-review` → `/watzup`                                                                                                                                             |
| **Investigation** | `/scout` → `/feature-investigation`                                                                                                                                    |

## Current Instruction Files

### Claude Code Skills (`.claude/skills/`)

- `code-review/SKILL.md` - Code review skill
- `cook/SKILL.md` - Feature implementation
- `plan/SKILL.md` - Implementation planning
- See `.claude/skills/` for full list

### Copilot Instructions (`.github/instructions/`)

| File                                    | applyTo Pattern                             | Description                 |
| --------------------------------------- | ------------------------------------------- | --------------------------- |
| `backend-dotnet.instructions.md`        | `src/Services/**/*.cs,src/Platform/**/*.cs` | .NET backend patterns       |
| *(deleted — frontend patterns in `docs/frontend-patterns-reference.md`)* | `src/WebV2/**/*.ts,**/*.html` | Angular frontend patterns |
| `clean-code.instructions.md`            | `**`                                        | Universal clean code rules  |
| `backend-cqrs.instructions.md`          | CQRS files                                  | CQRS command/query patterns |
| `cqrs-patterns.instructions.md`         | Commands/Queries                            | Detailed CQRS patterns      |
| `validation.instructions.md`            | All validation                              | Validation fluent API       |
| `entity-development.instructions.md`    | Entities                                    | Entity patterns             |
| `entity-events.instructions.md`         | Side effects                                | Entity event handlers       |
| `repository.instructions.md`            | Data access                                 | Repository patterns         |
| `message-bus.instructions.md`           | Cross-service                               | Message bus patterns        |
| `background-jobs.instructions.md`       | Jobs                                        | Background job patterns     |
| `migrations.instructions.md`            | Migrations                                  | Data/schema migrations      |
| `performance.instructions.md`           | Optimization                                | Performance patterns        |
| `security.instructions.md`              | Auth/security                               | Security patterns           |
| `testing.instructions.md`               | Tests                                       | Test patterns               |
| `scss-styling.instructions.md`          | SCSS                                        | Styling patterns            |
| `bug-investigation.instructions.md`     | Debugging                                   | Bug investigation           |
| `feature-investigation.instructions.md` | Code exploration                            | Feature investigation       |

### Copilot Prompts (`.github/prompts/`)

| Prompt                               | Purpose                     |
| ------------------------------------ | --------------------------- |
| `plan.prompt.md`                     | Implementation planning     |
| `cook.prompt.md`                     | Feature implementation      |
| `code.prompt.md`                     | Execute plan                |
| `test.prompt.md`                     | Run tests                   |
| `fix.prompt.md`                      | Apply fixes                 |
| `debug.prompt.md`                    | Investigate issues          |
| `code-review.prompt.md`              | Code quality review         |
| `docs-update.prompt.md`              | Update documentation        |
| `watzup.prompt.md`                   | Summarize changes           |
| `scout.prompt.md`                    | Explore codebase            |
| `investigate.prompt.md`              | Deep dive analysis          |
| `create-cqrs-command.prompt.md`      | Create CQRS command         |
| `create-cqrs-query.prompt.md`        | Create CQRS query           |
| `create-angular-component.prompt.md` | Create Angular component    |
| `create-entity-event.prompt.md`      | Create entity event handler |
| `create-migration.prompt.md`         | Create migration            |
| `create-unit-test.prompt.md`         | Create unit test            |
| `refactor.prompt.md`                 | Refactoring guidance        |
| `api-design.prompt.md`               | API design patterns         |

## Key Differences

### 1. Automation Capability

**Claude Code** has programmatic hooks that can:

- Automatically detect intent from user prompts
- Inject workflow instructions into conversation
- Trigger post-task reviews after tool calls
- Enforce workflow sequences

**GitHub Copilot** relies on:

- Static markdown that's always read
- User follows documented protocols manually
- No automatic triggers or injections

### 2. Workaround for Copilot

Since Copilot lacks hooks:

1. Users must manually reference workflow table
2. Users invoke prompts explicitly (e.g., "follow /code-review")
3. Team training required on workflow protocols

### 3. Path-Specific Loading

**Claude Code**: Skills are invoked explicitly or via triggers
**Copilot**: Instructions auto-loaded based on `applyTo` glob patterns

## Maintenance Guidelines

### Adding New Workflows

1. Update both:
   - Claude: `.claude/workflows.json` + `workflow-router.cjs`
   - Copilot: `.github/workspace.copilot-instructions.md` workflow table

2. Create prompt files in both:
   - Claude: `.claude/skills/{workflow}/SKILL.md`
   - Copilot: `.github/prompts/{workflow}.prompt.md`

### Adding New Patterns

1. Update shared docs in `docs/claude/`
2. Add instruction file to `.github/instructions/` with proper `applyTo`
3. Add skill to `.claude/skills/` if needed

### Keeping Parity

- Shared documentation in `docs/claude/` (referenced by both)
- Workflow sequences should match
- Pattern guidance should be identical
- Run periodic audits to ensure consistency

## Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                    |
| -------------------------------- | ---------- | ------ | ----------------------------- |
| Copilot users skip workflows     | High       | Medium | Training, clear documentation |
| Divergent patterns between tools | Medium     | High   | Shared docs, periodic audits  |
| Missed dual-pass review          | Medium     | High   | Team code review culture      |
| Outdated instruction files       | Low        | Medium | Regular documentation updates |

## Recommendations

1. **Prefer Claude Code** for complex workflows requiring automation
2. **Use Copilot** for quick, well-understood tasks
3. **Maintain parity** between configurations
4. **Train team** on workflow protocols for Copilot users
5. **Regular audits** to ensure configurations stay synchronized
