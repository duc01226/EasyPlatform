# Skills Reference (formerly Commands)

> 150+ slash commands via skills for Claude Code.

## What are Skills?

Skills are invoked with `/skill-name`. Each skill is a directory under `.claude/skills/` containing a `SKILL.md` with frontmatter and instructions.

> **Migration Note (2026-01-31):** All commands have been merged into the skills system. Commands that were standalone have been converted to skills. Commands that delegated to skills have been deleted. All `/xxx` triggers continue to work.

## Skills by Category

### Planning & Investigation

| Skill            | Usage                   | Description                      |
| ---------------- | ----------------------- | -------------------------------- |
| `/plan`          | `/plan <task>`          | Create implementation plan       |
| `/plan-fast`     | `/plan-fast <task>`     | Quick plan (less thorough)       |
| `/plan-hard`     | `/plan-hard <task>`     | Comprehensive plan with research |
| `/plan-validate` | `/plan-validate [path]` | Validate plan with interview     |
| `/scout`         | `/scout <query>`        | Find relevant files              |
| `/scout-ext`     | `/scout-ext <query>`    | External tools (Gemini, etc.)    |
| `/investigate`   | `/investigate <topic>`  | Deep investigation               |

### Implementation

| Skill             | Usage                    | Description                |
| ----------------- | ------------------------ | -------------------------- |
| `/cook`           | `/cook`                  | Implement current task     |
| `/code`           | `/code <task>`           | Write code for task        |
| `/fix`            | `/fix <issue>`           | Fix bug or issue           |
| `/feature`        | `/feature <name>`        | Implement new feature      |
| `/create-feature` | `/create-feature <name>` | Create feature scaffolding |
| `/fix-issue`      | `/fix-issue <number>`    | Fix GitHub issue           |

### Testing & Review

| Skill              | Usage              | Description           |
| ------------------ | ------------------ | --------------------- |
| `/test`            | `/test [path]`     | Run or generate tests |
| `/debug`           | `/debug <issue>`   | Debug problem         |
| `/review`          | `/review [target]` | Code review           |
| `/review-codebase` | `/review-codebase` | Full codebase review  |
| `/review-changes`  | `/review-changes`  | Review recent changes |
| `/lint`            | `/lint`            | Run linting           |
| `/build`           | `/build`           | Build project         |

### Git & Version Control

| Skill       | Usage                | Description              |
| ----------- | -------------------- | ------------------------ |
| `/commit`   | `/commit`            | Stage and commit changes |
| `/pr`       | `/pr`                | Create pull request      |
| `/worktree` | `/worktree <action>` | Git worktree management  |

### Documentation

| Skill            | Usage            | Description               |
| ---------------- | ---------------- | ------------------------- |
| `/docs-update`   | `/docs-update`   | Update documentation      |
| `/release-notes` | `/release-notes` | Generate release notes    |
| `/journal`       | `/journal`       | Write development journal |

### Context & Memory

| Skill         | Usage         | Description                |
| ------------- | ------------- | -------------------------- |
| `/checkpoint` | `/checkpoint` | Save context checkpoint    |
| `/compact`    | `/compact`    | Trigger context compaction |
| `/context`    | `/context`    | Show current context       |
| `/watzup`     | `/watzup`     | Session status summary     |
| `/kanban`     | `/kanban`     | View task board            |

### Utility

| Skill           | Usage                 | Description             |
| --------------- | --------------------- | ----------------------- |
| `/ask`          | `/ask <question>`     | Ask clarifying question |
| `/brainstorm`   | `/brainstorm <topic>` | Brainstorm solutions    |
| `/design-fast`  | `/design-fast <ui>`   | Design UI component     |
| `/preview`      | `/preview`            | Preview changes         |
| `/security`     | `/security`           | Security audit          |
| `/performance`  | `/performance`        | Performance analysis    |
| `/migration`    | `/migration`          | Create or run DB migrations |
| `/generate-dto` | `/generate-dto`       | Generate DTOs           |

### Skill Management

| Skill           | Usage                   | Description           |
| --------------- | ----------------------- | --------------------- |
| `/skill-plan`   | `/skill-plan`           | Create/optimize skill |
| `/ck-help`      | `/ck-help`              | Claude Kit help       |
| `/coding-level` | `/coding-level <level>` | Set coding complexity |
| `/use-mcp`      | `/use-mcp <server>`     | Use MCP server        |

### Bootstrap & Setup

| Skill              | Usage                        | Description               |
| ------------------ | ---------------------------- | ------------------------- |
| `/bootstrap`       | `/bootstrap`                 | Project setup             |
| `/integrate-polar` | `/integrate-polar <system>`  | Integrate Polar.sh        |
| `/integrate-sepay` | `/integrate-sepay <system>`  | Integrate SePay.vn        |

### Team Collaboration

| Skill            | Usage                    | Description                          |
| ---------------- | ------------------------ | ------------------------------------ |
| `/team-idea`          | `/team-idea <description>`    | Capture product idea                 |
| `/team-refine`        | `/team-refine <idea-id>`      | Refine idea into PBI                 |
| `/team-story`         | `/team-story <pbi-id>`        | Create user stories from PBI         |
| `/team-prioritize`    | `/team-prioritize [ideas]`    | Prioritize ideas using RICE/MoSCoW   |
| `/team-test-spec`     | `/team-test-spec <pbi-id>`    | Create test specification            |
| `/team-test-cases`    | `/team-test-cases <spec-id>`  | Generate detailed test cases         |
| `/team-design-spec`   | `/team-design-spec <source>`  | Create design spec from PBI or Figma |
| `/team-quality-gate`  | `/team-quality-gate <target>` | QC quality assessment                |
| `/team-status`        | `/team-status [scope]`        | Project status report                |
| `/team-dependency`    | `/team-dependency <target>`   | Dependency analysis                  |
| `/team-team-sync`     | `/team-team-sync`             | Cross-team synchronization           |
| `/team-figma-extract` | `/team-figma-extract <url>`   | Extract design specs from Figma      |

## Skill Structure

Skills in `.claude/skills/`:

```
skills/
├── skill-name/
│   ├── SKILL.md        # Required - frontmatter + instructions
│   ├── references/     # On-demand docs (<100 lines each)
│   └── scripts/        # Executable code
```

### SKILL.md Format

```markdown
---
name: skill-name
description: Brief description
---

# Skill Name

[Instructions for Claude]
```

## Skill Variants

Related skills use dash-separated names:

- `/plan` - Default planning
- `/plan-fast` - Quick planning
- `/plan-hard` - Thorough planning
- `/plan-validate` - Plan validation

## Built-in vs Custom

**Built-in** (Claude Code core):
- `/help`, `/clear`, `/compact`, `/status`

**Custom** (this project):
- All skills in `.claude/skills/`

## Creating Custom Skills

1. Create `.claude/skills/my-skill/SKILL.md`
2. Add frontmatter with name/description
3. Write skill instructions
4. Test with `/my-skill`

## Workflow Integration

Skills trigger workflow detection:

```
/plan → Detected: Planning workflow
/cook → Detected: Implementation workflow
/fix  → Detected: Bug fix workflow
```

See: [Workflow System](hooks/workflows.md)

---

*Total skills: 150+ | Last updated: 2026-01-31*
