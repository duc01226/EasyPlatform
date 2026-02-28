# bravoSURVEYS API Reference

Complete reference for all bravoSURVEYS REST API endpoints with request/response examples, error codes, and authentication details.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Survey Management API](#survey-management-api)
3. [Pages API](#pages-api)
4. [Questions API](#questions-api)
5. [Distributions API](#distributions-api)
6. [Respondents API](#respondents-api)
7. [Results & Analytics API](#results--analytics-api)
8. [Reports API](#reports-api)
9. [Themes & Layouts API](#themes--layouts-api)
10. [Contacts & Lists API](#contacts--lists-api)
11. [Translation API](#translation-api)
12. [Access Control API](#access-control-api)
13. [Error Codes & Responses](#error-codes--responses)
14. [Rate Limiting](#rate-limiting)
15. [Pagination & Filtering](#pagination--filtering)

## Authentication & Authorization

### Authentication Scheme

All bravoSURVEYS API endpoints require authentication via OAuth 2.0 / JWT bearer token.

**Header Format:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Required Permissions

| Permission Level | Operations | Use Cases |
|-----------------|-----------|-----------|
| None | No access | - |
| View | Read survey and results only | Analysts, viewers |
| Edit | Modify survey design | Creators, editors |
| Distribute | Send surveys and manage distributions | Managers, creators |
| Full | All operations | Owners, admins |

### Authorization Policies

- **Standard:** CompanyRoleAuthorizationPolicies.EmployeePolicy (same company)
- **Admin:** System administrator role bypasses permission checks
- **Survey-Level:** Granular access controls can override role-based defaults

---

## Survey Management API

**Base URL:** `/api/surveys`

### List Surveys
```http
GET /api/surveys
Content-Type: application/json
Authorization: Bearer {token}
```

**Query Parameters:**
- `skip` (integer) - Number of records to skip (default: 0)
- `take` (integer) - Number of records to return (default: 10)
- `status` (string) - Filter by status: Draft, Active, Closed
- `searchText` (string) - Search by title or description

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "survey-123",
      "title": "Customer Satisfaction Survey",
      "description": "Q4 satisfaction measurement",
      "status": "Active",
      "createdDate": "2025-12-01T10:00:00Z",
      "modifiedDate": "2025-12-20T15:30:00Z",
      "pageCount": 5,
      "questionCount": 18,
      "responseCount": 156
    }
  ],
  "totalCount": 45,
  "hasMore": true
}
```

### Create Survey
```http
POST /api/surveys
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Employee Engagement Survey",
  "description": "Annual engagement assessment",
  "language": "en",
  "settings": {
    "allowAnononymousResponses": false,
    "allowMultipleResponses": false,
    "responseValidation": true
  }
}
```

**Response (201 Created):**
```json
{
  "id": "survey-456",
  "title": "Employee Engagement Survey",
  "status": "Draft",
  "createdDate": "2025-12-31T12:00:00Z",
  "modifiedDate": "2025-12-31T12:00:00Z"
}
```

### Get Survey
```http
GET /api/surveys/{surveyId}
Authorization: Bearer {token}
```

**Path Parameters:**
- `surveyId` (string, required) - Survey identifier

**Response (200 OK):**
```json
{
  "id": "survey-456",
  "title": "Employee Engagement Survey",
  "description": "Annual engagement assessment",
  "status": "Draft",
  "language": "en",
  "pages": [
    {
      "id": "page-1",
      "pageNumber": 1,
      "title": "Demographics",
      "questionCount": 4
    }
  ],
  "settings": {
    "allowAnonymousResponses": false,
    "allowMultipleResponses": false
  },
  "createdDate": "2025-12-01T10:00:00Z",
  "modifiedDate": "2025-12-31T12:00:00Z"
}
```

### Update Survey
```http
PUT /api/surveys/{surveyId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Employee Engagement Survey 2025",
  "description": "Updated annual engagement assessment",
  "settings": {
    "allowAnonymousResponses": true,
    "allowMultipleResponses": false,
    "responseValidation": true
  },
  "eTag": "W/\"v1-abc123\""
}
```

**Response (200 OK):**
```json
{
  "id": "survey-456",
  "title": "Employee Engagement Survey 2025",
  "status": "Draft",
  "modifiedDate": "2025-12-31T13:00:00Z",
  "eTag": "W/\"v2-def456\""
}
```

### Delete Survey (Soft Delete)
```http
DELETE /api/surveys/{surveyId}
Authorization: Bearer {token}
```

**Response (204 No Content)**

### Duplicate Survey
```http
POST /api/surveys/{surveyId}/duplicate
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "newTitle": "Employee Engagement Survey - Copy"
}
```

**Response (201 Created):**
```json
{
  "id": "survey-789",
  "title": "Employee Engagement Survey - Copy",
  "status": "Draft",
  "createdDate": "2025-12-31T14:00:00Z"
}
```

### Publish Survey
```http
POST /api/surveys/{surveyId}/publish
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "survey-456",
  "status": "Active",
  "publishedDate": "2025-12-31T15:00:00Z"
}
```

---

## Pages API

**Base URL:** `/api/surveys/{surveyId}/pages`

### List Pages
```http
GET /api/surveys/{surveyId}/pages
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "page-1",
      "surveyId": "survey-456",
      "pageNumber": 1,
      "title": "Demographics",
      "displayLogic": null,
      "questionCount": 4
    },
    {
      "id": "page-2",
      "surveyId": "survey-456",
      "pageNumber": 2,
      "title": "Experience",
      "displayLogic": "always",
      "questionCount": 5
    }
  ],
  "totalCount": 5
}
```

### Create Page
```http
POST /api/surveys/{surveyId}/pages
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Feedback & Suggestions",
  "displayLogic": "always",
  "displayLogicRules": []
}
```

**Response (201 Created):**
```json
{
  "id": "page-6",
  "surveyId": "survey-456",
  "pageNumber": 6,
  "title": "Feedback & Suggestions",
  "displayLogic": "always"
}
```

### Get Page
```http
GET /api/surveys/{surveyId}/pages/{pageId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "page-1",
  "surveyId": "survey-456",
  "pageNumber": 1,
  "title": "Demographics",
  "displayLogic": null,
  "questions": [
    {
      "id": "q-1",
      "questionText": "What is your department?",
      "questionType": "SingleChoice",
      "required": true
    }
  ]
}
```

### Update Page
```http
PUT /api/surveys/{surveyId}/pages/{pageId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "title": "Demographic Information",
  "displayLogic": "conditional",
  "displayLogicRules": [
    {
      "condition": "q-5",
      "operator": "equals",
      "value": "manager"
    }
  ],
  "eTag": "W/\"v1-abc123\""
}
```

**Response (200 OK):**
```json
{
  "id": "page-1",
  "title": "Demographic Information",
  "displayLogic": "conditional",
  "modifiedDate": "2025-12-31T15:30:00Z"
}
```

### Delete Page
```http
DELETE /api/surveys/{surveyId}/pages/{pageId}
Authorization: Bearer {token}
```

**Response (204 No Content)**

### Reorder Questions on Page
```http
PATCH /api/surveys/{surveyId}/pages/{pageId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "questionOrder": ["q-3", "q-1", "q-2", "q-4"]
}
```

**Response (200 OK):**
```json
{
  "id": "page-1",
  "questions": [
    { "id": "q-3", "position": 1 },
    { "id": "q-1", "position": 2 },
    { "id": "q-2", "position": 3 },
    { "id": "q-4", "position": 4 }
  ]
}
```

---

## Questions API

**Base URL:** `/api/surveys/{surveyId}/pages/{pageId}/questions`

### List Questions
```http
GET /api/surveys/{surveyId}/pages/{pageId}/questions
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "q-1",
      "pageId": "page-1",
      "questionText": "What is your department?",
      "questionType": "SingleChoice",
      "required": true,
      "position": 1,
      "optionCount": 8
    }
  ],
  "totalCount": 4
}
```

### Create Question
```http
POST /api/surveys/{surveyId}/pages/{pageId}/questions
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body (Single Choice Example):**
```json
{
  "questionText": "How satisfied are you with our service?",
  "questionType": "SingleChoice",
  "required": true,
  "helpText": "Please select one option",
  "options": [
    {
      "optionText": "Very Satisfied",
      "value": "5"
    },
    {
      "optionText": "Satisfied",
      "value": "4"
    },
    {
      "optionText": "Neutral",
      "value": "3"
    },
    {
      "optionText": "Dissatisfied",
      "value": "2"
    },
    {
      "optionText": "Very Dissatisfied",
      "value": "1"
    }
  ]
}
```

**Request Body (Open-Ended Example):**
```json
{
  "questionText": "What could we improve?",
  "questionType": "OpenEnded",
  "required": false,
  "answerType": "LongText",
  "maxLength": 500
}
```

**Supported Question Types:**
- `SingleChoice` (radio buttons)
- `MultipleChoice` (checkboxes)
- `OpenEnded` (text/long text)
- `Dropdown` (select list)
- `Rating` (numeric scale)
- `Matrix` (grid questions)
- `Ranking` (order items)
- `DatePicker` (date selection)
- `NumericInput` (numeric values)

**Response (201 Created):**
```json
{
  "id": "q-10",
  "pageId": "page-2",
  "questionText": "How satisfied are you with our service?",
  "questionType": "SingleChoice",
  "required": true,
  "position": 1,
  "createdDate": "2025-12-31T15:00:00Z"
}
```

### Get Question
```http
GET /api/surveys/{surveyId}/pages/{pageId}/questions/{questionId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "q-10",
  "pageId": "page-2",
  "questionText": "How satisfied are you with our service?",
  "questionType": "SingleChoice",
  "required": true,
  "options": [
    {
      "id": "opt-1",
      "optionText": "Very Satisfied",
      "value": "5",
      "displayOrder": 1
    }
  ],
  "displayLogic": null,
  "skipLogic": null
}
```

### Update Question
```http
PUT /api/surveys/{surveyId}/pages/{pageId}/questions/{questionId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "questionText": "How satisfied are you with our products and services?",
  "required": true,
  "helpText": "Updated help text",
  "options": [
    {
      "optionText": "Very Satisfied",
      "value": "5"
    }
  ],
  "eTag": "W/\"v1-abc123\""
}
```

**Response (200 OK):**
```json
{
  "id": "q-10",
  "questionText": "How satisfied are you with our products and services?",
  "modifiedDate": "2025-12-31T15:45:00Z"
}
```

### Delete Question
```http
DELETE /api/surveys/{surveyId}/pages/{pageId}/questions/{questionId}
Authorization: Bearer {token}
```

**Response (204 No Content)**

### Set Question Logic
```http
PATCH /api/surveys/{surveyId}/pages/{pageId}/questions/{questionId}/logic
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "displayLogic": "conditional",
  "displayLogicRules": [
    {
      "parentQuestionId": "q-5",
      "operator": "equals",
      "value": "manager",
      "action": "show"
    }
  ],
  "skipLogic": "conditional",
  "skipLogicRules": [
    {
      "parentQuestionId": "q-8",
      "operator": "lessThan",
      "value": "2",
      "action": "skip"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "q-10",
  "displayLogic": "conditional",
  "skipLogic": "conditional",
  "updatedDate": "2025-12-31T16:00:00Z"
}
```

---

## Distributions API

**Base URL:** `/api/surveys/{surveyId}/distributions`

### List Distributions
```http
GET /api/surveys/{surveyId}/distributions
Authorization: Bearer {token}
```

**Query Parameters:**
- `status` (string) - Filter by status: Draft, Scheduled, Sending, Sent, Cancelled
- `type` (string) - Filter by type: Email, SMS

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "dist-1",
      "surveyId": "survey-456",
      "type": "Email",
      "status": "Sent",
      "createdDate": "2025-12-20T10:00:00Z",
      "sentDate": "2025-12-21T10:00:00Z",
      "recipientCount": 150,
      "sentCount": 148,
      "responseCount": 56
    }
  ],
  "totalCount": 8
}
```

### Create Email Distribution
```http
POST /api/surveys/{surveyId}/distributions/add-email
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "respondentListId": "list-123",
  "fromName": "Survey Team",
  "fromAddress": "surveys@company.com",
  "replyToAddress": "support@company.com",
  "subject": "Your Opinion Matters - {FirstName}",
  "emailBody": "Hi {FirstName},\n\nWe'd like to hear your feedback. Please complete our survey:\n\n{SurveyLink}\n\nThank you!"
}
```

**Response (201 Created):**
```json
{
  "id": "dist-5",
  "surveyId": "survey-456",
  "type": "Email",
  "status": "Draft",
  "createdDate": "2025-12-31T16:30:00Z"
}
```

**Personalization Variables (Merge Fields):**
- `{FirstName}` - Respondent first name
- `{LastName}` - Respondent last name
- `{Email}` - Respondent email address
- `{Phone}` - Respondent phone number
- `{CustomField}` - Custom respondent field
- `{SurveyLink}` - Survey access link

### Create SMS Distribution
```http
POST /api/surveys/{surveyId}/distributions/add-sms
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "respondentListId": "list-123",
  "senderName": "Company",
  "messageTemplate": "Hi {FirstName}, please take our survey: {SurveyLink}"
}
```

**Response (201 Created):**
```json
{
  "id": "dist-6",
  "surveyId": "survey-456",
  "type": "SMS",
  "status": "Draft",
  "createdDate": "2025-12-31T16:45:00Z"
}
```

### Get Distribution Status
```http
GET /api/surveys/{surveyId}/distributions/{distributionId}/status
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "dist-1",
  "status": "Sent",
  "sentDate": "2025-12-21T10:00:00Z",
  "metrics": {
    "totalInvitations": 150,
    "successfullySent": 148,
    "bounced": 2,
    "opened": 89,
    "openRate": "60.1%",
    "responseCount": 56,
    "responseRate": "37.3%",
    "completionRate": "35.3%"
  }
}
```

### Schedule Distribution
```http
PATCH /api/surveys/{surveyId}/distributions/{distributionId}/schedule
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "sendImmediately": false,
  "scheduledSendDate": "2026-01-15T10:00:00Z",
  "reminders": [
    {
      "reminderType": "Day",
      "reminderValue": 3,
      "sendToNonRespondentsOnly": true
    },
    {
      "reminderType": "Day",
      "reminderValue": 7,
      "sendToNonRespondentsOnly": true
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "dist-5",
  "status": "Scheduled",
  "scheduledSendDate": "2026-01-15T10:00:00Z",
  "reminders": [
    {
      "scheduledDate": "2026-01-18T10:00:00Z",
      "reminderDays": 3
    }
  ]
}
```

### Resend to Non-Respondents
```http
POST /api/surveys/{surveyId}/distributions/{distributionId}/resend
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "dist-1",
  "status": "Resending",
  "resendDate": "2025-12-31T17:00:00Z",
  "nonResponderCount": 94,
  "message": "Resend initiated for 94 non-respondents"
}
```

### Cancel Distribution
```http
DELETE /api/surveys/{surveyId}/distributions/{distributionId}
Authorization: Bearer {token}
```

**Response (204 No Content)**

---

## Respondents API

**Base URL:** `/api/surveys/{surveyId}/respondents`

### Import Respondents (Preview)
```http
POST /api/surveys/{surveyId}/respondents/preview-data
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Parameters:**
- `file` (file, required) - CSV or Excel file with respondent data

