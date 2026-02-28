# Accounts Service - API Reference

## Overview

This document provides comprehensive API endpoint documentation for the Accounts service. For general service information, see [README.md](./README.md). For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Base URL:** `https://accounts-service.bravosuite.local`

**Default Port (Development):** `5003` (adjust based on your environment)

**Authentication:** All endpoints except login and password reset require JWT token in `Authorization: Bearer {token}` header.

---

## Table of Contents

1. [Authentication & Token Endpoints](#authentication--token-endpoints)
2. [User Management Endpoints](#user-management-endpoints)
3. [Role Management Endpoints](#role-management-endpoints)
4. [Organizational Unit Endpoints](#organizational-unit-endpoints)
5. [OTP Endpoints](#otp-endpoints)
6. [External User Endpoints](#external-user-endpoints)
7. [Company Settings Endpoints](#company-settings-endpoints)
8. [Error Codes & Status](#error-codes--status)

---

## Authentication & Token Endpoints

### POST /connect/token
Login and obtain JWT token.

**Route:** `POST /connect/token`

**Authentication:** None (Anonymous)

**Request Body:**
```json
{
  "grant_type": "password",
  "username": "user@example.com",
  "password": "SecurePassword123!",
  "client_id": "bravosuite-web"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "RefreshTokenValue123..."
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | invalid_grant | Invalid credentials |
| 400 | invalid_request | Missing required parameters |
| 403 | account_locked | Account locked due to failed attempts |
| 403 | user_inactive | User account is inactive |

**Notes:**
- JWT token expires in 15 minutes (900 seconds)
- Refresh token valid for 7 days
- Use refresh token to obtain new JWT without re-authenticating
- Maximum 5 failed login attempts before 15-minute lockout

---

### POST /connect/logout
Logout and revoke tokens.

**Route:** `POST /connect/logout`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "message": "Logout successful",
  "timestamp": "2025-12-31T10:30:00Z"
}
```

**Notes:**
- Invalidates JWT token
- Removes session record
- Clears all refresh tokens
- User must login again to gain access

---

## User Management Endpoints

### GET /api/management/users
List users with pagination and filtering.

**Route:** `GET /api/management/users`

**Authentication:** Required (Policy: "UserManagement")

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip` | int | 0 | Number of records to skip (pagination) |
| `take` | int | 50 | Number of records to return |
| `searchText` | string | null | Search by email, first name, last name |
| `isActive` | bool? | null | Filter by active status |
| `status` | string | null | Filter by user status |

**Example Request:**
```
GET /api/management/users?skip=0&take=20&searchText=john&isActive=true
```

**Success Response (200):**
```json
{
  "items": [
    {
      "id": "usr_123456",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "isActive": true,
      "createdDate": "2025-01-15T08:00:00Z",
      "lastLoginDate": "2025-12-31T10:15:00Z",
      "twoFactorEnabled": false
    }
  ],
  "totalCount": 150,
  "totalPages": 8,
  "currentPage": 1
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Insufficient permissions |
| 500 | Server error |

---

### POST /api/management/users
Create new user account.

**Route:** `POST /api/management/users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "email": "jane.smith@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "SecurePass123!",
  "phoneNumber": "+1-555-123-4567"
}
```

**Success Response (201):**
```json
{
  "id": "usr_789012",
  "email": "jane.smith@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "fullName": "Jane Smith",
  "isActive": true,
  "createdDate": "2025-12-31T10:30:00Z",
  "twoFactorEnabled": false,
  "message": "User created successfully"
}
```

**Validation Errors (400):**
```json
{
  "errors": {
    "email": ["Email must be unique"],
    "password": ["Password must contain uppercase, lowercase, numbers, and special characters"]
  }
}
```

**Rules:**
- Email must be unique per company (not globally unique)
- Password minimum 8 characters
- Requires uppercase, lowercase, numbers, special characters
- User created in Active status by default

---

### PUT /api/management/users/{userId}
Update user information.

**Route:** `PUT /api/management/users/{userId}`

**Authentication:** Required (Policy: "UserManagement" OR Own Profile)

**URL Parameters:**
- `userId` (string, required) - User ID to update

**Request Body:**
```json
{
  "email": "jane.smith.new@example.com",
  "firstName": "Jane",
  "lastName": "Smith-Williams",
  "phoneNumber": "+1-555-987-6543",
  "dateOfBirth": "1990-05-15"
}
```

**Success Response (200):**
```json
{
  "id": "usr_789012",
  "email": "jane.smith.new@example.com",
  "firstName": "Jane",
  "lastName": "Smith-Williams",
  "fullName": "Jane Smith-Williams",
  "phoneNumber": "+1-555-987-6543",
  "dateOfBirth": "1990-05-15",
  "isActive": true,
  "modifiedDate": "2025-12-31T10:45:00Z"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Email already exists or validation error |
| 404 | User not found |
| 403 | Forbidden - Cannot edit other user's profile |

---

### PUT /api/management/users/{userId}/state
Activate or deactivate user account.

**Route:** `PUT /api/management/users/{userId}/state`

**Authentication:** Required (Policy: "UserManagement")

**URL Parameters:**
- `userId` (string, required) - User ID to modify

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Employee terminated"
}
```

**Success Response (200):**
```json
{
  "id": "usr_789012",
  "isActive": false,
  "modifiedDate": "2025-12-31T10:50:00Z",
  "message": "User deactivated. Active sessions revoked."
}
```

**Side Effects:**
- If deactivating: Revokes all active sessions and tokens
- Publishes UserDeactivated or UserActivated event to message bus
- Related services receive notification for cleanup

---

### DELETE /api/management/users
Delete users (bulk operation).

**Route:** `DELETE /api/management/users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "userIds": ["usr_789012", "usr_345678"],
  "deleteRelatedData": true
}
```

**Success Response (200):**
```json
{
  "deleted": 2,
  "failed": 0,
  "results": [
    {
      "userId": "usr_789012",
      "status": "deleted",
      "message": "User and related data deleted"
    },
    {
      "userId": "usr_345678",
      "status": "deleted",
      "message": "User and related data deleted"
    }
  ]
}
```

**Notes:**
- Removes user from all organizational units
- Revokes all active sessions and tokens
- Deletes authentication tickets
- Publishes UserDeleted event
- Soft delete - data retained for audit trail

---

### POST /api/management/users/import
Bulk import users from CSV/Excel file.

**Route:** `POST /api/management/users/import`

**Authentication:** Required (Policy: "UserManagement")

**Content-Type:** `multipart/form-data`

**Request Parameters:**
- `file` (file, required) - CSV or Excel file with user data
- `sendInvitations` (bool, optional) - Send activation emails

**CSV Format:**
```
email,firstName,lastName,phoneNumber
john.doe@example.com,John,Doe,+1-555-123-4567
jane.smith@example.com,Jane,Smith,+1-555-987-6543
```

**Success Response (200):**
```json
{
  "imported": 100,
  "failed": 2,
  "total": 102,
  "failureDetails": [
    {
      "row": 45,
      "email": "invalid.email",
      "reason": "Invalid email format"
    }
  ],
  "message": "Import completed"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid file format |
| 413 | File too large |
| 422 | Processing error |

---

### POST /api/management/users/{userId}/reset-password
Send password reset link or reset directly.

**Route:** `POST /api/management/users/{userId}/reset-password`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "method": "email",
  "newPassword": null
}
```

**Methods:**
- `email` - Send reset link via email (optional step for user)
- `direct` - Set password directly (requires `newPassword` field)

**Success Response (200):**
```json
{
  "userId": "usr_789012",
  "method": "email",
  "message": "Password reset link sent to user@example.com",
  "resetTokenExpiry": "2026-01-01T10:30:00Z"
}
```

---

### PUT /api/management/users/changepassword
Change own password (authenticated user).

**Route:** `PUT /api/management/users/changepassword`

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully",
  "sessionStatus": "invalidated",
  "note": "Please login again with new password"
}
```

**Validation Errors (400):**
```json
{
  "errors": {
    "currentPassword": ["Current password is incorrect"],
    "newPassword": ["Password does not meet complexity requirements"]
  }
}
```

**Side Effects:**
- Invalidates all existing sessions
- Forces user to login with new password
- Publishes UserPasswordChanged event

---

## Role Management Endpoints

### GET /api/management/roles
List roles with pagination.

**Route:** `GET /api/management/roles`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip` | int | 0 | Records to skip |
| `take` | int | 50 | Records to return |
| `searchText` | string | null | Search by name or description |
| `isActive` | bool? | null | Filter by active status |

**Success Response (200):**
```json
{
  "items": [
    {
      "id": "role_001",
      "name": "Manager",
      "description": "Department manager with user management capabilities",
      "isActive": true,
      "permissions": ["user.create", "user.edit", "role.assign"],
      "userCount": 25,
      "createdDate": "2025-01-01T00:00:00Z"
    }
  ],
  "totalCount": 12,
  "totalPages": 1
}
```

---

### GET /api/management/api/roles
Get all roles (non-paged).

**Route:** `GET /api/management/api/roles`

**Authentication:** Required

**Success Response (200):**
```json
[
  {
    "id": "role_001",
    "name": "Administrator",
    "description": "System administrator with full access",
    "permissions": ["*"]
  },
  {
    "id": "role_002",
    "name": "Manager",
    "description": "Department manager",
    "permissions": ["user.create", "user.edit", "role.assign"]
  }
]
```

---

### POST /api/management/roles
Create new role.

**Route:** `POST /api/management/roles`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "name": "TeamLead",
  "description": "Team lead with limited management capabilities",
  "permissions": ["user.view", "user.edit", "role.assign"]
}
```

**Success Response (201):**
```json
{
  "id": "role_123",
  "name": "TeamLead",
  "description": "Team lead with limited management capabilities",
  "permissions": ["user.view", "user.edit", "role.assign"],
  "isActive": true,
  "createdDate": "2025-12-31T11:00:00Z"
}
```

**Validation Errors (400):**
```json
{
  "errors": {
    "name": ["Role name must be unique"],
    "permissions": ["Invalid permission specified"]
  }
}
```

---

### PUT /api/management/roles/{roleId}
Update role properties and permissions.

**Route:** `PUT /api/management/roles/{roleId}`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "name": "TeamLead",
  "description": "Updated team lead description",
  "permissions": ["user.view", "user.edit", "role.assign", "orgunit.manage-users"]
}
```

**Success Response (200):**
```json
{
  "id": "role_123",
  "name": "TeamLead",
  "description": "Updated team lead description",
  "permissions": ["user.view", "user.edit", "role.assign", "orgunit.manage-users"],
  "isActive": true,
  "modifiedDate": "2025-12-31T11:05:00Z",
  "affectedUsers": 25
}
```

**Notes:**
- Changes affect all users with this role immediately
- Publishes RoleUpdated event
- Returns count of affected users

---

### DELETE /api/management/roles
Delete role(s).

**Route:** `DELETE /api/management/roles`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "roleIds": ["role_123", "role_456"]
}
```

**Success Response (200):**
```json
{
  "deleted": 2,
  "failed": 0,
  "results": [
    {
      "roleId": "role_123",
      "name": "TeamLead",
      "status": "deleted"
    },
    {
      "roleId": "role_456",
      "name": "Consultant",
      "status": "deleted"
    }
  ]
}
```

**Preconditions:**
- Role must have no active assignments
- Returns error if users still have the role

---

### POST /api/management/roles/{roleId}/users
Add users to role.

**Route:** `POST /api/management/roles/{roleId}/users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "userIds": ["usr_001", "usr_002", "usr_003"]
}
```

**Success Response (200):**
```json
{
  "roleId": "role_123",
  "assigned": 3,
  "failed": 0,
  "results": [
    {
      "userId": "usr_001",
      "status": "assigned",
      "message": "User assigned to role"
    }
  ]
}
```

**Validation:**
- Users must exist
- Users must not already have this role
- User must be in valid company context

---

### DELETE /api/management/roles/{roleId}/users
Remove users from role.

**Route:** `DELETE /api/management/roles/{roleId}/users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "userIds": ["usr_001", "usr_002"]
}
```

**Success Response (200):**
```json
{
  "roleId": "role_123",
  "unassigned": 2,
  "failed": 0,
  "message": "Users removed from role"
}
```

**Side Effects:**
- User loses all associated permissions
- Active sessions updated with new permission set
- Publishes RoleUnassigned event

---

## Organizational Unit Endpoints

### GET /api/management/organizational-units
List organizational units with hierarchy.

**Route:** `GET /api/management/organizational-units`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip` | int | 0 | Records to skip |
| `take` | int | 50 | Records to return |
| `parentId` | string | null | Filter by parent unit |
| `includeTree` | bool | false | Include full hierarchy tree |

**Success Response (200):**
```json
{
  "items": [
    {
      "id": "org_001",
      "code": "ENG",
      "name": "Engineering",
      "description": "Engineering Department",
      "parentId": null,
      "status": "Active",
      "userCount": 45,
      "childUnitsCount": 3,
      "createdDate": "2025-01-01T00:00:00Z"
    }
  ],
  "totalCount": 25,
  "totalPages": 1
}
```

---

### POST /api/management/organizational-units
Create new organizational unit.

**Route:** `POST /api/management/organizational-units`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "code": "ENG-WEB",
  "name": "Web Engineering",
  "description": "Web application development team",
  "parentId": "org_001"
}
```

**Success Response (201):**
```json
{
  "id": "org_123",
  "code": "ENG-WEB",
  "name": "Web Engineering",
  "description": "Web application development team",
  "parentId": "org_001",
  "status": "Active",
  "createdDate": "2025-12-31T11:15:00Z"
}
```

**Validation:**
- Code must be unique within company
- Parent org unit must exist (if specified)
- Name is required

---

### PUT /api/management/organizational-units/{unitId}
Update organizational unit.

**Route:** `PUT /api/management/organizational-units/{unitId}`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "name": "Web Engineering Team",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "id": "org_123",
  "code": "ENG-WEB",
  "name": "Web Engineering Team",
  "description": "Updated description",
  "status": "Active",
  "modifiedDate": "2025-12-31T11:20:00Z"
}
```

---

### DELETE /api/management/organizational-units/{unitId}
Delete organizational unit.

**Route:** `DELETE /api/management/organizational-units/{unitId}`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "moveUsersToParentId": "org_001",
  "moveChildUnitsToParentId": "org_001"
}
```

**Success Response (200):**
```json
{
  "unitId": "org_123",
  "status": "deleted",
  "usersRelocated": 12,
  "childUnitsRelocated": 2,
  "message": "Organizational unit deleted successfully"
}
```

**Notes:**
- Prompts for action on child units and users
- Cascade updates related role assignments
- Publishes OrgUnitDeleted event

---

### POST /api/management/organizational-units/{unitId}/users
Assign users to organizational unit.

**Route:** `POST /api/management/organizational-units/{unitId}/users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "userIds": ["usr_001", "usr_002", "usr_003"]
}
```

**Success Response (200):**
```json
{
  "unitId": "org_123",
  "assigned": 3,
  "failed": 0,
  "message": "Users assigned to organizational unit"
}
```

**Side Effects:**
- Users can now receive org unit-scoped role assignments
- Publishes UserAddedToOrgUnit event
- Users gain access to org unit data and features

---

### DELETE /api/management/organizational-units/{unitId}/users
Remove users from organizational unit.

**Route:** `DELETE /api/management/organizational-units/{unitId}/users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "userIds": ["usr_001", "usr_002"]
}
```

**Success Response (200):**
```json
{
  "unitId": "org_123",
  "removed": 2,
  "failed": 0,
  "rolesRemoved": 4,
  "message": "Users removed from organizational unit"
}
```

**Side Effects:**
- Cascades removal of org unit-scoped roles
- Publishes UserRemovedFromOrgUnit event
- Users lose org unit access

---

## OTP Endpoints

### POST /api/otp/sms/request
Request SMS OTP for phone verification.

**Route:** `POST /api/otp/sms/request`

**Authentication:** Optional (Anonymous or Authenticated)

**Request Body:**
```json
{
  "phoneNumber": "+1-555-123-4567",
  "actionType": "login",
  "userId": "usr_123456"
}
```

**Action Types:**
- `login` - OTP for login/2FA
- `registration` - OTP for account registration
- `passwordReset` - OTP for password reset verification
- `phoneVerification` - OTP for phone number verification

**Success Response (200):**
```json
{
  "otpId": "otp_789",
  "phoneNumber": "+1-555-***-4567",
  "expirySeconds": 300,
  "message": "OTP sent successfully"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid phone number format |
| 429 | Rate limit exceeded (max 3 OTP requests per 10 minutes) |
| 503 | SMS provider unavailable |

**Notes:**
- OTP valid for 5-10 minutes (300-600 seconds)
- 6-digit numeric code
- Sent via Twilio or configured SMS provider
- Rate limited: max 3 requests per 10 minutes per phone

---

### POST /api/otp/verify
Verify OTP code.

**Route:** `POST /api/otp/verify`

**Authentication:** Optional

**Request Body:**
```json
{
  "otpId": "otp_789",
  "code": "123456",
  "actionType": "login"
}
```

**Success Response (200):**
```json
{
  "verified": true,
  "message": "OTP verified successfully",
  "verificationToken": "verify_token_abc123"
}
```

**Error Responses (400):**
```json
{
  "verified": false,
  "error": "OTP_INVALID",
  "message": "Invalid OTP code",
  "attemptsRemaining": 2
}
```

**Error Codes:**

| Code | Description |
|------|-------------|
| OTP_INVALID | Code doesn't match or is incorrect |
| OTP_EXPIRED | OTP has expired |
| OTP_USED | OTP already used (single-use) |
| MAX_ATTEMPTS_EXCEEDED | Too many failed attempts |

**Notes:**
- Maximum 3 verification attempts per OTP
- OTP is single-use
- Auto-deletes after successful verification

---

## External User Endpoints

### GET /api/external-users
List external/guest user accounts.

**Route:** `GET /api/external-users`

**Authentication:** Required (Policy: "UserManagement")

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `skip` | int | Records to skip |
| `take` | int | Records to return |
| `status` | string | Filter by active/inactive |

**Success Response (200):**
```json
{
  "items": [
    {
      "id": "ext_001",
      "email": "vendor@external.com",
      "firstName": "External",
      "lastName": "User",
      "isActive": true,
      "accessScope": ["org_unit_1", "org_unit_2"],
      "expiryDate": "2026-12-31",
      "createdDate": "2025-06-01T00:00:00Z"
    }
  ],
  "totalCount": 15
}
```

---

### POST /api/external-users
Create external user account.

**Route:** `POST /api/external-users`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "email": "partner@vendor.com",
  "firstName": "Partner",
  "lastName": "Name",
  "allowedOrgUnitIds": ["org_001", "org_002"],
  "allowedFeatures": ["reporting", "dashboard"],
  "expiryDate": "2026-12-31"
}
```

**Success Response (201):**
```json
{
  "id": "ext_002",
  "email": "partner@vendor.com",
  "firstName": "Partner",
  "lastName": "Name",
  "isActive": true,
  "accessScope": ["org_001", "org_002"],
  "allowedFeatures": ["reporting", "dashboard"],
  "expiryDate": "2026-12-31",
  "invitationLink": "https://bravosuite.local/accept-invitation?token=invite_abc123",
  "message": "External user created and invitation sent"
}
```

---

### PUT /api/external-users/{userId}
Update external user permissions.

**Route:** `PUT /api/external-users/{userId}`

**Authentication:** Required (Policy: "UserManagement")

**Request Body:**
```json
{
  "allowedOrgUnitIds": ["org_001", "org_003"],
  "allowedFeatures": ["reporting", "analytics"],
  "expiryDate": "2026-06-30"
}
```

**Success Response (200):**
```json
{
  "id": "ext_002",
  "accessScope": ["org_001", "org_003"],
  "allowedFeatures": ["reporting", "analytics"],
  "expiryDate": "2026-06-30",
  "modifiedDate": "2025-12-31T11:30:00Z"
}
```

---

## Company Settings Endpoints

### GET /api/company-settings
Get company-wide settings.

**Route:** `GET /api/company-settings`

**Authentication:** Required

**Success Response (200):**
```json
{
  "companyId": "comp_001",
  "logoUrl": "https://cdn.example.com/logo.png",
  "timeZone": "America/New_York",
  "language": "en-US",
  "isSelfServiceEnabled": true,
  "customProperties": {
    "theme": "dark",
    "requiresApproval": true
  }
}
```

---

### PUT /api/company-settings
Update company settings.

**Route:** `PUT /api/company-settings`

**Authentication:** Required (Policy: Admin/Owner)

**Request Body:**
```json
{
  "logoUrl": "https://cdn.example.com/new-logo.png",
  "timeZone": "America/Los_Angeles",
  "language": "es-ES",
  "isSelfServiceEnabled": false,
  "customProperties": {
    "theme": "light"
  }
}
```

**Success Response (200):**
```json
{
  "companyId": "comp_001",
  "logoUrl": "https://cdn.example.com/new-logo.png",
  "timeZone": "America/Los_Angeles",
  "language": "es-ES",
  "isSelfServiceEnabled": false,
  "modifiedDate": "2025-12-31T11:45:00Z"
}
```

---

## Error Codes & Status

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request successful, no response body |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Common Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred",
    "details": {
      "email": ["Email is required", "Email must be valid"],
      "password": ["Password must be at least 8 characters"]
    },
    "timestamp": "2025-12-31T12:00:00Z"
  }
}
```

