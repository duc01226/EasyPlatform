---
description: "Security review for OWASP Top 10 vulnerabilities and authorization patterns"
---

# Security Review Prompt

## Overview

This prompt guides security reviews for EasyPlatform code, focusing on OWASP Top 10 vulnerabilities and platform-specific authorization patterns.

## OWASP Top 10 Checklist

### 1. Broken Access Control (A01:2021)

**Backend Checks:**
- [ ] Controller methods have `[PlatformAuthorize]` attribute
- [ ] Handler validates user permissions via `RequestContext.HasRole()`
- [ ] Entity queries filter by `RequestContext.CurrentCompanyId()` or `UserId()`
- [ ] No direct access to other companies' data
- [ ] File/resource access validates ownership

```csharp
// ✅ CORRECT - Multi-layer authorization
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd) => Ok(await Cqrs.SendAsync(cmd));

// Handler level
protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(PlatformValidationResult<SaveEmployeeCommand> v, CancellationToken ct)
    => await v.AndNotAsync(_ => !RequestContext.HasRequestAdminRoleInCompany(), "Insufficient permissions")
              .AndAsync(_ => repo.AnyAsync(e => e.Id == _.EmployeeId && e.CompanyId == RequestContext.CurrentCompanyId(), ct), "Access denied");

// Entity level
public static Expression<Func<Employee, bool>> AccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

**Frontend Checks:**
- [ ] UI hides unauthorized actions via `hasRole()` checks
- [ ] Route guards validate permissions
- [ ] API calls fail gracefully on 401/403

### 2. Cryptographic Failures (A02:2021)

- [ ] No hardcoded passwords, API keys, secrets in code
- [ ] Sensitive config in appsettings (not committed), environment variables, or Azure Key Vault
- [ ] Passwords hashed (bcrypt, PBKDF2, Argon2)
- [ ] HTTPS enforced in production
- [ ] Sensitive data encrypted at rest (PII, financial data)

```csharp
// ❌ WRONG - Hardcoded secret
var apiKey = "sk-1234567890abcdef";

// ✅ CORRECT - Config-based
var apiKey = configuration["ExternalApi:ApiKey"];
```

### 3. Injection (A03:2021)

**SQL Injection:**
- [ ] No raw SQL with string concatenation
- [ ] Use parameterized queries or LINQ expressions
- [ ] Repository pattern prevents direct SQL access

```csharp
// ❌ WRONG - SQL injection risk
var sql = $"SELECT * FROM Users WHERE Name = '{userName}'";

// ✅ CORRECT - Expression-based
await repo.GetAllAsync(u => u.Name == userName, ct);
```

**Command Injection:**
- [ ] Validate/sanitize inputs to external processes
- [ ] No direct shell command execution with user input

**NoSQL Injection:**
- [ ] MongoDB queries use typed expressions, not raw BSON

### 4. Insecure Design (A04:2021)

- [ ] Business logic validates in handler, not just client-side
- [ ] Rate limiting on sensitive endpoints (login, password reset)
- [ ] Transaction boundaries prevent race conditions
- [ ] Idempotency keys for critical operations

### 5. Security Misconfiguration (A05:2021)

- [ ] No verbose error messages in production (no stack traces to users)
- [ ] CORS configured with specific origins, not `*`
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Default accounts disabled
- [ ] Unnecessary features/endpoints disabled

```csharp
// ✅ CORRECT - Environment-specific error handling
app.UseExceptionHandler(env.IsDevelopment()
    ? "/error-dev"
    : "/error");
```

### 6. Vulnerable and Outdated Components (A06:2021)

- [ ] NuGet/npm packages up to date
- [ ] Dependabot alerts reviewed
- [ ] No deprecated APIs used

### 7. Identification and Authentication Failures (A07:2021)

- [ ] Strong password policy enforced
- [ ] MFA available for sensitive accounts
- [ ] Session timeout configured
- [ ] Account lockout after failed attempts
- [ ] JWT tokens have expiration, validated properly

```csharp
// ✅ CORRECT - JWT validation
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero
        };
    });
