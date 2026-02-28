# Accounts - Identity & Multi-tenancy Management

## Overview

The Accounts service is the central identity and multi-tenancy provider for all BravoSUITE services. It manages user authentication, authorization, organizational hierarchies, role-based access control (RBAC), and multi-tenant account configurations. Built on ASP.NET Identity and IdentityServer, it provides enterprise-grade authentication and authorization capabilities.

**Key Responsibilities:**
- User account lifecycle management (create, activate, deactivate, delete)
- Identity authentication and authorization (JWT, OAuth, OpenID Connect)
- Multi-tenant organization structure (companies, departments, teams)
- Role-based access control (RBAC) with organizational context
- Two-factor authentication (2FA/MFA) via OTP and authenticator apps
- Password management and credential security
- User session and activity tracking
- Permission validation across services
- External user management (B2B integrations)

**Technology Stack:**
- ASP.NET Identity (User management framework)
- IdentityServer (OAuth 2.0 / OpenID Connect provider)
- Entity Framework Core (Data persistence)
- SQL Server (Primary database)
- RabbitMQ (Cross-service communication)
- CQRS Pattern (Command/Query Separation)

---

## Service Architecture

```
Accounts Service
├── API Layer (Controllers)
│   ├── UserManagement
│   ├── RoleManagement
│   ├── OrganizationalUnits
│   ├── Authentication
│   ├── Authorization
│   └── Multi-tenancy
├── Application Layer (Commands/Queries)
│   ├── User Operations
│   ├── Role Operations
│   ├── Org Unit Operations
│   ├── Authentication
│   └── Background Jobs
└── Domain Layer (Entities)
    ├── ApplicationUser
    ├── ApplicationRole
    ├── OrganizationalUnit
    ├── UserCompanyInfo
    └── OneTimePassword
```

---

## Sub-Modules & Features

### 1. User Management

Central hub for managing user accounts, including creation, activation, status changes, and deletion across the platform.

#### 1.1 Create User

- **Description:** Admin creates new user account with email, first name, last name, and initial password
- **Backend API:** `UserManagementController.CreateUser()`
- **Route:** `POST /api/management/users`
- **Commands:** `CreateUserCommand`, `CreateUserCommandHandler`
- **Frontend Component:** `UserFormComponent` (bravo-domain/account/components/user-form)
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin opens user creation form
  2. Enters user details (email, name, password)
  3. System validates email uniqueness across tenant
  4. User account created in database
  5. Activation email sent (if configured)
  6. Account status set to Active/Pending Activation

#### 1.2 Edit User Profile

- **Description:** Update user information (name, email, contact details, gender, date of birth)
- **Backend API:** `UserManagementController.EditUser()`
- **Route:** `PUT /api/management/users/{userId}`
- **Commands:** `EditUserCommand`, `EditUserCommandHandler`
- **Frontend Component:** `UserFormComponent`
- **Authorization:** Policy = "UserManagement" OR User editing own profile
- **Workflow:**
  1. Admin/User opens edit form with current user data
  2. Modifies user details
  3. System validates changes (email uniqueness if changed)
  4. Updates user record in database
  5. Publishes user update event to message bus
  6. Returns confirmation response

#### 1.3 Activate/Deactivate User

- **Description:** Enable or disable user account access without permanent deletion
- **Backend API:** `UserManagementController.SetUserActiveState()`
- **Route:** `PUT /api/management/users/{userId}/state`
- **Commands:** `SetUserActiveStateCommand`, `SetUserActiveStateCommandHandler`
- **Frontend Component:** `UserManagementActionComponent`
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects user(s) for state change
  2. Chooses activate or deactivate action
  3. System updates IsActive flag in database
  4. If deactivating: revokes active login sessions
  5. Publishes user state change event
  6. External services receive notification via message bus

#### 1.4 Delete User

- **Description:** Permanently remove user account with related data cleanup
- **Backend API:** `UserManagementController.DeleteUsers()` or `AccountFlowController.DeleteAccount()`
- **Route:** `DELETE /api/management/users` or `DELETE /api/account-flow/{userId}`
- **Commands:** `DeleteUsersCommand`, `DeleteUsersOrRemoveConnectionCommand`
- **Frontend Component:** `DeleteUserConfirmationDialog`
- **Authorization:** Policy = "UserManagement" OR FlowAtMeServer
- **Workflow:**
  1. Admin/System initiates user deletion
  2. System validates no dependent data (optional hard-delete)
  3. Removes user from all organizational units
  4. Revokes all active sessions and tokens
  5. Deletes user authentication tickets
  6. Publishes user deleted event to message bus
  7. External services clean up related data

#### 1.5 Import Users Bulk

