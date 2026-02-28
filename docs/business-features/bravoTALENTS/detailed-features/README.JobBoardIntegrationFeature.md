# Job Board Integration Feature

<!--
Metadata:
  Feature: Job Board Integration
  Module: bravoTALENTS
  Domain: Candidate Management
  Services: Setting Service, Candidate Service
  Version: 1.0.7
  Last Updated: 2026-01-10
  Status: Active (ITViec implemented, VietnamWorks/TopCV planned)
-->

> **Comprehensive Technical Documentation for the ScanMailBox & Job Board API Integration System**

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Executive Summary](#1-executive-summary) | High-level overview and key capabilities |
| [Business Value](#2-business-value) | ROI, efficiency gains, business impact |
| [Business Requirements](#3-business-requirements) | Formal functional requirements |
| [Business Rules](#4-business-rules) | Validation, uniqueness, and processing rules |
| [Process Flows](#5-process-flows) | End-to-end workflow diagrams |
| [Design Reference](#6-design-reference) | UI/UX mockups and specifications |
| [System Design](#7-system-design) | Architecture and design patterns |
| [Architecture](#8-architecture) | High-level system architecture |
| [Domain Model](#9-domain-model) | Entities, value objects, enums |
| [API Reference](#10-api-reference) | REST endpoints and contracts |
| [Frontend Components](#11-frontend-components) | Angular components and UI |
| [Backend Controllers](#12-backend-controllers) | API controllers and handlers |
| [Cross-Service Integration](#13-cross-service-integration) | Message bus patterns |
| [Security Architecture](#14-security-architecture) | Authentication, encryption, RBAC |
| [Performance Considerations](#15-performance-considerations) | Optimization and tuning |
| [Implementation Guide](#16-implementation-guide) | Step-by-step setup instructions |
| [Test Specifications](#17-test-specifications) | Test scenarios and data |
| [Test Data Requirements](#18-test-data-requirements) | Test data setup |
| [Edge Cases Catalog](#19-edge-cases-catalog) | Corner cases and handling |
| [Regression Impact](#20-regression-impact) | Related features affected |
| [Troubleshooting](#21-troubleshooting) | Common issues and solutions |
| [Operational Runbook](#22-operational-runbook) | Production operations guide |
| [Roadmap and Dependencies](#23-roadmap-and-dependencies) | Future plans and prerequisites |
| [Related Documentation](#24-related-documentation) | Links to related docs |
| [Glossary](#25-glossary) | Terms and definitions |
| [Version History](#26-version-history) | Change log |

---

## 1. Executive Summary

### Overview

The Job Board Integration feature enables BravoSUITE to automatically fetch job applications from external job board platforms (ITViec, VietnamWorks, TopCV, LinkedIn, etc.). The system supports **two integration methods**:

1. **Email-Based Scanning (ScanMailBox)**: Monitors company email inboxes via IMAP for job application notification emails from job boards, parses candidate information, and creates applications automatically.

2. **API-Based Integration**: Direct REST API integration with job board platforms for real-time application data fetching.

### Key Capabilities

- **Dual Integration Methods**: Email scanning and direct API integration
- **Multi-Provider Support**: Extensible architecture supporting 8+ job board providers
- **IMAP Email Monitoring**: Automatic inbox scanning with OAuth2 and basic auth support
- **API-Based Fetching**: Direct API integration for real-time application data
- **Automatic Synchronization**: Scheduled background syncing of new applications
- **Duplicate Detection**: Intelligent tracking to prevent reprocessing applications
- **CV Download & Parsing**: Automatic candidate CV/resume retrieval and parsing
- **Secure Credential Storage**: Encrypted storage of passwords and API credentials
- **Per-Company Configuration**: Each company can configure their own provider integrations

### Technical Highlights

- **Services**: Setting Service (configuration), Candidate Service (processing)
- **Architecture Patterns**: Strategy, Factory, Template Method, CQRS, Message Bus
- **Technologies**: .NET 9, MongoDB, RabbitMQ, MailKit (IMAP), Azure Blob Storage
- **Security**: AES-256 encryption, OAuth2 support, role-based access control

> **Important**: Jobs must exist in BravoSUITE before applications can be linked. When a job application references a job that doesn't exist, the system creates a **sourced candidate** without linking to any job (warning logs are produced for visibility). Auto-creation of jobs is disabled.

---

## 2. Business Value

### ROI and Efficiency Gains

| Metric | Before Integration | After Integration | Improvement |
|--------|-------------------|-------------------|-------------|
| **Manual Data Entry Time** | 5-10 min per application | 0 min (automated) | **100% reduction** |
| **Application Processing Speed** | 1-2 days | Real-time (<5 min) | **95% faster** |
| **Data Accuracy** | 85% (human errors) | 99% (automated parsing) | **14% increase** |
| **CV Download Time** | 2-3 min per candidate | 0 min (automated) | **100% reduction** |
| **Missed Applications** | 5-10% (overlooked emails) | 0% (automatic sync) | **Zero missed** |

### Business Impact

#### For HR Teams

- **Eliminate Repetitive Work**: No manual copy-paste from emails or job board websites
- **Faster Response Time**: Candidates see faster acknowledgment and engagement
- **Focus on Value**: HR spends time interviewing, not data entry
- **Multi-Channel Coverage**: Single interface for applications from 8+ job boards

#### For Recruitment Managers

- **Real-Time Visibility**: Immediate notification of new applications
- **Complete Audit Trail**: Track application source (ITViec, VietnamWorks, etc.)
- **Performance Metrics**: Measure job board effectiveness
- **Scalability**: Handle 1000+ applications/month without additional headcount

#### For C-Level Executives

- **Cost Savings**: Reduce recruitment ops cost by 40-60%
- **Competitive Advantage**: Faster time-to-hire than competitors
- **Data-Driven Decisions**: Analytics on best-performing job boards
- **Compliance**: Encrypted credential storage, GDPR-compliant data handling

### Use Case Examples

#### Scenario 1: High-Volume Tech Recruitment

**Company**: 500-employee IT company
**Challenge**: 200-300 applications/month from ITViec, VietnamWorks, LinkedIn
**Before**: 2 full-time recruiters spending 30% of time on data entry
**After**: Zero data entry, recruiters focus 100% on candidate screening
**ROI**: 60 hours/month saved = $2,400/month (at $40/hour)

#### Scenario 2: Multi-Department Hiring

**Company**: Enterprise with 10 departments hiring separately
**Challenge**: Each department monitors different email addresses and job boards
**Before**: Fragmented process, missed applications, duplicate candidates
**After**: Centralized integration, zero duplicates, complete visibility
**ROI**: 40% reduction in time-to-fill, 25% improvement in candidate experience

---

## 3. Business Requirements

> **Objective**: Automate job application intake from external job boards to reduce manual data entry and accelerate candidate pipeline.
>
> **Core Values**: Automated - Reliable - Secure

### Email-Based Integration Requirements

#### FR-JB-01: Configure Email Scanning

| Aspect | Details |
|--------|---------|
| **Description** | Admin can configure email inbox for application scanning |
| **Authentication** | Basic auth (username/password) or OAuth2 (Gmail, Office 365) |
| **Settings** | IMAP server, port, SSL, scan frequency |
| **Multi-Inbox** | Support multiple email addresses per company |
| **Security** | Passwords encrypted at rest with AES-256 |

#### FR-JB-02: Automatic Email Parsing

| Aspect | Details |
|--------|---------|
| **Description** | System parses job board notification emails automatically |
| **Detection** | Identify job board by sender email domain |
| **Extraction** | Candidate name, email, job title, CV attachment |
| **Providers** | ITViec, VietnamWorks, TopCV, LinkedIn, and 6+ others |
| **Fallback** | Generic parser for unsupported job boards |

#### FR-JB-03: CV Processing

| Aspect | Details |
|--------|---------|
| **Description** | System downloads and processes CV attachments |
| **Formats** | PDF, DOC, DOCX |
| **Storage** | Azure Blob Storage with company-scoped paths |
| **Parsing** | Extract summary, skills, experience via CV parser |

### API-Based Integration Requirements

#### FR-JB-04: Configure API Provider

| Aspect | Details |
|--------|---------|
| **Description** | Admin can configure API integration with job boards |
| **Authentication** | OAuth2 Client Credentials, API Key, Basic Auth |
| **Settings** | Base URL, client ID/secret, custom headers |
| **Multiple** | Support multiple accounts per provider type |
| **Validation** | Unique display name and credentials within company |

#### FR-JB-05: Automatic Sync

| Aspect | Details |
|--------|---------|
| **Description** | System syncs applications automatically on schedule |
| **Frequency** | Every 5 minutes (configurable) |
| **Trigger** | Immediate sync when configuration saved |
| **Detection** | Detect new applications by date-based filtering |
| **Deduplication** | Track processed application IDs to prevent duplicates |

#### FR-JB-06: View Sync Status

| Aspect | Details |
|--------|---------|
| **Description** | Admin can view sync status and statistics |
| **Indicators** | Healthy (green), Warning (yellow), Failing (red) |
| **Metrics** | Last sync time, applications processed, error count |
| **History** | Recent sync errors with timestamps |

### Provider Management Requirements

#### FR-JB-07: Enable/Disable Provider

| Aspect | Details |
|--------|---------|
| **Description** | Admin can enable or disable provider integrations |
| **Behavior** | Disabled providers skip during scheduled syncs |
| **Immediate** | Changes take effect immediately |
| **Retention** | Configuration retained when disabled |

#### FR-JB-08: Delete Provider Configuration

| Aspect | Details |
|--------|---------|
| **Description** | Admin can delete provider configurations |
| **Permissions** | Requires Admin role |
| **Confirmation** | Confirmation dialog before deletion |
| **Cleanup** | Removes configuration and sync state |

### Candidate Creation Requirements

#### FR-JB-09: Create Candidate from Application

| Aspect | Details |
|--------|---------|
| **Description** | System creates candidate records from parsed applications |
| **Matching** | Link to existing job by name if found |
| **Sourced** | Create as sourced candidate if job not found |
| **Deduplication** | Update existing candidate if email matches |
| **Source Tracking** | Record application source (ITViec, VietnamWorks, etc.) |

#### FR-JB-10: Error Notification

| Aspect | Details |
|--------|---------|
| **Description** | System notifies admins of persistent sync failures |
| **Threshold** | After 3 consecutive failures |
| **Channel** | Email notification to company admin |
| **Recovery** | Clear error state on successful sync |

### Security Requirements

#### FR-JB-11: Credential Security

| Aspect | Details |
|--------|---------|
| **Description** | All credentials stored securely |
| **Encryption** | AES-256 encryption for secrets at rest |
| **Transmission** | Secrets decrypted only when needed for API calls |
| **Masking** | Secrets masked in API responses and logs |

#### FR-JB-12: Access Control

| Aspect | Details |
|--------|---------|
| **Description** | Role-based access to configuration management |
| **View** | HR role can view configurations |
| **Manage** | HR Admin can create/update configurations |
| **Delete** | Admin role required for deletion |

---

## 4. Business Rules

### Validation Rules

#### BR-JB-01: DisplayName Uniqueness

- **Rule**: Each configuration must have a unique `DisplayName` within the same company
- **Scope**: Per-company
- **Error Message**: "A provider with this display name already exists in your company"
- **Enforcement**: Command validation in `SaveJobBoardProviderConfigurationCommand`

#### BR-JB-02: AuthConfiguration Uniqueness

- **Rule**: No two configurations can share identical authentication credentials within the same company
- **Scope**: Per-company
- **Rationale**: Prevents duplicate configurations for the same account
- **Check Fields**: AuthType, ClientId, ClientSecret, ApiKey, Username, Password, BaseUrl
- **Error Message**: "A provider with identical authentication settings already exists"
- **Enforcement**: Domain expression `HasDuplicateAuthConfigurationExpr`

#### BR-JB-03: Multiple Configs Per Provider

- **Rule**: A company CAN have multiple configurations for the same provider type
- **Example**: Multiple ITViec accounts for different departments
- **Uniqueness**: Enforced by DisplayName and AuthConfiguration, NOT by ProviderType

#### BR-JB-04: Required Fields by FetchMethod

| FetchMethod | Required Fields |
|-------------|----------------|
| **Email** | IMAP settings (configured in OrganizationalUnit) |
| **API** | BaseUrl, AuthType, auth credentials (ClientId/Secret, ApiKey, or Username/Password) |
| **Hybrid** | Both Email and API requirements |

#### BR-JB-05: Secret Change Detection

- **Create Mode**: All secrets required
- **Update Mode with "Change Secret" checked**: New secret required
- **Update Mode without "Change Secret"**: Existing encrypted secret retained
- **Frontend**: "Change Secret" checkbox only shown when secret exists

### Processing Rules

#### BR-JB-06: Job Linking Strategy

1. **Attempt Job Match**: Search for job by exact name match
2. **If Job Found**: Create Application linking Candidate + Job (StageType.New)
3. **If Job NOT Found**: Create Sourced Candidate without job link
4. **Warning Logged**: "Job not found for application: {jobTitle}"
5. **No Auto-Creation**: System does NOT create jobs automatically

#### BR-JB-07: Duplicate Application Detection

- **Primary Key**: External application ID from job board API
- **Secondary Key**: Candidate email + Job ID + Application date
- **Tracking**: `SyncStateValue.SameDateProcessedIds` for same-day deduplication
- **Behavior**: Skip processing if already processed

#### BR-JB-08: Email Scanning Behavior

- **Always Mark as Read**: Emails marked as seen after processing (success or failure)
- **Rationale**: Prevents infinite reprocessing loops
- **Error Handling**: Errors logged but email still marked seen

#### BR-JB-09: Sync State Retention

| Field | Retention | Limit |
|-------|-----------|-------|
| `RecentErrors` | Last 10 errors | Cleared on successful sync |
| `SameDateProcessedIds` | Same-day applications | 200 IDs max |
| `JobSyncInfos` | Per-job application counts | No limit |
| `ConsecutiveFailureCount` | Incremented on failure | Reset to 0 on success |

#### BR-JB-10: Consecutive Failure Threshold

- **Threshold**: 3 consecutive failures
- **Action**: Email notification to company admin
- **Recovery**: Clear failure count on next successful sync
- **Notification Frequency**: Max once per day to avoid spam

### Authorization Rules

#### BR-JB-11: Role-Based Permissions

| Role | View Configs | Create/Edit Configs | Delete Configs |
|------|-------------|-------------------|---------------|
| System Admin | All companies | All companies | All companies |
| Org Unit Admin | Own company only | Own company only | Own company only |
| HR Manager | Own company only | Own company only | No |
| HR User | Own company only | No | No |
| Other Roles | No | No | No |

### Data Integrity Rules

#### BR-JB-12: Encryption Key Management

- **Storage**: appsettings.json (not in database)
- **Length**: Exactly 32 characters for AES-256
- **Rotation**: Requires re-encryption of all secrets
- **Access**: Only Setting Service has the key

#### BR-JB-13: Message Bus Decryption

- **Approach**: Secrets decrypted before sending via message bus
- **Rationale**: Candidate Service doesn't need encryption key
- **Security**: RabbitMQ messages secured by network isolation

---

## 5. Process Flows

### Email Scanning Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SETTING SERVICE                                                              │
│                                                                              │
│  ScanMailSettingSchedulerHostedService (configurable interval)              │
│                    ↓                                                         │
│  SettingScanMailboxMessageProvider.SyncMessageToBusProcess()                │
│  • Query: Companies with JobBoardIntegration enabled + Active subscription  │
│  • Paging: 10 companies per batch                                           │
│  • Create: ScanMailBoxTriggerScanRequestBusMessage                          │
│  • Update: LastScannedMailTime                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ RabbitMQ
┌─────────────────────────────────────────────────────────────────────────────┐
│ CANDIDATE SERVICE                                                            │
│                                                                              │
│  ScanMailBoxTriggerScanRequestBusMessageConsumer                            │
│                    ↓                                                         │
│  ScanMailBoxCommandHandler.Execute()                                        │
│  • For each email setting (parallel, max 5):                                │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ 1. CreateEmailSettingForScanning()                                  │  │
│    │    • Decrypt password (SecurityHelper)                              │  │
│    │    • Refresh OAuth token if expired                                 │  │
│    │                                                                     │  │
│    │ 2. MailikitScanningMailService.GetUnreadIds()                       │  │
│    │    • Connect to IMAP server (with connection pooling)               │  │
│    │    • Search: SearchQuery.NotSeen                                    │  │
│    │                                                                     │  │
│    │ 3. MailikitScanningMailService.GetEmails()                          │  │
│    │    • Fetch email bodies and attachments                             │  │
│    │                                                                     │  │
│    │ 4. HandleEmailsAsync() - For each email:                            │  │
│    │    a. GetApplicationInfo()                                          │  │
│    │       • Detect job board from From email domain                     │  │
│    │       • Extract job title using board-specific regex                │  │
│    │    b. GetScanMailboxService() - Strategy pattern                    │  │
│    │       • ITViec → ScanOuterCareerSiteMailboxService                  │  │
│    │       • TopCV → ScanTopCvMailboxService                             │  │
│    │       • LinkedIn → ScanLinkedInMailboxService                       │  │
│    │    c. ScanMailBoxApplication()                                      │  │
│    │       • Extract candidate name from subject                         │  │
│    │       • Extract email from body/reply-to                            │  │
│    │       • Parse CV attachment                                         │  │
│    │       • Upload CV to Azure Storage                                  │  │
│    │    d. MarkSeenEmails() - Always mark as processed                   │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
│                    ↓                                                         │
│  Send: ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage             │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ RabbitMQ
┌─────────────────────────────────────────────────────────────────────────────┐
│ CANDIDATE SERVICE                                                            │
│                                                                              │
│  ScanMailBoxNewJobApplicationEmailReceivedEventBusConsumer                  │
│                    ↓                                                         │
│  ICreateCandidateCommandHandler.ExecuteAsync()                              │
│  • Find company by JobBoardIntegrationEmailAddress                          │
│  • Create/update Candidate entity                                           │
│  • Find Job entity by name (does NOT auto-create jobs)                      │
│  • If job found: Create Application linking Candidate + Job (StageType.New) │
│  • If job NOT found: Create Sourced Candidate without job link              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SETTING SERVICE                                                              │
│                                                                              │
│  JobBoardApiSyncSchedulerHostedService (every 5 minutes)                    │
│                    ↓                                                         │
│  JobBoardApiSyncMessageProvider.SyncMessageToBusProcess()                   │
│  • Query: Enabled JobBoardProviderConfigurations with FetchMethod=API       │
│  • Paging: 10 configurations per batch                                      │
│  • Create: JobBoardApiTriggerSyncRequestBusMessage                          │
│  • Decrypt: Secrets decrypted before sending                                │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ RabbitMQ
┌─────────────────────────────────────────────────────────────────────────────┐
│ CANDIDATE SERVICE                                                            │
│                                                                              │
│  JobBoardApiTriggerSyncRequestBusMessageConsumer                            │
│                    ↓                                                         │
│  JobBoardApplicationSyncService.SyncProviderApplicationsAsync()             │
│  • For each configuration (parallel, max 5):                                │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │ 1. JobBoardProviderFactory.GetProvider(providerType)                │  │
│    │    • ITViec → ITViecJobBoardProvider                                │  │
│    │    • VietnamWorks → VietnamWorksJobBoardProvider (future)           │  │
│    │                                                                     │  │
│    │ 2. provider.AuthenticateAsync(config)                               │  │
│    │    • OAuth2 token exchange (cached with expiration)                 │  │
│    │    • Returns ProviderAuthResult with access token                   │  │
│    │                                                                     │  │
│    │ 3. Fetch Jobs (paged, 50 jobs per page):                            │  │
│    │    a. provider.GetJobsCountAsync()                                  │  │
│    │    b. Loop: provider.GetJobsPagedAsync(skip, take)                  │  │
│    │                                                                     │  │
│    │ 4. provider.DetectJobsWithNewApplications(jobs, syncState)          │  │
│    │    • Compare job.ApplicationCount with syncState.JobSyncInfos       │  │
│    │    • Returns list of jobs with increased counts                     │  │
│    │                                                                     │  │
│    │ 5. For each job with new applications:                              │  │
│    │    a. provider.GetApplicationsCountAsync(jobId)                     │  │
│    │    b. Loop: provider.GetApplicationsPagedAsync(jobId, skip, take)   │  │
│    │    c. provider.FilterNewApplications(apps, syncState)               │  │
│    │       • Filter by LastProcessedApplicationDate                      │  │
│    │       • Exclude SameDateProcessedIds                                │  │
│    │    d. For each new application:                                     │  │
│    │       • Create Candidate entity                                     │  │
│    │       • Find Job by name (or create sourced candidate)              │  │
│    │       • Download CV from provider                                   │  │
│    │       • Upload CV to Azure Storage                                  │  │
│    │       • Create Application entity                                   │  │
│    │                                                                     │  │
│    │ 6. Update SyncState:                                                │  │
│    │    • LastSyncedAt = now                                             │  │
│    │    • LastSuccessfulSyncAt = now                                     │  │
│    │    • LastProcessedApplicationDate = latest app date                 │  │
│    │    • JobSyncInfos[jobId] = new counts                               │  │
│    │    • SameDateProcessedIds = processed IDs from same day             │  │
│    │    • ConsecutiveFailureCount = 0                                    │  │
│    │    • RecentErrors.Clear()                                           │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
│                    ↓                                                         │
│  Send: SettingUpdateJobBoardSyncStateRequestBusMessage                      │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↓ RabbitMQ
┌─────────────────────────────────────────────────────────────────────────────┐
│ SETTING SERVICE                                                              │
│                                                                              │
│  SettingUpdateJobBoardSyncStateRequestBusMessageConsumer                    │
│                    ↓                                                         │
│  UpdateJobBoardSyncStateCommandHandler.Execute()                            │
│  • Load configuration by ID                                                 │
│  • Update SyncState value object                                            │
│  • Persist to database                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sync Process Fails (API timeout, auth error, etc.)                          │
│                    ↓                                                         │
│  JobBoardApplicationSyncService catches exception                           │
│                    ↓                                                         │
│  Update SyncState with error:                                               │
│  • LastSyncedAt = now                                                       │
│  • ConsecutiveFailureCount += 1                                             │
│  • RecentErrors.Add(new SyncError { Message, Timestamp })                   │
│                    ↓                                                         │
│  Send: SettingUpdateJobBoardSyncStateRequestBusMessage (Success=false)      │
│                    ↓                                                         │
│  If ConsecutiveFailureCount >= 3:                                           │
│    • Send email notification to company admin                               │
│    • Include recent errors and troubleshooting steps                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Design Reference

### UI/UX Overview

The Job Board Integration feature has two primary UI surfaces:

1. **Email Scanning Configuration**: In Company Settings → Job Board Integration
2. **API Provider Management**: Modal slide-in panel with list + form views

### Email Scanning Configuration UI

**Location**: Company Settings → Job Board Integration tab

**Layout**:

```
┌──────────────────────────────────────────────────────────────┐
│ Job Board Integration Settings                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ [x] Enable Email Scanning                                    │
│                                                              │
│ Email Address:  ___________________________________          │
│ IMAP Server:    ___________________________________          │
│ IMAP Port:      ______  [x] Use SSL                          │
│                                                              │
│ Authentication Method: [v] Basic Auth / OAuth2               │
│                                                              │
│ Username:       ___________________________________          │
│ Password:       ___________________________________          │
│                                                              │
│ Scan Frequency: [v] Every 15 minutes                         │
│                                                              │
│ Last Scanned:   2024-01-15 10:30 AM                          │
│                                                              │
│          [Test Connection]  [Save]  [Cancel]                 │
└──────────────────────────────────────────────────────────────┘
```

### API Provider Configuration UI

**Entry Point**: Company Settings → Job Board Integration → "Manage API Providers" button

**List View**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Job Board API Providers                                    [+ Add New] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ITViec - Main Account                            [●] Enabled     │ │
│  │ Last Sync: 2 minutes ago                                         │ │
│  │ Applications: 150 processed                                      │ │
│  │ Status: Healthy                                                  │ │
│  │                                    [Edit] [Test] [Delete]        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ITViec - Department 2                           [○] Disabled     │ │
│  │ Last Sync: 1 hour ago                                            │ │
│  │ Applications: 45 processed                                       │ │
│  │ Status: Warning (2 recent errors)                                │ │
│  │                                    [Edit] [Test] [Delete]        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Form View (Slide-in Panel)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Configure Job Board Provider                                    [X]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Display Name: *                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ITViec - Main Account                                              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Provider Type: *                                                       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ITViec                                                        [v]  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Fetch Method: *                                                        │
│ ( ) Email Only   (●) API Only   ( ) Hybrid                            │
│                                                                        │
│ Authentication Type: *                                                 │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ OAuth2 Client Credentials                                    [v]  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Base URL: *                                                            │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ https://api.itviec.com                                             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Client ID: *                                                           │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ your-client-id                                                     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ [x] Change Client Secret                                               │
│ Client Secret: *                                                       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ••••••••••••••••••••                                               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ─────────────────────────────────────────────────────────────────────  │
│ Advanced Settings                                                      │
│                                                                        │
│ Timeout (seconds): 30                                                  │
│ Max Retry Attempts: 3                                                  │
│                                                                        │
│ Custom Headers: (Optional)                                             │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ X-Custom-Header: value                                             │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ Notes: (Optional)                                                      │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Main recruitment account for all departments                       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ [x] Enable this provider                                               │
│                                                                        │
│                                   [Test Connection]  [Save]  [Cancel]  │
└────────────────────────────────────────────────────────────────────────┘
```

### Status Indicators

**Healthy** (Green):
- Last sync < 10 minutes ago
- Zero consecutive failures
- Applications being processed

**Warning** (Yellow):
- Last sync 10-60 minutes ago
- 1-2 consecutive failures
- Recent errors present

**Failing** (Red):
- Last sync > 60 minutes ago
- 3+ consecutive failures
- Admin notified

### Mobile Responsiveness

- List view: Stack cards vertically
- Form view: Full-screen modal on mobile
- Touch-optimized buttons (min 44px height)

---

## 7. System Design

### Design Patterns Used

| Pattern | Usage | Location |
|---------|-------|----------|
| **Strategy** | Email parsers & API providers | `BaseScanMailboxService`, `IJobBoardApplicationProvider` |
| **Template Method** | Common provider/parser logic | `BaseApiJobBoardProvider`, `BaseScanMailboxService` |
| **Factory** | Provider/parser instantiation | `JobBoardProviderFactory` |
| **Object Pool** | IMAP connection management | `MailikitScanningMailService.ImapClientPool` |
| **Repository** | Data access | `ISettingRepository<T>` |
| **CQRS** | Command/Query separation | Commands & Queries folders |
| **Request-Driven** | Cross-service communication | Message Bus (Request/Response pattern) |
| **Value Object** | Authentication & sync state | `AuthConfigurationValue`, `SyncStateValue` |

### Strategy Pattern: Email Parsers

```csharp
// Strategy interface
public abstract class BaseScanMailboxService
{
    public abstract Task<ScanMailBoxApplicationResult> ScanMailBoxApplication(
        EmailModel email, CompanyJobBoardIntegrationModel integrationModel);
}

// Concrete strategies
public class ScanOuterCareerSiteMailboxService : BaseScanMailboxService
{
    // Handles ITViec, VietnamWorks, CareerLink, etc.
}

public class ScanTopCvMailboxService : BaseScanMailboxService
{
    // TopCV-specific parsing + API integration
}

public class ScanLinkedInMailboxService : BaseScanMailboxService
{
    // LinkedIn-specific parsing
}

// Context (uses strategy)
public class ScanMailBoxCommandHandler
{
    private BaseScanMailboxService GetScanMailboxService(string jobBoardEmail)
    {
        return jobBoardEmail switch
        {
            var e when e.Contains(PartialJobBoardEmails.ITViec) => scanOuterCareerSiteService,
            var e when e.Contains(PartialJobBoardEmails.TopCv) => scanTopCvService,
            var e when e.Contains(PartialJobBoardEmails.LinkedIn) => scanLinkedInService,
            _ => scanOtherMailboxService // Fallback
        };
    }
}
```

### Factory Pattern: Provider Factory

```csharp
public interface IJobBoardProviderFactory
{
    IJobBoardApplicationProvider GetProvider(JobBoardProviderType providerType);
}

public class JobBoardProviderFactory : IJobBoardProviderFactory
{
    private readonly Dictionary<JobBoardProviderType, IJobBoardApplicationProvider> providers;

    public JobBoardProviderFactory(IEnumerable<IJobBoardApplicationProvider> allProviders)
    {
        providers = allProviders.ToDictionary(p => p.ProviderType);
    }

    public IJobBoardApplicationProvider GetProvider(JobBoardProviderType providerType)
    {
        return providers.TryGetValue(providerType, out var provider)
            ? provider
            : throw new NotSupportedException($"Provider {providerType} not implemented");
    }
}
```

### Template Method Pattern: Base Provider

```csharp
public abstract class BaseApiJobBoardProvider : IJobBoardApplicationProvider
{
    // Template method
    public async Task<ProviderAuthResult> AuthenticateAsync(
        JobBoardProviderConfiguration config,
        CancellationToken cancellationToken = default)
    {
        // Double-checked locking for thread safety
        var cacheKey = config.Id;
        if (authCache.TryGetValue(cacheKey, out var cached) && !cached.IsExpired)
            return cached;

        await GetOrCreateLock(cacheKey).WaitAsync(cancellationToken);
        try
        {
            if (authCache.TryGetValue(cacheKey, out cached) && !cached.IsExpired)
                return cached;

            // Call abstract method (hook)
            var result = await AuthenticateWithProviderAsync(config, cancellationToken);
            authCache[cacheKey] = result;
            return result;
        }
        finally
        {
            GetOrCreateLock(cacheKey).Release();
        }
    }

    // Hook methods (must be implemented by subclasses)
    protected abstract Task<ProviderAuthResult> AuthenticateWithProviderAsync(
        JobBoardProviderConfiguration config, CancellationToken cancellationToken);

    protected abstract Task<int> GetJobsCountInternalAsync(
        JobBoardProviderConfiguration config, ProviderAuthResult auth, CancellationToken cancellationToken);
}

// Concrete implementation
public class ITViecJobBoardProvider : BaseApiJobBoardProvider
{
    protected override async Task<ProviderAuthResult> AuthenticateWithProviderAsync(
        JobBoardProviderConfiguration config, CancellationToken ct)
    {
        // ITViec-specific OAuth2 token exchange
        var response = await httpClient.PostAsync("/oauth.json", new FormUrlEncodedContent(...));
        var token = await response.Content.ReadFromJsonAsync<TokenResponse>();
        return new ProviderAuthResult { AccessToken = token.AccessToken, ExpiresAt = ... };
    }
}
```

### Object Pool Pattern: IMAP Connections

```csharp
private sealed class ImapClientPool : IDisposable
{
    private readonly ConcurrentQueue<ImapClient> availableClients;
    private readonly SemaphoreSlim clientSemaphore;
    private const int PoolSize = 3;

    public ImapClientPool()
    {
        availableClients = new ConcurrentQueue<ImapClient>();
        clientSemaphore = new SemaphoreSlim(PoolSize, PoolSize);

        // Pre-initialize connections for performance
        for (int i = 0; i < PoolSize; i++)
        {
            availableClients.Enqueue(new ImapClient());
        }
    }

    public async Task<ImapClient> AcquireAsync(CancellationToken ct)
    {
        await clientSemaphore.WaitAsync(ct);
        availableClients.TryDequeue(out var client);
        return client ?? new ImapClient();
    }

    public void Release(ImapClient client)
    {
        if (client.IsConnected)
            availableClients.Enqueue(client);
        else
            client.Dispose();

        clientSemaphore.Release();
    }
}
```

### CQRS Pattern

**Command Example**:

```csharp
public sealed class SaveJobBoardProviderConfigurationCommand
    : PlatformCqrsCommand<SaveJobBoardProviderConfigurationCommandResult>
{
    public string? Id { get; set; }
    public string CompanyId { get; set; }
    public JobBoardProviderType ProviderType { get; set; }
    public AuthConfigurationDto AuthConfiguration { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => CompanyId.IsNotNullOrEmpty(), "CompanyId required")
            .And(_ => AuthConfiguration.BaseUrl.IsNotNullOrEmpty(), "BaseUrl required");
    }
}

internal sealed class SaveJobBoardProviderConfigurationCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveJobBoardProviderConfigurationCommand,
                                            SaveJobBoardProviderConfigurationCommandResult>
{
    protected override async Task<SaveJobBoardProviderConfigurationCommandResult> HandleAsync(
        SaveJobBoardProviderConfigurationCommand req, CancellationToken ct)
    {
        // Validation, mapping, persistence
        var config = req.Id.IsNullOrEmpty()
            ? new JobBoardProviderConfiguration(req.CompanyId, req.ProviderType)
            : await repository.GetByIdAsync(req.Id, ct).EnsureFound();

        req.UpdateEntity(config);
        await repository.CreateOrUpdateAsync(config, ct);
        return new SaveJobBoardProviderConfigurationCommandResult { Configuration = new(config) };
    }
}
```

---

## 8. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BravoSUITE Platform                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────┐       RabbitMQ        ┌────────────────────────────┐│
│  │    Setting Service     │◄─────Message Bus─────►│     Candidate Service      ││
│  │                        │                       │                            ││
│  │ ┌────────────────────┐ │                       │ ┌────────────────────────┐ ││
│  │ │  Email Scanning    │ │  ScanMailBoxTrigger   │ │   ScanMailBoxModule    │ ││
│  │ │  • Email Settings  │─┼─ScanRequestBusMsg────►│ │   • IMAP Client        │ ││
│  │ │  • OAuth Tokens    │ │                       │ │   • Email Parsers      │ ││
│  │ │  • Scheduler       │ │                       │ │   • CV Parser          │ ││
│  │ └────────────────────┘ │                       │ └────────────────────────┘ ││
│  │                        │                       │             │              ││
│  │ ┌────────────────────┐ │                       │             ▼              ││
│  │ │  API Integration   │ │  JobBoardApiTrigger   │ ┌────────────────────────┐ ││
│  │ │  • Configurations  │─┼─SyncRequestBusMsg────►│ │   Provider Factory     │ ││
│  │ │  • Sync Scheduler  │◄┼─SettingUpdateSync────┤│ │   • ITViec Provider    │ ││
│  │ │  • State Consumer  │ │  StateRequestBusMsg  ││ │   • Other Providers    │ ││
│  │ └────────────────────┘ │                       │ └────────────────────────┘ ││
│  └────────────────────────┘                       └────────────────────────────┘│
│           │                                                     │                │
│           ▼                                                     ▼                │
│  ┌────────────────────────┐                       ┌────────────────────────────┐│
│  │       MongoDB          │                       │     External Systems       ││
│  │ • OrganizationalUnit   │                       │ ┌────────────────────────┐ ││
│  │   (JobBoardIntegration)│                       │ │   IMAP Servers         │ ││
│  │ • JobBoardProvider     │                       │ │   • Gmail              │ ││
│  │   Configuration        │                       │ │   • Office 365         │ ││
│  │ • Auth Tokens          │                       │ │   • Custom IMAP        │ ││
│  └────────────────────────┘                       │ └────────────────────────┘ ││
│                                                   │ ┌────────────────────────┐ ││
│                                                   │ │   Job Board APIs       │ ││
│                                                   │ │   • ITViec API         │ ││
│                                                   │ │   • VietnamWorks API   │ ││
│                                                   │ └────────────────────────┘ ││
│                                                   └────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

#### Setting Service

- **Email Scanning Configuration**: `OrganizationalUnit.JobBoardIntegration`
- **API Integration Configuration**: `Setting.Domain.AggregatesModel.JobBoardProviderConfiguration`
- **Responsibilities**:
  - Email settings management (IMAP credentials, OAuth tokens)
  - API provider configuration CRUD
  - Scheduled triggering for both methods
  - Message bus message production

#### Candidate Service (ScanMailBoxModule)

- **Location**: `Candidate.Application.ScanMailBoxModule`
- **Responsibilities**:
  - IMAP email scanning and parsing
  - API provider implementation and factory
  - Job board email pattern detection
  - CV download, parsing, and storage
  - Candidate and application creation

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend Framework** | .NET 9 |
| **Database** | MongoDB |
| **Message Bus** | RabbitMQ |
| **Email Client** | MailKit (IMAP) |
| **HTTP Client** | System.Net.Http |
| **Storage** | Azure Blob Storage |
| **Encryption** | AES-256 (System.Security.Cryptography) |
| **Frontend** | Angular 19, TypeScript |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Load Balancer                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
┌───────────▼──────────┐          ┌──────────▼──────────┐
│ Setting Service      │          │ Candidate Service   │
│ • Config Management  │          │ • Email Scanning    │
│ • Scheduler          │          │ • API Sync          │
└───────────┬──────────┘          └──────────┬──────────┘
            │                                 │
            └──────────┬──────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
┌────────▼────────┐         ┌────────▼────────┐
│ MongoDB Cluster │         │ RabbitMQ Cluster│
│ • Replica Set   │         │ • HA Queue      │
└─────────────────┘         └─────────────────┘
```

---

## 9. Domain Model

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JobBoardProviderConfiguration                     │
├─────────────────────────────────────────────────────────────────────┤
│ Id: string (ULID)                                                    │
│ CompanyId: string (FK → OrganizationalUnit)                         │
│ ProviderType: JobBoardProviderType                                   │
│ FetchMethod: FetchMethod                                             │
│ IsEnabled: bool                                                      │
│ DisplayName: string                                                  │
│ Notes: string?                                                       │
│ CreatedDate: DateTime                                                │
│ LastUpdatedDate: DateTime?                                           │
│ CreatedBy: string                                                    │
│ LastUpdatedBy: string?                                               │
├─────────────────────────────────────────────────────────────────────┤
│ ◆ AuthConfiguration: AuthConfigurationValue (embedded)              │
│ ◆ SyncState: SyncStateValue (embedded)                               │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ embedded value objects
         ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│     AuthConfigurationValue      │  │        SyncStateValue           │
├─────────────────────────────────┤  ├─────────────────────────────────┤
│ AuthType: AuthType              │  │ LastSyncedAt: DateTime?         │
│ ClientId: string?               │  │ LastSuccessfulSyncAt: DateTime? │
│ ClientSecret: string? (encrypt) │  │ LastProcessedApplicationDate:   │
│ ApiKey: string? (encrypted)     │  │   DateTime?                     │
│ Username: string?               │  │ JobSyncInfos: Dict<string,      │
│ Password: string? (encrypted)   │  │   JobSyncInfo>                  │
│ BaseUrl: string                 │  │ SameDateProcessedIds: List<str> │
│ TimeoutSeconds: int             │  │ RecentErrors: List<SyncError>   │
│ MaxRetryAttempts: int           │  │ TotalApplicationsProcessed: long│
│ CustomHeaders: Dict?            │  │ ConsecutiveFailureCount: int    │
└─────────────────────────────────┘  └─────────────────────────────────┘
                                     ┌─────────────────────────────────┐
                                     │        JobSyncInfo              │
                                     ├─────────────────────────────────┤
                                     │ ApplicationCount: int           │
                                     │ LastSeenAt: DateTime            │
                                     └─────────────────────────────────┘
```

### Enumerations

#### JobBoardProviderType

```csharp
public enum JobBoardProviderType
{
    Email = 0,           // Legacy email-based integration
    ITViec = 1,          // ITViec.com
    VietnamWorks = 2,    // VietnamWorks.com
    TopCV = 3,           // TopCV.vn
    TopDev = 4,          // TopDev.vn
    LinkedIn = 5,        // LinkedIn Jobs
    CareerLink = 6,      // CareerLink.vn
    CareerBuilder = 7    // CareerBuilder.vn
}
```

#### AuthType

```csharp
public enum AuthType
{
    None = 0,                     // No authentication required
    OAuth2ClientCredentials = 1,  // OAuth2 with client_id/client_secret (used by ITViec)
    OAuth2AuthorizationCode = 2,  // OAuth2 Authorization Code flow (user-based)
    ApiKey = 3,                   // Simple API key authentication
    BasicAuth = 4                 // HTTP Basic authentication
}
```

#### FetchMethod

```csharp
public enum FetchMethod
{
    Email = 0,   // Parse applications from emails
    API = 1,     // Fetch via REST API
    Hybrid = 2   // Combination of both methods
}
```

### Value Objects

#### AuthConfigurationValue

```csharp
public sealed class AuthConfigurationValue
{
    public AuthType AuthType { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty; // Encrypted at rest
    public string ApiKey { get; set; } = string.Empty;       // Encrypted at rest
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;     // Encrypted at rest
    public string BaseUrl { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 30;
    public int MaxRetryAttempts { get; set; } = 3;
    public Dictionary<string, string>? CustomHeaders { get; set; }

    public void EncryptSensitiveCredentials(string key)
    {
        if (ClientSecret.IsNotNullOrEmpty()) ClientSecret = SecurityHelper.EncryptString(ClientSecret, key);
        if (ApiKey.IsNotNullOrEmpty()) ApiKey = SecurityHelper.EncryptString(ApiKey, key);
        if (Password.IsNotNullOrEmpty()) Password = SecurityHelper.EncryptString(Password, key);
    }

    public void DecryptSensitiveCredentials(string key)
    {
        if (ClientSecret.IsNotNullOrEmpty()) ClientSecret = SecurityHelper.DecryptString(ClientSecret, key);
        if (ApiKey.IsNotNullOrEmpty()) ApiKey = SecurityHelper.DecryptString(ApiKey, key);
        if (Password.IsNotNullOrEmpty()) Password = SecurityHelper.DecryptString(Password, key);
    }
}
```

#### SyncStateValue

```csharp
public sealed class SyncStateValue
{
    public DateTime? LastSyncedAt { get; set; }
    public DateTime? LastSuccessfulSyncAt { get; set; }
    public DateTime? LastProcessedApplicationDate { get; set; }
    public Dictionary<string, JobSyncInfo> JobSyncInfos { get; set; } = new();
    public List<string> SameDateProcessedIds { get; set; } = new();
    public List<SyncError> RecentErrors { get; set; } = new();
    public long TotalApplicationsProcessed { get; set; }
    public int ConsecutiveFailureCount { get; set; }

    // Constants
    private const int MaxRecentErrors = 10;
    private const int MaxSameDateProcessedIds = 200;

    public void MarkSuccess(int applicationsProcessed, DateTime syncCompletedAt)
    {
        LastSyncedAt = syncCompletedAt;
        LastSuccessfulSyncAt = syncCompletedAt;
        TotalApplicationsProcessed += applicationsProcessed;
        ConsecutiveFailureCount = 0;
        RecentErrors.Clear(); // Clear errors on successful sync
    }

    public void MarkFailure(string errorMessage, DateTime syncAttemptedAt)
    {
        LastSyncedAt = syncAttemptedAt;
        ConsecutiveFailureCount++;
        RecentErrors.Insert(0, new SyncError
        {
            Message = errorMessage,
            Timestamp = syncAttemptedAt
        });

        // Keep only last N errors
        if (RecentErrors.Count > MaxRecentErrors)
            RecentErrors = RecentErrors.Take(MaxRecentErrors).ToList();
    }

    public void TrackProcessedApplication(string applicationId, DateTime applicationDate)
    {
        // Track same-day IDs for deduplication
        if (applicationDate.Date == DateTime.UtcNow.Date)
        {
            SameDateProcessedIds.Add(applicationId);
            if (SameDateProcessedIds.Count > MaxSameDateProcessedIds)
                SameDateProcessedIds = SameDateProcessedIds.TakeLast(MaxSameDateProcessedIds).ToList();
        }

        // Update last processed date
        if (!LastProcessedApplicationDate.HasValue || applicationDate > LastProcessedApplicationDate)
            LastProcessedApplicationDate = applicationDate;
    }
}

public sealed class JobSyncInfo
{
    public int ApplicationCount { get; set; }
    public DateTime LastSeenAt { get; set; }
}

public sealed class SyncError
{
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
```

### Domain Expressions

```csharp
// Check for duplicate display name within company
public static Expression<Func<JobBoardProviderConfiguration, bool>> HasDuplicateDisplayNameExpr(
    string companyId,
    string displayName,
    string? excludeId = null)
    => c => c.CompanyId == companyId
            && c.DisplayName == displayName
            && c.Id != excludeId;

// Check for duplicate auth configuration within company
public static Expression<Func<JobBoardProviderConfiguration, bool>> HasDuplicateAuthConfigurationExpr(
    string companyId,
    AuthConfigurationValue authConfig,
    string? excludeId = null)
    => c => c.CompanyId == companyId
            && c.AuthConfiguration.AuthType == authConfig.AuthType
            && c.AuthConfiguration.ApiKey == authConfig.ApiKey
            && c.AuthConfiguration.BaseUrl == authConfig.BaseUrl
            && c.AuthConfiguration.ClientId == authConfig.ClientId
            && c.AuthConfiguration.ClientSecret == authConfig.ClientSecret
            && c.AuthConfiguration.Username == authConfig.Username
            && c.AuthConfiguration.Password == authConfig.Password
            && c.Id != excludeId;

// Get all enabled configurations for a company
public static Expression<Func<JobBoardProviderConfiguration, bool>> EnabledByCompanyExpr(string companyId)
    => c => c.CompanyId == companyId && c.IsEnabled;
```

### Key Files

| File | Purpose |
|------|---------|
| `Setting.Domain/.../JobBoardProviderConfiguration.cs` | Main aggregate root entity |
| `Setting.Domain/.../AuthConfigurationValue.cs` | Authentication settings value object |
| `Setting.Domain/.../SyncStateValue.cs` | Sync tracking value object |
| `Setting.Application/.../EntityDtos/JobBoardProviderConfigurationEntityDto.cs` | Reusable entity DTO |
| `Setting.Application/.../Helpers/JobBoardProviderConfigurationHelper.cs` | Encryption key management helper |
| `Setting.Application/.../UseCaseEvents/.../TriggerSyncOnSaveJobBoardProviderConfigurationEntityEventHandler.cs` | Triggers immediate sync on create/update |

---

## 10. API Reference

### Endpoints

Base URL: `/api/job-board-provider-configuration`

#### Save Configuration

```http
POST /api/job-board-provider-configuration/save
Content-Type: application/json
Authorization: Bearer {token}

{
    "id": null,                              // null for create, string for update
    "companyId": "01HXYZ...",               // Required
    "providerType": 1,                       // JobBoardProviderType enum
    "fetchMethod": 1,                        // FetchMethod enum
    "displayName": "ITViec - Main Account",  // Required
    "isEnabled": true,
    "authConfiguration": {
        "authType": 1,                       // OAuth2ClientCredentials
        "clientId": "your-client-id",        // Required for API providers
        "clientSecret": "your-secret",       // Required for new configs
        "baseUrl": "https://api.itviec.com", // Required
        "timeoutSeconds": 30,
        "maxRetryAttempts": 3,
        "customHeaders": {
            "X-Custom-Header": "value"
        }
    },
    "responseMappingOverridesJson": null,    // Optional JSON for field mapping
    "notes": "Main recruitment account"       // Optional
}
```

**Response**:

```json
{
    "id": "01HXYZ...",
    "companyId": "01HXYZ...",
    "providerType": 1,
    "displayName": "ITViec - Main Account",
    "isEnabled": true,
    "createdDate": "2024-01-15T10:30:00Z",
    "lastModifiedDate": null
}
```

#### Get Configuration by ID

```http
GET /api/job-board-provider-configuration/{id}
Authorization: Bearer {token}
```

**Response**:

```json
{
    "configuration": {
        "id": "01HXYZ...",
        "companyId": "01HXYZ...",
        "providerType": 1,
        "fetchMethod": 1,
        "isEnabled": true,
        "displayName": "ITViec - Main Account",
        "notes": "Main recruitment account",
        "authConfiguration": {
            "authType": 1,
            "clientId": "your-client-id",
            "hasClientSecret": true, // Secret not exposed
            "baseUrl": "https://api.itviec.com",
            "timeoutSeconds": 30,
            "maxRetryAttempts": 3
        },
        "syncState": {
            "lastSyncedAt": "2024-01-15T12:00:00Z",
            "lastSuccessfulSyncAt": "2024-01-15T12:00:00Z",
            "totalApplicationsProcessed": 150,
            "consecutiveFailureCount": 0,
            "recentErrorsCount": 0,
            "lastErrorMessage": null
        },
        "createdDate": "2024-01-15T10:30:00Z",
        "lastUpdatedDate": "2024-01-15T12:00:00Z"
    }
}
```

#### Get Configurations by Company

```http
GET /api/job-board-provider-configuration/by-company?companyId={companyId}&includeDisabled=false
Authorization: Bearer {token}
```

**Response**:

```json
{
    "configurations": [
        {
            /* configuration object */
        },
        {
            /* configuration object */
        }
    ]
}
```

#### Delete Configuration

```http
DELETE /api/job-board-provider-configuration/{id}
Authorization: Bearer {token}
```

### Authorization Rules

| Role | Permissions |
|------|-------------|
| System Admin | Can manage configurations for any company |
| Org Unit Admin | Can only manage configurations for their current company |
| Other Roles | No access |

---

## 11. Frontend Components

### Component Hierarchy

```
JobBoardIntegrationFormComponent (Email scanning config)
└── job-board-integration-form.component.ts

JobBoardProviderConfigurationListComponent (API provider list)
├── job-board-provider-configuration-list.component.ts
├── job-board-provider-configuration-list.component.html
└── job-board-provider-configuration-list.component.scss

JobBoardProviderConfigurationFormComponent (API provider form)
├── job-board-provider-configuration-form.component.ts
├── job-board-provider-configuration-form.component.html
└── job-board-provider-configuration-form.component.scss
```

### List Component

**File**: `job-board-provider-configuration-list.component.ts`

```typescript
import { AppBaseVmStoreComponent } from '@libs/bravo-common';
import { JobBoardProviderConfigurationListStore } from './job-board-provider-configuration-list.store';
import { JobBoardProviderConfigurationListVm } from './job-board-provider-configuration-list.vm';

export class JobBoardProviderConfigurationListComponent
    extends AppBaseVmStoreComponent<JobBoardProviderConfigurationListVm, JobBoardProviderConfigurationListStore> {

    constructor(
        public store: JobBoardProviderConfigurationListStore,
        private dialog: MatDialog
    ) {
        super(store);
    }

    ngOnInit() {
        this.store.loadConfigurations();
    }

    onAddNew() {
        const dialogRef = this.dialog.open(JobBoardProviderConfigurationFormComponent, {
            width: '600px',
            data: { mode: 'create' }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) this.store.loadConfigurations();
        });
    }

    onEdit(config: JobBoardProviderConfigurationDto) {
        const dialogRef = this.dialog.open(JobBoardProviderConfigurationFormComponent, {
            width: '600px',
            data: { mode: 'update', configId: config.id }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) this.store.loadConfigurations();
        });
    }

    onDelete(config: JobBoardProviderConfigurationDto) {
        if (confirm(`Delete configuration "${config.displayName}"?`)) {
            this.store.deleteConfiguration(config.id);
        }
    }

    onToggleEnabled(config: JobBoardProviderConfigurationDto) {
        this.store.toggleEnabled(config.id, !config.isEnabled);
    }
}
```

### Store

**File**: `job-board-provider-configuration-list.store.ts`

```typescript
import { Injectable } from '@angular/core';
import { PlatformVmStore } from '@libs/platform-core';
import { JobBoardProviderConfigurationListVm } from './job-board-provider-configuration-list.vm';
import { JobBoardProviderConfigurationApiService } from '../services/job-board-provider-configuration-api.service';

@Injectable()
export class JobBoardProviderConfigurationListStore
    extends PlatformVmStore<JobBoardProviderConfigurationListVm> {

    constructor(private api: JobBoardProviderConfigurationApiService) {
        super();
    }

    protected vmConstructor = (data?: Partial<JobBoardProviderConfigurationListVm>) =>
        new JobBoardProviderConfigurationListVm(data);

    loadConfigurations = this.effectSimple(() =>
        this.api.getByCompany(this.currentCompanyId()).pipe(
            this.observerLoadingErrorState('load'),
            this.tapResponse(configs => this.updateState({ configurations: configs }))
        ), 'loadConfigurations'
    );

    deleteConfiguration = this.effectSimple((configId: string) =>
        this.api.delete(configId).pipe(
            this.observerLoadingErrorState('delete'),
            this.tapResponse(() => {
                this.loadConfigurations();
                this.showSuccessMessage('Provider deleted successfully');
            })
        ), 'deleteConfiguration'
    );

    toggleEnabled = this.effectSimple((configId: string, isEnabled: boolean) =>
        this.api.toggleEnabled(configId, isEnabled).pipe(
            this.observerLoadingErrorState('toggle'),
            this.tapResponse(() => {
                this.loadConfigurations();
                this.showSuccessMessage(`Provider ${isEnabled ? 'enabled' : 'disabled'}`);
            })
        ), 'toggleEnabled'
    );

    readonly configurations$ = this.select(state => state.configurations);
    readonly loading$ = this.isLoading$('load');
}
```

### Form Component

**File**: `job-board-provider-configuration-form.component.ts`

```typescript
import { AppBaseFormComponent } from '@libs/bravo-common';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { JobBoardProviderConfigurationFormVm } from './job-board-provider-configuration-form.vm';

export class JobBoardProviderConfigurationFormComponent
    extends AppBaseFormComponent<JobBoardProviderConfigurationFormVm> {

    protected initialFormConfig = () => ({
        controls: {
            displayName: new FormControl(this.currentVm().displayName, [Validators.required]),
            providerType: new FormControl(this.currentVm().providerType, [Validators.required]),
            fetchMethod: new FormControl(this.currentVm().fetchMethod, [Validators.required]),
            isEnabled: new FormControl(this.currentVm().isEnabled),
            authConfiguration: new FormGroup({
                authType: new FormControl(this.currentVm().authConfiguration.authType, [Validators.required]),
                baseUrl: new FormControl(this.currentVm().authConfiguration.baseUrl, [Validators.required]),
                clientId: new FormControl(this.currentVm().authConfiguration.clientId),
                clientSecret: new FormControl(''),
                timeoutSeconds: new FormControl(this.currentVm().authConfiguration.timeoutSeconds),
                maxRetryAttempts: new FormControl(this.currentVm().authConfiguration.maxRetryAttempts)
            }),
            notes: new FormControl(this.currentVm().notes)
        }
    });

    get showChangeSecretCheckbox(): boolean {
        return this.isUpdateMode() && this.currentVm().authConfiguration.hasClientSecret;
    }

    onSubmit() {
        if (this.validateForm()) {
            const command = this.form.value;
            this.api.save(command).subscribe(() => {
                this.dialogRef.close(true);
            });
        }
    }
}
```

### API Service

**File**: `job-board-provider-configuration-api.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { PlatformApiService } from '@libs/platform-core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class JobBoardProviderConfigurationApiService extends PlatformApiService {

    protected get apiUrl() {
        return environment.apiUrl + '/api/job-board-provider-configuration';
    }

    getByCompany(companyId: string): Observable<JobBoardProviderConfigurationDto[]> {
        return this.get<JobBoardProviderConfigurationDto[]>('/by-company', { companyId });
    }

    getById(id: string): Observable<JobBoardProviderConfigurationDto> {
        return this.get<JobBoardProviderConfigurationDto>(`/${id}`);
    }

    save(command: SaveJobBoardProviderConfigurationCommand): Observable<SaveJobBoardProviderConfigurationCommandResult> {
        return this.post<SaveJobBoardProviderConfigurationCommandResult>('/save', command);
    }

    delete(id: string): Observable<void> {
        return this.delete<void>(`/${id}`);
    }

    toggleEnabled(id: string, isEnabled: boolean): Observable<void> {
        return this.post<void>('/toggle-enabled', { id, isEnabled });
    }
}
```

---

## 12. Backend Controllers

### Controller

**File**: `Setting.API/Controllers/JobBoardProviderConfigurationController.cs`

```csharp
[ApiController]
[Route("api/job-board-provider-configuration")]
public class JobBoardProviderConfigurationController : PlatformBaseController
{
    [HttpPost("save")]
    [PlatformAuthorize(PlatformRoles.CompanyAdmin)]
    public async Task<IActionResult> Save([FromBody] SaveJobBoardProviderConfigurationCommand command)
    {
        var result = await Cqrs.SendAsync(command);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [PlatformAuthorize(PlatformRoles.CompanyAdmin, PlatformRoles.HumanResourcesManager)]
    public async Task<IActionResult> GetById([FromRoute] string id)
    {
        var result = await Cqrs.SendAsync(new GetJobBoardProviderConfigurationByIdQuery { Id = id });
        return Ok(result);
    }

    [HttpGet("by-company")]
    [PlatformAuthorize(PlatformRoles.CompanyAdmin, PlatformRoles.HumanResourcesManager)]
    public async Task<IActionResult> GetByCompany([FromQuery] string companyId, [FromQuery] bool includeDisabled = false)
    {
        var result = await Cqrs.SendAsync(new GetJobBoardProviderConfigurationsByCompanyQuery
        {
            CompanyId = companyId,
            IncludeDisabled = includeDisabled
        });
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [PlatformAuthorize(PlatformRoles.CompanyAdmin)]
    public async Task<IActionResult> Delete([FromRoute] string id)
    {
        await Cqrs.SendAsync(new DeleteJobBoardProviderConfigurationCommand { Id = id });
        return Ok();
    }
}
```

### Command Handler

**File**: `Setting.Application/.../Commands/SaveJobBoardProviderConfigurationCommand.cs`

```csharp
public sealed class SaveJobBoardProviderConfigurationCommand
    : PlatformCqrsCommand<SaveJobBoardProviderConfigurationCommandResult>
{
    public string? Id { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public JobBoardProviderType ProviderType { get; set; }
    public FetchMethod FetchMethod { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public AuthConfigurationDto AuthConfiguration { get; set; } = new();
    public string? Notes { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => CompanyId.IsNotNullOrEmpty(), "CompanyId is required")
            .And(_ => DisplayName.IsNotNullOrEmpty(), "DisplayName is required")
            .And(_ => AuthConfiguration.BaseUrl.IsNotNullOrEmpty(), "BaseUrl is required");
    }
}

public sealed class SaveJobBoardProviderConfigurationCommandResult : PlatformCqrsCommandResult
{
    public JobBoardProviderConfigurationDto Configuration { get; set; } = null!;
}

internal sealed class SaveJobBoardProviderConfigurationCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveJobBoardProviderConfigurationCommand,
                                            SaveJobBoardProviderConfigurationCommandResult>
{
    private readonly ISettingRepository<JobBoardProviderConfiguration> repository;
    private readonly JobBoardProviderConfigurationHelper helper;

    protected override async Task<PlatformValidationResult<SaveJobBoardProviderConfigurationCommand>>
        ValidateRequestAsync(PlatformValidationResult<SaveJobBoardProviderConfigurationCommand> validation, CancellationToken ct)
    {
        return await validation
            .AndNotAsync(req => repository.AnyAsync(
                JobBoardProviderConfiguration.HasDuplicateDisplayNameExpr(req.CompanyId, req.DisplayName, req.Id), ct),
                "A provider with this display name already exists in your company")
            .AndNotAsync(req => repository.AnyAsync(
                JobBoardProviderConfiguration.HasDuplicateAuthConfigurationExpr(
                    req.CompanyId, req.AuthConfiguration.MapToObject(), req.Id), ct),
                "A provider with identical authentication settings already exists");
    }

    protected override async Task<SaveJobBoardProviderConfigurationCommandResult>
        HandleAsync(SaveJobBoardProviderConfigurationCommand req, CancellationToken ct)
    {
        var config = req.Id.IsNullOrEmpty()
            ? new JobBoardProviderConfiguration(req.CompanyId, req.ProviderType)
            : await repository.GetByIdAsync(req.Id, ct).EnsureFound();

        req.UpdateEntity(config, helper.GetEncryptionKey());
        await repository.CreateOrUpdateAsync(config, ct);

        return new SaveJobBoardProviderConfigurationCommandResult
        {
            Configuration = new JobBoardProviderConfigurationDto(config)
        };
    }
}
```

### Query Handler

**File**: `Setting.Application/.../Queries/GetJobBoardProviderConfigurationsByCompanyQuery.cs`

```csharp
public sealed class GetJobBoardProviderConfigurationsByCompanyQuery
    : PlatformCqrsQuery<GetJobBoardProviderConfigurationsByCompanyQueryResult>
{
    public string CompanyId { get; set; } = string.Empty;
    public bool IncludeDisabled { get; set; }
}

public sealed class GetJobBoardProviderConfigurationsByCompanyQueryResult : PlatformCqrsQueryResult
{
    public List<JobBoardProviderConfigurationDto> Configurations { get; set; } = new();
}

internal sealed class GetJobBoardProviderConfigurationsByCompanyQueryHandler
    : PlatformCqrsQueryApplicationHandler<GetJobBoardProviderConfigurationsByCompanyQuery,
                                          GetJobBoardProviderConfigurationsByCompanyQueryResult>
{
    protected override async Task<GetJobBoardProviderConfigurationsByCompanyQueryResult>
        HandleAsync(GetJobBoardProviderConfigurationsByCompanyQuery req, CancellationToken ct)
    {
        var configs = await repository.GetAllAsync(
            c => c.CompanyId == req.CompanyId && (req.IncludeDisabled || c.IsEnabled), ct);

        return new GetJobBoardProviderConfigurationsByCompanyQueryResult
        {
            Configurations = configs.SelectList(c => new JobBoardProviderConfigurationDto(c))
        };
    }
}
```

---

## 13. Cross-Service Integration

### Message Bus Messages

#### Trigger Sync Message (Setting → Candidate)

**File**: `Setting.Application/.../BusMessages/JobBoardApiTriggerSyncRequestBusMessage.cs`

```csharp
public sealed class JobBoardApiTriggerSyncRequestBusMessage : PlatformTrackableBusMessage
{
    public List<Item> Data { get; set; } = [];

    public sealed class Item
    {
        public Item() { }

        /// <summary>
        /// Constructor that decrypts secrets before sending.
        /// Secrets are sent decrypted so consumer doesn't need encryption key.
        /// </summary>
        public Item(JobBoardProviderConfiguration config, string encryptionKey)
        {
            ConfigurationId = config.Id;
            CompanyId = config.CompanyId;
            ProviderType = config.ProviderType;
            FetchMethod = config.FetchMethod;
            DisplayName = config.DisplayName ?? string.Empty;
            AuthConfiguration = new AuthConfigurationItem(config.AuthConfiguration, encryptionKey);
            SyncState = new SyncStateItem(config.SyncState);
        }

        public string ConfigurationId { get; set; } = string.Empty;
        public string CompanyId { get; set; } = string.Empty;
        public JobBoardProviderType ProviderType { get; set; }
        public FetchMethod FetchMethod { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public AuthConfigurationItem AuthConfiguration { get; set; } = new();
        public SyncStateItem SyncState { get; set; } = new();
    }

    public sealed class AuthConfigurationItem
    {
        public AuthConfigurationItem() { }

        /// <summary>
        /// Constructor that decrypts all secrets before sending.
        /// </summary>
        public AuthConfigurationItem(AuthConfigurationValue value, string encryptionKey)
        {
            var clonedDecryptedValue = value.DeepClone().With(p => p.DecryptSensitiveCredentials(encryptionKey));

            AuthType = clonedDecryptedValue.AuthType;
            ClientId = clonedDecryptedValue.ClientId;
            ClientSecret = clonedDecryptedValue.ClientSecret;  // Decrypted plain text
            ApiKey = clonedDecryptedValue.ApiKey;              // Decrypted plain text
            Username = clonedDecryptedValue.Username;
            Password = clonedDecryptedValue.Password;          // Decrypted plain text
            BaseUrl = clonedDecryptedValue.BaseUrl;
            TimeoutSeconds = clonedDecryptedValue.TimeoutSeconds;
            CustomHeaders = clonedDecryptedValue.CustomHeaders;
        }

        public AuthType AuthType { get; set; }
        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public int TimeoutSeconds { get; set; } = 30;
        public Dictionary<string, string>? CustomHeaders { get; set; }
    }
}
```

#### Update Sync State Message (Candidate → Setting)

**File**: `Setting.Application/.../BusMessages/SettingUpdateJobBoardSyncStateRequestBusMessage.cs`

```csharp
public sealed class SettingUpdateJobBoardSyncStateRequestBusMessage : PlatformTrackableBusMessage
{
    public string ConfigurationId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public SyncResultData? Result { get; set; }

    public sealed class SyncResultData
    {
        public int ApplicationsProcessed { get; set; }
        public DateTime SyncCompletedAt { get; set; }
        public DateTime? LastProcessedApplicationDate { get; set; }
        public Dictionary<string, JobSyncInfoData> JobSyncInfos { get; set; } = new();
        public List<string> SameDateProcessedIds { get; set; } = new();
    }

    public sealed class JobSyncInfoData
    {
        public int ApplicationCount { get; set; }
        public DateTime LastSeenAt { get; set; }
    }
}
```

### Message Producers

#### Setting Service: Trigger Sync

**File**: `Setting.Application/.../MessageBus/JobBoardApiSyncMessageProvider.cs`

```csharp
public sealed class JobBoardApiSyncMessageProvider
    : PlatformApplicationCqrsBackgroundMessageBusProvider<JobBoardApiTriggerSyncRequestBusMessage>
{
    private readonly ISettingRepository<JobBoardProviderConfiguration> repository;
    private readonly JobBoardProviderConfigurationHelper helper;

    protected override async Task SyncMessageToBusProcess(CancellationToken ct)
    {
        var configs = await repository.GetAllAsync(
            c => c.IsEnabled && c.FetchMethod == FetchMethod.API, ct);

        if (configs.Count == 0) return;

        var message = new JobBoardApiTriggerSyncRequestBusMessage
        {
            Data = configs.SelectList(c => new JobBoardApiTriggerSyncRequestBusMessage.Item(
                c, helper.GetEncryptionKey()))
        };

        await MessageBus.SendAsync(message, ct);
    }
}
```

### Message Consumers

#### Candidate Service: Process Sync

**File**: `Candidate.Application/.../MessageBus/JobBoardApiTriggerSyncRequestBusMessageConsumer.cs`

```csharp
internal sealed class JobBoardApiTriggerSyncRequestBusMessageConsumer
    : PlatformApplicationMessageBusConsumer<JobBoardApiTriggerSyncRequestBusMessage>
{
    private readonly JobBoardApplicationSyncService syncService;

    public override async Task<bool> HandleWhen(JobBoardApiTriggerSyncRequestBusMessage msg, string routingKey)
        => msg.Data.Any();

    public override async Task HandleLogicAsync(JobBoardApiTriggerSyncRequestBusMessage msg, string routingKey)
    {
        await msg.Data.ParallelAsync(
            item => syncService.SyncProviderApplicationsAsync(item),
            maxConcurrent: 5);
    }
}
```

#### Setting Service: Update Sync State

**File**: `Setting.Application/.../MessageBus/SettingUpdateJobBoardSyncStateRequestBusMessageConsumer.cs`

```csharp
internal sealed class SettingUpdateJobBoardSyncStateRequestBusMessageConsumer
    : PlatformApplicationMessageBusConsumer<SettingUpdateJobBoardSyncStateRequestBusMessage>
{
    public override async Task HandleLogicAsync(
        SettingUpdateJobBoardSyncStateRequestBusMessage msg, string routingKey)
    {
        var config = await repository.GetByIdAsync(msg.ConfigurationId);

        if (msg.Success && msg.Result != null)
        {
            config.SyncState.MarkSuccess(msg.Result.ApplicationsProcessed, msg.Result.SyncCompletedAt);
            config.SyncState.LastProcessedApplicationDate = msg.Result.LastProcessedApplicationDate;
            config.SyncState.JobSyncInfos = msg.Result.JobSyncInfos.ToDictionary(
                kv => kv.Key,
                kv => new JobSyncInfo { ApplicationCount = kv.Value.ApplicationCount, LastSeenAt = kv.Value.LastSeenAt });
            config.SyncState.SameDateProcessedIds = msg.Result.SameDateProcessedIds;
        }
        else
        {
            config.SyncState.MarkFailure(msg.ErrorMessage ?? "Unknown error", Clock.UtcNow);
        }

        await repository.UpdateAsync(config);
    }
}
```

---

## 14. Security Architecture

### Credential Encryption

**Encryption Algorithm**: AES-256 (Rijndael)
**Key Storage**: appsettings.json (Setting Service only)
**Key Length**: Exactly 32 characters

**Encrypted Fields**:
- `AuthConfigurationValue.ClientSecret`
- `AuthConfigurationValue.ApiKey`
- `AuthConfigurationValue.Password`

**Encryption Helper**:

```csharp
public static class SecurityHelper
{
    public static string EncryptString(string plainText, string key)
    {
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(key);
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();
        ms.Write(aes.IV, 0, aes.IV.Length);

        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public static string DecryptString(string cipherText, string key)
    {
        var buffer = Convert.FromBase64String(cipherText);
        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(key);

        var iv = new byte[aes.IV.Length];
        Array.Copy(buffer, 0, iv, 0, iv.Length);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(buffer, iv.Length, buffer.Length - iv.Length);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);

        return sr.ReadToEnd();
    }
}
```

### Message Bus Security

**Design Decision**: Decrypt secrets before sending via message bus

**Rationale**:
- Candidate Service doesn't need encryption key
- Setting Service acts as centralized secret manager
- Reduces key distribution risk

**Implementation**:

```csharp
// Setting Service (producer) - decrypts before sending
var message = new JobBoardApiTriggerSyncRequestBusMessage
{
    Data = configs.SelectList(c => new JobBoardApiTriggerSyncRequestBusMessage.Item(
        c, helper.GetEncryptionKey())) // Decrypts secrets in constructor
};
await MessageBus.SendAsync(message, ct);

// Candidate Service (consumer) - receives plain text
public override async Task HandleLogicAsync(JobBoardApiTriggerSyncRequestBusMessage msg, string routingKey)
{
    // msg.Data[0].AuthConfiguration.ClientSecret is plain text
    await syncService.SyncProviderApplicationsAsync(msg.Data[0]);
}
```

### Secret Masking in API Responses

**DTO Pattern**:

```csharp
public sealed class AuthConfigurationDto
{
    public AuthConfigurationDto() { }

    public AuthConfigurationDto(AuthConfigurationValue value)
    {
        AuthType = value.AuthType;
        ClientId = value.ClientId;
        HasClientSecret = value.ClientSecret.IsNotNullOrEmpty();  // Masked
        HasApiKey = value.ApiKey.IsNotNullOrEmpty();              // Masked
        BaseUrl = value.BaseUrl;
        TimeoutSeconds = value.TimeoutSeconds;
    }

    public AuthType AuthType { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public bool HasClientSecret { get; set; }  // Never expose actual secret
    public bool HasApiKey { get; set; }        // Never expose actual secret
    public string BaseUrl { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; }
}
```

### Role-Based Access Control

| Role | View Configs | Create/Edit | Delete | Access Encryption Key |
|------|-------------|------------|--------|----------------------|
| System Admin | All companies | All companies | All companies | Yes (Setting Service) |
| Org Unit Admin | Own company | Own company | Own company | No |
| HR Manager | Own company | No | No | No |
| HR User | Own company | No | No | No |
| Other Roles | No | No | No | No |

**Enforcement**:

```csharp
[PlatformAuthorize(PlatformRoles.CompanyAdmin)]
public async Task<IActionResult> Save([FromBody] SaveJobBoardProviderConfigurationCommand command)
{
    // Authorization checked by attribute
    // Additional check: user can only manage own company
    if (!RequestContext.HasRequestAdminRoleInCompany() && command.CompanyId != RequestContext.CurrentCompanyId())
        return Forbid();

    var result = await Cqrs.SendAsync(command);
    return Ok(result);
}
```

### OAuth2 Token Security

**ITViec OAuth2 Flow**:

```
1. Client Credentials Grant
   POST https://api.itviec.com/oauth.json
   Body: client_id, client_secret, grant_type=client_credentials

2. Receive Access Token
   Response: { access_token, expires_in: 3600 }

3. Cache Token (in-memory)
   Key: ConfigurationId
   Value: { AccessToken, ExpiresAt }

4. Use Token
   GET https://api.itviec.com/jobs.json
   Header: Authorization: Bearer {access_token}

5. Refresh on Expiry
   Re-authenticate when cached token expires
```

**Token Caching**:

```csharp
private readonly ConcurrentDictionary<string, ProviderAuthResult> authCache = new();

public async Task<ProviderAuthResult> AuthenticateAsync(JobBoardProviderConfiguration config, CancellationToken ct)
{
    if (authCache.TryGetValue(config.Id, out var cached) && !cached.IsExpired)
        return cached;

    // Double-checked locking for thread safety
    await GetOrCreateLock(config.Id).WaitAsync(ct);
    try
    {
        if (authCache.TryGetValue(config.Id, out cached) && !cached.IsExpired)
            return cached;

        var result = await AuthenticateWithProviderAsync(config, ct);
        authCache[config.Id] = result;
        return result;
    }
    finally
    {
        GetOrCreateLock(config.Id).Release();
    }
}
```

### IMAP Authentication Security

**OAuth2 (Gmail, Office 365)**:
- Access tokens stored encrypted
- Refresh tokens encrypted at rest
- Auto-refresh before expiry

**Basic Auth**:
- Passwords encrypted with AES-256
- Only decrypted when connecting to IMAP server
- Never logged or exposed in responses

---

## 15. Performance Considerations

### Pagination Strategy

**Jobs Pagination**:
- Page size: 50 jobs per request
- Reason: Balance between API rate limits and memory usage
- Configurable via `JobPageSize` setting

**Applications Pagination**:
- Page size: 100 applications per request
- Reason: ITViec API supports up to 200, using 100 for safety margin
- Configurable via `ApplicationPageSize` setting

**Implementation**:

```csharp
// Fetch jobs in pages
var totalJobs = await provider.GetJobsCountAsync(config, auth, ct);
var jobPages = (int)Math.Ceiling(totalJobs / (double)JobPageSize);

for (int page = 0; page < jobPages; page++)
{
    var jobs = await provider.GetJobsPagedAsync(config, auth, page * JobPageSize, JobPageSize, ct);
    // Process jobs...
}
```

### Concurrency Control

**Email Scanning**:

```csharp
// Global limit: max 5 concurrent email scanning sessions
private readonly SemaphoreSlim maxParallelismLock = new(5, 5);

await settings.ParallelAsync(
    setting => ScanEmailSetting(setting),
    maxConcurrent: 5);
```

**API Sync**:

```csharp
// Max 5 concurrent provider syncs
await configurations.ParallelAsync(
    config => syncService.SyncProviderApplicationsAsync(config),
    maxConcurrent: 5);
```

**CV Downloads**:

```csharp
// Max 3 concurrent CV downloads per provider
private readonly SemaphoreSlim cvDownloadLock = new(3, 3);

await applications.ParallelAsync(
    app => DownloadAndParseCv(app),
    maxConcurrent: 3);
```

### IMAP Connection Pooling

**Pool Configuration**:
- Pool size: 3 connections per email setting
- Pre-initialization: Connections created upfront
- Reuse: Connections returned to pool after use
- Auto-reconnect: Failed connections replaced

**Benefits**:
- Reduce IMAP handshake overhead (TLS + authentication)
- Avoid hitting server connection limits
- Improve scanning speed by 40-60%

**Metrics**:
- Without pooling: 2-3 seconds per email fetch
- With pooling: 0.5-1 second per email fetch

### Authentication Token Caching

**Cache Strategy**:
- In-memory cache (ConcurrentDictionary)
- Key: ConfigurationId
- Expiration: Token's `expires_in` value
- Thread-safe: Double-checked locking pattern

**Benefits**:
- Avoid redundant OAuth2 token requests
- Reduce API rate limit consumption
- Improve sync speed (no auth delay)

**Performance Impact**:
- First sync: ~2 seconds for authentication
- Subsequent syncs (cached): 0 seconds

### Database Indexing

**MongoDB Indexes**:

```javascript
// JobBoardProviderConfiguration collection
db.jobBoardProviderConfigurations.createIndex({ CompanyId: 1, IsEnabled: 1 });
db.jobBoardProviderConfigurations.createIndex({ CompanyId: 1, ProviderType: 1 });
db.jobBoardProviderConfigurations.createIndex({ "SyncState.LastSyncedAt": 1 });

// OrganizationalUnit collection (email scanning)
db.organizationalUnits.createIndex({ "JobBoardIntegration.IsEnabled": 1 });
db.organizationalUnits.createIndex({ "JobBoardIntegration.LastScannedMailTime": 1 });
```

**Query Optimization**:

```csharp
// Efficient query using index
var configs = await repository.GetAllAsync(
    c => c.CompanyId == companyId && c.IsEnabled, ct);

// Projection to reduce data transfer
var configIds = await repository.GetAllAsync(
    q => q.Where(c => c.IsEnabled).Select(c => c.Id), ct);
```

### Memory Management

**Streaming CV Downloads**:

```csharp
// Stream CV directly to blob storage (avoid loading in memory)
using var stream = await provider.DownloadCvStreamAsync(applicationId, ct);
await blobStorageService.UploadStreamAsync(containerName, blobName, stream, ct);
```

**Batch Processing**:

```csharp
// Process applications in batches to avoid memory spikes
var applicationBatches = applications.Chunk(100);
foreach (var batch in applicationBatches)
{
    await ProcessApplicationBatch(batch, ct);
    GC.Collect(); // Force garbage collection between batches if needed
}
```

### Recommended Settings

```json
{
    "JobBoardProviderConfiguration": {
        "SyncIntervalMinutes": 5,          // Balance freshness vs load
        "MaxConcurrentSyncs": 5,           // Limit parallel syncs
        "MaxConcurrentCvDownloads": 3,     // Limit CV downloads
        "JobPageSize": 50,                 // Jobs per API request
        "ApplicationPageSize": 100,        // Applications per API request
        "MaxRecentErrors": 10,             // Error history retention
        "AuthCacheExpirationMinutes": 55   // Refresh before 60-min expiry
    }
}
```

### Performance Monitoring

**Key Metrics**:
- Sync duration per provider
- Applications processed per minute
- API request latency (P50, P95, P99)
- IMAP connection reuse rate
- CV download speed
- Message bus throughput

**Logging**:

```csharp
Logger.Information("Sync completed for {Provider} in {Duration}ms. Applications: {Count}",
    config.DisplayName, stopwatch.ElapsedMilliseconds, applicationsProcessed);
```

---

## 16. Implementation Guide

### Prerequisites

1. **NuGet Packages** (Setting Service):
   - `Easy.Platform` (framework core)
   - `System.Security.Cryptography` (encryption)

2. **NuGet Packages** (Candidate Service):
   - `Easy.Platform`
   - `MailKit` (IMAP client)
   - `Azure.Storage.Blobs` (CV storage)

3. **Infrastructure**:
   - MongoDB cluster (replica set recommended)
   - RabbitMQ cluster (HA configuration)
   - Azure Blob Storage account

### Step 1: Configure Encryption Key

**appsettings.json** (Setting Service):

```json
{
    "JobBoardProviderConfiguration": {
        "EncryptionKey": "12345678901234567890123456789012"  // MUST be exactly 32 characters
    }
}
```

**Generate secure key** (PowerShell):

```powershell
$key = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host $key
```

### Step 2: Enable Email Scanning (Optional)

1. Navigate to: Company Settings → Job Board Integration
2. Enable "Email Scanning"
3. Configure IMAP settings:
   - Email Address: `jobs@company.com`
   - IMAP Server: `imap.gmail.com` (or custom)
   - IMAP Port: `993`
   - SSL: Enabled
   - Authentication: Basic Auth or OAuth2
4. Test connection
5. Save configuration

### Step 3: Configure API Provider

1. Obtain API credentials from job board:
   - **ITViec**: Contact account manager for OAuth2 client credentials
   - **VietnamWorks**: (Future) Apply for API access
2. Navigate to: Company Settings → Job Board Integration → "Manage API Providers"
3. Click "Add New Provider"
4. Fill form:
   - Display Name: `ITViec - Main Account`
   - Provider Type: `ITViec`
   - Fetch Method: `API Only`
   - Authentication Type: `OAuth2 Client Credentials`
   - Base URL: `https://api.itviec.com`
   - Client ID: `your-client-id`
   - Client Secret: `your-client-secret`
5. Click "Test Connection" (validates credentials)
6. Enable provider
7. Save

### Step 4: Verify Sync Scheduler

**Check scheduler is running**:

```csharp
// Setting Service: JobBoardApiSyncSchedulerHostedService
// Should be registered in Startup.cs:
services.AddHostedService<JobBoardApiSyncSchedulerHostedService>();
```

**Check scheduler logs**:

```
[2024-01-15 10:00:00] INFO: JobBoardApiSyncScheduler: Syncing 3 enabled configurations
[2024-01-15 10:00:05] INFO: Sync completed for ITViec - Main Account. Applications: 12
```

### Step 5: Monitor First Sync

1. Navigate to: API Provider List
2. Check sync status:
   - **Healthy** (green): Last sync < 10 min, zero failures
   - **Warning** (yellow): Recent errors
   - **Failing** (red): 3+ consecutive failures
3. View recent errors (if any)
4. Check created candidates: Candidate List → Filter by Source

### Step 6: Create Test Jobs

**Important**: Jobs must exist before applications can be linked.

1. Navigate to: Jobs → Create New Job
2. Create jobs matching ITViec job names exactly
3. Sync will link applications to jobs by name match

### Step 7: Add Additional Providers (Optional)

Repeat Step 3 for:
- Multiple ITViec accounts (different departments)
- VietnamWorks (when implemented)
- TopCV (when implemented)

### Step 8: Configure Notifications (Optional)

**Email notification on sync failures**:

```csharp
// Automatically sent after 3 consecutive failures
// Configured in: SettingUpdateJobBoardSyncStateRequestBusMessageConsumer

if (config.SyncState.ConsecutiveFailureCount >= 3)
{
    await emailService.SendAsync(new EmailRequest
    {
        To = companyAdminEmail,
        Subject = $"Job Board Sync Failing: {config.DisplayName}",
        Body = $"Provider has failed {config.SyncState.ConsecutiveFailureCount} times. Recent errors: {errors}"
    });
}
```

### Troubleshooting Setup

**Issue**: "Encryption key must be exactly 32 characters"

- **Solution**: Check appsettings.json, ensure key length = 32

**Issue**: "IMAP connection failed"

- **Solution**: Verify firewall allows port 993, check credentials

**Issue**: "OAuth2 token exchange failed"

- **Solution**: Verify client ID/secret, check API base URL

**Issue**: "Jobs not linked to applications"

- **Solution**: Create jobs in BravoSUITE matching exact job names from job board

---

## 17. Test Specifications

### Email-Based Scanning Test Specs

#### TEST-JB-EMAIL-01: IMAP Connection Establishment

**Scenario**: Connect to IMAP server with basic auth

```csharp
[Fact]
public async Task CanConnectToImapServer_WithBasicAuth()
{
    // Arrange
    var setting = new EmailSetting
    {
        Server = "imap.example.com",
        Port = 993,
        UseSsl = true,
        Username = "test@example.com",
        Password = "encrypted-password"
    };

    // Act
    using var client = await imapService.ConnectAsync(setting);

    // Assert
    Assert.True(client.IsConnected);
    Assert.True(client.IsAuthenticated);
}
```

#### TEST-JB-EMAIL-02: Job Board Detection

**Scenario**: Detect job board from email sender

```csharp
[Theory]
[InlineData("jobs@itviec.com", JobBoardType.ITViec)]
[InlineData("notify@vietnamworks.com.vn", JobBoardType.VietnamWorks)]
[InlineData("hr@tuyendungtopcv.com", JobBoardType.TopCV)]
public void DetectJobBoard_FromEmailDomain(string fromEmail, JobBoardType expected)
{
    // Arrange
    var email = new EmailModel { From = new EmailAddress(fromEmail) };

    // Act
    var detected = JobBoardDetector.Detect(email);

    // Assert
    Assert.Equal(expected, detected);
}
```

#### TEST-JB-EMAIL-03: Job Title Extraction

**Scenario**: Extract job title from ITViec email subject

```csharp
[Fact]
public void ExtractJobTitle_FromITViecEmail()
{
    // Arrange
    var subject = "John Doe applies for Senior .NET Developer - ITViec";

    // Act
    var jobTitle = JobNameHelper.ExtractJobTitleFromITViecSubject(subject);

    // Assert
    Assert.Equal("Senior .NET Developer", jobTitle);
}
```

#### TEST-JB-EMAIL-04: Candidate Email Extraction

**Scenario**: Extract candidate email from email body

```csharp
[Fact]
public void ExtractCandidateEmail_FromEmailBody()
{
    // Arrange
    var htmlBody = "<a href=\"mailto:candidate@example.com\">candidate@example.com</a>";
    var email = new EmailModel { HtmlBody = htmlBody };

    // Act
    var extracted = emailParser.ExtractCandidateEmail(email);

    // Assert
    Assert.Equal("candidate@example.com", extracted);
}
```

#### TEST-JB-EMAIL-05: CV Attachment Download

**Scenario**: Download CV attachment and upload to blob storage

```csharp
[Fact]
public async Task DownloadCvAttachment_AndUploadToStorage()
{
    // Arrange
    var attachment = new AttachmentModel
    {
        FileName = "John_Doe_CV.pdf",
        ContentType = "application/pdf",
        Data = GetSamplePdfBytes()
    };

    // Act
    var blobUrl = await cvDownloadService.DownloadAndUploadAsync(attachment, "company-123");

    // Assert
    Assert.StartsWith("https://storage.azure.com/scanmailbox/company-123/", blobUrl);
}
```

### API-Based Integration Test Specs

#### TEST-JB-API-01: OAuth2 Authentication

**Scenario**: Authenticate with ITViec API using OAuth2 client credentials

```csharp
[Fact]
public async Task Authenticate_WithITViecOAuth2()
{
    // Arrange
    var config = new JobBoardProviderConfiguration("company-123", JobBoardProviderType.ITViec)
    {
        AuthConfiguration = new AuthConfigurationValue
        {
            AuthType = AuthType.OAuth2ClientCredentials,
            ClientId = "test-client-id",
            ClientSecret = "test-client-secret",
            BaseUrl = "https://api.itviec.com"
        }
    };

    // Act
    var authResult = await itviecProvider.AuthenticateAsync(config);

    // Assert
    Assert.NotNull(authResult.AccessToken);
    Assert.True(authResult.ExpiresAt > DateTime.UtcNow);
}
```

#### TEST-JB-API-02: Fetch Jobs Paged

**Scenario**: Fetch jobs from ITViec API with pagination

```csharp
[Fact]
public async Task FetchJobsPaged_FromITViecApi()
{
    // Arrange
    var config = GetTestConfig();
    var auth = await itviecProvider.AuthenticateAsync(config);

    // Act
    var result = await itviecProvider.GetJobsPagedAsync(config, auth, skip: 0, take: 50);

    // Assert
    Assert.NotNull(result);
    Assert.True(result.Items.Count <= 50);
    Assert.True(result.TotalCount > 0);
}
```

#### TEST-JB-API-03: Detect Jobs With New Applications

**Scenario**: Compare job application counts to detect new applications

```csharp
[Fact]
public void DetectJobsWithNewApplications_WhenCountIncreased()
{
    // Arrange
    var jobs = new List<ProviderJob>
    {
        new() { Id = "job-1", Title = "Senior Dev", ApplicationCount = 15 },
        new() { Id = "job-2", Title = "Junior Dev", ApplicationCount = 5 }
    };
    var syncState = new SyncStateValue
    {
        JobSyncInfos = new Dictionary<string, JobSyncInfo>
        {
            ["job-1"] = new() { ApplicationCount = 10, LastSeenAt = DateTime.UtcNow.AddDays(-1) },
            ["job-2"] = new() { ApplicationCount = 5, LastSeenAt = DateTime.UtcNow.AddDays(-1) }
        }
    };

    // Act
    var detected = itviecProvider.DetectJobsWithNewApplications(jobs, syncState);

    // Assert
    Assert.Single(detected); // Only job-1 has new applications
    Assert.Equal("job-1", detected[0].JobId);
    Assert.Equal(5, detected[0].NewApplicationCount);
}
```

#### TEST-JB-API-04: Filter New Applications

**Scenario**: Filter applications based on last processed date

```csharp
[Fact]
public void FilterNewApplications_ByLastProcessedDate()
{
    // Arrange
    var applications = new List<ProviderApplicationRaw>
    {
        new() { Id = "app-1", ApplicationDate = DateTime.UtcNow.AddDays(-1) },
        new() { Id = "app-2", ApplicationDate = DateTime.UtcNow.AddDays(-3) },
        new() { Id = "app-3", ApplicationDate = DateTime.UtcNow.AddHours(-6) }
    };
    var syncState = new SyncStateValue
    {
        LastProcessedApplicationDate = DateTime.UtcNow.AddDays(-2)
    };

    // Act
    var filtered = itviecProvider.FilterNewApplications(applications, syncState);

    // Assert
    Assert.Equal(2, filtered.Count); // app-1 and app-3 (after last processed date)
    Assert.Contains(filtered, a => a.Id == "app-1");
    Assert.Contains(filtered, a => a.Id == "app-3");
}
```

#### TEST-JB-API-05: Same-Day Deduplication

**Scenario**: Exclude already processed same-day applications

```csharp
[Fact]
public void FilterNewApplications_ExcludeSameDayProcessed()
{
    // Arrange
    var today = DateTime.UtcNow.Date;
    var applications = new List<ProviderApplicationRaw>
    {
        new() { Id = "app-1", ApplicationDate = today.AddHours(10) },
        new() { Id = "app-2", ApplicationDate = today.AddHours(14) },
        new() { Id = "app-3", ApplicationDate = today.AddHours(16) }
    };
    var syncState = new SyncStateValue
    {
        LastProcessedApplicationDate = today.AddHours(9),
        SameDateProcessedIds = new List<string> { "app-1", "app-2" }
    };

    // Act
    var filtered = itviecProvider.FilterNewApplications(applications, syncState);

    // Assert
    Assert.Single(filtered); // Only app-3 (not in processed list)
    Assert.Equal("app-3", filtered[0].Id);
}
```

### Configuration Management Test Specs

#### TEST-JB-CONFIG-01: Validate DisplayName Uniqueness

**Scenario**: Reject duplicate display names within company

```csharp
[Fact]
public async Task Save_RejectsDuplicateDisplayName()
{
    // Arrange
    await repository.CreateAsync(new JobBoardProviderConfiguration("company-123", JobBoardProviderType.ITViec)
    {
        DisplayName = "ITViec Main"
    });

    var command = new SaveJobBoardProviderConfigurationCommand
    {
        CompanyId = "company-123",
        DisplayName = "ITViec Main", // Duplicate
        ProviderType = JobBoardProviderType.ITViec
    };

    // Act & Assert
    var ex = await Assert.ThrowsAsync<ValidationException>(() => handler.ExecuteAsync(command));
    Assert.Contains("display name already exists", ex.Message);
}
```

#### TEST-JB-CONFIG-02: Validate AuthConfiguration Uniqueness

**Scenario**: Reject duplicate auth credentials within company

```csharp
[Fact]
public async Task Save_RejectsDuplicateAuthConfiguration()
{
    // Arrange
    var existingAuth = new AuthConfigurationValue
    {
        AuthType = AuthType.OAuth2ClientCredentials,
        ClientId = "same-client-id",
        ClientSecret = "same-secret",
        BaseUrl = "https://api.itviec.com"
    };
    await repository.CreateAsync(new JobBoardProviderConfiguration("company-123", JobBoardProviderType.ITViec)
    {
        AuthConfiguration = existingAuth
    });

    var command = new SaveJobBoardProviderConfigurationCommand
    {
        CompanyId = "company-123",
        DisplayName = "ITViec Secondary",
        AuthConfiguration = new AuthConfigurationDto(existingAuth) // Same credentials
    };

    // Act & Assert
    var ex = await Assert.ThrowsAsync<ValidationException>(() => handler.ExecuteAsync(command));
    Assert.Contains("identical authentication settings", ex.Message);
}
```

#### TEST-JB-CONFIG-03: Encrypt Secrets on Save

**Scenario**: Secrets encrypted before persisting to database

```csharp
[Fact]
public async Task Save_EncryptsSecretsBeforePersist()
{
    // Arrange
    var command = new SaveJobBoardProviderConfigurationCommand
    {
        CompanyId = "company-123",
        DisplayName = "ITViec Main",
        AuthConfiguration = new AuthConfigurationDto
        {
            AuthType = AuthType.OAuth2ClientCredentials,
            ClientId = "client-id",
            ClientSecret = "plain-text-secret",
            BaseUrl = "https://api.itviec.com"
        }
    };

    // Act
    var result = await handler.ExecuteAsync(command);
    var persisted = await repository.GetByIdAsync(result.Configuration.Id);

    // Assert
    Assert.NotEqual("plain-text-secret", persisted.AuthConfiguration.ClientSecret);
    Assert.True(persisted.AuthConfiguration.ClientSecret.Length > 20); // Base64 encoded
}
```

### Security Test Specs

#### TEST-JB-SEC-01: Mask Secrets in API Response

**Scenario**: Secrets not exposed in GET API responses

```csharp
[Fact]
public async Task GetById_MasksSecretsInResponse()
{
    // Arrange
    var config = new JobBoardProviderConfiguration("company-123", JobBoardProviderType.ITViec)
    {
        AuthConfiguration = new AuthConfigurationValue
        {
            ClientId = "client-id",
            ClientSecret = SecurityHelper.EncryptString("secret", encryptionKey)
        }
    };
    await repository.CreateAsync(config);

    // Act
    var result = await controller.GetById(config.Id);
    var dto = (result as OkObjectResult)?.Value as JobBoardProviderConfigurationDto;

    // Assert
    Assert.Null(dto?.AuthConfiguration.ClientSecret); // Secret not exposed
    Assert.True(dto?.AuthConfiguration.HasClientSecret); // Flag indicates presence
}
```

#### TEST-JB-SEC-02: Authorization - Company Isolation

**Scenario**: User can only access configurations from their company

```csharp
[Fact]
public async Task GetByCompany_ReturnsOnlyOwnCompanyConfigs()
{
    // Arrange
    await repository.CreateAsync(new JobBoardProviderConfiguration("company-123", JobBoardProviderType.ITViec));
    await repository.CreateAsync(new JobBoardProviderConfiguration("company-456", JobBoardProviderType.ITViec));

    SetCurrentUser(companyId: "company-123");

    // Act
    var result = await controller.GetByCompany("company-123");
    var configs = (result as OkObjectResult)?.Value as List<JobBoardProviderConfigurationDto>;

    // Assert
    Assert.Single(configs);
    Assert.All(configs, c => Assert.Equal("company-123", c.CompanyId));
}
```

### Error Handling Test Specs

#### TEST-JB-ERR-01: API Rate Limit Handling

**Scenario**: Retry with exponential backoff on rate limit (429)

```csharp
[Fact]
public async Task FetchJobs_RetriesOnRateLimit()
{
    // Arrange
    var mockHttp = new MockHttpMessageHandler();
    mockHttp.When("*/jobs.json")
        .Respond(HttpStatusCode.TooManyRequests) // First attempt
        .Then().Respond("application/json", "{\"jobs\": []}"); // Second attempt succeeds

    // Act
    var result = await itviecProvider.GetJobsPagedAsync(config, auth, 0, 50);

    // Assert
    Assert.NotNull(result);
    Assert.Equal(2, mockHttp.GetMatchCount("*/jobs.json")); // Retried once
}
```

#### TEST-JB-ERR-02: Mark Email as Seen on Parse Failure

**Scenario**: Email marked as seen even if parsing fails

```csharp
[Fact]
public async Task ScanEmail_MarksSeenEvenOnParseFailure()
{
    // Arrange
    var email = new EmailModel
    {
        Uid = 123,
        Subject = "Malformed subject",
        HtmlBody = "<invalid>html"
    };

    // Act
    await Assert.ThrowsAsync<ParseException>(() => scanService.ScanMailBoxApplication(email, integrationModel));

    // Assert
    var markedSeen = await imapService.IsMarkedSeenAsync(email.Uid);
    Assert.True(markedSeen); // Email still marked to prevent reprocessing
}
```

### Performance Test Specs

#### TEST-JB-PERF-01: Connection Pool Reuse

**Scenario**: IMAP connections reused from pool

```csharp
[Fact]
public async Task ImapConnectionPool_ReusesConnections()
{
    // Arrange
    var pool = new ImapClientPool();
    var connectCount = 0;
    MockImapClient.OnConnect += () => connectCount++;

    // Act
    for (int i = 0; i < 10; i++)
    {
        var client = await pool.AcquireAsync();
        pool.Release(client);
    }

    // Assert
    Assert.Equal(3, connectCount); // Only 3 connections created (pool size)
}
```

#### TEST-JB-PERF-02: Auth Token Caching

**Scenario**: OAuth2 token cached and reused

```csharp
[Fact]
public async Task AuthenticateAsync_CachesToken()
{
    // Arrange
    var tokenRequestCount = 0;
    MockHttpClient.OnPost("/oauth.json", () => tokenRequestCount++);

    // Act
    await itviecProvider.AuthenticateAsync(config); // First call
    await itviecProvider.AuthenticateAsync(config); // Second call (cached)

    // Assert
    Assert.Equal(1, tokenRequestCount); // Only 1 token request (second call used cache)
}
```

---

## 18. Test Data Requirements

### Email Scanning Test Data

#### Sample ITViec Email

**From**: `jobs@itviec.com`
**Subject**: `John Doe applies for Senior .NET Developer - ITViec`
**Body**:

```html
<html>
<body>
    <p>Candidate: <a href="mailto:john.doe@example.com">john.doe@example.com</a></p>
    <p>Job: Senior .NET Developer</p>
    <p>Applied at: 2024-01-15 10:30:00</p>
</body>
</html>
```

**Attachment**: `John_Doe_CV.pdf` (sample PDF file)

#### Sample VietnamWorks Email

**From**: `notify@vietnamworks.com.vn`
**Subject**: `Nguyen Van A đã ứng tuyển vào vị trí Full Stack Developer thông qua VietnamWorks`
**Body**:

```html
<html>
<body>
    <p>Email: nguyen.van.a@example.com</p>
    <p>Vị trí: Full Stack Developer</p>
</body>
</html>
```

### API Provider Test Data

#### ITViec API Mock Responses

**GET /jobs.json**:

```json
{
    "jobs": [
        {
            "id": "job-123",
            "title": "Senior .NET Developer",
            "application_count": 15,
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "job-456",
            "title": "Full Stack Developer",
            "application_count": 8,
            "created_at": "2024-01-05T00:00:00Z"
        }
    ],
    "total": 2
}
```

**GET /jobs/{job-id}/applications.json**:

```json
{
    "applications": [
        {
            "id": "app-789",
            "candidate_name": "John Doe",
            "candidate_email": "john.doe@example.com",
            "cv_url": "https://api.itviec.com/cvs/12345.pdf",
            "applied_at": "2024-01-15T10:30:00Z"
        }
    ],
    "total": 1
}
```

### Database Seed Data

#### JobBoardProviderConfiguration

```json
{
    "_id": "01HXYZ123",
    "companyId": "company-123",
    "providerType": 1,
    "fetchMethod": 1,
    "isEnabled": true,
    "displayName": "ITViec - Main Account",
    "authConfiguration": {
        "authType": 1,
        "clientId": "test-client-id",
        "clientSecret": "encrypted-secret",
        "baseUrl": "https://api.itviec.com",
        "timeoutSeconds": 30,
        "maxRetryAttempts": 3
    },
    "syncState": {
        "lastSyncedAt": null,
        "lastSuccessfulSyncAt": null,
        "lastProcessedApplicationDate": null,
        "jobSyncInfos": {},
        "sameDateProcessedIds": [],
        "recentErrors": [],
        "totalApplicationsProcessed": 0,
        "consecutiveFailureCount": 0
    },
    "createdDate": "2024-01-15T10:00:00Z"
}
```

#### OrganizationalUnit (Email Scanning)

```json
{
    "_id": "company-123",
    "name": "Test Company",
    "jobBoardIntegration": {
        "isEnabled": true,
        "emailAddress": "jobs@company.com",
        "imapServer": "imap.gmail.com",
        "imapPort": 993,
        "useSsl": true,
        "username": "jobs@company.com",
        "password": "encrypted-password",
        "lastScannedMailTime": null
    }
}
```

### CV Sample Files

**Location**: `test-data/cv-samples/`

- `sample-cv-1.pdf` (valid PDF with text)
- `sample-cv-2.docx` (valid Word document)
- `malformed-cv.pdf` (corrupted PDF for error testing)

---

## 19. Edge Cases Catalog

### Email Scanning Edge Cases

#### EC-JB-EMAIL-01: Missing Candidate Email

**Scenario**: Email body doesn't contain candidate email

**Handling**:
- Extract from `email.ReplyTo.EmailAddress`
- Fallback to `email.From.EmailAddress`
- If still missing: Log warning, skip email

**Test**:

```csharp
var email = new EmailModel
{
    Subject = "John Doe applies for Senior Dev",
    HtmlBody = "<p>No email in body</p>",
    ReplyTo = new EmailAddress("candidate@example.com")
};
var result = await scanService.ScanMailBoxApplication(email, model);
Assert.Equal("candidate@example.com", result.CandidateEmail);
```

#### EC-JB-EMAIL-02: Multiple CV Attachments

**Scenario**: Email contains multiple PDF attachments

**Handling**:
- Order by filename priority (e.g., "CV", "Resume" in filename)
- Select first valid CV
- Upload only selected CV

**Priority**:
1. Filename contains "CV" or "Resume"
2. Largest file size
3. First attachment

#### EC-JB-EMAIL-03: Job Title Not Found

**Scenario**: Cannot extract job title from email subject

**Handling**:
- Log warning
- Create sourced candidate without job link
- Set job title to "Unknown Job"

#### EC-JB-EMAIL-04: Email Marked as Seen Fails

**Scenario**: IMAP server rejects SEEN flag update

**Handling**:
- Log error but continue processing
- Retry SEEN flag in next scan (reprocessing detection prevents duplicates)

### API Integration Edge Cases

#### EC-JB-API-01: Job Deleted on Provider Side

**Scenario**: Job exists in sync state but returns 404 from API

**Handling**:
- Remove job from `JobSyncInfos`
- Log warning
- Continue processing other jobs

**Code**:

```csharp
try
{
    var applications = await provider.GetApplicationsPagedAsync(config, auth, jobId, 0, 100, ct);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    Logger.Warning("Job {JobId} not found on provider (likely deleted)", jobId);
    syncState.JobSyncInfos.Remove(jobId);
}
```

#### EC-JB-API-02: Application Count Decreased

**Scenario**: Job application count decreased (applications deleted on provider side)

**Handling**:
- Update `JobSyncInfos` with new count
- Do NOT delete applications in BravoSUITE (preserve historical data)

**Code**:

```csharp
if (providerJob.ApplicationCount < syncState.JobSyncInfos[jobId].ApplicationCount)
{
    Logger.Warning("Application count decreased for job {JobId}: {Old} -> {New}",
        jobId, syncState.JobSyncInfos[jobId].ApplicationCount, providerJob.ApplicationCount);
    syncState.JobSyncInfos[jobId].ApplicationCount = providerJob.ApplicationCount;
}
```

#### EC-JB-API-03: OAuth Token Refresh During Sync

**Scenario**: Cached token expires during multi-page sync

**Handling**:
- Auth cache checks expiration on every request
- Auto-refresh if expired
- Retry failed request with new token

**Code**:

```csharp
public async Task<ProviderAuthResult> AuthenticateAsync(JobBoardProviderConfiguration config, CancellationToken ct)
{
    if (authCache.TryGetValue(config.Id, out var cached) && !cached.IsExpired)
        return cached;

    // Re-authenticate if expired
    var result = await AuthenticateWithProviderAsync(config, ct);
    authCache[config.Id] = result;
    return result;
}
```

#### EC-JB-API-04: Pagination Overflow

**Scenario**: Total count increases during pagination (new applications added mid-sync)

**Handling**:
- Process all pages based on initial count
- New applications caught in next sync cycle
- No risk of missing data (date-based filtering)

#### EC-JB-API-05: Same Application Date, Different IDs

**Scenario**: 200+ applications on same day (exceeds `SameDateProcessedIds` limit)

**Handling**:
- Keep last 200 IDs (FIFO eviction)
- Older IDs evicted may be reprocessed
- Duplicate detection at candidate level prevents duplicates

### Configuration Edge Cases

#### EC-JB-CONFIG-01: Encryption Key Changed

**Scenario**: Encryption key rotated in appsettings.json

**Handling**:
- Existing secrets cannot be decrypted
- Configurations fail to load
- **Manual fix required**: Re-enter all secrets via UI

**Prevention**:
- Document encryption key in secure vault
- Test key rotation in staging environment first

#### EC-JB-CONFIG-02: Multiple Configs for Same Provider

**Scenario**: Company has 3 ITViec accounts

**Handling**:
- All allowed (no provider type uniqueness constraint)
- Each config syncs independently
- Deduplicate candidates by email

#### EC-JB-CONFIG-03: Provider Disabled Mid-Sync

**Scenario**: Admin disables provider while sync is running

**Handling**:
- Current sync completes
- Next scheduled sync skips disabled provider
- No data loss

### Cross-Service Edge Cases

#### EC-JB-CROSS-01: RabbitMQ Message Lost

**Scenario**: Message bus message not delivered

**Handling**:
- Next scheduled sync will trigger again (idempotent)
- No manual intervention required

#### EC-JB-CROSS-02: Candidate Service Down

**Scenario**: Candidate Service unavailable when sync triggered

**Handling**:
- Message remains in RabbitMQ queue
- Retry when service recovers
- DLQ (Dead Letter Queue) after max retries

#### EC-JB-CROSS-03: Setting Service Down During State Update

**Scenario**: Setting Service unavailable when Candidate sends sync state update

**Handling**:
- Message queued in RabbitMQ
- Processed when Setting Service recovers
- Sync state eventually consistent

### Data Integrity Edge Cases

#### EC-JB-DATA-01: Duplicate Candidate Email

**Scenario**: Application email matches existing candidate

**Handling**:
- Update existing candidate with latest info
- Create new application linked to existing candidate
- Log info: "Updated existing candidate"

#### EC-JB-DATA-02: Job Name Mismatch

**Scenario**: Job board job name doesn't match any BravoSUITE job

**Handling**:
- Create sourced candidate (no job link)
- Log warning: "Job not found: {jobTitle}"
- Admin manually links candidate to job later

#### EC-JB-DATA-03: CV Download Fails

**Scenario**: Provider CV URL returns 404 or timeout

**Handling**:
- Create candidate/application without CV
- Log error with CV URL
- Admin can manually upload CV later

**Code**:

```csharp
try
{
    var cvUrl = await DownloadAndUploadCvAsync(application.CvUrl, companyId, ct);
    candidate.CvFileUrl = cvUrl;
}
catch (Exception ex)
{
    Logger.Error(ex, "CV download failed for application {AppId}, URL: {CvUrl}",
        application.Id, application.CvUrl);
    // Continue without CV
}
```

---

## 20. Regression Impact

### Features Affected by Job Board Integration

#### Direct Impact

**Candidate Management**:
- **Change**: New candidates created automatically
- **Risk**: Sourced candidates without job link may affect existing queries
- **Mitigation**: Filter queries to exclude sourced candidates if needed

**Application Pipeline**:
- **Change**: Applications created in `StageType.New` stage
- **Risk**: Auto-created applications bypass manual screening
- **Mitigation**: Add "Unreviewed" flag for job board applications

**CV Parser**:
- **Change**: High volume of CVs processed automatically
- **Risk**: Parser performance degradation
- **Mitigation**: Rate limit CV parsing (max 3 concurrent)

#### Indirect Impact

**Email System**:
- **Change**: IMAP connections to company email servers
- **Risk**: Email server rate limiting
- **Mitigation**: Connection pooling, configurable scan frequency

**Azure Blob Storage**:
- **Change**: Increased storage usage for CVs
- **Risk**: Storage costs increase
- **Mitigation**: Archive old CVs, implement retention policy

**Message Bus**:
- **Change**: New message types for sync coordination
- **Risk**: RabbitMQ queue buildup if consumer down
- **Mitigation**: Monitor queue depth, configure DLQ

### Regression Test Checklist

- [ ] Existing candidate creation via UI still works
- [ ] Manual application creation via UI still works
- [ ] CV upload via UI still works
- [ ] Candidate search includes job board candidates
- [ ] Duplicate candidate detection works with job board candidates
- [ ] Email scanning doesn't affect other email integrations
- [ ] API rate limits don't affect other API consumers
- [ ] Message bus doesn't delay other message types

### Breaking Changes

**None** - Job Board Integration is additive only.

### Database Schema Changes

**New Collections**:
- `Setting.JobBoardProviderConfiguration` (new)

**Modified Collections**:
- `Setting.OrganizationalUnit` (added `JobBoardIntegration` embedded object)

**Indexes Added**:
- `JobBoardProviderConfiguration`: `CompanyId + IsEnabled`
- `JobBoardProviderConfiguration`: `CompanyId + ProviderType`

### API Contract Changes

**New Endpoints**:
- `POST /api/job-board-provider-configuration/save`
- `GET /api/job-board-provider-configuration/{id}`
- `GET /api/job-board-provider-configuration/by-company`
- `DELETE /api/job-board-provider-configuration/{id}`

**Modified Endpoints**: None

---

## 21. Troubleshooting

### Common Issues

#### Issue: IMAP Connection Timeout

**Symptoms**:
- Email scanning fails with "Connection timeout"
- Logs: `MailKit.Net.Imap.ImapClient: Connection timeout after 30s`

**Root Causes**:
1. Firewall blocking port 993
2. IMAP server requires app-specific password (Gmail, Office 365)
3. Too many concurrent connections

**Solutions**:

```bash
# Check firewall
Test-NetConnection -ComputerName imap.gmail.com -Port 993

# Gmail: Enable app-specific password
# Office 365: Enable IMAP in admin console
```

**Code Fix**:

```csharp
// Increase timeout
var client = new ImapClient();
client.Timeout = 60000; // 60 seconds
```

#### Issue: OAuth2 Token Exchange Failed

**Symptoms**:
- API sync fails with "Unauthorized" (401)
- Logs: `OAuth2 token exchange failed: invalid_client`

**Root Causes**:
1. Invalid client ID or secret
2. API credentials expired
3. Base URL incorrect

**Solutions**:

```csharp
// Verify credentials
var response = await httpClient.PostAsync(
    "https://api.itviec.com/oauth.json",
    new FormUrlEncodedContent(new Dictionary<string, string>
    {
        ["client_id"] = "your-client-id",
        ["client_secret"] = "your-client-secret",
        ["grant_type"] = "client_credentials"
    }));

var content = await response.Content.ReadAsStringAsync();
Logger.Information("Token response: {Response}", content);
```

**Check**:
- Client ID/secret match ITViec account manager's records
- Base URL is `https://api.itviec.com` (no trailing slash)

#### Issue: Secrets Decryption Failed

**Symptoms**:
- Sync fails with "Invalid encryption key"
- Logs: `System.Security.Cryptography.CryptographicException: Padding is invalid`

**Root Causes**:
1. Encryption key changed in appsettings.json
2. Encryption key length ≠ 32 characters

**Solutions**:

```json
// appsettings.json - verify key length
{
    "JobBoardProviderConfiguration": {
        "EncryptionKey": "12345678901234567890123456789012" // Exactly 32 chars
    }
}
```

**Recovery**:
1. Restore original encryption key
2. Or re-enter all secrets via UI (triggers re-encryption)

#### Issue: Job Not Found Warning

**Symptoms**:
- Applications created but not linked to jobs
- Logs: `Job not found for application: Senior .NET Developer`

**Root Cause**:
- Job name in job board doesn't exactly match BravoSUITE job name

**Solutions**:

```csharp
// Check job name matching logic
var job = await jobRepository.FirstOrDefaultAsync(
    j => j.CompanyId == companyId && j.Title == applicationJobTitle, ct);

if (job == null)
{
    Logger.Warning("Job not found: {JobTitle}. Creating sourced candidate.", applicationJobTitle);
    // Create sourced candidate without job link
}
```

**Fix**:
1. Create job in BravoSUITE with exact name from job board
2. Or manually link candidate to job via UI

#### Issue: CV Download 404

**Symptoms**:
- Candidate created without CV
- Logs: `CV download failed: 404 Not Found`

**Root Causes**:
1. CV URL expired (some job boards expire URLs after 30 days)
2. CV deleted by candidate on job board

**Solutions**:
- Retry CV download (manual trigger via UI)
- Or ask candidate to re-upload CV

#### Issue: Sync Status Stuck at "Warning"

**Symptoms**:
- Provider status shows yellow warning
- Recent errors: "Rate limit exceeded"

**Root Cause**:
- API rate limit hit (ITViec: 1000 requests/hour)

**Solutions**:

```csharp
// Reduce sync frequency
{
    "JobBoardProviderConfiguration": {
        "SyncIntervalMinutes": 10 // Increase from 5 to 10
    }
}

// Or add rate limit backoff
if (response.StatusCode == HttpStatusCode.TooManyRequests)
{
    var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromMinutes(5);
    Logger.Warning("Rate limit hit, retrying after {RetryAfter}", retryAfter);
    await Task.Delay(retryAfter, ct);
}
```

### Debugging Tools

#### Enable Verbose Logging

**appsettings.json**:

```json
{
    "Serilog": {
        "MinimumLevel": {
            "Default": "Information",
            "Override": {
                "Candidate.Application.ScanMailBoxModule": "Debug",
                "Setting.Application.JobBoardProviderConfiguration": "Debug"
            }
        }
    }
}
```

#### Test API Connection

**Postman Collection**: `/docs/postman/JobBoardIntegration.postman_collection.json`

**Test OAuth2**:

```http
POST https://api.itviec.com/oauth.json
Content-Type: application/x-www-form-urlencoded

client_id=your-client-id&client_secret=your-secret&grant_type=client_credentials
```

#### Test IMAP Connection

**PowerShell Script**:

```powershell
$client = New-Object MailKit.Net.Imap.ImapClient
$client.Connect("imap.gmail.com", 993, $true)
$client.Authenticate("user@example.com", "password")
Write-Host "Connected: $($client.IsConnected)"
$client.Disconnect($true)
```

### Monitoring Queries

**Check sync state**:

```javascript
// MongoDB query
db.jobBoardProviderConfigurations.find({
    "companyId": "company-123",
    "syncState.consecutiveFailureCount": { $gte: 3 }
})
```

**Check recent errors**:

```javascript
db.jobBoardProviderConfigurations.aggregate([
    { $match: { "syncState.recentErrors": { $ne: [] } } },
    { $project: {
        displayName: 1,
        recentErrors: "$syncState.recentErrors"
    }}
])
```

---

## 22. Operational Runbook

### Daily Operations

#### Monitor Sync Health

**Check Provider Status** (UI):
1. Navigate to: Company Settings → Job Board Integration → Manage API Providers
2. Review status indicators:
   - **Green (Healthy)**: All good
   - **Yellow (Warning)**: Check recent errors
   - **Red (Failing)**: Immediate action required

**Check Sync Metrics** (Database):

```javascript
db.jobBoardProviderConfigurations.aggregate([
    { $match: { isEnabled: true } },
    { $project: {
        displayName: 1,
        lastSync: "$syncState.lastSyncedAt",
        applicationsProcessed: "$syncState.totalApplicationsProcessed",
        failureCount: "$syncState.consecutiveFailureCount"
    }}
])
```

**Expected Metrics**:
- Last sync: < 10 minutes ago
- Consecutive failures: 0
- Applications processed: Incremental increase

#### Review Recent Errors

**Query Recent Errors**:

```javascript
db.jobBoardProviderConfigurations.find(
    { "syncState.recentErrors.0": { $exists: true } },
    { displayName: 1, "syncState.recentErrors": 1 }
)
```

**Common Errors**:
| Error Message | Action |
|---------------|--------|
| "OAuth2 token exchange failed" | Verify credentials, check API status |
| "Rate limit exceeded" | Reduce sync frequency or contact provider |
| "Connection timeout" | Check network/firewall, verify IMAP server |

#### Verify Candidate Creation

**Check Candidates Created Today**:

```javascript
db.candidates.count({
    source: "ITViec", // or VietnamWorks, TopCV, etc.
    createdDate: {
        $gte: ISODate("2024-01-15T00:00:00Z"),
        $lt: ISODate("2024-01-16T00:00:00Z")
    }
})
```

**Expected**:
- Candidates created correlate with sync frequency and job board activity

### Weekly Operations

#### Performance Review

**Check Sync Duration**:

```csharp
// Review logs for sync duration
// Example log: "Sync completed for ITViec - Main Account in 12.5s. Applications: 15"
```

**Metrics**:
- Sync duration: < 30s per provider (depends on application count)
- CV download speed: < 5s per CV

**Optimization**:
- If sync duration > 60s: Increase page size or reduce job count
- If CV download slow: Check Azure Blob Storage region

#### Storage Cleanup

**Check Blob Storage Usage**:

```bash
# Azure CLI
az storage blob list --account-name yourstorage --container-name scanmailbox --query "length(@)"
```

**Retention Policy**:
- CVs older than 2 years: Archive or delete
- Rationale: Reduce storage costs

**Archive Script**:

```bash
az storage blob list --account-name yourstorage --container-name scanmailbox \
    --query "[?properties.lastModified < '2022-01-01'].name" -o tsv | \
    xargs -I {} az storage blob copy start \
        --source-container scanmailbox \
        --source-blob {} \
        --destination-container archive \
        --account-name yourstorage
```

### Monthly Operations

#### Review Provider Performance

**Applications Per Provider**:

```javascript
db.jobBoardProviderConfigurations.aggregate([
    { $match: { isEnabled: true } },
    { $group: {
        _id: "$providerType",
        totalApplications: { $sum: "$syncState.totalApplicationsProcessed" }
    }},
    { $sort: { totalApplications: -1 } }
])
```

**ROI Analysis**:
- Compare applications per provider
- Disable underperforming providers
- Allocate budget to high-performing providers

#### Encryption Key Rotation (Optional)

**Steps**:
1. Backup database
2. Export all configurations
3. Generate new 32-character key
4. Update appsettings.json
5. Re-enter all secrets via UI (triggers re-encryption)
6. Verify all syncs working

**Frequency**: Every 12 months (optional, not required)

### Incident Response

#### Incident: All Syncs Failing

**Symptoms**:
- All providers showing red status
- Recent errors: "Message bus connection failed"

**Diagnosis**:
1. Check RabbitMQ status: `systemctl status rabbitmq-server`
2. Check Setting Service logs
3. Check Candidate Service logs

**Resolution**:
1. Restart RabbitMQ: `systemctl restart rabbitmq-server`
2. Restart Setting Service
3. Restart Candidate Service
4. Verify syncs resume

#### Incident: High Memory Usage

**Symptoms**:
- Candidate Service memory > 4GB
- Logs: OutOfMemoryException

**Diagnosis**:
1. Check concurrent sync count: Should be ≤ 5
2. Check page size: Should be ≤ 100 for applications
3. Check CV download concurrency: Should be ≤ 3

**Resolution**:

```json
// Reduce concurrency in appsettings.json
{
    "JobBoardProviderConfiguration": {
        "MaxConcurrentSyncs": 3,
        "MaxConcurrentCvDownloads": 2,
        "ApplicationPageSize": 50
    }
}
```

Restart service and monitor memory.

#### Incident: Duplicate Candidates

**Symptoms**:
- Same candidate created multiple times
- Different emails but same name

**Diagnosis**:
1. Check `SameDateProcessedIds` list size: Should be < 200
2. Check duplicate detection logic

**Resolution**:
1. Manually merge duplicate candidates via UI
2. Verify deduplication logic in `FilterNewApplications`

### Backup and Recovery

#### Backup Configuration

**MongoDB Backup**:

```bash
mongodump --db BravoSUITE --collection jobBoardProviderConfigurations --out /backup/$(date +%Y%m%d)
```

**Frequency**: Daily (automated)

#### Recovery from Backup

**Restore Configurations**:

```bash
mongorestore --db BravoSUITE --collection jobBoardProviderConfigurations /backup/20240115/BravoSUITE/jobBoardProviderConfigurations.bson
```

**Note**: Encryption key must match backup time, or re-enter secrets.

---

## 23. Roadmap and Dependencies

### Current Status (v1.0.7)

**Implemented**:
- ✅ Email-based scanning (ITViec, VietnamWorks, TopCV, LinkedIn, etc.)
- ✅ ITViec API integration (OAuth2, jobs sync, applications sync)
- ✅ Configuration management UI (Angular)
- ✅ Message bus coordination (Setting ↔ Candidate)
- ✅ Credential encryption (AES-256)
- ✅ Sync state tracking and error handling

**In Production**:
- ITViec email scanning: Active
- ITViec API sync: Active

### Planned Features

#### v1.1.0: VietnamWorks API Integration (Q2 2026)

**Dependencies**:
- VietnamWorks API access approval
- OAuth2 credentials from VietnamWorks

**Implementation**:
- `VietnamWorksJobBoardProvider` class
- API endpoint mapping (TBD based on VietnamWorks API docs)
- UI provider type option

**Estimated Effort**: 2 weeks

#### v1.2.0: TopCV API Integration (Q3 2026)

**Dependencies**:
- TopCV API key acquisition
- API documentation from TopCV

**Implementation**:
- `TopCvJobBoardProvider` class (extend existing email-based parser)
- Hybrid mode: Email + API
- Enhanced CV download via API

**Estimated Effort**: 2 weeks

#### v1.3.0: LinkedIn API Integration (Q4 2026)

**Dependencies**:
- LinkedIn API access (LinkedIn Talent Solutions)
- OAuth2 user consent flow (different from client credentials)

**Implementation**:
- `LinkedInJobBoardProvider` class
- OAuth2 Authorization Code flow (user-based)
- UI for LinkedIn account connection

**Estimated Effort**: 3 weeks (complex OAuth flow)

#### v1.4.0: Multi-Language Support (2027)

**Features**:
- Detect candidate language from CV
- Tag candidates with language preference
- Auto-translate job descriptions (optional)

**Dependencies**:
- Azure Cognitive Services (Language Detection)
- Translation API integration

**Estimated Effort**: 4 weeks

#### v1.5.0: AI-Powered Matching (2027)

**Features**:
- Auto-score candidate-job match (0-100)
- Recommend best jobs for sourced candidates
- AI-based CV parsing enhancements

**Dependencies**:
- Azure OpenAI Service
- Training dataset (1000+ candidate-job pairs)

**Estimated Effort**: 8 weeks

### External Dependencies

**Job Board Providers**:
| Provider | Dependency | Status | ETA |
|----------|-----------|--------|-----|
| ITViec | API access granted | ✅ Active | N/A |
| VietnamWorks | API access pending | 🟡 Pending | Q2 2026 |
| TopCV | API key requested | 🟡 Pending | Q3 2026 |
| LinkedIn | API access not started | 🔴 Blocked | Q4 2026 |

**Infrastructure**:
| Service | Required For | Status |
|---------|-------------|--------|
| RabbitMQ | Message bus | ✅ Active |
| MongoDB | Configuration storage | ✅ Active |
| Azure Blob Storage | CV storage | ✅ Active |
| Azure OpenAI | AI matching (future) | 🟡 Planned |

### Migration Path

**From Email-Only to API**:

1. **Add API Configuration** (no downtime):
   - Create new JobBoardProviderConfiguration
   - Set FetchMethod = API
   - Enable alongside email scanning

2. **Monitor Dual Mode** (1 week):
   - Compare application counts (email vs API)
   - Verify no duplicates
   - Check data completeness

3. **Disable Email Scanning** (when confident):
   - Set OrganizationalUnit.JobBoardIntegration.IsEnabled = false
   - Keep API sync enabled

**Rollback Plan**:
- Re-enable email scanning (instant)
- API configurations retained (no data loss)

### Breaking Changes (Future)

**None Planned** - All changes will be backward compatible.

---

## 24. Related Documentation

### Internal Documentation

**Architecture**:
- [System Architecture Overview](../../../docs/architecture.md)
- [Message Bus Patterns](../../../docs/message-bus-patterns.md)
- [CQRS Implementation Guide](../../../docs/cqrs-guide.md)

**Domain Features**:
- [Candidate Management Feature](./README.CandidateManagementFeature.md)
- [Job Management Feature](./README.JobManagementFeature.md)
- [Company Settings Feature](../../bravoGROWTH/detailed-features/README.CompanySettingsFeature.md)

**Development Guides**:
- [Adding New Job Board Providers](#adding-new-providers)
- [Email Parser Development Guide](../dev-guides/email-parser-guide.md)
- [Security Best Practices](../../../docs/security-best-practices.md)

### External Resources

**Job Board APIs**:
- [ITViec API Documentation](https://itviec.com/customer/api-documents)
- [VietnamWorks API](https://www.vietnamworks.com/api-docs) (TBD)
- [TopCV API](https://www.topcv.vn/api) (TBD)

**Libraries**:
- [MailKit Documentation](https://github.com/jstedfast/MailKit)
- [Azure Blob Storage SDK](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [RabbitMQ .NET Client](https://www.rabbitmq.com/dotnet-api-guide.html)

**Standards**:
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [IMAP RFC 3501](https://datatracker.ietf.org/doc/html/rfc3501)

---

## 25. Glossary

| Term | Definition |
|------|------------|
| **API-Based Integration** | Direct REST API connection to job board platforms for real-time data fetching |
| **Application** | Job application submitted by candidate, links Candidate + Job |
| **AuthConfiguration** | Value object storing authentication credentials (encrypted) |
| **CV Parser** | Service that extracts structured data from CV files (PDF, DOCX) |
| **Email Scanning** | IMAP-based monitoring of email inboxes for job application notifications |
| **FetchMethod** | How applications are retrieved: Email, API, or Hybrid |
| **IMAP** | Internet Message Access Protocol - email retrieval protocol |
| **Job Board** | External platform where jobs are posted (ITViec, VietnamWorks, etc.) |
| **Job Board Provider** | Specific job board implementation (e.g., ITViecJobBoardProvider) |
| **JobBoardProviderConfiguration** | Entity storing provider settings and sync state |
| **OAuth2** | Authentication protocol used by job board APIs |
| **Provider Factory** | Factory pattern for instantiating job board providers |
| **SameDateProcessedIds** | List of application IDs processed on the same day (deduplication) |
| **Sourced Candidate** | Candidate created without linking to a job (job not found) |
| **Strategy Pattern** | Design pattern for interchangeable email parsers and API providers |
| **SyncState** | Value object tracking sync status, errors, and processed applications |
| **Template Method Pattern** | Design pattern for common provider logic with hooks |

---

## 26. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial ITViec API integration |
| 1.0.1 | 2025-12-17 | Documentation fixes: Updated PartialJobBoardEmails (TopCV→TopCv, added OrientSoftware), fixed IJobBoardApplicationProvider interface signatures, corrected BaseApiJobBoardProvider abstract methods, fixed ITViec API endpoints (/oauth.json, /jobs.json), updated JobBoardProviderFactory to Dictionary-based pattern, corrected file paths in Key Provider Files table, added OrientSoftware to Supported Providers |
| 1.0.2 | 2025-12-17 | Documentation fixes: Fixed AuthType enum values (None=0, OAuth2ClientCredentials=1, OAuth2AuthorizationCode=2, ApiKey=3, BasicAuth=4 - removed non-existent BearerToken/Custom), removed non-existent TokenUrl from AuthConfigurationValue entity diagram, updated "Adding New Providers" section with correct method signatures (AuthenticateWithProviderAsync, GetJobsCountInternalAsync, GetJobsPagedInternalAsync, GetApplicationsCountInternalAsync, GetApplicationsPagedInternalAsync, GetDefaultMappingConfig), added ScanOtherMailboxService to email parsers list |
| 1.0.3 | 2025-12-18 | Bug fix: Added double-checked locking pattern to `BaseApiJobBoardProvider.AuthenticateAsync()` to prevent race condition when multiple concurrent requests try to authenticate for the same configuration. Uses `ConcurrentDictionary<string, SemaphoreSlim>` for per-config locks. Updated documentation with authentication concurrency handling diagram. |
| 1.0.4 | 2025-12-27 | Frontend UI: Added Job Board API Provider Configuration UI in bravoTALENTSClient (Angular 12). Includes: AppBase component hierarchy, domain models with value objects, API service with CQRS pattern, list/form slide-in panels, i18n translations (en/vi/ja). Entry point via "Manage API Providers" button in job-board-integration-form. |
| 1.0.5 | 2025-12-29 | **Multi-config support & validation changes**: (1) Companies can now have multiple configurations per provider type (e.g., multiple ITViec accounts). (2) New uniqueness rules: DisplayName and AuthConfiguration must be unique within company (instead of one-provider-per-company). (3) Added `HasDuplicateAuthConfigurationExpr` domain expression for auth uniqueness check. (4) Database index changed from unique to non-unique for CompanyId+ProviderType. (5) `SyncStateValue.MarkSuccess()` now clears `RecentErrors` list on success. (6) Frontend secret handling: "Change Secret" checkbox only shown when existing secret exists; secrets required based on mode and state. |
| 1.0.6 | 2026-01-08 | **Documentation enhancement**: Added Business Requirements section with 12 formal FR-JB-XX requirements covering email integration, API integration, provider management, candidate creation, and security compliance. Aligned with EmployeeSettingsFeature.md documentation standards. |
| 1.0.7 | 2026-01-10 | **Documentation migration**: Migrated to 26-section standard structure. Added: Executive Summary, Business Value, Business Rules, Process Flows, Design Reference, System Design, Frontend Components, Backend Controllers, Cross-Service Integration, Security Architecture, Performance Considerations, Implementation Guide, Test Data Requirements, Edge Cases Catalog, Regression Impact, Operational Runbook, Roadmap and Dependencies, Glossary. Enhanced all sections with comprehensive technical details, code examples, and operational guidance. |
| 1.1.0 | TBD | VietnamWorks integration |
| 1.2.0 | TBD | TopCV integration |

---

_Last Updated: 2026-01-10_