**Response (200 OK):**
```json
{
  "fileName": "respondents.csv",
  "rowCount": 150,
  "columnNames": ["FirstName", "LastName", "Email", "Phone", "Department"],
  "preview": [
    {
      "rowNumber": 1,
      "data": {
        "FirstName": "John",
        "LastName": "Smith",
        "Email": "john.smith@company.com",
        "Phone": "555-0100",
        "Department": "Sales"
      }
    }
  ],
  "detectedColumns": ["FirstName", "LastName", "Email", "Phone"]
}
```

### Import Respondents (Execute)
```http
POST /api/surveys/{surveyId}/respondents/importcontacts
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "fileName": "respondents.csv",
  "columnMapping": {
    "FirstName": "FirstName",
    "LastName": "LastName",
    "Email": "Email",
    "Phone": "Phone",
    "Department": "CustomField_1"
  },
  "importMode": "add",
  "createListIfNotExists": true,
  "listName": "Q4 Survey Respondents"
}
```

**Import Modes:**
- `add` - Add new respondents, skip duplicates
- `replace` - Replace entire list
- `merge` - Merge with existing data

**Response (200 OK):**
```json
{
  "importId": "import-456",
  "totalRows": 150,
  "successCount": 148,
  "errorCount": 2,
  "errors": [
    {
      "rowNumber": 25,
      "error": "Invalid email format",
      "data": { "Email": "invalid.email@" }
    },
    {
      "rowNumber": 87,
      "error": "Duplicate email",
      "data": { "Email": "jane.doe@company.com" }
    }
  ],
  "createdListId": "list-123",
  "importedDate": "2025-12-31T17:15:00Z"
}
```

