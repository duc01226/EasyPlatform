---
agent: 'agent'
description: 'Debug and diagnose issues following systematic investigation protocol'
tools: ['read', 'edit', 'search', 'execute']
---

# Debug Issue

Diagnose and fix the following issue:

**Issue Description:** ${input:issue}
**Error Message/Stack Trace:** ${input:error}
**Affected Area:** ${input:area:Backend,Frontend,Cross-Service,Database,API}

## Debugging Protocol

### CRITICAL RULES
- NEVER assume based on first glance
- ALWAYS verify with multiple search patterns
- CHECK both static AND dynamic code usage
- READ actual implementation, not just interfaces
- TRACE full dependency chains
- DECLARE confidence level and uncertainties

---

## Step 1: Evidence Collection

### Search Patterns
```
1. Search for error message text
2. Search for class/method names in stack trace
3. Search for related entity/feature names
4. Search for configuration patterns
```

### Questions to Answer
- [ ] Where does the error originate?
- [ ] What is the full call chain?
- [ ] What are the input values?
- [ ] When did this start happening?
- [ ] Is this reproducible?

---

## Step 2: Root Cause Analysis

### Common EasyPlatform Issues

#### Backend Issues

**Validation Failures**
```csharp
// Check: Validation chain in Command.Validate()
// Check: Async validation in Handler.ValidateRequestAsync()
// Check: Entity validation methods
```

**Repository/Query Issues**
```csharp
// Check: Expression composition (AndAlso, OrElse)
// Check: Eager loading (N+1 queries)
// Check: Null reference in navigation properties
```

**Cross-Service Communication**
```csharp
// Check: Message bus consumer HandleWhen() filter
// Check: TryWaitUntilAsync() timeout for dependencies
// Check: LastMessageSyncDate for race conditions
```

**Entity Event Handler Issues**
```csharp
// Check: HandleWhen() is public override async Task<bool>
// Check: Single generic parameter on base class
// Check: Correct CrudAction filter
```

#### Frontend Issues

**State Management**
```typescript
// Check: Store initialization in providers array
// Check: Effect subscription management
// Check: Signal updates triggering change detection
```

**API Calls**
```typescript
// Check: observerLoadingErrorState() usage
// Check: untilDestroyed() for subscription cleanup
// Check: Error handling in tapResponse()
```

**Form Validation**
```typescript
// Check: Async validator conditions (ifAsyncValidator)
// Check: Dependent validations configuration
// Check: Form control initialization timing
```

---

## Step 3: Fix Implementation

### Before Fixing
- [ ] Confirmed root cause with evidence
- [ ] Understood full impact of change
- [ ] Checked for similar issues elsewhere
- [ ] Identified appropriate pattern to follow

### Fix Checklist
- [ ] Fix addresses root cause, not symptom
- [ ] No regression introduced
- [ ] Follows platform patterns
- [ ] Error handling added if needed
- [ ] Logging added for future debugging

---

## Step 4: Verification

### Testing
- [ ] Issue no longer reproducible
- [ ] Related functionality works
- [ ] Edge cases handled
- [ ] Unit tests pass

### Documentation
- [ ] Root cause documented
- [ ] Fix approach explained
- [ ] Prevention measures noted

---

## Confidence Declaration

After investigation, declare:
- **Confidence Level:** [0-100%]
- **Evidence Found:** [List key evidence]
- **Uncertainties:** [List remaining unknowns]
- **Recommendation:** [Proceed / Need more investigation / Ask user]

If confidence < 90%, request user confirmation before making changes.
