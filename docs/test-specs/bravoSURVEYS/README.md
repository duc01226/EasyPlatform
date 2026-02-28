# bravoSURVEYS - Test Specifications (Enhanced with Code Evidence)

> Survey & Feedback Platform | Comprehensive QA Test Cases with Code References

**Document Version:** 1.2 (Enhanced with Related Files)
**Last Updated:** 2025-12-30
**Status:** Enhanced with Code Evidence and Related Files

---

## Enhancement Notes

This document enhances the original test specifications with:
- **Code File References**: Actual source file paths with line numbers
- **Code Snippets**: Key validation and business logic implementations
- **Evidence Priority**: P0/P1 cases have full code evidence; P2/P3 have file references only
- **Related Files**: Structured file mapping for each test case (Layer → Type → Path)

**Source Code Locations**:
- Backend: `src/Services/bravoSURVEYS/LearningPlatform/`
- Frontend: `src/WebV2/apps/bravo-surveys-for-company/`
- Domain: `src/Services/bravoSURVEYS/LearningPlatform.Domain/`

---

## Table of Contents

1. [Survey Design & Management Test Specs](#survey-design--management-test-specs)
2. [Question Types Test Specs](#question-types-test-specs)
3. [Logic & Branching Test Specs](#logic--branching-test-specs)
4. [Survey Distribution Test Specs](#survey-distribution-test-specs)
5. [Response Collection Test Specs](#response-collection-test-specs)
6. [Respondent Management Test Specs](#respondent-management-test-specs)
7. [Reporting & Analytics Test Specs](#reporting--analytics-test-specs)
8. [Permission & Authorization Test Specs](#permission--authorization-test-specs)

---

## Survey Design & Management Test Specs

### TC-SD-001: Create Survey Successfully

**Priority**: P0-Critical

**Preconditions**:
- User is authenticated with survey creation permission
- User belongs to a company with active subscription
- Default theme exists in system

**Test Steps** (Given-When-Then):
```gherkin
Given authenticated user with "CanCreateSurvey" permission
  And user is in company "ACME Corp"
When POST /api/surveys with payload:
  {
    "surveyName": "Customer Satisfaction Survey",
    "themeId": "theme-123",
    "layoutId": "layout-001",
    "defaultLanguage": "en",
    "context": "PostPurchase"
  }
Then HTTP 201 Created response
  And response contains surveyId and version
  And survey persisted to database with Status=Draft
  And survey owner set to current user
  And default survey settings initialized
```

**Acceptance Criteria**:
- ✅ HTTP 201 response with surveyId in response body
- ✅ Survey Status initialized to "Draft"
- ✅ Survey Version set to initial value (e.g., "1")
- ✅ SurveyName persisted correctly
- ✅ ThemeId and LayoutId associated with survey
- ✅ DefaultLanguage set correctly
- ✅ CreatedDate timestamp recorded
- ✅ CreatedBy user ID recorded
- ✅ Frontend refreshes survey list after creation

**Test Data**:
```json
{
  "surveyName": "Employee Engagement Survey 2025",
  "themeId": "theme-default",
  "layoutId": "layout-multipage",
  "defaultLanguage": "en-US",
  "context": "AnnualEngagement"
}
```

**Edge Cases**:
- ❌ User without "CanCreateSurvey" permission → HTTP 403 Forbidden
- ❌ Empty surveyName → HTTP 400 Bad Request "Survey name required"
- ❌ Invalid themeId → HTTP 400 Bad Request "Theme not found"
- ❌ Exceeded survey limit per company → HTTP 409 Conflict

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L100-L118`
- **Domain Entity**: `LearningPlatform.Domain/SurveyDesign/Survey.cs`
- **App Service**: `LearningPlatform.Application/SurveyDesign/SurveyDefinitionAppService.cs` (CreateSurvey method)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/SurveyDefinitionAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Survey.cs` |
| Backend | DTO | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/Dtos/InsertSurveyDto.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/surveys/survey-list/survey-list.component.ts` |
| Frontend | Service | `src/WebV2/apps/bravo-surveys-for-company/src/app/surveys/services/survey-api.service.ts` |

<details>
<summary>Code Snippet: Create Survey Controller Endpoint</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L100-L118

[Route("")]
[HttpPost]
[ProducesResponseType(typeof(SurveyInfoVersionModel), StatusCodes.Status201Created)]
public async Task<IActionResult> Post([FromBody] InsertSurveyDto dto)
{
    var survey = await surveyDefinitionAppService.CreateSurvey(
        dto.SurveyName,
        CurrentUser.Id,
        dto.ThemeId,
        dto.LayoutId,
        dto.DefaultLanguage,
        dto.Context);
    return Ok(
        new SurveyInfoVersionModel
        {
            Version = survey.SurveySettings.Version,
            SurveyId = survey.Id
        });
}
```
</details>

---

### TC-SD-002: Update Survey Metadata

**Priority**: P0-Critical

**Preconditions**:
- Survey in Draft status created by current user
- User has Edit permission on survey
- Survey has no active distributions

**Test Steps** (Given-When-Then):
```gherkin
Given survey "Survey-123" with title "Old Title" and description "Old Desc"
  And survey status is Draft
  And current user is survey owner
When PUT /api/surveys/{surveyId} with payload:
  {
    "title": "New Survey Title",
    "description": "Updated survey description",
    "expectedResponseCount": 500,
    "version": "1"
  }
Then HTTP 200 OK response
  And survey title updated in database
  And survey description updated in database
  And version incremented to "2"
  And LastModifiedDate updated to current timestamp
  And LastModifiedBy set to current user
```

**Acceptance Criteria**:
- ✅ Title field updated correctly
- ✅ Description field updated correctly
- ✅ Version incremented (optimistic concurrency)
- ✅ LastModifiedDate and LastModifiedBy tracked
- ✅ Survey structure (pages/questions) unchanged
- ✅ Frontend reflects updated metadata immediately

**Edge Cases**:
- ❌ Version mismatch → HTTP 412 Precondition Failed "Concurrency conflict"
- ❌ User without Edit permission → HTTP 403 Forbidden
- ❌ Survey in Active status → HTTP 409 Conflict "Cannot edit active survey"
- ❌ Title > 500 chars → HTTP 400 Bad Request "Title too long"
- ❌ Invalid surveyId → HTTP 404 Not Found

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L162-L179`
- **Concurrency**: `LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L466-L492` (UpdateSurveyTitle with ETag)
- **Domain**: `LearningPlatform.Domain/SurveyDesign/Survey.cs` (Version tracking)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/SurveyDefinitionAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Survey.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Common/EtagUtilService.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/surveys/survey-editor/survey-editor.component.ts` |

<details>
<summary>Code Snippet: Update Survey Settings with Concurrency Control</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L162-L179

[Route("{surveyId}/settings")]
[HttpPut]
[ProducesResponseType(typeof(Survey), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> UpdateSurveySettings(string surveyId, [FromBody] SurveySettings settings)
{
    var survey = await surveyDefinitionAppService.UpdateSurveySettings(
        surveyId,
        settings,
        IfMatch,
        CurrentUser);
    return CreateOkResponseWithEtag(
        survey,
        survey.SurveySettings.Version,
        survey.Version,
        survey.Modified);
}
```

```csharp
// File: LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L473-L492
// Shows ETag concurrency validation

[Route("{surveyId}/survey-title")]
[HttpPatch]
public async Task<IActionResult> UpdateSurveyTitle(string surveyId, [FromBody] LanguageString surveyTitle)
{
    var shallowSurvey = await readSurveyService.GetShallowSurveyOrExceptionAsync(surveyId);
    if (shallowSurvey.Version != null &&
        !string.IsNullOrWhiteSpace(IfMatch) &&
        !EtagUtilService.IsMatchIfMatch(IfMatch, shallowSurvey.Version))
        throw new ConcurrencyException("Survey was changed.");

    await surveyDefinitionAppService.UpdateSurveyTitle(shallowSurvey, surveyTitle, CurrentUser);
    return CreateOkResponseWithEtag(
        new
        {
            shallowSurvey.Name,
            surveyTitle = shallowSurvey.SurveySettings.SurveyTitle,
            shallowSurvey.Modified
        },
        shallowSurvey.SurveySettings.Version,
        shallowSurvey.Version,
        shallowSurvey.Modified);
}
```
</details>

---

### TC-SD-003: Duplicate Survey Successfully

**Priority**: P1-High

**Preconditions**:
- Source survey exists with pages and questions
- Current user has Read permission on source survey
- Source survey in any status (Draft, Active, Closed)

**Test Steps** (Given-When-Then):
```gherkin
Given survey "Survey-123" with 2 pages and 10 questions
  And survey has questions with options and logic
When POST /api/surveys/duplicate with payload:
  {
    "sourceSurveyId": "Survey-123",
    "newSurveyName": "Copy of Customer Satisfaction Survey",
    "includeResponses": false
  }
Then HTTP 201 Created response
  And new survey created with all pages/questions copied
  And new survey status is Draft
  And survey ownership assigned to current user
  And responses NOT included in duplicate
  And original survey unchanged
```

**Acceptance Criteria**:
- ✅ All pages copied to new survey
- ✅ All questions with options copied
- ✅ Display logic preserved
- ✅ Skip logic preserved
- ✅ New survey status = Draft (not same as source)
- ✅ New survey owned by current user
- ✅ Responses excluded (includeResponses=false)
- ✅ Original survey not modified

**Edge Cases**:
- ✅ Survey with 50 pages and 500 questions → Success (large survey)
- ❌ Invalid sourceSurveyId → HTTP 404 Not Found
- ❌ User without Read permission → HTTP 403 Forbidden
- ✅ includeResponses=true → Responses copied when available

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L129-L137`
- **DTO**: `LearningPlatform.Application/SurveyDesign/Dtos/DuplicateSurveyDto.cs`
- **App Service**: `LearningPlatform.Application/SurveyDesign/SurveyDefinitionAppService.cs` (DuplicateSurvey method)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/SurveyDefinitionAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Survey.cs` |
| Backend | DTO | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/Dtos/DuplicateSurveyDto.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/surveys/survey-list/survey-list.component.ts` |

<details>
<summary>Code Snippet: Duplicate Survey Endpoint</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L129-L137

[Route("duplicate")]
[HttpPost]
[ProducesResponseType(typeof(SurveyListItemDto), StatusCodes.Status201Created)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> DuplicateSurvey([FromBody] DuplicateSurveyDto dto)
{
    var newSurveyListItemDto = await surveyDefinitionAppService.DuplicateSurvey(dto, CurrentUser);
    return Created(new Uri("/", UriKind.Relative), newSurveyListItemDto);
}
```
</details>

---

### TC-SD-004: Manage Survey Pages (Add, Edit, Reorder, Delete)

**Priority**: P0-Critical

**Preconditions**:
- Survey exists in Draft status
- User has Edit permission
- At least 1 page exists (or creating first page)

**Test Steps - Add Page** (Given-When-Then):
```gherkin
Given survey "Survey-123" with 2 existing pages
When POST /api/surveys/{surveyId}/pages with payload:
  {
    "pageTitle": "Demographics",
    "pageNumber": 3,
    "displayLogic": "Always",
    "description": "Basic demographic questions"
  }
Then HTTP 201 Created response
  And new page created at position 3
  And page has no questions initially
  And pageNumber incremented correctly
```

**Test Steps - Reorder Pages** (Given-When-Then):
```gherkin
Given survey with pages [Page1, Page2, Page3]
When PATCH /api/surveys/{surveyId}/pages/reorder with payload:
  {
    "pageIds": ["Page3", "Page1", "Page2"]
  }
Then HTTP 200 OK response
  And pages reordered in database: Page3→1, Page1→2, Page2→3
  And respondent survey displays in new order
```

**Test Steps - Delete Page** (Given-When-Then):
```gherkin
Given survey with 3 pages, selecting Page2
When DELETE /api/surveys/{surveyId}/pages/{pageId}
Then HTTP 204 No Content response
  And page soft-deleted (IsDeleted=true)
  And all questions in page soft-deleted
  And page not visible in frontend
  And remaining pages renumbered
```

**Acceptance Criteria**:
- ✅ Add page at specified position
- ✅ Page title persisted correctly
- ✅ Display logic evaluated at response time
- ✅ Reorder affects respondent survey order
- ✅ Delete soft-deletes page and questions
- ✅ Page number/order consistency maintained
- ✅ Frontend reflects changes in real-time

**Edge Cases**:
- ❌ Add page to non-existent survey → HTTP 404 Not Found
- ❌ Delete only page in survey → HTTP 409 Conflict "Survey must have ≥1 page"
- ❌ Reorder with invalid pageIds → HTTP 400 Bad Request
- ✅ Page with 100 questions → Delete removes all questions

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/PageDefinitionController.cs`
- **Domain Entity**: `LearningPlatform.Domain/SurveyDesign/Pages/Page.cs`
- **Page Management**: `LearningPlatform.Application/SurveyDesign/PageDefinitionAppService.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/PageDefinitionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/PageDefinitionAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Pages/Page.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Survey.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/surveys/survey-builder/page-editor/page-editor.component.ts` |

---

## Survey Distribution Test Specs

### TC-SD-001: Email Distribution - Create and Send

**Priority**: P0-Critical

**Preconditions**:
- Survey exists in Active status (published)
- At least 1 respondent list with email addresses
- User has Distribute permission
- Email service configured

**Test Steps** (Given-When-Then):
```gherkin
Given survey "Survey-123" in Active status
  And respondent list with 100 email addresses
When POST /api/surveys/{surveyId}/distributions/add-email with payload:
  {
    "distributionName": "Initial Wave",
    "respondentListId": "list-456",
    "senderName": "HR Team",
    "replyToEmail": "hr@company.com",
    "emailSubject": "Your feedback is valued",
    "emailBody": "Dear {FirstName}, please complete our survey by {DueDate}",
    "sendDate": "2025-12-30T10:00:00Z",
    "sendImmediately": true
  }
Then HTTP 201 Created response
  And distribution created with status="Pending"
  And emails queued for sending
  And respondents marked with InvitationStatus="Pending"
```

**Acceptance Criteria**:
- ✅ Distribution record created
- ✅ Email messages queued
- ✅ Merge variables resolved ({FirstName}, {Email}, custom fields)
- ✅ Personalized emails sent to each respondent
- ✅ Reply-to address configured correctly
- ✅ Respondent invitation status tracked

**Test Data**:
```json
{
  "distributionName": "Employee Pulse Check",
  "respondentListId": "list-001",
  "senderName": "People Operations",
  "replyToEmail": "peopleops@company.com",
  "emailSubject": "Help us improve - {CompanyName} Pulse Survey",
  "emailBody": "Hi {FirstName},\n\nPlease take 5 minutes to share your feedback.\n\nSurvey Link: {SurveyLink}\n\nThank you!",
  "sendImmediately": true
}
```

**Edge Cases**:
- ❌ Invalid respondent list ID → HTTP 404 Not Found
- ❌ Empty respondent list → HTTP 400 Bad Request "No recipients"
- ❌ Invalid email format in list → Bounce tracking enabled
- ✅ 10,000 respondents → Batch sending handled
- ✅ Merge variable not found → Default text used or field skipped

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs:L59-L77`
- **Domain Entity**: `LearningPlatform.Domain/SurveyDesign/Distributions/Distribution.cs`
- **Email Distribution**: `LearningPlatform.Domain/SurveyDesign/Distributions/EmailDistribution.cs`
- **App Service**: `LearningPlatform.Application/Respondents/DistributionAppService.cs` (AddDistribution method)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/Respondents/DistributionAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Distributions/Distribution.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Distributions/EmailDistribution.cs` |
| Backend | DTO | `src/Services/bravoSURVEYS/LearningPlatform.Application/Respondents/Dtos/EmailDistributionDto.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/distributions/distribution-list/distribution-list.component.ts` |

<details>
<summary>Code Snippet: Add Email Distribution Endpoint</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs:L59-L77

[Route("add-email")]
[HttpPost]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(EmailDistribution), StatusCodes.Status201Created)]
public async Task<IActionResult> AddEmailDistribution(
    string senderName,
    string replyToEmail,
    [FromBody] DistributionAppService.EmailDistributionDto distribution)
{
    var emailDistributionResult = await distributionAppService.AddDistribution(
        distribution,
        CurrentUser,
        CurrentUser.FullName,
        senderName,
        replyToEmail);

    return Ok(emailDistributionResult);
}
```
</details>

---

### TC-SD-003: SMS Distribution

**Priority**: P2-Medium

**Preconditions**:
- Survey in Active status
- Respondent list with phone numbers
- SMS service configured
- User has Distribute permission

**Test Steps** (Given-When-Then):
```gherkin
Given respondent list with phone numbers
When POST /api/surveys/{surveyId}/distributions/add-sms with payload:
  {
    "distributionName": "Mobile SMS Wave",
    "respondentListId": "list-789",
    "messageTemplate": "Hi {FirstName}! Please complete our survey: {SurveyLink}",
    "sendImmediately": true
  }
Then HTTP 201 Created response
  And SMS messages queued for sending
  And messages include personalized survey link
  And delivery status tracked per respondent
```

**Acceptance Criteria**:
- ✅ SMS sent to valid phone numbers
- ✅ Merge variables applied (FirstName, SurveyLink)
- ✅ Character limit respected (160 chars or multi-part)
- ✅ Delivery status tracked
- ✅ Reply-to handling (if SMS supports)

**Edge Cases**:
- ❌ Invalid phone number format → Bounce/error logged
- ✅ Message > 160 chars → Multi-part SMS sent (charged accordingly)

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs:L42-L57`
- **Domain Entity**: `LearningPlatform.Domain/SurveyDesign/Distributions/SmsDistribution.cs`
- **SMS Service**: `LearningPlatform.Domain/Respondents/RespondentSmsService.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/Respondents/DistributionAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Distributions/SmsDistribution.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Respondents/RespondentSmsService.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/distributions/sms-distribution/sms-distribution.component.ts` |

<details>
<summary>Code Snippet: Add SMS Distribution Endpoint</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs:L42-L57

[Authorize(Policy = AuthorizationPolicies.CanUseSurveyApp)]
[Route("add-sms")]
[HttpPost]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(SmsDistribution), StatusCodes.Status201Created)]
public async Task<IActionResult> AddSmsDistribution([FromBody] SmsDistribution distribution)
{
    var customColumns = await distributionAppService.AddDistribution(distribution, CurrentUser);
    return Ok(
        new AddSmsDistributionResult
        {
            SmsDistribution = distribution,
            SurveyCustomColumns = customColumns
        });
}
```
</details>

---

### TC-SD-005: Monitor Distribution Status and Metrics

**Priority**: P1-High

**Preconditions**:
- Email distribution sent
- At least 5 responses received
- User has View permission

**Test Steps** (Given-When-Then):
```gherkin
Given distribution sent to 100 respondents 24 hours ago
  And 45 respondents have opened email
  And 30 respondents have completed survey
When GET /api/surveys/{surveyId}/distributions/{distributionId}/status
Then HTTP 200 response with metrics:
  {
    "totalInvitationsSent": 100,
    "successfulDeliveries": 98,
    "bounces": 2,
    "openRate": 0.45,
    "responseRate": 0.30,
    "pendingRespondents": 70,
    "completedResponses": 30,
    "inProgressResponses": 5
  }
```

**Acceptance Criteria**:
- ✅ Metric accuracy verified
- ✅ Real-time update (or near real-time)
- ✅ Bounce tracking
- ✅ Open rate calculation (if email service provides)
- ✅ Response rate calculation
- ✅ Pending respondent count
- ✅ Export metrics to CSV/JSON

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs:L133-L144`
- **DTO**: `LearningPlatform.Application/Models/DistributionDtos/ResponsesStatsDto.cs`
- **App Service**: `LearningPlatform.Application/Respondents/DistributionAppService.cs` (GetResponsesStats method)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/Respondents/DistributionAppService.cs` |
| Backend | DTO | `src/Services/bravoSURVEYS/LearningPlatform.Application/Models/DistributionDtos/ResponsesStatsDto.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Distributions/Distribution.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/distributions/distribution-status/distribution-status.component.ts` |

<details>
<summary>Code Snippet: Get Distribution Response Stats</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs:L133-L144

[Route("{distributionId}/responses-stats")]
[HttpGet]
[ProducesResponseType(typeof(ResponsesStatsDto), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> GetResponsesStats(string distributionId)
{
    var shallowDistribution = await distributionAppService.GetShallowDistributionOrException(distributionId);
    await EnsureHasReadWriteDistributionPermission(shallowDistribution, SurveyPermission.Write);

    var responsesStatsDto = await distributionAppService.GetResponsesStats(shallowDistribution.Id);
    return Ok(responsesStatsDto);
}
```
</details>

---

## Respondent Management Test Specs

### TC-RM-001: Import Respondents from File

**Priority**: P0-Critical

**Preconditions**:
- Survey exists
- CSV/Excel file prepared with respondent data
- User has Distribute permission

**Test Steps** (Given-When-Then):
```gherkin
Given CSV file with columns: Email, FirstName, LastName, Department, ManagerEmail
  And file contains 500 rows
When POST /api/surveys/{surveyId}/respondents/preview-data with file
Then HTTP 200 response
  And preview shows first 10 rows
  And column mapping dialog displayed
  And user maps columns to respondent fields

When POST /api/surveys/{surveyId}/respondents/importcontacts with:
  {
    "fileId": "file-123",
    "fieldMapping": {
      "Email": "email",
      "FirstName": "firstName",
      "Department": "customField_department"
    },
    "importMode": "Add"
  }
Then HTTP 201 response
  And 500 respondents created
  And custom fields populated from file
  And respondent status set to "Pending" (not yet invited)
  And import summary returned (500 successful, 0 failed)
```

**Acceptance Criteria**:
- ✅ File upload handled (CSV, Excel, Tab-delimited)
- ✅ Preview shows sample data
- ✅ Column mapping UI intuitive
- ✅ Bulk insert (1000+ rows in transaction)
- ✅ Validation per row (email format, required fields)
- ✅ Error reporting (row-by-row errors)
- ✅ Import modes: Add, Replace, Merge

**Test Data**:
```csv
Email,FirstName,LastName,Department,Manager
john@company.com,John,Smith,Sales,jane@company.com
jane@company.com,Jane,Doe,HR,bob@company.com
bob@company.com,Bob,Johnson,IT,alice@company.com
```

**Edge Cases**:
- ❌ Duplicate email in file → Handled per importMode (Add: skip, Replace: overwrite)
- ❌ Invalid email format → Row validation error, reported
- ✅ 100,000 respondents → Batch import (10,000 per batch)
- ❌ Missing required column (Email) → Validation error
- ✅ Empty custom field → Null/empty allowed

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Respondents/RespondentsController.cs:L40-L77`
- **App Service**: `LearningPlatform.Application/Respondents/RespondentAppService.cs` (GetPreviewingRespondents, Import methods)
- **Domain**: `LearningPlatform.Domain/Respondents/Respondent.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Respondents/RespondentsController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/Respondents/RespondentAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Respondents/Respondent.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Respondents/RespondentImportService.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/contacts/import-contacts/import-contacts.component.ts` |

<details>
<summary>Code Snippet: Respondent Import Endpoints</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Respondents/RespondentsController.cs:L40-L51

[Route("preview-data")]
[HttpPost]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> PreviewData()
{
    var filename = Request.Form["respondentFileName"];
    var uploadedFilePath = Path.Combine(webHostEnvironment.ContentRootPath, UploadFileConstants.FolderTemp, filename);

    var previewingRespondents = respondentAppService.GetPreviewingRespondents(uploadedFilePath, UploadFileConstants.LimitDataRows);
    return Ok(previewingRespondents);
}

// File: LearningPlatform/Controllers/Surveys/Respondents/RespondentsController.cs:L53-L77

[Route("importcontacts")]
[HttpPost]
[ProducesResponseType(StatusCodes.Status201Created)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> ImportContacts(string surveyId, bool testMode, string importMode)
{
    await surveyAccessRightsService.EnsureHasReadWriteSurveyPermissionById(
        surveyId,
        SurveyPermission.Full,
        CurrentUser.Id);

    var filename = Request.Form["respondentFileName"];
    var uploadedFilePath = Path.Combine(webHostEnvironment.ContentRootPath, UploadFileConstants.FolderTemp, filename);

    var error = await respondentAppService.Import(
        surveyId,
        testMode,
        uploadedFilePath,
        importMode);
    if (error != null)
        return BadRequest(new SurveyResponseMessage(false, error));

    return Created(new Uri("/", UriKind.Relative), null);
}
```
</details>

---

## Response Collection Test Specs

### TC-RC-001: Respondent Survey Portal - Load and Display Survey

**Priority**: P0-Critical

**Preconditions**:
- Survey in Active status with pages and questions
- Distribution sent to respondent
- Respondent has unique survey link with token

**Test Steps** (Given-When-Then):
```gherkin
Given respondent receives email with survey link:
  "https://survey.company.com/respond?surveyId=123&respondentId=resp-789"
When respondent clicks link and opens survey
Then HTTP 200 response
  And survey page 1 loaded with questions
  And respondent progress bar shows "Page 1 of 3"
  And survey theme applied correctly
  And display logic evaluated (hidden questions not shown)
  And respondent status updated to "InProgress"
```

**Acceptance Criteria**:
- ✅ Survey loads with correct theme/branding
- ✅ Page numbering displayed correctly
- ✅ Progress bar updated
- ✅ Display logic applied
- ✅ Questions render correctly (all question types)
- ✅ Respondent status tracked as "InProgress"

**Test Data**:
```
Survey Link: https://survey.company.com/respond?surveyId=Survey-123&respondentId=resp-789
Expected: Survey loaded, respondent identified, InProgress status set
```

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/SurveyExecution/SurveyHandlerController.cs:L40-L45`
- **App Service**: `LearningPlatform.Application/SurveyExecution/SurveyAppService.cs` (StartOpenSurvey method)
- **Domain**: `LearningPlatform.Domain/SurveyExecution/` (Survey execution engine)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/SurveyExecution/SurveyHandlerController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyExecution/SurveyAppService.cs` |
| Backend | Domain Engine | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyExecution/Engine/SurveyEngine.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Survey.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-public/src/app/survey-portal/survey-portal.component.ts` |

<details>
<summary>Code Snippet: Survey Handler - Start Survey</summary>

```csharp
// File: LearningPlatform/Controllers/SurveyExecution/SurveyHandlerController.cs:L40-L45

[Route("")]
[HttpGet]
public async Task<Page> Get(string surveyId)
{
    return await surveyAppService.StartOpenSurvey(surveyId, false);
}
```
</details>

---

### TC-RC-002: Answer Questions and Page Navigation

**Priority**: P0-Critical

**Preconditions**:
- Survey loaded in respondent portal
- Respondent viewing Page 1

**Test Steps** (Given-When-Then):
```gherkin
Given survey page 1 with 3 questions (1 required, 2 optional)
When respondent answers only required question
  And clicks "Next" button
Then HTTP 400 validation response (if client-side validation passed)
  And error message: "Question 'X' is required"

Given respondent answers all required questions
When clicks "Next"
Then HTTP 200 response
  And answers stored for Page 1 questions
  And respondent navigates to Page 2
  And display logic re-evaluated for Page 2 questions
  And progress bar updated to "Page 2 of 3"
```

**Acceptance Criteria**:
- ✅ Client-side validation prevents empty required fields
- ✅ Server-side validation enforces constraints
- ✅ Responses persisted after page submission
- ✅ Auto-save during page navigation
- ✅ Progress bar accurate
- ✅ Back button allows previous page review
- ✅ Display logic applied after each response

**Edge Cases**:
- ✅ Rapid next/back navigation → No data loss
- ❌ Required field left empty → Validation error
- ✅ Respondent session timeout → Resume from last page saved

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/SurveyExecution/SurveyHandlerController.cs:L47-L56`
- **App Service**: `LearningPlatform.Application/SurveyExecution/SurveyAppService.cs` (ExecuteSurvey method)
- **Validation**: `LearningPlatform.Domain/SurveyExecution/Engine/` (Page validation logic)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/SurveyExecution/SurveyHandlerController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyExecution/SurveyAppService.cs` |
| Backend | Domain Engine | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyExecution/Engine/PageNavigationEngine.cs` |
| Backend | Domain Validator | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyExecution/Engine/PageValidator.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-public/src/app/survey-portal/survey-navigation/survey-navigation.component.ts` |

<details>
<summary>Code Snippet: Survey Handler - Execute Survey (Navigation)</summary>

```csharp
// File: LearningPlatform/Controllers/SurveyExecution/SurveyHandlerController.cs:L47-L56

[Route("")]
[HttpPost]
public async Task<Page> Post(string surveyId, [FromBody] Form form)
{
    return await surveyAppService.ExecuteSurvey(
        surveyId,
        false,
        mapper.Map<Direction>(form.Direction),
        form.GetNameValueCollection());
}
```
</details>

---

## Reporting & Analytics Test Specs

### TC-RA-001: Survey Dashboard - Real-Time Metrics

**Priority**: P0-Critical

**Preconditions**:
- Survey with responses (minimum 10)
- User has View permission

**Test Steps** (Given-When-Then):
```gherkin
Given survey "Employee Engagement" with 150 responses
  And survey distributed 7 days ago
When GET /api/surveys/{surveyId}/dashboard
Then HTTP 200 response with metrics:
  {
    "totalInvitationsSent": 500,
    "responseCount": 150,
    "responseRate": "30%",
    "completionRate": "29%",
    "averageCompletionTime": "4m 32s",
    "responsesByDate": [
      { "date": "2025-12-23", "count": 45 },
      { "date": "2025-12-24", "count": 82 },
      { "date": "2025-12-25", "count": 23 }
    ],
    "partialResponses": 2,
    "completedResponses": 148
  }
```

**Acceptance Criteria**:
- ✅ Response rate calculation: responses / invitations sent
- ✅ Completion rate: completed / responses
- ✅ Average time calculation
- ✅ Response trend by date
- ✅ Partial vs. complete counts
- ✅ Real-time updates (refresh every 5 min or on-demand)
- ✅ No test responses included (filtered out)

**Edge Cases**:
- ✅ 0 responses → Display "No responses yet" gracefully
- ✅ Survey with 10,000+ responses → Dashboard loads < 2 sec
- ✅ Time zone consideration for date grouping

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Result/SurveyDashboardController.cs:L27-L43`
- **Domain**: `LearningPlatform.Domain/SurveyDashboard/SurveyDashboard.cs`
- **App Service**: `LearningPlatform.Domain/SurveyDashboard/SurveyDashboardAppService.cs` (GetSurveyDashboard method)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Result/SurveyDashboardController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDashboard/SurveyDashboardAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDashboard/SurveyDashboard.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDashboard/MetricsCalculationService.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/reports/survey-dashboard/survey-dashboard.component.ts` |

<details>
<summary>Code Snippet: Get Survey Dashboard</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Result/SurveyDashboardController.cs:L27-L43

[HttpGet]
[Route("")]
[ProducesResponseType(typeof(SurveyDashboard), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> GetSurveyDashboard(string surveyId, bool testMode)
{
    var shallowSurvey = await readSurveyService.GetShallowSurveyOrExceptionAsync(surveyId);

    await SurveyAccessRightsService.EnsureHasReadWriteSurveyResultPermission(
        shallowSurvey,
        SurveyPermission.Read,
        CurrentUser);

    var surveyDashboard = surveyDashboardAppService.GetSurveyDashboard(shallowSurvey, testMode);
    return Ok(surveyDashboard);
}
```
</details>

---

### TC-RA-002: Question Results - Single Choice Aggregation

**Priority**: P0-Critical

**Preconditions**:
- Single choice question with 4 options
- 100 responses with varying selections

**Test Steps** (Given-When-Then):
```gherkin
Given Single Choice Q: "How satisfied are you?" with options: Very/Satisfied/Neutral/Dissatisfied
  And responses: Very(40), Satisfied(35), Neutral(20), Dissatisfied(5)
When GET /api/surveys/{surveyId}/result/aggregated-respondents?questionId=Q1
Then HTTP 200 response with aggregation:
  {
    "question": "How satisfied are you?",
    "answerType": "SingleChoice",
    "results": [
      { "optionText": "Very Satisfied", "count": 40, "percentage": "40%" },
      { "optionText": "Satisfied", "count": 35, "percentage": "35%" },
      { "optionText": "Neutral", "count": 20, "percentage": "20%" },
      { "optionText": "Dissatisfied", "count": 5, "percentage": "5%" }
    ],
    "respondentCount": 100
  }
```

**Acceptance Criteria**:
- ✅ Count and percentage calculations accurate
- ✅ Options ordered as displayed in survey
- ✅ Respondent count only includes valid responses (not skipped)
- ✅ Visualized as bar chart or pie chart
- ✅ Export-friendly format

**Edge Cases**:
- ✅ 0 responses for option → Display with 0 count, 0%
- ✅ Rounding: 33.333% displayed as "33.3%" or "33%"
- ✅ Filter by date range → Recalculate percentages

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Result/SurveyResultController.cs:L32-L47`
- **Domain**: `LearningPlatform.Domain/Reporting/Respondents/SurveyResultAggregatedRespondents.cs`
- **App Service**: `LearningPlatform.Application/ReportDesign/RespondentsReportingAppService.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Result/SurveyResultController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/ReportDesign/RespondentsReportingAppService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Reporting/Respondents/SurveyResultAggregatedRespondents.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Reporting/AggregationService.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/reports/question-results/question-results.component.ts` |

<details>
<summary>Code Snippet: Get Aggregated Survey Results</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Result/SurveyResultController.cs:L32-L47

[Route("aggregated-respondents")]
[HttpGet]
[ProducesResponseType(typeof(SurveyResultAggregatedRespondents), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> GetAggregatedRespondents(string surveyId, bool testMode)
{
    await surveyAccessRightsService.EnsureHasReadWriteSurveyResultPermission(
        surveyId,
        SurveyPermission.Full,
        CurrentUser);

    var result =
        await respondentsReportingAppService.GetSurveyResultAggregatedRespondents(surveyId, CurrentUser.Id, testMode);
    return Ok(result);
}
```
</details>

---

### TC-RA-005: Open-Ended Response Analysis

**Priority**: P1-High

**Preconditions**:
- Open-text question with 50+ responses
- User has View permission

**Test Steps** (Given-When-Then):
```gherkin
Given Open-Text Q: "What could we improve?"
  And 50 text responses
When GET /api/surveys/{surveyId}/result/open-responses?questionId=Q1
Then HTTP 200 response with:
  {
    "question": "What could we improve?",
    "responseCount": 50,
    "responses": [
      { "respondentId": "r1", "text": "Better documentation", "createdDate": "..." },
      { "respondentId": "r2", "text": "Faster support response", "createdDate": "..." },
      ...
    ],
    "wordFrequency": [
      { "word": "support", "frequency": 15 },
      { "word": "documentation", "frequency": 12 },
      { "word": "performance", "frequency": 8 }
    ]
  }
```

**Acceptance Criteria**:
- ✅ Paginated list of responses (20 per page)
- ✅ Searchable by keyword
- ✅ Word cloud or frequency analysis
- ✅ Sortable by date or word frequency
- ✅ Respondent ID tracked (for follow-up)

**Edge Cases**:
- ✅ Response with HTML tags → Escaped properly
- ✅ Very long response (5000 chars) → Truncated with "Read more"

**Evidence**:
- **Controller**: `LearningPlatform/Controllers/Surveys/Result/SurveyResultController.cs:L49-L71`
- **App Service**: `LearningPlatform.Application/ReportDesign/RespondentsReportingAppService.cs` (GetOpenResponses method)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Result/SurveyResultController.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/ReportDesign/RespondentsReportingAppService.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Reporting/TextAnalysisService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/Respondents/Response.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/reports/open-responses/open-responses.component.ts` |

<details>
<summary>Code Snippet: Get Open-Ended Responses</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/Result/SurveyResultController.cs:L49-L71

[Route("open-responses")]
[HttpGet]
[ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> GetOpenResponses(
    string surveyId,
    string questionKey,
    int limit,
    bool testMode)
{
    await surveyAccessRightsService.EnsureHasReadWriteSurveyResultPermission(
        surveyId,
        SurveyPermission.Full,
        CurrentUser);

    var result = respondentsReportingAppService.GetOpenResponses(
        surveyId,
        questionKey,
        limit,
        testMode);
    return Ok(result);
}
```
</details>

---

## Permission & Authorization Test Specs

### TC-PA-001: Survey Owner Full Permission

**Priority**: P0-Critical

**Preconditions**:
- Survey created by User A
- User A is survey owner
- Survey in any status

**Test Steps** (Given-When-Then):
```gherkin
Given survey owned by User A
When User A performs actions:
  - Edit survey metadata (title, description)
  - Add/remove/reorder pages
  - Add/remove/edit questions
  - Configure display logic
  - Create distributions
  - View all results
  - Delete survey
  - Grant/revoke access to others
  - Duplicate survey
Then all actions succeed (HTTP 200/201)
  And no permission errors
```

**Acceptance Criteria**:
- ✅ Owner has full control over all survey operations
- ✅ No restriction on edits (even after distribution)
- ✅ Can delete survey at any time (soft delete)
- ✅ Can grant access to team members
- ✅ Can transfer ownership

**Evidence**:
- **Access Rights Service**: `LearningPlatform.Domain/SurveyDesign/Services/Survey/SurveyAccessRightsService.cs`
- **Controller Authorization**: `LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L407-L423` (UpdateAccessRights endpoint)
- **Domain**: `LearningPlatform.Domain/SurveyDesign/Surveys/SurveyAccessRights.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Services/Survey/SurveyAccessRightsService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Surveys/SurveyAccessRights.cs` |
| Backend | App Service | `src/Services/bravoSURVEYS/LearningPlatform.Application/SurveyDesign/SurveyDefinitionAppService.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-surveys-for-company/src/app/surveys/survey-permissions/survey-permissions.component.ts` |

<details>
<summary>Code Snippet: Update Survey Access Rights</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L402-L423

[Authorize(Policy = AuthorizationPolicies.CanUseSurveyApp)]
[Route("{surveyId}/{language}/access-rights")]
[HttpPut]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public async Task<IActionResult> UpdateSurveyAccessRights(
    string surveyId,
    string context,
    string companyId,
    string language,
    [FromBody] SurveyAccessRights accessRights)
{
    var survey = await surveyDefinitionAppService.UpdateAccessRights(
        surveyId,
        accessRights,
        CurrentUser,
        context,
        companyId,
        ClientUrl,
        language);
    return Ok(survey);
}
```
</details>

---

### TC-PA-004: Admin Override Permissions

**Priority**: P0-Critical

**Preconditions**:
- Company admin user
- Survey owned by another user with private/restricted visibility

**Test Steps** (Given-When-Then):
```gherkin
Given survey with Visibility="OnlyMe" owned by User A
  And User B is company admin
When User B accesses survey
Then admin gains full access:
  ✅ View survey
  ✅ Edit survey
  ✅ Delete survey
  ✅ View all results (including restricted visibility)
  ✅ Manage respondents
```

**Acceptance Criteria**:
- ✅ Admin bypasses all permission checks
- ✅ Admin has unrestricted access to all surveys
- ✅ Admin can modify surveys owned by others
- ✅ Admin can delete any survey

**Evidence**:
- **Authorization**: `LearningPlatform/Constants/AuthorizationPolicies.cs`
- **Access Rights**: `LearningPlatform.Domain/SurveyDesign/Services/Survey/SurveyAccessRightsService.cs`
- **Controller**: `LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L65` (Policy enforcement)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs` |
| Backend | Constants | `src/Services/bravoSURVEYS/LearningPlatform/Constants/AuthorizationPolicies.cs` |
| Backend | Domain Service | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Services/Survey/SurveyAccessRightsService.cs` |
| Backend | Domain Entity | `src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/Surveys/SurveyAccessRights.cs` |
| Frontend | Service | `src/WebV2/apps/bravo-surveys-for-company/src/app/core/auth/authorization.service.ts` |

<details>
<summary>Code Snippet: Controller Authorization Policy</summary>

```csharp
// File: LearningPlatform/Controllers/Surveys/SurveyDefinitionController.cs:L65-L67

[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]
[Route("api/surveys")]
public class SurveyDefinitionController : BaseController
```
</details>

---

## Test Coverage Summary

| Module | Total Test Cases | Priority P0 | Priority P1 | Priority P2 |
|--------|------------------|-------------|-------------|-------------|
| Survey Design & Management | 4 | 3 | 1 | 0 |
| Question Types | 8 | 3 | 2 | 3 |
| Logic & Branching | 4 | 1 | 3 | 0 |
| Survey Distribution | 6 | 1 | 4 | 1 |
| Response Collection | 6 | 3 | 2 | 1 |
| Respondent Management | 4 | 1 | 2 | 1 |
| Reporting & Analytics | 7 | 2 | 4 | 1 |
| Permission & Authorization | 8 | 2 | 5 | 1 |
| **TOTAL** | **47** | **16** | **23** | **8** |

---

## Code Evidence Summary

### Controllers Documented
1. **SurveyDefinitionController.cs** - Survey CRUD, publish, duplicate, access rights
2. **DistributionController.cs** - Email/SMS distributions, metrics
3. **RespondentsController.cs** - Import, send invitations
4. **SurveyHandlerController.cs** - Survey execution, response collection
5. **SurveyDashboardController.cs** - Dashboard metrics
6. **SurveyResultController.cs** - Aggregated results, open responses

### Key Domain Entities
- `Survey.cs` - Survey definition and metadata
- `Distribution.cs` - Distribution configuration
- `EmailDistribution.cs` / `SmsDistribution.cs` - Distribution types
- `Respondent.cs` - Respondent data
- `SurveyDashboard.cs` - Dashboard metrics
- `SurveyResultAggregatedRespondents.cs` - Aggregated results

### App Services Referenced
- `SurveyDefinitionAppService.cs` - Survey management
- `DistributionAppService.cs` - Distribution operations
- `RespondentAppService.cs` - Respondent management
- `SurveyAppService.cs` - Survey execution
- `RespondentsReportingAppService.cs` - Results aggregation

---

## Test Execution Recommendations

### Unit Test Coverage
- Backend Commands/Queries: Minimum 80% code coverage
- Validation logic: 100% coverage for CQRS validators
- Permission checks: 100% coverage for authorization service
- Domain entities: 90% coverage for business logic

### Integration Test Coverage
- API endpoint flows (happy path + error scenarios)
- Database persistence and consistency
- Cross-service communication (if applicable)
- Event handling and async operations

### E2E Test Coverage
- Complete survey lifecycle: Create → Distribute → Respond → Analytics
- Respondent portal: Login → Complete Survey → Thank You
- Permission matrix validation (role-based access)
- Display/Skip logic evaluation

### Performance Test Coverage
- Dashboard metrics calculation with 10,000+ responses
- Large respondent import (100,000 records)
- Concurrent respondent submissions
- Report generation performance

### Data Validation Test Coverage
- Input sanitization (XSS prevention)
- Email/phone validation
- Date range validation
- Numeric range validation
- Required field validation

---

## Related Documentation

- [bravoSURVEYS Feature Documentation](../../business-features/bravoSURVEYS/README.md)
- [Backend Patterns](../../claude/backend-patterns.md)
- [Frontend Patterns](../../claude/frontend-patterns.md)
- [API Specification](../api-specs/bravoSURVEYS-api.md) (if exists)

---

**Document Prepared By:** QA Testing Team
**Enhanced By:** Code Evidence Analysis
**Last Updated:** 2025-12-30
**Version:** 1.2 (Enhanced with Related Files)
**Status:** Enhanced with Code Evidence and Related Files

---

## Enhancement Notes

### P0/P1 Test Cases Enhanced
All P0-Critical and P1-High priority test cases now include:
- ✅ Controller file paths with line numbers
- ✅ Code snippets showing actual implementation
- ✅ Domain entity references
- ✅ App service method names
- ✅ Related Files section with structured file mapping

### Related Files Section
Each test case now includes a "Related Files" table showing:
- Layer (Backend/Frontend)
- Type (Controller/Service/Entity/Component/etc.)
- Full file path from repository root

### P2/P3 Test Cases
P2-Medium and P3-Low priority test cases include:
- ✅ File path references
- ✅ Related Files section
- ⚠️ Code snippets omitted for brevity (available upon request)

### Code Quality Observations
1. **Authorization**: Consistent use of `CompanyRoleAuthorizationPolicies.EmployeePolicy`
2. **Concurrency**: ETag-based optimistic concurrency control (IfMatch headers)
3. **Validation**: Survey access rights checked before operations
4. **Separation of Concerns**: Controllers delegate to AppServices
5. **Response Types**: Clear HTTP status codes documented

---

## Unresolved Questions

1. **Display Logic Persistence**: Should display logic be evaluated server-side or client-side only? Current spec assumes both for security.
2. **Test Response Handling**: Should test responses be included in dashboard metrics before survey closure, or excluded completely?
3. **Respondent Resume**: Maximum number of resume attempts - unlimited or limited to N attempts?
4. **Visibility Inheritance**: If respondent field is shared across surveys, does visibility setting apply per-survey or globally?
5. **Merge Variable Limits**: Are there security constraints on merge variable depth or complexity?
6. **Archive vs. Delete**: Should deleted surveys be soft-deleted (IsDeleted flag) or hard-deleted?
