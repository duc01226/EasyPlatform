# Survey Design Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.SurveyDesignFeature.md](./README.SurveyDesignFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoSURVEYS |
| Service | LearningPlatform.Surveys.Service |
| Database | MongoDB 6.0 |
| Frontend | Angular 19 (WebV2) + Legacy Web |

### File Locations

```
Core Domain:
├── Entities:     src/Services/bravoSURVEYS/LearningPlatform.Domain/SurveyDesign/
├── Commands:     src/Services/bravoSURVEYS/LearningPlatform.Application/UseCaseCommands/
├── Queries:      src/Services/bravoSURVEYS/LearningPlatform.Application/UseCaseQueries/
├── AppServices:  src/Services/bravoSURVEYS/LearningPlatform.Application/AppServices/
├── Controllers:  src/Services/bravoSURVEYS/LearningPlatform.Service/Controllers/
├── DbContext:    src/Services/bravoSURVEYS/LearningPlatform.Infrastructure/

Frontend:
├── Designer:     src/Web/bravoSURVEYSClient/src/app/survey-design/
├── Responder:    src/Web/bravoSURVEYSClient/src/app/survey-responder/
└── Preview:      src/Web/bravoSURVEYSClient/src/app/survey-preview/
```

---

## Domain Model

### Core Entities

```
Survey : RootEntity<Survey, string>
├── Id: string (ULID)
├── CompanyId: string
├── Name: string (unique per company)
├── UserId: string (creator/owner)
├── Status: SurveyStatus (New | Open | TemporarilyClosed | Closed)
├── Type: SurveyTypes (Survey | PerformanceReview | Feedback)
├── Version: string (incremented on publish)
├── LastPublished: DateTime? (for versioning)
├── TopFolder: Folder (root hierarchy)
├── SurveySettings: SurveySettings (behavior config)
├── SurveyAccessRights: SurveyAccessRights (permissions)
├── SharedOptionLists: List<OptionList> (reusable options)
├── DistributionSchedules: List<SurveyDistributionSchedule>
├── LayoutId: string (page layout template)
├── ThemeId: string (theme template)
├── CustomThemeId: string (custom overrides)
├── Tags: HashSet<string> (categorization)
├── Created: DateTime
├── Modified: DateTime
└── IsDeleted: bool (soft-delete)

PageDefinition
├── Id: string
├── SurveyId: string
├── Alias: string (internal reference)
├── Title: LanguageString
├── Description: LanguageString
├── QuestionDefinitions: List<QuestionDefinition> (28+ types)
├── SkipCommands: List<SkipCommand> (conditional logic)
├── OrderType: OrderType (InOrder | Random)
├── PageLayoutId: string (override)
├── PageThemeId: string (override)
├── PageThemeOverrides: Theme (custom properties)
├── NavigationButtonSettings: NavigationButtonSettings
├── RedirectUrl: string (end-of-survey redirect)
└── IsDeleted: bool

QuestionDefinition (Base + 28 Concrete Types)
├── Id: string
├── PageId: string
├── Alias: string (for skip logic)
├── QuestionText: LanguageString
├── HelpText: LanguageString
├── Required: bool
├── ValidationRules: Various (min, max, pattern per type)
├── OptionList: OptionList | IHasOptions
├── Randomize: bool
└── IsDeleted: bool

SurveySettings
├── SurveyTitle: LanguageString
├── Languages: string[] (supported language codes)
├── DefaultLanguage: string (fallback language)
├── EnableBackButton: bool
├── ResumeRespondentWhereLeftOff: bool
├── InvitationOnlySurvey: bool
├── SingleSignOnSurvey: bool
├── KeyboardSupport: bool
├── DisplayProgressBar: bool
├── DisplayRequiredStar: bool
├── OneQuestionAtATimeDesktop: bool
├── OneQuestionAtATimeMobile: bool
├── DisplayPageTitleAndDescription: bool
├── HideQuestionTitles: bool
├── EnableHelp: bool
├── EnablePause: bool
└── PauseSetting: PauseSetting

Folder (Hierarchical)
├── Id: string
├── SurveyId: string
├── Alias: string
├── Title: LanguageString
└── ChildNodes: List<Node> (Folder or PageDefinition)

LanguageString (Multi-Language Support)
└── Items: List<LanguageStringItem>
    ├── Language: string (e.g., "en", "fr", "es")
    └── Text: string (translated content)

SkipCommand (Conditional Logic)
├── Id: string
├── Condition: Condition
├── Expressions: List<Expression> (AND/OR composition)
└── GoToFolder: Folder (target destination)

Expression (Logic Evaluation)
├── QuestionId: string (source question)
├── ExpressionType: ExpressionType (Equals, NotEquals, GreaterThan, LessThan, Contains, etc.)
└── Value: string (comparison value)
```

