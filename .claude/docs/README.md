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
| [Commands Reference](commands.md) | 49+ slash commands with usage | `docs/commands.md` |
| [Agents Reference](agents.md) | 22+ specialized agent types | `docs/agents.md` |
| [Configuration](configuration.md) | All config files and schemas | `docs/configuration.md` |
| [Figma Setup](figma-setup.md) | Figma integration for design extraction | `docs/figma-setup.md` |

### Hooks Subsystem Documentation

| Document | Description |
|----------|-------------|
| [ACE System](hooks/ace/README.md) | Self-learning context engineering |
| [Session Lifecycle](hooks/session/README.md) | State management, checkpoints |
| [Pattern Learning](hooks/patterns/README.md) | User pattern capture and injection |
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
│     ACE      │   Session    │   Patterns   │    Workflows      │
│  (5 hooks)   │  (4 hooks)   │  (2 hooks)   │    (2 hooks)      │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│  Dev Rules   │ Enforcement  │ Notifications│                   │
│  (4 hooks)   │  (5 hooks)   │  (1 hook)    │                   │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

## Event Trigger Flow

| Event | Trigger | Hooks (Count) |
|-------|---------|---------------|
| **SessionStart** | `startup\|resume\|clear\|compact` | session-init, session-resume, ace-session-inject, pattern-injector (4) |
| **SubagentStart** | `*` | subagent-init, role-context-injector (2) |
| **UserPromptSubmit** | Always | workflow-router, dev-rules-reminder, pattern-learner (3) |
| **PreToolUse** | Tool-specific matchers | pattern-injector, todo-enforcement, scout-block, privacy-block, context injectors (8+) |
| **PostToolUse** | Tool-specific matchers | todo-tracker, edit-count-tracker, post-edit-prettier, ace-event-emitter, workflow-step-tracker, ace-feedback-tracker (6) |
| **PreCompact** | `manual\|auto` | write-compact-marker, save-context-memory, ace-reflector-analysis, ace-curator-pruner (4) |
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
| `.claude/memory/deltas.json` | Active ACE playbook (learned patterns) |
| `.claude/memory/delta-candidates.json` | ACE candidate patterns pending promotion |
| `.claude/memory/events-stream.jsonl` | Event stream for ACE analysis |
| `.claude/learned-patterns/*.yaml` | Pattern Learning storage (by category) |

---

## Subsystem Overview

### 1. ACE (Agentic Context Engineering)

Self-learning system that captures execution patterns and injects learned context.

- **Hooks**: ace-event-emitter, ace-reflector-analysis, ace-curator-pruner, ace-session-inject, ace-feedback-tracker
- **Storage**: `memory/deltas.json`, `memory/delta-candidates.json`, `memory/events-stream.jsonl`
- **Docs**: [hooks/ace/](hooks/ace/)

### 2. Session Lifecycle

Manages session state, initialization, resume, and cleanup.

- **Hooks**: session-init, session-resume, session-end, subagent-init
- **Storage**: `.ck.json`, `.todo-state.json`
- **Docs**: [hooks/session/](hooks/session/)

### 3. Pattern Learning

Learns user patterns from prompts and injects them contextually.

- **Hooks**: pattern-learner, pattern-injector
- **Storage**: `learned-patterns/*.yaml`
- **Docs**: [hooks/patterns/](hooks/patterns/)

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
2. Add patterns to `.claude/learned-patterns/` for auto-injection
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
| How context is injected | [ACE System](hooks/ace/README.md) |
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
    ├── ace/
    │   └── README.md      # ACE self-learning
    ├── session/
    │   └── README.md      # Session lifecycle
    └── patterns/
        └── README.md      # Pattern learning
```

---

*Documentation for Claude Code v2.1.0 | Last updated: 2026-01-13*
