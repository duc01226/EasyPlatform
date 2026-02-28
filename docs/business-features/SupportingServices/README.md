# Supporting Services

Supporting Services in BravoSUITE provide critical infrastructure, integration, and cross-functional capabilities that enable the core HR and Talent Management modules (bravoTALENTS, bravoGROWTH, etc.) to operate seamlessly. These services handle notifications, candidate data synchronization, resume parsing, permission management, and candidate profile integration.

---

## Overview

The Supporting Services layer includes:

- **NotificationMessage Service**: Handles in-app notifications and push notifications across the platform
- **ParserApi Service**: Parses resume/CV files (PDF, HTML) from LinkedIn and other sources
- **PermissionProvider Service**: Manages subscriptions, policies, user roles, and access control
- **CandidateApp Service**: Candidate-facing application for managing profiles, CVs, applications, and job searches
- **CandidateHub Service**: Backend service for candidate data aggregation, matching, and scoring

These services operate independently but integrate with core modules through event buses, direct API calls, and data synchronization mechanisms.

---

## 1. NotificationMessage Service

**Path**: `src/Services/NotificationMessage/`

**Technology**: .NET 8, CQRS Pattern, Entity Event Bus

### Service Overview

NotificationMessage Service manages in-app notifications and push notifications for all platform users. It receives notification requests from other services, maintains notification history per user, tracks device registrations for push notifications, and handles notification lifecycle (read, delete, archive).

### Features

#### 1.1 Send Push Notification

- **Description**: Sends a new notification message to one or more users. Messages are stored in the notification service and can be delivered via push, email, or in-app channels.
- **Backend API**: `POST /api/notification/push-notification`
- **Request Body**: `NotificationMessageEntityDto` containing message content, recipient, channels, and delivery metadata
- **Workflow**:
  1. Service receives notification request from another microservice
  2. Validates notification data and recipient access
  3. Creates NotificationMessageEntity and stores in database
  4. Broadcasts through entity event bus for interested consumers
  5. Triggers push delivery to registered devices
  6. Returns OK status

---

#### 1.2 Mark Notification as Read

- **Description**: Marks one or multiple notifications as read by the user. Updates the read status and timestamp in the notification record.
- **Backend API**:
  - `PUT /api/notification/mark-as-read-notification/{id}` - Mark single notification
  - `PUT /api/notification/mark-as-read-many-notifications` - Mark multiple notifications
- **Request Body**: For multiple: `List<string>` of notification IDs
- **Workflow**:
  1. User requests to mark notification(s) as read
  2. Command validates notification ownership
  3. Updates read status for each notification
  4. Persists changes to database
  5. Returns OK confirmation

---

#### 1.3 Delete Notification

- **Description**: Removes one or multiple notifications from the user's notification list. Soft deletes to maintain audit trail.
- **Backend API**:
  - `DELETE /api/notification/delete-notification/{id}` - Delete single notification
  - `DELETE /api/notification/delete-many-notifications` - Delete multiple notifications
- **Request Body**: For multiple: `List<string>` of notification IDs
- **Workflow**:
  1. User requests notification deletion
  2. Command validates notification ownership
  3. Soft-deletes notification record
  4. Updates deletion timestamp
  5. Returns OK confirmation

---

#### 1.4 Register Receiver Device

- **Description**: Registers a mobile or web device for push notifications. Stores device token and associates with user account.
- **Backend API**: `POST /api/notification-receiver/save-receiver-device`
- **Request Body**: `NotificationMessageReceiverDeviceEntityDto` with `deviceTokenId` and `applicationId`
- **Workflow**:
  1. Client application captures device push token
  2. Sends registration request with token and app identifier
  3. Service checks if device already registered
  4. Creates or updates NotificationMessageReceiverDeviceEntity
  5. Enables future push notifications to this device
  6. Returns OK status

---

#### 1.5 Check Device Registration

- **Description**: Verifies if a device token is already registered for push notifications.
- **Backend API**: `GET /api/notification-receiver/check-receiver-device-existing?deviceTokenId={id}`
- **Response**: Device entity if exists, null otherwise
- **Workflow**:
  1. Client queries device existence by token
  2. Service searches database for device record
  3. Returns device info or empty if not found
  4. Client uses result to determine if re-registration needed

---

#### 1.6 Remove Device Registration

- **Description**: Unregisters a device for push notifications. Prevents further notification delivery to that device.
- **Backend API**: `DELETE /api/notification-receiver/delete-receiver-device/{deviceTokenId}`
- **Workflow**:
  1. Client sends device unregistration request
  2. Service locates device by token
  3. Removes device registration
  4. Persists deletion
  5. Returns OK confirmation

---

#### 1.7 Get In-App Messages

- **Description**: Retrieves all unread in-app messages for the current user. Supports filtering by application if needed.
- **Backend API**:
  - `GET /api/notification-receiver/get-in-app-message` - Get all messages
  - `GET /api/notification-receiver/get-in-app-message/{applicationId}` - Get by application