- **Description:** Import multiple users from CSV/Excel file for batch account creation
- **Backend API:** `UserManagementController.ImportUsersByFile()`
- **Route:** `POST /api/management/users/import`
- **Commands:** `ImportUserByFileCommand`, `ImportUserByFileCommandHandler`
- **Frontend Component:** `ImportUsersComponent`
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin uploads user file (CSV/Excel format)
  2. System parses and validates file contents
  3. Checks for duplicate emails within file and database
  4. Creates users in batches (background job)
  5. Generates default passwords or invitation links
  6. Sends bulk invitation emails
  7. Returns import summary report

#### 1.6 Reset Password

- **Description:** Admin sends password reset link to user or resets password directly
- **Backend API:** `UserManagementController.ResetPassword()` or `GetResetPasswordLinks()`
- **Route:** `POST /api/management/users/{userId}/reset-password`
- **Commands:** `ResetPasswordCommand`, `GetResetPasswordLinksCommand`
- **Frontend Component:** User Management page
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects user(s) needing password reset
  2. Chooses reset option (email link or direct reset)
  3. System generates secure reset token
  4. Sends email with password reset link
  5. User clicks link, enters new password
  6. System validates token and updates password
  7. Invalidates existing sessions

---

### 2. Role-Based Access Control (RBAC)

Manages roles at application and organizational unit level with permission definitions and assignments.

#### 2.1 Create Role

- **Description:** Define new role with permissions for organization
- **Backend API:** `RoleManagementController.CreateRole()`
- **Route:** `POST /api/management/roles`
- **Commands:** `CreateRoleCommand`, `CreateRoleCommandHandler`
- **Frontend Component:** Role management form
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin creates role with name and description
  2. Selects permissions from available permission list
  3. Defines scope (company-wide or department-specific)
  4. System saves role in database
  5. Publishes role creation event
  6. Role becomes available for assignment

#### 2.2 Edit Role

- **Description:** Update role name, description, and permission assignments
- **Backend API:** `RoleManagementController.EditRole()`
- **Route:** `PUT /api/management/roles/{roleId}`
- **Commands:** `EditRoleCommand`, `EditRoleCommandHandler`
- **Frontend Component:** Role management form
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin opens role edit form
  2. Modifies role properties and permissions
  3. System validates permission changes
  4. Updates role in database
  5. Publishes role update event
  6. Affects all users with this role

#### 2.3 Delete Role

- **Description:** Remove role after unassigning from users
- **Backend API:** `RoleManagementController.DeleteRoles()`
- **Route:** `DELETE /api/management/roles/{roleId}`
- **Commands:** `DeleteRolesCommand`, `DeleteRolesCommandHandler`
- **Frontend Component:** Role management confirmation
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects role(s) to delete
  2. System validates role has no active assignments
  3. Removes role from database
  4. Publishes role deletion event
  5. Returns success/failure for each role

#### 2.4 Assign Role to User

- **Description:** Grant user role with specific permissions in organization
- **Backend API:** `RoleManagementController.AddUsersIntoRole()`
- **Route:** `POST /api/management/roles/{roleId}/users`
- **Commands:** `CreateUserRoleCommand`, `AddUsersIntoRoleCommandHandler`
- **Frontend Component:** User assignment component in role management
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects role and users to assign
  2. System validates users exist and aren't already assigned
  3. Creates role assignment in database
  4. Publishes assignment event
  5. User inherits all role permissions

#### 2.5 Remove Role from User

- **Description:** Revoke role and associated permissions from user
- **Backend API:** `RoleManagementController.RemoveUsersFromRole()`
- **Route:** `DELETE /api/management/roles/{roleId}/users`
- **Commands:** `DeleteUserRoleCommand`, `RemoveUsersFromRoleCommandHandler`
- **Frontend Component:** User management component
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects role and users to unassign
  2. System removes role assignment
  3. Publishes removal event
  4. User loses associated permissions
  5. Active sessions updated with new permissions

#### 2.6 Get Roles List

- **Description:** Query all roles with filtering and pagination
- **Backend API:** `RoleManagementController.GetRoles()`
- **Route:** `GET /api/management/roles`
- **Queries:** `GetRolesQuery`, `GetRolesQueryHandler`
- **Frontend Component:** Role list table
- **Workflow:**
  1. Admin views all roles in organization
  2. Filters by role name or description
  3. Paginates through result set
  4. Displays role details and assignments

---

### 3. Organizational Structure Management

Manages multi-level organizational hierarchies (companies, departments, teams, cost centers).

#### 3.1 Create Organizational Unit

- **Description:** Create new department/team/cost center within organization hierarchy
- **Backend API:** `OrganizationalUnitController.CreateOrganizationalUnit()`
- **Route:** `POST /api/management/organizational-units`
- **Commands:** `CreateOrganizationalUnitCommand`, `CreateOrganizationalUnitCommandHandler`
- **Frontend Component:** Org unit creation form
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin enters org unit details (name, code, description, parent unit)
  2. System validates parent unit exists
  3. Creates org unit with unique code
  4. Sets parent relationship
  5. Publishes org unit created event
  6. Available for user assignment