### Get Respondent Status
```http
GET /api/surveys/{surveyId}/respondents/{respondentId}/status
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "respondent-456",
  "name": "John Smith",
  "email": "john.smith@company.com",
  "invitationStatus": "Sent",
  "invitationSentDate": "2025-12-21T10:00:00Z",
  "responseStatus": "Responded",
  "responseReceivedDate": "2025-12-22T14:30:00Z",
  "completionStatus": "Complete",
  "progressPercentage": 100,
  "responseTime": "5 minutes"
}
```

### List Respondents
```http
GET /api/surveys/{surveyId}/respondents/list
Authorization: Bearer {token}
```

**Query Parameters:**
- `skip` (integer) - Records to skip
- `take` (integer) - Records to return
- `status` (string) - Filter by status: Pending, Sent, Bounced, Responded, Withdrawn

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "respondent-456",
      "name": "John Smith",
      "email": "john.smith@company.com",
      "invitationStatus": "Sent",
      "responseStatus": "Responded",
      "completionStatus": "Complete"
    }
  ],
  "totalCount": 150,
  "hasMore": true
}
```

---

## Results & Analytics API

**Base URL:** `/api/surveys/{surveyId}/result`

### Get Survey Dashboard
```http
GET /api/surveys/{surveyId}/dashboard
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "surveyId": "survey-456",
  "totalResponses": 56,
  "responseRate": "37.3%",
  "completionRate": "35.3%",
  "averageTimeToComplete": "5 minutes",
  "responseTrend": [
    {
      "date": "2025-12-21",
      "count": 12
    },
    {
      "date": "2025-12-22",
      "count": 18
    }
  ],
  "completionByPage": [
    {
      "pageNumber": 1,
      "completionRate": "100%"
    },
    {
      "pageNumber": 2,
      "completionRate": "92%"
    }
  ],
  "partialVsComplete": {
    "complete": 56,
    "partial": 12
  }
}
```

### Get Aggregated Results
```http
GET /api/surveys/{surveyId}/result/aggregated-respondents
Authorization: Bearer {token}
```

**Query Parameters:**
- `questionId` (string) - Specific question ID
- `dateRange` (string) - Filter by date range
- `respondentSegment` (string) - Filter by respondent group

**Response (200 OK):**
```json
{
  "surveyId": "survey-456",
  "totalResponses": 56,
  "questions": [
    {
      "id": "q-10",
      "questionText": "How satisfied are you with our service?",
      "questionType": "SingleChoice",
      "responses": [
        {
          "optionText": "Very Satisfied",
          "count": 28,
          "percentage": "50%"
        },
        {
          "optionText": "Satisfied",
          "count": 18,
          "percentage": "32.1%"
        },
        {
          "optionText": "Neutral",
          "count": 7,
          "percentage": "12.5%"
        },
        {
          "optionText": "Dissatisfied",
          "count": 2,
          "percentage": "3.6%"
        },
        {
          "optionText": "Very Dissatisfied",
          "count": 1,
          "percentage": "1.8%"
        }
      ],
      "avgRating": "4.2",
      "medianRating": "5"
    }
  ]
}
```

### Get Open-Ended Responses
```http
GET /api/surveys/{surveyId}/result/open-responses
Authorization: Bearer {token}
```

**Query Parameters:**
- `questionId` (string, required) - Question ID for text responses
- `skip` (integer) - Records to skip
- `take` (integer) - Records to return
- `searchText` (string) - Search responses by keyword

**Response (200 OK):**
```json
{
  "questionId": "q-15",
  "questionText": "What could we improve?",
  "totalResponses": 34,
  "responses": [
    {
      "respondentName": "John Smith",
      "responseText": "Better customer service response time would be appreciated.",
      "respondedDate": "2025-12-22T14:30:00Z",
      "tags": ["service"]
    },
    {
      "respondentName": "Jane Doe",
      "responseText": "Product quality has improved significantly.",
      "respondedDate": "2025-12-22T15:00:00Z",
      "tags": ["quality"]
    }
  ],
  "wordFrequency": [
    {
      "word": "service",
      "frequency": 8
    },
    {
      "word": "quality",
      "frequency": 6
    },
    {
      "word": "improvement",
      "frequency": 5
    }
  ]
}
```

### Update Result Visibility Settings
```http
PATCH /api/surveys/{surveyId}/result/settings
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "showToRespondents": false,
  "allowResultDownload": true,
  "resultVisibilityDate": "2025-12-31T12:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "surveyId": "survey-456",
  "resultSettings": {
    "showToRespondents": false,
    "allowResultDownload": true
  }
}
```

---

## Reports API

**Base URL:** `/api/reports`

### List Reports
```http
GET /api/reports
Authorization: Bearer {token}
```

**Query Parameters:**
- `surveyId` (string) - Filter by survey
- `skip` (integer) - Records to skip
- `take` (integer) - Records to return

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "report-1",
      "surveyId": "survey-456",
      "title": "Executive Summary",
      "reportType": "Summary",
      "createdDate": "2025-12-20T10:00:00Z",
      "pageCount": 3
    }
  ],
  "totalCount": 5
}
```

