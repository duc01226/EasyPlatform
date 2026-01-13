---
description: "Bug investigation with root cause analysis and systematic debugging"
---

# Bug Diagnosis Prompt

## Overview

This prompt guides systematic bug investigation and resolution in EasyPlatform, using root cause analysis and evidence-based debugging.

## Bug Investigation Workflow

```
1. Triage → 2. Reproduce → 3. Isolate → 4. Analyze → 5. Fix → 6. Verify → 7. Prevent
```

## Step 1: Bug Triage

### Gather Information

**Collect all available details:**
```markdown
## Bug Report Template

### Description
[Clear description of unexpected behavior]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Observe error]

### Environment
- Browser/OS: [Chrome 120 on Windows 11]
- Backend: [.NET 9, MongoDB 7.0]
- User role: [Admin/Manager/Employee]
- Company ID: [abc123]

### Error Messages
[Exact error text, stack traces, console logs]

### Screenshots/Videos
[Attach if available]

### Frequency
[Always / Sometimes / Once]

### Impact
[Critical / High / Medium / Low]
```

### Severity Classification

**Determine priority:**

**Critical (P0):**
- Production down
- Data loss/corruption
- Security vulnerability
- Payment processing broken

**High (P1):**
- Major feature broken
- Affects all users
- No workaround available

**Medium (P2):**
- Feature partially broken
- Affects some users
- Workaround exists

**Low (P3):**
- Minor UI issue
- Edge case
- Cosmetic problem

## Step 2: Reproduction

### Create Minimal Reproduction

**Simplify to smallest failing case:**
```typescript
// ❌ Complex reproduction (hard to debug)
Test: "Complete employee onboarding flow fails"
Steps: 25 steps involving multiple forms, uploads, approvals

// ✅ Minimal reproduction (easy to debug)
Test: "Employee save fails when department is null"
Steps:
1. Create employee with name "Test"
2. Set department to null
3. Click save
Expected: Validation error "Department required"
Actual: 500 Internal Server Error
```

### Reproduction Checklist

- [ ] Can reproduce consistently (100% of time)
- [ ] Identified minimum steps to trigger bug
- [ ] Isolated from other features/data
- [ ] Documented exact input values that fail
- [ ] Captured error messages/stack traces
- [ ] Verified reproduction in clean environment

### Unable to Reproduce?

**If cannot reproduce:**
1. Request more details from reporter
2. Check environment differences (dev vs prod)
3. Review recent deployments/changes
4. Check for data-specific issues
5. Review logs for similar errors

## Step 3: Isolation

### Identify Bug Location

**Use divide-and-conquer approach:**

**Frontend vs Backend?**
```bash
# Check browser console
F12 → Console tab
- JavaScript errors = Frontend issue
- HTTP 4xx/5xx = Backend issue (likely)

# Check network tab
F12 → Network tab → Failed request → Response
- 400 Bad Request = Frontend sending invalid data
- 401/403 = Authorization issue
- 500 Internal Server Error = Backend crash
- 504 Gateway Timeout = Backend performance issue
```

**Which Layer?**

Backend layers (outside-in debugging):
1. **Controller** - Check if endpoint reached
2. **Handler** - Check if validation passes
3. **Repository** - Check if query executes
4. **Database** - Check if data exists

Frontend layers (outside-in debugging):
1. **Component** - Check if method called
2. **Store** - Check if state updates
3. **API Service** - Check if request sent
4. **HTTP** - Check if response received

### Add Strategic Logging

**Backend logging:**
```csharp
protected override async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand req, CancellationToken ct)
{
    logger.LogInformation("Handling SaveEmployeeCommand for ID: {Id}", req.Id);

    var employee = await repo.GetByIdAsync(req.Id, ct);
    logger.LogInformation("Employee found: {Found}, Name: {Name}", employee != null, employee?.Name);

    employee.Name = req.Name;
    logger.LogInformation("Saving employee with updated name: {Name}", employee.Name);

    var saved = await repo.CreateOrUpdateAsync(employee, ct);
    logger.LogInformation("Employee saved successfully, ID: {Id}", saved.Id);

    return new SaveEmployeeCommandResult { Id = saved.Id };
}
```

**Frontend logging:**
```typescript
save() {
    console.log('Save clicked, form valid:', this.form.valid);
    console.log('Form value:', this.form.value);

    this.api.save(this.form.value)
        .pipe(
            tap(result => console.log('Save successful:', result)),
            catchError(error => {
                console.error('Save failed:', error);
                return throwError(() => error);
            }),
            this.untilDestroyed()
        )
        .subscribe();
}
```

### Use Debugger

