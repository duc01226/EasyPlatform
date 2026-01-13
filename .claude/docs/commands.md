# Commands Reference

> 37+ slash commands for Claude Code.

## What are Commands?

Commands are direct actions invoked with `/command-name`. Unlike skills (which provide context), commands execute specific workflows.

## Commands by Category

### Planning & Investigation

| Command | Usage | Description |
|---------|-------|-------------|
| `/plan` | `/plan <task>` | Create implementation plan |
| `/plan:fast` | `/plan:fast <task>` | Quick plan (less thorough) |
| `/plan:hard` | `/plan:hard <task>` | Comprehensive plan with research |
| `/plan:validate` | `/plan:validate [path]` | Validate plan with interview |
| `/scout` | `/scout <query>` | Find relevant files |
| `/scout:ext` | `/scout:ext <query>` | External tools (Gemini, etc.) |
| `/investigate` | `/investigate <topic>` | Deep investigation |

### Implementation

| Command | Usage | Description |
|---------|-------|-------------|
| `/cook` | `/cook` | Implement current task |
| `/code` | `/code <task>` | Write code for task |
| `/fix` | `/fix <issue>` | Fix bug or issue |
| `/feature` | `/feature <name>` | Implement new feature |
| `/create-feature` | `/create-feature <name>` | Create feature scaffolding |
| `/fix-issue` | `/fix-issue <number>` | Fix GitHub issue |

### Testing & Review

| Command | Usage | Description |
|---------|-------|-------------|
| `/test` | `/test [path]` | Run or generate tests |
| `/debug` | `/debug <issue>` | Debug problem |
| `/review` | `/review [target]` | Code review |
| `/review/codebase` | `/review/codebase` | Full codebase review |
| `/review/changes` | `/review/changes` | Review recent changes |
| `/lint` | `/lint` | Run linting |
| `/build` | `/build` | Build project |

### Git & Version Control

| Command | Usage | Description |
|---------|-------|-------------|
| `/commit` | `/commit` | Stage and commit changes |
| `/git/cm` | `/git/cm` | Alias for commit |
| `/pr` | `/pr` | Create pull request |
| `/worktree` | `/worktree <action>` | Git worktree management |

### Documentation

| Command | Usage | Description |
|---------|-------|-------------|
| `/docs/update` | `/docs/update` | Update documentation |
| `/release-notes` | `/release-notes` | Generate release notes |
| `/journal` | `/journal` | Write development journal |

### Context & Memory

| Command | Usage | Description |
|---------|-------|-------------|
| `/checkpoint` | `/checkpoint` | Save context checkpoint |
| `/compact` | `/compact` | Trigger context compaction |
| `/context` | `/context` | Show current context |
| `/watzup` | `/watzup` | Session status summary |
| `/kanban` | `/kanban` | View task board |

### Utility

| Command | Usage | Description |
|---------|-------|-------------|
| `/ask` | `/ask <question>` | Ask clarifying question |
| `/brainstorm` | `/brainstorm <topic>` | Brainstorm solutions |
| `/design` | `/design <ui>` | Design UI component |
| `/preview` | `/preview` | Preview changes |
| `/security` | `/security` | Security audit |
| `/performance` | `/performance` | Performance analysis |
| `/migration` | `/migration` | Database migration |
| `/db-migrate` | `/db-migrate` | Run DB migrations |
| `/generate-dto` | `/generate-dto` | Generate DTOs |

### Skill Management

| Command | Usage | Description |
|---------|-------|-------------|
| `/skill` | `/skill <name>` | Invoke specific skill |
| `/ck-help` | `/ck-help` | Claude Kit help |
| `/coding-level` | `/coding-level <level>` | Set coding complexity |
| `/use-mcp` | `/use-mcp <server>` | Use MCP server |

### Bootstrap & Setup

| Command | Usage | Description |
|---------|-------|-------------|
| `/bootstrap` | `/bootstrap` | Project setup |
| `/integrate` | `/integrate <system>` | Integrate external system |

## Command Structure

Commands in `.claude/commands/`:

```
commands/
├── command.md         # Single-file command
├── command/           # Directory command
│   ├── command.md     # Main definition
│   └── variants.md    # Sub-commands
```

### Command Format

```markdown
---
name: command
description: Brief description
aliases: [alias1, alias2]
---

# Command Name

## Usage
`/command [args]`

## Description
[What it does]

## Examples
[Examples]
```

## Command Variants

Some commands support variants with `:`:

- `/plan` - Default planning
- `/plan:fast` - Quick planning
- `/plan:hard` - Thorough planning
- `/plan:validate` - Plan validation

## Built-in vs Custom

**Built-in** (Claude Code core):
- `/help`, `/clear`, `/compact`, `/status`

**Custom** (this project):
- All commands in `.claude/commands/`

## Creating Custom Commands

1. Create `.claude/commands/my-command.md`
2. Add frontmatter with name/description
3. Write command instructions
4. Test with `/my-command`

## Workflow Integration

Commands trigger workflow detection:

```
/plan → Detected: Planning workflow
/cook → Detected: Implementation workflow
/fix  → Detected: Bug fix workflow
```

See: [Workflow System](hooks/workflows.md)

---

*Total commands: 37+ | Last updated: 2026-01-13*