### Create Report
```http
POST /api/reports
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "surveyId": "survey-456",
  "title": "Q4 Satisfaction Analysis",
  "reportType": "Detailed",
  "pages": [
    {
      "pageNumber": 1,
      "title": "Overview",
      "elements": [
        {
          "type": "Title",
          "content": "Q4 Customer Satisfaction Report"
        },
        {
          "type": "Chart",
          "questionId": "q-10",
          "chartType": "BarChart"
        }
      ]
    }
  ],
  "filters": {
    "dateRange": {
      "startDate": "2025-10-01",
      "endDate": "2025-12-31"
    },
    "respondentSegment": "all"
  }
}
```

**Report Types:**
- `Summary` - High-level metrics and key findings
- `Detailed` - All question data with visualizations
- `CrossTabulation` - Compare segments
- `Trend` - Responses over time

**Response (201 Created):**
```json
{
  "id": "report-5",
  "surveyId": "survey-456",
  "title": "Q4 Satisfaction Analysis",
  "createdDate": "2025-12-31T18:00:00Z",
  "status": "Ready"
}
```

### Get Report
```http
GET /api/reports/{reportId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "id": "report-5",
  "surveyId": "survey-456",
  "title": "Q4 Satisfaction Analysis",
  "pages": [
    {
      "pageNumber": 1,
      "title": "Overview",
      "elements": [
        {
          "type": "Chart",
          "data": [
            {
              "label": "Very Satisfied",
              "value": 28
            }
          ]
        }
      ]
    }
  ]
}
```