**Backend (Visual Studio / Rider):**
```csharp
// Set breakpoint on line
protected override async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand req, CancellationToken ct)
{
    var employee = await repo.GetByIdAsync(req.Id, ct); // ← Breakpoint here
    // Inspect req, employee variables
}
```

**Frontend (Chrome DevTools):**
```typescript
save() {
    debugger; // Execution pauses here
    const formValue = this.form.value;
    this.api.save(formValue).subscribe();
}
```

## Step 4: Root Cause Analysis

### Use 5 Whys Technique

**Example:**
```
Bug: Employee save fails with 500 error

Why? → Handler throws NullReferenceException
Why? → employee.Department is null
Why? → GetByIdAsync doesn't load Department navigation property
Why? → LoadRelatedEntities parameter not specified
Why? → Developer unaware of explicit loading requirement

Root cause: Missing documentation/pattern for eager loading
```

### Analyze Stack Trace

**Backend stack trace analysis:**
```
System.NullReferenceException: Object reference not set to an instance of an object.
   at PlatformExampleApp.Application.SaveEmployeeCommandHandler.HandleAsync(SaveEmployeeCommand req, CancellationToken ct) in SaveEmployeeCommand.cs:line 42
   at PlatformExampleApp.Application.PlatformCqrsCommandApplicationHandler.Handle(SaveEmployeeCommand req) in PlatformCqrsCommandApplicationHandler.cs:line 28
   at Microsoft.AspNetCore.Mvc.ControllerBase.InvokeAsync() in ControllerBase.cs:line 156

Key information:
- Error type: NullReferenceException
- Location: SaveEmployeeCommandHandler.cs:line 42
- Method: HandleAsync
- Call chain: Controller → Handler → HandleAsync
```

**Read stack trace bottom-to-top for call flow, top-to-bottom for error location.**

### Common Bug Patterns

**Pattern 1: Null Reference**
```csharp
// ❌ Bug
var departmentName = employee.Department.Name; // Department is null

// ✅ Fix
var departmentName = employee.Department?.Name ?? "Unknown";
```

**Pattern 2: Async/Await Missing**
```csharp
// ❌ Bug - Blocks thread
var employee = repo.GetByIdAsync(id, ct).Result;

// ✅ Fix
var employee = await repo.GetByIdAsync(id, ct);
```

**Pattern 3: Race Condition**
```csharp
// ❌ Bug - Not thread-safe
if (!_cache.ContainsKey(key))
{
    _cache[key] = await LoadDataAsync(key);
}

// ✅ Fix - Use ConcurrentDictionary or lock
await _semaphore.WaitAsync();
try
{
    if (!_cache.ContainsKey(key))
        _cache[key] = await LoadDataAsync(key);
}
finally
{
    _semaphore.Release();
}
```

**Pattern 4: Memory Leak**
```typescript
// ❌ Bug - Subscription not cleaned up
ngOnInit() {
    this.data$.subscribe(d => this.data = d);
}

// ✅ Fix
ngOnInit() {
    this.data$.pipe(this.untilDestroyed()).subscribe(d => this.data = d);
}
```

**Pattern 5: N+1 Query**
```csharp
// ❌ Bug
var employees = await repo.GetAllAsync(e => e.IsActive, ct);
foreach (var emp in employees)
{
    emp.Department = await deptRepo.GetByIdAsync(emp.DepartmentId, ct); // N queries!
}

// ✅ Fix
var employees = await repo.GetAllAsync(e => e.IsActive, ct, e => e.Department);
```

**Pattern 6: Validation Not Enforced**
```csharp
// ❌ Bug - Only frontend validation
// Frontend
if (this.form.valid) { this.api.save(this.form.value).subscribe(); }

// Backend - No validation!
protected override async Task<Result> HandleAsync(Cmd req, CancellationToken ct)
{
    await repo.CreateAsync(new Entity { Name = req.Name }, ct);
}

// ✅ Fix - Backend validation required
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
```

## Step 5: Fix Implementation

### Fix Types

**Type 1: Quick Fix (Low Risk)**
- Typo correction
- Missing null check
- Validation message update
- CSS adjustment

**Type 2: Standard Fix (Medium Risk)**
- Logic correction
- Query optimization
- Validation addition
- Component refactoring

**Type 3: Complex Fix (High Risk)**
- Architecture change
- Database migration
- Breaking API change
- Cross-service coordination

### Fix Implementation Guidelines

**1. Write Failing Test First**
```csharp
[Fact]
public async Task Handle_ShouldThrowValidationError_WhenDepartmentNull()
{
    var cmd = new SaveEmployeeCommand { Id = "123", Name = "Test", DepartmentId = null };

    var ex = await Assert.ThrowsAsync<PlatformValidationException>(
        () => Cqrs.SendAsync(cmd));

    Assert.Contains("Department required", ex.Message);
}
```

