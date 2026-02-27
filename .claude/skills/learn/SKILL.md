---
name: learn
description: "[Tooling & Meta] Teach Claude a new pattern, preference, or convention explicitly. Use when you want to save a correction, preference, or coding pattern for future sessions. Triggers on /learn or 'remember this/that'."
allowed-tools: Read, Write, Edit, Bash
---

# Pattern Learning Skill

Explicitly teach Claude patterns, preferences, or conventions to remember across sessions.

## Quick Usage

```
/learn always use PlatformValidationResult instead of throwing ValidationException
/learn backend: DTO mapping should be in the DTO class, not in command handlers
remember this: always use IGrowthRootRepository instead of generic IPlatformRootRepository
```

## How It Works

1. **Detection**: `pattern-learner.cjs` hook detects `/learn` command or "remember this/that" in your prompt
2. **Storage**: Appends lesson to `docs/lessons.md` (append-only log)
3. **Injection**: `lessons-injector.cjs` hook injects lessons.md content on every prompt and before file edits

## Trigger Patterns

| Pattern                 | Example                                     |
| ----------------------- | ------------------------------------------- |
| `/learn <text>`         | `/learn always prefer const over let`       |
| `remember this: <text>` | `remember this: use BEM naming for all CSS` |
| `remember that <text>`  | `remember that DTOs own mapping`            |

## Storage

Lessons are stored in `docs/lessons.md` as an append-only log:

```markdown
# Lessons Learned

## Behavioral Lessons

- [2026-02-25] Learned: always use PlatformValidationResult instead of throwing
- [2026-02-25] Learned: backend: DTO mapping in DTO class, not handlers
```

## Files

- `docs/lessons.md` — Append-only lesson log
- `.claude/hooks/pattern-learner.cjs` — Detects /learn commands, writes lessons
- `.claude/hooks/lessons-injector.cjs` — Injects lessons into context
- `.claude/hooks/lib/lessons-writer.cjs` — `appendLesson()` utility
