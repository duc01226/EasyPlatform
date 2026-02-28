# bravoSURVEYS - Survey & Feedback Platform

## Overview

bravoSURVEYS is a comprehensive survey and feedback management platform designed for organizations to create, distribute, and analyze surveys at scale. The module enables businesses to collect structured feedback through customizable surveys, manage respondent groups, track responses in real-time, and generate detailed analytical reports. It supports multiple distribution channels (email, SMS) and provides rich question types with advanced logic branching capabilities.

**Key Capabilities:**
- Full survey lifecycle management (design, distribution, execution, analysis)
- Multi-language survey support
- Respondent management and bulk import
- Response tracking and real-time analytics
- Customizable reporting with visual dashboards
- Advanced question logic and conditional branching
- Survey templates and reusable components

---

## Architecture Overview

### Service Structure

**Backend:** .NET 8 Microservice Architecture
- `LearningPlatform` - Main API service
- `LearningPlatform.Application` - Application layer (CQRS commands/queries, DTOs, services)
- `LearningPlatform.Domain` - Domain models and business logic
- `LearningPlatform.Data.*` - Data access layers (EntityFramework, MongoDB, Elasticsearch)
- `LearningPlatform.Infrastructure` - Infrastructure concerns

**Frontend:** Angular 12+ Standalone Components
- `src/Web/bravoSURVEYSClient` - Survey management portal
- `src/Web/PulseSurveysClient` - Survey respondent portal

---

## Sub-Modules

### 1. Survey Design & Management

**Purpose:** Enable survey creators to design, configure, and manage survey structure including pages, questions, and advanced logic.

#### Features

##### 1.1 Create Survey
- **Description:** Create a new survey from scratch with basic settings
- **Backend API:** `SurveyDefinitionController.InsertSurvey` (POST `/api/surveys`)
- **Backend Command:** `CreateSurveyCommand` (CQRS)
- **Frontend Component:** `SurveyEditorComponent`
- **Key Entities:** `Survey`, `SurveyInfo`, `SurveySettings`
- **Workflow:**
  1. User initiates new survey creation
  2. System creates survey shell with default settings
  3. User configures survey metadata (title, description, language)
  4. User adds pages to survey structure
  5. Survey persisted and ready for question design

##### 1.2 Edit Survey Structure
- **Description:** Modify survey properties, pages, and basic configuration
- **Backend API:** `SurveyDefinitionController.UpdateSurvey` (PUT `/api/surveys/{surveyId}`)
- **Backend Command:** `UpdateSurveyCommand`
- **Frontend Component:** `SurveEditorComponent`, `SurveySettingsDialog`
- **Key Entities:** `Survey`, `SurveyPage`
- **Workflow:**
  1. Load survey and pages from repository
  2. Apply structure changes (add/remove/reorder pages)
  3. Validate changes maintain survey integrity
  4. Persist changes with version tracking

##### 1.3 Manage Survey Pages
- **Description:** Add, edit, reorder, and delete pages within a survey
- **Backend API:** `PageDefinitionController.InsertPage` (POST `/api/surveys/{surveyId}/pages`)
- **Backend API:** `PageDefinitionController.UpdatePage` (PUT `/api/surveys/{surveyId}/pages/{pageId}`)
- **Backend Command:** `CreatePageCommand`, `UpdatePageCommand`
- **Frontend Component:** `SurveyPageEditorComponent`, `PageListComponent`
- **Key Entities:** `SurveyPage`, `PageElement`, `DisplayLogic`
- **Workflow:**
  1. User navigates to pages section
  2. User creates new page with display logic (always/conditional)
  3. System validates page uniqueness within survey
  4. Questions are attached to pages
  5. Pages are reordered via drag-and-drop interface

##### 1.4 Manage Questions
- **Description:** Add, edit, delete, and configure individual questions with various question types
- **Backend API:** `QuestionDefinitionController.InsertQuestion` (POST `/api/surveys/{surveyId}/pages/{pageId}/questions`)
- **Backend API:** `QuestionDefinitionController.UpdateQuestion` (PUT `/api/surveys/{surveyId}/questions/{questionId}`)
- **Backend Command:** `CreateQuestionCommand`, `UpdateQuestionCommand`
- **Frontend Component:** `QuestionEditorComponent`, `QuestionDesignerDialog`
- **Key Entities:** `Question`, `QuestionOption`, `OptionList`, `AnswerType`
- **Supported Question Types:**
  - Single Choice (Radio buttons)
  - Multiple Choice (Checkboxes)
  - Open-ended (Text/Long text)
  - Dropdown lists
  - Rating scales
  - Matrix questions
  - Ranking questions
  - Date/Time pickers
  - Numeric inputs
