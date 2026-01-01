---
mode: agent
description: "Two-pass code review ensuring correctness and convention compliance"
tools: ["codebase", "file", "terminal"]
---

# Dual-Pass Code Review

Execute a mandatory two-pass review process for all code changes.

## Pass 1: Review Unstaged Changes

1. **Get Current Changes**
   ```bash
   git diff
   git status
   ```

2. **Review Criteria**
   - [ ] Correctness: Logic errors, edge cases, null handling
   - [ ] Convention compliance: Follows project patterns from `CLAUDE.md`
   - [ ] No anti-patterns: Check against `docs/claude/07-advanced-patterns.md`
   - [ ] BEM classes: All HTML elements have proper BEM naming
   - [ ] Subscription cleanup: All RxJS subscriptions use `untilDestroyed()`
   - [ ] Validation: Uses `PlatformValidationResult` fluent API
   - [ ] Side effects: In entity event handlers, not command handlers
   - [ ] DTO mapping: In DTO class, not in handlers

3. **If Issues Found**
   - Fix immediately
   - Document what was corrected
   - Stage the corrections

4. **If No Issues**
   - Report: "Pass 1 complete - no corrections needed"

## Pass 2: Verify Corrections (CONDITIONAL)

**Only execute if Pass 1 made corrections.**

1. **Re-check Changes**
   ```bash
   git diff --cached
   git diff
   ```

2. **Verify**
   - [ ] All Pass 1 corrections applied correctly
   - [ ] No new issues introduced by corrections
   - [ ] Code still compiles and tests pass

3. **Report**
   - List all corrections made
   - Confirm no remaining issues

## Output Format

```markdown
## Dual-Pass Review Report

### Pass 1: Initial Review
- **Files Reviewed:** [count]
- **Issues Found:** [count]
- **Corrections Made:** [list or "None"]

### Pass 2: Verification
- **Status:** [Executed/Skipped]
- **Reason:** [If skipped: "No corrections needed in Pass 1"]
- **Result:** [All corrections verified / Issues remaining]

### Summary
[Final status: Ready for commit / Needs attention]
```

## Critical Rules

1. **Never skip Pass 1** - Always review all unstaged changes
2. **Pass 2 is conditional** - Only run if Pass 1 made corrections
3. **Fix immediately** - Don't just report issues, fix them
4. **Document corrections** - User must know what was changed
