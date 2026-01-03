---
applyTo: "src/PlatformExampleApp/**/*.cs,src/PlatformExampleAppWeb/**/*.ts,src/PlatformExampleAppWeb/**/*.ts"
excludeAgent: ["copilot-code-review"]
description: "Security patterns and best practices for EasyPlatform"
---

# Security Patterns for EasyPlatform

## Backend Security

### Authentication & Authorization

#### Controller Level
```csharp
// Apply authorization at controller or action level
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> SaveEmployee([FromBody] SaveEmployeeCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));
```

#### Handler Level Validation
```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(
    PlatformValidationResult<T> validation, CancellationToken ct)
{
    return await validation
        // Role-based access
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin access required")
        // Company isolation
        .AndAsync(_ => repository.AnyAsync(
            e => e.CompanyId == RequestContext.CurrentCompanyId()),
            "Access denied to this company's data");
}
```

### Tenant Isolation (CRITICAL)

**Always filter by company context:**
```csharp
// ✅ CORRECT: Use RequestContext for tenant isolation
var employees = await repository.GetAllAsync(
    Employee.OfCompanyExpr(RequestContext.CurrentCompanyId())
        .AndAlso(Employee.ActiveExpr()),
    cancellationToken);

// ❌ WRONG: No tenant isolation
var employees = await repository.GetAllAsync(
    Employee.ActiveExpr(),
    cancellationToken);
```

### Entity-Level Access Control
```csharp
// Define access expressions in entity
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Use in queries
var expr = Employee.OfCompanyExpr(companyId)
    .AndAlso(Employee.UserCanAccessExpr(userId, companyId));
```

### Input Validation

**Validate at boundaries:**
```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        // Required fields
        .And(_ => !string.IsNullOrWhiteSpace(Email), "Email is required")
        // Format validation
        .And(_ => Email.IsValidEmail(), "Invalid email format")
        // Length limits
        .And(_ => Name.Length <= 200, "Name exceeds maximum length")
        // Range validation
        .And(_ => Age >= 18 && Age <= 120, "Invalid age");
}
```

### Sensitive Data Handling

```csharp
// ❌ NEVER expose internal IDs in error messages
throw new Exception($"User {internalUserId} not found");

// ✅ Use generic messages
throw new NotFoundException("User not found");

// ❌ NEVER log sensitive data
logger.LogInformation($"Password: {password}");

// ✅ Log only safe identifiers
logger.LogInformation("User login attempt: {UserId}", userId);
```

### SQL Injection Prevention

```csharp
// ✅ Use parameterized queries (automatic with EF/repositories)
await repository.GetAllAsync(e => e.Name == searchTerm, ct);

// ❌ NEVER concatenate user input
var sql = $"SELECT * FROM Users WHERE Name = '{searchTerm}'";
```

---

## Frontend Security

### API Service Pattern (Token Handling)

```typescript
// ✅ Use PlatformApiService - handles auth tokens automatically
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/Employee'; }

    getEmployees(): Observable<Employee[]> {
        return this.get<Employee[]>('');  // Auth token added automatically
    }
}

// ❌ NEVER use HttpClient directly
constructor(private http: HttpClient) {}  // Missing auth handling
```

### XSS Prevention

```typescript
// ✅ Angular sanitizes by default in templates
<div>{{ userInput }}</div>

// ⚠️ Be careful with innerHTML - use sanitizer
import { DomSanitizer } from '@angular/platform-browser';
this.sanitizer.bypassSecurityTrustHtml(content);

// ❌ NEVER bypass security without validation
[innerHTML]="untrustedContent"
```

### Sensitive Data Storage

```typescript
// ❌ NEVER store secrets in localStorage/sessionStorage
localStorage.setItem('apiKey', secretKey);
localStorage.setItem('password', password);

// ✅ Store only non-sensitive data
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'en');

// ✅ Use secure cookies for auth tokens (handled by platform)
// Tokens are managed by PlatformApiService automatically
```

### Route Guards

```typescript
// Protect routes with authorization guards
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    canActivate(): Observable<boolean> {
        return this.authService.hasRole$(PlatformRoles.Admin);
    }
}

// Route configuration
{
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminGuard]
}
```

### Template Authorization

```typescript
// Use role checks in templates
@if (hasRole(PlatformRoles.Admin)) {
    <button (click)="deleteUser()">Delete</button>
}

@if (canEdit()) {
    <button (click)="edit()">Edit</button>
}
```

---

## Security Checklist

### Backend
- [ ] Authorization attributes on controllers/actions
- [ ] Tenant isolation in all queries (`RequestContext.CurrentCompanyId()`)
- [ ] Input validation at boundaries
- [ ] No sensitive data in error messages
- [ ] No sensitive data in logs
- [ ] Parameterized queries (automatic with platform)

### Frontend
- [ ] Using `PlatformApiService` (not `HttpClient`)
- [ ] No secrets in localStorage/sessionStorage
- [ ] Route guards for protected pages
- [ ] Template-level authorization checks
- [ ] Sanitized user-generated content

---

## Common Vulnerabilities to Avoid

| Vulnerability | Prevention |
|--------------|------------|
| SQL Injection | Use repository pattern (parameterized automatically) |
| XSS | Angular default sanitization + DomSanitizer |
| CSRF | Platform handles anti-forgery tokens |
| Broken Access Control | RequestContext + role validation |
| Sensitive Data Exposure | Never log/expose secrets |
| Insecure Direct Object Reference | Entity-level access expressions |