- **Response**: Paginated list of `NotificationMessageEntityDto`
- **Workflow**:
  1. User requests in-app messages
  2. Service queries notifications for current user
  3. Filters by read status (unread first)
  4. Optionally filters by application
  5. Returns ordered message list with latest first
  6. Client displays in notification panel

---

### Key Entities

- **NotificationMessageEntity**: Core notification record with content, recipient, status, timestamps
- **NotificationMessageReceiverDeviceEntity**: Device registration for push notifications with device token and app association
- **MessageContent**: Value object containing message text, title, metadata

### Commands & Queries

| Command/Query | Purpose |
|---|---|
| `NotifyNewNotificationMessageCommand` | Create and send new notification |
| `MarkAsReadNotificationCommand` | Update read status for notifications |
| `RemoveNotificationMessageCommand` | Soft-delete notifications |
| `RegisterNotificationMessageReceiverDeviceCommand` | Register device for push |
| `RemoveNotificationMessageReceiverDeviceCommand` | Unregister device |
| `GetInAppMessageQuery` | Fetch user messages |
| `GetReceiverDeviceQuery` | Check device registration |

---

## 2. ParserApi Service

**Path**: `src/Services/ParserApi/`

**Technology**: Python 3, Django REST Framework, PDF/HTML Parsing

### Service Overview

ParserApi is a specialized Python microservice that extracts structured profile data from resume/CV files and HTML documents. It integrates with LinkedIn parsing libraries to convert unstructured resume data into standardized JSON format for storage and processing.

### Features

#### 2.1 Parse LinkedIn HTML Profile

- **Description**: Extracts profile information from LinkedIn HTML export. Converts HTML-based profile data into structured JSON format containing personal info, experience, education, skills.
- **Backend API**: `POST /api/importHtml2Json`
- **Request Body**: `{ "htmlData": "...html content..." }` - Raw HTML from LinkedIn profile
- **Response**: Structured JSON with:
  - Personal information (name, email, phone, location)
  - Work experience (company, title, dates, description)
  - Education (school, degree, field, dates)
  - Skills and endorsements
  - Certifications and languages
- **Workflow**:
  1. User exports LinkedIn profile as HTML
  2. Sends HTML content to parser endpoint
  3. LinkedInHtmlParser processes HTML
  4. Extracts and structures data using CSS selectors
  5. Returns JSON-formatted profile data
  6. Client application stores parsed data in CV/applicant record

---

#### 2.2 Parse LinkedIn PDF Resume

- **Description**: Extracts text and structured data from LinkedIn-exported PDF resume. Parses PDF layout to identify sections and extract information.
- **Backend API**: `POST /api/importPdf2Json` (multipart/form-data)
- **Request**: Form file upload with `fileToUpload` field containing PDF file
- **Response**: Structured JSON with profile information from PDF
- **Error Handling**: Returns 400 status with error message if:
  - No file provided
  - PDF parsing fails
  - Unsupported file format
- **Workflow**:
  1. User selects resume PDF file from system
  2. Client uploads file via multipart form
  3. Service validates file presence and type
  4. linkedInPdfParser extracts text from PDF
  5. Parses extracted text to identify sections
  6. Returns structured profile data JSON
  7. Client imports parsed data into applicant profile

---

### Key Components

- **LinkedInHtmlParser**: Class handling HTML profile parsing with CSS selectors
- **linkedInPdfParser**: Function handling PDF file parsing and text extraction
- **Schema.py**: Data models/schemas for parsed resume data
- **Authentication**: Custom authentication and permission handling for security

### Integration Points

- Called by CandidateApp when applicants import their profiles
- Results stored in CV/applicant entities
- Supports multiple resume source formats (LinkedIn, standard PDF)

---

## 3. PermissionProvider Service

**Path**: `src/Services/Accounts/Accounts/PermissionProvider/`

**Technology**: .NET 8, CQRS Pattern, Entity Framework

### Service Overview

PermissionProvider manages the subscription, authorization, and access control system for the entire platform. It handles subscription lifecycle, user policies, permission assignments, and role-based access control (RBAC) across all tenant companies.

### Features

#### 3.1 Create Subscription

- **Description**: Creates a new subscription for a company. Includes payment method, subscription package selection, billing period, and seat allocation.
- **Backend API**: `POST /api/subscription` - Command: `CreateSubscriptionCommand`
- **Request Body**: Subscription details (package ID, seats, billing period, payment method)
- **Response**: Created subscription with ID, status, next billing date
- **Workflow**:
  1. Company admin initiates subscription purchase
  2. Selects subscription package (Basic, Professional, Enterprise, etc.)
  3. Specifies number of user seats
  4. Provides payment information
  5. Service creates subscription record
  6. Initializes billing schedule
  7. Returns subscription details with confirmation

---

#### 3.2 Upgrade Subscription