#### 3.2 Edit Organizational Unit

- **Description:** Update org unit properties like name, description, status
- **Backend API:** `OrganizationalUnitController.EditOrganizationalUnit()`
- **Route:** `PUT /api/management/organizational-units/{unitId}`
- **Commands:** `EditOrganizationalUnitCommand`, `EditOrganizationalUnitCommandHandler`
- **Frontend Component:** Org unit edit form
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin modifies org unit details
  2. System validates changes
  3. Updates org unit in database
  4. Publishes update event
  5. Maintains hierarchy integrity

#### 3.3 Delete Organizational Unit

- **Description:** Remove org unit and reassign users and sub-units
- **Backend API:** `OrganizationalUnitController.DeleteOrganizationalUnit()`
- **Route:** `DELETE /api/management/organizational-units/{unitId}`
- **Commands:** `DeleteOrganizationalUnitCommand` (ApplyPlatform)
- **Frontend Component:** Org unit delete confirmation
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects org unit to delete
  2. System prompts for action on child units and users
  3. Moves users to parent org unit (or removes)
  4. Removes org unit from database
  5. Publishes deletion event
  6. Updates all affected roles

#### 3.4 Assign User to Organizational Unit

- **Description:** Add user to org unit enabling org-specific role assignments
- **Backend API:** `OrganizationalUnitController.InsertUsersIntoOrganizationalUnits()`
- **Route:** `POST /api/management/organizational-units/{unitId}/users`
- **Commands:** `CreateOrganizationalUnitUserCommand`, `InsertUsersIntoOrganizationalUnitsCommandHandler`
- **Frontend Component:** User assignment component
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects org unit and users
  2. System creates org unit user relationship
  3. User can now receive org-specific role assignments
  4. Publishes assignment event
  5. User gets access to org unit data

#### 3.5 Remove User from Organizational Unit

- **Description:** Remove user from org unit and related role assignments
- **Backend API:** `OrganizationalUnitController.RemoveUsersFromOrganizationalUnit()`
- **Route:** `DELETE /api/management/organizational-units/{unitId}/users`
- **Commands:** `DeleteOrganizationalUnitUserCommand`, `RemoveUsersFromOrganizationalUnitCommandHandler`
- **Frontend Component:** User management component
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects org unit and users to remove
  2. System removes org unit user relationship
  3. Cascades removal of org unit-scoped roles
  4. Publishes removal event
  5. User loses org unit access

#### 3.6 Get Organizational Units Tree

- **Description:** Query hierarchical organization structure with filtering
- **Backend API:** `OrganizationalUnitController.GetOrganizationalUnits()`
- **Route:** `GET /api/management/organizational-units`
- **Queries:** `GetOrganizationalUnitsQuery`, `GetOrganizationalUnitNamesQuery`
- **Frontend Component:** Org unit tree component
- **Workflow:**
  1. System retrieves org unit hierarchy
  2. Builds tree structure from parent-child relationships
  3. Includes org unit metadata (code, status, user count)
  4. Returns in pagination or complete tree format

---

### 4. Authentication & Security

Handles user login, logout, session management, and multi-factor authentication.

#### 4.1 User Login

- **Description:** Authenticate user with email/username and password
- **Backend API:** Identity Server Connect/Token endpoint
- **Route:** `POST /connect/token` (OAuth 2.0)
- **Commands:** OAuth grant validation
- **Frontend Component:** Login page (per app - Employee, Growth, etc.)
- **Authorization:** Anonymous
- **Workflow:**
  1. User enters email and password on login page
  2. System validates credentials via Identity Server
  3. Checks user account status (active/inactive)
  4. Validates password (Argon2 hashing)
  5. Issues JWT token with user claims
  6. Creates user session record
  7. Updates last login date
  8. Redirects to application dashboard

#### 4.2 Change Password

- **Description:** Authenticated user changes their account password
- **Backend API:** `ChangePasswordController.ChangePassword()`
- **Route:** `PUT /api/management/users/changepassword`
- **Commands:** `ChangePasswordCommand`, `ChangePasswordCommandHandler`
- **Frontend Component:** Password change dialog in user profile
- **Authorization:** Authenticated user only
- **Workflow:**
  1. User opens change password dialog
  2. Enters current password and new password
  3. System validates current password
  4. Validates new password against policy (complexity, history)
  5. Updates password hash in database
  6. Invalidates all existing sessions
  7. Forces re-login with new password

#### 4.3 Two-Factor Authentication (2FA)