### Delete Report
```http
DELETE /api/reports/{reportId}
Authorization: Bearer {token}
```

**Response (204 No Content)**

### Create Report Template
```http
POST /api/reports/templates
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Standard Satisfaction Report",
  "description": "Standard template for satisfaction surveys",
  "reportConfiguration": {
    "pages": [
      {
        "title": "Summary",
        "elements": []
      }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "template-1",
  "name": "Standard Satisfaction Report",
  "createdDate": "2025-12-31T18:15:00Z"
}
```

---

## Themes & Layouts API

**Base URL:** `/api/themes` and `/api/layouts`

### Create Theme
```http
POST /api/themes
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Corporate Blue",
  "primaryColor": "#0066CC",
  "accentColor": "#FF6600",
  "backgroundColor": "#FFFFFF",
  "fontFamily": "Segoe UI",
  "fontSize": "14px",
  "logoUrl": "https://company.com/logo.png",
  "headerImageUrl": "https://company.com/header.jpg"
}
```

**Response (201 Created):**
```json
{
  "id": "theme-1",
  "name": "Corporate Blue",
  "createdDate": "2025-12-31T18:30:00Z"
}
```

### Apply Theme to Survey
```http
PATCH /api/surveys/{surveyId}/theme
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "themeId": "theme-1"
}
```