- **Description**: Upgrades existing subscription to higher package tier or adds additional seats. Calculates prorated charges.
- **Backend API**: `POST /api/subscription/upgrade` - Command: `UpgradeSubscriptionCommand`
- **Request Body**: Current subscription ID, new package tier
- **Response**: Upgrade details with prorated cost and new billing adjustment
- **Workflow**:
  1. Admin requests subscription upgrade
  2. System calculates remaining days in current period
  3. Computes prorated credit/charge
  4. Updates subscription to new tier
  5. Adjusts next invoice for prorated amount
  6. Returns upgrade summary with cost impact

---

#### 3.3 Cancel Subscription

- **Description**: Cancels subscription with options for immediate or end-of-period termination.
- **Backend API**:
  - `POST /api/subscription/cancel-at-period-end` - Command: `CancelSubscriptionAtPeriodEndCommand`
  - `POST /api/subscription/cancel-immediately` - Command: `CancelSubscriptionImmediatelyCommand`
- **Request Body**: Subscription ID, cancellation reason (optional)
- **Response**: Cancellation confirmation with effective date
- **Workflow** (Period End):
  1. Admin selects end-of-period cancellation
  2. System sets cancellation date to billing period end
  3. Service continues providing access until end date
  4. Notifies users of upcoming cancellation
  5. On effective date, downgrades to free tier or suspends access
  6. Returns confirmation with cancellation date
- **Workflow** (Immediate):
  1. Admin selects immediate cancellation
  2. System deactivates subscription immediately
  3. Removes access to paid features
  4. Calculates unused credit if applicable
  5. Returns confirmation and credit amount

---

#### 3.4 Activate/Deactivate Subscription

- **Description**: Toggles subscription active status without cancellation. Used for temporary access suspension or reactivation.
- **Backend API**:
  - `POST /api/subscription/activate` - Command: `ActivateSubscriptionCommand`
  - `POST /api/subscription/deactivate` - Command: `DeactivateSubscriptionCommand`
- **Request Body**: Subscription ID
- **Response**: Updated subscription with new status
- **Workflow**:
  1. Admin toggles subscription state
  2. System updates subscription status
  3. Provisioning service adds/removes feature access
  4. Updates user permissions immediately
  5. Returns confirmation with new status

---

#### 3.5 Reinstate Subscription

- **Description**: Reactivates a cancelled subscription to restore previously enabled features.
- **Backend API**: `POST /api/subscription/reinstate` - Command: `ReinstateSubscriptionCommand`
- **Request Body**: Subscription ID, reinstatement date
- **Response**: Reinstated subscription with restored features
- **Workflow**:
  1. Admin requests subscription reinstatement
  2. System validates original subscription details
  3. Restores subscription to previous tier
  4. Recalculates billing from reinstatement date
  5. Rebuilds user permissions from backup
  6. Notifies users of restored access
  7. Returns reinstatement confirmation

---

#### 3.6 Change Payment Card

- **Description**: Updates payment method for subscription billing.
- **Backend API**: `POST /api/subscription/change-card` - Command: `ChangeCardCommand`
- **Request Body**: Subscription ID, new payment card details
- **Response**: Confirmation with updated payment method
- **Workflow**:
  1. Admin updates payment card info
  2. System validates card details
  3. Tests card with small authorization
  4. Updates subscription payment method
  5. Applies to next invoice cycle
  6. Returns confirmation with new last-4 digits

---

#### 3.7 Pay Invoice

- **Description**: Processes manual payment for outstanding subscription invoice.
- **Backend API**: `POST /api/subscription/pay-invoice` - Command: `PaySubscriptionInvoiceCommand`
- **Request Body**: Invoice ID, payment amount, payment method
- **Response**: Payment confirmation with receipt
- **Workflow**:
  1. Admin initiates manual payment for invoice
  2. System retrieves invoice details
  3. Processes payment through payment gateway
  4. Updates invoice status to paid
  5. Applies payment to subscription balance
  6. Generates payment receipt
  7. Returns payment confirmation

---

#### 3.8 Get Subscription Details

- **Description**: Retrieves complete subscription information including package, billing, seats, and features.
- **Backend API**: `GET /api/subscription/{subscriptionId}` - Query: `GetSubscriptionDetailQuery`
- **Response**: `SubscriptionDetailDto` with all subscription information
- **Workflow**:
  1. Admin requests subscription information
  2. System retrieves subscription record
  3. Loads associated package details
  4. Compiles feature list
  5. Includes billing history summary
  6. Returns comprehensive subscription data

---

#### 3.9 Check Subscription Existence

- **Description**: Verifies if a company has an active subscription for a specific module/product.
- **Backend API**: `GET /api/subscription/check-existing` - Query: `CheckExistingSubscriptionQuery`
- **Request Parameters**: Company ID, module/product code
- **Response**: Boolean indicating subscription existence and status
- **Workflow**:
  1. Service checks for active subscription
  2. Validates subscription covers requested module
  3. Confirms subscription is active/not cancelled
  4. Returns existence status
  5. Used by other services to enforce feature access

---

#### 3.10 Get User Policies

