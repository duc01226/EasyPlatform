# Accounts Service - Documentation Index

## Quick Navigation

Welcome to the Accounts Service documentation. This is the central identity and multi-tenancy provider for BravoSUITE. Use this index to quickly find what you need.

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](./README.md) | Comprehensive service overview, architecture, and features | All developers |
| [API-REFERENCE.md](./API-REFERENCE.md) | API endpoints, request/response examples, error codes | Backend/Frontend developers |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues, debugging steps, FAQ | DevOps, Support, Developers |

---

## Feature Quick Reference

### Core Features at a Glance

| Feature | Purpose | Primary Use Case |
|---------|---------|------------------|
| **User Management** | Create, edit, activate, delete user accounts | Employee onboarding, account lifecycle |
| **Role-Based Access Control (RBAC)** | Define roles with permissions, assign to users | Authorization, permission enforcement |
| **Organizational Structure** | Multi-level hierarchy (companies, departments, teams) | Hierarchical organization management |
| **Authentication** | User login, logout, session management | User access control |
| **Two-Factor Authentication (2FA)** | OTP/authenticator app verification | Enhanced security, MFA enforcement |
| **One-Time Password (OTP)** | SMS OTP generation and validation | Phone verification, login/registration |
| **External User Management (B2B)** | Limited-scope guest/vendor user accounts | Partner/vendor access control |
| **Account Settings & Licensing** | Company configuration, access plans | Company-level customization, feature entitlements |

---

## Sub-Modules Overview

### 1. User Management
Handles complete user account lifecycle: creation, editing, activation, deletion, and bulk import.

**Key Features:**
- Create/edit user profiles
- Activate/deactivate accounts
- Delete users with cascade handling
- Bulk import from CSV/Excel
- Password reset functionality
- User status transitions

