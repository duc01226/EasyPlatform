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

| Document | Description | Path |
|----------|-------------|------|
| **[Quick Reference](quick-reference.md)** | One-page cheat sheet | `docs/quick-reference.md` |
| [Hooks System](hooks/README.md) | 27 hooks, event lifecycle, registration | `docs/hooks/` |
| [Skills Reference](skills.md) | 84+ skills organized by category | `docs/skills.md` |
| [Skills Reference (Commands)](commands.md) | 150+ slash commands via skills | `docs/commands.md` |
| [Agents Reference](agents.md) | 22+ specialized agent types | `docs/agents.md` |
| [Configuration](configuration.md) | All config files and schemas | `docs/configuration.md` |
| [Figma Setup](figma-setup.md) | Figma integration for design extraction | `docs/figma-setup.md` |

### Hooks Subsystem Documentation

| Document | Description |
|----------|-------------|
| [Session Lifecycle](hooks/session/README.md) | State management, checkpoints |
| [Pattern Learning](hooks/patterns/README.md) | User pattern capture and lesson injection |
| [Workflows](hooks/workflows.md) | Intent detection and routing |
| [Dev Rules](hooks/dev-rules.md) | Context-aware development guidance |
| [Enforcement](hooks/enforcement.md) | Safety blocks and validation |

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
│   Session    │   Patterns   │   Workflows  │    Dev Rules      │
│  (4 hooks)   │  (2 hooks)   │  (2 hooks)   │    (5 hooks)      │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│ Enforcement  │ Notifications│   Learning   │                   │
│  (5 hooks)   │  (1 hook)    │  (2 hooks)   │                   │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

## Event Trigger Flow

| Event | Trigger | Hooks (Count) |
|-------|---------|---------------|
| **SessionStart** | `startup\|resume\|clear\|compact` | session-init, session-resume (2) |
| **SubagentStart** | `*` | subagent-init, role-context-injector (2) |
| **UserPromptSubmit** | Always | workflow-router, dev-rules-reminder, pattern-learner (3) |
| **PreToolUse** | Tool-specific matchers | lessons-injector, todo-enforcement, scout-block, privacy-block, figma-context-extractor, context injectors (9+) |
| **PostToolUse** | Tool-specific matchers | todo-tracker, edit-complexity-tracker, bash-cleanup, post-edit-prettier, workflow-step-tracker (5) |
| **PreCompact** | `manual\|auto` | write-compact-marker, save-context-memory (2) |
| **SessionEnd** | `clear` | session-end (1) |
| **Notification** | System | notify.cjs (1) |

---

## Storage Locations

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Main configuration, hook registrations, permissions |
| `.claude/.ck.json` | Claude Kit session state |
| `.claude/.todo-state.json` | Todo persistence across sessions |
| `.claude/.workflow-state.json` | Workflow progress tracking |
| `.claude/.edit-state.json` | Edit operation tracking |
| `docs/lessons.md` | Append-only lesson log (learning system) |

---

## Subsystem Overview

### 1. Learning System

Simple manual learning mechanism via `/learn` command.

- **Hooks**: pattern-learner, lessons-injector
- **Storage**: `docs/lessons.md` (append-only log)
- **Docs**: [hooks/patterns/](hooks/patterns/)

### 2. Session Lifecycle

Manages session state, initialization, resume, and cleanup.

- **Hooks**: session-init, session-resume, session-end, subagent-init
- **Storage**: `.ck.json`, `.todo-state.json`
- **Docs**: [hooks/session/](hooks/session/)


### 4. Workflow System

Detects user intent and routes to appropriate workflows.

- **Hooks**: workflow-router, workflow-step-tracker
- **Storage**: `.workflow-state.json`
- **Docs**: [hooks/workflows.md](hooks/workflows.md)

### 5. Development Rules

Injects context-aware development guidance based on file types.

- **Hooks**: backend-csharp-context, frontend-typescript-context, design-system-context, scss-styling-context, dev-rules-reminder
- **Docs**: [hooks/dev-rules.md](hooks/dev-rules.md)

### 6. Enforcement & Safety

Blocks unsafe or out-of-scope operations.

- **Hooks**: todo-enforcement, scout-block, privacy-block, cross-platform-bash, post-edit-prettier
- **Docs**: [hooks/enforcement.md](hooks/enforcement.md)

---

## Getting Started

### For Users

1. **Skills**: Use `/skill-name` to invoke skills (e.g., `/commit`, `/plan`, `/cook`)
2. **Workflows**: Detected automatically from prompts (e.g., "implement X" triggers Feature workflow)
3. **Todos**: Required for implementation skills (enforced by todo-enforcement hook)

### For Customization

1. Edit `.claude/settings.json` to modify hook registrations
2. Use `/learn` to add lessons to `docs/lessons.md` for auto-injection
3. Create skills in `.claude/skills/skill-name/SKILL.md`

---

## Cross-References

### By Task Type

| Task | Start With | Primary Docs |
|------|-----------|--------------|
| **New Feature** | `/plan` → `/cook` | [Commands](commands.md), [Workflows](hooks/workflows.md) |
| **Bug Fix** | `/scout` → `/investigate` → `/fix` | [Agents](agents.md), [Skills](skills.md) |
| **Code Review** | `/review` | [Agents](agents.md#quality--review) |
| **Exploration** | `/scout` or Task tool | [Agents](agents.md#research--investigation) |
| **Configuration** | Edit files directly | [Configuration](configuration.md) |

### By Concept

| Concept | Documentation |
|---------|---------------|
| How hooks work | [Hooks Overview](hooks/README.md) |
| How patterns are learned | [Pattern Learning](hooks/patterns/README.md) |
| How lessons are injected | [Pattern Learning](hooks/patterns/README.md) |
| How workflows are detected | [Workflows](hooks/workflows.md) |
| How permissions work | [Configuration](configuration.md#permissions-section) |
| How agents are invoked | [Agents](agents.md#agent-invocation) |

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
    ├── session/
    │   └── README.md      # Session lifecycle
    └── patterns/
        └── README.md      # Pattern learning
```

---

*Documentation for Claude Code v2.1.0 | Last updated: 2026-01-13*