### Enums

```
SurveyStatus: New(0) | Open(1) | TemporarilyClosed(2) | Closed(3)
SurveyTypes: Survey(0) | PerformanceReview(1) | Feedback(2)
SurveyPermission: Read(1) | Write(2) | Full(3) | ResultViewer(4)
OrderType: InOrder(0) | Random(1)
PageType: ThankYouPage(0)
QuestionType: 28+ types (SingleSelection, MultipleSelection, Rating, Likert, Grid, Matrix, NPS, Date, FileUpload, etc.)
ExpressionType: Equals | NotEquals | GreaterThan | LessThan | Contains | And | Or
EndOfSurveyMode: ThankYouMessage | Redirect
```

### Key Expressions

```csharp
// Company filter
public static Expression<Func<Survey, bool>> OfCompanyExpr(string companyId)
    => s => s.CompanyId == companyId && !s.IsDeleted;

// Survey uniqueness (name per company)
public static Expression<Func<Survey, bool>> UniqueExpr(string companyId, string name)
    => s => s.CompanyId == companyId && s.Name == name;

// Survey owner check
public static Expression<Func<Survey, bool>> OwnerExpr(string userId)
    => s => s.UserId == userId && !s.IsDeleted;

// Active surveys (Open status)
public static Expression<Func<Survey, bool>> ActiveExpr(string companyId)
    => s => s.CompanyId == companyId && s.Status == SurveyStatus.Open && !s.IsDeleted;
```

---

## API Contracts

### Survey Commands

```
POST /api/survey
├── Request:  { name, type, defaultLanguage }
├── Response: { id, name, status: "New", created }
├── Handler:  SurveyAppService.CreateSurveyAsync()
└── Evidence: InsertSurveyDto.cs, Survey.cs:15-100

PUT /api/survey/{surveyId}
├── Request:  { name?, surveySettings? }
├── Response: { id, name, updated }
└── Handler:  SurveyAppService.UpdateSurveyAsync()

DELETE /api/survey/{surveyId}
├── Action:   Soft-delete survey (IsDeleted=true)
└── Handler:  SurveyAppService.DeleteSurveyAsync()

POST /api/survey/{surveyId}/duplicate
├── Request:  { newName }
├── Response: { newSurveyId }
└── Handler:  SurveyAppService.DuplicateSurveyAsync()

POST /api/survey/{surveyId}/publish
├── Action:   Set Status=Open, LastPublished=Now
├── Response: { status: "Open", lastPublished }
└── Handler:  SurveyAppService.PublishSurveyAsync()
```

### Page Commands

```
POST /api/survey/{surveyId}/page
├── Request:  { folderId, alias, title, description }
├── Response: { id, surveyId, alias }
└── Handler:  PageDefinitionAppService.CreatePageAsync()

PUT /api/page/{pageId}
├── Request:  { title, description, navigationButtonSettings, theme }
└── Handler:  PageDefinitionAppService.UpdatePageAsync()

DELETE /api/page/{pageId}
├── Action:   Soft-delete page and questions
└── Handler:  PageDefinitionAppService.DeletePageAsync()

POST /api/page/{pageId}/duplicate
├── Response: { newPageId }
└── Handler:  PageDefinitionAppService.DuplicatePageAsync()

POST /api/page/{pageId}/move
├── Request:  { targetFolderId, targetPosition }
└── Handler:  FolderAppService.MovePageAsync()
```

### Question Commands

