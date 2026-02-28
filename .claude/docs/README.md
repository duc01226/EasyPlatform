# Claude Code Documentation

> Comprehensive reference for developers using Claude Code in EasyPlatform.

## Quick Start

```bash
# Common commands
/plan          # Create implementation plan
/cook          # Implement current task
/scout         # Find relevant files
/commit        # Stage and commit changes

# Bypass workflow detection
quick: add a button
```

## Documentation Index

| Document                                  | Description                             | Path                      |
| ----------------------------------------- | --------------------------------------- | ------------------------- |
| **[Quick Reference](quick-reference.md)** | One-page cheat sheet                    | `docs/quick-reference.md` |
| [Hooks System](hooks/README.md)           | Hooks, event lifecycle, registration    | `docs/hooks/`             |
| [Skills Reference](skills.md)             | 84+ skills organized by category        | `docs/skills.md`          |
| [Commands Reference](commands.md)         | 49+ slash commands with usage           | `docs/commands.md`        |
| [Agents Reference](agents.md)             | 22+ specialized agent types             | `docs/agents.md`          |
| [Configuration](configuration.md)         | All config files and schemas            | `docs/configuration.md`   |
| [Figma Setup](figma-setup.md)             | Figma integration for design extraction | `docs/figma-setup.md`     |

### Hooks Subsystem Documentation

| Document                                     | Description                        |
| -------------------------------------------- | ---------------------------------- |
| [Session Lifecycle](hooks/session/README.md) | State management, checkpoints      |
| [Workflows](hooks/workflows.md)              | Intent detection and routing       |
| [Dev Rules](hooks/dev-rules.md)              | Context-aware development guidance |
| [Enforcement](hooks/enforcement.md)          | Safety blocks and validation       |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code Session                       │
├─────────────────────────────────────────────────────────────────┤
│  Events: SessionStart → UserPromptSubmit → PreToolUse →         │
│          PostToolUse → PreCompact → SessionEnd                  │
├─────────────────────────────────────────────────────────────────┤
│                         Hook Subsystems                          │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   Session    │  Workflows   │  Dev Rules   │   Enforcement     │
│  (4 hooks)   │  (2 hooks)   │  (5 hooks)   │    (5 hooks)      │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│ Notifications│              │              │                   │
│  (1 hook)    │              │              │                   │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

## Event Trigger Flow

| Event                | Trigger                           | Hooks (Count)                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SessionStart**     | `startup\|resume\|clear\|compact` | session-init, session-resume, post-compact-recovery, lessons-injector, npm-auto-install (5)                                                                                                                                                          |
| **SubagentStart**    | `*`                               | subagent-init (1)                                                                                                                                                                                                                                    |
| **UserPromptSubmit** | Always                            | workflow-router, dev-rules-reminder, lessons-injector (3)                                                                                                                                                                                            |
| **PreToolUse**       | Tool-specific matchers            | windows-command-detector, scout-block, privacy-block, path-boundary-block, edit-complexity-tracker, todo-enforcement, code-review-rules-injector, context injectors (5), role-context-injector, figma-context-extractor, artifact-path-resolver (16) |
| **PostToolUse**      | Tool-specific matchers            | tool-output-swap, bash-cleanup, post-edit-prettier, todo-tracker, workflow-step-tracker, tool-counter, notify-waiting (7)                                                                                                                            |
| **PreCompact**       | `manual\|auto`                    | write-compact-marker (1)                                                                                                                                                                                                                             |
| **SessionEnd**       | `clear\|exit\|compact`            | session-end, notify-waiting (2)                                                                                                                                                                                                                      |
| **Stop**             | Always                            | notify-waiting (1)                                                                                                                                                                                                                                   |
| **Notification**     | `idle_prompt`                     | notify-waiting.js (1)                                                                                                                                                                                                                                |

---

## Storage Locations