- **Description:** Enable additional security layer with authenticator or SMS OTP
- **Backend API:** `OtpController.RequestSmsOtp()` or identity server 2FA endpoints
- **Route:** `POST /api/otp/sms/request`
- **Commands:** `RequestSmsOtpCommand`, `ToggleUserFactorAuthCommand`
- **Frontend Component:** 2FA setup/verification dialogs
- **Authorization:** Authenticated user or anonymous (during login)
- **Workflow:**
  1. User/Admin enables 2FA for account
  2. User scans QR code with authenticator app or chooses SMS
  3. System generates shared secret or sends OTP
  4. User enters OTP to verify setup
  5. System saves 2FA configuration
  6. On next login: system requests 2FA verification
  7. User enters 2FA code before gaining access

#### 4.4 Password Reset (Self-Service)

- **Description:** User initiates password reset via email verification link
- **Backend API:** Password reset endpoints in Identity Server
- **Route:** `/reset-password`
- **Frontend Component:** Login page reset link, reset form
- **Authorization:** Anonymous
- **Workflow:**
  1. User clicks "Forgot Password" on login page
  2. Enters email address
  3. System generates secure reset token
  4. Sends email with reset link
  5. User clicks link (token validated)
  6. Enters new password meeting policy requirements
  7. System updates password, invalidates token
  8. User redirected to login

#### 4.5 Logout / Session Management

- **Description:** User logout and session termination
- **Backend API:** Identity Server `/connect/logout`
- **Route:** `POST /connect/logout`
- **Commands:** Session cleanup commands
- **Frontend Component:** Logout button (global)
- **Authorization:** Authenticated user
- **Workflow:**
  1. User clicks logout
  2. System invalidates JWT token
  3. Removes session record from database
  4. Updates last logout date
  5. Clears client-side cookies/tokens
  6. Redirects to login page

---

### 5. One-Time Password (OTP) Management

Handles generation and validation of temporary passwords for authentication and verification.

#### 5.1 Request SMS OTP

- **Description:** Generate and send SMS OTP for phone verification
- **Backend API:** `OtpController.RequestSmsOtp()`
- **Route:** `POST /api/otp/sms/request`
- **Commands:** `RequestSmsOtpCommand`, `RequestSmsOtpCommandHandler`
- **Frontend Component:** OTP request dialog
- **Authorization:** Anonymous (during registration/login)
- **Workflow:**
  1. User requests OTP for phone verification
  2. System validates phone number format
  3. Generates 6-digit random OTP
  4. Sets 5-10 minute expiration
  5. Sends SMS via SMS provider (Twilio, etc.)
  6. Stores OTP in database with expiration
  7. Returns success response

#### 5.2 Verify OTP

- **Description:** Validate OTP code entered by user
- **Backend API:** OTP verification endpoint
- **Route:** `POST /api/otp/verify`
- **Frontend Component:** OTP input form
- **Authorization:** Anonymous
- **Workflow:**
  1. User enters OTP from SMS
  2. System validates OTP against stored value
  3. Checks expiration time
  4. Validates action type (login, registration, etc.)
  5. If valid: marks verification as complete, deletes OTP
  6. If invalid: returns error, allows retry

---

### 6. Organizational Unit Roles Management

Advanced role management scoped to specific organizational units.

#### 6.1 Assign Organizational Unit Role to User

- **Description:** Grant user a role specific to organizational unit with limited scope
- **Backend API:** `OrganizationalUnitRolesController` (implied from controllers)
- **Route:** `POST /api/management/organizational-units/{unitId}/roles`
- **Commands:** `CreateUserOrganizationalUnitRoleCommand`
- **Frontend Component:** Role assignment in org unit context
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin selects user within org unit
  2. Chooses role to assign scoped to this org unit
  3. System creates org unit-scoped role assignment
  4. User gains role permissions only within org unit
  5. System publishes assignment event

#### 6.2 Get User Roles with Organizational Context

- **Description:** Retrieve all user roles with org unit scope information
- **Backend API:** Organizational unit user relationships query
- **Route:** `GET /api/management/organizational-units/{unitId}/users/{userId}/roles`
- **Queries:** `GetOrganizationalUnitUserRelationshipsQuery`
- **Frontend Component:** User role display component
- **Workflow:**
  1. System retrieves user role assignments
  2. Includes organizational unit context for each role
  3. Returns role permissions and scope
  4. Used for permission validation in UI

---

### 7. External User Management (B2B)

Manages limited-scope external/guest users for vendor and partner access.

#### 7.1 Create External User

- **Description:** Invite external vendor/partner user with limited access scope
- **Backend API:** `ExternalUsersController` (implied)
- **Route:** `POST /api/external-users`
- **Commands:** Related external user commands
- **Frontend Component:** External user creation form
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin invites external user with email
  2. Specifies allowed org units and features
  3. System creates limited customer user account
  4. Sends invitation email with temporary password
  5. External user logs in, changes password
  6. System enforces access restrictions