- **Workflow:**
  1. User selects question type from toolbar
  2. User configures question text, required/optional, and logic
  3. User adds answer options (for choice-based questions)
  4. User sets up display/skip logic based on previous answers
  5. Question persisted with version control

##### 1.5 Question Logic & Branching
- **Description:** Configure conditional display and skip logic for questions
- **Backend API:** `QuestionDefinitionController.UpdateQuestion`
- **Backend Service:** `DisplayLogicService`, `SkipLogicService`
- **Frontend Component:** `LogicEditorComponent`, `ConditionalDisplayPanel`
- **Key Entities:** `DisplayLogic`, `SkipLogic`, `LogicCondition`
- **Workflow:**
  1. User opens logic editor for question
  2. User defines conditions based on previous question responses
  3. User sets outcome (show/hide/skip question)
  4. System validates logic paths (no circular references)
  5. Logic engine evaluates at response time

##### 1.6 Question Libraries
- **Description:** Create, manage, and reuse question templates across multiple surveys
- **Backend API:** `LibraryQuestionController.CreateLibraryQuestion` (POST `/api/libraries/questions`)
- **Backend Command:** `CreateLibraryQuestionCommand`
- **Frontend Component:** `LibraryQuestionListComponent`, `LibraryQuestionEditorDialog`
- **Key Entities:** `LibraryQuestion`, `LibrarySurvey`, `LibraryPage`
- **Workflow:**
  1. User saves frequently-used question to library
  2. System tags question with metadata (category, tags)
  3. User can import from library to new surveys
  4. Imported questions are duplicated (not linked) in new survey

---

### 2. Survey Respondent Management

**Purpose:** Manage survey recipients, track delivery status, and handle respondent communication.

#### Features

##### 2.1 Manage Respondent Lists
- **Description:** Create and manage groups of survey respondents with contact information
- **Backend API:** `RespondentListController.CreateRespondentList` (POST `/api/surveys/{surveyId}/respondent-lists`)
- **Backend Command:** `CreateRespondentListCommand`
- **Frontend Component:** `RespondentListManagementComponent`
- **Key Entities:** `RespondentList`, `Respondent`, `RespondentField`
- **Workflow:**
  1. User creates respondent list with custom fields
  2. User imports contacts (CSV/Excel with email/phone)
  3. System validates contact information
  4. System creates respondent records linked to survey
  5. Respondent list ready for distribution

##### 2.2 Import Respondents
- **Description:** Bulk import survey respondents from files with mapping and validation
- **Backend API:** `RespondentsController.PreviewData` (POST `/api/surveys/{surveyId}/respondents/preview-data`)
- **Backend API:** `RespondentsController.ImportContacts` (POST `/api/surveys/{surveyId}/respondents/importcontacts`)
- **Backend Service:** `RespondentAppService.Import()`
- **Frontend Component:** `RespondentImportDialogComponent`, `RespondentPreviewComponent`
- **Key Entities:** `Respondent`, `RespondentCustomField`, `RespondentListMapping`
- **Workflow:**
  1. User uploads CSV/Excel file
  2. System displays preview of first N rows
  3. User maps CSV columns to respondent fields
  4. User selects import mode (add/replace/merge)
  5. System validates all records before import
  6. System performs bulk insert with transaction

##### 2.3 Respondent Profile Data
- **Description:** Manage custom data fields associated with each respondent for personalization
- **Backend API:** `FieldController.CreateField` (POST `/api/respondent-lists/{listId}/fields`)
- **Backend Entity:** `RespondentCustomField`
- **Frontend Component:** `RespondentFieldConfigDialog`
- **Workflow:**
  1. Survey creator defines custom fields (text, number, dropdown, date)
  2. Fields appear as columns in respondent data
  3. Import process maps source columns to custom fields
  4. Fields available for survey personalization (merge variables)

##### 2.4 Track Respondent Status
- **Description:** Monitor survey invitation delivery and response status per respondent
- **Backend API:** `RespondentsController.GetRespondentStatus` (GET `/api/surveys/{surveyId}/respondents/{respondentId}/status`)
- **Frontend Component:** `RespondentStatusComponent`
- **Key Entities:** `RespondentInvitation`, `RespondentResponse`, `InvitationStatus`
- **Invitation States:** `Pending`, `Sent`, `Bounced`, `Responded`, `Withdrawn`
- **Workflow:**
  1. System tracks invitation sent timestamp
  2. System updates status when invitation bounces or recipient opens
  3. System marks complete when respondent submits survey
  4. User views status dashboard with filters and search

