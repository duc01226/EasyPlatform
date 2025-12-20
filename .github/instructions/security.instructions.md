---
applyTo: "**/auth/**,**/security/**,**/*Auth*.cs,**/*Permission*.cs,**/*Authorization*.cs,**/Controllers/**"
---

# Security and Authorization Patterns

## Controller-Level Authorization

```csharp
// Single role
[PlatformAuthorize(PlatformRoles.Admin)]
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(string id)
    => Ok(await Cqrs.SendAsync(new DeleteCommand { Id = id }));

// Multiple roles (any of)
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));

// Public endpoint (no authorization)
[AllowAnonymous]
[HttpGet("public")]
public async Task<IActionResult> GetPublicData()
    => Ok(await Cqrs.SendAsync(new GetPublicDataQuery()));
```

## Handler-Level Validation

```csharp
internal sealed class SaveEmployeeCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveEmployeeCommand> validation,
        CancellationToken ct)
    {
        return await validation
            // Role-based validation
            .AndNotAsync(
                _ => !RequestContext.HasRole(PlatformRoles.Admin),
                "Only administrators can perform this action")

            // Company ownership validation
            .AndAsync(
                async req => await repository.AnyAsync(
                    e => e.Id == req.Id && e.CompanyId == RequestContext.CurrentCompanyId(),
                    ct),
                "You can only modify employees in your company")

            // User ownership validation
            .AndAsync(
                async req => RequestContext.HasRole(PlatformRoles.Admin) ||
                    await repository.AnyAsync(
                        e => e.Id == req.Id && e.CreatedBy == RequestContext.UserId(),
                        ct),
                "You can only modify your own records or be an administrator");
    }

    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand req,
        CancellationToken ct)
    {
        // Validation already ensures user has access
        var entity = await repository.GetByIdAsync(req.Id, ct);

        // Set audit fields
        entity.UpdatedBy = RequestContext.UserId();
        entity.UpdatedDate = Clock.UtcNow;

        var saved = await repository.UpdateAsync(entity, ct);
        return new SaveEmployeeCommandResult { Data = new EmployeeDto(saved) };
    }
}
```

## Entity-Level Access Control

```csharp
public sealed class Employee : RootEntity<Employee, string>
{
    // User can access if:
    // 1. They are the owner (UserId matches)
    // 2. They are in same company AND record is public
    public static Expression<Func<Employee, bool>> UserCanAccessExpr(
        string userId,
        string companyId)
        => e => e.UserId == userId
            || (e.CompanyId == companyId && e.IsPublic);

    // Admin in same company
    public static Expression<Func<Employee, bool>> AdminCanAccessExpr(string companyId)
        => e => e.CompanyId == companyId;

    // Manager can access their department only
    public static Expression<Func<Employee, bool>> ManagerCanAccessExpr(
        string userId,
        string companyId,
        string departmentId)
        => e => e.CompanyId == companyId && e.DepartmentId == departmentId;

    // Combined access control
    public static Expression<Func<Employee, bool>> GetAccessExprForUser(
        string userId,
        string companyId,
        List<string> roles,
        string? departmentId = null)
    {
        if (roles.Contains(PlatformRoles.Admin))
            return AdminCanAccessExpr(companyId);

        if (roles.Contains(PlatformRoles.Manager) && departmentId != null)
            return ManagerCanAccessExpr(userId, companyId, departmentId);

        return UserCanAccessExpr(userId, companyId);
    }
}

// Usage in query handler
protected override async Task<GetEmployeeListQueryResult> HandleAsync(
    GetEmployeeListQuery req,
    CancellationToken ct)
{
    var accessExpr = Employee.GetAccessExprForUser(
        RequestContext.UserId(),
        RequestContext.CurrentCompanyId(),
        RequestContext.UserRoles(),
        RequestContext.DepartmentId());

    var employees = await repository.GetAllAsync(
        Employee.IsActiveExpr().AndAlso(accessExpr),
        ct);

    return new GetEmployeeListQueryResult(employees);
}
```

## Request Context Usage

```csharp
// Current user information
var userId = RequestContext.UserId();
var companyId = RequestContext.CurrentCompanyId();
var roles = RequestContext.UserRoles();
var productScope = RequestContext.ProductScope();

// Get current employee entity
var currentEmployee = await RequestContext.CurrentEmployee();

// Role checks
if (RequestContext.HasRole(PlatformRoles.Admin))
{
    // Admin-specific logic
}

if (RequestContext.HasRequestAdminRoleInCompany())
{
    // Company admin logic
}

// Set audit fields in command handler
entity.CreatedBy = RequestContext.UserId();
entity.CreatedDate = Clock.UtcNow;
entity.CompanyId = RequestContext.CurrentCompanyId();
```