**Related Documentation:** See [README.md - User Management (Section 1)](./README.md#1-user-management)

### 2. Role-Based Access Control (RBAC)
Manages roles and their permission assignments at application and organizational unit levels.

**Key Features:**
- Create/edit/delete roles
- Define custom permissions
- Assign roles to users
- Remove roles from users
- List and query roles
- Scope-based role assignments

**Related Documentation:** See [README.md - RBAC (Section 2)](./README.md#2-role-based-access-control-rbac)

### 3. Organizational Structure Management
Manages multi-level organizational hierarchies with parent-child relationships.

**Key Features:**
- Create organizational units (departments, teams, cost centers)
- Edit/delete org units
- Assign users to org units
- Remove users from org units
- Query hierarchical structure
- Maintain tree integrity

**Related Documentation:** See [README.md - Organizational Structure (Section 3)](./README.md#3-organizational-structure-management)

### 4. Authentication & Security
Handles user login, logout, session management, and 2FA verification.

**Key Features:**
- User login with credentials
- Password change
- 2FA setup and verification
- Self-service password reset
- Session management
- Token lifecycle

**Related Documentation:** See [README.md - Authentication (Section 4)](./README.md#4-authentication--security)

### 5. One-Time Password (OTP) Management
Generates and validates temporary passwords for authentication and verification.

**Key Features:**
- Request SMS OTP
- Verify OTP codes
- Manage OTP expiration
- Support multiple OTP types (SMS, Email, Authenticator)
- Handle different action types

**Related Documentation:** See [README.md - OTP Management (Section 5)](./README.md#5-one-time-password-otp-management)

### 6. Organizational Unit Roles Management
Advanced role management scoped to specific organizational units with limited scope.

**Key Features:**
- Assign org unit-scoped roles to users
- Query user roles with org context
- Manage role scope boundaries
- Enforce org unit restrictions

**Related Documentation:** See [README.md - Org Unit Roles (Section 6)](./README.md#6-organizational-unit-roles-management)

---

## Controllers Overview

The Accounts service exposes functionality through the following API controllers:

| Controller | Base Path | Purpose |
|------------|-----------|---------|
| `UserManagementController` | `/api/management/users` | User CRUD operations |
| `RoleManagementController` | `/api/management/roles` | Role definition and assignment |
| `OrganizationalUnitController` | `/api/management/organizational-units` | Org hierarchy management |
| `ChangePasswordController` | `/api/management/users` | Password management |
| `OtpController` | `/api/otp` | OTP generation and verification |
| `ExternalUsersController` | `/api/external-users` | B2B guest user management |
| `CompanySettingsController` | `/api/company-settings` | Company-level configuration |
| `AccessPlansController` | `/api/access-plans` | License/access plan management |
| Identity Server | `/connect` | OAuth 2.0 token and logout |

---

## Detailed Features

The `detailed-features/` directory contains in-depth documentation for specific features and advanced use cases. This directory structure is reserved for granular documentation as the platform evolves.

**Current Structure:** Empty (prepared for future expansion)

**Planned Documentation Topics:**
- Advanced RBAC scenarios (role inheritance, delegated administration)
- Multi-company permission models
- Custom authentication providers
- Session management and token lifecycle
- Audit logging and compliance
- Password policies and reset workflows
- Rate limiting and security controls

**Usage:** When detailed feature documentation is added, reference it from relevant sections above using cross-links.

---

## API Summary

### Authentication & Authorization Endpoints

```
POST   /connect/token                     # OAuth 2.0 login
POST   /connect/logout                    # Logout and token revocation
```

### User Management Endpoints

```
GET    /api/management/users              # List users (paged)
POST   /api/management/users              # Create user
PUT    /api/management/users/{userId}     # Update user
PUT    /api/management/users/{userId}/state  # Activate/deactivate
DELETE /api/management/users              # Delete users (bulk)
POST   /api/management/users/import       # Bulk import from file
POST   /api/management/users/{userId}/reset-password  # Reset password
PUT    /api/management/users/changepassword # Change own password
```

### Role Management Endpoints

```
GET    /api/management/roles              # List roles (paged)
GET    /api/management/api/roles          # Get all roles (non-paged)
POST   /api/management/roles              # Create role
PUT    /api/management/roles/{roleId}     # Update role
DELETE /api/management/roles              # Delete role(s)
POST   /api/management/roles/{roleId}/users       # Add users to role
DELETE /api/management/roles/{roleId}/users       # Remove users from role
```

### Organizational Unit Endpoints

```
GET    /api/management/organizational-units              # List org units with hierarchy
POST   /api/management/organizational-units              # Create org unit
PUT    /api/management/organizational-units/{unitId}     # Update org unit
DELETE /api/management/organizational-units/{unitId}     # Delete org unit
POST   /api/management/organizational-units/{unitId}/users       # Assign users
DELETE /api/management/organizational-units/{unitId}/users       # Remove users
```

### OTP Endpoints

```
POST   /api/otp/sms/request               # Request SMS OTP
POST   /api/otp/verify                    # Verify OTP code
```

**Full API documentation:** See [API-REFERENCE.md](./API-REFERENCE.md)

---

## Key Concepts

### Multi-Tenancy
The Accounts service is built with complete multi-tenant isolation:
- Data completely isolated per company
- Email uniqueness per company (not global)
- Role and org unit isolation per company
- Users cannot cross company boundaries
- All queries automatically filtered by company context

### Role Hierarchy
BravoSUITE uses a five-tier role hierarchy:

1. **System Administrator** - Full system access
2. **Company Owner/Admin** - Full company access
3. **Manager/Supervisor** - Scoped org unit management
4. **Employee/User** - Basic self-service access
5. **External/Guest User** - Restricted time/feature-limited access

### Organizational Units
Org units form a hierarchical tree structure:
- Companies at root level
- Departments under companies
- Teams under departments
- Cost centers at any level
- Users assigned to units for role scoping

### Authentication Flow
1. User submits email and password
2. System validates credentials via Identity Server
3. Checks user status and permissions
4. Issues JWT token with user claims
5. Creates session record
6. Updates last login date

### 2FA/MFA
Two layers of authentication:
1. **Password** - Standard credential
2. **2FA** - OTP via SMS or authenticator app
   - TOTP (Time-based One-Time Password)
   - SMS OTP via SMS provider
   - Backup codes for recovery

### Cross-Service Communication
The Accounts service publishes events to message bus (RabbitMQ):

**User Events:** UserCreated, UserUpdated, UserActivated, UserDeactivated, UserDeleted, UserPasswordChanged, User2FAEnabled

**Role Events:** RoleCreated, RoleUpdated, RoleDeleted, RoleAssigned, RoleUnassigned

**Org Unit Events:** OrgUnitCreated, OrgUnitUpdated, OrgUnitDeleted, UserAddedToOrgUnit, UserRemovedFromOrgUnit

**Access Events:** UserLicenseAssigned, UserLicenseRevoked, AccessPlanAssigned

---

## Technology Stack

- **Framework:** ASP.NET Core with Clean Architecture
- **Identity:** ASP.NET Identity + IdentityServer (OAuth 2.0 / OpenID Connect)
- **Database:** SQL Server with Entity Framework Core
- **Patterns:** CQRS (Command/Query Separation), Repository Pattern
- **Communication:** RabbitMQ message bus for cross-service events
- **Authentication:** JWT tokens with 15-minute expiration, 7-day refresh tokens
- **Hashing:** Argon2 for password storage
- **OTP Provider:** Twilio for SMS delivery (configurable)

---

## Common Workflows

### New Employee Onboarding
1. Admin creates user account (POST /api/management/users)
2. Assigns user to company org unit (POST /api/management/organizational-units/{unitId}/users)
3. Assigns applicable roles (POST /api/management/roles/{roleId}/users)
4. User receives activation email and logs in
5. Growth and Talent services receive sync events and propagate employee data

### Department Reorganization
1. Create new org unit structure (POST /api/management/organizational-units)
2. Move users between org units (DELETE old, POST new assignments)
3. Update role assignments based on new structure
4. Related services update reporting hierarchy

### Access Removal (Termination)
1. Admin deactivates user (PUT /api/management/users/{userId}/state)
2. System revokes all active sessions automatically
3. Related services receive UserDeactivated event for cleanup
4. Account kept for audit trail (soft delete)

---

## Support & Troubleshooting

### Common Issues Quick Reference

| Issue | Documentation |
|-------|-----------------|
| User cannot login | [TROUBLESHOOTING.md - User Cannot Login](./TROUBLESHOOTING.md#user-cannot-login) |
| Permission denied errors | [TROUBLESHOOTING.md - Permission Denied](./TROUBLESHOOTING.md#permission-denied-errors) |
| OTP not received | [TROUBLESHOOTING.md - OTP Not Received](./TROUBLESHOOTING.md#otp-not-received) |
| Password reset not working | [TROUBLESHOOTING.md - Password Reset](./TROUBLESHOOTING.md#password-reset-not-working) |

### FAQ
See [TROUBLESHOOTING.md - FAQ Section](./TROUBLESHOOTING.md#frequently-asked-questions-faq)

---

## Development Guidelines

### Adding New Features

**New User Management Feature:**
1. Create command in `UseCaseCommands/UserCommands/`
2. Add command handler with validation
3. Create controller action in `UserManagementController`
4. Add frontend component in bravo-domain
5. Publish domain events
6. Add integration tests
7. Update API documentation

**New Role/Permission:**
1. Define permission name constant
2. Create role with permission assignments
3. Add authorization policy to controller
4. Test permission validation flow
5. Update role management UI
6. Document permission in requirements

### Multi-Tenancy Best Practices

- Always filter by company ID in queries
- Never expose cross-company data
- Validate company context before operations
- Use company-scoped repositories
- Test isolation with multiple company scenarios

---

## Architecture Resources

- [README.md](./README.md) - Complete service architecture and features
- [API-REFERENCE.md](./API-REFERENCE.md) - Detailed API endpoint documentation
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Debugging and common issues
- [../../guides/authentication.md](../../guides/authentication.md) - Authentication & authorization guide
- [../../architecture/multi-tenancy.md](../../architecture/multi-tenancy.md) - Multi-tenancy architecture
- [../../architecture/message-bus.md](../../architecture/message-bus.md) - Message bus integration
- [../../patterns/cqrs.md](../../patterns/cqrs.md) - CQRS pattern implementation

---

**Last Updated:** December 31, 2025
**Status:** Active & Production Ready
**Maintained By:** Platform Team