---

### 3. Survey Distribution & Delivery

**Purpose:** Distribute surveys via multiple channels and track delivery status.

#### Features

##### 3.1 Email Distribution
- **Description:** Send survey invitations via email with customization and tracking
- **Backend API:** `DistributionController.AddEmailDistribution` (POST `/api/surveys/{surveyId}/distributions/add-email`)
- **Backend Service:** `DistributionAppService.AddDistribution(EmailDistributionDto)`
- **Frontend Component:** `EmailDistributionDialog`, `EmailTemplateEditor`
- **Key Entities:** `EmailDistribution`, `EmailTemplate`, `SurveyCustomColumn`
- **Email Personalization:** Merge variables from respondent profile (`{FirstName}`, `{Email}`, custom fields)
- **Workflow:**
  1. User configures email distribution settings
  2. User selects sender name and reply-to address
  3. User customizes email subject and body with merge variables
  4. User previews personalized message
  5. System queues emails for sending
  6. System tracks bounce and open events

##### 3.2 SMS Distribution
- **Description:** Send survey invitations via SMS with link to mobile survey
- **Backend API:** `DistributionController.AddSmsDistribution` (POST `/api/surveys/{surveyId}/distributions/add-sms`)
- **Backend Service:** `DistributionAppService.AddDistribution(SmsDistribution)`
- **Frontend Component:** `SmsDistributionDialog`
- **Key Entities:** `SmsDistribution`, `SmsTemplate`
- **Workflow:**
  1. User configures SMS distribution
  2. User customizes SMS text with merge variables
  3. User verifies recipient phone numbers exist
  4. System queues SMS messages
  5. System tracks delivery status

##### 3.3 Manage Distribution Schedules
- **Description:** Schedule survey distributions for future dates or recurring patterns
- **Backend API:** `DistributionController.ScheduleDistribution` (PATCH `/api/surveys/{surveyId}/distributions/{distributionId}/schedule`)
- **Backend Entity:** `DistributionSchedule`
- **Frontend Component:** `DistributionSchedulePanel`
- **Workflow:**
  1. User selects distribution and opens schedule panel
  2. User chooses send immediately or schedule for future date
  3. User optionally sets up reminders (e.g., send follow-up at day 3, 7)
  4. System executes scheduled distributions at specified times
  5. System sends reminders to non-respondents per schedule

##### 3.4 Monitor Distribution Status
- **Description:** Track survey invitation delivery and view detailed metrics
- **Backend API:** `DistributionController.GetDistributionStatus` (GET `/api/surveys/{surveyId}/distributions/{distributionId}/status`)
- **Frontend Component:** `DistributionStatusComponent`, `DistributionMetricsPanel`
- **Key Entities:** `DistributionMetrics`, `DeliveryEvent`
- **Metrics Tracked:**
  - Total invitations sent
  - Successful deliveries
  - Bounces/failures
  - Open rate
  - Response rate
  - Pending respondents
- **Workflow:**
  1. Distribution initiates and system sends invitations
  2. System tracks delivery events in real-time
  3. User monitors distribution dashboard
  4. User can resend to non-respondents or failures

---

### 4. Survey Execution & Response Handling

**Purpose:** Manage survey respondent interaction and response collection.

#### Features

##### 4.1 Survey Respondent Portal
- **Description:** Public-facing portal for respondents to access and complete surveys
- **Frontend Application:** `PulseSurveysClient`
- **Backend API:** `SurveyHandlerController.GetSurvey` (GET `/api/survey-handler/surveys/{surveyId}`)
- **Key Components:** `SurveyResponderComponent`, `SurveyProgressBar`, `QuestionRenderer`
- **Workflow:**
  1. Respondent receives survey link (email/SMS)
  2. Respondent opens survey in browser or mobile
  3. System loads survey pages with display logic evaluation
  4. Respondent answers questions page by page
  5. System evaluates skip logic to determine next page
  6. Respondent submits survey upon completion
  7. System records responses with timestamps