**2. Implement Minimal Fix**
```csharp
// ❌ Wrong - Over-engineering
protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(...)
{
    if (req.DepartmentId == null)
    {
        var defaultDept = await GetOrCreateDefaultDepartmentAsync(ct);
        req.DepartmentId = defaultDept.Id;
    }
    // Complex logic to handle missing department...
}

// ✅ Correct - Minimal fix
protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(...)
    => await v.And(_ => _.DepartmentId.IsNotNullOrEmpty(), "Department required");
```

**3. Verify Test Passes**
```bash
dotnet test --filter "FullyQualifiedName~SaveEmployeeCommand"
```

**4. Manual Testing**
- Test happy path
- Test edge cases
- Test error scenarios

### Fix Verification Checklist

- [ ] Root cause addressed (not symptom)
- [ ] Test added to prevent regression
- [ ] No new bugs introduced
- [ ] Performance not degraded
- [ ] Code follows platform patterns
- [ ] Documentation updated if needed

## Step 6: Verification

### Test Matrix

**Create comprehensive test scenarios:**
```markdown
## Test Scenarios for Employee Save Fix

| Scenario | Input | Expected | Status |
|----------|-------|----------|--------|
| Valid employee | Name: "John", Dept: "IT" | Success | ✅ Pass |
| Missing name | Name: "", Dept: "IT" | Validation error | ✅ Pass |
| Missing department | Name: "John", Dept: null | Validation error | ✅ Pass |
| Invalid department | Name: "John", Dept: "999" | Validation error | ✅ Pass |
| Duplicate email | Email: existing@test.com | Validation error | ✅ Pass |
| Unauthorized user | Different company | 403 Forbidden | ✅ Pass |
| Update existing | ID: "123", Name: "Updated" | Success | ✅ Pass |
```

### Regression Testing

**Ensure fix doesn't break existing functionality:**
```bash
# Run full test suite
dotnet test

# Run related feature tests
dotnet test --filter "FullyQualifiedName~Employee"

# Run integration tests
dotnet test --filter "Category=Integration"
```

### Performance Testing

**Verify fix doesn't degrade performance:**
```csharp
[Fact]
public async Task Handle_ShouldCompleteWithin500ms_WhenSavingEmployee()
{
    var sw = Stopwatch.StartNew();
    var result = await Cqrs.SendAsync(new SaveEmployeeCommand { Name = "Test" });
    sw.Stop();

    Assert.True(sw.ElapsedMilliseconds < 500, $"Took {sw.ElapsedMilliseconds}ms");
}
```

## Step 7: Prevention

### Add Safeguards

**1. Validation**
```csharp
// Add comprehensive validation to prevent similar bugs
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Name.Length <= 100, "Name too long")
        .And(_ => DepartmentId.IsNotNullOrEmpty(), "Department required");
```

**2. Null Safety**
```csharp
// Use null-coalescing and null-conditional operators
var departmentName = employee.Department?.Name ?? "Unknown";
var managerEmail = employee.Department?.Manager?.Email;
```

**3. Documentation**
```csharp
/// <summary>
/// Gets employee by ID with department and manager relationships loaded.
/// </summary>
/// <param name="id">Employee ID</param>
/// <param name="ct">Cancellation token</param>
/// <returns>Employee with relationships loaded</returns>
/// <exception cref="PlatformNotFoundException">Employee not found</exception>
public static async Task<Employee> GetByIdWithRelationsAsync(
    this IPlatformQueryableRootRepository<Employee, string> repo,
    string id,
    CancellationToken ct = default)
{
    return await repo.GetByIdAsync(id, ct, e => e.Department, e => e.Department!.Manager)
        .EnsureFound($"Employee {id} not found");
}
```

### Root Cause Categories

**Track patterns to prevent future bugs:**

**Category 1: Missing Validation**
- Solution: Validation checklist in PR template
- Prevention: Code review focus on validation

