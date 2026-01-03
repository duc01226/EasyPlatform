---
agent: 'agent'
description: 'Dual-pass code review - first pass reviews changes, second pass only if corrections were made'
tools: ['read', 'edit', 'search', 'execute']
---

# Dual-Pass Code Review

Mandatory review checkpoint after any code changes to ensure quality and convention compliance.

## Core Principle

**Every code change requires verification before task completion.**

Two review passes:
1. **First Pass**: Review unstaged changes for correctness + convention compliance
2. **Second Pass**: Conditional - ONLY if first pass made changes, review again

## Step 1: Get Changes to Review

```bash
# Check for unstaged changes
git status --short

# Get full diff of unstaged changes
git diff

# Get diff of staged changes (if any)
git diff --staged
```

## Step 2: First Pass Review Checklist

For EACH changed file, verify:

### Task Correctness
- [ ] Addresses original requirement
- [ ] Logic is complete and correct
- [ ] No missing edge cases
- [ ] No unintended side effects

### Convention Compliance

#### Backend (.cs files)
- [ ] CQRS: Command + Handler + Result in ONE file
- [ ] Repository: Service-specific (`IPlatformQueryableRootRepository`, etc.)
- [ ] Validation: `PlatformValidationResult` fluent API
- [ ] Side effects: In event handlers, NOT command handlers
- [ ] DTO mapping: In DTO classes, NOT handlers
- [ ] Entity: Static expressions for queries, computed props have `set { }`

#### Frontend (.ts, .html files)
- [ ] Component: Correct base class (AppBaseComponent, etc.)
- [ ] State: PlatformVmStore, NOT manual signals
- [ ] HTTP: PlatformApiService, NOT direct HttpClient
- [ ] Subscriptions: `.pipe(this.untilDestroyed())`
- [ ] Templates: BEM classes on ALL elements

### Development Rules
- [ ] YAGNI - No unnecessary features/abstractions
- [ ] KISS - Simplest solution that works
- [ ] DRY - No code duplication
- [ ] Logic in LOWEST layer (Entity > Service > Component)

### Code Quality
- [ ] Compiles without errors
- [ ] Meaningful naming
- [ ] Single Responsibility Principle
- [ ] Proper error handling
- [ ] No security vulnerabilities

## Step 3: First Pass Corrections

If issues found:
1. Document each issue clearly
2. Fix issues immediately
3. Track that corrections were made

```markdown
## First Pass Corrections Made

1. [File:Line] - [Issue] → [Fix Applied]
2. [File:Line] - [Issue] → [Fix Applied]
```

## Step 4: Conditional Second Pass

**CRITICAL DECISION:**

```
IF first_pass_made_changes == true:
    EXECUTE full second pass review on updated code
ELSE:
    SKIP second pass, proceed to summary
```

## Step 5: Second Pass Review (If Needed)

Re-run complete review on current changes after corrections.

## Step 6: Generate Summary

```markdown
## Dual-Pass Review Summary

**First Pass:**
- Files reviewed: [count]
- Issues found: [count]
- Corrections made: [yes/no]

**Second Pass:**
- Executed: [yes/no]
- Reason: [first pass made changes / first pass clean]
- Additional issues: [count if executed]

**Final Status:** [APPROVED / NEEDS ATTENTION]

---
**Review Status:** [APPROVED / CORRECTIONS NEEDED]
**Passes Executed:** [1 / 2]
**Ready for Commit:** [Yes / No]
---
```

## Common Anti-Patterns to Check

### Backend

```csharp
// Side effect in handler (WRONG)
await notificationService.SendAsync(...);
// → Move to UseCaseEvents/ event handler

// Generic repository (WRONG)
IPlatformRootRepository<Entity>
// → Use service-specific: IPlatformQueryableRootRepository<Entity>

// Mapping in handler (WRONG)
var entity = new Entity { Name = req.Name };
// → Use DTO.MapToEntity() or Command.MapToNewEntity()
```

### Frontend

```typescript
// Missing BEM class (WRONG)
<div><span>{{ name }}</span></div>
// → <div class="user-card__content"><span class="user-card__name">{{ name }}</span></div>

// Missing untilDestroyed (WRONG)
this.data$.subscribe(...)
// → this.data$.pipe(this.untilDestroyed()).subscribe(...)

// Logic in component (WRONG)
readonly types = [{ value: 1, label: 'Type A' }];
// → Move to Entity: static readonly dropdownOptions = [...]
```

## Quick Validation Commands

```bash
# Backend checks
grep -r "IPlatformRootRepository" --include="*.cs"  # Should be service-specific
grep -r "new Entity {" --include="*Handler.cs"      # Should be in DTO
grep -r "SendAsync\|NotifyAsync" --include="*CommandHandler.cs"  # Should be in event handler

# Frontend checks
grep -r "class=\"\"" --include="*.html"             # Empty class (suspicious)
grep -r "subscribe()" --include="*.ts" | grep -v "untilDestroyed"  # Missing cleanup
```

## Integration with Workflows

Run this as the FINAL step before task completion:

| Workflow | Sequence |
|----------|----------|
| Feature  | plan → cook → test → **dual-pass-review** → docs-update → watzup |
| Bug Fix  | debug → plan → fix → test → **dual-pass-review** |
| Refactor | plan → code → test → **dual-pass-review** |