- **Description**: Retrieves all policies assigned to a user across companies. Policies define role-based permissions and feature access.
- **Backend API**: `GET /api/user-policy` - Query: `GetUserPolicyQuery`
- **Response**: List of `UserPolicyDto` with roles, permissions, company assignments
- **Caching**: Results cached with configurable TTL (default from configuration)
- **Workflow**:
  1. User requests policy information
  2. Service checks cache first
  3. If expired/missing, queries policy database
  4. Loads user roles for each company
  5. Compiles permission list from roles
  6. Caches result for subsequent requests
  7. Returns complete policy/permission set

---

#### 3.11 Set User Roles

- **Description**: Assigns roles to user within a company. Roles determine access level and available features.
- **Backend API**: `POST /api/user-policy/set-roles` - Command: `SetRolesForUserCommand`
- **Request Body**: User ID, company ID, list of role codes
- **Response**: Updated user policy with assigned roles
- **Workflow**:
  1. Admin selects roles for user
  2. System validates roles exist and are assignable
  3. Validates against subscription limits (seat allocation)
  4. Updates user-role assignments
  5. Clears policy cache for affected user
  6. Broadcasts event for synchronization
  7. Returns updated policy with new roles

---

#### 3.12 Sync User Policies

- **Description**: Synchronizes user policies across the platform. Reconciles policy changes and ensures consistency.
- **Backend API**: `POST /api/user-policy/sync-all` - Command: `SyncAllUserPoliciesCommand`
- **Request Body**: Sync parameters (company IDs, date range, etc.)
- **Response**: Sync result with affected user count
- **Workflow**:
  1. Admin triggers policy synchronization
  2. System queries all policy changes since last sync
  3. For each changed policy, validates against current subscription
  4. Updates permission cache
  5. Broadcasts updates to affected services
  6. Logs sync history for audit
  7. Returns sync summary with affected count

---

#### 3.13 Get Accessible Subscription Packages

- **Description**: Returns available subscription packages that user/company can subscribe to. Filters based on eligibility and current subscription.
- **Backend API**: `GET /api/subscription/accessible-packages` - Query: `GetAccessibleSubscriptionPackagesQuery`
- **Response**: List of `SubscriptionPackageDto` with pricing and features
- **Workflow**:
  1. User views upgrade options
  2. System queries all available packages
  3. Filters based on current subscription tier
  4. Removes incompatible packages
  5. Includes pricing and feature comparison
  6. Returns filtered package list

---

#### 3.14 Get Subscription Overview

- **Description**: Retrieves dashboard overview of all active subscriptions for a company or portfolio of companies.
- **Backend API**: `GET /api/subscription/overview` - Query: `GetSubscriptionsOverviewQuery`
- **Response**: Dashboard data with subscription status, renewal dates, costs
- **Workflow**:
  1. Admin views subscription dashboard
  2. System retrieves all subscriptions for company/portfolio
  3. Compiles status summary (active, expiring, cancelled)
  4. Calculates total spend and upcoming renewals
  5. Includes feature usage vs. limits
  6. Returns overview for dashboard display

---

#### 3.15 Get Company Subscriptions Map

- **Description**: Retrieves subscription information for multiple companies in a single query. Used for portfolio management.
- **Backend API**: `GET /api/subscription/company-map` - Query: `GetCompanySubscriptionsMapQuery`
- **Request Parameters**: List of company IDs
- **Response**: Dictionary mapping company ID to subscription details
- **Workflow**:
  1. Portfolio admin requests multi-company view
  2. System queries subscriptions for all companies
  3. Groups results by company ID
  4. Includes summary for each company
  5. Returns map for comparison/reporting

---

### Key Entities

- **Subscription**: Core subscription record with package, dates, status
- **SubscriptionPackage**: Available subscription tiers with feature definitions
- **UserPolicy**: User-role-company association defining access
- **Role**: Permission group with feature/module access rights
- **Period**: Billing period with dates and invoicing

### Authorization

- All endpoints require IdentityServer authentication (`IdentityServerAuthenticationDefaults.AuthenticationScheme`)
- Role-based authorization enforced for sensitive operations (admin-only, owner-only)
- Company isolation enforced to prevent cross-tenant access

---

## 4. CandidateApp Service

**Path**: `src/Services/CandidateApp/`

**Technology**: .NET 8, CQRS Pattern, OData, File Storage

### Service Overview

CandidateApp is the candidate-facing application that enables job applicants to manage their profiles, upload/maintain CVs, track applications, and search for jobs. It provides REST and OData APIs for web and mobile clients.

### Features

#### 4.1 Get/Update Applicant Profile

- **Description**: Retrieves applicant's profile information and allows profile updates. Includes personal details, contact information, and preferences.
- **Backend API**:
  - `GET /api/applicant/with-cvs` - Get applicant with associated CVs
  - `PUT /api/applicant` - Update applicant profile
