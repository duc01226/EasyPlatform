# User Management Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.UserManagementFeature.md](./README.UserManagementFeature.md)
> Last synced: 2026-02-27

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | Accounts |
| Service | Accounts.Service (ASP.NET Core 9) |
| Identity DB | SQL Server (AspNetUsers, AspNetRoles, AspNetUserRoles) |
| Message Bus | RabbitMQ (user sync events) |

### File Locations

```
Entities:    src/Services/Accounts/Accounts.Domain/Entities/ApplicationUser.cs
Commands:    src/Services/Accounts/Accounts.Application/UseCaseCommands/UserManagement/
Queries:     src/Services/Accounts/Accounts.Application/UseCaseQueries/UserManagement/
Controllers: src/Services/Accounts/Accounts.Service/Controllers/UserManagementController.cs
            src/Services/Accounts/Accounts.Service/Controllers/UserManagementV2Controller.cs
            src/Services/Accounts/Accounts.Service/Controllers/ExternalUsersController.cs
Frontend:    src/WebV2/apps/bravo-accounts-*/src/app/user-management/
             src/Web/[LegacyAccountClient]/src/app/user-management/

PayrollHrOperations Role:
├── Constant:      src/Services/_SharedCommon/Bravo.Shared/Domain/Constant/UserRoles.cs:21
├── RequestKeys:   src/Services/_SharedCommon/Bravo.Shared/Application/Constants/BravoSuitesApplicationCustomRequestContextKeys.cs:88,125
├── Controller:    ExternalUsersController.cs:383-386, UserManagementController.cs:530-533
├── Handlers:      EditUserCommandHandler.cs:182-185, AssignRolesIntoUsersCommandHandler.cs:41-44
├── Permission:    SetRolesForUserCommandHandler.cs:153-156
├── Employee:      src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/User.cs:223-229
├── FieldTemplate: src/Services/_SharedCommon/Bravo.Shared/Domain/Entities/AggregatesModel/CompanyClassFieldTemplate.cs:114-133
└── Frontend:      src/Web/[AccountsClient]/src/app/user-management/.../user-form.component.ts:242-251
```

---

## Domain Model

### Entities

```
ApplicationUser : IdentityUser
├── Id: string (ULID)
├── UserName: string (unique, login credential)
├── Email: string (unique)
├── PasswordHash: string (hashed)
├── FirstName: string
├── LastName: string
├── FullName: string (computed)
├── FullTextSearch: string (computed for search)
├── PhoneNumber: string
├── DateOfBirth: DateTime?
├── Country, City, StreetAddress: string
├── Gender: Gender enum
├── IsActive: bool (controls login access)
├── CreatedDate: DateTime
├── ModifiedDate: DateTime?
├── Otp: string (temp password, expires 24h)
├── OtpExpiration: DateTime?
├── UsedPasswordHashs: string (password history)
├── UserRoles: List<IdentityUserRole> (many-to-many)
└── OrgUnitRoles: List<UserOrganizationalUnitRole>

UserOrganizationalUnitRole
├── UserId: string (FK)
├── RoleId: string (FK)
├── OrganizationalUnitId: string (FK)
├── User: ApplicationUser
├── Role: IdentityRole
└── OrgUnit: OrganizationalUnit

UserSession
├── Id: string (ULID)
├── UserId: string (FK)
├── LoginDate: DateTime
├── LogoutDate: DateTime?
├── IPAddress: string
├── DeviceInfo: string
└── TokenId: string
```

### Value Objects

```
Gender: Male | Female | Other | Prefer_Not_to_Say
SignUpStatus: Active | Inactive | PendingOtp
AccessRightAction: None | View | Edit
```

### Key Expressions

```csharp
// User uniqueness (email)
public static Expression<Func<ApplicationUser, bool>> ByEmailExpr(string email)
    => u => u.Email == email;

// Active users only
public static Expression<Func<ApplicationUser, bool>> ActiveUsersExpr()
    => u => u.IsActive && !u.EmailConfirmed.HasValue;

// OrgUnit scope filter
public static Expression<Func<ApplicationUser, bool>> InOrgUnitsExpr(List<string> orgUnitIds)
    => u => u.OrgUnitRoles.Any(o => orgUnitIds.Contains(o.OrganizationalUnitId));

// Full text search
public static Expression<Func<ApplicationUser, object?>>[] DefaultFullTextSearchColumns()
    => [u => u.UserName, u => u.Email, u => u.FirstName, u => u.LastName, u => u.FullTextSearch];
```