##### 4.2 Generate Survey Responses
- **Description:** Create test responses for survey testing and validation
- **Backend API:** `GenerateResponseController.GenerateResponse` (POST `/api/surveys/{surveyId}/responses/generate`)
- **Backend Service:** `ResponseGenerationService`
- **Frontend Component:** `TestResponseGeneratorDialog`
- **Workflow:**
  1. Survey creator initiates test response generation
  2. User configures response patterns (random, specific paths)
  3. System generates responses following survey logic
  4. System records responses to test mode
  5. User reviews generated data to verify question types

##### 4.3 Bulk Import Responses
- **Description:** Import pre-collected responses from external sources
- **Backend API:** `SyncResponsesController.SyncResponses` (POST `/api/surveys/{surveyId}/responses/sync`)
- **Frontend Component:** `ResponseImportDialog`
- **Workflow:**
  1. User uploads responses file (CSV/Excel format)
  2. System maps file columns to survey questions
  3. System validates responses against question constraints
  4. System imports valid responses in batch
  5. System reports validation errors for manual correction

##### 4.4 Export Responses
- **Description:** Export survey responses in various formats for external analysis
- **Backend API:** `ExportResponsesController.ExportResponses` (POST `/api/surveys/{surveyId}/responses/export`)
- **Backend Service:** `ResponseExportService`
- **Frontend Component:** `ExportResponsesDialog`
- **Export Formats:** CSV, Excel, JSON
- **Workflow:**
  1. User opens export dialog
  2. User selects response filter criteria (date range, completion status)
  3. User selects export format and field mapping
  4. System generates export file with selected data
  5. System initiates download

---

### 5. Results & Analytics

**Purpose:** Analyze survey responses and generate visual reports and insights.

#### Features

##### 5.1 Survey Dashboard
- **Description:** Real-time dashboard showing survey completion metrics and response summaries
- **Backend API:** `SurveyDashboardController.GetDashboardData` (GET `/api/surveys/{surveyId}/dashboard`)
- **Backend Service:** `DashboardAggregationService`
- **Frontend Component:** `SurveyDashboardComponent`, `ResponseMetricsWidget`
- **Key Metrics:**
  - Total responses received
  - Response rate %
  - Completion rate %
  - Average time to completion
  - Responses by date (trend)
  - Partial vs. complete responses
- **Workflow:**
  1. System aggregates responses in real-time
  2. System calculates metrics per question
  3. Dashboard displays summary widgets
  4. User can filter by date range or respondent segment
  5. Auto-refresh shows latest metrics

##### 5.2 Question Results
- **Description:** Detailed analysis of individual question responses with visualizations
- **Backend API:** `SurveyResultController.GetAggregatedRespondents` (GET `/api/surveys/{surveyId}/result/aggregated-respondents`)
- **Backend Service:** `RespondentsReportingAppService.GetSurveyResultAggregatedRespondents()`
- **Frontend Component:** `QuestionResultsComponent`, `ResponseChartComponent`
- **Supported Visualizations:**
  - Bar charts (choice questions)
  - Pie charts (single choice)
  - Histograms (numeric scales)
  - Heatmaps (matrix questions)
  - Word clouds (open-ended)
- **Workflow:**
  1. System aggregates responses per question
  2. System calculates percentages and distributions
  3. System renders appropriate chart type
  4. User can filter responses (respondent segment, date range)
  5. User can drill-down to individual responses

##### 5.3 Open-Ended Response Analysis
- **Description:** View and analyze text responses from open-ended questions
- **Backend API:** `SurveyResultController.GetOpenResponses` (GET `/api/surveys/{surveyId}/result/open-responses`)
- **Frontend Component:** `OpenResponsesPanel`, `ResponseListComponent`
- **Workflow:**
  1. System retrieves all text responses for selected question
  2. System displays responses in paginated list
  3. User can search responses by keyword
  4. User can tag or categorize responses
  5. System provides word frequency analysis

##### 5.4 Custom Reports
- **Description:** Create custom analytical reports with selected questions and layouts
- **Backend API:** `ReportDefinitionController.CreateReport` (POST `/api/reports`)
- **Backend Command:** `CreateReportDefinitionCommand`
- **Frontend Component:** `ReportBuilderComponent`, `ReportDesignerDialog`
- **Key Entities:** `ReportDefinition`, `ReportElement`, `ReportPage`
- **Report Types:**
  - Summary reports (overview of key metrics)
  - Detailed reports (all question data)
  - Cross-tabulation reports (compare segments)
  - Trend reports (responses over time)