**Category 2: Null Reference**
- Solution: Enable nullable reference types (C# 8+)
- Prevention: Use null-conditional operators

**Category 3: Async Issues**
- Solution: Async/await guidelines in docs
- Prevention: Code analyzer rules

**Category 4: Performance**
- Solution: Performance testing in CI/CD
- Prevention: Query review process

**Category 5: Authorization**
- Solution: Security checklist
- Prevention: Automated security scans

### Update Documentation

**Document known issues and solutions:**
```markdown
## Common Issues

### Employee Save Fails with 500 Error

**Cause:** Department navigation property not loaded

**Solution:**
```csharp
var employee = await repo.GetByIdAsync(id, ct, e => e.Department);
```

**Prevention:** Always specify loadRelatedEntities when accessing navigation properties
```

### Create Regression Test

**Add test to prevent bug recurrence:**
```csharp
public class EmployeeBugRegressionTests
{
    [Fact]
    public async Task Bug_123_EmployeeSave_ShouldNotFail_WhenDepartmentNull()
    {
        // Regression test for bug #123
        var cmd = new SaveEmployeeCommand { Name = "Test", DepartmentId = null };

        var ex = await Assert.ThrowsAsync<PlatformValidationException>(
            () => Cqrs.SendAsync(cmd));

        Assert.Contains("Department required", ex.Message);
    }
}
```

## Debugging Tools

### Backend Tools

**1. Logging**
```csharp
logger.LogDebug("Debug details: {Details}", details);
logger.LogInformation("Operation succeeded: {Result}", result);
logger.LogWarning("Validation failed: {Errors}", errors);
logger.LogError(ex, "Operation failed: {Message}", ex.Message);
```

**2. Unit of Work Inspection**
```csharp
using var uow = UnitOfWorkManager.Begin();
var employee = await repo.GetByIdAsync(id, ct);
logger.LogInformation("Entity state: {State}", uow.Entry(employee).State);
await uow.CompleteAsync();
```

**3. SQL Profiling (EF Core)**
```csharp
// Enable sensitive data logging (dev only)
optionsBuilder.EnableSensitiveDataLogging()
              .LogTo(Console.WriteLine, LogLevel.Information);
```

**4. Memory Profiling**
```bash
dotnet-counters monitor --process-id <PID>
dotnet-dump collect --process-id <PID>
```

### Frontend Tools

**1. Chrome DevTools**
- Console: Errors and logs
- Network: API calls and responses
- Sources: Breakpoint debugging
- Performance: Runtime analysis
- Memory: Heap snapshots

**2. Angular DevTools**
- Component tree inspection
- Change detection profiling
- Injector hierarchy

**3. Redux DevTools (for stores)**
- State inspection
- Action replay
- Time-travel debugging

## Common Bug Scenarios

### Scenario 1: 500 Internal Server Error

**Investigation:**
```
1. Check backend logs for exception
2. Check stack trace for error location
3. Add logging around suspected code
4. Reproduce with debugger attached
5. Identify null reference or validation issue
```

### Scenario 2: Authorization Fails Unexpectedly

**Investigation:**
```
1. Check RequestContext.CurrentCompanyId()
2. Verify user roles in RequestContext
3. Check entity ownership filters
4. Review authorization attribute on controller
5. Review handler-level validation
```

### Scenario 3: Data Not Displaying

**Investigation:**
```
1. Check network tab for successful API response
2. Verify response data structure
3. Check store state updates
4. Verify component subscription
5. Check template binding syntax
6. Verify change detection triggered
```

### Scenario 4: Performance Degradation

**Investigation:**
```
1. Check for N+1 queries (add logging)
2. Review pagination implementation
3. Check for missing indexes
4. Profile database query execution time
5. Check for memory leaks
6. Review change detection strategy
```

## Bug Report Template (Filled Example)

```markdown
## Bug #456: Employee Save Returns 500 Error

### Description
When saving an employee without a department, the API returns 500 Internal Server Error instead of validation error.

### Expected Behavior
Should return 400 Bad Request with validation message "Department required"

### Actual Behavior
Returns 500 Internal Server Error with stack trace

### Steps to Reproduce
1. Navigate to /employees/new
2. Enter name "John Doe"
3. Leave department dropdown empty
4. Click Save
5. Observe error

### Environment
- Browser: Chrome 120 on Windows 11
- Backend: .NET 9, MongoDB 7.0
- User role: Admin
- Company ID: 01HQVCXYZ123

### Error Messages
```
System.NullReferenceException: Object reference not set to an instance of an object.
   at SaveEmployeeCommandHandler.HandleAsync(SaveEmployeeCommand req, CancellationToken ct) in SaveEmployeeCommand.cs:line 42
```

### Root Cause
Handler attempts to access `employee.Department.Name` without null check, and Department is null when not loaded.

### Fix
Added validation:
```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate().And(_ => DepartmentId.IsNotNullOrEmpty(), "Department required");
```

### Verification
- [x] Test added
- [x] Manual testing passed
- [x] Regression test passed
- [x] Code review completed

### Prevention
Updated coding guidelines to always validate required foreign keys.
```

## References

- [.github/AI-DEBUGGING-PROTOCOL.md](../.github/AI-DEBUGGING-PROTOCOL.md)
- [docs/claude/troubleshooting.md](../../docs/claude/troubleshooting.md)
- [docs/claude/advanced-patterns.md](../../docs/claude/advanced-patterns.md)