---

## API Contracts

### Commands (v1 - Deprecated)

```
POST /api/management/users - CreateUserCommand
├── Request:  { email, firstName, lastName, roleNames[], organizationalUnitIds[] }
├── Response: { user: UserDto, otp: string }
├── Handler:  CreateUserCommandHandler.cs:95-187
└── Evidence: UserManagementController.cs:133-200

PUT /api/management/users/{id} - EditUserCommand
├── Request:  { id, email?, firstName?, lastName?, phone?, address?, roleNames[], orgIds[] }
├── Response: { user: UserDto }
├── Handler:  EditUserCommandHandler.cs
└── Evidence: UserManagementController.cs:202-260

POST /api/management/users/set-user-active-state - SetUserActiveStateCommand
├── Request:  { userIds: string[], isActivate: bool }
├── Response: { success: bool }
├── Handler:  SetUserActiveStateCommandHandler.cs
└── Evidence: UserManagementController.cs:414-447

PUT /api/management/users/assign-roles - AssignRolesIntoUsersCommand
├── Request:  { userId: string, roleNames: string[] }
├── Response: { success: bool }
├── Handler:  AssignRolesIntoUsersCommandHandler.cs
└── Evidence: UserManagementController.cs:517-544

POST /api/management/users/import-employees-by-file - ImportUserByFileCommand
├── Request:  multipart/form-data { file: IFormFile }
├── Response: { imported: int, skipped: int, errors: ErrorRow[] }
├── Handler:  ImportUserByFileCommandHandler.cs
└── Evidence: UserManagementController.cs:633-677
```

### Commands (v2 - Modern)

```
POST /api/v2/users - CreateUserCommandV2
├── Request:  { email, firstName, lastName, organizationalUnitIds[], roleNames[] }
├── Response: { user: UserDto, otp: string }
├── Handler:  CreateUserCommandV2Handler.cs
└── Evidence: UserManagementV2Controller.cs:113-198

PUT /api/v2/users/{id} - EditUserCommandV2
├── Request:  { email?, firstName?, lastName?, phone?, roleNames[], orgIds[] }
├── Response: { user: UserDto }
└── Evidence: UserManagementV2Controller.cs:200-280
```

### Queries

```
GET /api/management/users/check-existed-email - CheckExistedEmailQuery
├── Request:  { email: string }
├── Response: { exists: bool }
├── Handler:  CheckExistedEmailQueryHandler.cs
└── Evidence: UserManagementController.cs:265-325

GET /api/management/users/list - GetUserListQuery
├── Request:  { skipCount, maxResultCount, searchText?, roles?, orgUnitIds?, isActive? }
├── Response: { items: UserDto[], totalCount: int }
├── Handler:  GetUserListQueryHandler.cs
└── Evidence: UserManagementController.cs:328-366
```

### DTOs

