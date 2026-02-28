# bravoGROWTH API Reference Guide

> Complete REST API endpoints for bravoGROWTH microservices

---

## Base URL

```
Production: https://api.bravosuite.com
Development: http://localhost:8080
API Version: v1
Service: Growth.Service (.NET 8)
```

---

## Authentication

All endpoints require Bearer token authentication and company role authorization:

```
Authorization: Bearer {accessToken}
X-Company-Id: {companyId}
```

**Token obtained from**: Platform authentication endpoint
**Authorization**: Company Role Authorization Policies

---

## Goal Management API

### List Goals

**Endpoint**: `GET /api/goal/get-goal-list`

**Description**: Retrieve all goals assigned to or created by the current user with filtering

**Query Parameters**:
```
pageIndex: number         // Pagination index (default: 0)
pageSize: number          // Items per page (default: 20)
status: string[]          // Filter by status (Draft, Active, Completed, Cancelled)
searchText: string        // Free text search
dateFrom: ISO8601         // Filter goals created after date
dateTo: ISO8601           // Filter goals created before date
alignment: string         // Filter by alignment level
```

**Response**:
```json
{
  "items": [
    {
      "id": "goal_123",
      "title": "Increase Sales Revenue",
      "description": "Grow Q4 revenue by 20%",
      "status": "Active",
      "measurementUnit": "%",
      "targetValue": 120,
      "currentValue": 85,
      "visibilityScope": "Team",
      "targetDate": "2025-12-31",
      "createdDate": "2025-10-01",
      "createdBy": "emp_456"
    }
  ],
  "totalCount": 45,
  "pageIndex": 0,
  "pageSize": 20
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden

---

### Get Goal Detail

**Endpoint**: `GET /api/goal/by-id`

**Query Parameters**:
```
id: string (required)     // Goal ID
```

**Response**:
```json
{
  "id": "goal_123",
  "title": "Increase Sales Revenue",
  "description": "Grow Q4 revenue by 20%",
  "status": "Active",
  "measurementUnit": "%",
  "targetValue": 120,
  "currentValue": 85,
  "visibilityScope": "Team",
  "targetDate": "2025-12-31",
  "goalEmployees": [
    {
      "employeeId": "emp_456",
      "employeeName": "John Smith",
      "role": "Owner"
    }
  ],
  "checkIns": [
    {
      "checkInId": "ci_789",
      "checkInDate": "2025-12-15",
      "discussionPoints": ["Progress update", "Blockers"]
    }
  ],
  "createdDate": "2025-10-01",
  "updatedDate": "2025-12-10"
}
```

**Status Codes**: 200 OK, 404 Not Found, 401 Unauthorized

---

### Create Goal

**Endpoint**: `POST /api/goal`

**Request Body**:
```json
{
  "title": "Launch New Product",
  "description": "Complete development and launch of product X",
  "measurementUnit": "Units",
  "targetValue": 1000,
  "currentValue": 0,
  "targetDate": "2025-12-31",
  "visibilityScope": "Organization",
  "employeeIds": ["emp_456", "emp_789"],
  "parentGoalId": null
}
```

**Response**:
```json
{
  "id": "goal_124",
  "title": "Launch New Product",
  "status": "Draft",
  "createdDate": "2025-12-31"
}
```

**Validation Rules**:
- `title` is required and must be non-empty
- `measurementUnit` must be valid
- `targetValue` must be greater than 0
- `visibilityScope` must be one of: Private, Team, Organization
- `targetDate` must be in the future

**Status Codes**: 201 Created, 400 Bad Request, 409 Conflict (duplicate), 401 Unauthorized

---

### Update Goal Progress

**Endpoint**: `POST /api/goal/update-goal-current-value`

**Request Body**:
```json
{
  "goalId": "goal_123",
  "currentValue": 95,
  "notes": "Achieved 95% of target through Q4 campaign"
}
```

**Response**:
```json
{
  "id": "goal_123",
  "currentValue": 95,
  "updatedDate": "2025-12-31"
}
```

**Validation Rules**:
- `goalId` must exist
- `currentValue` must be within valid measurement scale
- Goal must be in Active status
- User must have write permission

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Update Goal

**Endpoint**: `PUT /api/goal/{goalId}`

**Request Body**:
```json
{
  "title": "Updated Goal Title",
  "description": "Updated description",
  "measurementUnit": "%",
  "targetValue": 125,
  "targetDate": "2026-01-31",
  "visibilityScope": "Team",
  "status": "Active"
}
```

**Response**: 200 OK with updated goal object

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Delete Goal

**Endpoint**: `POST /api/goal/delete`

**Request Body**:
```json
{
  "goalIds": ["goal_123", "goal_124"]
}
```

**Response**:
```json
{
  "deletedCount": 2,
  "failedIds": []
}
```

**Validation Rules**:
- Goals must not be in active performance review
- User must have admin or manager role
- Soft-delete preserves audit trail

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden

---

### Goal Visibility Options

**Endpoint**: `GET /api/goal/goal-visibilities`

**Response**:
```json
[
  {
    "value": "Private",
    "label": "Only Me"
  },
  {
    "value": "Team",
    "label": "My Team"
  },
  {
    "value": "Organization",
    "label": "Organization"
  }
]
```

**Status Codes**: 200 OK, 401 Unauthorized

---

### Goal Owners

**Endpoint**: `GET /api/goal/goal-owners`

**Response**:
```json
[
  {
    "id": "emp_456",
    "name": "John Smith",
    "email": "john@example.com",
    "department": "Sales"
  }
]
```

**Status Codes**: 200 OK, 401 Unauthorized

---

### Goal Dashboards

**Endpoint**: `GET /api/goal/dashboard-summary`

**Description**: Summary KPIs for goal completion

**Response**:
```json
{
  "totalGoals": 45,
  "onTrackGoals": 32,
  "atRiskGoals": 10,
  "completedGoals": 3,
  "completionRate": 6.67,
  "teamGoalsAverage": 4.5
}
```

---

**Endpoint**: `GET /api/goal/dashboard-table`

**Description**: Detailed goal table with drill-down

**Query Parameters**:
```
teamId: string          // Filter by team
departmentId: string    // Filter by department
pageIndex: number
pageSize: number
```

---

**Endpoint**: `GET /api/goal/dashboard-employee`

**Description**: Employee-specific goal dashboard

---

## Check-In Management API

### Create Check-In

**Endpoint**: `POST /api/checkin`

**Request Body**:
```json
{
  "title": "Q4 Performance Check-in",
  "targetEmployeeId": "emp_456",
  "checkingEmployeeId": "emp_789",
  "checkInDate": "2025-12-20T10:00:00Z",
  "durationInMinutes": 30,
  "discussionPointIds": ["dp_123", "dp_456"],
  "isRecurring": true,
  "recurringFrequency": "Weekly"
}
```

**Response**:
```json
{
  "id": "ci_789",
  "status": "Scheduled",
  "createdDate": "2025-12-31"
}
```

**Status Codes**: 201 Created, 400 Bad Request, 409 Conflict, 401 Unauthorized

---

### Get Check-In

**Endpoint**: `GET /api/checkin/{id}`

**Response**:
```json
{
  "id": "ci_789",
  "title": "Q4 Performance Check-in",
  "targetEmployeeId": "emp_456",
  "targetEmployeeName": "John Smith",
  "checkingEmployeeId": "emp_789",
  "checkingEmployeeName": "Jane Manager",
  "checkInDate": "2025-12-20T10:00:00Z",
  "durationInMinutes": 30,
  "status": "Scheduled",
  "discussionPoints": [
    {
      "id": "dp_123",
      "title": "Goal Progress",
      "isCompleted": false
    }
  ],
  "notes": [],
  "createdDate": "2025-12-01"
}
```

**Status Codes**: 200 OK, 404 Not Found, 401 Unauthorized

---

### List Check-Ins

**Endpoint**: `GET /api/checkin`

**Query Parameters**:
```
employeeId: string      // Filter by employee
status: string[]        // Filter by status
dateFrom: ISO8601       // Check-in date range start
dateTo: ISO8601         // Check-in date range end
pageIndex: number
pageSize: number
```

**Response**:
```json
{
  "items": [
    {
      "id": "ci_789",
      "title": "Q4 Performance Check-in",
      "targetEmployeeName": "John Smith",
      "checkInDate": "2025-12-20",
      "status": "Scheduled",
      "durationInMinutes": 30
    }
  ],
  "totalCount": 52,
  "pageIndex": 0,
  "pageSize": 20
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Update Check-In

**Endpoint**: `POST /api/checkin/update`

**Request Body**:
```json
{
  "checkInId": "ci_789",
  "title": "Updated Check-in Title",
  "checkInDate": "2025-12-20T10:00:00Z",
  "durationInMinutes": 45,
  "notes": "Discussed Q4 goals and progress"
}
```

**Response**: 200 OK with updated check-in

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Partial Update Check-In

**Endpoint**: `POST /api/checkin/partial-update`

**Description**: Update specific fields without replacing entire object

**Request Body**:
```json
{
  "checkInId": "ci_789",
  "notes": "New notes added",
  "discussionPointsCompleted": ["dp_123", "dp_456"]
}
```

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Update Check-In Status

**Endpoint**: `POST /api/checkin/update-status`

**Request Body**:
```json
{
  "checkInId": "ci_789",
  "status": "Completed"
}
```

**Valid Statuses**: Scheduled, Completed, Rescheduled, Cancelled

**Response**: 200 OK

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Delete Check-In

**Endpoint**: `POST /api/checkin/delete`

**Request Body**:
```json
{
  "checkInIds": ["ci_789", "ci_790"]
}
```

**Response**:
```json
{
  "deletedCount": 2,
  "failedIds": []
}
```

**Restrictions**: Managers only, soft-delete

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden

---

### Check-In Dashboards

**Endpoint**: `GET /api/checkin/dashboard-summary`

**Response**:
```json
{
  "totalCheckIns": 48,
  "completedCheckIns": 35,
  "pendingCheckIns": 13,
  "overdueCheckIns": 2,
  "completionRate": 72.9
}
```

---

**Endpoint**: `GET /api/checkin/dashboard-team`

**Description**: Team-specific check-in metrics

---

**Endpoint**: `GET /api/checkin/dashboard-organization`

**Description**: Organization-wide check-in metrics

---

## Performance Review API

### Create Performance Review Event

**Endpoint**: `POST /api/performancereview/save-event`

**Request Body**:
```json
{
  "title": "2025 Q4 Performance Review",
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2026-01-15T23:59:59Z",
  "reviewType": "360",
  "employeeIds": ["emp_456", "emp_789", "emp_101"],
  "templateIds": ["tpl_123", "tpl_456"],
  "description": "Comprehensive 360-degree review cycle for Q4"
}
```

**Response**:
```json
{
  "id": "review_123",
  "status": "Planning",
  "createdDate": "2025-12-31",
  "participantCount": 3
}
```

**Validation Rules**:
- `startDate` must be before `endDate`
- `reviewType` must be one of: 360, Manager-Only, Self
- No overlapping review events for same employees
- Reviewers must be valid employees in company

**Status Codes**: 201 Created, 400 Bad Request, 409 Conflict (overlap), 401 Unauthorized

---

### Get Performance Review Event

**Endpoint**: `GET /api/performancereview/{eventId}`

**Response**:
```json
{
  "id": "review_123",
  "title": "2025 Q4 Performance Review",
  "startDate": "2025-12-01",
  "endDate": "2026-01-15",
  "status": "Active",
  "reviewType": "360",
  "participants": [
    {
      "employeeId": "emp_456",
      "employeeName": "John Smith",
      "status": "In Progress",
      "assignedReviewers": 3
    }
  ],
  "assessmentProgress": {
    "totalAssignments": 15,
    "completedAssignments": 8,
    "pendingAssignments": 7
  }
}
```

**Status Codes**: 200 OK, 404 Not Found, 401 Unauthorized

---

### List Performance Review Events

**Endpoint**: `GET /api/performancereview/events`

**Query Parameters**:
```
status: string[]        // Filter by status (Planning, Active, Completed, Closed)
reviewType: string      // Filter by review type
dateFrom: ISO8601       // Start date range
dateTo: ISO8601         // End date range
pageIndex: number
pageSize: number
```

**Response**:
```json
{
  "items": [
    {
      "id": "review_123",
      "title": "2025 Q4 Performance Review",
      "status": "Active",
      "reviewType": "360",
      "startDate": "2025-12-01",
      "endDate": "2026-01-15",
      "participantCount": 3
    }
  ],
  "totalCount": 12,
  "pageIndex": 0,
  "pageSize": 20
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Answer Performance Assessment

**Endpoint**: `POST /api/performancereview/assessment/answer-assessment`

**Description**: Submit assessment responses for a specific question

**Request Body**:
```json
{
  "assessmentId": "assess_456",
  "questionId": "q_789",
  "ratingValue": 4,
  "comments": "Demonstrates strong leadership skills",
  "saveDraft": false
}
```

**Response**: 200 OK

**Rating Scale**: Typically 1-5 or custom per template

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Save Assessment

**Endpoint**: `POST /api/performancereview/assessment/save-assessment`

**Description**: Submit complete assessment form

**Request Body**:
```json
{
  "assessmentId": "assess_456",
  "eventId": "review_123",
  "reviewedEmployeeId": "emp_456",
  "reviewerEmployeeId": "emp_789",
  "answers": [
    {
      "questionId": "q_789",
      "ratingValue": 4,
      "comments": "Strong performer"
    }
  ],
  "overallComments": "Excellent contribution this quarter"
}
```

**Response**: 200 OK with assessment submission confirmation

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Get Calibration Session

**Endpoint**: `GET /api/performancereview/assessment/get-calibration-session`

**Query Parameters**:
```
eventId: string (required)      // Review event ID
competencyId: string             // Filter by competency
```

**Response**:
```json
{
  "eventId": "review_123",
  "competency": "Leadership",
  "ratingDistribution": {
    "1": 2,
    "2": 5,
    "3": 15,
    "4": 8,
    "5": 1
  },
  "assessments": [
    {
      "employeeId": "emp_456",
      "employeeName": "John Smith",
      "rating": 5,
      "reviewerName": "Jane Manager"
    }
  ]
}
```

**Status Codes**: 200 OK, 404 Not Found, 401 Unauthorized

---

### Check Overlapping Reviews

**Endpoint**: `GET /api/performancereview/check-overlap`

**Query Parameters**:
```
startDate: ISO8601 (required)
endDate: ISO8601 (required)
employeeIds: string[] (required)
excludeEventId: string (optional)
```

**Response**:
```json
{
  "hasOverlap": false,
  "overlappingEvents": []
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Delete Performance Review Event

**Endpoint**: `POST /api/performancereview/delete`

**Request Body**:
```json
{
  "eventId": "review_123",
  "reason": "Cycle postponed to Q1"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Review event deleted",
  "deletedAssessmentsCount": 8
}
```

**Restrictions**: HR/Performance Admin only, soft-delete

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized, 403 Forbidden

---

## TimeSheet API

### Get TimeSheet Cycles

**Endpoint**: `GET /api/timesheet/time-sheet-cycle`

**Response**:
```json
[
  {
    "id": "cycle_1",
    "startDate": "2025-12-01",
    "endDate": "2025-12-07",
    "status": "Open",
    "cycleType": "Weekly"
  }
]
```

**Status Codes**: 200 OK, 401 Unauthorized

---

### Get Employee TimeSheet

**Endpoint**: `POST /api/timesheet`

**Request Body**:
```json
{
  "employeeId": "emp_456",
  "cycleId": "cycle_1"
}
```

**Response**:
```json
{
  "employeeId": "emp_456",
  "employeeName": "John Smith",
  "startDate": "2025-12-01",
  "endDate": "2025-12-07",
  "totalHours": 40,
  "overtimeHours": 0,
  "status": "Pending",
  "timeLogs": [
    {
      "date": "2025-12-01",
      "clockInTime": "09:00:00",
      "clockOutTime": "17:30:00",
      "hoursWorked": 8.5,
      "notes": ""
    }
  ]
}
```

**Status Codes**: 200 OK, 404 Not Found, 401 Unauthorized

---

### Add Time Log for Employee

**Endpoint**: `POST /api/timesheet/add-time-log-for-employee`

**Request Body**:
```json
{
  "employeeId": "emp_456",
  "date": "2025-12-01",
  "hoursWorked": 8,
  "clockInTime": "09:00:00",
  "clockOutTime": "17:00:00",
  "notes": "Regular workday",
  "timeLogType": "Regular"
}
```

**Response**: 201 Created with time log details

**Status Codes**: 201 Created, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Get TimeSheet Settings

**Endpoint**: `GET /api/timesheet/get-setting-of-current-company`

**Response**:
```json
{
  "cycleType": "Weekly",
  "startDayOfWeek": "Monday",
  "overtimeThreshold": 40,
  "overtimeMultiplier": 1.5,
  "approvalWorkflow": "DirectManager",
  "autoApproveAfterDays": 0,
  "requireAttachments": false
}
```

**Status Codes**: 200 OK, 401 Unauthorized, 403 Forbidden

---

### Save TimeSheet Settings

**Endpoint**: `POST /api/timesheet/save-setting`

**Request Body**:
```json
{
  "cycleType": "Bi-Weekly",
  "startDayOfWeek": "Monday",
  "overtimeThreshold": 40,
  "overtimeMultiplier": 1.5,
  "approvalWorkflow": "DirectManager",
  "autoApproveAfterDays": 3
}
```

**Response**: 200 OK with saved settings

**Restrictions**: HR Manager only

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden

---

### Toggle TimeSheet Cycle

**Endpoint**: `POST /api/timesheet/toggle-time-sheet-cycle`

**Request Body**:
```json
{
  "cycleId": "cycle_1",
  "action": "Close"
}
```

**Valid Actions**: Open, Close, Lock

**Response**: 200 OK

**Status Codes**: 200 OK, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Check TimeSheet Cycle Blocked

**Endpoint**: `GET /api/timesheet/validate/check-time-sheet-cycle-blocked`

**Query Parameters**:
```
cycleId: string (required)
```

**Response**:
```json
{
  "isBlocked": false,
  "blockReason": null
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Export TimeSheet

**Endpoint**: `POST /api/timesheet/export-file`

**Request Body**:
```json
{
  "cycleId": "cycle_1",
  "employeeIds": ["emp_456", "emp_789"],
  "format": "Excel",
  "includeOvertime": true
}
```

**Response**: File download (Excel or PDF)

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Import TimeSheet

**Endpoint**: `POST /api/timesheet/import-from-file`

**Request Body**: Form data with file upload

**Supported Formats**: Excel (.xlsx, .xls), CSV

**Response**:
```json
{
  "importedCount": 45,
  "failedCount": 2,
  "errors": [
    {
      "rowNumber": 3,
      "error": "Invalid date format"
    }
  ]
}
```

**Status Codes**: 200 OK, 400 Bad Request, 413 Payload Too Large, 401 Unauthorized

---

## Form Template API

### List Form Templates

**Endpoint**: `GET /api/formtemplate`

**Query Parameters**:
```
status: string          // Active, Inactive, All
searchText: string      // Template name search
pageIndex: number
pageSize: number
```

**Response**:
```json
{
  "items": [
    {
      "id": "tpl_123",
      "name": "360 Assessment Form",
      "description": "Comprehensive 360-degree feedback",
      "status": "Active",
      "questionCount": 25,
      "createdDate": "2025-10-01"
    }
  ],
  "totalCount": 12,
  "pageIndex": 0,
  "pageSize": 20
}
```

**Status Codes**: 200 OK, 400 Bad Request, 401 Unauthorized

---

### Get Form Template

**Endpoint**: `GET /api/formtemplate/{templateId}`

**Response**:
```json
{
  "id": "tpl_123",
  "name": "360 Assessment Form",
  "description": "Comprehensive 360-degree feedback",
  "status": "Active",
  "sections": [
    {
      "id": "sec_456",
      "title": "Core Competencies",
      "questions": [
        {
          "id": "q_789",
          "text": "Demonstrates technical expertise",
          "type": "Rating Scale 1-5",
          "required": true
        }
      ]
    }
  ]
}
```

**Status Codes**: 200 OK, 404 Not Found, 401 Unauthorized

---

### Create Form Template

**Endpoint**: `POST /api/formtemplate`

**Request Body**:
```json
{
  "name": "New Assessment Template",
  "description": "Template for manager reviews",
  "sections": [
    {
      "title": "Performance",
      "questions": [
        {
          "text": "Rate overall performance",
          "type": "Rating Scale 1-5",
          "required": true,
          "order": 1
        }
      ]
    }
  ]
}
```

**Response**: 201 Created with template ID

**Status Codes**: 201 Created, 400 Bad Request, 409 Conflict (duplicate name), 401 Unauthorized

---

### Clone Form Template

**Endpoint**: `POST /api/formtemplate/clone`

**Request Body**:
```json
{
  "sourceTemplateId": "tpl_123",
  "newName": "2026 Assessment Template"
}
```

**Response**: 201 Created with new template ID and cloned content

**Status Codes**: 201 Created, 400 Bad Request, 404 Not Found, 401 Unauthorized

---

### Delete Form Template

**Endpoint**: `POST /api/formtemplate/delete`

**Request Body**:
```json
{
  "templateId": "tpl_123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

**Restrictions**: Can only delete if not used by completed reviews

**Status Codes**: 200 OK, 400 Bad Request (template in use), 404 Not Found, 401 Unauthorized

---

## Common Error Responses

### 400 Bad Request

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required. Invalid or missing bearer token."
}
```

### 403 Forbidden

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have permission to perform this action"
}
```

### 404 Not Found

```json
{
  "code": "NOT_FOUND",
  "message": "Resource not found",
  "resourceId": "goal_999"
}
```

### 409 Conflict

```json
{
  "code": "CONFLICT",
  "message": "Resource already exists or operation violates business rules",
  "reason": "overlapping_review_event"
}
```

### 500 Internal Server Error

```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "correlationId": "req_12345678"
}
```

---

## Response Status Codes Summary

| Code | Meaning | Retry |
|------|---------|-------|
| 200 | Success | No |
| 201 | Created | No |
| 204 | No Content | No |
| 400 | Bad Request | No |
| 401 | Unauthorized | No |
| 403 | Forbidden | No |
| 404 | Not Found | No |
| 409 | Conflict | No |
| 413 | Payload Too Large | No |
| 500 | Server Error | Yes |
| 503 | Service Unavailable | Yes |

---

## Request Headers

All requests should include:

```
Content-Type: application/json
Authorization: Bearer {accessToken}
X-Company-Id: {companyId}
X-Request-Id: {uniqueRequestId}  // Optional, for tracing
```

---

## Pagination

List endpoints use consistent pagination:

```json
{
  "items": [],
  "totalCount": 100,
  "pageIndex": 0,
  "pageSize": 20,
  "totalPages": 5
}
```

**Query Parameters**:
- `pageIndex` (0-based): Page number
- `pageSize` (1-100): Items per page, default 20

---

## Filtering & Sorting

Most list endpoints support:

```
?status=Active&searchText=keyword&sortBy=createdDate&sortOrder=desc
```

**Common Filter Fields**:
- `status`: By entity status
- `searchText`: Free-text search
- `dateFrom`, `dateTo`: Date range filtering
- `createdBy`: Filter by creator

**Sort Options**:
- `createdDate`, `updatedDate`, `name`, `status`
- `sortOrder`: `asc` or `desc`

---

## Rate Limiting

API implements rate limiting:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
```

- **Limit**: 1000 requests per hour per API token
- **Retry-After**: Provided in 429 response

---

## API Versioning

Current API version: **v1**

Future versions will be available at `/api/v2/` etc.

---

## Changelog

### Version 1.0 (Current)
- Initial release with all 5 modules
- 40+ endpoints
- Full CQRS support

---

**Last Updated:** 2025-12-31
**Service Version:** .NET 8
**Documentation Status:** Complete
