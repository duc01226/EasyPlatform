# Supporting Services - API Reference

**Comprehensive API endpoint documentation for all Supporting Services**

---

## Table of Contents

1. [NotificationMessage Service](#notificationmessage-service)
2. [ParserApi Service](#parserapi-service)
3. [PermissionProvider Service](#permissionprovider-service)
4. [CandidateApp Service](#candidateapp-service)
5. [CandidateHub Service](#candidatehub-service)
6. [Authentication & Security](#authentication--security)
7. [Error Codes & Handling](#error-codes--handling)
8. [Integration Patterns](#integration-patterns)

---

## NotificationMessage Service

**Base Path**: `/api/notification`, `/api/notification-receiver`
**Technology**: .NET 8, CQRS Pattern, Entity Event Bus
**Authentication**: IdentityServer (required for most endpoints)

### Notification Management Endpoints

#### POST /api/notification/push-notification

**Description**: Send a new notification message to one or more users

**Request Body**:
```json
{
  "title": "Application Received",
  "message": "Your application has been received",
  "recipientUserId": "user-id-123",
  "channels": ["push", "email", "inApp"],
  "deliveryMetadata": {
    "priority": "high",
    "expiresIn": 7,
    "actionUrl": "/applications/123"
  }
}
```

**Response** (200 OK):
```json
{
  "notificationId": "notif-123",
  "status": "Created",
  "recipient": "user-id-123",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid notification data
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Service error

---

#### PUT /api/notification/mark-as-read-notification/{id}

**Description**: Mark single notification as read

**Parameters**:
- `id` (path, required): Notification ID

**Response** (200 OK):
```json
{
  "notificationId": "notif-123",
  "isRead": true,
  "readAt": "2025-12-31T10:05:00Z"
}
```

---

#### PUT /api/notification/mark-as-read-many-notifications

**Description**: Mark multiple notifications as read

**Request Body**:
```json
{
  "notificationIds": ["notif-123", "notif-124", "notif-125"]
}
```

**Response** (200 OK):
```json
{
  "affectedCount": 3,
  "allMarkedAt": "2025-12-31T10:05:00Z"
}
```

---

#### DELETE /api/notification/delete-notification/{id}

**Description**: Delete single notification (soft delete)

**Parameters**:
- `id` (path, required): Notification ID

**Response** (200 OK):
```json
{
  "notificationId": "notif-123",
  "deleted": true,
  "deletedAt": "2025-12-31T10:10:00Z"
}
```

---

#### DELETE /api/notification/delete-many-notifications

**Description**: Delete multiple notifications (soft delete)

**Request Body**:
```json
{
  "notificationIds": ["notif-123", "notif-124"]
}
```

**Response** (200 OK):
```json
{
  "affectedCount": 2,
  "allDeletedAt": "2025-12-31T10:10:00Z"
}
```

---

### Device Registration Endpoints

#### POST /api/notification-receiver/save-receiver-device

**Description**: Register device for push notifications

**Request Body**:
```json
{
  "deviceTokenId": "device-fcm-token-xyz",
  "applicationId": "bravo-candidate-app",
  "deviceName": "iPhone 14",
  "osType": "iOS"
}
```

**Response** (200 OK):
```json
{
  "deviceId": "device-123",
  "deviceTokenId": "device-fcm-token-xyz",
  "registered": true,
  "registeredAt": "2025-12-31T09:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `409 Conflict`: Device already registered

---

#### GET /api/notification-receiver/check-receiver-device-existing

**Description**: Check if device is already registered

**Query Parameters**:
- `deviceTokenId` (required): Device token ID to check

**Response** (200 OK):
```json
{
  "deviceId": "device-123",
  "deviceTokenId": "device-fcm-token-xyz",
  "isRegistered": true,
  "applicationId": "bravo-candidate-app"
}
```

**Response** (204 No Content): Device not found

---

#### DELETE /api/notification-receiver/delete-receiver-device/{deviceTokenId}

**Description**: Unregister device for push notifications

**Parameters**:
- `deviceTokenId` (path, required): Device token ID to remove

**Response** (200 OK):
```json
{
  "deviceTokenId": "device-fcm-token-xyz",
  "unregistered": true,
  "unregisteredAt": "2025-12-31T10:15:00Z"
}
```

---

### Message Retrieval Endpoints

#### GET /api/notification-receiver/get-in-app-message

**Description**: Get all unread in-app messages for current user

**Query Parameters**:
- `skip` (optional, default: 0): Pagination skip count
- `take` (optional, default: 50): Page size
- `applicationId` (optional): Filter by application

**Response** (200 OK):
```json
{
  "items": [
    {
      "notificationId": "notif-123",
      "title": "Application Received",
      "message": "Your application has been received",
      "isRead": false,
      "createdAt": "2025-12-31T10:00:00Z",
      "actionUrl": "/applications/123"
    }
  ],
  "total": 15,
  "skip": 0,
  "take": 50
}
```

---

#### GET /api/notification-receiver/get-in-app-message/{applicationId}

**Description**: Get in-app messages filtered by application

**Parameters**:
- `applicationId` (path, required): Application identifier

**Response**: Same as above, filtered by application

---

### Key DTOs

**NotificationMessageEntityDto**:
```csharp
public class NotificationMessageEntityDto
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string Message { get; set; }
    public string RecipientUserId { get; set; }
    public List<string> Channels { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
```

**NotificationMessageReceiverDeviceEntityDto**:
```csharp
public class NotificationMessageReceiverDeviceEntityDto
{
    public string DeviceId { get; set; }
    public string DeviceTokenId { get; set; }
    public string ApplicationId { get; set; }
    public DateTime RegisteredAt { get; set; }
}
```

---

## ParserApi Service

**Base Path**: `/api`
**Technology**: Python 3, Django REST Framework, PDF/HTML Parsing
**Authentication**: Custom authentication required

### Resume/CV Parsing Endpoints

#### POST /api/importHtml2Json

**Description**: Parse LinkedIn HTML profile export to structured JSON

**Request Body** (application/json):
```json
{
  "htmlData": "<html><head>...</head><body>...</body></html>"
}
```

**Response** (200 OK):
```json
{
  "personalInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "location": "San Francisco, CA",
    "headline": "Software Engineer"
  },
  "workExperience": [
    {
      "company": "Tech Corp",
      "title": "Senior Engineer",
      "startDate": "2020-01",
      "endDate": "2025-01",
      "description": "Led team of 5 engineers...",
      "location": "San Francisco, CA"
    }
  ],
  "education": [
    {
      "school": "University of California",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "startYear": 2016,
      "endYear": 2020
    }
  ],
  "skills": [
    {
      "name": "C#",
      "endorsements": 45
    },
    {
      "name": "JavaScript",
      "endorsements": 32
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "date": "2023-06"
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native"
    },
    {
      "language": "Spanish",
      "proficiency": "Fluent"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid or empty HTML data
- `422 Unprocessable Entity`: HTML parsing failed
- `500 Internal Server Error`: Service error

**Workflow Notes**:
- Extracts data using CSS selectors specific to LinkedIn HTML structure
- Handles variation in profile layouts
- Returns empty arrays for missing sections

---

#### POST /api/importPdf2Json

**Description**: Parse LinkedIn PDF resume to structured JSON

**Request**: multipart/form-data
```
Form Field: fileToUpload
File Type: application/pdf
Max Size: 10MB (configurable)
```

**Response** (200 OK): Same structure as HTML parsing response

**Error Responses**:
- `400 Bad Request`: No file provided or invalid file type
- `413 Payload Too Large`: File exceeds size limit
- `422 Unprocessable Entity`: PDF parsing failed
- `500 Internal Server Error`: Service error

**Supported Formats**:
- LinkedIn PDF exports
- Standard resume PDFs
- Multi-page documents

**Workflow Notes**:
- Extracts text from PDF using PDF parsing library
- Identifies sections (Experience, Education, Skills)
- Handles variation in PDF structure
- Returns best-effort parsing even with unusual layouts

---

### Parser Error Handling

**Common Error Response Format**:
```json
{
  "error": "PDF parsing failed",
  "detail": "Unable to extract text from page 2",
  "code": "PARSE_ERROR"
}
```

---

## PermissionProvider Service

**Base Path**: `/api/subscription`, `/api/user-policy`
**Technology**: .NET 8, CQRS Pattern, Entity Framework
**Authentication**: IdentityServer (required for all endpoints)
**Authorization**: Role-based access control (admin/owner roles required)

### Subscription Management

#### POST /api/subscription

**Description**: Create new subscription for company

**Request Body**:
```json
{
  "packageId": "pkg-professional",
  "seats": 10,
  "billingPeriod": "monthly",
  "paymentMethod": {
    "type": "credit_card",
    "cardToken": "tok-xyz123",
    "cardholderName": "John Doe"
  }
}
```

**Response** (201 Created):
```json
{
  "subscriptionId": "sub-123",
  "status": "Active",
  "packageId": "pkg-professional",
  "seats": 10,
  "billingPeriod": "monthly",
  "nextBillingDate": "2026-01-31",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

**Authorization**: Company admin or owner

---

#### POST /api/subscription/upgrade

**Description**: Upgrade subscription to higher tier

**Request Body**:
```json
{
  "subscriptionId": "sub-123",
  "newPackageId": "pkg-enterprise",
  "effectiveDate": "2025-12-31"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "oldPackage": "pkg-professional",
  "newPackage": "pkg-enterprise",
  "proratedCost": 245.50,
  "nextInvoiceAdjustment": "+$245.50",
  "effectiveDate": "2025-12-31"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid package or timing
- `402 Payment Required`: Payment processing failed
- `404 Not Found`: Subscription not found

---

#### POST /api/subscription/cancel-at-period-end

**Description**: Cancel subscription at end of billing period

**Request Body**:
```json
{
  "subscriptionId": "sub-123",
  "reason": "Switching to competitor"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "status": "CancelledAtPeriodEnd",
  "cancellationDate": "2026-01-31",
  "finalBillingDate": "2026-01-31",
  "accessContinuesUntil": "2026-01-31"
}
```

---

#### POST /api/subscription/cancel-immediately

**Description**: Cancel subscription immediately

**Request Body**:
```json
{
  "subscriptionId": "sub-123",
  "reason": "No longer needed"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "status": "CancelledImmediately",
  "cancellationDate": "2025-12-31",
  "unusedCredit": 150.00,
  "creditAppliedTo": "account_balance"
}
```

---

#### POST /api/subscription/activate

**Description**: Reactivate suspended subscription

**Request Body**:
```json
{
  "subscriptionId": "sub-123"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "status": "Active",
  "activatedAt": "2025-12-31T10:00:00Z",
  "featuresRestored": true
}
```

---

#### POST /api/subscription/deactivate

**Description**: Suspend subscription temporarily

**Request Body**:
```json
{
  "subscriptionId": "sub-123",
  "suspensionReason": "Payment pending"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "status": "Suspended",
  "deactivatedAt": "2025-12-31T10:00:00Z",
  "accessRevoked": true
}
```

---

#### POST /api/subscription/reinstate

**Description**: Reinstate cancelled subscription

**Request Body**:
```json
{
  "subscriptionId": "sub-123",
  "reinstateDate": "2025-12-31",
  "packageId": "pkg-professional"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "status": "Active",
  "reinstatedAt": "2025-12-31T10:00:00Z",
  "packageRestored": "pkg-professional",
  "nextBillingDate": "2026-01-31"
}
```

---

#### POST /api/subscription/change-card

**Description**: Update payment card

**Request Body**:
```json
{
  "subscriptionId": "sub-123",
  "cardToken": "tok-new456",
  "cardholderName": "Jane Doe"
}
```

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "cardLast4": "4567",
  "cardExpiry": "12/27",
  "updatedAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/subscription/pay-invoice

**Description**: Process manual payment for invoice

**Request Body**:
```json
{
  "invoiceId": "inv-456",
  "paymentAmount": 1299.00,
  "paymentMethod": {
    "type": "credit_card",
    "cardToken": "tok-xyz123"
  }
}
```

**Response** (200 OK):
```json
{
  "invoiceId": "inv-456",
  "paymentId": "pay-789",
  "status": "Paid",
  "paidAt": "2025-12-31T10:00:00Z",
  "receiptUrl": "/receipts/rec-123"
}
```

---

### Subscription Information

#### GET /api/subscription/{subscriptionId}

**Description**: Get complete subscription details

**Parameters**:
- `subscriptionId` (path, required): Subscription ID

**Response** (200 OK):
```json
{
  "subscriptionId": "sub-123",
  "companyId": "comp-456",
  "packageId": "pkg-professional",
  "packageName": "Professional Plan",
  "status": "Active",
  "seats": 10,
  "seatsUsed": 8,
  "billingPeriod": "monthly",
  "startDate": "2025-01-01",
  "nextBillingDate": "2026-01-31",
  "features": [
    {
      "featureId": "feat-advanced-search",
      "name": "Advanced Candidate Search",
      "isIncluded": true
    },
    {
      "featureId": "feat-analytics",
      "name": "Analytics Dashboard",
      "isIncluded": true
    }
  ],
  "billingHistory": {
    "invoices": 12,
    "totalBilled": 15588.00,
    "lastInvoiceDate": "2025-12-01"
  }
}
```

---

#### GET /api/subscription/check-existing

**Description**: Check if subscription exists for module

**Query Parameters**:
- `companyId` (required): Company ID
- `moduleCode` (required): Module code (e.g., "talents", "growth")

**Response** (200 OK):
```json
{
  "hasSubscription": true,
  "isActive": true,
  "packageId": "pkg-professional",
  "moduleCode": "talents"
}
```

---

#### GET /api/subscription/accessible-packages

**Description**: Get available packages for upgrade/downgrade

**Query Parameters**:
- `subscriptionId` (required): Current subscription ID

**Response** (200 OK):
```json
{
  "currentPackage": "pkg-professional",
  "availableUpgrades": [
    {
      "packageId": "pkg-enterprise",
      "name": "Enterprise Plan",
      "monthlyPrice": 2999.00,
      "seats": "Unlimited",
      "features": ["Advanced Search", "Analytics", "Custom Integrations"],
      "upgradeUrl": "/upgrade/pkg-enterprise"
    }
  ],
  "availableDowngrades": [
    {
      "packageId": "pkg-starter",
      "name": "Starter Plan",
      "monthlyPrice": 499.00,
      "seats": 3,
      "features": ["Basic Search"],
      "downgradeUrl": "/downgrade/pkg-starter"
    }
  ]
}
```

---

#### GET /api/subscription/overview

**Description**: Get subscription dashboard overview

**Response** (200 OK):
```json
{
  "activeSubscriptions": 15,
  "expiringSoon": 2,
  "cancelled": 3,
  "monthlyRecurringRevenue": 45678.00,
  "nextRenewalDate": "2026-01-15",
  "subscriptionSummary": [
    {
      "subscriptionId": "sub-123",
      "companyId": "comp-456",
      "packageName": "Professional",
      "status": "Active",
      "nextBillingDate": "2026-01-31",
      "monthlyPrice": 1299.00
    }
  ]
}
```

---

#### GET /api/subscription/company-map

**Description**: Get subscriptions for multiple companies

**Query Parameters**:
- `companyIds` (required): Comma-separated list of company IDs

**Response** (200 OK):
```json
{
  "comp-456": {
    "subscriptionId": "sub-123",
    "packageName": "Professional",
    "status": "Active",
    "monthlyPrice": 1299.00
  },
  "comp-789": {
    "subscriptionId": "sub-456",
    "packageName": "Starter",
    "status": "Active",
    "monthlyPrice": 499.00
  }
}
```

---

### User Policies & Roles

#### GET /api/user-policy

**Description**: Get all policies assigned to current user

**Response** (200 OK):
```json
{
  "userId": "user-123",
  "policies": [
    {
      "policyId": "pol-456",
      "companyId": "comp-789",
      "companyName": "Acme Corp",
      "roles": [
        {
          "roleId": "role-admin",
          "name": "Admin",
          "permissions": ["manage_users", "manage_subscriptions", "view_analytics"]
        }
      ]
    },
    {
      "policyId": "pol-789",
      "companyId": "comp-999",
      "companyName": "Tech Startup",
      "roles": [
        {
          "roleId": "role-recruiter",
          "name": "Recruiter",
          "permissions": ["search_candidates", "post_jobs", "view_applications"]
        }
      ]
    }
  ],
  "cachedUntil": "2025-12-31T11:00:00Z"
}
```

**Caching**: Results cached with TTL from service configuration (default 1 hour)

---

#### POST /api/user-policy/set-roles

**Description**: Assign roles to user in company

**Request Body**:
```json
{
  "userId": "user-123",
  "companyId": "comp-789",
  "roleIds": ["role-recruiter", "role-hiring-manager"]
}
```

**Response** (200 OK):
```json
{
  "userId": "user-123",
  "companyId": "comp-789",
  "assignedRoles": ["role-recruiter", "role-hiring-manager"],
  "updatedAt": "2025-12-31T10:00:00Z",
  "cacheCleared": true
}
```

**Validation**:
- Roles must exist
- Cannot exceed subscription seat limit
- Company must have active subscription

---

#### POST /api/user-policy/sync-all

**Description**: Synchronize all user policies across platform

**Request Body**:
```json
{
  "companyIds": ["comp-456", "comp-789"],
  "dateRange": {
    "startDate": "2025-12-01",
    "endDate": "2025-12-31"
  }
}
```

**Response** (200 OK):
```json
{
  "syncId": "sync-123",
  "affectedUsers": 156,
  "policiesUpdated": 342,
  "startedAt": "2025-12-31T10:00:00Z",
  "completedAt": "2025-12-31T10:05:00Z",
  "status": "Completed"
}
```

---

## CandidateApp Service

**Base Path**: `/api`
**Technology**: .NET 8, CQRS Pattern, OData, File Storage
**Authentication**: IdentityServer (required)
**File Storage**: Azure Blob/S3/Local (configurable)

### Applicant Management

#### GET /api/applicant/with-cvs

**Description**: Get current user's applicant profile with associated CVs

**Response** (200 OK):
```json
{
  "applicantId": "app-123",
  "userId": "user-456",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1-555-123-4567",
  "location": "San Francisco, CA",
  "summary": "Software engineer with 10 years experience...",
  "language": "en",
  "cvs": [
    {
      "cvId": "cv-789",
      "title": "Software Engineer CV",
      "isPrimary": true,
      "createdAt": "2025-01-15",
      "education": [
        {
          "educationId": "edu-123",
          "school": "UC Berkeley",
          "degree": "BS",
          "field": "Computer Science",
          "startYear": 2011,
          "endYear": 2015
        }
      ],
      "workExperience": [
        {
          "experienceId": "exp-456",
          "company": "Tech Corp",
          "position": "Senior Engineer",
          "startDate": "2020-01",
          "endDate": null,
          "description": "Led platform migration..."
        }
      ],
      "skills": [
        {
          "skillId": "skill-789",
          "name": "C#",
          "level": "Expert",
          "endorsements": 45
        }
      ]
    }
  ]
}
```

---

#### PUT /api/applicant

**Description**: Update applicant profile

**Request Body**:
```json
{
  "applicantId": "app-123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4568",
  "location": "San Francisco, CA",
  "summary": "Updated summary..."
}
```

**Response** (200 OK):
```json
{
  "applicantId": "app-123",
  "updated": true,
  "eventPublished": "ApplicantChanged",
  "updatedAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/applicant/refreshness-with-cv/{source}

**Description**: Import/refresh applicant from external source

**Parameters**:
- `source` (path, required): Source system ("linkedin", "resume", etc.)

**Response** (200 OK):
```json
{
  "applicantId": "app-123",
  "isNewApplicant": false,
  "source": "linkedin",
  "cvs": [
    {
      "cvId": "cv-789",
      "title": "LinkedIn CV - Jan 2025",
      "createdAt": "2025-12-31T10:00:00Z"
    }
  ],
  "refreshedAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/applicant/set-language/{language}

**Description**: Set applicant language preference

**Parameters**:
- `language` (path, required): Language code (en, vi, es, etc.)

**Response** (200 OK):
```json
{
  "applicantId": "app-123",
  "language": "en",
  "updatedAt": "2025-12-31T10:00:00Z"
}
```

---

### Application Management

#### GET /api/application

**Description**: Get applicant's job applications

**Query Parameters**:
- `skip` (optional, default: 0): Pagination skip
- `take` (optional, default: 50): Page size
- `status` (optional): Filter by status (Draft, Submitted, Rejected, etc.)

**Response** (200 OK):
```json
{
  "items": [
    {
      "applicationId": "appl-123",
      "jobId": "job-456",
      "jobTitle": "Senior Software Engineer",
      "companyName": "Acme Corp",
      "status": "Submitted",
      "submittedAt": "2025-12-20T14:30:00Z",
      "cvUsed": "cv-789",
      "responses": {
        "whyInterested": "Excited about the role..."
      }
    }
  ],
  "total": 5,
  "skip": 0,
  "take": 50,
  "eTag": "W/\"hash-abc123\""
}
```

**Headers**:
- `ETag`: Hash of application data for caching
- Client should include `If-None-Match` header with previous ETag

---

#### POST /api/application

**Description**: Create new job application

**Request Body**:
```json
{
  "jobId": "job-456",
  "cvId": "cv-789",
  "responses": {
    "question1": "My answer...",
    "question2": "Another answer..."
  }
}
```

**Response** (201 Created):
```json
{
  "applicationId": "appl-123",
  "jobId": "job-456",
  "status": "Draft",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/application/apply

**Description**: Create and submit application by job code

**Request Body**:
```json
{
  "jobCode": "JOB-2025-001",
  "cvId": "cv-789"
}
```

**Response** (200 OK):
```json
{
  "applicationId": "appl-123",
  "jobCode": "JOB-2025-001",
  "status": "Submitted",
  "submittedAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/application/submit-application

**Description**: Submit draft application

**Request Body**:
```json
{
  "applicationId": "appl-123",
  "source": "mobile"
}
```

**Response** (200 OK):
```json
{
  "applicationId": "appl-123",
  "status": "Submitted",
  "submittedAt": "2025-12-31T10:00:00Z",
  "eventPublished": "ApplicationSubmitted"
}
```

---

#### PUT /api/application

**Description**: Update draft application

**Request Body**:
```json
{
  "applicationId": "appl-123",
  "cvId": "cv-789",
  "responses": {
    "question1": "Updated answer..."
  }
}
```

**Response** (200 OK):
```json
{
  "applicationId": "appl-123",
  "updated": true,
  "updatedAt": "2025-12-31T10:00:00Z"
}
```

---

#### DELETE /api/application/{id}

**Description**: Delete application (soft delete)

**Parameters**:
- `id` (path, required): Application ID

**Response** (200 OK):
```json
{
  "applicationId": "appl-123",
  "deleted": true,
  "deletedAt": "2025-12-31T10:00:00Z"
}
```

---

### Job Management

#### GET /api/job

**Description**: Get available jobs

**Query Parameters**:
- `isPublished` (optional): true/false filter
- `skip` (optional, default: 0): Pagination skip
- `take` (optional, default: 50): Page size

**Response** (200 OK):
```json
{
  "items": [
    {
      "jobId": "job-456",
      "code": "JOB-2025-001",
      "title": "Senior Software Engineer",
      "company": "Acme Corp",
      "location": "San Francisco, CA",
      "salary": {
        "min": 150000,
        "max": 200000,
        "currency": "USD"
      },
      "description": "We are looking for...",
      "isPublished": true,
      "appliedByCurrentUser": false,
      "publishedAt": "2025-12-01"
    }
  ],
  "total": 145,
  "skip": 0,
  "take": 50,
  "eTag": "W/\"hash-xyz789\""
}
```

---

#### GET /api/job/get-applied-jobs

**Description**: Get jobs user has applied to

**Response** (200 OK):
```json
{
  "items": [
    {
      "jobId": "job-456",
      "title": "Senior Software Engineer",
      "company": "Acme Corp",
      "applicationCount": 2,
      "latestApplicationStatus": "Submitted"
    }
  ],
  "total": 5
}
```

---

### CV Management

#### POST /api/curriculum-vitae

**Description**: Create new CV

**Request Body**:
```json
{
  "title": "My Professional CV",
  "description": "CV for engineer roles"
}
```

**Response** (201 Created):
```json
{
  "cvId": "cv-123",
  "applicantId": "app-456",
  "title": "My Professional CV",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

---

#### PUT /api/curriculum-vitae

**Description**: Update CV

**Request Body**:
```json
{
  "cvId": "cv-123",
  "title": "Updated CV Title",
  "description": "Updated description"
}
```

**Response** (200 OK):
```json
{
  "cvId": "cv-123",
  "updated": true,
  "updatedAt": "2025-12-31T10:00:00Z"
}
```

---

### Education Management

#### POST /api/education

**Description**: Add education to CV

**Request Body**:
```json
{
  "cvId": "cv-123",
  "school": "University of California",
  "degree": "Bachelor of Science",
  "field": "Computer Science",
  "startYear": 2016,
  "endYear": 2020,
  "activities": "CS Club President",
  "description": "Focused on software engineering..."
}
```

**Response** (201 Created):
```json
{
  "educationId": "edu-456",
  "cvId": "cv-123",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

---

#### PUT /api/education

**Description**: Update education

**Request Body**:
```json
{
  "educationId": "edu-456",
  "school": "UC Berkeley",
  "degree": "BS",
  "field": "Computer Science",
  "startYear": 2016,
  "endYear": 2020
}
```

**Response** (200 OK):
```json
{
  "educationId": "edu-456",
  "updated": true
}
```

---

### Work Experience Management

#### POST /api/work-experience

**Description**: Add work experience to CV

**Request Body**:
```json
{
  "cvId": "cv-123",
  "company": "Tech Corp",
  "position": "Senior Engineer",
  "location": "San Francisco, CA",
  "startDate": "2020-01",
  "endDate": null,
  "description": "Led team of 5 engineers on platform migration..."
}
```

**Response** (201 Created):
```json
{
  "experienceId": "exp-789",
  "cvId": "cv-123",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

---

### Skills Management

#### POST /api/skill

**Description**: Add skill to CV

**Request Body**:
```json
{
  "cvId": "cv-123",
  "name": "C#",
  "level": "Expert",
  "endorsements": 0
}
```

**Response** (201 Created):
```json
{
  "skillId": "skill-456",
  "cvId": "cv-123",
  "name": "C#",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

---

### Certifications Management

#### POST /api/certification

**Description**: Add certification to CV

**Request Body**:
```json
{
  "cvId": "cv-123",
  "name": "AWS Solutions Architect",
  "issuer": "Amazon",
  "issueDate": "2023-06",
  "expirationDate": "2026-06",
  "credentialUrl": "https://aws.example.com/cert/123"
}
```

**Response** (201 Created):
```json
{
  "certificationId": "cert-789",
  "cvId": "cv-123",
  "name": "AWS Solutions Architect",
  "createdAt": "2025-12-31T10:00:00Z"
}
```

---

### File Management

#### GET /api/attachments/get-link-attachment/{attachmentId}

**Description**: Get download link for attachment

**Parameters**:
- `attachmentId` (path, required): Attachment ID

**Response** (200 OK):
```json
{
  "attachmentId": "attach-123",
  "fileName": "resume.pdf",
  "downloadUrl": "https://storage.example.com/download?token=xyz123",
  "expiresIn": 3600,
  "contentType": "application/pdf"
}
```

---

#### POST /api/attachments

**Description**: Upload attachment (CV file, certificates, etc.)

**Request**: multipart/form-data
```
Form Fields:
- cvId (required): CV ID
- file (required): File to upload
- fileType (optional): "cv", "certificate", "cover_letter"
Max Size: 10MB per file
Supported Types: PDF, DOC, DOCX
```

**Response** (201 Created):
```json
{
  "attachmentId": "attach-456",
  "cvId": "cv-123",
  "fileName": "resume.pdf",
  "fileSize": 1048576,
  "contentType": "application/pdf",
  "uploadedAt": "2025-12-31T10:00:00Z",
  "storageUrl": "https://storage.example.com/..."
}
```

---

#### DELETE /api/attachments/{id}

**Description**: Delete attachment

**Parameters**:
- `id` (path, required): Attachment ID

**Response** (200 OK):
```json
{
  "attachmentId": "attach-456",
  "deleted": true,
  "deletedAt": "2025-12-31T10:00:00Z"
}
```

---

## CandidateHub Service

**Base Path**: `/api/candidates`
**Technology**: .NET 8, CQRS Pattern, Memory Caching, BasicAuthorize
**Authentication**: BasicAuthorize middleware (username/password)
**Caching**: In-memory with configurable TTL (hours)

### Candidate Matching & Scoring

#### POST /api/candidates/get-job-matching-scores

**Description**: Calculate job matching scores for candidates

**Authentication**: BasicAuthorize required

**Request Body**:
```json
{
  "jobId": "job-123",
  "requiredSkills": [
    {
      "skillName": "C#",
      "level": "intermediate",
      "weight": 1.0
    },
    {
      "skillName": "SQL",
      "level": "intermediate",
      "weight": 0.8
    }
  ],
  "minExperienceYears": 5,
  "preferredLocation": "San Francisco, CA",
  "maxResults": 50
}
```

**Response** (200 OK):
```json
{
  "jobId": "job-123",
  "matchedCandidates": [
    {
      "candidateId": "cand-456",
      "name": "John Doe",
      "email": "john@example.com",
      "overallScore": 92,
      "skillMatches": [
        {
          "skillName": "C#",
          "matched": true,
          "matchScore": 95,
          "candidateLevel": "expert"
        },
        {
          "skillName": "SQL",
          "matched": true,
          "matchScore": 88,
          "candidateLevel": "advanced"
        }
      ],
      "experienceScore": 85,
      "locationMatch": "exact",
      "cachedResult": false
    }
  ],
  "totalMatches": 23,
  "calculatedAt": "2025-12-31T10:00:00Z",
  "cacheKey": "hash-abc123"
}
```

**Caching**:
- Results cached by query hash
- TTL configured via `CachedScoreTimeByHour` setting
- Cache key includes job ID and all filter parameters

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Job not found

---

#### POST /api/candidates/get-candidates-score

**Description**: Calculate scores for list of candidates

**Authentication**: BasicAuthorize required

**Request Body**:
```json
{
  "candidateIds": ["cand-123", "cand-456", "cand-789"],
  "sources": ["cv_profile", "skill_assessment", "work_history"],
  "scoringCriteria": {
    "completeness": 0.2,
    "experience": 0.4,
    "skills": 0.3,
    "assessments": 0.1
  }
}
```

**Response** (200 OK):
```json
{
  "candidates": [
    {
      "candidateId": "cand-123",
      "name": "John Doe",
      "totalScore": 82.5,
      "scoreBreakdown": {
        "completeness": 85,
        "experience": 80,
        "skills": 85,
        "assessments": 75
      },
      "source": "cv_profile"
    }
  ],
  "scoredAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/candidates/get-candidates-by-ids

**Description**: Batch retrieve candidate profiles

**Authentication**: BasicAuthorize required

**Request Body**:
```json
{
  "candidateIds": [
    {
      "id": "cand-123",
      "source": "candidate_app"
    },
    {
      "id": "cand-456",
      "source": "vip24"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "candidates": [
    {
      "candidateId": "cand-123",
      "fullName": "John Doe",
      "email": "john@example.com",
      "location": "San Francisco, CA",
      "currentPosition": "Senior Engineer",
      "currentCompany": "Tech Corp",
      "yearsExperience": 10,
      "skills": ["C#", "JavaScript", "SQL"],
      "education": [
        {
          "school": "UC Berkeley",
          "degree": "BS",
          "field": "Computer Science"
        }
      ],
      "availabilityStatus": "Actively Looking",
      "source": "candidate_app"
    }
  ],
  "retrievedAt": "2025-12-31T10:00:00Z"
}
```

---

#### POST /api/candidates/search

**Description**: Full-text search candidates with filters

**Authentication**: BasicAuthorize required

**Request Body**:
```json
{
  "searchTerm": "senior engineer",
  "filters": {
    "location": "San Francisco, CA",
    "skills": ["C#", "JavaScript"],
    "experienceLevel": "senior",
    "minYearsExperience": 5,
    "maxYearsExperience": 20,
    "availability": "actively_looking"
  },
  "sortBy": "relevance",
  "skip": 0,
  "take": 50
}
```

**Response** (200 OK):
```json
{
  "results": [
    {
      "candidateId": "cand-123",
      "name": "John Doe",
      "email": "john@example.com",
      "location": "San Francisco, CA",
      "relevanceScore": 98,
      "summary": "Senior engineer with 10 years...",
      "matchedFields": ["experience", "location", "skills"]
    }
  ],
  "total": 145,
  "skip": 0,
  "take": 50,
  "searchedAt": "2025-12-31T10:00:00Z"
}
```

---

### Candidate Import & Sync

#### GET /api/candidates/import-candidates-from-cv-app

**Description**: Import candidates from CandidateApp service

**Authentication**: BasicAuthorize required

**Response** (200 OK):
```json
{
  "importedCount": 42,
  "importedUserIds": ["user-123", "user-456", ...],
  "importStartedAt": "2025-12-31T09:00:00Z",
  "importCompletedAt": "2025-12-31T09:05:00Z",
  "status": "Completed"
}
```

---

#### PUT /api/candidates/schedule-candidate-daily

**Description**: Schedule daily sync from Vip24

**Authentication**: BasicAuthorize required

**Response** (200 OK):
```json
{
  "jobId": "job-daily-vip24",
  "scheduledAt": "2025-12-31T10:00:00Z",
  "nextExecutionTime": "2026-01-01T03:00:00Z",
  "status": "Scheduled"
}
```

---

#### PUT /api/candidates/schedule-candidates-weekly

**Description**: Schedule comprehensive weekly sync from Vip24

**Authentication**: BasicAuthorize required

**Response** (200 OK):
```json
{
  "jobId": "job-weekly-vip24",
  "scheduledAt": "2025-12-31T10:00:00Z",
  "nextExecutionTime": "2026-01-05T03:00:00Z",
  "status": "Scheduled"
}
```

---

#### PUT /api/candidates/update-candidates-privacy-setting

**Description**: Update privacy settings for Vip24 candidates

**Authentication**: BasicAuthorize required

**Request Body**:
```json
{
  "candidateIds": ["cand-123", "cand-456"],
  "privacySettings": {
    "isVisible": true,
    "allowContact": true,
    "shareProfile": false
  }
}
```

**Response** (200 OK):
```json
{
  "updatedCount": 2,
  "updatedAt": "2025-12-31T10:00:00Z",
  "status": "Success"
}
```

---

## Authentication & Security

### Authentication Methods

#### IdentityServer Authentication
Used by: NotificationMessage, PermissionProvider, CandidateApp

```
Authorization: Bearer {token}
```

Token obtained via OAuth 2.0 flow from IdentityServer endpoint. Token includes user identity and claims.

#### BasicAuthorize
Used by: CandidateHub for internal/partner integrations

```
Authorization: Basic {base64(username:password)}
```

Credentials configured in appsettings with restricted scope for specific endpoints.

#### Custom Authentication (ParserApi)
Used by: ParserApi service

Custom authentication mechanism based on service configuration.

---

### Authorization Patterns

**Role-Based Access Control (RBAC)**:
- Admin: Subscription management, user policy management
- Recruiter: Candidate search, job matching, applications
- Applicant: Own profile, applications, CV management

**Company Isolation**:
- All endpoints enforce company-level tenancy
- Users can only access data for their assigned companies
- Cross-company access strictly forbidden

---

## Error Codes & Handling

### HTTP Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| 200 OK | Request successful | Standard success |
| 201 Created | Resource created | POST creates new resource |
| 204 No Content | No content to return | Some DELETE operations |
| 304 Not Modified | Cached response valid | ETag matches |
| 400 Bad Request | Invalid request data | Missing required fields, validation errors |
| 401 Unauthorized | Authentication required | Invalid/expired token |
| 402 Payment Required | Payment processing failed | Subscription payment issues |
| 403 Forbidden | Permission denied | Insufficient authorization |
| 404 Not Found | Resource not found | ID doesn't exist |
| 409 Conflict | Resource conflict | Device already registered, duplicate |
| 413 Payload Too Large | File too large | Upload exceeds size limit |
| 422 Unprocessable Entity | Semantic error | Parsing failed, business rule violation |
| 500 Internal Server Error | Server error | Unexpected service error |

### Standard Error Response

```json
{
  "error": "Validation failed",
  "detail": "Email address is already in use",
  "code": "DUPLICATE_EMAIL",
  "timestamp": "2025-12-31T10:00:00Z",
  "traceId": "trace-abc123"
}
```

---

## Integration Patterns

### Event Bus Communication

Services publish and consume domain events for asynchronous communication:

**Event Types**:
- `ApplicantChangedEventBusMessage` - Published by CandidateApp
- `ApplicationSubmittedEventBusMessage` - Published by CandidateApp
- `NotificationMessageEventBusMessage` - Published by NotificationMessage
- `SubscriptionChangedEventBusMessage` - Published by PermissionProvider

**Consumer Implementation**:
```csharp
public class ApplicantChangedConsumer : PlatformApplicationMessageBusConsumer<ApplicantChangedEventBusMessage>
{
    public override async Task HandleLogicAsync(ApplicantChangedEventBusMessage msg)
    {
        // React to applicant change
    }
}
```

---

### API Gateway Pattern

Each service has independent REST API with no shared dependencies:

```
Client
  ↓
API Gateway / Load Balancer
  ↓
Service APIs (NotificationMessage, PermissionProvider, CandidateApp, CandidateHub, ParserApi)
  ↓
Service Databases + Event Bus
```

---

### Caching Strategies

**NotificationMessage**: In-memory cache for device registrations
**CandidateHub**: Memory cache for job matching scores (TTL: hours)
**PermissionProvider**: Cache for user policies (TTL: configurable)
**CandidateApp**: ETag-based HTTP caching for application/job lists

---

### Rate Limiting

- Service-to-service calls: Configurable retry policies
- Public APIs: Rate limited per client/IP (configured via middleware)
- Batch operations: Limited to 1000 items per request

---

**Last Updated**: 2025-12-31
**Documentation Version**: 1.0
**Applicable Services**: All Supporting Services (NotificationMessage, ParserApi, PermissionProvider, CandidateApp, CandidateHub)

