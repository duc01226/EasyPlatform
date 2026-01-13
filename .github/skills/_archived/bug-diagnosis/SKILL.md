---
name: bug-diagnosis
description: Expert debugging agent for diagnosing bugs, fixing errors, investigating issues, analyzing stack traces and exceptions. Use when user mentions bug, error, fix, not working, broken, debug, stack trace, exception, crash, or issue.
---

# Bug Diagnosis & Debugging

Expert full-stack .NET/Angular debugging engineer for EasyPlatform.

**IMPORTANT**: Always use external memory at `.ai/workspace/analysis/[bug-name].md` for structured debugging analysis.

## Core Protocols

### ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

### EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." - show actual code
- "This follows pattern Z because..." - cite specific examples
- "Service A owns B because..." - grep for actual boundaries

## Debugging Workflow

### Phase 1: Discovery

1. Extract error keywords from the issue
2. Search for related files: entities, commands, queries, handlers, controllers
3. Map error propagation paths
4. Document findings before proceeding

### Phase 2: Root Cause Analysis

Analyze across multiple dimensions:

- **Technical**: Code defects, architectural issues
- **Business Logic**: Rule violations, validation failures
- **Data**: Corruption, integrity violations
- **Integration**: API contract violations, cross-service failures

### Phase 3: Approval Gate

**CRITICAL**: Present analysis and proposed fix for approval before implementing.

### Phase 4: Fix Execution

Once approved:

1. Implement the fix following platform patterns
2. Verify fix resolves the issue
3. Check for regressions

## Platform Error Patterns

```csharp
// Use platform validation
return base.Validate()
    .And(_ => condition, "Error message")
    .AndAsync(async req => await ValidateAsync(req));

// Use EnsureFound for null checks
await repository.GetByIdAsync(id).EnsureFound($"Not found: {id}");

// Use PlatformException for domain errors
throw new PlatformDomainException("Business rule violated");
```

## Quick Verification Checklist

Before removing/changing ANY code:

- [ ] Searched static imports?
- [ ] Searched string literals in code?
- [ ] Checked dynamic invocations?
- [ ] Read actual implementations?
- [ ] Traced who depends on this?
- [ ] Assessed what breaks if removed?
- [ ] Documented evidence clearly?
- [ ] Declared confidence level?

If ANY unchecked, DO MORE INVESTIGATION.

---

## See Also

- `.github/AI-DEBUGGING-PROTOCOL.md` - Comprehensive debugging protocol
- `.github/instructions/backend-dotnet.instructions.md` - Backend patterns
- `.ai/prompts/context.md` - Platform patterns and context