```csharp
UserDto : PlatformEntityDto<ApplicationUser, string>
├── Id: string?
├── UserName: string
├── Email: string
├── FirstName: string
├── LastName: string
├── FullName: string
├── IsActive: bool
├── Phone: string?
├── DateOfBirth: DateTime?
├── Country, City, Address: string?
├── Gender: Gender enum
├── RoleNames: List<string>
├── OrgUnits: List<OrganizationalUnitDto>
├── CreatedDate: DateTime
└── ModifyBy(): ApplicationUser

CreateUserRequestDto
├── Email: string (required, unique)
├── FirstName: string (required)
├── LastName: string (required)
├── RoleNames: List<string>
└── OrganizationalUnitIds: List<string>
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|-----------|----------|
| BR-UM-001 | New user: set IsActive=true, generate ULID, send OTP | `CreateUserCommandHandler.cs:110-125` |
| BR-UM-002 | Email must be unique | `CreateUserCommand.Validate():And(... email unique)` |
| BR-UM-003 | Username must be unique | `CreateUserCommandHandler.cs:95-105` |
| BR-UM-004 | FirstName and LastName required | `CreateUserCommand.Validate()` |
| BR-UM-005 | OrgUnit Manager can only assign non-admin roles, scoped org units | `EditUserCommandHandler.cs:45-58` |
| BR-ST-001 | User deactivated: revoke all sessions, prevent login | `SetUserActiveStateCommandHandler.cs:88-102` |
| BR-ST-002 | User activated: send notification | `SetUserActiveStateCommandHandler.cs:75-87` |
| BR-ST-003 | OrgUnit Manager cannot deactivate admin users | `SetUserActiveStateCommandHandler.cs:32-44` |
| BR-RL-001 | Role change: revoke all sessions via RevokeAllForceLogout | `AssignRolesIntoUsersCommandHandler.cs:115-130` |
| BR-RL-002 | OrgUnit Manager cannot assign admin roles | `AssignRolesIntoUsersCommandHandler.cs:48-62` |
| BR-RL-003 | User assigned multiple roles: grant union permissions | `UserManager.AddToRolesAsync(user, roleNames)` |
| BR-RL-004 | PayrollHrOperations only assignable by Admin/OrgUnitAdmin/OrgUnitManager/HrManager | `UserRoles.cs:49` |
| BR-RL-005 | PayrollHrOperations checkbox gated by EmployeeRecord license | `user-form.component.ts:242-251` |
| BR-RL-006 | PayrollHrOperations grants Employee module read + limited write | `CompanyClassFieldTemplate.cs:114-133` |
| BR-PW-001 | Password reset: generate OTP (6 digits), expires 24h, send email | `ResetPasswordCommandHandler.cs:78-95` |
| BR-PW-002 | OTP expired: reject reset | `ResetPasswordCommandHandler.cs:45-52` |
| BR-PW-003 | Password must meet complexity requirements | `PasswordValidator.ValidateAsync()` |
| BR-PW-004 | Cannot reuse password from history | `UsedPasswordHashs check` |
| BR-BK-001 | Bulk import: skip duplicate emails, add to error summary | `ImportUserByFileCommandHandler.cs:125-140` |
| BR-BK-002 | Bulk import: skip missing required fields | `ImportUserByFileCommandHandler.cs:78-95` |
| BR-BK-003 | Bulk import: skip invalid roles | `ImportUserByFileCommandHandler.cs:102-118` |
| BR-BK-004 | Bulk import: return summary with imported/skipped/errors | `ImportUserByFileCommandHandler.cs:180-195` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Email.IsNotNullOrEmpty(), "Email required")
        .And(_ => FirstName.IsNotNullOrEmpty(), "First name required")
        .And(_ => LastName.IsNotNullOrEmpty(), "Last name required");

// Async validation in handler
await validation
    .AndNotAsync(r => repository.AnyAsync(u => u.Email == r.Email), "Email already exists")
    .AndAsync(r => ValidateOrgUnitScope(r, RequestContext.UserId()));
```

---

## Service Boundaries

### Produces Events

```
AccountUserSavedEventBusMessage → [Growth, Employee, Candidate, Settings]
├── Producer: Auto-generated by Platform
├── Triggers: Create, Update on ApplicationUser
└── Payload: { CrudAction, UserId, UserData, Timestamp }
```

### Consumes Events

```
From External Services:
├── SetUserRoleRequestBusMessage ← [Growth, Candidate]
│   └── Action: Sync role assignments
├── UpsertUserCompanyInfoRequestBusMessage ← [Growth]
│   └── Action: Update company-level user info
└── AddUsersToOrgsRequestBusMessage ← [Employee]
    └── Action: Bulk assign users to org units
```

### Cross-Service Data Flow

```
Accounts.Service ──publish──▶ [RabbitMQ] ──consume──▶ Growth.Service (PostgreSQL)
   (SQL Server)                                      ──consume──▶ Employee.Service (SQL Server)
   Source of Truth                                   ──consume──▶ Candidate.Service (MongoDB)
                                                     ──consume──▶ Settings.Service (MongoDB)
```

### Consumer Pattern

