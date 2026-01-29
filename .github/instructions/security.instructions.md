---
applyTo: "**/*.cs,**/*.ts"
---

# Security Patterns

> Auto-loads when editing code files. See `docs/code-review-rules.md` for full reference.

## Authorization (Backend)

```csharp
// Controller level - attribute-based
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd) => Ok(await Cqrs.SendAsync(cmd));

// Handler level - fluent validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company");

// Entity level - expression filter
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

## Authorization (Frontend)

```typescript
// Component
get canEdit() { return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany(); }

// Template
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

## Input Validation

- Always validate user input at system boundaries
- Use parameterized queries (Entity Framework handles this)
- Use `PlatformValidationResult` fluent API for validation
- Never trust client-side validation alone

## Sensitive Data

- Never commit secrets (.env, API keys, credentials)
- Don't expose sensitive data in DTOs
- Use encryption for sensitive fields
- Log security-relevant events

## Cross-Service Security

- Cross-service communication MUST use message bus (never direct DB access)
- Validate message authenticity via `LastMessageSyncDate` comparison
- Use `TryWaitUntilAsync` for dependency ordering with reasonable timeouts

## Security Checklist

- [ ] Proper `[PlatformAuthorize]` on controller endpoints?
- [ ] Handler validates user permissions in `ValidateRequestAsync`?
- [ ] Entity-level filters applied for data access?
- [ ] No secrets in source code or DTOs?
- [ ] Input validated at system boundaries?
- [ ] Cross-service communication uses message bus only?
