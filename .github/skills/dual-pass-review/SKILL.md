# Dual-Pass Review Skill

> Mandatory two-pass code review ensuring correctness and convention compliance

## Trigger Keywords

- "review", "code review", "check code", "dual pass", "two pass"
- After any implementation task (proactive activation)

## Purpose

Enforce a standardized two-pass review process that:
1. **Pass 1:** Reviews all unstaged changes for issues
2. **Pass 2:** Verifies corrections (only if Pass 1 made changes)

## When to Use

Use this skill:
- **AFTER** completing any feature implementation
- **AFTER** bug fixes
- **AFTER** refactoring work
- **BEFORE** committing changes
- When user says "review my changes"

## Process

### Pass 1: Initial Review

```markdown
## Pass 1 Checklist

### Backend (C#)
- [ ] CQRS: Command + Result + Handler in ONE file
- [ ] Validation: Uses PlatformValidationResult fluent API
- [ ] Repository: Uses platform repository + extensions
- [ ] Side Effects: In entity event handlers, NOT command handlers
- [ ] DTO Mapping: In DTO class via MapToEntity()/MapToObject()
- [ ] Cross-Service: Message bus, NOT direct DB access

### Frontend (TypeScript)
- [ ] Component: Extends AppBase* components
- [ ] State: Uses PlatformVmStore
- [ ] API: Extends PlatformApiService
- [ ] Subscriptions: Uses untilDestroyed()
- [ ] Templates: ALL elements have BEM classes

### Architecture
- [ ] Logic in LOWEST layer (Entity > Service > Component)
- [ ] No code duplication
- [ ] Clean code principles
```

### Pass 2: Verification (Conditional)

Only execute if Pass 1 made corrections:

```markdown
## Pass 2 Verification

- [ ] All Pass 1 corrections applied correctly
- [ ] No new issues from corrections
- [ ] Code compiles
- [ ] Tests pass (if applicable)
```

## Output Format

```markdown
## Dual-Pass Review Report

### Pass 1: Initial Review
**Files:** [count]
**Issues:** [count]
**Corrections:**
- [list of fixes, or "None needed"]

### Pass 2: Verification
**Status:** [Executed/Skipped (no corrections in Pass 1)]
**Result:** [Verified/Issues found]

### Summary
**Status:** [Ready for commit | Needs attention]
```

## Critical Rules

1. **Never skip Pass 1** - Always review all changes
2. **Pass 2 is conditional** - Only if Pass 1 made corrections
3. **Fix immediately** - Don't just report, fix issues
4. **Document all corrections** - User must know what changed

## Integration

This skill integrates with:
- `/cook` workflow - Run after implementation
- `/fix` workflow - Run after bug fixes
- `/code-review` workflow - Core component
- Pre-commit checks

## Related

- `.github/prompts/dual-pass-review.prompt.md`
- `.github/prompts/post-task-review.prompt.md`
- `docs/claude/08-clean-code-rules.md`