```

### 8. Software and Data Integrity Failures (A08:2021)

- [ ] Code signing for deployments
- [ ] Dependency integrity (lock files)
- [ ] No insecure deserialization
- [ ] CI/CD pipeline secured

### 9. Security Logging and Monitoring Failures (A09:2021)

- [ ] Authentication failures logged
- [ ] Authorization failures logged
- [ ] Sensitive operations audited (delete, export)
- [ ] Logs don't contain PII/passwords
- [ ] Anomaly detection configured

```csharp
// ✅ CORRECT - Audit logging
logger.LogWarning("Authorization failed for user {UserId} on resource {ResourceId}",
    RequestContext.UserId(), resourceId);
```

### 10. Server-Side Request Forgery (A10:2021)

- [ ] User-supplied URLs validated/sanitized
- [ ] Whitelist allowed domains for external requests
- [ ] Network segmentation prevents internal resource access

## EasyPlatform Authorization Patterns

### Three-Layer Security Model

**Layer 1: Controller (Coarse-grained)**
```csharp
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
public class EmployeeController : PlatformBaseController { }
```

**Layer 2: Handler Validation (Fine-grained)**
```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin required")
              .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company required");
```

**Layer 3: Entity Expression (Data-level)**
```csharp
public static Expression<Func<Entity, bool>> AccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Usage in query
var items = await repo.GetAllAsync(Entity.AccessExpr(RequestContext.UserId(), RequestContext.CurrentCompanyId()), ct);
```

### Frontend Authorization

```typescript
// Component
get canEdit() {
    return this.hasRole(PlatformRoles.Admin) && this.isOwnCompany();
}

// Template
@if (hasRole(PlatformRoles.Admin)) {
    <button (click)="delete()">Delete</button>
}

// Route guard
canActivate(): Observable<boolean> {
    return this.authService.hasRole$(PlatformRoles.Admin);
}
```

## Input Validation Requirements

### Backend Validation

**Sync Validation (Command level):**
```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Email.IsValidEmail(), "Invalid email")
        .And(_ => Age >= 18, "Must be 18+");
```

**Async Validation (Handler level):**
```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids))
              .AndNotAsync(r => repo.AnyAsync(p => p.Email == r.Email, ct), "Email exists");
```

### Frontend Validation

```typescript
protected initialFormConfig = () => ({
    controls: {
        email: new FormControl(this.currentVm().email,
            [Validators.required, Validators.email],
            [uniqueValidator])
    }
});
```

## Secrets Management

### Never Commit

- Passwords, API keys, connection strings
- JWT signing keys
- Encryption keys
- OAuth client secrets

### Correct Storage

**Development:**
```json
// appsettings.Development.json (gitignored)
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=MyDb;User=sa;Password=DevPass123"
  }
}
```

**Production:**
- Azure Key Vault
- Environment variables
- Kubernetes secrets

## Security Review Checklist

Before merging:

- [ ] All controller endpoints have authorization
- [ ] All handlers validate permissions
- [ ] Entity queries filter by tenant/user
- [ ] No hardcoded secrets
- [ ] Input validation on all user data
- [ ] Error messages don't leak sensitive info
- [ ] Sensitive operations logged
- [ ] No SQL injection vectors
- [ ] HTTPS enforced
- [ ] CORS configured properly

## Common Vulnerabilities in EasyPlatform

### Insecure Direct Object Reference (IDOR)

```csharp
// ❌ WRONG - No ownership check
var employee = await repo.GetByIdAsync(id, ct);
await repo.UpdateAsync(employee, ct);

// ✅ CORRECT - Validate ownership
var employee = await repo.GetByIdAsync(id, ct).EnsureFound();
await new PlatformValidationResult()
    .And(_ => employee.CompanyId == RequestContext.CurrentCompanyId(), "Access denied")
    .EnsureValid();
await repo.UpdateAsync(employee, ct);
```

### Missing Authorization on Entity Events

```csharp
// ✅ CORRECT - Check authorization in event handler
internal sealed class SendNotificationHandler : PlatformCqrsEntityEventApplicationHandler<Employee>
{
    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Employee> e, CancellationToken ct)
    {
        // Validate user still has access
        var hasAccess = await repo.AnyAsync(emp => emp.Id == e.EntityData.Id
            && emp.CompanyId == e.RequestContext.CurrentCompanyId(), ct);
        if (!hasAccess) return;

        await notificationService.SendAsync(e.EntityData);
    }
}
```

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [docs/claude/authorization-patterns.md](../../docs/claude/authorization-patterns.md)
- [.github/AI-DEBUGGING-PROTOCOL.md](../AI-DEBUGGING-PROTOCOL.md)