#### 7.2 View External Users

- **Description:** List and manage external user accounts and permissions
- **Backend API:** `ExternalUsersController.GetExternalUsers()`
- **Route:** `GET /api/external-users`
- **Frontend Component:** External user management table (`ExternalUserTableComponent`)
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin views list of external users
  2. Filters by status, assignment, department
  3. Displays user details and access scopes
  4. Actions: edit, deactivate, delete

#### 7.3 Edit External User Permissions

- **Description:** Modify scope and permissions for external user
- **Backend API:** External user edit endpoint
- **Route:** `PUT /api/external-users/{userId}`
- **Frontend Component:** `ExternalUserDetailComponent`
- **Authorization:** Policy = "UserManagement"
- **Workflow:**
  1. Admin opens external user detail page
  2. Modifies allowed org units or feature access
  3. System updates permissions
  4. Changes take effect immediately
  5. Returns confirmation

---

### 8. Account Settings & Company Configuration

Manages company-level settings and account configurations.

#### 8.1 Manage Company Settings

- **Description:** Configure company-wide account settings, branding, integrations
- **Backend API:** `CompanySettingsController` (implied)
- **Route:** `GET/PUT /api/company-settings`
- **Frontend Component:** Company settings form
- **Authorization:** Admin/Company Owner
- **Workflow:**
  1. Company admin accesses settings page
  2. Modifies settings (logo, timezone, language, etc.)
  3. System validates settings
  4. Updates company settings in database
  5. Publishes settings update event
  6. Applications reload configuration

#### 8.2 Access Plans Management

- **Description:** Define and manage access plans for users and licensing
- **Backend API:** `AccessPlansController`
- **Route:** `GET/POST /api/access-plans`
- **Commands:** Access plan commands
- **Frontend Component:** Access plans configuration
- **Authorization:** Admin
- **Workflow:**
  1. Admin creates access plan with feature entitlements
  2. Assigns users/groups to plans
  3. System enforces feature access based on plan
  4. Publishes access plan events
  5. License usage tracked

---

## Role Hierarchy & Permissions

### User Roles in Accounts Service

1. **System Administrator (Super Admin)**
   - Full access to all features across system
   - Can manage all companies and users
   - Can modify roles, permissions, and configurations
   - Can view audit logs and system settings

2. **Company Owner/Admin**
   - Full access within assigned company
   - Can manage users, roles, org units
   - Can configure company settings
   - Cannot manage other companies

3. **Manager/Supervisor**
   - Can create and manage users in assigned org units
   - Can assign roles within scope
   - Limited company settings access
   - View-only access to other org units

4. **Employee/User**
   - Can change own password
   - Can view own profile and org assignments
   - Cannot manage other users
   - Limited access based on assigned roles

5. **External/Guest User**
   - Restricted access to specific features
   - Limited to assigned org units
   - Cannot manage other users
   - Time-limited or feature-limited access

### Core Permissions

| Permission | Description | Level |
|-----------|-------------|-------|
| `user.create` | Create new user accounts | Admin |
| `user.edit` | Edit user information and status | Admin/Manager |
| `user.delete` | Delete user accounts | Admin |
| `user.view` | View user details | Admin/Manager/Self |
| `role.create` | Create roles | Admin |
| `role.edit` | Edit role properties and permissions | Admin |
| `role.delete` | Delete roles | Admin |
| `role.assign` | Assign roles to users | Admin/Manager |
| `orgunit.create` | Create organizational units | Admin |
| `orgunit.edit` | Edit org unit properties | Admin |
| `orgunit.delete` | Delete org units | Admin |
| `orgunit.manage-users` | Assign/remove users from org units | Admin/Manager |
| `password.change` | Change own password | All Authenticated |
| `password.reset` | Reset other user passwords | Admin/Manager |
| `2fa.setup` | Enable 2FA for account | All Authenticated |
| `external.manage` | Manage external user accounts | Admin |
| `settings.company` | Manage company settings | Admin/Owner |

---

## Frontend Components

### Account Management Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `UserFormComponent` | `bravo-domain/account/components/user-form` | Create/edit user form |
| `UserManagementComponent` | `bravo-domain/account/components/user-management` | User list and management interface |
| `UserManagementActionComponent` | `bravo-domain/account/components/user-management/user-management-action` | User action menu (activate, delete, reset) |
| `DeleteUserConfirmationDialog` | `bravo-domain/account/components/delete-user-comfirmation-dialog` | User deletion confirmation dialog |
| `ExternalUserTableComponent` | `bravo-domain/account/components/user-management/external-user-table` | External users list display |
| `ExternalUserDetailComponent` | `bravo-domain/account/components/external-user-detail` | External user details and editing |
| `ImportUsersComponent` | `bravo-domain/account/components/import-users` | Bulk user import from file |
| `RelocateUsersComponent` | `bravo-domain/account/components/user-management/relocate-users` | Move users between org units |
| `UserDeletionResultComponent` | `bravo-domain/account/components/user-deletion-result` | User deletion result summary |