**Response (200 OK):**
```json
{
  "surveyId": "survey-456",
  "appliedTheme": "theme-1",
  "updatedDate": "2025-12-31T18:45:00Z"
}
```

### List Layouts
```http
GET /api/layouts
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "layout-1",
      "name": "Multi-Page with Progress",
      "description": "Questions displayed on separate pages with progress bar"
    },
    {
      "id": "layout-2",
      "name": "Single-Page Scrolling",
      "description": "All questions on one page with scrolling"
    }
  ]
}
```

---

## Contacts & Lists API

**Base URL:** `/api/contacts` and `/api/contact-lists`

### Create Contact
```http
POST /api/contacts
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@company.com",
  "phone": "555-0100",
  "customFields": {
    "department": "Sales",
    "location": "New York"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "contact-123",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@company.com",
  "createdDate": "2025-12-31T19:00:00Z"
}
```

### Create Contact List
```http
POST /api/contact-lists
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Sales Team",
  "description": "All sales department contacts",
  "contactIds": ["contact-123", "contact-124", "contact-125"]
}
```

**Response (201 Created):**
```json
{
  "id": "list-456",
  "name": "Sales Team",
  "contactCount": 3,
  "createdDate": "2025-12-31T19:15:00Z"
}
```

---

## Translation API