- **Workflow:**
  1. User creates new report template
  2. User selects questions and visualization type
  3. User organizes questions into report pages
  4. User configures filters and grouping
  5. System generates report with selected data
  6. User exports or shares report

##### 5.5 Report Templates
- **Description:** Save and reuse report configurations across surveys
- **Backend API:** `ReportDefinitionController.CreateReportTemplate` (POST `/api/reports/templates`)
- **Key Entities:** `ReportTemplate`
- **Workflow:**
  1. User creates custom report
  2. User saves as template with description
  3. Template available for other surveys with compatible structure
  4. New surveys apply template to auto-populate reports

---

### 6. Survey Design & Theming

**Purpose:** Customize survey appearance and user experience.

#### Features

##### 6.1 Survey Themes
- **Description:** Apply color schemes and branding to survey interface
- **Backend API:** `ThemeController.CreateTheme` (POST `/api/themes`)
- **Backend API:** `SurveyThemeController.ApplyTheme` (PATCH `/api/surveys/{surveyId}/theme`)
- **Frontend Component:** `ThemeEditorComponent`, `ThemePreviewPanel`
- **Key Entities:** `SurveyTheme`, `ThemeColor`, `BrandingAssets`
- **Customizable Elements:**
  - Primary/accent colors
  - Font family and sizes
  - Background images
  - Logo and header branding
  - Button styles
  - Progress bar appearance
- **Workflow:**
  1. User selects theme or creates custom
  2. User configures colors and branding
  3. User previews theme on sample survey
  4. User applies theme to survey
  5. Respondent survey displays with selected theme

##### 6.2 Survey Layouts
- **Description:** Choose survey layout style (single-page, multi-page, modal)
- **Backend API:** `LayoutController.GetLayouts` (GET `/api/layouts`)
- **Frontend Component:** `LayoutSelectorComponent`
- **Key Entities:** `SurveyLayout`, `LayoutTemplate`
- **Available Layouts:**
  - Multi-page with progress bar
  - Single-page scrolling
  - Modal dialog style
  - Full-screen immersive
- **Workflow:**
  1. User selects survey in editor
  2. User chooses layout from templates
  3. System adjusts page rendering based on layout
  4. User previews survey in selected layout

---

### 7. Contact & List Management

**Purpose:** Manage contact databases and respondent segments.

#### Features

##### 7.1 Contact Management
- **Description:** Maintain central contact database with details and history
- **Backend API:** `ContactController.CreateContact` (POST `/api/contacts`)
- **Backend Command:** `CreateContactCommand`
- **Frontend Component:** `ContactListComponent`, `ContactEditorDialog`
- **Key Entities:** `Contact`, `ContactField`, `ContactHistory`
- **Workflow:**
  1. User creates or imports contacts
  2. User manages contact information (name, email, phone, custom fields)
  3. System tracks contact engagement history
  4. User can segment contacts for targeted distributions
  5. Contact data reusable across surveys

##### 7.2 Contact Lists
- **Description:** Group contacts into lists for survey distribution
- **Backend API:** `ContactListController.CreateList` (POST `/api/contact-lists`)
- **Frontend Component:** `ContactListManagementComponent`
- **Key Entities:** `ContactList`, `ContactListMembership`
- **Workflow:**
  1. User creates contact list
  2. User adds contacts manually or by import
  3. User defines list membership rules (optional)
  4. List available for survey distribution

---

### 8. Survey Translation & Localization

**Purpose:** Support multi-language surveys for global respondent bases.

#### Features

##### 8.1 Multi-Language Support
- **Description:** Create and manage survey translations for multiple languages
- **Backend API:** `SurveyTranslationController.CreateTranslation` (POST `/api/surveys/{surveyId}/translations`)
- **Frontend Component:** `SurveyTranslationEditorComponent`, `LanguageSelector`
- **Key Entities:** `SurveyTranslation`, `TranslatableText`
- **Workflow:**
  1. User creates survey in source language
  2. User enables translations for target languages
  3. System creates translation records for all text
  4. Translator updates translations
  5. Survey respondent selects language preference
  6. Survey renders in selected language

##### 8.2 Translation Management
- **Description:** Manage translation status and coordinate multiple translators
- **Backend API:** `SurveyTranslationController.UpdateTranslation`
- **Frontend Component:** `TranslationStatusPanel`, `TranslatorAssignmentDialog`
- **Translation States:** `Draft`, `InProgress`, `Completed`, `Reviewed`, `Published`
- **Workflow:**
  1. Survey creator assigns translators to language versions
  2. Translators work on translations independently
  3. System tracks completion status
  4. Reviewer approves translations before publishing
  5. Completed translations become available to respondents

