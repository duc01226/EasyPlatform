# Pattern Learning Documentation

> Learns user patterns via `/learn` command and injects them as context.

## Overview

Pattern Learning captures user-taught lessons and injects them into future contexts. Users explicitly teach lessons via `/learn` or `remember this/that` commands. Lessons are stored in `docs/lessons.md` and injected by `lessons-injector.cjs`.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Pattern Detection                           │
│  (pattern-learner.cjs)                                           │
│  UserPromptSubmit: Detects /learn or "remember" → lessons.md     │
│                                                                   │
│  Triggers:                                                       │
│  - /learn <text>                                                 │
│  - remember this/that: <text>                                    │
└────────────────────────────────────────────────────────────────┬─┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Lesson Injection                            │
│  (lessons-injector.cjs)                                          │
│                                                                   │
│  Triggers:                                                       │
│  - UserPromptSubmit: Inject all lessons as system-reminder       │
│  - PreToolUse (Edit|Write|MultiEdit): Inject before file edits  │
│                                                                   │
│  Dedup: 30s timestamp window (skips PreToolUse if recent inject) │
│  Limit: 4KB safety truncation                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `pattern-learner.cjs` | UserPromptSubmit | Detect `/learn` and `remember` commands, append to lessons.md |
| `lessons-injector.cjs` | UserPromptSubmit, PreToolUse | Inject lessons.md content as system-reminder |

## Lib Modules

| Module | Purpose |
|--------|---------|
| `lessons-writer.cjs` | Append-only write to `docs/lessons.md` |

## Storage

Lessons stored in `docs/lessons.md` as an append-only markdown log:

```markdown
## Behavioral Lessons
- [2026-02-24] INIT: Always verify BEM classes on every template element
- [2026-02-24] INIT: Check base class hierarchy -- extend AppBaseComponent

## Process Improvements
(manually added during retrospectives)
```

## Usage Examples

### Explicit Learning

```
User: /learn Always use async/await instead of .then() chains in this project
```

Appends lesson to `docs/lessons.md` and confirms.

### Remember Command

```
User: remember this: Never use HttpClient directly, always extend PlatformApiService
```

Same behavior — appends lesson to `docs/lessons.md`.

## Debugging

View all lessons:
```bash
cat docs/lessons.md
```

View injected lessons (in session):
```bash
# Lessons are injected by lessons-injector.cjs on UserPromptSubmit
# and PreToolUse:Edit|Write|MultiEdit events
```

---

*See also: [Session Lifecycle](../session/) for session initialization*
