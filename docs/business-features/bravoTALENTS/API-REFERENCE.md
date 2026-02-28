# bravoTALENTS API Reference Guide

> Complete REST API endpoints for bravoTALENTS microservices

---

## Base URL

```
Production: https://api.bravosuite.com
Development: http://localhost:8080
API Version: v1
```

---

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer {accessToken}
```

**Token obtained from**: Accounts service authentication endpoint

---

## Candidate Management API

### List Candidates

**Endpoint**: `POST /api/candidates/search`

**Request**:
```json
{
  "searchText": "John Doe",
  "tags": ["senior", "python"],
  "sources": ["direct", "linkedin"],
  "dateFrom": "2025-01-01",
  "dateTo": "2025-12-31",
  "pageIndex": 0,
  "pageSize": 20,
  "sortBy": "createdDate",
  "sortOrder": "desc"
}
```

**Response**:
```json
{
  "items": [
    {
      "id": "cand_123",
      "email": "john@example.com",
      "fullName": "John Doe",
      "phone": "+1234567890",
      "source": "direct",
      "tags": ["senior", "python"],
      "applications": 2,
      "followed": false,
      "createdDate": "2025-12-01"
    }
  ],
  "totalCount": 150,
  "pageIndex": 0,
  "pageSize": 20
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Get Candidate Details

**Endpoint**: `GET /api/candidates/{candidateId}`

**Response**:
```json
{
  "id": "cand_123",
  "email": "john@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "address": "123 Main St, City",
  "source": "direct",
  "dateOfBirth": "1990-05-15",
  "tags": ["senior", "python"],
  "cv": {
    "id": "cv_456",
    "fileName": "John_Doe_CV.pdf",
    "uploadDate": "2025-12-01",
    "workExperiences": [...],
    "educations": [...],
    "certifications": [...],
    "languages": [...],
    "projects": [...],
    "skills": [...]
  },
  "applications": [
    {
      "id": "app_789",
      "jobId": "job_101",
      "jobTitle": "Senior Python Developer",
      "pipelineStage": "Interview Scheduled",
      "appliedDate": "2025-12-05",
      "status": "Active"
    }
  ],
  "activities": [
    {
      "id": "act_111",
      "type": "Application Created",
      "description": "Applied for Senior Python Developer",
      "createdDate": "2025-12-05"
    }
  ],
  "followed": true,
  "createdDate": "2025-12-01"
}
```

---

### Create Candidate

**Endpoint**: `POST /api/candidates/create`

**Request**:
```json
{
  "email": "jane@example.com",
  "fullName": "Jane Smith",
  "phone": "+1234567890",
  "address": "456 Oak St, City",
  "source": "linkedin",
  "dateOfBirth": "1992-03-20",
  "tags": ["frontend", "react"],
  "cvId": "cv_789"
}
```

**Response**:
```json
{
  "id": "cand_124",
  "email": "jane@example.com",
  "fullName": "Jane Smith",
  "phone": "+1234567890",
  "source": "linkedin",
  "tags": ["frontend", "react"],
  "createdDate": "2025-12-10"
}
```

**Status Codes**: 201 Created, 400 Bad Request, 409 Conflict (duplicate email)

---

### Update Candidate

**Endpoint**: `PUT /api/candidates/{candidateId}/basic-info`

**Request**:
```json
{
  "fullName": "John Doe Smith",
  "phone": "+9876543210",
  "address": "789 Pine St, City",
  "dateOfBirth": "1990-05-15"
}
```

**Response**: 200 OK with updated candidate object

---

### Add Tag to Candidate

**Endpoint**: `POST /api/candidates/{candidateId}/tags`

**Request**:
```json
{
  "tagId": "tag_123"
}
```

**Response**: 201 Created

---

### Remove Tag from Candidate

**Endpoint**: `DELETE /api/candidates/{candidateId}/tags/{tagId}`

**Response**: 204 No Content

---

### Mark Candidate as Followed

**Endpoint**: `POST /api/candidates/{candidateId}/follow`

**Response**: 200 OK

---

### Unmark Candidate as Followed

**Endpoint**: `DELETE /api/candidates/{candidateId}/follow`

**Response**: 204 No Content

---

### Upload CV

**Endpoint**: `POST /api/candidates/attachments/upload`

**Content-Type**: `multipart/form-data`

**Request**:
```
File: candidateCv.pdf
candidateId: cand_123
```

**Response**:
```json
{
  "id": "attach_456",
  "candidateId": "cand_123",
  "fileName": "candidateCv.pdf",
  "fileSize": 204800,
  "uploadDate": "2025-12-10"
}
```

---

### Import Candidates from File

**Endpoint**: `POST /api/candidates/import`

**Content-Type**: `multipart/form-data`

**Request**:
```
File: candidates.xlsx
```

**File Format**:
```
Email | Full Name | Phone | Source | Current Position
john@example.com | John Doe | +1234567890 | direct | Senior Developer
jane@example.com | Jane Smith | +9876543210 | linkedin | Frontend Engineer
```

**Response**:
```json
{
  "totalImported": 25,
  "successful": 23,
  "failed": 2,
  "details": [
    {
      "rowNumber": 1,
      "email": "john@example.com",
      "status": "success",
      "candidateId": "cand_125"
    },
    {
      "rowNumber": 2,
      "email": "invalid-email",
      "status": "failed",
      "error": "Invalid email format"
    }
  ]
}
```

---

## Job Management API

### List Jobs

**Endpoint**: `POST /api/jobs/search`

**Request**:
```json
{
  "searchText": "Developer",
  "statuses": ["Open", "Draft"],
  "categories": ["Technology", "Engineering"],
  "departmentIds": ["dept_123"],
  "pageIndex": 0,
  "pageSize": 20
}
```

**Response**:
```json
{
  "items": [
    {
      "id": "job_101",
      "title": "Senior Python Developer",
      "department": "Engineering",
      "jobCategory": "Software Development",
      "status": "Open",
      "applicationsCount": 15,
      "publishedDate": "2025-12-01",
      "applicationDeadline": "2025-12-31",
      "createdBy": "user_123"
    }
  ],
  "totalCount": 45,
  "pageIndex": 0,
  "pageSize": 20
}
```

---

### Get Job Details

**Endpoint**: `GET /api/jobs/{jobId}`

**Response**:
```json
{
  "id": "job_101",
  "title": "Senior Python Developer",
  "description": "We are looking for an experienced Python developer...",
  "requirements": "5+ years Python, Django/Flask, PostgreSQL...",
  "benefits": "Competitive salary, Remote work, Health insurance...",
  "department": "Engineering",
  "jobCategory": "Software Development",
  "jobFamily": "Backend Development",
  "positionLevel": "Senior",
  "salary": {
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  },
  "locations": ["New York", "Remote"],
  "jobType": "Full-time",
  "workArrangement": "Remote",
  "status": "Open",
  "applicationsCount": 15,
  "publishedPortals": ["Internal Portal", "ITviec", "LinkedIn"],
  "applicationDeadline": "2025-12-31",
  "startDate": "2026-01-15",
  "createdDate": "2025-12-01",
  "createdBy": "user_123"
}
```

---

### Create Job

**Endpoint**: `POST /api/jobs`

**Request**:
```json
{
  "title": "Senior Python Developer",
  "description": "We are looking for...",
  "requirements": "5+ years experience...",
  "benefits": "Competitive salary...",
  "departmentId": "dept_123",
  "jobCategoryId": "cat_456",
  "jobFamilyId": "family_789",
  "positionLevelId": "level_101",
  "salaryMin": 80000,
  "salaryMax": 120000,
  "currency": "USD",
  "locationIds": ["loc_123", "loc_456"],
  "jobTypeId": "type_001",
  "workArrangementId": "arr_001",
  "applicationDeadline": "2025-12-31",
  "startDate": "2026-01-15",
  "requiredSkillIds": ["skill_001", "skill_002"]
}
```

**Response**: 201 Created with job object

---

### Update Job

**Endpoint**: `PUT /api/jobs/{jobId}`

**Request**: Same fields as Create Job (only changed fields required)

**Response**: 200 OK

---

### Publish Job

**Endpoint**: `POST /api/jobs/{jobId}/publish`

**Request**:
```json
{
  "portals": ["Internal Portal", "ITviec", "LinkedIn"],
  "activateOnPortals": true
}
```

**Response**: 200 OK

---

### Change Job Status

**Endpoint**: `PUT /api/jobs/{jobId}/status`

**Request**:
```json
{
  "status": "Open"
}
```

**Valid Statuses**: Draft, Open, On Hold, Closed, Filled

**Response**: 200 OK

---

## Interview Management API

### Create Interview

**Endpoint**: `POST /api/interviews`

**Request**:
```json
{
  "applicationId": "app_789",
  "candidateId": "cand_123",
  "jobId": "job_101",
  "interviewTypeId": "type_001",
  "scheduledDate": "2025-12-20T14:00:00Z",
  "duration": 60,
  "location": "remote",
  "meetingLink": "https://meet.google.com/...",
  "interviewerIds": ["user_123", "user_456"],
  "notes": "Technical assessment for Python role"
}
```

**Response**: 201 Created with interview object

---

### Get Interview Details

**Endpoint**: `GET /api/interviews/{interviewId}`

**Response**:
```json
{
  "id": "int_123",
  "applicationId": "app_789",
  "candidateId": "cand_123",
  "jobId": "job_101",
  "interviewType": "Technical Assessment",
  "scheduledDate": "2025-12-20T14:00:00Z",
  "duration": 60,
  "location": "remote",
  "meetingLink": "https://meet.google.com/...",
  "interviewers": [
    {
      "userId": "user_123",
      "fullName": "John Manager",
      "feedbackSubmitted": true
    }
  ],
  "status": "Scheduled",
  "createdDate": "2025-12-15"
}
```

---

### Submit Interview Feedback

**Endpoint**: `POST /api/interviews/{interviewId}/feedback`

**Request**:
```json
{
  "rating": 4,
  "technicalSkillsRating": 5,
  "communicationRating": 4,
  "culturalFitRating": 3,
  "recommendation": "Approve",
  "strengths": "Strong technical knowledge, good problem-solving",
  "weaknesses": "Could improve on communication in large groups",
  "notes": "Candidate is well-qualified and ready to move forward"
}
```

**Response**: 201 Created with feedback object

---

### Get Interview Feedback Summary

**Endpoint**: `GET /api/interviews/{interviewId}/feedback/summary`

**Response**:
```json
{
  "totalInterviewers": 3,
  "averageRating": 4.2,
  "averageTechnicalRating": 4.5,
  "averageCommunicationRating": 4.0,
  "averageCulturalFitRating": 3.8,
  "recommendationDistribution": {
    "approve": 2,
    "conditional": 1,
    "reject": 0
  },
  "consensus": "Strong Approval",
  "feedbacks": [...]
}
```

---

### Cancel Interview

**Endpoint**: `DELETE /api/interviews/{interviewId}`

**Response**: 204 No Content

---

## Offer Management API

### Create Offer

**Endpoint**: `POST /api/offers`

**Request**:
```json
{
  "applicationId": "app_789",
  "candidateId": "cand_123",
  "jobId": "job_101",
  "jobTitle": "Senior Python Developer",
  "departmentId": "dept_123",
  "startDate": "2026-01-15",
  "contractDuration": null,
  "salary": 100000,
  "currency": "USD",
  "paymentFrequency": "Monthly",
  "benefits": {
    "healthInsurance": true,
    "stockOptions": 1000,
    "bonusTarget": "20%"
  },
  "leaveAllowance": 20,
  "workSchedule": "40 hours per week",
  "notes": "Offer for senior Python role"
}
```

**Response**: 201 Created with offer object

---

### Get Offer Details

**Endpoint**: `GET /api/offers/{offerId}`

**Response**:
```json
{
  "id": "offer_456",
  "applicationId": "app_789",
  "candidateId": "cand_123",
  "candidateName": "John Doe",
  "candidateEmail": "john@example.com",
  "jobId": "job_101",
  "jobTitle": "Senior Python Developer",
  "department": "Engineering",
  "startDate": "2026-01-15",
  "salary": 100000,
  "currency": "USD",
  "status": "Sent",
  "sentDate": "2025-12-20",
  "acceptanceDeadline": "2025-12-30",
  "respondedDate": null,
  "response": null,
  "createdDate": "2025-12-20"
}
```

---

### Send Offer

**Endpoint**: `POST /api/offers/{offerId}/send`

**Request**:
```json
{
  "templateId": "template_789",
  "emailMessage": "Please review the attached offer and let us know if you have any questions.",
  "acceptanceDeadline": "2025-12-30"
}
```

**Response**: 200 OK

---

### Update Offer Status

**Endpoint**: `PUT /api/offers/{offerId}/status`

**Request**:
```json
{
  "status": "Accepted"
}
```

**Valid Statuses**: Draft, Sent, Accepted, Rejected, Withdrawn, Expired, Negotiating

**Response**: 200 OK

---

## Application Pipeline API

### Move Application in Pipeline

**Endpoint**: `POST /api/applications/pipeline/move`

**Request**:
```json
{
  "applicationId": "app_789",
  "targetStageId": "stage_003"
}
```

**Response**: 200 OK

---

### Reject Application

**Endpoint**: `POST /api/applications/reject`

**Request**:
```json
{
  "applicationId": "app_789",
  "rejectionReason": "Not qualified",
  "notes": "Experience requirement not met",
  "sendEmail": true,
  "emailTemplateId": "template_rejection"
}
```

**Response**: 200 OK

---

## Employee Management API

### Create Employee

**Endpoint**: `POST /api/employees`

**Request**:
```json
{
  "email": "john.doe@company.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "departmentId": "dept_123",
  "managerId": "emp_456",
  "jobTitle": "Senior Python Developer",
  "jobPositionId": "pos_789",
  "startDate": "2026-01-15",
  "employmentType": "Full-time",
  "salaryGrade": "Grade 5",
  "costCenter": "ENG-001",
  "officeLocationId": "loc_123"
}
```

**Response**: 201 Created with employee object

---

### Search Employees

**Endpoint**: `POST /api/employees/search`

**Request**:
```json
{
  "searchText": "John",
  "departmentIds": ["dept_123"],
  "managerIds": ["emp_456"],
  "statuses": ["Active"],
  "pageIndex": 0,
  "pageSize": 20
}
```

**Response**: 200 OK with employee list

---

### Get Employee Details

**Endpoint**: `GET /api/employees/{employeeId}`

**Response**: Employee object with full details

---

### Update Employee

**Endpoint**: `PUT /api/employees/{employeeId}`

**Request**: Partial employee object with fields to update

**Response**: 200 OK

---

## Email Management API

### Create Email Template

**Endpoint**: `POST /api/email-templates`

**Request**:
```json
{
  "name": "Interview Invitation",
  "subject": "Interview Invitation for {{jobTitle}}",
  "body": "<h1>Interview Invitation</h1><p>Dear {{candidateName}},...</p>",
  "type": "Interview",
  "isActive": true
}
```

**Response**: 201 Created with template object

---

### Send Email

**Endpoint**: `POST /api/email/send-email`

**Request**:
```json
{
  "recipientEmail": "john@example.com",
  "templateId": "template_123",
  "variables": {
    "candidateName": "John Doe",
    "jobTitle": "Senior Developer"
  },
  "attachments": ["offer_document.pdf"]
}
```

**Response**: 200 OK

---

## Settings API

### Get Currencies

**Endpoint**: `GET /api/settings/currencies`

**Response**:
```json
[
  {
    "id": "curr_001",
    "code": "USD",
    "name": "US Dollar",
    "symbol": "$"
  },
  {
    "id": "curr_002",
    "code": "EUR",
    "name": "Euro",
    "symbol": "€"
  }
]
```

---

### Get Job Board Providers

**Endpoint**: `GET /api/settings/job-board-providers`

**Response**:
```json
[
  {
    "id": "provider_001",
    "name": "ITviec",
    "isConfigured": true,
    "applicationsCount": 45
  },
  {
    "id": "provider_002",
    "name": "LinkedIn",
    "isConfigured": false,
    "applicationsCount": 0
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "BadRequest",
  "message": "Invalid request parameters",
  "details": {
    "email": "Email is required",
    "salary": "Salary must be positive"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "NotFound",
  "message": "Candidate not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Candidate with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred",
  "traceId": "0HN1GJ2K3L4M5N6O"
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters**:
- `pageIndex` (0-based): Page number
- `pageSize`: Items per page (default: 20, max: 100)

**Response**:
```json
{
  "items": [],
  "totalCount": 150,
  "pageIndex": 0,
  "pageSize": 20
}
```

---

## Rate Limiting

- **Limit**: 1000 requests per hour
- **Header**: `X-RateLimit-Remaining`
- **Status**: 429 Too Many Requests if exceeded

---

## Versioning

Current API Version: `v1`

Future versions will be available as:
- `/api/v2/...`
- `/api/v3/...`

---

## Related Documentation

- [Backend Patterns](../../claude/backend-patterns.md)
- [Authentication Guide](../../Accounts/API-REFERENCE.md)

---

*Last Updated: 2025-12-30*