```csharp
// Account user event consumer (in other services)
public override async Task HandleLogicAsync(AccountUserSavedEventBusMessage msg, ...)
{
    var existing = await repository.FirstOrDefaultAsync(u => u.Id == msg.Payload.UserId);

    if (msg.Payload.CrudAction == Created || msg.Payload.CrudAction == Updated)
    {
        if (existing == null)
            await repository.CreateAsync(msg.Payload.UserData);
        else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
            await repository.UpdateAsync(existing.With(u => {
                u.Email = msg.Payload.UserData.Email;
                u.FullName = msg.Payload.UserData.FullName;
                u.IsActive = msg.Payload.UserData.IsActive;
                u.LastMessageSyncDate = msg.CreatedUtcDate;
            }));
    }
    else if (msg.Payload.CrudAction == Deleted)
        await repository.DeleteAsync(msg.Payload.UserId);
}
```

---

## PayrollHrOperations Patterns

### Authorization (3-Layer Defense-in-Depth)

```
Layer 1 (Frontend):  user-form.component.ts:242-251 → License gate hides checkbox
Layer 2 (Controller): ExternalUsersController.cs:383-386 → CanAssignPayrollHrOperationsRole check
Layer 3 (Handler):   EditUserCommandHandler.cs:182-185 → RolesAuthorizedToAssignPayrollHrOperations HashSet
```

### RolesAuthorizedToAssign (UserRoles.cs:49)

```csharp
public static readonly HashSet<string> RolesAuthorizedToAssignPayrollHrOperations = [Admin, OrgUnitAdmin, OrgUnitManager, HrManager];
// Handler uses StartsWith matching for scoped roles: "OrgUnitAdmin:companyId"
```

### Cross-Service Access Grants

| Service | Access | Method | Evidence |
|---------|--------|--------|----------|
| Employee.Service | View/Update Employee records | `HasAnyCompanyRole(companyId, Hr, PayrollHrOperations)` | `User.cs:190,197` |
| Employee.Service | View pending employees | Permission check in query handler | `GetPendingEmployeesInCompanyQueryHandler.cs:40` |
| Employee.Service | Import employees | Permission check in helper | `ImportEmployeeHelper.cs:285` |
| Shared | View/Update CompanyClassFieldTemplate | `HasViewPermission` / `HasUpdatePermission` | `CompanyClassFieldTemplate.cs:114-133` |

### HasAnyCompanyRole (User.cs:223-229)

```csharp
public bool HasAnyCompanyRole(string companyId, params string[] roles)
{
    if (CollectionUtil.IsNullOrEmpty(Companies)) return false;
    return Companies.Any(p => (companyId == null || p.OrgUnitId == companyId) && p.Roles.Any(r => roles.Contains(r)));
}
// Replaces: HasHRRole(companyId) || HasCompanyRole(UserRoles.PayrollHrOperations, companyId)
```

---

## Critical Paths

### Create User

```
1. Validate input (BR-UM-002, BR-UM-003, BR-UM-004)
   ├── Email required & unique
   ├── Username unique
   └── FirstName & LastName required
2. Validate authorization
   └── Admin: full access | OrgUnit Manager: scoped to managed orgs, non-admin roles only
3. Create ApplicationUser with Identity.UserManager.CreateAsync()
4. Assign roles: UserManager.AddToRolesAsync(user, roleNames)
5. Assign org units: Create UserOrganizationalUnitRole records
6. Generate OTP: 6-digit code, expires 24 hours (BR-UM-001)
7. Send OTP email
8. Publish AccountUserSavedEventBusMessage → Consumers sync
9. Log creation event (audit trail)
```

**Success Scenario**: User created, OTP sent, email notifications queued
**Failure Scenarios**:
- Email exists: Return validation error
- OrgUnit Manager assigning admin role: Return authorization error
- Email send fails: Log and continue (non-blocking)

### Change User Roles

```
1. Load existing user → not found: throw 404
2. Validate authorization: Admin only or OrgUnit Manager with scope
3. If OrgUnit Manager: validate all assigned roles are non-admin (BR-RL-002)
4. Clear existing roles: UserManager.RemoveFromAllRolesAsync(user)
5. Assign new roles: UserManager.AddToRolesAsync(user, roleNames)
6. Revoke all sessions: RevokeCurrentLoginSessionTokenHelper.RevokeAllForceLogout(userId)
7. Publish event → Consumers sync role changes
8. Log role change (audit trail)

User receives 401 Unauthorized on next request → Must re-login with new permissions
```

