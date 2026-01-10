---
agent: 'agent'
description: 'Simplify and refine code for clarity, consistency, and maintainability'
tools: ['read', 'edit', 'search', 'execute']
---

# Code Simplifier

## Required Reading

**Before simplifying, read the appropriate guide:**

- **Backend (C#):** `docs/claude/backend-csharp-complete-guide.md`
- **Frontend (TS):** `docs/claude/frontend-typescript-complete-guide.md`

---

Simplify the following code while preserving all functionality:

**Target:** ${input:target}
**Scope:** ${input:scope:Recent Changes,Specific Files,Full Scan}

## Simplification Actions

| Action | Description |
|--------|-------------|
| Reduce nesting | Flatten deep if/else chains with guard clauses |
| Extract methods | Break long methods (>20 lines) into focused units |
| Simplify conditionals | Use early returns, named booleans |
| Remove duplication | Apply DRY principle, use platform patterns |
| Improve naming | Make code self-documenting |

---

## Workflow

### Step 1: Identify Targets
1. Parse target argument or find recently modified files
2. Skip generated code, migrations, vendor files
3. List files to analyze

### Step 2: Analyze Complexity
For each file, identify:
- Nesting depth > 3 levels
- Methods > 20 lines
- Duplicated code patterns
- Unclear naming

### Step 3: Apply Simplifications
Apply one refactoring at a time:
1. Guard clauses for nested conditionals
2. Extract methods for long functions
3. Named booleans for complex conditions
4. Shared methods for duplicated code
5. Descriptive names for variables/methods

### Step 4: Verify
1. Ensure no behavior changes
2. Run related tests if available
3. Confirm code still compiles

---

## Platform-Specific Patterns

### Backend (C#)

**Extract to Static Expression:**
```csharp
// Before: Inline query
.Where(e => e.CompanyId == companyId && e.Status == Status.Active)

// After: Static expression
public static Expression<Func<Entity, bool>> ActiveInCompanyExpr(string companyId)
    => e => e.CompanyId == companyId && e.Status == Status.Active;
```

**Use Fluent Helpers:**
```csharp
// Before: Multiple statements
var entity = await repo.GetByIdAsync(id, ct);
entity.Name = name;
entity.UpdatedDate = DateTime.UtcNow;

// After: Fluent chain
var entity = await repo.GetByIdAsync(id, ct)
    .Then(e => e.With(x => x.Name = name).With(x => x.UpdatedDate = DateTime.UtcNow));
```

**Move Mapping to DTO:**
```csharp
// Before: Mapping in handler
var config = new Config { ClientId = dto.ClientId };

// After: DTO owns mapping
public override Config MapToObject() => new Config { ClientId = ClientId };
```

### Frontend (TypeScript/Angular)

**Use PlatformVmStore:**
```typescript
// Before: Manual signals
employees = signal<Employee[]>([]);
loading = signal(false);

// After: Store pattern
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
    readonly employees$ = this.select(s => s.employees);
}
```

**Subscription Cleanup:**
```typescript
// Before: No cleanup
this.data$.subscribe(d => this.process(d));

// After: With cleanup
this.data$.pipe(this.untilDestroyed()).subscribe(d => this.process(d));
```

---

## Constraints

- **NEVER** change external behavior
- **NEVER** remove functionality
- **ALWAYS** preserve test coverage
- **PREFER** platform patterns over custom solutions
- **SKIP** generated code, migrations, vendor files

---

## Output Format

Provide summary:
```
## Simplification Report

### Files Modified
- `path/to/file1.cs` - 3 changes
- `path/to/file2.ts` - 2 changes

### Changes Applied
1. **file1.cs:25** - Extracted guard clause
2. **file1.cs:45** - Created `IsActiveExpr()` static expression
3. **file1.cs:78** - Renamed `x` to `employee`
4. **file2.ts:12** - Added `untilDestroyed()`
5. **file2.ts:34** - Extracted to store selector

### Metrics
- Lines: 245 → 218 (-11%)
- Max nesting: 5 → 2
- Methods > 20 lines: 3 → 0

### Remaining Opportunities
- Consider extracting `ProcessPayment` to separate service
```

---

## Checklist

- [ ] No functionality changed
- [ ] All tests still pass
- [ ] Code follows platform patterns
- [ ] No new code duplication
- [ ] Proper naming conventions