- **Request Body** (PUT): `ApplicantDto` with profile data
- **Response**: `ApplicantWithCvsDto` with CVs and profile info, or `UpdateApplicantCommandResult`
- **Workflow**:
  1. Applicant requests profile view
  2. Service queries applicant by user object ID
  3. Loads associated CVs/documents
  4. Returns complete applicant profile
  5. On update: validates data, persists changes
  6. Broadcasts applicant-changed event for downstream systems
  7. Returns updated profile

---

#### 4.2 Refresh/Add Applicant with CV

- **Description**: Refreshes applicant data from source system or creates new applicant profile with CV information.
- **Backend API**: `POST /api/applicant/refreshness-with-cv/{source}`
- **Request Parameters**: `source` - source system name (linkedin, resume, etc.)
- **Response**: `ApplicantWithCvsDto`
- **Workflow**:
  1. Applicant initiates profile import from LinkedIn or other source
  2. Service checks if applicant exists
  3. If exists, refreshes profile data from source
  4. If new, creates applicant record with source data
  5. Associates CVs/resumes with applicant
  6. Records source attribution for analytics
  7. Returns complete applicant profile with CVs

---

#### 4.3 Set Language Configuration

- **Description**: Sets applicant's preferred language for interface and communications.
- **Backend API**: `POST /api/applicant/set-language/{language}`
- **Request Parameters**: `language` - language code (en, vi, etc.)
- **Response**: OK confirmation
- **Workflow**:
  1. Applicant selects language preference
  2. Service updates applicant language configuration
  3. Persists preference
  4. Returns confirmation
  5. Client uses language setting for subsequent requests

---

#### 4.4 Get Applications

- **Description**: Retrieves list of job applications submitted by applicant with ETag support for efficient caching.
- **Backend API**: `GET /api/application`
- **Query Parameters**: Optional filters
- **Response**: List of `ApplicationDto` with ETag header
- **ETag Handling**: Returns 304 Not Modified if data unchanged since last request
- **Workflow**:
  1. Applicant requests application list
  2. Service computes ETag hash from application row versions
  3. Compares with client's If-None-Match header
  4. If unchanged, returns 304 Not Modified
  5. If changed, returns application list with new ETag
  6. Client caches ETag for next request

---

#### 4.5 Create Application

- **Description**: Creates new job application for applicant. Can create by specifying job details or by job code.
- **Backend API**:
  - `POST /api/application` - Create with job details
  - `POST /api/application/apply` - Create by job code
- **Request Body**: `ApplicationDto` or `ApplicationByJobCodeDto`
- **Response**: Created `ApplicationDto` with application ID
- **Workflow**:
  1. Applicant submits application
  2. Service validates job availability and applicant eligibility
  3. Creates application record with status "Draft"
  4. Associates with current CV if selected
  5. Returns application details
  6. For apply-by-code: also triggers submit workflow

---

#### 4.6 Submit Application

- **Description**: Submits completed application for employer review. Marks application status as "Submitted".
- **Backend API**: `POST /api/application/submit-application`
- **Request Body**: `SubmitApplicationDto` with application ID and source
- **Response**: OK confirmation with submission timestamp
- **Workflow**:
  1. Applicant reviews and submits application
  2. Service validates application completeness
  3. Marks status as "Submitted"
  4. Records submission timestamp
  5. Notifies employer of new application
  6. Broadcasts application-submitted event
  7. Sends confirmation to applicant

---

#### 4.7 Update Application

- **Description**: Updates draft application before submission. Allows changes to responses, CV, and other details.
- **Backend API**: `PUT /api/application`
- **Request Body**: Updated `ApplicationDto`
- **Response**: OK confirmation
- **Workflow**:
  1. Applicant edits application draft
  2. Service validates changes
  3. Updates application record
  4. Returns confirmation
  5. Maintains edit history for audit

---

#### 4.8 Delete Application

- **Description**: Removes application (draft or submitted). Soft delete for audit trail.
- **Backend API**: `DELETE /api/application/{id}`
- **Response**: OK confirmation
- **Workflow**:
  1. Applicant requests application deletion
  2. Service soft-deletes application
  3. Records deletion timestamp and reason
  4. Maintains audit trail
  5. Returns confirmation

---

#### 4.9 Get Applied Jobs

- **Description**: Retrieves list of jobs applicant has already applied to.
- **Backend API**: `GET /api/job/get-applied-jobs`
- **Query Parameters**: Optional filters (published status, etc.)
- **Response**: List of `JobDto` that have applications
- **Workflow**:
  1. Applicant views applied jobs
  2. Service queries applications for current user
  3. Groups by job ID
  4. Returns unique job list with application count

---

#### 4.10 Get Job List

- **Description**: Retrieves available jobs with ETag caching support.
- **Backend API**: `GET /api/job`
- **Query Parameters**: `isPublished` - filter by publish status
- **Response**: List of `JobDto` with ETag header
- **Workflow**:
  1. Applicant views job listings
  2. Service computes ETag from job row versions
  3. Returns 304 if data unchanged
  4. Returns job list with ETag if changed
  5. Client caches and reuses ETag

