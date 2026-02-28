# Accounts Service - Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when using the Accounts service. For API reference, see [API-REFERENCE.md](./API-REFERENCE.md). For general information, see [README.md](./README.md).

---

## Table of Contents

1. [Authentication & Login Issues](#authentication--login-issues)
2. [Permission & Authorization Issues](#permission--authorization-issues)
3. [Multi-Tenancy Problems](#multi-tenancy-problems)
4. [User Management Issues](#user-management-issues)
5. [OTP & 2FA Issues](#otp--2fa-issues)
6. [Password Reset Issues](#password-reset-issues)
7. [API & Integration Issues](#api--integration-issues)
8. [Database & Performance Issues](#database--performance-issues)
9. [Debugging Steps](#debugging-steps)
10. [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)

---

## Authentication & Login Issues

### User Cannot Login

**Symptom:** User receives "Invalid credentials" or login fails

**Possible Causes:**

1. **Incorrect Password**
   - Passwords are case-sensitive
   - Verify caps lock is off
   - Check for leading/trailing spaces in password field

2. **User Account Not Active**
   - Admin may have deactivated the account
   - Account may be in pending activation status
   - Solution: Contact admin to activate account

3. **Account Locked**
   - Too many failed login attempts (5 attempts = 15-minute lockout)
   - Wait 15 minutes for automatic unlock
   - Contact admin to force unlock

4. **Wrong Company/Tenant**
   - Logging in with email from different company
   - Each company has isolated user database
   - Solution: Use correct company portal/URL

5. **Email Not Registered**
   - User email doesn't exist in system
   - Check email spelling
   - Contact admin to create account

**Debugging Steps:**

```bash
# Check if user exists (as admin)
GET /api/management/users?searchText=user@example.com

# Check user status
Response should show:
- isActive: true
- No lockout date in future

# If user locked, use:
PUT /api/management/users/{userId}/state
{
  "isActive": true
}
```

**Solution Workflow:**

1. Verify email spelling and company
2. Check user status: active or deactivated?
3. Check if account locked (try again after 15 min)
4. Reset password (admin sends link)
5. If user still exists, contact admin

---

### Session Expires Too Quickly

**Symptom:** Logged in user gets logged out within minutes

**Possible Causes:**

1. **JWT Token Expiration**
   - JWT tokens expire every 15 minutes
   - Browser should auto-refresh using refresh token
   - If refresh fails, user logs out

2. **Refresh Token Expired**
   - Refresh tokens expire in 7 days
   - After 7 days inactive, need to login again
   - Normal behavior

3. **Password Changed Recently**
   - All existing tokens invalidated on password change
   - User must login again with new password
   - Normal security measure

4. **Browser Issue**
   - Cookies/localStorage cleared
   - Refresh token lost
   - Try different browser

5. **Server Clock Skew**
   - Server and client time out of sync
   - Tokens validated based on server time
   - Solution: Sync system clock

**Debugging Steps:**

```bash
# Check token expiration in browser console
const token = localStorage.getItem('access_token');
const decoded = jwt_decode(token);
console.log(decoded.exp); // Unix timestamp

# Check current server time
GET /api/health/time
// Returns current server time

# Compare with local time
const serverTime = response.timestamp;
const localTime = new Date();
console.log(serverTime - localTime);
```

**Solutions:**

1. Normal behavior - 15-minute JWT + auto-refresh
2. Refresh token expired - login again
3. Verify system clock sync (within 5 seconds)
4. Check browser localStorage/cookies enabled
5. Clear cache and try incognito/private mode

---

### 2FA Blocking Login

**Symptom:** User enters correct password but then can't complete 2FA

**Possible Causes:**

1. **OTP Not Received**
   - SMS provider issue
   - Phone number incorrect
   - See: [OTP Not Received](#otp-not-received)

2. **Wrong OTP Code**
   - TOTP time drift (phone clock off)
   - Entered incorrect code
   - OTP expired (valid ~30 seconds)

3. **2FA Configuration Issue**
   - 2FA not properly set up
   - Backup codes missing

**Solutions:**

1. **For SMS OTP:**
   - Check phone number is correct
   - Wait 30 seconds for SMS
   - Don't include spaces in code
   - Have phone's time set to auto-sync

2. **For Authenticator App:**
   - Verify phone/app clock is accurate
   - Enter code within 30-second window
   - Don't refresh app during code generation

3. **Backup Codes:**
   - If lost, contact admin to reset 2FA
   - Use backup code if available
   - Contact support@bravosuite.local

---

## Permission & Authorization Issues

### Permission Denied Errors

**Symptom:** User gets 403 Forbidden when performing action (e.g., "Access Denied")

**Possible Causes:**

1. **User Missing Required Role**
   - User not assigned role with needed permission
   - Role was recently removed
   - Solution: Assign correct role

2. **Role Missing Permission**
   - Role defined but doesn't include permission
   - Admin modified role, removing permission
   - Solution: Contact admin to grant permission

3. **Organization Unit Scope Mismatch**
   - User assigned to Dept A, trying to manage Dept B
   - Org unit scoping prevents cross-unit access
   - Solution: Assign user to correct org unit

4. **User Not in Organization Unit**
   - User assigned to company but not specific org unit
   - Some actions require org unit membership
   - Solution: Add user to required org unit

5. **Company Context Missing**
   - API request missing company context
   - Cross-company access attempt
   - Solution: Verify correct company in request

**Debugging Steps:**

```bash
# 1. Get user's roles
GET /api/management/users?searchText=user@example.com
# Check "roles" in response

# 2. Get role details
GET /api/management/api/roles
# Find role and check "permissions" array

# 3. Get user's org units
GET /api/management/organizational-units
# Verify user is listed under expected units

# 4. Check required permission
# For each action, docs list required permission
# Example: "policy: UserManagement" requires user.* permissions
```

**Solution Workflow:**

1. Identify required permission (check API docs)
2. Check if user has role with that permission
3. If not, assign appropriate role
4. If role missing permission, grant permission to role
5. Verify org unit scope if applicable
6. Test action again

**Example:**

```json
// Error: Permission Denied creating users
// Required: Policy = "UserManagement"
// Required permissions: user.create

// Step 1: Check user's roles
GET /api/management/users?searchText=user@example.com
// Response: roles: ["employee"] (doesn't have manager role)

// Step 2: Assign manager role
POST /api/management/roles/{managerId}/users
{
  "userIds": ["user123"]
}

// Step 3: Retry action
```

---

### User Can't View Other Users

**Symptom:** User logged in but can't see user list (blank or forbidden)

**Possible Causes:**

1. **Insufficient Read Permission**
   - User needs `user.view` or higher
   - Only managers/admins see full list

2. **Organization Unit Filtering**
   - User only sees users in their org units
   - Cannot see users in other departments

3. **Company Isolation**
   - User only sees users from their company
   - Cannot see other company users

**Solutions:**

1. For manager role: Use `user.view` permission
2. For org unit scope: Add user to multiple org units if needed
3. For cross-company: Not supported (by design)

---

## Multi-Tenancy Problems

### Data from Wrong Company Visible

**Symptom:** User sees data from multiple companies or unauthorized company

**Severity:** High - Security Issue

**Root Cause:** Code bypass of company filtering

**Immediate Actions:**

1. **Audit Access:**
   ```bash
   # Check user's actual company
   GET /api/management/users/{userId}
   # Look for companyId field

   # Verify no cross-company data accessed
   # Check audit logs for unauthorized queries
   ```

2. **Isolate User:**
   ```bash
   # Deactivate user immediately
   PUT /api/management/users/{userId}/state
   {
     "isActive": false,
     "reason": "Security audit - multi-company data access"
   }
   ```

3. **Report:**
   - Contact security@bravosuite.local
   - Provide affected user ID
   - Include timeline of access

**Prevention:**

- All queries must filter by `RequestContext.CurrentCompanyId()`
- Use company-scoped repositories
- Test with multiple company scenarios
- Code review must verify company filtering

---

### User Assigned to Wrong Company

**Symptom:** User created in Company A, should be in Company B

**Solution:**

1. **For Active User:**
   ```bash
   # Option 1: Delete and recreate
   DELETE /api/management/users
   {
     "userIds": ["userId"]
   }

   # Switch to Company B tenant context
   # Create user again
   ```

   Or:

   ```bash
   # Option 2: Contact DBA
   # Direct database transfer of user to correct company
   # (requires schema knowledge)
   ```

2. **Verification:**
   ```bash
   # Verify user now in correct company
   GET /api/management/users?searchText=user@example.com
   # Confirm companyId matches expected value
   ```

---

## User Management Issues

### Cannot Delete User

**Symptom:** Delete user returns error or "user in use"

**Possible Causes:**

1. **User Has Active Role Assignments**
   - Remove user from all roles first
   - Then delete

2. **User in Organizational Units**
   - Remove from org units
   - Remove org unit-scoped roles
   - Then delete

3. **User Has Active Sessions**
   - Sessions auto-deleted on user deactivation
   - Then user can be deleted

4. **Permission Issue**
   - Requires `user.delete` permission
   - Admin access required

**Solution Workflow:**

```bash
# 1. Deactivate user first
PUT /api/management/users/{userId}/state
{
  "isActive": false
}

# 2. Remove from all roles
DELETE /api/management/roles/{roleId}/users
{
  "userIds": ["userId"]
}

# 3. Remove from all org units
DELETE /api/management/organizational-units/{unitId}/users
{
  "userIds": ["userId"]
}

# 4. Delete user
DELETE /api/management/users
{
  "userIds": ["userId"]
}
```

---

### Bulk Import Failing

**Symptom:** User import fails, shows validation errors

**Common Issues:**

1. **Invalid Email Format**
   ```
   Error: "Invalid email format"
   Solution: Ensure email@domain.com format
   ```

2. **Duplicate Emails**
   ```
   Error: "Email already exists"
   Solution: Remove duplicates from file, check existing users
   ```

3. **Missing Required Fields**
   ```
   Error: "firstName required"
   Solution: Ensure all required columns in CSV
   ```

4. **Password Doesn't Meet Policy**
   ```
   Error: "Password must contain uppercase, lowercase, number, special"
   Solution: If auto-generating, system creates compliant passwords
   ```

5. **File Format Issue**
   ```
   Error: "Invalid file format"
   Solution: Use CSV or Excel (.xlsx) format
   ```

**Solutions:**

```bash
# 1. Validate CSV before upload
# Required columns: email, firstName, lastName
# Optional: phoneNumber

# 2. Check for duplicates
# In file: Use spreadsheet remove duplicates
# In system: GET /api/management/users?searchText=email

# 3. Test with small batch first
# Upload 5 users, check success
# Then retry larger batch

# 4. Check response for details
# Response shows which rows failed and why
POST /api/management/users/import
# Check failureDetails array in response
```

---

### User Not Receiving Reset Password Email

**Symptom:** Admin sends password reset, user doesn't receive email

**Possible Causes:**

1. **Email Delivery Issue**
   - Email provider (SendGrid, etc.) down
   - Email blacklisted/spam folder
   - Email domain issue

2. **Incorrect Email Address**
   - User email typo in system
   - Inactive email

3. **Token Expired**
   - Reset link valid 24 hours
   - Link clicked too late

**Debugging Steps:**

```bash
# 1. Verify user email in system
GET /api/management/users?searchText=name
# Check email field is correct

# 2. Check email service status
# Contact DevOps to verify SendGrid/email service running

# 3. Check email logs
# DevOps can check email provider logs for delivery status

# 4. Check spam folder
# Request user check spam/junk folder

# 5. Resend reset link
POST /api/management/users/{userId}/reset-password
{
  "method": "email"
}
```

**Solutions:**

1. Fix email address: PUT /api/management/users/{userId} with correct email
2. Resend reset link: POST reset-password again
3. Use direct password reset: POST reset-password with "direct" method and new password
4. Contact DevOps if email service issue

---

## OTP & 2FA Issues

### OTP Not Received

**Symptom:** User requests OTP but SMS never arrives

**Possible Causes:**

1. **Phone Number Invalid**
   - Wrong format (include country code: +1-555-123-4567)
   - Typo in number
   - Number doesn't support SMS

2. **SMS Provider Issue**
   - Twilio/service down
   - Account overquota
   - Regional restrictions

3. **Rate Limiting**
   - Max 3 OTP requests per 10 minutes per phone
   - Wait before requesting again

4. **Spam Filters**
   - Phone carrier blocking SMS
   - Temporary service block

**Debugging Steps:**

```bash
# 1. Verify phone format
# Must be: +1-555-123-4567 (country code required)

# 2. Check if SMS service running (DevOps)
# Query SMS provider status

# 3. Check OTP request rate
# User cannot request more than 3 times in 10 minutes

# 4. Verify user hasn't exceeded daily SMS limit
# Default: 10 SMS per day per user

# 5. Check SMS provider logs
# DevOps can check Twilio logs for delivery status
```

**Solutions:**

1. **User Actions:**
   - Verify phone number format with country code
   - Check spam/SMS filters
   - Whitelist sender (if provider allows)
   - Wait 10 minutes before retrying
   - Use backup OTP method if available

2. **Admin Actions:**
   - Resend OTP after 10 minutes
   - Use backup OTP method (email or authenticator)
   - Contact Twilio support if service issue
   - Check SMS provider account status and quota

---

### 2FA Backup Codes Lost

**Symptom:** User lost 2FA backup codes and can't login

**User Actions:**

1. Contact admin/support
2. Provide identity verification
3. Admin resets 2FA on account

**Admin Actions:**

```bash
# 1. Reset user's 2FA settings
PUT /api/management/users/{userId}
{
  "twoFactorEnabled": false
}

# 2. User can now login without 2FA
# 3. After login, user re-enables 2FA
# 4. System generates new backup codes
```

**Prevention:**

- Provide backup codes in secure format
- Educate users to store securely
- Support account recovery flow

---

### Authenticator App Shows Wrong Code

**Symptom:** TOTP code from authenticator app doesn't work

**Possible Causes:**

1. **Phone Clock Out of Sync**
   - TOTP depends on accurate time
   - System rejects codes if time > 30 seconds off

2. **Code Entered Slowly**
   - TOTP valid only ~30 seconds
   - Code expires before entry completes

3. **Authenticator App Issue**
   - App not synced with account
   - Wrong account scanned

4. **Server Clock Skew**
   - Server time not accurate
   - Rejects all TOTP codes

**Solutions:**

```bash
# For user:
# 1. Sync phone time automatically
#    Settings > Date & Time > Auto-sync

# 2. Re-add account to authenticator app
#    Remove account from app
#    Use QR code from 2FA setup to re-add

# 3. Use backup codes instead
#    Each backup code single-use

# For admin (if server clock issue):
# Check server time
systemctl status ntp
# or
timedatectl

# Sync server time
systemctl restart ntp
# or
timedatectl set-ntp true
```

---

## Password Reset Issues

### Password Reset Link Expired

**Symptom:** User clicks reset link but gets "token expired" error

**Cause:** Reset link valid only 24 hours

**Solution:**

1. User requests new reset link
   - "Forgot Password" on login page
   - Receives new link

2. Admin sends new reset link
   ```bash
   POST /api/management/users/{userId}/reset-password
   {
     "method": "email"
   }
   ```

**Prevention:**

- Send reset links close to when user will use them
- Set longer token expiration if needed (contact DevOps)
- Send multiple links if needed

---

### New Password Doesn't Meet Policy

**Symptom:** Password change rejected for complexity

**Password Policy:**
- Minimum 8 characters
- Requires uppercase letter (A-Z)
- Requires lowercase letter (a-z)
- Requires number (0-9)
- Requires special character (!@#$%^&*)
- Cannot reuse last 5 passwords

**Examples:**

| Password | Valid | Reason |
|----------|-------|--------|
| `Secure!Pass123` | Yes | Meets all requirements |
| `password123` | No | No uppercase, no special char |
| `Password123` | No | No special character |
| `Pass!123` | Yes | Meets all requirements |
| `A1!bcdef` | Yes | Meets all requirements |

**Solution:**

Create password with:
1. At least 8 characters
2. One uppercase (A-Z)
3. One lowercase (a-z)
4. One number (0-9)
5. One special (!@#$%^&*)

Example: `NewPass!123` or `Secure@Pwd456`

---

## API & Integration Issues

### Invalid Token / Token Expired

**Symptom:** API returns 401 Unauthorized

**Causes:**

1. **Token Expired**
   - JWT tokens valid 15 minutes
   - Solution: Refresh token or login again

2. **Token Malformed**
   - Incorrect format in Authorization header
   - Should be: `Authorization: Bearer {token}`

3. **Token Invalid**
   - Token from different service/issuer
   - Token signature doesn't match

4. **Token Not Provided**
   - Missing Authorization header
   - Solution: Add `Authorization: Bearer {token}` header

**Debugging:**

```bash
# Check token format
curl -X GET https://api.example.com/endpoint \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -v

# Verify header present in response
# Should see: < HTTP/1.1 200 OK (not 401)

# Decode JWT (don't share in public)
# Use jwt.io to see token contents
```

**Solutions:**

1. **Token expired:**
   ```bash
   # Refresh token
   POST /connect/token
   {
     "grant_type": "refresh_token",
     "refresh_token": "{refresh_token}",
     "client_id": "bravosuite-web"
   }

   # Or login again
   POST /connect/token
   {
     "grant_type": "password",
     "username": "user@example.com",
     "password": "password"
   }
   ```

2. **Token format wrong:**
   - Ensure: `Authorization: Bearer {token}` (space between Bearer and token)

3. **Using old token:**
   - Don't cache tokens long-term
   - Refresh before each request or on 401

---

### Rate Limit Exceeded

**Symptom:** API returns 429 Too Many Requests

**Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /connect/token | 5 | Per 15 min per IP |
| POST /api/otp/sms/request | 3 | Per 10 min per phone |
| POST /api/otp/verify | 3 | Per OTP |
| GET /api/* | 100 | Per min per user |

**Solution:**

1. Wait for rate limit window to reset (see X-RateLimit-Reset header)
2. Implement exponential backoff in client code
3. Batch requests where possible
4. Contact support for limit increase if legitimate need

**Checking Rate Limit Status:**

```bash
curl -X GET https://api.example.com/endpoint \
  -H "Authorization: Bearer {token}" \
  -I

# Check response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1640923200
```

---

### Validation Error Response

**Symptom:** API returns 400 Bad Request with validation errors

**Example Response:**

```json
{
  "errors": {
    "email": ["Email is required", "Email is not a valid email address"],
    "password": ["Password is required"]
  }
}
```

**Solution:**

1. Check each field listed in errors
2. Fix validation issues:
   - Required fields: add value
   - Email format: ensure user@domain.com format
   - Password: ensure meets complexity requirements
3. Retry request

---

## Database & Performance Issues

### User List Query Slow

**Symptom:** GET /api/management/users takes > 5 seconds

**Possible Causes:**

1. **Large Result Set**
   - Querying all users without pagination
   - Solution: Use `skip` and `take` parameters

2. **Search on Large Dataset**
   - Searching without proper indexing
   - Solution: Improve indexes (DevOps)

3. **Database Issue**
   - Database connection slow
   - Network latency
   - Contact DevOps

**Solutions:**

```bash
# Always use pagination
GET /api/management/users?skip=0&take=50

# Use specific search if filtering
GET /api/management/users?searchText=john&isActive=true

# Avoid full table scans
# If still slow, contact DevOps for index analysis
```

---

### Bulk Operations Timeout

**Symptom:** Bulk import or delete operation times out

**Causes:**

1. **Large Batch Size**
   - Trying to import 10,000+ users at once
   - Solution: Break into smaller batches (500-1000)

2. **Network Timeout**
   - Request takes > 30 seconds
   - Solution: Increase timeout or reduce batch size

3. **Database Locked**
   - Other operation blocking
   - Solution: Wait and retry

**Solutions:**

```bash
# For bulk import: use smaller batches
# Batch 1: 500 users
# Wait for completion
# Batch 2: 500 users

# For bulk delete: use smaller batches
DELETE /api/management/users
{
  "userIds": ["id1", "id2", ..., "id100"]  // Limit to 100-500
}

# Monitor progress
GET /api/management/users?skip=0&take=1
// Check totalCount decreasing
```

---

## Debugging Steps

### General Troubleshooting Process

#### Step 1: Identify Exact Error

```bash
# Check response status code
curl -v -X GET https://api.example.com/endpoint

# Common codes:
# 401 = Authentication issue
# 403 = Authorization issue
# 400 = Validation error
# 404 = Not found
# 500 = Server error
```

#### Step 2: Check Logs

```bash
# Server logs
docker logs accounts-service

# Filter for errors
docker logs accounts-service | grep -i error

# Check for timestamp
# Match with request time to find relevant log entries
```

#### Step 3: Verify Resource Exists

```bash
# If getting 404, check resource exists:
GET /api/management/users?searchText=user@example.com
# Should find user

GET /api/management/roles
# Should list roles

GET /api/management/organizational-units
# Should list org units
```

#### Step 4: Test with Minimal Request

```bash
# Start with simplest possible request
GET /api/management/users

# Then add parameters one by one
GET /api/management/users?skip=0
GET /api/management/users?skip=0&take=10
GET /api/management/users?skip=0&take=10&searchText=john

# Identify which parameter causes issue
```

#### Step 5: Check Authentication

```bash
# Verify token is valid
# Check Authorization header is present

# Refresh token if expired
POST /connect/token
{
  "grant_type": "refresh_token",
  "refresh_token": "{refresh_token}"
}
```

#### Step 6: Review API Docs

- Check endpoint path spelling
- Verify HTTP method (GET vs POST)
- Check required parameters
- Verify request body format
- See [API-REFERENCE.md](./API-REFERENCE.md)

#### Step 7: Contact Support

If issue persists:
- Provide: Error message, HTTP status code, request details
- Include: Timestamp, user ID/email, affected resource
- Attach: Request/response examples, logs
- Contact: support@bravosuite.local

---

## Frequently Asked Questions (FAQ)

### Q: Why do users need to login again after password change?

**A:** For security reasons, changing password invalidates all existing tokens. This prevents compromise if old token was captured. Users must re-authenticate with new password.

---

### Q: Can users belong to multiple companies?

**A:** No, by design. Each user belongs to exactly one company. Multi-company access requires separate accounts in each company.

---

### Q: What happens to data when user is deleted?

**A:** User record is soft-deleted (kept in database for audit), but:
- User account access revoked
- All sessions invalidated
- Related services notified via message bus
- Some dependent data may be cascade-deleted based on policy

---

### Q: How long are reset password tokens valid?

**A:** 24 hours by default. Contact DevOps to change.

---

### Q: Can admin change password without sending reset link?

**A:** Yes, use direct reset method:
```bash
POST /api/management/users/{userId}/reset-password
{
  "method": "direct",
  "newPassword": "NewSecure!Password123"
}
```

---

### Q: What if user is locked out due to failed login attempts?

**A:** Automatic unlock after 15 minutes, or admin can activate user:
```bash
PUT /api/management/users/{userId}/state
{
  "isActive": true
}
```

---

### Q: Can org unit hierarchy be changed after users assigned?

**A:** Yes. Moving org unit changes parent but keeps users/roles intact. Ensure org unit-scoped roles still apply.

---

### Q: What's the difference between role and org unit scope?

**A:**
- **Role**: Defines permissions (what user can do)
- **Org Unit**: Defines scope (where permissions apply)

Example:
- Manager role with `user.create` permission
- Assigned to Engineering org unit
- Manager can create users only in Engineering

---

### Q: How is multi-tenancy enforced?

**A:** Every query filtered by `RequestContext.CurrentCompanyId()`. Attempts to access other company data rejected at API level.

---

### Q: Can 2FA be enforced for all users?

**A:** Company-level 2FA policy can be configured. Contact admin to enable enforcement.

---

### Q: What happens if SMS provider is down?

**A:** OTP requests fail. Switch to authenticator app or email OTP if available. Contact DevOps if extended outage.

---

### Q: How many backup codes are generated?

**A:** Typically 10 backup codes. Each code single-use. Lost codes require 2FA reset.

---

### Q: Are email addresses case-sensitive?

**A:** No, emails converted to lowercase for comparison.

---

### Q: Can password requirements be customized?

**A:** Currently fixed policy. Contact DevOps for custom policy.

---

### Q: How are passwords encrypted in database?

**A:** Argon2 hashing algorithm. Passwords never stored in plain text.

---

### Q: Can users have multiple roles?

**A:** Yes. User can be assigned multiple roles. Permissions combined from all roles.

---

## Support Escalation

### When to Contact Support

- Error persists after troubleshooting steps
- Suspected security issue
- Performance degradation
- Service unavailability
- Multi-company data visible

### Contact Information

- **Email:** support@bravosuite.local
- **Slack:** #accounts-service-support
- **Emergency:** security@bravosuite.local (security issues only)

### Information to Provide

1. **User/Resource ID:** User email or ID affected
2. **Timestamp:** When issue occurred
3. **Error Message:** Exact error text
4. **Request Details:** What API called, with what parameters
5. **Expected Behavior:** What should happen
6. **Actual Behavior:** What actually happened
7. **Reproduction Steps:** How to reproduce
8. **Logs:** Any relevant logs (sanitized)
9. **Screenshots:** If UI-related issue

---

## Related Documentation

- [README.md](./README.md) - Service overview
- [INDEX.md](./INDEX.md) - Quick navigation
- [API-REFERENCE.md](./API-REFERENCE.md) - API endpoint details
- [../../guides/authentication.md](../../guides/authentication.md) - Authentication guide
- [../../architecture/multi-tenancy.md](../../architecture/multi-tenancy.md) - Multi-tenancy architecture

---

**Last Updated:** December 31, 2025
**Version:** 1.0.0
**Status:** Production Ready
**Maintained By:** Platform Team