**Session Revocation**: Token revocation invalidates all current sessions immediately

### Bulk Import Users

```
1. Parse file (CSV/Excel) into rows
2. For each row:
   ├─ Validate: email, firstName, lastName required (BR-BK-002)
   ├─ Check: email unique across import + database (BR-BK-001)
   ├─ Validate roles exist in system (BR-BK-003)
   ├─ Validate org units exist (BR-BK-003)
   ├─ If all valid: Queue user creation
   └─ If invalid: Add error to summary
3. Create all valid users in batch (100 users per batch)
4. Queue batch OTP emails
5. Return summary: { imported: 45, skipped: 5, errors: [...] }
6. Log bulk import event
```

**Performance**: 500 users in < 30 seconds (batched operations)

### User Deactivation

```
1. Load user(s)
2. Validate authorization
   └── Admin: can deactivate anyone | OrgUnit Manager: cannot deactivate admins
3. Set IsActive = false
4. Revoke all user sessions (BR-ST-001)
5. Prevent login attempts (identity check)
6. Publish event → Consumers mark user inactive
7. Send deactivation notification (optional)
8. Log deactivation event
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-UM-001 | Create user with valid data | User created, OTP sent, roles/orgs assigned |
| TC-UM-002 | Create user - duplicate email | Returns BR-UM-002 validation error |
| TC-UM-003 | Assign admin role as OrgUnit Manager | Returns BR-RL-002 authorization error |
| TC-UM-004 | Deactivate user while logged in | Session revoked, 401 on next request |
| TC-UM-005 | Bulk import - 50% invalid rows | Valid rows created, invalid skipped with errors |
| TC-UM-006 | Reset password - expired OTP | Returns BR-PW-002 error |

### PayrollHrOperations Test Cases

| ID | Test | Validation |
|----|------|------------|
| TC-UM-050 | Assign PayrollHrOperations by Admin | Role assigned, session revoked, permissions granted |
| TC-UM-051 | Assign PayrollHrOperations by Employee role | Returns authorization error |
| TC-UM-052 | PayrollHrOperations views Employee records | HasViewPermission grants read access |
| TC-UM-053 | PayrollHrOperations updates Employee fields | HasUpdatePermission grants limited write |
| TC-UM-054 | UI checkbox hidden without EmployeeRecord license | Checkbox not rendered |
| TC-UM-055 | 3-layer defense-in-depth validation | Frontend + Controller + Handler all enforce |
| TC-UM-056 | HasAnyCompanyRole multi-role check | Returns true when user has any specified role |
| TC-UM-057 | HasAnyCompanyRole with empty Companies | Returns false, no exception |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty email | Validation error: "Email required" | `CreateUserCommand.Validate()` |
| OTP expiration | Password reset rejected | `ResetPasswordCommandHandler.cs:45-52` |
| Concurrent updates | Last write wins (EF Core tracking) | `EditUserCommandHandler.cs` |
| Session revocation during request | Request completes, next auth fails | `RevokeCurrentLoginSessionTokenHelper.cs` |
| Org unit manager accessing wrong org | Authorization denied | `EditUserCommandHandler.cs:45-58` |
| PayrollHrOperations + missing license | Checkbox hidden, API rejects | `user-form.component.ts:242-251` |
| PayrollHrOperations on null Companies | `HasAnyCompanyRole` returns false safely | `User.cs:223-229` |

---

## Usage Notes

### When to Use This File

- Implementing new user management features
- Fixing bugs in authentication/authorization flows
- Understanding role/org unit/session mechanics
- Code review of user-related changes
- Cross-service integration work

### When to Use Full Documentation

- Business requirements clarification
- Stakeholder/client presentations
- Comprehensive test planning
- Troubleshooting production user issues
- Understanding UI user flows
- Security audit/compliance reviews

---

*Generated from comprehensive documentation. For full details, see [README.UserManagementFeature.md](./README.UserManagementFeature.md)*