---

#### 4.11 Manage CV Profile

- **Description**: Create, update, and manage CV/resume documents. Supports multiple CV formats.
- **Backend API**: Various CV-related endpoints (CurriculumVitae CRUD operations)
- **Operations**: Create, edit, delete, list, duplicate CV
- **Workflow**:
  1. Applicant manages CV documents
  2. Service validates CV data completeness
  3. Persists CV changes
  4. Broadcasts applicant-changed event
  5. Returns updated CV list

---

#### 4.12 Add Education

- **Description**: Adds education record to applicant's CV.
- **Backend API**:
  - `POST /api/education` - Add education
  - `PUT /api/education` - Update education
- **Request Body**: `EducationDto` with school, degree, field, dates
- **Response**: Created/updated `EducationDto`
- **Workflow**:
  1. Applicant adds education entry
  2. Service creates education record
  3. Associates with CV
  4. Broadcasts applicant-changed event
  5. Returns education record

---

#### 4.13 Add Work Experience

- **Description**: Adds work experience record to CV.
- **Backend API**: `POST /api/work-experience` / `PUT /api/work-experience`
- **Request Body**: `WorkExperienceDto` with company, position, dates, description
- **Response**: Created/updated experience record
- **Workflow**:
  1. Applicant adds experience
  2. Service creates experience record
  3. Associates with CV
  4. Broadcasts event for downstream synchronization
  5. Returns record

---

#### 4.14 Add Skills

- **Description**: Adds skills to CV with endorsement support.
- **Backend API**: `POST /api/skill` / `PUT /api/skill`
- **Request Body**: `SkillDto` with skill name, level, endorsements
- **Response**: Created/updated skill
- **Workflow**:
  1. Applicant lists skills
  2. Service creates skill records
  3. Associates with CV
  4. Returns skill record

---

#### 4.15 Add Certifications

- **Description**: Adds professional certifications to CV.
- **Backend API**: `POST /api/certification` / `PUT /api/certification`
- **Request Body**: `CertificationDto` with certification name, issuer, date
- **Response**: Created/updated certification
- **Workflow**:
  1. Applicant adds certification
  2. Service creates record
  3. Associates with CV
  4. Returns confirmation

---

#### 4.16 Manage Attachments

- **Description**: Upload, download, and manage CV attachments with permission checking.
- **Backend API**:
  - `GET /api/attachments/get-link-attachment/{attachmentId}` - Download/access
  - `POST /api/attachments` - Upload attachment
  - `DELETE /api/attachments/{id}` - Delete attachment
- **File Storage**: Uses platform file storage service (Azure, S3, local)
- **Security**: Validates download permissions based on ownership
- **Workflow**:
  1. Applicant uploads CV file or other attachments
  2. Service validates file type and size
  3. Stores file in secure storage
  4. Creates attachment record in database
  5. Generates secure access token
  6. Returns download link with time-limited access
  7. For downloads: validates permissions before granting access

---

#### 4.17 Mark CV Completion Tasks

- **Description**: Tracks CV completion tasks (add experience, education, etc.) to guide applicant.
- **Backend API**: `PUT /api/cv-completed-task`
- **Request Body**: `CvCompletedTaskDto` with task status
- **Response**: Updated task record
- **Workflow**:
  1. Service tracks CV completion progress
  2. Applicant completes suggested tasks
  3. Service marks tasks as completed
  4. Returns progress summary for onboarding UI

---

### Key Controllers

| Controller | Path | Purpose |
|---|---|---|
| `ApplicantController` | `/api/applicant` | Manage applicant profile |
| `ApplicationController` | `/api/application` | Manage job applications |
| `JobController` | `/api/job` | Browse available jobs |
| `CurriculumVitaeController` | `/api/curriculum-vitae` | Manage CVs/resumes |
| `EducationController` | `/api/education` | Manage education records |
| `WorkExperienceController` | `/api/work-experience` | Manage work experience |
| `SkillController` | `/api/skill` | Manage skills |
| `CertificationController` | `/api/certification` | Manage certifications |
| `AttachmentsController` | `/api/attachments` | Upload/download files |
| `ContactController` | `/api/contact` | Manage contact info |
| `SocialNetworkController` | `/api/social-network` | Link social profiles |

### Event Integration

- **ApplicantChangedEventBusMessage**: Broadcast when applicant profile updated
- **ApplicationSubmittedEventBusMessage**: Broadcast when application submitted
- Enables other services (employer module, notifications, etc.) to react to changes

---

## 5. CandidateHub Service

**Path**: `src/Services/CandidateHub/`

**Technology**: .NET 8, CQRS Pattern, Memory Caching, Basic Authentication

### Service Overview

CandidateHub is a backend aggregation service that manages candidate data from multiple sources (CandidateApp, Vip24 integration, external systems) and provides candidate matching, scoring, and job recommendation capabilities. It integrates candidate profiles with job requirements to identify best matches.