### Authentication Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `LoginComponent` | `{app}/core/auth` | User login form and flow |
| `LogoutComponent` | `{app}/core/auth` | Logout handling |
| `MicrosoftLoginComponent` | `bravo-domain/account/components/microsoft-login` | Microsoft OAuth integration |
| `AuthGuard` | `bravo-domain/_shared/auth` | Route protection and auth validation |

---

## API Endpoint Summary

### User Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/management/users` | List users with pagination |
| `POST` | `/api/management/users` | Create new user |
| `PUT` | `/api/management/users/{userId}` | Update user information |
| `PUT` | `/api/management/users/{userId}/state` | Activate/deactivate user |
| `DELETE` | `/api/management/users` | Delete users (bulk) |
| `POST` | `/api/management/users/import` | Import users from file |
| `POST` | `/api/management/users/{userId}/reset-password` | Reset user password |
| `PUT` | `/api/management/users/changepassword` | Change own password |

### Role Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/management/roles` | List roles |
| `GET` | `/api/management/api/roles` | Get all roles (non-paged) |
| `POST` | `/api/management/roles` | Create role |
| `PUT` | `/api/management/roles/{roleId}` | Update role |
| `DELETE` | `/api/management/roles` | Delete role(s) |
| `POST` | `/api/management/roles/{roleId}/users` | Add users to role |
| `DELETE` | `/api/management/roles/{roleId}/users` | Remove users from role |

### Organizational Unit Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/management/organizational-units` | List org units with hierarchy |
| `POST` | `/api/management/organizational-units` | Create org unit |
| `PUT` | `/api/management/organizational-units/{unitId}` | Update org unit |
| `DELETE` | `/api/management/organizational-units/{unitId}` | Delete org unit |
| `POST` | `/api/management/organizational-units/{unitId}/users` | Assign users to org unit |
| `DELETE` | `/api/management/organizational-units/{unitId}/users` | Remove users from org unit |

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/connect/token` | OAuth 2.0 token endpoint (login) |
| `POST` | `/connect/logout` | Logout and revoke tokens |
| `POST` | `/api/otp/sms/request` | Request SMS OTP |

---

## Data Entities

### Core Domain Entities

```csharp
// User entity - extends ASP.NET Identity IdentityUser
ApplicationUser
├── Id: string
├── UserName: string
├── Email: string
├── PhoneNumber: string
├── FirstName: string
├── LastName: string
├── MiddleName: string
├── FullName: string (computed)
├── IsActive: bool
├── CreatedDate: DateTime
├── LastLoginDate: DateTime?
├── LastLogoutDate: DateTime?
├── PasswordModifiedDate: DateTime?
├── TwoFactorEnabled: bool
├── LockoutEndDateUtc: DateTime?
└── UserSessions: UserSession[]

// Role entity - extends ASP.NET Identity IdentityRole
ApplicationRole
├── Id: string
├── Name: string
├── Description: string
├── IsActive: bool
├── CreatedDate: DateTime
└── RoleClaims: IdentityRoleClaim[]

// Organizational Unit - department/team/cost center
OrganizationalUnit
├── Id: string
├── Code: string (unique)
├── Name: string
├── Description: string
├── ParentId: string? (hierarchy)
├── Status: OrganizationStatus
├── CreatedDate: DateTime
├── Users: OrganizationalUnitUser[]
└── ChildUnits: OrganizationalUnit[]

// User-OrgUnit relationship
OrganizationalUnitUser
├── Id: string
├── UserId: string
├── OrganizationalUnitId: string
├── User: ApplicationUser
└── OrganizationalUnit: OrganizationalUnit

// Org Unit scoped role
UserOrganizationalUnitRole
├── Id: string
├── UserId: string
├── RoleId: string
├── OrganizationalUnitId: string
└── AssignedDate: DateTime

// One-Time Password
OneTimePassword
├── Id: string
├── UserId: string
├── Code: string (hashed)
├── Type: OtpType (Sms/Email/Authenticator)
├── Action: OtpActionType (Login/Registration/PasswordReset)
├── ExpirationDate: DateTime
├── IsUsed: bool
└── CreatedDate: DateTime

// User Session tracking
UserSession
├── Id: string
├── UserId: string
├── SessionToken: string
├── IpAddress: string
├── UserAgent: string
├── LoginDate: DateTime
└── LogoutDate: DateTime?

// User Company association
UserCompanyInfo
├── UserId: string
├── CompanyId: string
├── JoinDate: DateTime
├── Department: string?
└── CostCenter: string?

