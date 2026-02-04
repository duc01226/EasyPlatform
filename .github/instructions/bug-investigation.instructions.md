---
applyTo: '**/*.cs,**/*.ts'
---

# Bug Investigation Protocol

> Auto-loads when editing code files. See `.ai/docs/AI-DEBUGGING-PROTOCOL.md` for full protocol.

## Investigation Workflow

```
1. Reproduce  → Confirm the bug exists
2. Isolate    → Find the smallest reproduction
3. Trace      → Follow data flow from input to output
4. Root Cause → Identify WHY, not just WHERE
5. Fix        → Apply minimal targeted fix
6. Verify     → Confirm fix + no regressions
```

## Evidence-Based Debugging

**NEVER assume based on first glance.** Always verify with evidence:

### Verification Checklist

- [ ] Searched static imports?
- [ ] Searched string literals?
- [ ] Checked dynamic invocations?
- [ ] Read actual implementations?
- [ ] Traced dependencies?
- [ ] Declared confidence level?

### Confidence Declaration

Before making changes, declare confidence:

- **< 90% confidence** → Ask user, gather more evidence
- **≥ 90% confidence** → Proceed with fix

## Search Patterns

When investigating, search with multiple patterns:

```
1. Class/method name (exact)
2. Interface implementations
3. String references (for dynamic dispatch)
4. Configuration references
5. Event handler registrations
6. Message bus consumers
```

## Common Bug Sources

### Backend

| Symptom                    | Common Cause                               | Check                       |
| -------------------------- | ------------------------------------------ | --------------------------- |
| Stale data after update    | Missing `checkDiff: true` on `UpdateAsync` | Repository call parameters  |
| Event not firing           | Missing Event Handler registration         | `UseCaseEvents/` folder     |
| Cross-service data missing | Message bus consumer not waiting           | `TryWaitUntilAsync` usage   |
| Out-of-order processing    | Missing `LastMessageSyncDate` check        | Consumer idempotency        |
| N+1 queries                | Await inside loop                          | Use `GetByIdsAsync` batch   |
| Validation bypassed        | Logic in handler, not entity               | Move to `Entity.Validate()` |

### Frontend

| Symptom                | Common Cause                        | Check                     |
| ---------------------- | ----------------------------------- | ------------------------- |
| Memory leak            | Missing `untilDestroyed()`          | Subscription cleanup      |
| Stale UI               | Manual signals instead of store     | Use `PlatformVmStore`     |
| Form not validating    | Missing validators in config        | `initialFormConfig` setup |
| Component not updating | Missing `@Watch` decorator          | Replace `ngOnChanges`     |
| API errors silent      | Missing `observerLoadingErrorState` | Add error state tracking  |

## Tracing Data Flow

### Backend Flow

```
Controller → Command → Handler → ValidateRequestAsync → HandleAsync
    → Repository → Entity Events → Message Bus
```

### Frontend Flow

```
Component → Store.effect → ApiService → Backend API
    → tapResponse → updateState → Signal/Observable → Template
```

## Anti-Patterns in Debugging

- **NEVER** remove code without searching all references
- **NEVER** assume a method is unused without checking dynamic dispatch
- **NEVER** fix symptoms without finding root cause
- **NEVER** apply broad changes when targeted fix suffices

---

## 6-Phase Architectural Validation (Code Removal)

**MANDATORY when considering code removal during bug fixes. See [AI-DEBUGGING-PROTOCOL.md](.ai/docs/AI-DEBUGGING-PROTOCOL.md) for complete protocol.**

**Quick Decision:**

- Considering code removal? → Run `/investigate-removal` skill first
- Already have evidence? → Declare confidence level (90%+ required for HIGH risk)

### Validation Chain (Required for Removal Recommendations)

```
Phase 1: Static Analysis
    ↓ Find ALL references (grep searches)
Phase 2: Dynamic Analysis
    ↓ Trace injection → usage → callers
Phase 3: Cross-Module Check
    ↓ Search Platform/Backend/Frontend modules
Phase 4: Test Coverage
    ↓ Identify affected tests
Phase 5: Impact Assessment
    ↓ What breaks if removed?
Phase 6: Confidence Calculation
    ↓ Evidence completeness score
ONLY THEN → Recommend removal
```

### Evidence Requirements

| Evidence Type      | Required       | How to Get                                               |
| ------------------ | -------------- | -------------------------------------------------------- |
| Static references  | ✅             | `grep -r "TargetName" --include="*.cs" --include="*.ts"` |
| Dynamic usage      | ✅             | Read files, trace call chain with file:line              |
| Cross-module check | ✅             | Search Platform/Backend/Frontend separately              |
| Test coverage      | ✅ (HIGH risk) | Find tests that would break                              |
| Impact analysis    | ✅ (HIGH risk) | List dependent code paths                                |
| Confidence level   | ✅             | Declare percentage with evidence summary                 |

### Confidence Thresholds

| Risk Level            | Confidence Required | Example                                   |
| --------------------- | ------------------- | ----------------------------------------- |
| **HIGH** (removal)    | **90%+**            | Removing classes, registrations, methods  |
| **MEDIUM** (refactor) | **80%+**            | Changing method signatures, restructuring |
| **LOW** (rename)      | **70%+**            | Variable renames, formatting              |

**Rule:** <90% confidence for removal → Run `/investigate-removal` or gather more evidence

### Breaking Change Risk Matrix

| Risk       | Criteria                                        | Required Actions                              |
| ---------- | ----------------------------------------------- | --------------------------------------------- |
| **HIGH**   | Remove registrations, delete classes/interfaces | Complete 6-phase validation + impact analysis |
| **MEDIUM** | Refactor methods, change signatures             | Usage trace + test verification               |
| **LOW**    | Rename variables, code formatting               | Code review only                              |

### Workflow Safeguards

When working within active workflows, checkpoints will remind you:

- **Bugfix workflow:** "CHECKPOINT: If considering code removal, run /investigate-removal first"
- **Refactor workflow:** "CHECKPOINT: If removing code, run /investigate-removal first"

### EasyPlatform-Specific Searches

**Backend (C#):**

```bash
# Repository patterns
grep -r "IPlatformQueryableRootRepository<.*>" --include="*.cs"

# CQRS registrations
grep -r "AddScoped.*Handler|AddTransient.*Handler" --include="*.cs"

# Entity event handlers
grep -r "PlatformApplicationDomainEventHandler" --include="*.cs"
```

**Frontend (TypeScript):**

```bash
# Component hierarchy
grep -r "extends.*AppBase.*Component" --include="*.ts"

# Store patterns
grep -r "PlatformVmStore" --include="*.ts"

# API services
grep -r "extends PlatformApiService" --include="*.ts"
```

### Quick Reference

**Before recommending removal:**

1. Complete 6-phase validation OR run `/investigate-removal`
2. Declare confidence ≥90% with evidence
3. Document what breaks if removed
4. Reference file:line for all claims