### Features

#### 5.1 Get Job Matching Scores

- **Description**: Calculates compatibility scores between candidates and job positions based on skills, experience, and requirements.
- **Backend API**: `POST /api/candidates/get-job-matching-scores`
- **Authentication**: BasicAuthorize middleware filter
- **Request Body**: `JobQueryModel` with job ID, requirements, candidate filter criteria
- **Response**: List of `JobMatchingModel` with match score, skill matches, experience gaps
- **Caching**: Results cached by query hash with configurable TTL (hours)
- **Workflow**:
  1. Employer/recruiter requests candidates for job
  2. Service checks memory cache by query hash
  3. If cached and valid, returns cached results
  4. If expired/missing:
     - Executes GetMatchedCandidatesQuery to find candidates
     - Runs job matching algorithm
     - Scores each candidate (0-100)
     - Caches results for configured hours
  5. Returns sorted candidate scores (highest first)

---

#### 5.2 Get Candidates Score

- **Description**: Calculates candidate scores based on multiple criteria from specified sources (CV profiles, work history, skills assessments).
- **Backend API**: `POST /api/candidates/get-candidates-score`
- **Authentication**: BasicAuthorize
- **Request Body**: `CandidateHubScoreRequest` with candidate list and source filters
- **Response**: Scored candidate list with score breakdown by category
- **Workflow**:
  1. Service receives candidate score request
  2. Queries GetCandidateScoreQuery with candidates and sources
  3. Executes async score calculation
  4. Returns candidates with individual scores
  5. Scores can factor: completeness, experience, skills, assessments

---

#### 5.3 Get Candidates by IDs

- **Description**: Batch retrieves candidate profiles by ID list from aggregated data store.
- **Backend API**: `POST /api/candidates/get-candidates-by-ids`
- **Authentication**: BasicAuthorize
- **Request Body**: List of `TalentIdGroupModel` (candidate ID groups)
- **Response**: List of candidate profiles with full details
- **Workflow**:
  1. Service receives candidate ID list
  2. Executes GetCandidatesQuery
  3. Retrieves profiles from aggregated data store
  4. Returns complete candidate details
  5. Used for candidate profile display, batch processing

---

#### 5.4 Search Candidates

- **Description**: Full-text search candidates by name, skills, experience, location with advanced filtering.
- **Backend API**: `POST /api/candidates/search` (implied from SearchCandidatesQuery)
- **Request Body**: `SearchCandidatesRequest` with keywords, filters (location, skills, experience level)
- **Response**: Paginated `SearchCandidatesModel` results
- **Workflow**:
  1. Recruiter enters search criteria
  2. Service executes SearchCandidatesQuery
  3. Filters candidates by all criteria
  4. Ranks by relevance
  5. Returns paginated results with hit highlighting

---

#### 5.5 Get Matched Candidates for Job

- **Description**: Retrieves candidates matching job position criteria (skills, experience, location, etc.).
- **Backend API**: Used internally by GetJobMatchingScores endpoint
- **Request**: `JobQueryModel` with job requirements
- **Response**: List of matching candidates
- **Workflow**:
  1. Service loads job requirements
  2. Queries candidate database with filters
  3. Matches candidate profiles against requirements
  4. Returns filtered candidate list
  5. Used as input for scoring

---

#### 5.6 Get Candidate CV

- **Description**: Retrieves candidate's CV document with full profile information.
- **Backend API**: `GET /api/candidates/cv/{candidateId}` (implied from GetCvQuery)
- **Response**: `CvModel` with education, experience, skills, attachments
- **Workflow**:
  1. Employer requests candidate CV
  2. Service retrieves CV from aggregated store
  3. Returns formatted CV data
  4. Used for candidate review

---

#### 5.7 Import Candidates from CandidateApp

- **Description**: Syncs candidate profiles from CandidateApp service into CandidateHub aggregated store.
- **Backend API**: `GET /api/candidates/import-candidates-from-cv-app`
- **Authentication**: BasicAuthorize
- **Response**: List of imported user object IDs
- **Workflow**:
  1. Scheduled sync job or manual trigger
  2. Service calls ImportCandidatesFromCvAppCommand
  3. Retrieves candidate list from CandidateApp
  4. Imports new/updated profiles into hub
  5. Updates candidate privacy settings
  6. Returns imported user count
  7. Enables hub to reflect latest candidate data

---

#### 5.8 Import Candidates from Vip24

- **Description**: Imports candidate profiles from Vip24 external system by organization.
- **Backend API**: Handled by `ImportCandidatesFromVip24ByOrganizationalHandler`
- **Request**: Organization ID or list of organization IDs
- **Workflow**:
  1. Service receives Vip24 import request
  2. Queries Vip24 API for organization candidates
  3. Maps Vip24 profile format to hub schema
  4. Creates/updates candidate records
  5. Logs import status for audit

---

#### 5.9 Update Candidate Vip24 Profiles Daily