---

### 9. Access Control & Permissions

**Purpose:** Manage user access and permissions for survey operations.

#### Features

##### 9.1 Survey Access Control
- **Description:** Grant/revoke survey access to team members with granular permissions
- **Backend API:** `SurveyAccessController.GrantAccess` (POST `/api/surveys/{surveyId}/access`)
- **Backend Service:** `SurveyAccessRightsService`
- **Frontend Component:** `SurveyAccessDialog`, `PermissionEditor`
- **Key Entities:** `SurveyAccess`, `SurveyPermission`
- **Permission Levels:**
  - `None` - No access
  - `View` - Read-only access to survey and results
  - `Edit` - Can modify survey design
  - `Distribute` - Can send and manage distributions
  - `Full` - All permissions
- **Workflow:**
  1. Survey owner opens access control dialog
  2. Owner selects user/team to grant access
  3. Owner assigns permission level
  4. System records access grant with timestamps
  5. User granted immediate access to resource

##### 9.2 User Roles
- **Description:** Survey platform user roles and default permissions
- **Default Roles:** `Admin`, `Manager`, `Editor`, `Analyst`, `Respondent`
- **Authorization Policy:** `CompanyRoleAuthorizationPolicies.EmployeePolicy`
- **Workflow:**
  1. User assigned to role in Accounts service
  2. Role determines default survey permissions
  3. Survey-level access can override role-based defaults
  4. Permissions checked on each API call

---

## Data Models

### Core Entities

**Survey**
- Fields: Id, Title, Description, Status (Draft/Active/Closed), CreatedDate, ModifiedDate
- Relationships: Pages, Questions, Distributions, Results
- Business Logic: Version tracking, concurrency control via ETags

**SurveyPage**
- Fields: Id, SurveyId, PageNumber, Title, DisplayLogic
- Relationships: Questions, DisplayLogicRules
- Business Logic: Ordered within survey, display evaluated at response time

**Question**
- Fields: Id, PageId, QuestionText, AnswerType, Required, DisplayLogic, SkipLogic
- Relationships: Options, AnswerList, ValidationRules
- Business Logic: Type-specific validation and rendering

**QuestionOption**
- Fields: Id, QuestionId, OptionText, Value, DisplayOrder
- Used for: Choice-based questions (radio, checkbox, dropdown)

**Respondent**
- Fields: Id, ListId, Email, Phone, Name, CustomFields (JSON)
- Relationships: Invitations, Responses
- Business Logic: Custom field support via JSON, profile data

**Distribution**
- Fields: Id, SurveyId, Type (Email/SMS), Status, ScheduledDate
- Relationships: Recipients (Respondent), Template, Events
- Business Logic: Channel-specific formatting, personalization via merge variables

**Response**
- Fields: Id, RespondentId, SurveyId, QuestionId, AnswerValue, SubmittedDate, TestMode
- Relationships: Respondent, Survey, Question
- Business Logic: Type-specific storage (numeric, text, multi-select), validation

**Report**
- Fields: Id, SurveyId, Title, Layout, Pages, Filters
- Relationships: ReportElements, Charts
- Business Logic: Template application, data aggregation

---

## API Patterns & Endpoints

### Survey Management API

**Base URL:** `/api/surveys`

**Core Endpoints:**
```
GET    /                           # List surveys for current user
POST   /                           # Create new survey
GET    /{surveyId}                 # Get survey with details
PUT    /{surveyId}                 # Update survey settings
DELETE /{surveyId}                 # Archive/soft delete survey
POST   /{surveyId}/duplicate       # Clone existing survey
POST   /{surveyId}/publish         # Change survey to active
```

### Pages API

**Base URL:** `/api/surveys/{surveyId}/pages`

**Core Endpoints:**
```
GET    /                           # List survey pages
POST   /                           # Create new page
GET    /{pageId}                   # Get page with questions
PUT    /{pageId}                   # Update page
DELETE /{pageId}                   # Delete page
PATCH  /{pageId}                   # Partial update (reorder questions)
```

### Questions API

**Base URL:** `/api/surveys/{surveyId}/pages/{pageId}/questions`