// Access Plan - licensing/feature entitlement
AccessPlan
├── Id: string
├── Name: string
├── Description: string
├── Features: string[] (comma-separated)
├── MaxUsers: int
└── AccessPlanUsers: AccessPlanUser[]

// Company Settings
CompanySettings
├── CompanyId: string
├── LogoUrl: string?
├── TimeZone: string
├── Language: string
├── IsSelfServiceEnabled: bool
└── CustomProperties: Dictionary<string,string>
```

---

## Database Schema

### Key Tables

```sql
-- User accounts (extends AspNetUsers)
ApplicationUsers
├── Id (PK)
├── UserName
├── Email (unique per company)
├── PhoneNumber
├── FirstName, LastName, MiddleName
├── IsActive
├── PasswordHash
├── CreatedDate, ModifiedDate
├── LastLoginDate, LastLogoutDate
├── TwoFactorEnabled
└── Indexes: (Email, IsActive), (CreatedDate)

-- Roles
ApplicationRoles
├── Id (PK)
├── Name (unique)
├── Description
├── IsActive
├── CreatedDate
└── Index: (Name, IsActive)

-- User-Role assignments
UserRoles
├── UserId (FK)
├── RoleId (FK)
├── CreatedDate
└── Index: (UserId), (RoleId)

-- Organizational hierarchy
OrganizationalUnits
├── Id (PK)
├── Code (unique)
├── Name
├── Description
├── ParentId (FK to self)
├── CompanyId (FK)
├── Status (enum)
├── CreatedDate
└── Indexes: (ParentId), (Code), (CompanyId)

-- User-OrgUnit assignments
OrganizationalUnitUsers
├── UserId (FK)
├── OrganizationalUnitId (FK)
├── CreatedDate
└── Index: (UserId), (OrganizationalUnitId)

-- OrgUnit-scoped roles
UserOrganizationalUnitRoles
├── Id (PK)
├── UserId (FK)
├── RoleId (FK)
├── OrganizationalUnitId (FK)
├── CreatedDate
└── Index: (UserId, OrganizationalUnitId)

-- One-time passwords
OneTimePasswords
├── Id (PK)
├── UserId (FK)
├── CodeHash
├── Type (enum)
├── Action (enum)
├── ExpirationDate
├── IsUsed
├── CreatedDate
└── Index: (UserId, ExpirationDate), (Type)

-- User sessions
UserSessions
├── Id (PK)
├── UserId (FK)
├── SessionToken
├── IpAddress
├── UserAgent
├── LoginDate
├── LogoutDate
└── Index: (UserId, LoginDate)

-- Access plans
AccessPlans
├── Id (PK)
├── Name
├── Description
├── Features (json or csv)
├── MaxUsers
├── IsActive
└── Index: (Name)

