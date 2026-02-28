---
applyTo: "**/*.cs,**/*.ts"
---

# Bug Investigation Protocol

> Auto-loads when editing code files. See `.github/AI-DEBUGGING-PROTOCOL.md` for full protocol.

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

| Symptom | Common Cause | Check |
|---------|-------------|-------|
| Stale data after update | Missing `checkDiff: true` on `UpdateAsync` | Repository call parameters |
| Event not firing | Missing Event Handler registration | `UseCaseEvents/` folder |
| Cross-service data missing | Message bus consumer not waiting | `TryWaitUntilAsync` usage |
| Out-of-order processing | Missing `LastMessageSyncDate` check | Consumer idempotency |
| N+1 queries | Await inside loop | Use `GetByIdsAsync` batch |
| Validation bypassed | Logic in handler, not entity | Move to `Entity.Validate()` |

### Frontend

| Symptom | Common Cause | Check |
|---------|-------------|-------|
| Memory leak | Missing `untilDestroyed()` | Subscription cleanup |
| Stale UI | Manual signals instead of store | Use `PlatformVmStore` |
| Form not validating | Missing validators in config | `initialFormConfig` setup |
| Component not updating | Missing `@Watch` decorator | Replace `ngOnChanges` |
| API errors silent | Missing `observerLoadingErrorState` | Add error state tracking |

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

## Investigation & Recommendation Protocol

**CRITICAL: Before recommending code removal or architectural changes:**

### Validation Chain (Required)

```
1. Interface/API identified
   ↓
2. ALL implementations found (Grep: "class.*:.*IInterfaceName")
   ↓
3. ALL registrations traced (Grep: "AddScoped|AddSingleton|AddTransient")
   ↓
4. ALL usage sites verified (Grep + Read actual usage)
   ↓
5. Cross-service impact: Check ALL 5 services
   ↓
6. Impact assessment: What breaks if removed?
   ↓
7. Confidence declaration: X% confident based on [evidence]
   ↓
ONLY THEN → Output recommendation
```

### Evidence Requirements

| Evidence Type | Required | How to Get |
|--------------|----------|------------|
| Static references | ✅ | `grep -r "TargetName" --include="*.cs"` |
| Dynamic usage | ✅ | Read files, trace call chain |
| Cross-service check | ✅ | Search ALL 5 services |
| Confidence level | ✅ | Declare X% with reasoning |
| Impact analysis | ✅ (HIGH risk) | List what breaks |

### Confidence Levels

- **95-100%** — Full trace, all services checked → Safe to recommend
- **80-94%** — Main paths verified → Proceed with caution
- **60-79%** — Partial trace → Gather more evidence
- **<60%** — Insufficient → DO NOT recommend

### Cross-Service Validation (MANDATORY)

**Always check ALL 5 microservices:**
- bravoGROWTH
- bravoTALENTS
- bravoSURVEYS
- Accounts
- bravoINSIGHTS

```bash
for svc in bravoGROWTH bravoTALENTS bravoSURVEYS Accounts bravoINSIGHTS; do
    grep -r "TargetName" "src/Services/$svc" --include="*.cs"
done
```

### Breaking Change Risk Matrix

| Risk | Criteria | Required Evidence |
|------|----------|-------------------|
| **HIGH** | Remove registrations, delete classes, change interfaces | Full usage trace + impact analysis + all 5 services |
| **MEDIUM** | Refactor methods, change signatures | Usage trace + test verification + all 5 services |
| **LOW** | Rename variables, formatting | Code review only |