## Domain Service Pattern (Permission Strategy)

**Use when permission logic is complex and varies by role.**

```csharp
// Strategy interface
public interface IRoleBasedPermissionCheckHandler
{
    Expression<Func<Employee, bool>> GetAccessExpr(string userId, string companyId);
}

// Admin strategy
public class AdminPermissionHandler : IRoleBasedPermissionCheckHandler
{
    public Expression<Func<Employee, bool>> GetAccessExpr(string userId, string companyId)
        => e => e.CompanyId == companyId;  // Can access all in company
}

// Manager strategy
public class ManagerPermissionHandler : IRoleBasedPermissionCheckHandler
{
    private readonly IPlatformQueryableRootRepository<Employee, string> employeeRepo;

    public Expression<Func<Employee, bool>> GetAccessExpr(string userId, string companyId)
        => e => e.CompanyId == companyId && e.ManagerId == userId;  // Can access direct reports
}

// User strategy
public class UserPermissionHandler : IRoleBasedPermissionCheckHandler
{
    public Expression<Func<Employee, bool>> GetAccessExpr(string userId, string companyId)
        => e => e.UserId == userId;  // Can only access own record
}

// Service that coordinates strategies
public static class EmployeePermissionService
{
    private static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = new()
    {
        [PlatformRoles.Admin] = new AdminPermissionHandler(),
        [PlatformRoles.Manager] = new ManagerPermissionHandler(),
        [PlatformRoles.User] = new UserPermissionHandler()
    };

    public static Expression<Func<Employee, bool>> GetAccessExprForRoles(
        IList<string> roles,
        string userId,
        string companyId)
    {
        // Combine all role permissions with OR (any role grants access)
        return roles.Aggregate(
            (Expression<Func<Employee, bool>>)(e => false),
            (expr, role) => RoleHandlers.ContainsKey(role)
                ? expr.OrElse(RoleHandlers[role].GetAccessExpr(userId, companyId))
                : expr);
    }
}

// Usage in handler
var accessExpr = EmployeePermissionService.GetAccessExprForRoles(
    RequestContext.UserRoles(),
    RequestContext.UserId(),
    RequestContext.CurrentCompanyId());

var employees = await repository.GetAllAsync(accessExpr, ct);
```

## Input Validation (OWASP Top 10)

```csharp
public sealed class SaveEmployeeCommand : PlatformCqrsCommand<SaveEmployeeCommandResult>
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Website { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            // Required fields
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required")
            .And(_ => Email.IsNotNullOrEmpty(), "Email is required")

            // Format validation
            .And(_ => Email.Contains("@") && Email.Contains("."), "Invalid email format")
            .And(_ => Name.Length >= 2 && Name.Length <= 200, "Name must be 2-200 characters")

            // XSS prevention (no HTML tags)
            .And(_ => !Name.Contains("<") && !Name.Contains(">"), "Name cannot contain HTML")

            // URL validation
            .AndIf(
                _ => Website.IsNotNullOrEmpty(),
                _ => Uri.TryCreate(Website, UriKind.Absolute, out _),
                "Invalid website URL");
    }
}
```

## SQL Injection Prevention

**Platform repositories use parameterized queries automatically - no manual SQL needed.**

```csharp
// ✅ CORRECT: Platform repository (parameterized automatically)
var employees = await repository.GetAllAsync(
    e => e.Name == searchName && e.CompanyId == companyId,
    ct);

// ✅ CORRECT: Static expressions (safe)
var employees = await repository.GetAllAsync(
    Employee.UniqueExpr(companyId, code),
    ct);

// ❌ WRONG: Raw SQL (vulnerable to SQL injection)
var sql = $"SELECT * FROM Employees WHERE Name = '{searchName}'";
var employees = await dbContext.Employees.FromSqlRaw(sql).ToListAsync();

// ✅ IF RAW SQL NEEDED: Use parameterized
var employees = await dbContext.Employees
    .FromSqlInterpolated($"SELECT * FROM Employees WHERE Name = {searchName}")
    .ToListAsync();
```

## Sensitive Data Protection

