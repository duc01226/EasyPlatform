---
description: ⚡⚡⚡ Two-pass code review for task completion
argument-hint: [optional-focus-area]
---

# Post-Task Two-Pass Code Review

Execute mandatory two-pass review protocol after completing code changes.
Focus: $ARGUMENTS

---

## Protocol Overview

This review ensures ALL code changes follow best practices and project conventions.
Two passes guarantee corrections don't introduce new issues.

---

## Pass 1: Initial Review

### Step 1.1: Gather Changes
```bash
# Get unstaged changes summary
git diff --stat

# Get detailed changes
git diff
```

### Step 1.2: Review Checklist

**Task Correctness:**
- [ ] Changes achieve the intended task objective
- [ ] No unrelated/unnecessary modifications
- [ ] Edge cases handled appropriately
- [ ] Error handling is complete

**Code Standards (EasyPlatform):**

*Backend:*
- [ ] Uses platform repository (IPlatformQueryableRootRepository)
- [ ] Uses PlatformValidationResult fluent API (.And(), .AndAsync())
- [ ] Side effects in Entity Event Handlers, not command handlers
- [ ] DTOs own mapping via MapToEntity()/MapToObject()
- [ ] Command + Result + Handler in ONE file

*Frontend:*
- [ ] Extends appropriate base class (AppBaseComponent, AppBaseVmStoreComponent, AppBaseFormComponent)
- [ ] Uses PlatformVmStore for state management
- [ ] Uses .pipe(this.untilDestroyed()) for subscriptions
- [ ] All template elements have BEM classes

**Architecture:**
- [ ] Logic placed in lowest appropriate layer (Entity > Service > Component)
- [ ] No cross-service direct database access
- [ ] Follows existing patterns found in codebase

**Security:**
- [ ] No hardcoded secrets or credentials
- [ ] Input validation at boundaries
- [ ] Proper authorization checks

### Step 1.3: Execute Corrections
If any issues found:
1. Fix each issue directly
2. Mark `PASS_1_MADE_CHANGES = true`
3. Proceed to Pass 2

If no issues found:
1. Mark `PASS_1_MADE_CHANGES = false`
2. Skip to Final Report

---

## Pass 2: Re-Review (Conditional)

**ONLY EXECUTE IF PASS 1 MADE CHANGES**

### Step 2.1: Verify All Changes
```bash
# Check updated changes
git diff --stat
git diff
```

### Step 2.2: Full Re-Review
Repeat Pass 1 checklist on ALL current changes (original + corrections).

Focus areas:
- [ ] Original task still correctly implemented
- [ ] Corrections are valid and complete
- [ ] No new issues introduced by corrections
- [ ] Code is production-ready

### Step 2.3: Final Corrections
If issues found:
- Apply minimal, targeted fixes
- Document any trade-offs made

---

## Final Report

### Summary Template
```markdown
## Post-Task Review Complete

**Task:** [Brief description]
**Pass 1 Result:** [Clean / N issues fixed]
**Pass 2 Required:** [Yes/No]
**Pass 2 Result:** [N/A / Clean / N issues fixed]

### Changes Summary
- [List of files modified]
- [Key changes made]

### Issues Found & Fixed
1. [Issue]: [Fix applied]
2. ...

### Remaining Concerns (if any)
- [Concern]: [Reason not addressed / Recommended follow-up]

### Verification
- [ ] Task objective achieved
- [ ] Code follows project conventions
- [ ] No security vulnerabilities
- [ ] Ready for commit
```

---

## Quick Commands

```bash
# View changes for review
git diff --stat && git diff

# Check specific file
git diff path/to/file.ts

# Discard a problematic change
git checkout -- path/to/file.ts

# Stage reviewed changes
git add -p  # Interactive staging
```

---

## Integration Notes

- This command is auto-triggered by workflow orchestration after `/cook`, `/fix`, `/code`
- Can be manually invoked anytime with `/review:post-task`
- For PR reviews, use `/review:codebase` instead
- Use `code-reviewer` subagent for complex reviews requiring deeper analysis
