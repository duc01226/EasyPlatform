# Authorization Patterns

## Backend Authorization

### Controller Level
```csharp
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));
```

### Handler Level Validation
```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repository.AnyAsync(
            e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company only");
}
```

### Entity-Level Filter
```csharp
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Usage
var employees = await repository.GetAllAsync(
    Employee.OfCompanyExpr(companyId).AndAlso(Employee.UserCanAccessExpr(userId, companyId)), ct);
```

## Frontend Authorization

### Component Properties
```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    get canEdit() {
        return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany();
    }

    get canDelete() {
        return this.hasRole(PlatformRoles.Admin);
    }
}
```

### Template Guards
```html
@if (hasRole(PlatformRoles.Admin)) {
    <button (click)="delete()">Delete</button>
}

@if (canEdit) {
    <button (click)="edit()">Edit</button>
}
```

### Route Guards
```typescript
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

## Request Context Methods

### Role Checking
```csharp
RequestContext.HasRole(PlatformRoles.Admin)
RequestContext.HasRequestAdminRoleInCompany()
RequestContext.GetRoles()
```

### User Context
```csharp
RequestContext.UserId()
RequestContext.CurrentCompanyId()
RequestContext.ProductScope()
await RequestContext.CurrentEmployee()
```

## Common Role Patterns

### Platform Roles
- `PlatformRoles.Admin` - Full system access
- `PlatformRoles.Manager` - Department/team management
- `PlatformRoles.Employee` - Self-service access
- `PlatformRoles.Viewer` - Read-only access

### Permission Strategies
```csharp
// Strategy pattern for role-based permissions
public static class PermissionService
{
    private static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;

    public static Expression<Func<Employee, bool>> GetCanManageEmployeesExpr(IList<string> roles, ...)
        => roles.Aggregate(
            e => false,
            (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr(...)));
}
```

## Security Best Practices

### Always Validate
- Check permissions in BOTH frontend AND backend
- Frontend for UX, backend for security
- Never trust client-side authorization alone

### Use Platform Patterns
- Use `[PlatformAuthorize]` attribute
- Use `RequestContext` for user info
- Use validation patterns for complex rules

### Multi-Tenant Isolation
- Always include company/tenant filter in queries
- Use `OfCompanyExpr()` patterns
- Validate entity ownership before modifications