| File                                   | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `.claude/settings.json`                | Main configuration, hook registrations, permissions |
| `.claude/.ck.json`                     | Claude Kit session state                            |
| `.claude/.todo-state.json`             | Todo persistence across sessions                    |
| `.claude/.workflow-state.json`         | Workflow progress tracking                          |
| `.claude/.edit-state.json`             | Edit operation tracking                             |
| `docs/lessons.md`                      | Learned lessons (via /learn skill)                  |

---

## Subsystem Overview

### 1. Session Lifecycle

Manages session state, initialization, resume, and cleanup.

- **Hooks**: session-init, session-resume, post-compact-recovery, npm-auto-install, session-end, subagent-init
- **Storage**: `.ck.json`, `.todo-state.json`
- **Docs**: [hooks/session/](hooks/session/)

### 2. Workflow System

Detects user intent and routes to appropriate workflows.

- **Hooks**: workflow-router, workflow-step-tracker
- **Storage**: `.workflow-state.json`
- **Docs**: [hooks/workflows.md](hooks/workflows.md)

### 3. Development Rules

Injects context-aware development guidance based on file types.

- **Hooks**: backend-csharp-context, frontend-typescript-context, design-system-context, scss-styling-context, dev-rules-reminder
- **Docs**: [hooks/dev-rules.md](hooks/dev-rules.md)

### 4. Enforcement & Safety

Blocks unsafe or out-of-scope operations.

- **Hooks**: todo-enforcement, scout-block, privacy-block, windows-command-detector, post-edit-prettier
- **Docs**: [hooks/enforcement.md](hooks/enforcement.md)

---

## Getting Started

### For Users

1. **Skills**: Use `/skill-name` to invoke skills (e.g., `/commit`, `/plan`, `/cook`)
2. **Workflows**: Detected automatically from prompts (e.g., "implement X" triggers Feature workflow)
3. **Todos**: Required for implementation skills (enforced by todo-enforcement hook)

### For Customization

1. Edit `.claude/settings.json` to modify hook registrations
2. Create skills in `.claude/skills/skill-name/SKILL.md`

---

## Cross-References

### By Task Type

| Task              | Start With                                            | Primary Docs                                             |
| ----------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| **New Feature**   | `/plan` → `/plan-review` → `/plan-validate` → `/cook` | [Commands](commands.md), [Workflows](hooks/workflows.md) |
| **Bug Fix**       | `/scout` → `/investigate` → `/fix`                    | [Agents](agents.md), [Skills](skills.md)                 |
| **Code Review**   | `/review`                                             | [Agents](agents.md#quality--review)                      |
| **Exploration**   | `/scout` or Task tool                                 | [Agents](agents.md#research--investigation)              |
| **Configuration** | Edit files directly                                   | [Configuration](configuration.md)                        |

### By Concept

| Concept                    | Documentation                                         |
| -------------------------- | ----------------------------------------------------- |
| How hooks work             | [Hooks Overview](hooks/README.md)                     |
| How workflows are detected | [Workflows](hooks/workflows.md)                       |
| How permissions work       | [Configuration](configuration.md#permissions-section) |
| How agents are invoked     | [Agents](agents.md#agent-invocation)                  |

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Project-level Claude Code instructions
- [docs/claude/](../../docs/claude/) - Backend/frontend pattern guides

## File Structure

```
.claude/docs/
├── README.md              # This file - main navigation
├── quick-reference.md     # One-page cheat sheet
├── skills.md              # Skills catalog (84+)
├── commands.md            # Commands catalog (49+)
├── agents.md              # Agents reference (22+)
├── configuration.md       # Config file schemas
└── hooks/
    ├── README.md          # Hooks overview
    ├── workflows.md       # Workflow system
    ├── dev-rules.md       # Dev rules injection
    ├── enforcement.md     # Safety enforcement
    └── session/
        └── README.md      # Session lifecycle
```

---

*Documentation for Claude Code v2.1.0 | Last updated: 2026-01-13*