```csharp
// Encryption service for sensitive fields
public sealed class Employee : RootEntity<Employee, string>
{
    public string Name { get; set; } = "";

    // Store encrypted, never log
    [JsonIgnore]  // Never serialize in logs
    public string? EncryptedSocialSecurityNumber { get; set; }

    // Not stored in DB (computed for API response only)
    [NotMapped]
    public string? SocialSecurityNumberLastFour
    {
        get => EncryptedSocialSecurityNumber?.Substring(Math.Max(0, EncryptedSocialSecurityNumber.Length - 4));
        set { }
    }
}

// Handler encrypts before saving
internal sealed class SaveEmployeeCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    private readonly IEncryptionService encryptionService;

    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand req,
        CancellationToken ct)
    {
        var entity = req.MapToNewEntity();

        // Encrypt sensitive data before saving
        if (req.SocialSecurityNumber.IsNotNullOrEmpty())
        {
            entity.EncryptedSocialSecurityNumber = encryptionService.Encrypt(req.SocialSecurityNumber);
        }

        var saved = await repository.CreateAsync(entity, ct);

        // Don't return decrypted sensitive data
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}
```

## Frontend Authorization (Angular)

```typescript
// Component guards
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    // Check single role
    get canEdit() {
        return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager);
    }

    // Check ownership
    get canDelete() {
        return this.hasRole(PlatformRoles.Admin) ||
            (this.currentVm().createdBy === this.currentUserId());
    }

    // Company ownership
    get isOwnCompany() {
        return this.currentVm().companyId === this.currentCompanyId();
    }
}

// Template conditional rendering
@if (hasRole(PlatformRoles.Admin)) {
    <button (click)="delete()">Delete</button>
}

@if (canEdit) {
    <input [(ngModel)]="vm.name" />
} @else {
    <span>{{ vm.name }}</span>
}

// Route guard
export class AdminGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    canActivate(): Observable<boolean> {
        return this.authService.hasRole$(PlatformRoles.Admin);
    }
}
```

## Secrets Management

```csharp
// ❌ NEVER hardcode secrets
private const string ApiKey = "secret123";  // WRONG!

// ✅ Use configuration with environment variables
public class MyService
{
    private readonly string apiKey;

    public MyService(IConfiguration configuration)
    {
        apiKey = configuration["ExternalApi:ApiKey"]
            ?? throw new InvalidOperationException("ExternalApi:ApiKey not configured");
    }
}

// appsettings.json (not committed)
{
    "ExternalApi": {
        "ApiKey": "use-environment-variable"
    }
}

// Environment variable in production
// ExternalApi__ApiKey=actual-secret-key
```

## Anti-Patterns

```csharp
// ❌ WRONG: Only controller-level auth (client can bypass)
[PlatformAuthorize(PlatformRoles.Admin)]
public async Task<IActionResult> Delete(string id) { }
// Handler has no validation - if someone calls handler directly, auth is bypassed!

// ✅ CORRECT: Controller + Handler validation
[PlatformAuthorize(PlatformRoles.Admin)]
public async Task<IActionResult> Delete(string id) { }
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only");

// ❌ WRONG: Trusting client data without validation
entity.CompanyId = req.CompanyId;  // Client controls company access!

// ✅ CORRECT: Use server context
entity.CompanyId = RequestContext.CurrentCompanyId();

// ❌ WRONG: Returning sensitive data in API
return new EmployeeDto { SSN = employee.SocialSecurityNumber };

// ✅ CORRECT: Mask or exclude sensitive data
return new EmployeeDto { SSNLastFour = employee.SocialSecurityNumberLastFour };

// ❌ WRONG: Role check in every handler (duplication)
if (!RequestContext.HasRole(PlatformRoles.Admin)) throw new Exception("Admin only");

// ✅ CORRECT: Entity expression + validation pattern
.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
```

## OWASP Top 10 Checklist

- [ ] **A01: Broken Access Control** - Use entity-level access expressions + handler validation
- [ ] **A02: Cryptographic Failures** - Encrypt sensitive data, use HTTPS, secure configuration
- [ ] **A03: Injection** - Use platform repositories (parameterized queries), validate input
- [ ] **A04: Insecure Design** - Implement permission strategy pattern, defense in depth
- [ ] **A05: Security Misconfiguration** - No default credentials, disable debug in production
- [ ] **A06: Vulnerable Components** - Keep NuGet packages updated
- [ ] **A07: Authentication Failures** - Use platform authentication, enforce strong passwords
- [ ] **A08: Software/Data Integrity** - Verify package integrity, use signed deployments
- [ ] **A09: Logging Failures** - Log security events, never log sensitive data
- [ ] **A10: Server-Side Request Forgery** - Validate external URLs, whitelist allowed domains