**Base URL:** `/api/surveys/{surveyId}/translations`

### Create Translation
```http
POST /api/surveys/{surveyId}/translations
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "targetLanguage": "es",
  "targetLanguageName": "Spanish"
}
```

**Response (201 Created):**
```json
{
  "id": "trans-1",
  "surveyId": "survey-456",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "status": "Draft",
  "createdDate": "2025-12-31T19:30:00Z"
}
```

### Update Translation
```http
PUT /api/surveys/{surveyId}/translations/{translationId}
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "translations": [
    {
      "sourceText": "How satisfied are you with our service?",
      "translatedText": "¿Qué tan satisfecho está con nuestro servicio?",
      "elementType": "Question",
      "elementId": "q-10"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "trans-1",
  "status": "InProgress",
  "completionPercentage": "45%"
}
```

---

## Access Control API

**Base URL:** `/api/surveys/{surveyId}/access`

### Grant Survey Access
```http
POST /api/surveys/{surveyId}/access
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userId": "user-789",
  "permissionLevel": "Edit"
}
```

**Permission Levels:**
- `View` - Read-only access
- `Edit` - Can modify survey design
- `Distribute` - Can send and manage distributions
- `Full` - All permissions

**Response (201 Created):**
```json
{
  "id": "access-1",
  "surveyId": "survey-456",
  "userId": "user-789",
  "permissionLevel": "Edit",
  "grantedDate": "2025-12-31T19:45:00Z"
}
```

---

## Error Codes & Responses

