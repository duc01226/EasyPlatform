# Lessons System

> Manual teaching via `/learn` skill + automatic injection via `lessons-injector.cjs` hook

## Overview

The lessons system enables users to teach Claude persistent lessons that are injected into every conversation. Unlike the previous ACE auto-learning system, lessons are manually curated and stored as a simple markdown file.

```
USER TEACHING                         INJECTION
/learn "always use X"                 UserPromptSubmit / PreToolUse(Edit|Write|MultiEdit)
         ↓                                    ↓
/learn skill appends to               lessons-injector.cjs
docs/lessons.md                     reads docs/lessons.md
         ↓                                    ↓
- [YYYY-MM-DD] lesson text             console.log(content) → context
Max 50 entries (FIFO trim)
```

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `/learn` skill | `.claude/skills/learn/SKILL.md` | Add, list, remove lessons |
| Injector hook | `.claude/hooks/lessons-injector.cjs` | Inject lessons into context |
| Storage | `docs/lessons.md` | Simple markdown lesson list |

## Usage

```bash
/learn always use PlatformValidationResult    # Add lesson
/learn list                                    # View lessons
/learn remove 3                                # Remove lesson #3
/learn clear                                   # Clear all (with confirmation)
```

## Injection Behavior

- **UserPromptSubmit**: Injected with dedup (checks transcript for "## Learned Lessons" marker)
- **PreToolUse(Edit|Write|MultiEdit)**: Always injected (no dedup to avoid transcript I/O per edit)
- **Empty file**: Silent exit (no injection when no lessons exist)
- **Max 50 entries**: ~5K tokens, acceptable re-injection cost

## Auto-Inference

The `/learn` skill has `infer: true` — Claude Code auto-activates it when detecting phrases like:
- "remember this", "always do X", "never do Y", "from now on"

When auto-inferred, the skill confirms with the user before saving.

## Related

- [README.md](./README.md) — Hooks overview
- [../hooks-reference.md](../hooks-reference.md) — Hook execution order