```
POST /api/page/{pageId}/question
├── Request:  { type, alias, questionText, required, options[] }
├── Response: { id, pageId, alias, type }
└── Handler:  QuestionDefinitionAppService.CreateQuestionAsync()

PUT /api/question/{questionId}
├── Request:  { questionText, required, validationRules, options }
└── Handler:  QuestionDefinitionAppService.UpdateQuestionAsync()

DELETE /api/question/{questionId}
├── Action:   Soft-delete question
└── Handler:  QuestionDefinitionAppService.DeleteQuestionAsync()

POST /api/question/{questionId}/duplicate
├── Response: { newQuestionId }
└── Handler:  QuestionDefinitionAppService.DuplicateQuestionAsync()

POST /api/question/{questionId}/move
├── Request:  { targetPageId, targetPosition }
└── Handler:  PageDefinitionAppService.MoveQuestionAsync()
```

### Preview Queries

```
POST /api/survey/{surveyId}/preview
├── Request:  { page, language, temporaryPictures }
├── Response: Rendered PageDefinition with theme applied
└── Handler:  PagePreviewAppService.PreviewPageAsync()

POST /api/survey/{surveyId}/preview-look-and-feel
├── Request:  { theme, layout, surveySettings, language }
├── Response: Page preview with visual styling
└── Handler:  LookAndFeelAppService.PreviewAsync()

GET /api/survey/{surveyId}
├── Response: Complete Survey entity
└── Handler:  SurveyAppService.GetSurveyAsync()
```

### Library Queries

```
GET /api/library/questions?search=&category=
├── Response: List<LibraryQuestionDto>
└── Handler:  LibraryQuestionAppService.GetQuestionsAsync()

GET /api/library/pages?category=
├── Response: List<LibraryPageDto>
└── Handler:  LibraryPageAppService.GetPagesAsync()

POST /api/page/{pageId}/import-library-question
├── Request:  { libraryQuestionId }
├── Response: { newQuestionId }
└── Handler:  QuestionDefinitionAppService.ImportFromLibraryAsync()
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-SD-001 | Survey name unique per company | `InsertSurveyDto.Validate()` |
| BR-SD-002 | Survey type immutable after creation | No update method for Survey.Type |
| BR-SD-003 | Minimum 1 page required for publish | `SurveyAppService.PublishSurveyAsync()` |
| BR-SD-004 | Question alias unique per survey | `UpsertQuestionDto.Validate()` |
| BR-SD-005 | Required questions must be answered | Client & server validation |
| BR-SD-006 | Choice questions need >= 2 options | Question-type validators |
| BR-SD-007 | Skip logic target must exist | `SkipCommand.Validate()` |
| BR-SD-008 | Detect circular skip logic references | Optional warning in logic builder |
| BR-SD-009 | Default language in languages array | `SurveySettings.Validate()` |
| BR-SD-010 | Translation fallback to DefaultLanguage | `LanguageString.Resolve()` |
| BR-SD-011 | Warn on edit to Open surveys | Status-based validation |
| BR-SD-012 | Status transitions constrained | `SurveyStatus` enum logic |
| BR-SD-013 | Permission hierarchy (Full > Write > Read > ResultViewer) | `SurveyPermission` enum |
| BR-SD-014 | Owner has implicit Full permission | Permission check bypass |
| BR-SD-015 | Soft delete cascades to pages/questions | Delete handler cascade |
| BR-SD-016 | Type-specific validation (Rating scale, Date format, FileUpload config) | `*QuestionDefinition` validators |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Type.HasValue, "Type required");

// Async validation in handler
await validation
    .AndNotAsync(r => repo.AnyAsync(s => s.CompanyId == req.CompanyId && s.Name == req.Name && !s.IsDeleted, ct),
        "Survey name already exists")
    .AndAsync(r => repo.GetByIdAsync(r.SurveyId, ct).EnsureFoundAsync(),
        "Survey not found");

// Question uniqueness per survey
await validation
    .AndNotAsync(r => questionRepo.AnyAsync(q =>
        q.PageDefinition.SurveyId == req.SurveyId && q.Alias == r.Alias && q.Id != r.Id, ct),
        "Question alias must be unique");
```