-- Company settings
CompanySettings
├── CompanyId (FK)
├── LogoUrl
├── TimeZone
├── Language
├── CustomJson
└── Index: (CompanyId)
```

---

## Cross-Service Communication

### Message Bus Events Published

The Accounts service publishes the following events to message bus (RabbitMQ):

1. **User Events**
   - `UserCreated` - New user account created
   - `UserUpdated` - User profile/settings updated
   - `UserActivated` - User account activated
   - `UserDeactivated` - User account deactivated
   - `UserDeleted` - User account deleted
   - `UserPasswordChanged` - Password changed
   - `User2FAEnabled` - Two-factor authentication enabled

2. **Role Events**
   - `RoleCreated` - New role defined
   - `RoleUpdated` - Role modified
   - `RoleDeleted` - Role removed
   - `RoleAssigned` - Role assigned to user
   - `RoleUnassigned` - Role removed from user

3. **Organizational Unit Events**
   - `OrgUnitCreated` - New org unit created
   - `OrgUnitUpdated` - Org unit modified
   - `OrgUnitDeleted` - Org unit deleted
   - `UserAddedToOrgUnit` - User assigned to org unit
   - `UserRemovedFromOrgUnit` - User removed from org unit

4. **License/Access Events**
   - `UserLicenseAssigned` - License assigned to user
   - `UserLicenseRevoked` - License removed from user
   - `AccessPlanAssigned` - Access plan assigned

### Message Bus Events Consumed

Accounts service subscribes to events from other services:

1. **From Growth Service**
   - Employee data updates to sync user information

2. **From Talent Service**
   - Candidate/employee status changes for user sync

---

## Security Considerations

### Password Policy

- Minimum 8 characters
- Requires uppercase, lowercase, numbers, special characters
- Cannot reuse last 5 passwords
- Password reset required every 90 days (configurable)
- Failed login lockout: 5 attempts = 15 minute lockout

### Session Security

- JWT tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Session tracking on IP address and user agent
- Automatic logout on suspicious activity
- Token revocation on password change

### Multi-Tenancy

- Data completely isolated per company
- Email uniqueness per company (not global)
- Role isolation per company
- Org unit hierarchy per company
- Users cannot cross company boundaries

### Two-Factor Authentication

- TOTP (Time-based One-Time Password) via authenticator apps
- SMS OTP via SMS provider
- Backup codes for account recovery
- MFA enforcement policies per company

### Audit & Compliance

- All user changes logged with timestamp, who, what, why
- Login/logout tracking per session
- Password change history
- Role assignment/removal audit trail
- GDPR-compliant data retention policies

---

## Integration Patterns

### How Other Services Use Accounts

1. **Permission Validation**
   ```
   Service calls Permission Provider API
   -> Validates user token and extracts claims
   -> Checks role/org unit permissions
   -> Returns permission result
   ```

2. **User Sync**
   ```
   User created/updated in Accounts
   -> Message published to bus
   -> Growth, Talent services consume
   -> Sync user data locally for performance
   ```

3. **Org Unit Sync**
   ```
   Org unit created/updated in Accounts
   -> Message published to bus
   -> Growth service uses for reporting hierarchy
   -> Talent service uses for job assignment structure
   ```

---

## Common Use Cases

### New Employee Onboarding

1. HR admin creates user account
2. Assigns user to company org unit
3. Assigns user to department/team org units
4. Assigns user applicable roles (Manager, Employee, etc.)
5. User receives activation email
6. User logs in, changes password, sets up 2FA
7. External services (Growth, Talent) receive sync events
8. Employee data propagated to all services

### Department Reorganization

1. Admin creates new org unit structure
2. Moves users between org units
3. Updates user role assignments based on new structure
4. Publishes org unit change events
5. Growth service updates reporting hierarchy
6. Talent service updates job assignment structure

### Access Removal (Termination)

1. HR deactivates user account
2. System revokes all active sessions
3. User loses access to all applications
4. Account kept for audit trail (soft delete)
5. Related services receive user deactivated event
6. Services perform cleanup (remove access, revoke permissions)

### Permission Escalation

1. Manager needs special access
2. Admin assigns additional role scoped to org unit
3. Permission validation reflects new permissions
4. User claims updated in next session
5. UI reflects new capabilities
6. Audit trail records permission change

---

## Troubleshooting & FAQ

### User Cannot Login

1. Check if user account exists and is active
2. Verify email is correct
3. Check if account is locked due to failed attempts
4. Verify password is correct (case-sensitive)
5. Check if 2FA is configured but OTP not provided
6. Review session token validity

### Permission Denied Errors

1. Verify user role is assigned
2. Check if role has required permission
3. Verify org unit scope matches resource org unit
4. Check if user is member of required org unit
5. Clear browser cache/tokens and retry

### OTP Not Received

1. Verify phone number is correct
2. Check SMS provider status
3. Verify SMS limit not exceeded
4. Check OTP expiration time
5. Retry OTP request

### Password Reset Not Working

1. Verify email address is registered
2. Check email delivery (spam folder)
3. Verify reset token not expired (usually 24 hours)
4. Confirm password meets policy requirements
5. Check if account is locked

---

## Recent Updates

- **v1.5.0** (Dec 2025)
  - Enhanced 2FA with authenticator app support
  - Improved user session tracking
  - Added org unit user activity queries
  - Enhanced password policy enforcement

- **v1.4.0** (Oct 2025)
  - Bulk user import from CSV
  - External user (B2B) management
  - User deletion with cascade handling
  - Organizational unit sync improvements

- **v1.3.0** (Aug 2025)
  - OTP-based authentication
  - SMS integration for 2FA
  - Enhanced audit logging
  - Session management improvements

---

## Development Guidelines

### Adding New User Management Features

1. Create new command in `UseCaseCommands/UserCommands/`
2. Add command handler with validation
3. Create controller action in `UserManagementController`
4. Add frontend component in bravo-domain
5. Publish domain events for external services
6. Add integration tests
7. Document in API docs

### Adding New Roles/Permissions

1. Define permission name constant
2. Create role with permission assignments
3. Add authorization policy to controller
4. Test permission validation flow
5. Update role management UI
6. Document permission in requirements

### Multi-Tenancy Considerations

- Always filter by company ID in queries
- Never expose cross-company data
- Validate company context before operations
- Use company-scoped repositories
- Test isolation with multiple company scenarios

---

## Related Documentation

- [Accounts Service API Documentation](./API-DOCS.md) (if available)
- [Authentication & Authorization Guide](../../guides/authentication.md)
- [Multi-Tenancy Architecture](../../architecture/multi-tenancy.md)
- [Message Bus Integration](../../architecture/message-bus.md)
- [CQRS Pattern Implementation](../../patterns/cqrs.md)

---

**Last Updated:** December 30, 2025
**Maintained By:** Platform Team
**Status:** Active & Production Ready
