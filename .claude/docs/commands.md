# Commands Reference (DEPRECATED)

> **All commands have been migrated to skills.** All `/command-name` triggers still work via the skills system.
> See `.claude/skills/` for the full list.

## What are Commands?

Commands were direct actions invoked with `/command-name`. They have been consolidated into skills for a unified architecture. All existing triggers continue to work.

## Commands by Category

### Planning & Investigation

| Command          | Usage                   | Description                      |
| ---------------- | ----------------------- | -------------------------------- |
| `/plan`          | `/plan <task>`          | Create implementation plan       |
| `/plan-fast`     | `/plan-fast <task>`     | Quick plan (less thorough)       |
| `/plan-hard`     | `/plan-hard <task>`     | Comprehensive plan with research |
| `/plan-validate` | `/plan-validate [path]` | Validate plan with interview     |
| `/scout`         | `/scout <query>`        | Find relevant files              |
| `/scout-ext`     | `/scout-ext <query>`    | External tools (Gemini, etc.)    |
| `/feature-investigation` | `/feature-investigation <topic>` | Deep investigation |

### Implementation

| Command           | Usage                    | Description                |
| ----------------- | ------------------------ | -------------------------- |
| `/cook`           | `/cook`                  | Implement current task     |
| `/code`           | `/code <task>`           | Write code for task        |
| `/fix`            | `/fix <issue>`           | Fix bug or issue           |
| `/feature`        | `/feature <name>`        | Implement new feature      |
| `/create-feature` | `/create-feature <name>` | Create feature scaffolding |
| `/fix-issue`      | `/fix-issue <number>`    | Fix GitHub issue           |

### Testing & Review

| Command            | Usage              | Description           |
| ------------------ | ------------------ | --------------------- |
| `/test`            | `/test [path]`     | Run or generate tests |
| `/debug`           | `/debug <issue>`   | Debug problem         |
| `/review`          | `/review [target]` | Code review           |
| `/code-review`     | `/code-review`     | Full codebase review  |
| `/review-changes`  | `/review-changes`  | Review recent changes |
| `/lint`            | `/lint`            | Run linting           |
| `/build`           | `/build`           | Build project         |

### Git & Version Control

| Command     | Usage                | Description              |
| ----------- | -------------------- | ------------------------ |
| `/commit`   | `/commit`            | Stage and commit changes |
| `/git/cm`   | `/git/cm`            | Alias for commit         |
| `/pr`       | `/pr`                | Create pull request      |
| `/worktree` | `/worktree <action>` | Git worktree management  |

### Documentation

| Command          | Usage            | Description               |
| ---------------- | ---------------- | ------------------------- |
| `/docs/update`   | `/docs/update`   | Update documentation      |
| `/release-notes` | `/release-notes` | Generate release notes    |
| `/journal`       | `/journal`       | Write development journal |

### Context & Memory

| Command       | Usage         | Description                |
| ------------- | ------------- | -------------------------- |
| `/checkpoint` | `/checkpoint` | Save context checkpoint    |
| `/compact`    | `/compact`    | Trigger context compaction |
| `/context`    | `/context`    | Show current context       |
| `/watzup`     | `/watzup`     | Session status summary     |
| `/kanban`     | `/kanban`     | View task board            |

### Utility

| Command         | Usage                 | Description             |
| --------------- | --------------------- | ----------------------- |
| `/ask`          | `/ask <question>`     | Ask clarifying question |
| `/brainstorm`   | `/brainstorm <topic>` | Brainstorm solutions    |
| `/design`       | `/design <ui>`        | Design UI component     |
| `/preview`      | `/preview`            | Preview changes         |
| `/security`     | `/security`           | Security audit          |
| `/performance`  | `/performance`        | Performance analysis    |
| `/migration`    | `/migration`          | Database migration      |
| `/db-migrate`   | `/db-migrate`         | Run DB migrations       |
| `/generate-dto` | `/generate-dto`       | Generate DTOs           |

### Skill Management

| Command         | Usage                   | Description           |
| --------------- | ----------------------- | --------------------- |
| `/skill`        | `/skill <name>`         | Invoke specific skill |
| `/ck-help`      | `/ck-help`              | Claude Kit help       |
| `/coding-level` | `/coding-level <level>` | Set coding complexity |
| `/use-mcp`      | `/use-mcp <server>`     | Use MCP server        |

### Bootstrap & Setup

| Command      | Usage                 | Description               |
| ------------ | --------------------- | ------------------------- |
| `/bootstrap` | `/bootstrap`          | Project setup             |
| `/integrate` | `/integrate <system>` | Integrate external system |

### Team Collaboration

| Command          | Usage                    | Description                          |
| ---------------- | ------------------------ | ------------------------------------ |
| `/idea`          | `/idea <description>`    | Capture product idea                 |
| `/refine`        | `/refine <idea-id>`      | Refine idea into PBI                 |
| `/story`         | `/story <pbi-id>`        | Create user stories from PBI         |
| `/prioritize`    | `/prioritize [ideas]`    | Prioritize ideas using RICE/MoSCoW   |
| `/test-spec`     | `/test-spec <pbi-id>`    | Create test specification and detailed test cases |
| `/design-spec`   | `/design-spec <source>`  | Create design spec from PBI or Figma |
| `/quality-gate`  | `/quality-gate <target>` | QC quality assessment                |
| `/status`        | `/status [scope]`        | Project status report                |
| `/dependency`    | `/dependency <target>`   | Dependency analysis                  |
| `/team-sync`     | `/team-sync`             | Cross-team synchronization           |
| `/figma-extract` | `/figma-extract <url>`   | Extract design specs from Figma      |

## Skill Structure (Current)

All commands have been migrated to skills in `.claude/skills/`:

```
skills/
├── my-skill/
│   └── SKILL.md       # Skill definition with YAML frontmatter
```

### Skill Format

```markdown
---
name: my-skill
version: 1.0.0
description: Brief description
activation: user-invoked
infer: false
---

# Skill content and instructions
```

### Naming Convention

- Skill folder names use hyphens: `cook-auto-fast/SKILL.md`
- Triggers: `/cook-auto-fast` (hyphens, NOT colons)
- Old colon-based triggers (e.g., `/cook:auto:fast`) no longer work

## Built-in vs Custom

**Built-in** (Claude Code core):
- `/help`, `/clear`, `/compact`, `/status`

**Custom** (this project):
- All skills in `.claude/skills/`

## Creating Custom Skills

1. Create `.claude/skills/my-skill/SKILL.md`
2. Add YAML frontmatter with name/version/description
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

*Total skills: 180+ | Last updated: 2026-01-31*