---

## Service Boundaries

### Produces Events

```
SurveyPublishedEvent
├── Trigger: When survey status = Open
├── Consumer: Distribution service (if applicable)
└── Payload: { surveyId, version, status, lastPublished }

SurveyDeletedEvent
├── Trigger: When survey soft-deleted (IsDeleted=true)
├── Consumer: Analytics/cleanup service
└── Payload: { surveyId, deletedAt, reason }

RespondentSyncMessage (bravoSURVEYS → bravoInsights)
├── Trigger: Respondent created/updated/deleted
├── Action: Sync survey responses to analytics service
└── Data: { respondentId, surveyId, answers[], status }

Evidence: Event producers in Domain/Events/ and Consumers in Application/MessageBus/
```

### Consumes Events

```
EmployeeDeletedEvent ← bravoTALENTS
├── Action: Cascade delete employee-related surveys/responses
└── Consumer: SurveyCleanupOnEmployeeDeletedConsumer.cs

CompanyDeletedEvent ← Accounts
├── Action: Archive all company surveys
└── Consumer: SurveyArchiveOnCompanyDeletedConsumer.cs
```

### Cross-Service Data Flow

```
bravoSURVEYS (Survey Design/Responses)
    ↓ [Survey published event]
bravoInsights (Analytics & Reporting)
    ↓ [Respondent responses sync]
bravoSURVEYS (Response storage)
```

---

## Critical Paths

### Create Survey Workflow

```
1. Validate input (BR-SD-001, BR-SD-002)
   ├── Name required and non-empty
   ├── Type required (Survey | PerformanceReview | Feedback)
   └── Type immutable after creation
2. Check name uniqueness per company → fail: validation error
3. Generate ID (Ulid.NewUlid())
4. Create Survey entity with:
   ├── Status = New
   ├── UserId = CurrentUser
   ├── CompanyId = CurrentCompany
   ├── Created = Now
   └── TopFolder = new Folder (root hierarchy)
5. Create SurveySettings with:
   ├── DefaultLanguage = provided
   ├── Languages = [DefaultLanguage]
   └── Default behavior flags (back button, progress bar, etc.)
6. Save via repo.CreateAsync()
7. Publish SurveyCreatedEvent
8. Return Survey ID
```

### Add Page & Questions Workflow

```
1. Validate page input
   ├── SurveyId must exist
   ├── Alias required (internal reference)
   └── Title required (LanguageString)
2. Create PageDefinition with:
   ├── Id = Ulid.NewUlid()
   ├── SurveyId = provided
   ├── OrderType = InOrder (default)
   └── QuestionDefinitions = []
3. For each question:
   ├── Validate question (BR-SD-004 through BR-SD-006)
   ├── Create *QuestionDefinition per type (28 subtypes)
   ├── Add OptionList if needed
   └── Set Required/ValidationRules/Randomize flags
4. If skip logic provided:
   ├── Validate target exists (BR-SD-007)
   ├── Build Expression tree
   ├── Create SkipCommand with Conditions/Expressions
   └── Check for circular references (BR-SD-008)
5. Save page and questions
6. Publish PageCreatedEvent
7. Return PageDefinition
```

### Publish Survey Workflow

```
1. Load survey by ID
2. Validate publish preconditions (BR-SD-003):
   ├── Survey must have >= 1 page
   ├── All required fields must have text
   ├── Skip logic targets must exist
   └── No orphaned skip logic
3. If validation fails → return PlatformValidationResult with errors
4. If validation passes:
   ├── Set Status = Open
   ├── Set LastPublished = Now
   ├── Increment Version
   ├── Set HasChangedAfterPublishing = false
5. Save survey
6. Publish SurveyPublishedEvent
7. Enable respondent distribution
```

### Multi-Language Translation Workflow

```
1. Load survey by ID
2. For each content element (title, description, question text, options):
   ├── Get LanguageString
   ├── For each target language:
   │   ├── Check if translation exists
   │   ├── If not: add new LanguageStringItem
   │   └── Set text from user input or translation service
3. Validate translation completeness:
   ├── Check FilterFullTranslatedLanguages()
   └── Warn if language not fully translated
4. Save LanguageString items
5. Set available language = enabled in respondent selector
6. Fallback logic: Missing translation → use DefaultLanguage
```