### HTTP Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Successful operation |
| 201 | Created | Resource created successfully |
| 204 | No Content | Resource deleted; no response body |
| 400 | Bad Request | Validation error or malformed request |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions for operation |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource state conflict (e.g., duplicate) |
| 412 | Precondition Failed | Concurrency conflict (ETag mismatch) |
| 422 | Unprocessable Entity | Business logic validation failed |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required and must not be empty"
    },
    {
      "field": "language",
      "message": "Language must be a valid ISO 639-1 code (e.g., 'en', 'es', 'fr')"
    }
  ],
  "timestamp": "2025-12-31T20:00:00Z"
}
```

**403 Forbidden (Permission Denied):**
```json
{
  "success": false,
  "message": "Access denied",
  "error": "You do not have permission to modify this survey. Required permission: Edit",
  "requiredPermission": "Edit",
  "userPermission": "View",
  "timestamp": "2025-12-31T20:05:00Z"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Survey not found",
  "resourceType": "Survey",
  "resourceId": "survey-999",
  "timestamp": "2025-12-31T20:10:00Z"
}
```

**412 Precondition Failed (Concurrency):**
```json
{
  "success": false,
  "message": "Concurrent modification detected",
  "reason": "Resource was modified by another user after you loaded it",
  "currentETag": "W/\"v3-xyz789\"",
  "yourETag": "W/\"v1-abc123\"",
  "timestamp": "2025-12-31T20:15:00Z"
}
```

---

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1735686600
```

### Rate Limit Policy

- **Standard tier:** 1,000 requests per hour
- **Premium tier:** 10,000 requests per hour
- **Reset period:** Hourly

**429 Too Many Requests:**
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "rateLimitInfo": {
    "limit": 1000,
    "remaining": 0,
    "resetTime": "2026-01-01T00:00:00Z",
    "retryAfter": 3600
  }
}
```

---

## Pagination & Filtering

### Pagination Parameters

All list endpoints support pagination:

```http
GET /api/surveys?skip=0&take=10
```

**Parameters:**
- `skip` (integer, default: 0) - Number of records to skip
- `take` (integer, default: 10, max: 100) - Number of records to return

**Response Structure:**
```json
{
  "items": [...],
  "totalCount": 150,
  "skip": 0,
  "take": 10,
  "hasMore": true
}
```

### Filtering Parameters

Endpoints support filtering where applicable:

```http
GET /api/surveys?status=Active&searchText=satisfaction
```

**Common Filters:**
- `status` - Filter by entity status
- `searchText` - Full-text search
- `dateRange` - Filter by date range
- `respondentSegment` - Filter by respondent group
- `type` - Filter by type (e.g., distribution type)

### Sorting Parameters

```http
GET /api/surveys?sortBy=createdDate&sortOrder=desc
```

**Parameters:**
- `sortBy` (string) - Field to sort by
- `sortOrder` (string) - `asc` or `desc`

---

## Common Operations Examples

### Create a Survey and Distribute

1. **Create Survey**
```http
POST /api/surveys
{ "title": "Customer Satisfaction", ... }
```

2. **Add Pages**
```http
POST /api/surveys/{surveyId}/pages
{ "title": "Demographics", ... }
```

3. **Add Questions**
```http
POST /api/surveys/{surveyId}/pages/{pageId}/questions
{ "questionText": "...", "questionType": "SingleChoice", ... }
```

4. **Import Respondents**
```http
POST /api/surveys/{surveyId}/respondents/importcontacts
{ "columnMapping": {...}, "importMode": "add" }
```

5. **Distribute via Email**
```http
POST /api/surveys/{surveyId}/distributions/add-email
{ "respondentListId": "...", "subject": "...", "emailBody": "..." }
```

6. **Monitor Results**
```http
GET /api/surveys/{surveyId}/result/aggregated-respondents
```

---

**Last Updated:** 2025-12-31
**Version:** 1.0
**Status:** Production Ready

**Related Documentation:**
- [README.md](README.md) - Complete technical reference
- [INDEX.md](INDEX.md) - Documentation index and navigation guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
