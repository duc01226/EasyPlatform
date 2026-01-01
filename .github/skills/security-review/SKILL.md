---
name: security-review
description: Use when reviewing code for security vulnerabilities, implementing authorization, or ensuring data protection.
---

# Security Review for EasyPlatform

## OWASP Top 10 Quick Reference

### 1. Broken Access Control

```csharp
// VULNERABLE
[HttpGet("{id}")]
public async Task<Employee> Get(string id) => await repo.GetByIdAsync(id);

// SECURE
[HttpGet("{id}")]
[PlatformAuthorize(Roles.Manager, Roles.Admin)]
public async Task<Employee> Get(string id)
{
    var employee = await repo.GetByIdAsync(id);
    if (employee.CompanyId != RequestContext.CurrentCompanyId())
        throw new UnauthorizedAccessException();
    return employee;
}
```

### 2. Injection Prevention

```csharp
// VULNERABLE - SQL Injection
var sql = $"SELECT * FROM Users WHERE Name = '{name}'";

// SECURE - Parameterized
await context.Users.Where(u => u.Name == name).ToListAsync();
```

### 3. Cryptographic Best Practices

```csharp
// VULNERABLE
var apiKey = config["ApiKey"];
await SaveToDatabase(apiKey);

// SECURE
var encryptedKey = encryptionService.Encrypt(apiKey);
await SaveToDatabase(encryptedKey);
```

## Authorization Patterns

### Controller Level

```csharp
[ApiController]
[Route("api/[controller]")]
[PlatformAuthorize]  // Require authentication
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    [PlatformAuthorize(Roles.Admin, Roles.Manager)]  // Role-based
    public async Task<IActionResult> Create(...)
}
```

### Handler Level

```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .And(_ => RequestContext.HasRole(Roles.Admin), "Admin role required")
        .And(_ => entity.CompanyId == RequestContext.CurrentCompanyId(), "Access denied");
}
```

### Query Level

```csharp
var employees = await repo.GetAllAsync(
    e => e.CompanyId == RequestContext.CurrentCompanyId()
        && (e.IsPublic || e.OwnerId == RequestContext.UserId()));
```

## File Upload Security

```csharp
public async Task<IActionResult> Upload(IFormFile file)
{
    // Validate file type
    var allowedTypes = new[] { ".pdf", ".docx", ".xlsx" };
    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (!allowedTypes.Contains(extension)) return BadRequest("Invalid file type");

    // Validate file size
    if (file.Length > 10 * 1024 * 1024) return BadRequest("File too large");

    // Generate safe filename
    var safeFileName = $"{Guid.NewGuid()}{extension}";
    await fileService.SaveAsync(file, safeFileName);

    return Ok();
}
```

## Security Checklist

### Authentication

- [ ] Strong password policy enforced
- [ ] Account lockout after failed attempts
- [ ] JWT tokens properly validated

### Authorization

- [ ] All endpoints require authentication
- [ ] Role-based access control implemented
- [ ] Resource-level permissions checked

### Input Validation

- [ ] All inputs validated
- [ ] SQL injection prevented
- [ ] XSS prevented (output encoding)
- [ ] File uploads validated

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced
- [ ] No sensitive data in logs

## Anti-Patterns

- **Trusting client input**: `var isAdmin = request.IsAdmin;`
- **Exposing internal errors**: `return BadRequest(ex.ToString());`
- **Hardcoded secrets**: `var apiKey = "sk_live_xxxxx";`
- **No audit trail**: Missing logging for sensitive operations