### Clone Survey Workflow

```
1. Load source survey by ID
2. Validate:
   ├── Survey exists
   ├── User has Write permission
   └── New name provided and unique (BR-SD-001)
3. Deep copy process:
   ├── Create new Survey with:
   │   ├── Id = Ulid.NewUlid()
   │   ├── Name = provided (usually "Copy of {name}")
   │   ├── Status = New
   │   ├── UserId = CurrentUser
   │   ├── SurveySettings = deep clone
   │   └── SharedOptionLists = deep clone
   ├── Deep copy TopFolder hierarchy:
   │   ├── For each ChildNode:
   │   │   ├── If Folder: recurse
   │   │   └── If PageDefinition: deep copy with new IDs
   │   ├── Deep copy PageDefinitions:
   │   │   └── For each question: generate new ID, preserve config
   │   └── Deep copy SkipCommands: remap target IDs to new pages
4. Generate new IDs for all entities (preserve relationships)
5. Save new survey
6. Publish SurveyClonedEvent
7. Return new Survey ID
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Expected | Evidence |
|----|----|----------|----------|
| TC-SD-001 | Create survey with valid data | Survey created, Status=New, TopFolder initialized | `SurveyAppService.cs` |
| TC-SD-002 | Create survey with duplicate name | Validation error "Name already exists" | `InsertSurveyDto.Validate()` |
| TC-SD-003 | Add page to survey | PageDefinition created, added to TopFolder | `PageDefinitionAppService.cs` |
| TC-SD-004 | Add question with options | QuestionDefinition created, OptionList populated | `QuestionDefinitionAppService.cs` |
| TC-SD-005 | Publish survey (valid) | Status=Open, LastPublished=Now | `SurveyAppService.PublishSurveyAsync()` |
| TC-SD-006 | Publish survey (no pages) | Validation error "Must have 1+ page" | `SurveyAppService.PublishSurveyAsync()` |
| TC-SD-007 | Set skip logic | SkipCommand created, Expression tree built | `SkipCommand.Validate()` |
| TC-SD-008 | Add translation | LanguageString.Items updated, language enabled | `LanguageString.AddTranslation()` |
| TC-SD-009 | Clone survey | New survey created with new IDs, relationships preserved | `SurveyAppService.DuplicateSurveyAsync()` |
| TC-SD-010 | Delete survey | IsDeleted=true, cascaded to pages/questions | `SurveyAppService.DeleteSurveyAsync()` |
| TC-SD-011 | Preview page | Page rendered with theme/layout applied | `PagePreviewAppService.PreviewPageAsync()` |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty survey name | Validation error | `InsertSurveyDto` required validation |
| Question without required text | Validation error on publish | Publish precondition check |
| Skip logic to deleted page | Validation error on save | `SkipCommand.Validate()` |
| Circular skip logic (A→B→A) | Warning (optional feature) | Optional circular detection |
| Missing translation in respondent language | Fallback to DefaultLanguage | `LanguageString.Resolve()` |
| Clone survey with 500+ questions | Complete in < 5s, all relationships preserved | `DuplicateSurveyAsync()` performance |
| Update survey while Open | Warn of impact on in-progress responses | Status-based validation |
| Multi-language with 10+ languages | LanguageString handles all, no performance degradation | Document size management |

---

## Usage Notes

### When to Use This File

- Implementing new question types (add to 28 existing)
- Creating survey-level features (settings, themes, publishing)
- Adding validation rules or business logic
- Debugging skip logic or multi-language issues
- Code review context for survey design changes

### When to Use Full Documentation

- Understanding business requirements and ROI
- Stakeholder presentations or requirements clarification
- Comprehensive test planning and QA strategy
- Production issue troubleshooting
- Understanding UI/UX flows and respondent experience

---

*Generated from comprehensive documentation. For full details, see [README.SurveyDesignFeature.md](./README.SurveyDesignFeature.md)*