**Core Endpoints:**
```
GET    /                           # List questions in page
POST   /                           # Create new question
POST   /duplicate                  # Import library questions
GET    /{questionId}               # Get question with options
PUT    /{questionId}               # Update question
DELETE /{questionId}               # Delete question
PATCH  /{questionId}/logic         # Update display/skip logic
```

### Distributions API

**Base URL:** `/api/surveys/{surveyId}/distributions`

**Core Endpoints:**
```
GET    /                           # List distributions
POST   /add-email                  # Create email distribution
POST   /add-sms                    # Create SMS distribution
GET    /{distributionId}/status    # Get distribution metrics
PATCH  /{distributionId}/schedule  # Update schedule
POST   /{distributionId}/resend    # Resend to non-respondents
DELETE /{distributionId}           # Cancel distribution
```

### Respondents API

**Base URL:** `/api/surveys/{surveyId}/respondents`

**Core Endpoints:**
```
POST   /importcontacts             # Import respondents from file
POST   /preview-data               # Preview import file
GET    /{respondentId}/status      # Get respondent status
POST   /send                       # Send invitations
GET    /list                       # List respondents
```

### Results API

**Base URL:** `/api/surveys/{surveyId}/result`

**Core Endpoints:**
```
GET    /aggregated-respondents     # Get summary statistics
GET    /open-responses             # Get text responses
PATCH  /settings                   # Update result visibility
GET    /dashboard                  # Get dashboard metrics
```

### Reports API

**Base URL:** `/api/reports`

**Core Endpoints:**
```
GET    /                           # List reports
POST   /                           # Create custom report
GET    /{reportId}                 # Generate report
DELETE /{reportId}                 # Delete report
POST   /templates                  # Create report template
```

---

## Frontend Architecture

### Component Hierarchy

```
AppComponent (root)
├── SurveyEditorModule
│   ├── SurveyListComponent (main page list)
│   ├── SurveyEditorComponent (design workspace)
│   │   ├── PageEditorPanel (left sidebar)
│   │   ├── QuestionDesignerPanel (main editor)
│   │   ├── LogicEditorComponent (conditional logic)
│   │   └── PreviewPanel (responsive preview)
│   ├── SurveySettingsComponent (survey properties)
│   └── SurveyThemeComponent (branding & appearance)
├── DistributionModule
│   ├── DistributionListComponent
│   ├── EmailDistributionDialog
│   ├── SmsDistributionDialog
│   └── DistributionStatusComponent
├── RespondentModule
│   ├── RespondentImportComponent
│   ├── RespondentListComponent
│   └── RespondentPreviewComponent
├── ResultsModule
│   ├── DashboardComponent (metrics overview)
│   ├── QuestionResultsComponent (per-question analysis)
│   ├── ReportBuilderComponent (custom reports)
│   └── ExportComponent (response export)
└── SharedComponents
    ├── SurveyAccessDialog
    ├── DialogTemplate (base dialog)
    └── Shared services & utilities
```

### Key Services

**API Communication:**
- `SurveyApiService` - Survey CRUD operations
- `DistributionApiService` - Distribution management
- `RespondentApiService` - Respondent import & management
- `ResultsApiService` - Reporting and analytics

**State Management:**
- Component-level signal-based state
- RxJS observables for data flows
- LocalStorage for draft saving

**Utilities:**
- `SurveyValidationService` - Design validation
- `ExportService` - Response export
- `ThemeService` - Theme application

---

## User Roles & Permissions

### Survey Creator / Manager
- Create and edit surveys
- Design questions and pages
- Configure distributions
- Manage respondents
- View results and reports
- Share surveys with team members
- Permissions: `Full` on owned surveys, `Edit` on shared surveys

### Analyst / Reviewer
- View survey design
- View detailed results and analytics
- Generate custom reports
- Export response data
- Permissions: `View` on assigned surveys

### Respondent
- Access survey via public link
- Complete survey in designated language
- No access to survey design or results
- Permissions: None on survey admin API

### Admin
- All permissions on all surveys
- Manage users and access
- View system metrics
- Manage themes and templates
- Permissions: Override all access controls

---

## Related Modules

- **Accounts (bravo-accounts):** User authentication and company management
- **Contacts (bravoSURVEYS.Contacts):** Contact database integration
- **Libraries (bravoSURVEYS.Libraries):** Template and reusable component management
- **Reporting (bravoSURVEYS.Reporting):** Advanced analytics and dashboards

---

## Key Technical Patterns