### Business Logic Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| USER_NOT_FOUND | 404 | User account doesn't exist |
| USER_ALREADY_EXISTS | 409 | User with email already exists |
| USER_INACTIVE | 403 | User account is inactive |
| INVALID_CREDENTIALS | 400 | Email or password incorrect |
| ACCOUNT_LOCKED | 403 | Account locked due to failed login attempts |
| PERMISSION_DENIED | 403 | User lacks required permission |
| ROLE_NOT_FOUND | 404 | Role doesn't exist |
| ORGUNIT_NOT_FOUND | 404 | Organizational unit doesn't exist |
| OTP_INVALID | 400 | OTP code is invalid or expired |
| OTP_RATE_LIMIT | 429 | Too many OTP requests |

---

## Authentication Examples

### Using Bearer Token

```bash
curl -X GET https://accounts-service.local/api/management/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Refreshing Token

```bash
curl -X POST https://accounts-service.local/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=RefreshTokenValue123&client_id=bravosuite-web"
```

---

## Rate Limiting

The Accounts service implements rate limiting to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /connect/token | 5 requests | Per 15 minutes per IP |
| POST /api/otp/sms/request | 3 requests | Per 10 minutes per phone |
| POST /api/otp/verify | 3 attempts | Per OTP |
| GET /api/management/* | 100 requests | Per minute per user |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640923200
```

---

## Request/Response Pagination

All list endpoints support pagination:

**Request:**
```
GET /api/management/users?skip=10&take=20
```

**Response:**
```json
{
  "items": [...],
  "totalCount": 150,
  "totalPages": 8,
  "currentPage": 1,
  "skip": 10,
  "take": 20
}
```

---

## Related Documentation

- [README.md](./README.md) - Service overview and architecture
- [INDEX.md](./INDEX.md) - Quick navigation and feature summary
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and debugging

---

**Last Updated:** December 31, 2025
**API Version:** 1.5.0
**Status:** Production Ready
**Maintained By:** Platform Team