- **Description**: Scheduled job that daily syncs candidate profile updates from Vip24 system.
- **Backend API**: `PUT /api/candidates/schedule-candidate-daily`
- **Authentication**: BasicAuthorize
- **Trigger**: Manual execution or scheduled via background job
- **Workflow**:
  1. Daily background job executes
  2. Service calls UpdateCandidateVip24ProfilesDailyCommand
  3. Queries Vip24 for daily profile changes
  4. Updates matching candidates in hub
  5. Logs sync results

---

#### 5.10 Update Candidate Vip24 Profiles Weekly

- **Description**: Scheduled job that weekly performs comprehensive sync of Vip24 candidate data.
- **Backend API**: `PUT /api/candidates/schedule-candidates-weekly`
- **Authentication**: BasicAuthorize
- **Trigger**: Scheduled weekly or manual execution
- **Workflow**:
  1. Weekly job executes
  2. Service calls UpdateCandidateVip24ProfilesWeeklyCommand
  3. Performs full reconciliation of Vip24 data
  4. Updates all changed profiles
  5. Cleans up deleted candidates
  6. Logs comprehensive sync report

---

#### 5.11 Update Candidate Privacy Settings

- **Description**: Updates privacy/visibility settings for candidates from Vip24 integration. Controls profile visibility to employers.
- **Backend API**:
  - `PUT /api/candidates/schedule-candidates-privacy-setting` - Schedule update
  - `PUT /api/candidates/update-candidates-privacy-setting` - Immediate update
- **Authentication**: BasicAuthorize
- **Request Body**: `UpdateCandidatesPrivacySettingRequest` or `AccountPrivacySettingRequest` with privacy settings
- **Workflow**:
  1. Service receives privacy update request
  2. Service calls UpdateCandidateVip24PrivacySettingCommand
  3. Updates privacy flags on Vip24 profiles
  4. Syncs settings to hub records
  5. Adjusts visibility in search/matching

---

### Key Components

- **CandidatesController**: Main API endpoint for candidate operations
- **GetJobMatchingScoresQuery**: Scoring algorithm implementation
- **GetMatchedCandidatesQuery**: Filtering and matching logic
- **SearchCandidatesQuery**: Full-text search implementation
- **BasicAuthorize Filter**: Security middleware for public-facing endpoints
- **Memory Caching**: In-memory cache for job matching scores

### Data Integrations

| Source | Integration | Purpose |
|---|---|---|
| **CandidateApp** | Command: ImportCandidatesFromCvAppCommand | Sync candidate profiles |
| **Vip24 System** | Commands: ImportVip24, UpdateDaily, UpdateWeekly | External candidate data |
| **Internal Hub DB** | Standard repository access | Aggregated candidate store |

### Caching Strategy

- Job matching scores cached by query hash
- Cache TTL configured in settings: `CachedScoreTimeByHour`
- Default sliding expiration prevents stale data
- Cache key includes job ID and all filter parameters

---

## Integration & Communication Patterns

### Cross-Service Communication

1. **Event Bus**: Services broadcast domain events for asynchronous consumption
   - `ApplicantChangedEventBusMessage` - CandidateApp → downstream systems
   - `ApplicationSubmittedEventBusMessage` - CandidateApp → employer module
   - `NotificationMessageEventBusMessage` - NotificationMessage → delivery systems

2. **Direct API Calls**: Synchronous service-to-service communication
   - CandidateApp calls ParserApi for resume parsing
   - CandidateHub imports data from CandidateApp via direct queries
   - Permission verification calls PermissionProvider API

3. **Scheduled Jobs**: Background tasks for periodic synchronization
   - CandidateHub daily/weekly Vip24 sync
   - NotificationMessage cleanup jobs
   - Permission cache refresh

4. **Configuration-Driven Integration**
   - Service endpoints configurable via appsettings
   - Feature flags control integration behavior
   - Retry policies and timeouts configured globally

### Data Consistency

- **Eventual Consistency**: Event-driven updates ensure eventual data sync across services
- **Audit Logging**: All changes logged with timestamps for reconciliation
- **Caching Strategy**: Memory caches with TTL prevent stale data in read-heavy paths
- **ETag Support**: HTTP caching reduces unnecessary data transfer (CandidateApp)

### Security & Authorization

- **Authentication**: IdentityServer integration across all services
- **Authorization**: Role-based access control (RBAC) enforced at API and command level
- **Tenancy**: Company isolation ensures multi-tenant data security
- **Basic Auth**: CandidateHub uses BasicAuthorize for internal/partner integrations
- **File Security**: Attachment access validated against ownership/permissions

---

## Future Considerations

1. **Scalability**: Current caching could benefit from distributed cache (Redis) at scale
2. **Async Improvements**: More webhook-based instead of polling for external integrations
3. **API Versioning**: Implement versioning strategy for backward compatibility
4. **Search Enhancement**: Move from in-memory search to dedicated search engine (Elasticsearch)
5. **Analytics**: Centralize event logging for better visibility into cross-service flows