### CQRS Architecture
- Commands handle mutations (Create, Update, Delete operations)
- Queries handle reads (retrieval of data)
- Handlers encapsulate business logic
- Commands validated before execution
- Example: `CreateSurveyCommand` -> `CreateSurveyCommandHandler`

### Concurrency Control
- ETags used for optimistic concurrency
- Version field tracked on surveys and pages
- Conflict detection on updates
- HTTP 412 Conflict response for concurrent modifications

### Display & Skip Logic
- Evaluated server-side during design validation
- Evaluated client-side during response collection
- Prevents circular dependencies and invalid logic paths
- Affects visible questions in respondent portal

### Pagination & Performance
- List endpoints support `skip` and `take` parameters
- Large result sets paginated to prevent memory issues
- Aggregation queries optimized for reporting
- Database indexes on frequently filtered fields (SurveyId, RespondentId)

### Data Import/Export
- Bulk import via file upload with validation
- Line-by-line validation with error reporting
- Transactional import (all-or-nothing)
- Multiple export formats (CSV, Excel, JSON)
- Respondent field mapping via UI

---

## Error Handling

**Common HTTP Status Codes:**
- `200 OK` - Successful operation
- `201 Created` - Resource created
- `204 No Content` - No response body
- `400 Bad Request` - Validation error
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `412 Precondition Failed` - Concurrency conflict
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific field error"
    }
  ]
}
```

---

## Deployment & Infrastructure

**Backend:**
- .NET 8 microservice
- Docker containerized
- Running on Kubernetes or App Service
- Database: SQL Server or PostgreSQL
- Message Bus: RabbitMQ or Azure Service Bus
- Cache: Redis
- File Storage: Azure Blob Storage

**Frontend:**
- Angular 12+ standalone components
- Static hosting (Azure Storage, Netlify, or equivalent)
- CDN for asset delivery
- Environment-based API endpoint configuration

---

## Development Guidelines

### Adding a New Question Type

1. **Backend:**
   - Create question handler in `LearningPlatform.Domain.SurveyDesign.Questions`
   - Define validation rules in `AnswerTypeValidator`
   - Update response aggregation in `ResponseAggregationService`
   - Create migration if schema changes needed

2. **Frontend:**
   - Create question renderer component
   - Add template to `QuestionDesignerComponent`
   - Update validation in `SurveyValidationService`
   - Add visualization in `ResponseChartComponent`

### Adding a New Distribution Channel

1. **Backend:**
   - Create distribution type class inheriting `Distribution`
   - Implement `IDistributionSender` interface
   - Register in dependency injection
   - Create notification service

2. **Frontend:**
   - Create distribution dialog component
   - Add to distribution type selector
   - Update metrics tracking

### Adding a New Report Type

1. **Backend:**
   - Create report handler in `LearningPlatform.Application.ReportDesign`
   - Implement data aggregation logic
   - Create response DTO

2. **Frontend:**
   - Create report component
   - Add to report builder options
   - Implement visualization

---

## Performance Considerations

- Survey previews cached in client-side signals
- Response aggregation runs asynchronously for large datasets
- Database indexes on: SurveyId, RespondentId, DistributionId, ResponseDate
- Pagination enforced on all list endpoints
- Import operations use batch insert (1000 records per batch)

---

## Testing

**Backend Test Coverage:**
- Unit tests for CQRS commands/queries
- Integration tests for API endpoints
- Repository pattern tests for data access
- Business logic validation tests

**Frontend Test Coverage:**
- Component unit tests with Jasmine/Karma
- Integration tests for page transitions
- E2E tests for key workflows (create survey, distribute, view results)

**Test Data:**
- Seed surveys in database for development
- Test respondent import files included
- Mock API responses for frontend testing

---

## Future Enhancements

- AI-powered question suggestions
- Advanced sentiment analysis for open responses
- Real-time collaboration on survey design
- Mobile-native respondent app
- Predictive analytics and trend forecasting
- Integration with CRM systems
- Webhook support for 3rd-party integrations

---

**Last Updated:** 2025-12-31
**Version:** 1.0
**Status:** Active

---

## Complete Documentation Set

This module is fully documented with the following guides:

- **[README.md](README.md)** - Complete technical reference (this file, 37.5 KB)
- **[INDEX.md](INDEX.md)** - Documentation index and navigation guide
- **[API-REFERENCE.md](API-REFERENCE.md)** - REST API endpoint specifications with examples
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues, debugging, and FAQ

**Start here for navigation: [INDEX.md](INDEX.md)**
