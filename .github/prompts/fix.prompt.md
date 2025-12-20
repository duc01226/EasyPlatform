---
description: "Intelligent bug fixing workflow with root cause analysis"
---

# Fix Prompt

## Overview

Systematic approach to fixing bugs, errors, and issues with proper root cause analysis before implementing solutions.

## Workflow

### Phase 1: Issue Classification

Identify the type of issue:

| Type | Indicators | Approach |
|------|------------|----------|
| Build/Compile Error | Build fails, type errors | Check compiler output, fix syntax/types |
| Runtime Error | Exceptions, crashes | Trace stack, identify root cause |
| Logic Bug | Wrong behavior | Compare expected vs actual, trace data flow |
| UI Issue | Visual/interaction problems | Inspect DOM, check styles/events |
| Test Failure | Tests failing | Read test assertions, understand expectations |
| CI/CD Failure | Pipeline errors | Check logs, identify failing step |

### Phase 2: Root Cause Analysis

**CRITICAL: Never fix symptoms. Always find root cause.**

1. **Reproduce the Issue**
   - Get exact steps to reproduce
   - Identify minimal reproduction case
   - Note environment conditions

2. **Trace Backwards**
   - Start from error/symptom
   - Follow call stack/data flow backwards
   - Identify where behavior diverges from expected

3. **Evidence Collection**
   - Gather logs, stack traces
   - Check recent changes (git log, git diff)
   - Verify assumptions with code evidence

### Phase 3: Solution Design

Before implementing:

1. **Identify affected areas**
   - What files need changes?
   - What tests need updates?
   - What could break?

2. **Consider alternatives**
   - Is there a simpler fix?
   - Does this fix the root cause or just symptoms?
   - Will this cause regressions?

3. **Plan verification**
   - How to verify fix works?
   - What tests to add/update?
   - How to prevent recurrence?

### Phase 4: Implementation

1. Make minimal, focused changes
2. Follow existing code patterns
3. Add/update tests for the fix
4. Verify fix works locally
5. Check for regressions

### Phase 5: Verification

```bash
# Build verification
dotnet build
npm run build

# Test verification
dotnet test
npm run test

# Manual verification
# Run the reproduction steps - should no longer fail
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Fixing symptoms | Masks real issue, will recur | Find and fix root cause |
| Guessing solutions | Wastes time, may introduce bugs | Trace with evidence |
| Broad changes | Risk of regressions | Minimal targeted fixes |
| Skipping tests | Bugs recur | Add test for the fix |
| Not reproducing | Can't verify fix | Always reproduce first |

## Output Format

When reporting fix:

```markdown
## Issue Analysis
- **Type**: [Build/Runtime/Logic/UI/Test/CI]
- **Root Cause**: [What actually caused the issue]
- **Evidence**: [How you determined the cause]

## Fix Applied
- **Files Changed**: [List of files]
- **Changes**: [Summary of changes]
- **Why This Fix**: [Explanation]

## Verification
- **Tests**: [Tests added/updated]
- **Manual Check**: [Steps verified]
- **Build Status**: [Pass/Fail]
```

## Important

- Always trace to root cause before fixing
- Never assume - verify with code evidence
- Minimal changes = minimal risk
- Every fix needs verification

**IMPORTANT:** Focus on understanding the issue before attempting fixes. A fix without understanding is just guessing.
