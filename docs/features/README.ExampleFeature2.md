# Job Board Integration Feature

> **Comprehensive Technical Documentation for the ScanMailBox & Job Board API Integration System**

## Table of Contents

- [Overview](#overview)
- [Business Requirements](#business-requirements)
- [Design Reference](#design-reference)
- [Integration Methods](#integration-methods)
- [Architecture](#architecture)
- [Email-Based Scanning (ScanMailBox)](#email-based-scanning-scanmailbox)
- [API-Based Integration](#api-based-integration)
- [API Reference](#api-reference)
- [Frontend Components](#frontend-components)
- [Backend Controllers](#backend-controllers)
- [Message Bus Integration](#message-bus-integration)
- [Permission System](#permission-system)
- [Configuration Guide](#configuration-guide)
- [Adding New Providers](#adding-new-providers)
- [Security Considerations](#security-considerations)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Test Specifications](#test-specifications)
- [Related Documentation](#related-documentation)
- [Version History](#version-history)

---

## Overview

> **Objective**: Enable automatic fetching of job applications from external job board platforms via email scanning and direct API integration.
>
> **Core Values**: Extensible - Secure - Automated - Multi-Provider

The Job Board Integration feature enables EasyPlatform to automatically fetch job applications from external job board platforms (ITViec, VietnamWorks, TopCV, LinkedIn, etc.). The system supports **two integration methods**:

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

---

## Business Requirements

> **Objective**: Streamline candidate sourcing by automating job application ingestion from multiple platforms
>
> **Core Values**: Efficiency - Reliability - Security

### Email Scanning Integration

#### FR-JBI-01: Email Inbox Monitoring

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Monitor company email inboxes via IMAP for job board notifications      |
| **Scope**       | HR Admins can configure email credentials per company                   |
| **Validation**  | Valid IMAP credentials, supported email provider                        |
| **Evidence**    | `ScanMailBoxModule/`, `JobBoardIntegration` entity                      |

#### FR-JBI-02: Email Parsing

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Parse candidate info from job board notification emails                 |
| **Scope**       | Automatic, triggered by new emails matching provider patterns           |
| **Output**      | Candidate application created in system                                 |
| **Evidence**    | `EmailParserFactory.cs`, provider-specific parsers                      |

### API Integration

#### FR-JBI-03: Direct API Integration

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Fetch applications directly from job board REST APIs                    |
| **Dependencies**| Valid API credentials, provider supports API access                     |
| **Output**      | Real-time application data with full details                            |
| **Evidence**    | `JobBoardProviderConfiguration`, `IJobBoardProviderApiClient`           |

#### FR-JBI-04: Scheduled Synchronization

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Background jobs periodically sync new applications                      |
| **Schedule**    | Configurable per provider (default: every 15 minutes)                   |
| **Audit**       | Sync history logged with success/failure status                         |
| **Evidence**    | `JobBoardApiSyncBackgroundJobExecutor.cs`                               |

---

## Design Reference

| Information       | Details                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| **Figma Link**    | _(Contact design team for access)_                                      |
| **Screenshots**   | _(To be added)_                                                         |
| **UI Components** | Configuration forms, Provider cards, Sync status indicators             |

### Key UI Patterns

- **Provider Configuration**: Form-based setup with OAuth connection buttons
- **Email Settings**: IMAP credential form with test connection feature
- **Sync Dashboard**: Status cards showing last sync time, success rate, pending items
- **Provider List**: Card grid with enable/disable toggles per provider

---

## Integration Methods

### Comparison Matrix

| Feature               | Email Scanning            | API Integration          |
| --------------------- | ------------------------- | ------------------------ |
| **Setup Complexity**  | Low (email only)          | Medium (API credentials) |
| **Real-time Data**    | Near real-time            | Real-time                |
| **Data Completeness** | Limited to email content  | Full API data            |
| **Reliability**       | Depends on email delivery | Direct connection        |
| **Rate Limits**       | N/A                       | Provider-specific        |
| **OAuth Support**     | Yes (for email)           | Yes (for API)            |

### Supported Providers

| Provider       | Email Scanning | API Integration | Email Pattern                 | Authentication            | API Docs                                              |
| -------------- | -------------- | --------------- | ----------------------------- | ------------------------- | ----------------------------------------------------- |
| ITViec         | Active         | Implemented     | `@itviec.com`                 | OAuth2 Client Credentials | [API Docs](https://itviec.com/customer/api-documents) |
| VietnamWorks   | Active         | Planned         | `@vietnamworks.com.vn`        | OAuth2                    | -                                                     |
| TopCV          | Active         | Planned         | `@tuyendungtopcv.com`         | API Key                   | -                                                     |
| TopDev         | Active         | Planned         | `@topdev.vn`                  | API Key                   | -                                                     |
| LinkedIn       | Active         | Planned         | `@linkedin.com`               | OAuth2                    | -                                                     |
| CareerLink     | Active         | Planned         | `careerlink.vn`               | API Key                   | -                                                     |
| CareerBuilder  | Active         | Planned         | `careerbuilder.vn`            | OAuth2                    | -                                                     |
| Viectotnhat    | Active         | -               | `viectotnhat.com`             | -                         | -                                                     |
| OrientSoftware | Active         | -               | `noreply@orientsoftware.com`  | -                         | -                                                     |
| YBox           | Active         | -               | CC: `business.ybox@gmail.com` | -                         | -                                                     |

---

## Architecture

### High-Level Architecture (Both Methods)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EasyPlatform Platform                                 │
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

### Design Patterns Used

| Pattern             | Usage                         | Location                                                 |
| ------------------- | ----------------------------- | -------------------------------------------------------- |
| **Strategy**        | Email parsers & API providers | `BaseScanMailboxService`, `IJobBoardApplicationProvider` |
| **Template Method** | Common provider/parser logic  | `BaseApiJobBoardProvider`, `BaseScanMailboxService`      |
| **Factory**         | Provider/parser instantiation | `JobBoardProviderFactory`                                |
| **Object Pool**     | IMAP connection management    | `MailikitScanningMailService.ImapClientPool`             |
| **Repository**      | Data access                   | `ISettingRepository<T>`                                  |
| **CQRS**            | Command/Query separation      | Commands & Queries folders                               |
| **Request-Driven**  | Cross-service communication   | Message Bus (Request/Response pattern)                   |

---

## Email-Based Scanning (ScanMailBox)

The email-based scanning system monitors company email inboxes for job application notifications from various job boards and automatically creates candidate records.

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
│  • Create/find Job entity                                                   │
│  • Create Application linking Candidate + Job                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supported Job Board Email Patterns

The system detects job boards by analyzing the sender's email domain:

```csharp
// Location: Candidate.Application/ScanMailBoxModule/Common/Constants/PartialJobBoardEmails.cs
public class PartialJobBoardEmails
{
    public const string OrientSoftware = "noreply@orientsoftware.com";
    public const string VietnamWorks = "@vietnamworks.com.vn";
    public const string ITViec = "@itviec.com";
    public const string Viectotnhat = "viectotnhat.com";
    public const string CareerlinkVn = "careerlink.vn";
    public const string CareerBuilderVn = "careerbuilder.vn";
    public const string TopCv = "@tuyendungtopcv.com";
    public const string TopDev = "@topdev.vn";
    public const string LinkedIn = "@linkedin.com";
}
```

### Job Title Extraction Patterns

Each job board has specific email subject patterns:

| Job Board        | Subject Pattern                                                            | Extraction Method                                           |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **ITViec**       | `John Doe applies for Senior Developer - ITviec`                           | Extract between "applies for " and " - ITviec"              |
| **VietnamWorks** | `John Doe đã ứng tuyển vào vị trí Senior Developer thông qua VietnamWorks` | Extract between "đã ứng tuyển vào vị trí " and " thông qua" |
| **TopCV**        | `John applied for [Job Title] [#123]`                                      | Extract between "đã ứng tuyển công việc " and "[#"          |
| **LinkedIn**     | `New application: Sales Executive from Nguyen Van A`                       | Parse after "from " separator                               |
| **CareerLink**   | HTML body contains `Vị trí công việc: <b>Job Title</b>`                    | Regex extraction from HTML                                  |

### Email Parsing Services

The system uses a strategy pattern with specialized parsers for each job board:

```
BaseScanMailboxService (Abstract)
├── ScanOuterCareerSiteMailboxService
│   ├── ITViec
│   ├── VietnamWorks
│   ├── CareerLink
│   ├── Viectotnhat
│   └── CareerBuilder
├── ScanTopCvMailboxService (with API integration)
├── ScanTopDevMailboxService
├── ScanLinkedInMailboxService
├── ScanYBoxMailboxService
├── ScanOsdMailboxService
└── ScanOtherMailboxService (generic fallback parser)
```

#### Key Files

| File                                   | Purpose                                    |
| -------------------------------------- | ------------------------------------------ |
| `BaseScanMailboxService.cs`            | Abstract base with common extraction logic |
| `ScanOuterCareerSiteMailboxService.cs` | Parser for standard job board emails       |
| `ScanTopCvMailboxService.cs`           | TopCV with API-based CV download           |
| `ScanLinkedInMailboxService.cs`        | LinkedIn-specific parsing                  |
| `JobNameHelper.cs`                     | Job title extraction utilities             |

### Candidate Information Extraction

#### Name Extraction

```csharp
// Template: "FullName XXX JobTitle YYY"
// Example: "John Doe applies for Senior Developer - ITViec"

public static (string firstName, string lastName) ExtractNamesFromEmailSubjectTemplate(
    EmailModel email, List<string> xxxTemplateStrings)
{
    // 1. Extract full name (text before template marker)
    // 2. Split into first and last name
    // 3. Fallback to email.From.DisplayName
    // 4. Last resort: use email address as name
}
```

#### Email Extraction

```csharp
// Priority order:
// 1. email.ReplyTo.EmailAddress
// 2. Regex from HTML body: <a href="mailto:[email]">[email]</a>
// 3. From address (fallback)
```

#### CV Attachment Processing

```csharp
// Allowed extensions: .pdf, .doc, .docx
// Processing:
// 1. Filter attachments by allowed extension
// 2. Order by filename priority
// 3. Parse CV using ICvParserInfrastructureService
// 4. Upload to Azure Storage: /scanmailbox/{CompanyId}/{Timestamp}_{Filename}
```

### IMAP Connection Management

The system uses MailKit library with sophisticated connection pooling:

```csharp
// Location: Candidate.Application/ScanMailBoxModule/Infrastructures/ScanMailBox/MailikitScanningMailService.cs

public class MailikitScanningMailService : IScanningMailService
{
    // Global concurrency control
    private readonly SemaphoreSlim maxParallelismLock;

    // Per-setting connection pools
    private readonly ConcurrentDictionary<string, ImapClientPool> clientPools;

    // Connection pool per email setting
    private sealed class ImapClientPool : IDisposable
    {
        private readonly ConcurrentQueue<ImapClient> availableClients;
        private readonly SemaphoreSlim clientSemaphore;

        // Pre-initializes connections for performance
        // Auto-reconnects failed connections
        // Validates health before returning to pool
    }
}
```

#### Connection Configuration

```csharp
public class EmailSettingModel
{
    public string Username { get; set; }
    public string Password { get; set; }          // Decrypted at runtime
    public string AccessToken { get; set; }       // For OAuth2
    public string ServerAddress { get; set; }     // e.g., "imap.gmail.com"
    public int Port { get; set; }                 // SSL: 993, Non-SSL: 143
    public bool IsSsl { get; set; }
    public bool NeedExternalAuthentication { get; set; }  // OAuth2 flag
}
```

### Email Scanning Message Format

```csharp
public sealed class ScanMailBoxTriggerScanRequestBusMessage : PlatformTrackableBusMessage
{
    public List<Item> Data { get; set; } = [];

    public sealed class Item
    {
        public string Email { get; set; }
        public string Password { get; set; }              // Encrypted
        public string MailServer { get; set; }
        public int MailServerPort { get; set; }
        public bool IsSSL { get; set; }
        public bool NeedExternalAuthentication { get; set; }
        public string CompanyId { get; set; }
        public ExternalAppAuthenticationSetting ExternalAppAuthenticationSetting { get; set; }
    }
}
```

### Application Created Message Format

```csharp
public sealed class ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage
{
    public string CompanyEmail { get; set; }
    public IList<CompanyApplicationModel> Data { get; set; } = [];

    public sealed class CompanyApplicationModel
    {
        public string JobName { get; set; }
        public string ApplicationSource { get; set; }      // e.g., "ITViec"
        public ApplicantCvInfoModel CvDetail { get; set; }
    }

    public sealed class ApplicantCvInfoModel
    {
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string CvAttachmentName { get; set; }
        public string CvAttachmentUrl { get; set; }        // Azure blob URL
        public string Summary { get; set; }                 // From CV parsing
    }
}
```

---

## API-Based Integration

The API-based integration provides direct REST API connections to job board platforms for real-time application data fetching.

### Domain Model

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

### Key Files

| File                                                                           | Purpose                              |
| ------------------------------------------------------------------------------ | ------------------------------------ |
| `Setting.Domain/.../JobBoardProviderConfiguration.cs`                          | Main aggregate root entity           |
| `Setting.Domain/.../AuthConfigurationValue.cs`                                 | Authentication settings value object |
| `Setting.Domain/.../SyncStateValue.cs`                                         | Sync tracking value object           |
| `Setting.Application/.../EntityDtos/JobBoardProviderConfigurationEntityDto.cs` | Reusable entity DTO                  |

---

## Provider Implementation

### Provider Interface

```csharp
/// <summary>
/// Strategy interface for job board application providers.
/// Each job board (ITViec, VietnamWorks, etc.) implements this interface.
/// Supports paged data fetching to prevent memory overflow.
/// </summary>
public interface IJobBoardApplicationProvider
{
    /// <summary>Provider type this implementation handles</summary>
    JobBoardProviderType ProviderType { get; }

    /// <summary>Supported methods for fetching applications (Email, API, Hybrid)</summary>
    FetchMethod[] SupportedFetchMethods { get; }

    /// <summary>Authenticate with the job board API</summary>
    Task<ProviderAuthResult> AuthenticateAsync(
        JobBoardProviderConfiguration config,
        CancellationToken cancellationToken = default);

    /// <summary>Get total count of jobs from the provider (for pagination planning)</summary>
    Task<int> GetJobsCountAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        CancellationToken cancellationToken = default);

    /// <summary>Fetch a page of jobs with skip/take pagination</summary>
    Task<PagedResult<ProviderJob>> GetJobsPagedAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>Get total count of applications for a specific job</summary>
    Task<int> GetApplicationsCountAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        string jobId,
        CancellationToken cancellationToken = default);

    /// <summary>Fetch a page of applications for a specific job with skip/take pagination</summary>
    Task<PagedResult<ProviderApplicationRaw>> GetApplicationsPagedAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        string jobId,
        int skip,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>Detect which jobs have new applications based on sync state</summary>
    List<JobWithNewApplications> DetectJobsWithNewApplications(
        List<ProviderJob> jobs,
        SyncStateValue syncState);

    /// <summary>Filter applications that haven't been processed yet</summary>
    List<ProviderApplicationRaw> FilterNewApplications(
        List<ProviderApplicationRaw> applications,
        SyncStateValue syncState);

    /// <summary>Map raw applications to normalized ProviderApplication model</summary>
    List<ProviderApplication> MapToProviderApplications(
        List<ProviderApplicationRaw> rawApplications,
        ProviderJob job,
        JobBoardProviderConfiguration config);

    /// <summary>Download a CV file from the job board</summary>
    Task<CvDownloadResult> DownloadCvAsync(
        ProviderAuthResult auth,
        string downloadUrl,
        CancellationToken cancellationToken = default);
}
```

### Base Provider Template

```csharp
/// <summary>
/// Template Method base class providing common API provider logic.
/// Concrete providers override specific steps.
/// Supports paged data fetching to prevent memory overflow.
/// </summary>
public abstract class BaseApiJobBoardProvider : IJobBoardApplicationProvider
{
    /// <summary>
    /// Per-config authentication locks to prevent race conditions when multiple
    /// concurrent requests try to authenticate for the same configuration.
    /// Uses SemaphoreSlim(1,1) as an async-compatible mutex.
    /// </summary>
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> AuthLocks = new();

    // Abstract properties - must be implemented by concrete providers
    public abstract JobBoardProviderType ProviderType { get; }
    public abstract FetchMethod[] SupportedFetchMethods { get; }

    // Abstract methods - provider-specific implementation
    protected abstract Task<ProviderAuthResult> AuthenticateWithProviderAsync(
        JobBoardProviderConfiguration config,
        CancellationToken cancellationToken);

    protected abstract Task<int> GetJobsCountInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        CancellationToken cancellationToken);

    protected abstract Task<List<ProviderJob>> GetJobsPagedInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        int skip,
        int take,
        CancellationToken cancellationToken);

    protected abstract Task<int> GetApplicationsCountInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        string jobId,
        CancellationToken cancellationToken);

    protected abstract Task<List<ProviderApplicationRaw>> GetApplicationsPagedInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        string jobId,
        int skip,
        int take,
        CancellationToken cancellationToken);

    // Template method: AuthenticateAsync (handles token caching with double-checked locking)
    public async Task<ProviderAuthResult> AuthenticateAsync(
        JobBoardProviderConfiguration config,
        CancellationToken cancellationToken = default)
    {
        // Step 1: Check for cached valid token (fast path - no lock needed)
        var cachedToken = await TokenRepository.GetValidTokenAsync(config.Id, cancellationToken);
        if (cachedToken != null)
            return ProviderAuthResult.Succeeded(cachedToken.AccessToken, cachedToken.TokenType, cachedToken.ExpiresAt);

        // Step 2: Acquire per-config lock to prevent concurrent authentications
        var authLock = AuthLocks.GetOrAdd(config.Id, _ => new SemaphoreSlim(1, 1));

        await authLock.WaitAsync(cancellationToken);
        try
        {
            // Step 3: Double-check cache after acquiring lock
            // Another thread may have already authenticated while we were waiting
            cachedToken = await TokenRepository.GetValidTokenAsync(config.Id, cancellationToken);
            if (cachedToken != null)
                return ProviderAuthResult.Succeeded(cachedToken.AccessToken, cachedToken.TokenType, cachedToken.ExpiresAt);

            // Step 4: Authenticate with provider (implemented by concrete class)
            var result = await AuthenticateWithProviderAsync(config, cancellationToken);

            // Step 5: Cache the new token
            if (result.Success && result.AccessToken != null && result.ExpiresAt.HasValue)
                await TokenRepository.SaveTokenAsync(config.Id, result.AccessToken, result.TokenType ?? "Bearer", result.ExpiresAt.Value, cancellationToken);

            return result;
        }
        finally
        {
            authLock.Release();
        }
    }
}
```

#### Authentication Concurrency Handling

The `AuthenticateAsync` method uses **double-checked locking pattern** to prevent race conditions:

```text
Thread A                           Thread B
   │                                  │
   ├─ Check cache → miss              │
   │                                  ├─ Check cache → miss
   ├─ Acquire lock ✓                  │
   │                                  ├─ Wait on lock...
   ├─ Double-check cache → miss       │
   ├─ Authenticate with provider      │
   ├─ Cache token                     │
   ├─ Release lock                    │
   │                                  ├─ Acquire lock ✓
   │                                  ├─ Double-check cache → HIT ✓
   │                                  └─ Return cached token (no API call)
```

This ensures that:

- Only one authentication request is made per configuration at a time
- Subsequent requests reuse the cached token
- No redundant API calls to job board providers
- Rate limiting is respected

### ITViec Provider Implementation

> **API Documentation**: <https://itviec.com/customer/api-documents>

```csharp
/// <summary>
/// ITViec job board API provider implementation.
/// Handles authentication, job listing, application fetching, and CV download.
/// Supports paged data fetching to prevent memory overflow.
/// </summary>
/// <remarks>
/// API Documentation: https://itviec.com/customer/api-documents
///
/// Key API Endpoints:
/// - POST /oauth.json - Authentication (returns access_token)
/// - GET /jobs.json?page={n} - List jobs with pagination
/// - GET /jobs/{id}/job_applications.json?page={n} - List applications for a job
///
/// Authentication: OAuth2 client credentials flow with client_id and client_secret.
/// Response Format: JSON with snake_case property names.
/// Pagination: Page-based (1-indexed), page size determined by first response.
/// </remarks>
public sealed class ITViecApiProvider : BaseApiJobBoardProvider
{
    public override JobBoardProviderType ProviderType => JobBoardProviderType.ITViec;
    public override FetchMethod[] SupportedFetchMethods => [FetchMethod.API];

    protected override async Task<ProviderAuthResult> AuthenticateWithProviderAsync(
        JobBoardProviderConfiguration config,
        CancellationToken cancellationToken)
    {
        var authConfig = config.AuthConfiguration;
        var clientSecret = EncryptionService.Decrypt(authConfig.ClientSecret);

        // Request body format for ITViec OAuth
        var requestBody = new
        {
            token = new
            {
                client_id = authConfig.ClientId,
                client_secret = clientSecret
            }
        };

        var response = await httpClient.PostAsJsonAsync(
            $"{authConfig.BaseUrl}/oauth.json",
            requestBody,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var authResponse = await response.Content.ReadFromJsonAsync<ITViecAuthResponse>(cancellationToken);

        // ITViec returns expires_in as Unix timestamp
        var expiresAt = DateTimeOffset.FromUnixTimeSeconds(authResponse.ExpiresIn).UtcDateTime;

        return ProviderAuthResult.Succeeded(authResponse.AccessToken, authResponse.TokenType, expiresAt);
    }

    protected override async Task<List<ProviderJob>> GetJobsPagedInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        // Convert skip/take to page-based pagination (ITViec uses page numbers starting from 1)
        var pageSize = await DeterminePageSizeAsync(httpClient, config, cancellationToken);
        var startPage = (skip / pageSize) + 1;

        var response = await httpClient.GetAsync(
            $"{config.AuthConfiguration.BaseUrl}/jobs.json?page={startPage}",
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var jobsResponse = await response.Content.ReadFromJsonAsync<ITViecJobsResponse>(cancellationToken);

        return jobsResponse.Jobs.Select(j => new ProviderJob(
            j.Id,
            j.Title,
            j.NumberOfApplications,
            j.Status
        )).ToList();
    }
}
```

### Provider Factory

```csharp
/// <summary>
/// Factory implementation that resolves providers from DI container.
/// Implements the Factory pattern for provider instantiation.
/// </summary>
public sealed class JobBoardProviderFactory : IJobBoardProviderFactory
{
    private static readonly Dictionary<JobBoardProviderType, Type> ProviderTypeMap = new()
    {
        [JobBoardProviderType.ITViec] = typeof(ITViecApiProvider)
        // Add new providers here
    };

    private readonly IServiceProvider serviceProvider;

    public IJobBoardApplicationProvider GetProvider(JobBoardProviderType providerType)
    {
        if (!ProviderTypeMap.TryGetValue(providerType, out var implementationType))
        {
            throw new NotSupportedException(
                $"Provider type '{providerType}' is not supported. " +
                $"Supported types: {string.Join(", ", ProviderTypeMap.Keys)}");
        }

        return (IJobBoardApplicationProvider)serviceProvider.GetRequiredService(implementationType);
    }

    public bool IsProviderSupported(JobBoardProviderType providerType)
        => ProviderTypeMap.ContainsKey(providerType);

    public IReadOnlyList<JobBoardProviderType> GetSupportedProviderTypes()
        => ProviderTypeMap.Keys.ToList().AsReadOnly();
}
```

### Key Provider Files

| File                                                                               | Purpose                    |
| ---------------------------------------------------------------------------------- | -------------------------- |
| `Candidate.Application/.../Providers/Abstractions/IJobBoardApplicationProvider.cs` | Strategy interface         |
| `Candidate.Application/.../Providers/Base/BaseApiJobBoardProvider.cs`              | Template method base       |
| `Candidate.Application/.../Providers/ITViec/ITViecApiProvider.cs`                  | ITViec implementation      |
| `Candidate.Application/.../Providers/ITViec/ITViecApiModels.cs`                    | ITViec API response models |
| `Candidate.Application/.../Providers/JobBoardProviderFactory.cs`                   | Factory for providers      |

---

## Sync Process Flow

### Sequence Diagram

```
┌─────────┐     ┌─────────────┐     ┌───────────┐     ┌─────────────┐     ┌──────────┐
│Scheduler│     │MessageBus   │     │Consumer   │     │SyncService  │     │Provider  │
└────┬────┘     └──────┬──────┘     └─────┬─────┘     └──────┬──────┘     └────┬─────┘
     │                 │                   │                  │                 │
     │ [Every 5 min]   │                   │                  │                 │
     │────────────────►│                   │                  │                 │
     │ Send Trigger    │                   │                  │                 │
     │ Message         │                   │                  │                 │
     │                 │                   │                  │                 │
     │                 │ Deliver Message   │                  │                 │
     │                 │──────────────────►│                  │                 │
     │                 │                   │                  │                 │
     │                 │                   │ Process Message  │                 │
     │                 │                   │─────────────────►│                 │
     │                 │                   │                  │                 │
     │                 │                   │                  │ For each config │
     │                 │                   │                  │────────────────►│
     │                 │                   │                  │                 │
     │                 │                   │                  │  1. Authenticate│
     │                 │                   │                  │◄────────────────│
     │                 │                   │                  │                 │
     │                 │                   │                  │  2. Fetch Jobs  │
     │                 │                   │                  │────────────────►│
     │                 │                   │                  │◄────────────────│
     │                 │                   │                  │                 │
     │                 │                   │                  │  3. Detect New  │
     │                 │                   │                  │  Applications   │
     │                 │                   │                  │────────────────►│
     │                 │                   │                  │◄────────────────│
     │                 │                   │                  │                 │
     │                 │                   │                  │  4. Fetch Apps  │
     │                 │                   │                  │────────────────►│
     │                 │                   │                  │◄────────────────│
     │                 │                   │                  │                 │
     │                 │                   │                  │  5. Download CVs│
     │                 │                   │                  │────────────────►│
     │                 │                   │                  │◄────────────────│
     │                 │                   │                  │                 │
     │                 │                   │  6. Update State │                 │
     │                 │                   │◄─────────────────│                 │
     │                 │                   │                  │                 │
```

### Detailed Flow Steps

#### Step 1: Scheduled Trigger (Setting Service)

```csharp
// JobBoardApiSyncSchedulerHostedService.cs
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        await syncMessageProvider.SendSyncTriggerMessagesAsync();
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
    }
}
```

#### Step 2: Message Production (Setting Service)

```csharp
// JobBoardApiSyncMessageProvider.cs
public async Task SendSyncTriggerMessagesAsync(int pagingDelayMs = 1000)
{
    // Fetch enabled API configurations with paging
    var configs = await configRepository.GetAllAsync(
        JobBoardProviderConfiguration.EnabledApiProvidersExpr());

    // Build and send message
    var message = new JobBoardApiTriggerSyncRequestBusMessage
    {
        Data = configs
            .Where(c => c.AuthConfiguration.HasValidCredentials())
            .Select(c => new JobBoardApiTriggerSyncRequestBusMessage.Item(c))
            .ToList()
    };

    await busMessageProducer.SendAsync(message);
}
```

#### Step 3: Message Consumption (Candidate Service)

```csharp
// JobBoardApiTriggerSyncRequestBusMessageConsumer.cs
protected override async Task HandleLogicAsync(
    JobBoardApiTriggerSyncRequestBusMessage message,
    string routingKey)
{
    await syncService.SyncFromMessageAsync(message);
}
```

#### Step 4: Sync Processing (Candidate Service)

```csharp
// JobBoardApplicationSyncService.cs
public async Task SyncFromMessageAsync(JobBoardApiTriggerSyncRequestBusMessage message)
{
    // Process configurations in parallel (max 5 concurrent)
    await message.Data.ParallelAsync(
        async configItem => await SyncConfigurationAsync(configItem),
        maxConcurrent: 5);
}

private async Task SyncConfigurationAsync(ConfigItem config)
{
    // 1. Get appropriate provider
    var provider = providerFactory.GetProvider(config.ProviderType);

    // 2. Fetch all jobs with paging
    var allJobs = new List<JobBoardJob>();
    var page = 1;
    JobBoardJobsResult result;
    do
    {
        result = await provider.FetchJobsAsync(config, page++, JobPageSize);
        allJobs.AddRange(result.Jobs);
    } while (result.HasMore);

    // 3. Detect jobs with new applications
    var jobsWithNewApps = DetectJobsWithNewApplications(allJobs, config.SyncState);

    // 4. Fetch and process new applications
    foreach (var job in jobsWithNewApps)
    {
        var applications = await FetchAllApplicationsAsync(provider, config, job.ExternalId);
        var newApps = FilterNewApplications(applications, config.SyncState);

        // 5. Download CVs in parallel (max 3 concurrent)
        await newApps.ParallelAsync(
            async app => await DownloadAndProcessCvAsync(provider, config, app),
            maxConcurrent: 3);

        // 6. Update sync state
        config.SyncState.MarkSuccess(newApps.Count);
    }
}
```

### Sync State Tracking

The `SyncStateValue` tracks sync progress using date-based filtering with automatic cleanup:

```csharp
public sealed class SyncStateValue
{
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    public const int StaleJobThresholdDays = 90;   // Jobs not seen for this period are pruned
    public const int MaxTrackedJobs = 5000;        // Prevents unbounded growth

    // ═══════════════════════════════════════════════════════════════════════════
    // TIMING
    // ═══════════════════════════════════════════════════════════════════════════
    public DateTime? LastSyncedAt { get; set; }
    public DateTime? LastSuccessfulSyncAt { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATE-BASED FILTERING (PRIMARY mechanism for applications)
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// The SubmittedAt date of the newest processed application.
    /// Used for early termination: stop pagination when app.SubmittedAt < this date.
    /// </summary>
    public DateTime? LastProcessedApplicationDate { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // JOB TRACKING (with timestamps for cleanup)
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Job-level tracking with LastSeenAt timestamps.
    /// Jobs not seen for StaleJobThresholdDays are pruned automatically.
    /// </summary>
    public Dictionary<string, JobSyncInfo> JobSyncInfos { get; set; } = [];

    // ═══════════════════════════════════════════════════════════════════════════
    // SAME-DATE ID TRACKING (for duplicates when dates are equal)
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Application IDs where SubmittedAt == LastProcessedApplicationDate.
    /// Reset when LastProcessedApplicationDate changes.
    /// Much smaller than old 10k list (typically 10-100 entries).
    /// </summary>
    public List<string> SameDateProcessedIds { get; set; } = [];

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS & ERROR TRACKING
    // ═══════════════════════════════════════════════════════════════════════════
    public long TotalApplicationsProcessed { get; set; }
    public int ConsecutiveFailureCount { get; set; }
    public List<SyncError> RecentErrors { get; set; } = [];

    // ═══════════════════════════════════════════════════════════════════════════
    // METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    public int GetJobApplicationCount(string jobId) { ... }
    public (bool IsNew, bool ShouldContinue) CheckApplicationStatus(string applicationId, DateTime submittedAt) { ... }
    public void UpdateJobInfo(string jobId, int applicationCount) { ... }
    public void PruneStaleJobs() { ... }
    public void UpdateLastProcessedDate(DateTime newestDate, List<string> sameDateApplicationIds) { ... }
    public void RecordError(string message, string? stackTrace = null) { ... }
    public void MarkSuccess(int applicationsProcessed = 0) { ... }
    public void MarkFailed() { ... }
}

public sealed class JobSyncInfo
{
    public int ApplicationCount { get; set; }  // Number of applications for this job
    public DateTime LastSeenAt { get; set; }   // When this job was last seen in API response
}
```

**Key Design Principles:**

1. **Date-based filtering**: Primary mechanism for detecting new applications (efficient pagination)
2. **Job cleanup**: Auto-prune stale jobs not seen for 90 days (`StaleJobThresholdDays`)
3. **Bounded storage**: Limit jobs to 5000 (`MaxTrackedJobs`) to prevent unbounded growth
4. **Same-date ID tracking**: Small set for edge case when multiple apps have same SubmittedAt

---

## API Reference

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
        "authType": 0,                       // OAuth2ClientCredentials
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

**Response:**

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

**Response:**

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
      "authType": 0,
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

**Response:**

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

| Role           | Permissions                                              |
| -------------- | -------------------------------------------------------- |
| System Admin   | Can manage configurations for any company                |
| Org Unit Admin | Can only manage configurations for their current company |
| Other Roles    | No access                                                |

---

## Frontend Components

### Component Hierarchy

```
JobBoardIntegrationPage (Container)
├── ProviderListComponent
│   ├── ProviderCardComponent
│   └── ProviderConfigFormComponent
├── EmailSettingsComponent
│   ├── ImapCredentialsFormComponent
│   └── OAuthConnectionComponent
└── SyncDashboardComponent
    ├── SyncStatusCardComponent
    └── SyncHistoryTableComponent
```

### Key Components

| Component | Type | Purpose | Path |
|-----------|------|---------|------|
| ProviderListComponent | Container | Lists all job board providers | `apps/bravo-setting/src/app/routes/job-board/` |
| ProviderConfigFormComponent | Form | Configure API credentials | `apps/bravo-setting/src/app/routes/job-board/` |
| EmailSettingsComponent | Form | Configure IMAP settings | `apps/bravo-setting/src/app/routes/job-board/` |
| SyncDashboardComponent | Presentational | Shows sync status and history | `apps/bravo-setting/src/app/routes/job-board/` |

---

## Backend Controllers

### JobBoardProviderConfigurationController

**Location**: `src/Services/Setting/Setting.Service/Controllers/JobBoardProviderConfigurationController.cs`

| Action | Method | Route | Command/Query |
|--------|--------|-------|---------------|
| GetList | GET | `/api/JobBoardProviderConfiguration` | GetJobBoardProviderConfigurationsQuery |
| GetById | GET | `/api/JobBoardProviderConfiguration/{id}` | GetJobBoardProviderConfigurationByIdQuery |
| Save | POST | `/api/JobBoardProviderConfiguration` | SaveJobBoardProviderConfigurationCommand |
| Delete | DELETE | `/api/JobBoardProviderConfiguration/{id}` | DeleteJobBoardProviderConfigurationCommand |
| TriggerSync | POST | `/api/JobBoardProviderConfiguration/trigger-sync` | TriggerJobBoardApiSyncCommand |

### EmailScanningController

**Location**: `src/Services/Setting/Setting.Service/Controllers/EmailScanningController.cs`

| Action | Method | Route | Command/Query |
|--------|--------|-------|---------------|
| GetSettings | GET | `/api/EmailScanning/settings` | GetEmailScanningSettingsQuery |
| SaveSettings | POST | `/api/EmailScanning/settings` | SaveEmailScanningSettingsCommand |
| TestConnection | POST | `/api/EmailScanning/test-connection` | TestImapConnectionCommand |
| TriggerScan | POST | `/api/EmailScanning/trigger-scan` | TriggerScanMailBoxCommand |

**Evidence**: `Setting.Service/Controllers/*.cs`

---

## Message Bus Integration

### Message Format

```csharp
public sealed class JobBoardApiTriggerSyncRequestBusMessage : PlatformBusMessage
{
    public List<Item> Data { get; set; } = [];

    public sealed class Item
    {
        public string ConfigurationId { get; set; }
        public string CompanyId { get; set; }
        public JobBoardProviderType ProviderType { get; set; }
        public FetchMethod FetchMethod { get; set; }
        public string? DisplayName { get; set; }
        public AuthConfigurationItem AuthConfiguration { get; set; }
        public SyncStateItem SyncState { get; set; }
    }

    public sealed class AuthConfigurationItem
    {
        public AuthType AuthType { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }  // Encrypted
        public string BaseUrl { get; set; }
        public int TimeoutSeconds { get; set; }
        public int MaxRetryAttempts { get; set; }
        public Dictionary<string, string>? CustomHeaders { get; set; }
    }

    public sealed class SyncStateItem
    {
        public DateTime? LastSyncedAt { get; set; }
        public DateTime? LastSuccessfulSyncAt { get; set; }
        public DateTime? LastProcessedApplicationDate { get; set; }
        public Dictionary<string, JobSyncInfoItem> JobSyncInfos { get; set; }
        public List<string> SameDateProcessedIds { get; set; }
        public long TotalApplicationsProcessed { get; set; }
        public int ConsecutiveFailureCount { get; set; }
    }

    public sealed class JobSyncInfoItem
    {
        public int ApplicationCount { get; set; }
        public DateTime LastSeenAt { get; set; }
    }
}
```

### Sync State Update Request Message

After sync completes (success or failure), Candidate service sends a request to Setting service to update the sync state:

```csharp
public sealed class SettingUpdateJobBoardSyncStateRequestBusMessage : PlatformTrackableBusMessage
{
    public string ConfigurationId { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public SyncResultData? Result { get; set; }

    public sealed class SyncResultData
    {
        public int ApplicationsProcessed { get; set; }
        public DateTime SyncCompletedAt { get; set; }
        public DateTime? LastProcessedApplicationDate { get; set; }
        public Dictionary<string, JobSyncInfoData> JobSyncInfos { get; set; }
        public List<string> SameDateProcessedIds { get; set; }
    }

    public sealed class JobSyncInfoData
    {
        public int ApplicationCount { get; set; }
        public DateTime LastSeenAt { get; set; }
    }
}
```

**Design Note**: This uses the **Request pattern** where Setting service owns the contract. This keeps Setting service agnostic to specific callers - any service can send sync state updates.

### Message Flow

**Trigger Sync (Setting → Candidate)**:

1. **Producer** (Setting Service): `JobBoardApiSyncMessageProvider`
2. **Message**: `JobBoardApiTriggerSyncRequestBusMessage`
3. **Consumer** (Candidate Service): `JobBoardApiTriggerSyncRequestBusMessageConsumer`

**Update Sync State (Candidate → Setting)**:

1. **Producer** (Candidate Service): `JobBoardApplicationSyncService`
2. **Message**: `SettingUpdateJobBoardSyncStateRequestBusMessage`
3. **Consumer** (Setting Service): `SettingUpdateJobBoardSyncStateRequestBusMessageConsumer`

---

## Permission System

### Role Permissions

| Role | View Config | Create | Edit | Delete | Trigger Sync |
|------|:-----------:|:------:|:----:|:------:|:------------:|
| System Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Org Unit Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| HR Manager | ✅ | ❌ | ❌ | ❌ | ✅ |
| Other Roles | ❌ | ❌ | ❌ | ❌ | ❌ |

### Permission Checks

**Backend Authorization**:
```csharp
// Evidence: JobBoardProviderConfigurationController.cs
[PlatformAuthorize(PlatformRoles.SystemAdmin, PlatformRoles.OrgUnitAdmin)]
public async Task<IActionResult> Save([FromBody] SaveJobBoardProviderConfigurationCommand command)
```

**Frontend Authorization**:
```typescript
// Evidence: provider-config.component.ts
@if (hasRole(PlatformRoles.SystemAdmin) || hasRole(PlatformRoles.OrgUnitAdmin)) {
  <button class="provider-config__save-btn">Save Configuration</button>
}
```

### Data Scope Rules

| Scope | Rule |
|-------|------|
| Company | Users can only access configurations for their current company |
| Provider | API credentials are encrypted and only decrypted during sync |
| Audit | All configuration changes are logged with user context |

---

## Configuration Guide

### appsettings.json

```json
{
  "JobBoardProviderConfiguration": {
    "EncryptionKey": "your-32-character-encryption-key",
    "SyncIntervalMinutes": 5,
    "MaxConcurrentSyncs": 5,
    "MaxConcurrentCvDownloads": 3,
    "JobPageSize": 50,
    "ApplicationPageSize": 100,
    "MaxRecentErrors": 10
  }
}
```

**Note**: The following sync state limits are defined as constants in `SyncStateValue`:

- `StaleJobThresholdDays = 90` - Jobs not seen for 90 days are auto-pruned
- `MaxTrackedJobs = 5000` - Maximum number of jobs tracked to prevent unbounded growth

### Environment Variables

```bash
# Encryption key for credentials (required)
JobBoardProviderConfiguration__EncryptionKey=your-32-character-key

# Fallback to existing email encryption key
OrganizationalUnitEmailSettings__EmailPasswordEncryptionKey=your-key
```

### Default Values

| Setting                  | Default | Description                       |
| ------------------------ | ------- | --------------------------------- |
| SyncIntervalMinutes      | 5       | Minutes between sync cycles       |
| MaxConcurrentSyncs       | 5       | Max parallel configuration syncs  |
| MaxConcurrentCvDownloads | 3       | Max parallel CV downloads         |
| JobPageSize              | 50      | Jobs per API page                 |
| ApplicationPageSize      | 100     | Applications per API page         |
| MaxRecentErrors          | 10      | Recent errors to keep             |
| TimeoutSeconds           | 30      | API request timeout               |
| MaxRetryAttempts         | 3       | API retry attempts                |
| StaleJobThresholdDays    | 90      | Days before stale jobs are pruned |
| MaxTrackedJobs           | 5,000   | Max jobs tracked in JobSyncInfos  |

---

## Adding New Providers

### Step 1: Add Provider Type

```csharp
// Setting.Domain/.../Enums/JobBoardProviderType.cs
public enum JobBoardProviderType
{
    // ... existing values
    NewProvider = 8
}
```

### Step 2: Create Provider Implementation

```csharp
// Candidate.Application/.../Providers/NewProvider/NewProviderApiProvider.cs
public sealed class NewProviderApiProvider : BaseApiJobBoardProvider
{
    public NewProviderApiProvider(
        IHttpClientFactory httpClientFactory,
        ILogger<NewProviderApiProvider> logger,
        IEncryptionService encryptionService,
        IProviderCachedAuthTokenRepository tokenRepository)
        : base(httpClientFactory, logger, encryptionService, tokenRepository)
    {
    }

    // =========================================================================
    // PROVIDER IDENTITY
    // =========================================================================

    public override JobBoardProviderType ProviderType => JobBoardProviderType.NewProvider;

    public override FetchMethod[] SupportedFetchMethods => [FetchMethod.API];

    // =========================================================================
    // AUTHENTICATION (required override)
    // =========================================================================

    protected override async Task<ProviderAuthResult> AuthenticateWithProviderAsync(
        JobBoardProviderConfiguration config,
        CancellationToken cancellationToken)
    {
        // Implement provider-specific OAuth/API authentication
        // Return ProviderAuthResult.Succeeded(token, tokenType, expiresAt) or
        // Return ProviderAuthResult.Failed(errorMessage)
    }

    // =========================================================================
    // JOBS - PAGED FETCHING (required overrides)
    // =========================================================================

    protected override async Task<int> GetJobsCountInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        CancellationToken cancellationToken)
    {
        // Return total count of jobs from provider API
    }

    protected override async Task<List<ProviderJob>> GetJobsPagedInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        // Implement job fetching with skip/take pagination
        // Convert provider's page-based pagination to skip/take if needed
    }

    // =========================================================================
    // APPLICATIONS - PAGED FETCHING (required overrides)
    // =========================================================================

    protected override async Task<int> GetApplicationsCountInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        string jobId,
        CancellationToken cancellationToken)
    {
        // Return total count of applications for the specified job
    }

    protected override async Task<List<ProviderApplicationRaw>> GetApplicationsPagedInternalAsync(
        JobBoardProviderConfiguration config,
        ProviderAuthResult auth,
        string jobId,
        int skip,
        int take,
        CancellationToken cancellationToken)
    {
        // Implement application fetching with skip/take pagination
    }
}
```

### Step 3: Register in Factory

```csharp
// Candidate.Application/.../Providers/JobBoardProviderFactory.cs
public IJobBoardApplicationProvider GetProvider(JobBoardProviderType providerType)
{
    return providerType switch
    {
        // ... existing providers
        JobBoardProviderType.NewProvider => serviceProvider.GetRequiredService<NewProviderApiProvider>(),
        _ => throw new NotSupportedException($"Provider {providerType} not supported")
    };
}
```

### Step 4: Register DI

```csharp
// Candidate.Application/.../ScanMailBoxPlatformModule.cs
services.AddScoped<NewProviderApiProvider>();
```

### Step 5: Add Local Models (if needed)

```csharp
// Candidate.Application/.../Providers/Abstractions/JobBoardProviderModels.cs
// Add any provider-specific response models
```

---

## Security Considerations

### Credential Encryption

All sensitive credentials are encrypted before storage:

```csharp
// Encryption on save
ClientSecret = SecurityHelper.EncryptText(dto.ClientSecret, encryptionKey);

// Decryption on use (in provider)
var decryptedSecret = encryptionService.Decrypt(config.AuthConfiguration.ClientSecret);
```

### Security Best Practices

1. **Never log credentials**: Ensure secrets are not logged
2. **Encryption at rest**: ClientSecret stored encrypted in database
3. **Token caching**: Auth tokens cached with expiration
4. **HTTPS only**: All API calls use HTTPS
5. **Role-based access**: Only admins can manage configurations
6. **Audit trail**: CreatedBy/LastUpdatedBy tracked
7. **SSRF prevention**: All external URLs validated before requests

### SSRF Prevention

Server-Side Request Forgery (SSRF) attacks are prevented through URL validation in `BaseApiJobBoardProvider`:

```csharp
// URL validation is performed before any external requests
protected void ValidateBaseUrl(string url)
{
    // 1. Validates URL format and scheme (HTTPS required)
    // 2. Blocks private/internal IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x)
    // 3. Blocks localhost and internal hostnames
    // 4. Throws JobBoardSecurityException on validation failure
}

protected void ValidateDownloadUrl(string url, string baseUrl)
{
    // 1. Validates URL format
    // 2. Ensures download URL matches the configured BaseUrl domain
    // 3. Prevents redirect-based SSRF attacks
}
```

**Blocked URL Patterns:**

- `http://` (non-HTTPS)
- `localhost`, `127.0.0.1`, `::1`
- Private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Internal hostnames without domain

**Exception Handling:**

```csharp
public class JobBoardSecurityException : JobBoardProviderException
{
    // Thrown when URL validation fails
    // Contains provider type and security violation details
}
```

### API Response Security

The `AuthConfigurationDisplayDto` never exposes the actual secret:

```csharp
public sealed class AuthConfigurationDisplayDto
{
    public string ClientId { get; set; }
    public bool HasClientSecret { get; set; }  // Only indicates presence
    // ClientSecret is NEVER exposed in API responses
}
```

---

## Performance Tuning

### Pagination Configuration

Adjust page sizes based on provider API limits and memory:

```json
{
  "JobBoardProviderConfiguration": {
    "JobPageSize": 50, // Reduce if memory issues
    "ApplicationPageSize": 100 // Adjust per provider
  }
}
```

### Concurrency Settings

Balance between speed and resource usage:

```json
{
  "JobBoardProviderConfiguration": {
    "MaxConcurrentSyncs": 5, // Reduce if DB bottleneck
    "MaxConcurrentCvDownloads": 3 // Reduce if network issues
  }
}
```

### Memory Management

The `SyncStateValue` uses multiple strategies to prevent unbounded growth:

**1. Date-Based Application Filtering** - Uses `LastProcessedApplicationDate` instead of storing all processed IDs:

```csharp
// Only track IDs for applications with same date as newest processed
public List<string> SameDateProcessedIds { get; set; } = [];  // Typically ~100 entries
```

**2. Job Auto-Cleanup** - Stale jobs are automatically pruned:

```csharp
public void PruneStaleJobs()
{
    var cutoffDate = Clock.UtcNow.AddDays(-StaleJobThresholdDays);  // 90 days

    // Remove stale jobs not seen since cutoff
    var staleJobIds = JobSyncInfos
        .Where(kv => kv.Value.LastSeenAt < cutoffDate)
        .Select(kv => kv.Key)
        .ToList();

    foreach (var jobId in staleJobIds)
        JobSyncInfos.Remove(jobId);

    // Limit to max tracked jobs (keep most recently seen)
    if (JobSyncInfos.Count > MaxTrackedJobs)
    {
        JobSyncInfos = JobSyncInfos
            .OrderByDescending(kv => kv.Value.LastSeenAt)
            .Take(MaxTrackedJobs)
            .ToDictionary(kv => kv.Key, kv => kv.Value);
    }
}
```

### Database Indexes

Ensure these indexes exist for optimal query performance:

```javascript
// MongoDB indexes for JobBoardProviderConfiguration
db.JobBoardProviderConfiguration.createIndex({ CompanyId: 1 });
db.JobBoardProviderConfiguration.createIndex(
  { CompanyId: 1, ProviderType: 1 },
  { unique: true }
);
db.JobBoardProviderConfiguration.createIndex({ IsEnabled: 1, FetchMethod: 1 });
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Symptoms**: `401 Unauthorized` errors in logs

**Causes**:

- Invalid ClientId/ClientSecret
- Expired credentials
- Incorrect BaseUrl

**Resolution**:

```bash
# Check configuration
GET /api/job-board-provider-configuration/{id}

# Verify credentials with provider
# Update configuration with correct credentials
POST /api/job-board-provider-configuration/save
```

#### 2. Sync Not Running

**Symptoms**: `LastSyncedAt` not updating

**Causes**:

- Configuration disabled
- Invalid credentials (validation fails)
- Message bus connection issues

**Resolution**:

```sql
-- Check configuration status
db.JobBoardProviderConfiguration.find({ IsEnabled: true, FetchMethod: 1 })

-- Check for errors in sync state
db.JobBoardProviderConfiguration.find({}, { "SyncState.RecentErrors": 1 })
```

#### 3. Duplicate Applications

**Symptoms**: Same applications imported multiple times

**Causes**:

- `LastProcessedApplicationDate` reset or incorrect
- `SameDateProcessedIds` cleared unexpectedly
- Application ID format changed by provider
- Provider API not sorting applications DESC by SubmittedAt

**Resolution**:

- Check `SyncState.LastProcessedApplicationDate` is properly set
- Verify `SyncState.SameDateProcessedIds` contains recent same-date IDs
- Verify provider's application ID and date consistency
- Ensure provider returns applications ordered DESC by SubmittedAt

#### 4. High Memory Usage

**Symptoms**: Service memory growing over time

**Causes**:

- Too many concurrent operations
- Large number of active jobs (>5000)

**Resolution**:

```json
{
  "JobBoardProviderConfiguration": {
    "MaxConcurrentSyncs": 3
  }
}
```

The system automatically manages memory through:

- `StaleJobThresholdDays = 90` - Auto-prunes jobs not seen for 90 days
- `MaxTrackedJobs = 5000` - Limits tracked jobs
- Date-based filtering with small `SameDateProcessedIds` list (~100 entries)

### Logging

Key log messages to monitor:

```csharp
// Success
"Sent {Count} JobBoardApiSync requests to message bus at {Now}"
"Successfully synced {Count} applications from {Provider} for company {CompanyId}"

// Warnings
"Slow JobBoard sync detected: {ConfigId} taking longer than 2 minutes"

// Errors
"Failed to authenticate with {Provider}: {Error}"
"Failed to fetch jobs from {Provider}: {Error}"
"CV download failed for application {AppId}: {Error}"
```

### Health Checks

Monitor these metrics:

| Metric                          | Healthy | Warning  | Critical |
| ------------------------------- | ------- | -------- | -------- |
| ConsecutiveFailureCount         | 0       | 1-3      | >3       |
| Time since LastSuccessfulSyncAt | <10min  | 10-30min | >30min   |
| RecentErrorsCount               | 0       | 1-5      | >5       |

---

## Test Specifications

This section provides comprehensive test specifications using the **Given...When...Then** (BDD) format for the Job Board Integration feature, organized by priority levels following industry best practices.

### Priority Legend

| Priority | Label       | Description                                     | When to Run              |
| -------- | ----------- | ----------------------------------------------- | ------------------------ |
| **P0**   | 🔴 Critical | Core functionality - system unusable if fails   | Every build, smoke tests |
| **P1**   | 🟠 High     | Main business flows, common use cases           | Every PR, regression     |
| **P2**   | 🟡 Medium   | Important but less frequent scenarios           | Daily/Weekly regression  |
| **P3**   | 🟢 Low      | Edge cases, boundary conditions, rare scenarios | Full regression only     |

### Test Case Summary

| Category                 | P0     | P1     | P2     | P3     | Total  |
| ------------------------ | ------ | ------ | ------ | ------ | ------ |
| Email-Based Scanning     | 3      | 5      | 4      | 5      | 17     |
| API-Based Integration    | 4      | 6      | 4      | 4      | 18     |
| Configuration Management | 2      | 4      | 3      | 2      | 11     |
| Security                 | 3      | 3      | 2      | 1      | 9      |
| Error Handling           | 2      | 5      | 4      | 4      | 15     |
| Performance              | 1      | 2      | 2      | 2      | 7      |
| **Total**                | **15** | **25** | **19** | **18** | **77** |

---

### Email-Based Scanning Test Specs

#### 🔴 P0 - Critical (Smoke Tests)

```gherkin
Feature: Email-Based Scanning - Critical Tests

  Background:
    Given a company "ACME Corp" exists with ID "company-001"
    And the company has JobBoardIntegration enabled
    And email scanning is configured with valid IMAP credentials

  @P0 @Smoke @Email
  Scenario: TS-EMAIL-P0-001 - IMAP connection and authentication
    Given valid IMAP credentials are configured:
      | Email       | hr@acme.com      |
      | Server      | imap.gmail.com   |
      | Port        | 993              |
      | SSL         | true             |
    When the ScanMailBox scheduled job triggers
    Then the system should connect to the IMAP server successfully
    And the system should authenticate without errors
    And the connection should be established within 30 seconds

  @P0 @Smoke @Email
  Scenario: TS-EMAIL-P0-002 - Basic email scanning and candidate creation
    Given an unread email exists in the inbox with:
      | From    | notifications@itviec.com                       |
      | Subject | John Doe applies for Senior Developer - ITviec |
    And the email has a PDF attachment "JohnDoe_CV.pdf"
    When the ScanMailBox scheduled job triggers
    Then a new Candidate record should be created with:
      | FirstName | John             |
      | LastName  | Doe              |
    And a new Application should be linked to job "Senior Developer"
    And the email should be marked as read

  @P0 @Smoke @Email
  Scenario: TS-EMAIL-P0-003 - Message bus integration works
    Given an application email is successfully processed
    When the system sends ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage
    Then the message should be published to RabbitMQ
    And the Candidate Service consumer should receive the message
```

#### 🟠 P1 - High Priority (Main Cases)

```gherkin
Feature: Email-Based Scanning - High Priority Tests

  @P1 @Email @ITViec
  Scenario: TS-EMAIL-P1-001 - Process ITViec application email with full extraction
    Given an unread ITViec email with:
      | From    | notifications@itviec.com                       |
      | Subject | John Doe applies for Senior Developer - ITviec |
      | ReplyTo | john.doe@email.com                             |
    And the email body contains candidate phone "0901234567"
    And attachment "CV_JohnDoe.pdf" exists
    When the ScanMailBox job processes the email
    Then candidate information should be extracted:
      | Field       | Value                |
      | FirstName   | John                 |
      | LastName    | Doe                  |
      | Email       | john.doe@email.com   |
      | Phone       | 0901234567           |
      | JobTitle    | Senior Developer     |
      | Source      | ITViec               |
    And CV should be uploaded to Azure Storage path "/scanmailbox/company-001/"

  @P1 @Email @VietnamWorks
  Scenario: TS-EMAIL-P1-002 - Process VietnamWorks application email
    Given an unread VietnamWorks email with:
      | From    | no-reply@vietnamworks.com.vn                                                  |
      | Subject | Nguyen Van A đã ứng tuyển vào vị trí Software Engineer thông qua VietnamWorks |
    When the ScanMailBox job processes the email
    Then candidate should be created with:
      | FirstName | Nguyen Van        |
      | LastName  | A                 |
      | JobTitle  | Software Engineer |
      | Source    | VietnamWorks      |

  @P1 @Email @TopCV
  Scenario: TS-EMAIL-P1-003 - Process TopCV application email
    Given an unread TopCV email with:
      | From    | notify@tuyendungtopcv.com                                  |
      | Subject | Le Thi B đã ứng tuyển công việc Marketing Manager [#12345] |
    When the ScanMailBox job processes the email
    Then candidate should be created with job title "Marketing Manager"
    And application source should be "TopCV"

  @P1 @Email @LinkedIn
  Scenario: TS-EMAIL-P1-004 - Process LinkedIn application email
    Given an unread LinkedIn email with:
      | From    | jobs-noreply@linkedin.com                        |
      | Subject | New application: Sales Executive from Tran Van C |
    When the ScanMailBox job processes the email
    Then candidate should be created with name "Tran Van C"
    And application source should be "LinkedIn"

  @P1 @Email @Duplicate
  Scenario: TS-EMAIL-P1-005 - Prevent duplicate candidate creation
    Given a Candidate already exists with email "existing@email.com"
    And an unread application email arrives for "existing@email.com"
    When the ScanMailBox job processes the email
    Then no new Candidate should be created
    And a new Application should be linked to the existing Candidate
```

#### 🟡 P2 - Medium Priority

```gherkin
Feature: Email-Based Scanning - Medium Priority Tests

  @P2 @Email @OAuth
  Scenario: TS-EMAIL-P2-001 - OAuth2 token refresh for Gmail
    Given the company uses OAuth2 authentication for Gmail
    And the current access token has expired
    And the refresh token is valid
    When the ScanMailBox job triggers
    Then the system should automatically refresh the OAuth2 token
    And email scanning should proceed successfully
    And the new token should be stored for future use

  @P2 @Email @Attachment
  Scenario: TS-EMAIL-P2-002 - Handle multiple CV attachments
    Given an email has multiple attachments:
      | Filename        | Type  | Size   |
      | CV_John.pdf     | PDF   | 500KB  |
      | Portfolio.pdf   | PDF   | 2MB    |
      | Photo.jpg       | Image | 100KB  |
    When the ScanMailBox job processes the email
    Then only PDF and DOC/DOCX files should be considered
    And the first valid CV "CV_John.pdf" should be selected
    And image attachments should be ignored

  @P2 @Email @Parallel
  Scenario: TS-EMAIL-P2-003 - Parallel processing with connection pooling
    Given 5 companies have email scanning enabled
    And max parallelism is set to 3
    When the ScanMailBox scheduler triggers for all companies
    Then only 3 IMAP connections should be active simultaneously
    And all 5 companies should be processed eventually
    And connections should be returned to pool after use

  @P2 @Email @CareerLink
  Scenario: TS-EMAIL-P2-004 - Process CareerLink HTML email
    Given an unread CareerLink email with HTML body containing:
      | Field               | HTML Content                              |
      | Job Title           | <b>Vị trí công việc:</b> DevOps Engineer  |
      | Candidate           | Pham Van D                                |
    When the ScanMailBox job processes the email
    Then job title should be extracted as "DevOps Engineer"
    And candidate name should be "Pham Van D"
```

#### 🟢 P3 - Low Priority (Edge Cases)

```gherkin
Feature: Email-Based Scanning - Edge Cases

  @P3 @Email @EdgeCase
  Scenario: TS-EMAIL-P3-001 - Handle Vietnamese special characters in name
    Given an email with subject "Đặng Thị Hồng Nhung applies for Developer - ITviec"
    When the ScanMailBox job processes the email
    Then candidate name should be correctly extracted:
      | FirstName | Đặng Thị Hồng  |
      | LastName  | Nhung          |
    And no character encoding issues should occur

  @P3 @Email @EdgeCase
  Scenario: TS-EMAIL-P3-002 - Handle email with no CV attachment
    Given an ITViec email with no attachments
    When the ScanMailBox job processes the email
    Then a Candidate should still be created
    And CvAttachmentUrl should be null
    And a warning should be logged: "No CV attachment found"

  @P3 @Email @EdgeCase
  Scenario: TS-EMAIL-P3-003 - Handle unrecognized job board email
    Given an unread email from "unknown@newjobboard.com"
    When the ScanMailBox job processes the inbox
    Then the email should be skipped
    And the email should remain unread
    And debug log should indicate "Unknown job board source"

  @P3 @Email @EdgeCase
  Scenario: TS-EMAIL-P3-004 - Handle very long job title
    Given an email with job title exceeding 500 characters
    When the ScanMailBox job processes the email
    Then the job title should be truncated to 500 characters
    And the candidate should still be created successfully

  @P3 @Email @EdgeCase
  Scenario: TS-EMAIL-P3-005 - Handle email with malformed subject line
    Given an ITViec email with malformed subject "applies for - ITviec"
    When the ScanMailBox job processes the email
    Then the system should handle gracefully
    And candidate should be created with empty name fields
    And a warning should be logged about parsing failure
```

---

### API-Based Integration Test Specs

#### 🔴 P0 - Critical (Smoke Tests)

```gherkin
Feature: API-Based Integration - Critical Tests

  @P0 @Smoke @API
  Scenario: TS-API-P0-001 - Provider configuration can be created
    Given a System Admin user is authenticated
    And a company "TechCorp" exists
    When creating a new ITViec provider configuration:
      | CompanyId    | company-002              |
      | ProviderType | ITViec                   |
      | DisplayName  | ITViec - Main            |
      | ClientId     | valid-client-id          |
      | ClientSecret | valid-secret             |
      | BaseUrl      | https://api.itviec.com   |
    Then the configuration should be created successfully
    And the ClientSecret should be encrypted in database

  @P0 @Smoke @API @ITViec
  Scenario: TS-API-P0-002 - ITViec OAuth2 authentication works
    Given a valid ITViec configuration exists
    When the system authenticates with ITViec API
    Then POST "/oauth.json" should return 200 OK
    And response should contain valid access_token
    And token should be cached for subsequent calls

  @P0 @Smoke @API
  Scenario: TS-API-P0-003 - Sync job fetches jobs and applications
    Given a valid ITViec configuration with cached token
    And ITViec has at least 1 active job with applications
    When the sync job runs
    Then jobs should be fetched from "/jobs.json"
    And applications should be fetched for each job
    And at least one Candidate record should be created

  @P0 @Smoke @API @MessageBus
  Scenario: TS-API-P0-004 - Scheduled sync triggers via message bus
    Given enabled API configurations exist
    When the sync scheduler interval elapses
    Then JobBoardApiTriggerSyncRequestBusMessage should be sent
    And Candidate Service consumer should receive and process it
```

#### 🟠 P1 - High Priority (Main Cases)

```gherkin
Feature: API-Based Integration - High Priority Tests

  @P1 @API @ITViec
  Scenario: TS-API-P1-001 - Fetch all jobs with pagination
    Given ITViec has 50 jobs (page size 20)
    When the system fetches all jobs
    Then 3 API calls should be made to "/jobs.json"
    And all 50 jobs should be returned
    And each job should have: id, title, number_of_applications, status

  @P1 @API @ITViec
  Scenario: TS-API-P1-002 - Fetch applications for a job
    Given job "job-001" has 45 applications
    And ITViec returns 20 per page
    When the system fetches applications for "job-001"
    Then 3 API calls should be made to "/jobs/job-001/job_applications.json"
    And all 45 applications should be returned with:
      | Field        | Required |
      | id           | Yes      |
      | name         | Yes      |
      | email        | Yes      |
      | phone_number | No       |
      | link_download| No       |
      | submitted_at | Yes      |

  @P1 @API @Sync
  Scenario: TS-API-P1-003 - Detect new applications via count comparison
    Given SyncState.JobSyncInfos["job-001"].ApplicationCount is 10
    And ITViec now reports 15 applications for "job-001"
    When the sync job runs
    Then system should detect 5 new applications
    And only new applications should be processed
    And SyncState.JobSyncInfos["job-001"].ApplicationCount should update to 15
    And SyncState.JobSyncInfos["job-001"].LastSeenAt should be updated

  @P1 @API @Duplicate
  Scenario: TS-API-P1-004 - Skip already processed applications via date-based filtering
    Given SyncState.LastProcessedApplicationDate is "2024-01-15T10:00:00Z"
    And application "app-older" has SubmittedAt "2024-01-14T09:00:00Z" (older)
    And application "app-same" has SubmittedAt "2024-01-15T10:00:00Z" and exists in SameDateProcessedIds
    When sync job encounters these applications
    Then "app-older" should be skipped (older than LastProcessedApplicationDate)
    And "app-same" should be skipped (same date and already in SameDateProcessedIds)
    And no duplicate Candidate should be created
    And pagination should stop early for older applications

  @P1 @API @CV
  Scenario: TS-API-P1-005 - Download and store CV from provider
    Given an application has link_download "https://api.itviec.com/cv/123.pdf"
    When the system downloads the CV
    Then authenticated GET request should be made to the URL
    And CV should be uploaded to Azure Storage
    And Candidate.CvAttachmentUrl should contain storage URL

  @P1 @API @Config
  Scenario: TS-API-P1-006 - Update configuration preserves encrypted secret
    Given configuration "config-001" exists with encrypted ClientSecret
    When updating with empty ClientSecret (to keep existing):
      | Id           | config-001        |
      | DisplayName  | Updated Name      |
      | ClientSecret | (empty)           |
    Then DisplayName should be updated
    And original encrypted ClientSecret should be preserved
```

#### 🟡 P2 - Medium Priority

```gherkin
Feature: API-Based Integration - Medium Priority Tests

  @P2 @API @Token
  Scenario: TS-API-P2-001 - Use cached token for subsequent calls
    Given a valid access_token is cached
    And token expires_in is still valid
    When the system makes API calls
    Then no new authentication request should be made
    And cached token should be used for authorization header

  @P2 @API @Token
  Scenario: TS-API-P2-002 - Refresh expired token automatically
    Given cached token has expired
    When the system attempts an API call
    Then new authentication request should be made
    And new token should be cached
    And original API call should proceed with new token

  @P2 @API @Parallel
  Scenario: TS-API-P2-003 - Process multiple configurations in parallel
    Given 5 companies have enabled configurations
    And MaxConcurrentSyncs is set to 3
    When sync job processes all configurations
    Then only 3 configurations should process simultaneously
    And all 5 should complete eventually
    And failure in one should not affect others

  @P2 @API @State
  Scenario: TS-API-P2-004 - SyncState tracks processed applications via date
    Given 10 new applications are processed with newest SubmittedAt "2024-01-15T12:00:00Z"
    And 3 applications have SubmittedAt exactly "2024-01-15T12:00:00Z"
    When sync completes successfully
    Then SyncState.LastProcessedApplicationDate should be "2024-01-15T12:00:00Z"
    And SyncState.SameDateProcessedIds should contain 3 IDs (same-date apps)
    And TotalApplicationsProcessed should increase by 10
    And LastSuccessfulSyncAt should be updated
```

#### 🟢 P3 - Low Priority (Edge Cases)

```gherkin
Feature: API-Based Integration - Edge Cases

  @P3 @API @EdgeCase
  Scenario: TS-API-P3-001 - Handle job with zero applications
    Given job "job-empty" has 0 applications
    When sync job processes this job
    Then no application fetch should be attempted
    And SyncState.JobSyncInfos["job-empty"].ApplicationCount should be 0
    And SyncState.JobSyncInfos["job-empty"].LastSeenAt should be updated

  @P3 @API @EdgeCase
  Scenario: TS-API-P3-002 - Handle application without CV link
    Given an application has null link_download
    When the system processes the application
    Then Candidate should be created without CV
    And CvAttachmentUrl should be null
    And no error should be thrown

  @P3 @API @EdgeCase
  Scenario: TS-API-P3-003 - Auto-prune stale jobs after 90 days
    Given SyncState.JobSyncInfos has job "old-job" with LastSeenAt 100 days ago
    And SyncState.JobSyncInfos has job "recent-job" with LastSeenAt 5 days ago
    When sync job completes and PruneStaleJobs() is called
    Then "old-job" should be removed from JobSyncInfos (stale > 90 days)
    And "recent-job" should remain in JobSyncInfos

  @P3 @API @EdgeCase
  Scenario: TS-API-P3-003b - JobSyncInfos bounded to MaxTrackedJobs (5000)
    Given SyncState.JobSyncInfos has 5,100 jobs
    When PruneStaleJobs() is called
    Then oldest 100 jobs (by LastSeenAt) should be removed
    And JobSyncInfos.Count should be 5,000

  @P3 @API @EdgeCase
  Scenario: TS-API-P3-004 - Handle ITViec datetime format variations
    Given an application has submitted_at "16-12-2025 10:13"
    When the system parses the datetime
    Then it should be correctly parsed to DateTime
    And stored as UTC in the database
```

---

### Configuration Management Test Specs

#### 🔴 P0 - Critical (Smoke Tests)

```gherkin
Feature: Configuration Management - Critical Tests

  @P0 @Smoke @Config
  Scenario: TS-CONFIG-P0-001 - Create configuration with required fields
    Given a System Admin is authenticated
    When creating configuration with all required fields:
      | CompanyId    | company-001              |
      | ProviderType | ITViec                   |
      | DisplayName  | ITViec Config            |
      | ClientId     | client-123               |
      | ClientSecret | secret-456               |
      | BaseUrl      | https://api.itviec.com   |
    Then configuration should be saved successfully
    And configuration ID should be returned

  @P0 @Smoke @Config
  Scenario: TS-CONFIG-P0-002 - Query configuration by ID returns data
    Given configuration "config-001" exists
    When querying by ID "config-001"
    Then configuration details should be returned
    And ClientSecret should NOT be exposed in response
```

#### 🟠 P1 - High Priority (Main Cases)

```gherkin
Feature: Configuration Management - High Priority Tests

  @P1 @Config @Validation
  Scenario: TS-CONFIG-P1-001 - Validate required fields
    When creating configuration with missing fields:
      | CompanyId   | (empty) |
      | DisplayName | (empty) |
      | BaseUrl     | (empty) |
    Then validation should fail with errors for each missing field

  @P1 @Config @Validation
  Scenario: TS-CONFIG-P1-002 - ClientSecret required for new API configurations
    When creating new API configuration without ClientSecret
    Then validation should fail
    And error should indicate "ClientSecret is required for new API-based providers"

  @P1 @Config @Duplicate
  Scenario: TS-CONFIG-P1-003 - Prevent duplicate provider per company
    Given ITViec configuration exists for "company-001"
    When attempting to create another ITViec config for "company-001"
    Then request should be rejected
    And error should indicate duplicate exists

  @P1 @Config @Query
  Scenario: TS-CONFIG-P1-004 - Get configurations by company
    Given company-001 has 2 configurations (1 enabled, 1 disabled)
    When querying with includeDisabled=false
    Then only 1 enabled configuration should be returned
    When querying with includeDisabled=true
    Then both configurations should be returned
```

#### 🟡 P2 - Medium Priority

```gherkin
Feature: Configuration Management - Medium Priority Tests

  @P2 @Config @Update
  Scenario: TS-CONFIG-P2-001 - Update configuration partial fields
    Given configuration "config-001" exists
    When updating only DisplayName and Notes
    Then only those fields should be updated
    And other fields should remain unchanged

  @P2 @Config @Delete
  Scenario: TS-CONFIG-P2-002 - Delete configuration
    Given configuration "config-001" exists
    When deleting configuration "config-001"
    Then configuration should be removed from database
    And future sync jobs should not process it

  @P2 @Config @Validation
  Scenario: TS-CONFIG-P2-003 - Email providers don't require ClientId
    When creating Email-based configuration:
      | FetchMethod | Email   |
      | ClientId    | (empty) |
    Then validation should pass
```

#### 🟢 P3 - Low Priority (Edge Cases)

```gherkin
Feature: Configuration Management - Edge Cases

  @P3 @Config @EdgeCase
  Scenario: TS-CONFIG-P3-001 - Handle very long DisplayName
    When creating configuration with 500 character DisplayName
    Then configuration should be saved successfully
    And DisplayName should be stored in full

  @P3 @Config @EdgeCase
  Scenario: TS-CONFIG-P3-002 - Handle special characters in Notes
    When creating configuration with Notes containing unicode and emojis
    Then configuration should be saved successfully
    And Notes should be retrieved correctly
```

---

### Security Test Specs

#### 🔴 P0 - Critical (Smoke Tests)

```gherkin
Feature: Security - Critical Tests

  @P0 @Smoke @Security
  Scenario: TS-SEC-P0-001 - ClientSecret is encrypted at rest
    Given a new configuration with ClientSecret "plaintext-secret"
    When the configuration is saved
    Then database should contain encrypted value
    And encrypted value should NOT equal "plaintext-secret"

  @P0 @Smoke @Security
  Scenario: TS-SEC-P0-002 - ClientSecret not exposed in API responses
    Given configuration exists with ClientSecret
    When querying the configuration via API
    Then response should NOT contain ClientSecret value
    And response should indicate HasClientSecret=true

  @P0 @Smoke @Security @Auth
  Scenario: TS-SEC-P0-003 - Unauthorized users cannot access configurations
    Given a regular user (non-admin) is authenticated
    When attempting to create/read/update/delete configurations
    Then all operations should be denied with 403 Forbidden
```

#### 🟠 P1 - High Priority (Main Cases)

```gherkin
Feature: Security - High Priority Tests

  @P1 @Security @Auth
  Scenario: TS-SEC-P1-001 - System Admin has full access
    Given a System Admin user
    When managing configurations for any company
    Then all CRUD operations should be allowed

  @P1 @Security @Auth
  Scenario: TS-SEC-P1-002 - Org Admin limited to own company
    Given an Org Admin for company-001
    When attempting operations:
      | Action | Company     | Result  |
      | Create | company-001 | Allowed |
      | Read   | company-001 | Allowed |
      | Update | company-001 | Allowed |
      | Delete | company-001 | Allowed |
      | Create | company-002 | Denied  |
      | Read   | company-002 | Denied  |

  @P1 @Security @Logging
  Scenario: TS-SEC-P1-003 - Credentials not logged on failure
    When authentication fails with invalid credentials
    Then error log should NOT contain ClientId
    And error log should NOT contain ClientSecret
    And log should only contain "Authentication failed" with status code
```

#### 🟡 P2 - Medium Priority

```gherkin
Feature: Security - Medium Priority Tests

  @P2 @Security @Encryption
  Scenario: TS-SEC-P2-001 - Encryption key fallback
    Given primary encryption key is not configured
    And fallback key exists in OrganizationalUnitEmailSettings
    When saving a configuration
    Then fallback key should be used for encryption

  @P2 @Security @Encryption
  Scenario: TS-SEC-P2-002 - Missing encryption key throws error
    Given no encryption keys are configured
    When attempting to save a configuration
    Then InvalidOperationException should be thrown
    And error should indicate "Encryption key not configured"
```

#### 🟢 P3 - Low Priority (Edge Cases)

```gherkin
Feature: Security - Edge Cases

  @P3 @Security @EdgeCase
  Scenario: TS-SEC-P3-001 - Audit trail for configuration changes
    When a configuration is created/updated/deleted
    Then CreatedBy/LastUpdatedBy should be set to current user ID
    And CreatedDate/LastUpdatedDate should be set
```

---

### Error Handling Test Specs

#### 🔴 P0 - Critical (Smoke Tests)

```gherkin
Feature: Error Handling - Critical Tests

  @P0 @Smoke @Error
  Scenario: TS-ERR-P0-001 - System doesn't crash on API failure
    Given ITViec API is completely unavailable
    When the sync job runs
    Then the job should complete without crashing
    And error should be logged
    And SyncState should record the failure

  @P0 @Smoke @Error @Email
  Scenario: TS-ERR-P0-002 - System doesn't crash on IMAP failure
    Given IMAP server is unreachable
    When ScanMailBox job runs
    Then the job should complete without crashing
    And error should be logged
    And other configurations should continue processing
```

#### 🟠 P1 - High Priority (Main Cases)

```gherkin
Feature: Error Handling - High Priority Tests

  @P1 @Error @API
  Scenario: TS-ERR-P1-001 - Handle 401 Unauthorized
    Given ITViec API returns 401 Unauthorized
    When the sync job attempts to authenticate
    Then error should be logged
    And SyncState.ConsecutiveFailureCount should increment
    And SyncState.RecentErrors should contain error details

  @P1 @Error @API
  Scenario: TS-ERR-P1-002 - Handle 429 Rate Limiting
    Given ITViec API returns 429 Too Many Requests
    When the sync job makes an API call
    Then error should be logged
    And system should NOT retry immediately
    And sync should be marked as failed

  @P1 @Error @API
  Scenario: TS-ERR-P1-003 - Retry on 500 Server Error
    Given ITViec API returns 500 Internal Server Error
    And MaxRetryAttempts is set to 3
    When the sync job makes an API call
    Then system should retry up to 3 times
    And if all retries fail, sync should be marked as failed

  @P1 @Error @Sync
  Scenario: TS-ERR-P1-004 - Consecutive failure tracking
    Given configuration has ConsecutiveFailureCount = 2
    When another sync fails
    Then ConsecutiveFailureCount should be 3
    When next sync succeeds
    Then ConsecutiveFailureCount should reset to 0

  @P1 @Error @Email
  Scenario: TS-ERR-P1-005 - Handle IMAP authentication failure
    Given invalid email credentials are configured
    When ScanMailBox job attempts to connect
    Then error should be logged
    And other email configurations should continue processing
```

#### 🟡 P2 - Medium Priority

```gherkin
Feature: Error Handling - Medium Priority Tests

  @P2 @Error @API
  Scenario: TS-ERR-P2-001 - Handle timeout
    Given ITViec API does not respond within TimeoutSeconds
    When the sync job makes an API call
    Then request should timeout
    And timeout error should be recorded in SyncState

  @P2 @Error @Data
  Scenario: TS-ERR-P2-002 - Handle malformed JSON response
    Given ITViec API returns invalid JSON
    When the sync job parses the response
    Then parsing exception should be caught
    And error should be logged with response snippet
    And sync should continue with other jobs if possible

  @P2 @Error @CV
  Scenario: TS-ERR-P2-003 - Handle CV download failure
    Given an application has invalid CV URL
    When system attempts to download CV
    Then download should fail gracefully
    And Candidate should still be created
    And CvAttachmentUrl should be null

  @P2 @Error @Email
  Scenario: TS-ERR-P2-004 - Mark problematic email as read
    Given an email causes parsing exception
    When ScanMailBox processes the email
    Then exception should be caught
    And email should be marked as read (prevent infinite retry)
    And error should be logged
```

#### 🟢 P3 - Low Priority (Edge Cases)

```gherkin
Feature: Error Handling - Edge Cases

  @P3 @Error @EdgeCase
  Scenario: TS-ERR-P3-001 - Handle missing email field in response
    Given application response is missing "email" field
    When system processes the application
    Then Candidate should be created with null email
    And warning should be logged

  @P3 @Error @EdgeCase
  Scenario: TS-ERR-P3-002 - Recent errors list rotation
    Given SyncState.RecentErrors has 10 errors (maximum)
    When a new error occurs
    Then oldest error should be removed
    And new error should be added
    And count should remain at 10

  @P3 @Error @EdgeCase
  Scenario: TS-ERR-P3-003 - Handle large CV attachment in email
    Given email has 50MB CV attachment
    When ScanMailBox processes the attachment
    Then oversized attachment should be skipped
    And warning should be logged
    And Candidate should be created without CV

  @P3 @Error @EdgeCase
  Scenario: TS-ERR-P3-004 - Handle corrupted CV file
    Given email has corrupted PDF attachment
    When CV parsing is attempted
    Then parsing should fail gracefully
    And raw file should still be uploaded
    And Candidate should have attachment URL
```

---

### Performance Test Specs

#### 🔴 P0 - Critical (Smoke Tests)

```gherkin
Feature: Performance - Critical Tests

  @P0 @Smoke @Performance
  Scenario: TS-PERF-P0-001 - Sync completes within timeout
    Given a typical configuration with 10 jobs, 100 applications
    When the sync job runs
    Then sync should complete within 5 minutes
    And no timeout errors should occur
```

#### 🟠 P1 - High Priority (Main Cases)

```gherkin
Feature: Performance - High Priority Tests

  @P1 @Performance @Parallel
  Scenario: TS-PERF-P1-001 - Parallel CV downloads
    Given 20 new applications with CVs
    And MaxConcurrentCvDownloads is set to 3
    When sync job processes applications
    Then only 3 CV downloads should run simultaneously
    And all 20 CVs should be downloaded eventually

  @P1 @Performance @Parallel
  Scenario: TS-PERF-P1-002 - Parallel configuration processing
    Given 10 companies have enabled configurations
    And MaxConcurrentSyncs is set to 5
    When scheduled sync triggers
    Then only 5 configurations should process simultaneously
    And all 10 should complete eventually
```

#### 🟡 P2 - Medium Priority

```gherkin
Feature: Performance - Medium Priority Tests

  @P2 @Performance @Memory
  Scenario: TS-PERF-P2-001 - Memory stable with large application count
    Given a job has 5,000 applications
    When sync job processes all applications
    Then memory usage should remain stable
    And no OutOfMemoryException should occur

  @P2 @Performance @Batch
  Scenario: TS-PERF-P2-002 - Message bus batch processing
    Given 100 companies have enabled configurations
    And PageSize is set to 10
    When Setting Service sends sync messages
    Then messages should be sent in batches of 10
    And delay should occur between batches
```

#### 🟢 P3 - Low Priority (Edge Cases)

```gherkin
Feature: Performance - Edge Cases

  @P3 @Performance @EdgeCase
  Scenario: TS-PERF-P3-001 - Handle 10,000 applications for single job
    Given a job has 10,000 applications
    And SyncState.LastProcessedApplicationDate is set
    When sync job runs
    Then applications should be processed with early termination
    And only new apps (SubmittedAt > LastProcessedApplicationDate) should be fetched
    And SameDateProcessedIds should only contain same-date app IDs

  @P3 @Performance @EdgeCase
  Scenario: TS-PERF-P3-002 - IMAP connection pool efficiency
    Given 20 companies need email scanning
    And connection pool size is 10
    When all companies are processed
    Then connections should be reused efficiently
    And no connection leaks should occur
```

---

### Test Implementation Examples

This section provides code-based test setup examples for developers implementing the actual tests. These complement the BDD scenarios above with concrete implementation guidance.

#### Email Scanning Test Setup

```csharp
// TC-EMAIL: Successful ITViec Email Scan Test Setup
[Fact]
public async Task ScanMailBox_ITViecEmail_ShouldCreateCandidate()
{
    // Arrange - Message from Setting Service
    var message = new ScanMailBoxTriggerScanRequestBusMessage
    {
        Data = new List<ScanMailBoxTriggerScanRequestBusMessage.Item>
        {
            new()
            {
                CompanyId = "company-001",
                Email = "hr@company.com",
                MailServer = "imap.gmail.com",
                MailServerPort = 993,
                EmailPassword = "encrypted-password"
            }
        }
    };

    // Mock email from ITViec
    var mockEmail = new EmailModel
    {
        Id = 12345,
        From = new EmailAddress { EmailAddress = "noreply@itviec.com" },
        Subject = "Nguyen Van A - Senior Software Engineer",
        BodyHtml = "<html>...</html>",
        SentDate = DateTime.UtcNow
    };

    _mockScanningMailService
        .Setup(x => x.GetUnreadIds(It.IsAny<EmailSettingModel>()))
        .ReturnsAsync(new List<long> { 12345 });

    _mockScanningMailService
        .Setup(x => x.GetEmails(It.IsAny<EmailSettingModel>(), It.IsAny<List<long>>()))
        .ReturnsAsync(new List<EmailModel> { mockEmail });

    // Act
    await _handler.Execute(message);

    // Assert
    _mockBusMessageProducer.Verify(
        x => x.SendAsync(
            It.Is<ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage>(
                m => m.Data.Any(d => d.ApplicationSource == "ITviec")),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()),
        Times.Once);

    _mockScanningMailService.Verify(
        x => x.MarkSeenEmails(It.IsAny<EmailSettingModel>(), It.Is<List<long>>(ids => ids.Contains(12345))),
        Times.Once);
}
```

#### API Integration Test Setup

```csharp
// TC-API: Successful Full Sync Flow Test Setup
[Fact]
public async Task SyncFromMessage_FirstSync_ShouldProcessAllApplications()
{
    // Arrange
    var message = new JobBoardApiTriggerSyncRequestBusMessage
    {
        Data = new List<JobBoardApiTriggerSyncRequestBusMessage.Item>
        {
            new()
            {
                ConfigurationId = "config-001",
                CompanyId = "company-001",
                ProviderType = JobBoardProviderType.ITViec,
                FetchMethod = FetchMethod.API,
                AuthConfiguration = new AuthConfigurationItem
                {
                    AuthType = AuthType.OAuth2ClientCredentials,
                    ClientId = "client-id",
                    ClientSecret = "encrypted-secret",
                    BaseUrl = "https://api.itviec.com/employer/v1"
                },
                SyncState = new SyncStateItem()  // Empty - first sync
            }
        }
    };

    // Mock ITViec API responses
    var mockJobsResponse = new ITViecJobsResponse
    {
        Jobs = new List<ITViecJob>
        {
            new() { Id = "job-1", Title = "Senior .NET Developer", NumberOfApplications = 10 },
            new() { Id = "job-2", Title = "Frontend React Developer", NumberOfApplications = 8 },
            new() { Id = "job-3", Title = "DevOps Engineer", NumberOfApplications = 7 }
        },
        Total = 3,
        Page = 1
    };

    var mockApplicationsResponse = new ITViecApplicationsResponse
    {
        Applications = new List<ITViecApplication>
        {
            new()
            {
                Id = "app-001",
                Name = "Nguyen Van A",
                Email = "nguyenvana@email.com",
                PhoneNumber = new List<string> { "0901234567" },
                LinkDownload = "https://api.itviec.com/cv/app-001.pdf",
                CvName = "NguyenVanA_CV.pdf",
                SubmittedAt = "16-12-2025 10:30"
            }
            // ... more applications
        },
        Total = 10,
        Page = 1
    };

    _mockHttpClient.SetupSequence(/* OAuth endpoint */)
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(new ITViecAuthResponse
            {
                AccessToken = "token-123",
                TokenType = "Bearer",
                ExpiresIn = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds()
            })
        });

    _mockHttpClient.Setup(/* GET /jobs.json */)
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(mockJobsResponse)
        });

    // Act
    await _syncService.SyncFromMessageAsync(message);

    // Assert
    _mockTokenRepository.Verify(
        x => x.SaveTokenAsync("config-001", "token-123", It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
        Times.Once);

    _mockBusMessageProducer.Verify(
        x => x.SendAsync(
            It.Is<ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage>(m => m.Data.Count > 0),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()),
        Times.AtLeastOnce);
}
```

#### Incremental Sync Test (Only New Applications)

```csharp
// TC-API: Incremental sync - only new applications processed
[Fact]
public async Task SyncFromMessage_IncrementalSync_ShouldOnlyProcessNewApplications()
{
    // Arrange - Second sync with existing state
    var message = new JobBoardApiTriggerSyncRequestBusMessage
    {
        Data = new List<JobBoardApiTriggerSyncRequestBusMessage.Item>
        {
            new()
            {
                ConfigurationId = "config-001",
                CompanyId = "company-001",
                ProviderType = JobBoardProviderType.ITViec,
                SyncState = new SyncStateItem
                {
                    LastSyncedAt = DateTime.UtcNow.AddHours(-1),
                    LastSuccessfulSyncAt = DateTime.UtcNow.AddHours(-1),
                    LastProcessedApplicationDate = DateTime.Parse("2024-01-15T10:00:00Z"),
                    JobSyncInfos = new Dictionary<string, JobSyncInfoItem>
                    {
                        ["job-1"] = new() { ApplicationCount = 10, LastSeenAt = DateTime.UtcNow.AddHours(-1) },
                        ["job-2"] = new() { ApplicationCount = 8, LastSeenAt = DateTime.UtcNow.AddHours(-1) },
                        ["job-3"] = new() { ApplicationCount = 7, LastSeenAt = DateTime.UtcNow.AddHours(-1) }
                    },
                    SameDateProcessedIds = new List<string> { "app-025" }  // Only same-date IDs
                }
            }
        }
    };

    // Current state: job-1 now has 12 applications (2 new)
    var mockJobsResponse = new ITViecJobsResponse
    {
        Jobs = new List<ITViecJob>
        {
            new() { Id = "job-1", NumberOfApplications = 12 },  // +2 new
            new() { Id = "job-2", NumberOfApplications = 8 },   // No change
            new() { Id = "job-3", NumberOfApplications = 7 }    // No change
        }
    };

    // Act
    await _syncService.SyncFromMessageAsync(message);

    // Assert - Only job-1 applications should be fetched
    _mockHttpClient.Verify(
        x => x.GetAsync(It.Is<string>(url => url.Contains("/jobs/job-1/job_applications")), It.IsAny<CancellationToken>()),
        Times.AtLeastOnce);

    // Jobs 2 and 3 should be skipped
    _mockHttpClient.Verify(
        x => x.GetAsync(It.Is<string>(url => url.Contains("/jobs/job-2/job_applications")), It.IsAny<CancellationToken>()),
        Times.Never);
}
```

#### Error Handling Test Setup

```csharp
// TC-API: Authentication failure handling
[Fact]
public async Task SyncFromMessage_AuthenticationFailure_ShouldThrowAndLog()
{
    // Arrange
    _mockHttpClient
        .Setup(x => x.PostAsJsonAsync(
            "https://api.itviec.com/employer/v1/oauth.json",
            It.IsAny<object>(),
            It.IsAny<CancellationToken>()))
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            Content = new StringContent("{\"error\": \"invalid_client\"}")
        });

    // Act & Assert
    await Assert.ThrowsAsync<JobBoardAuthenticationException>(
        () => _syncService.SyncFromMessageAsync(message));

    _mockTokenRepository.Verify(
        x => x.SaveTokenAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
        Times.Never);  // No token saved on failure
}

// TC-API: CV download failure with graceful degradation
[Fact]
public async Task DownloadCvs_PartialFailure_ShouldContinueProcessing()
{
    // Arrange - Second CV download fails
    _mockHttpClient.SetupSequence(/* CV download */)
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(new byte[100]) })
        .ThrowsAsync(new HttpRequestException("Connection refused"))
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(new byte[100]) });

    // Act
    var result = await _syncService.DownloadAndUploadCvsAsync(applications);

    // Assert
    Assert.Equal(3, result.Count);  // All 3 apps returned
    Assert.NotNull(result[0].CvAzureUrl);  // First CV uploaded
    Assert.Null(result[1].CvAzureUrl);      // Second CV failed - uses original URL
    Assert.NotNull(result[2].CvAzureUrl);  // Third CV uploaded
}
```

#### Vietnamese Name Parsing Test

```csharp
// TC-API: Vietnamese name parsing
[Theory]
[InlineData("Nguyen Van A", "Van A", "Nguyen")]           // 3 parts
[InlineData("Tran Thi B", "Thi B", "Tran")]               // 3 parts
[InlineData("Le C", "C", "Le")]                           // 2 parts
[InlineData("D", "D", null)]                              // 1 part
[InlineData("Hoang Thi Minh Chau", "Thi Minh Chau", "Hoang")]  // 4 parts
public void ParseName_VietnameseConvention_ShouldExtractCorrectly(
    string fullName, string expectedFirstName, string expectedLastName)
{
    // Act
    var (firstName, lastName) = _provider.ParseName(fullName);

    // Assert
    Assert.Equal(expectedFirstName, firstName);
    Assert.Equal(expectedLastName, lastName);
}
```

#### Integration Test - Both Flows Use Same Consumer

```csharp
// TC-INT: Verify both flows converge to same consumer
[Fact]
public async Task BothFlows_ShouldUseSameMessageAndConsumer()
{
    // Arrange - Capture messages from both flows
    var capturedMessages = new List<ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage>();

    _mockBusMessageProducer
        .Setup(x => x.SendAsync(
            It.IsAny<ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
        .Callback<ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage, string, CancellationToken>(
            (msg, _, _) => capturedMessages.Add(msg));

    // Act - Trigger email flow
    await _emailHandler.Execute(emailMessage);

    // Act - Trigger API flow
    await _syncService.SyncFromMessageAsync(apiMessage);

    // Assert - Both use same message type
    Assert.Equal(2, capturedMessages.Count);
    Assert.All(capturedMessages, msg =>
    {
        Assert.IsType<ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage>(msg);
        Assert.NotEmpty(msg.Data);
        Assert.All(msg.Data, app => Assert.IsType<SubmitApplicationCommand>(app));
    });
}
```

---

### Detailed Code Flow Reference

This section provides detailed code execution paths with file and line references for developers debugging or extending the system.

#### Email Scanning Code Flow

```
ScanMailBoxCommandHandler.Execute()                    [ScanMailBoxCommandHandler.cs:77-88]
├── message.Data.ParallelAsync(ScanOrganizationEmailsAsync)
│
ScanOrganizationEmailsAsync(item)                      [ScanMailBoxCommandHandler.cs:92-127]
├── CreateEmailSettingForScanningAsync()               → EmailSettingModel
├── scanningMailService.GetUnreadIds()                 → List<long>
├── scanningMailService.GetEmails()                    → List<EmailModel>
│
HandleEmailsAsync(emails, companyEmail, ...)           [ScanMailBoxCommandHandler.cs:140-228]
├── GetApplicationInfo(email)                          [ScanMailBoxCommandHandler.cs:267-279]
│   └── FindApplicationInfoByJobBoardEmailDomain()
│       └── PartialJobBoardEmails.FindByEmailAddress(email.From)
│           → PartialJobBoardEmails.ITViec | VietnamWorks | TopCV | ...
│       └── JobNameHelper.GetJobInfoFromITViec(subject)
│           → { EmailFrom: MailFrom.ITviec, Title: "..." }
│
├── GetScanMailboxService(MailFrom.ITviec)             [ScanMailBoxCommandHandler.cs:230-265]
│   → new ScanOuterCareerSiteMailboxService(...)
│
├── scanMailboxService.ScanMailBoxApplication(...)
│   → SubmitApplicationCommand { JobName, ApplicationSource, CvDetail }
│
└── scanningMailService.MarkSeenEmails(emailIds)

busMessageProducer.SendAsync()                         [ScanMailBoxCommandHandler.cs:226-228]
    → ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage

ScanMailBoxNewJobApplicationEmailReceivedEventBusConsumer.HandleLogicAsync()
└── createCandidateCommandHandler.ExecuteAsync(message)
```

#### API Integration Code Flow

```
JobBoardApiTriggerSyncRequestBusMessageConsumer        [Consumer.cs:35-40]
└── syncService.SyncFromMessageAsync(message)

JobBoardApplicationSyncService.SyncFromMessageAsync()  [SyncService.cs:62-82]
└── message.Data.ParallelAsync(SyncFromMessageItemCoreAsync, maxConcurrent: 5)

SyncFromMessageItemCoreAsync(item)                     [SyncService.cs:115-146]
│
├── config = BuildConfigurationFromMessageItem(item)
│
├── provider = providerFactory.GetProvider(JobBoardProviderType.ITViec)
│   → ITViecApiProvider instance
│
├── authResult = provider.AuthenticateAsync(config)    [BaseApiJobBoardProvider.cs:103-146]
│   ├── TokenRepository.GetValidTokenAsync()           → null (if no cache)
│   ├── AuthenticateWithProviderAsync(config)          [ITViecApiProvider.cs:45-103]
│   │   └── POST /oauth.json → { access_token, token_type, expires_in }
│   └── TokenRepository.SaveTokenAsync()
│
├── FetchJobsWithChangesAsync()                        [SyncService.cs:148-173]
│   ├── provider.GetJobsCountAsync()                   → GET /jobs.json?page=1 → total
│   └── while (jobSkip < totalJobs)
│       ├── provider.GetJobsPagedAsync(skip, take)     [ITViecApiProvider.cs:135-193]
│       │   └── Convert skip/take → page numbers
│       │       └── FetchJobsPagesAsync(startPage, endPage)
│       └── provider.DetectJobsWithNewApplications()   [BaseApiJobBoardProvider.cs:362-382]
│           └── Compare current vs previous counts
│
├── ProcessAllJobApplicationsAsync()                   [SyncService.cs:175-202]
│   └── foreach job in jobsWithChanges
│       └── ProcessJobApplicationsPagedAsync(job)      [SyncService.cs:204-252]
│           ├── provider.GetApplicationsCountAsync()
│           └── while (appSkip < totalApps)
│               ├── provider.GetApplicationsPagedAsync()
│               ├── provider.FilterNewApplicationsWithEarlyTermination()
│               │   └── Filter by date: app.SubmittedAt vs LastProcessedApplicationDate
│               ├── provider.MapToProviderApplications()
│               │   └── ParseName() → Vietnamese convention
│               ├── DownloadAndUploadCvsAsync()        [SyncService.cs:254-296]
│               │   └── ParallelAsync(maxConcurrent: 3)
│               └── SendToCreateCandidateFlowAsync()   [SyncService.cs:324-356]
│
└── Update SyncState with processed counts/IDs

ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage  [REUSED]
└── Same consumer handles both email and API flows
```

---

## Related Documentation

### Internal Documentation

- [CLAUDE.md](../CLAUDE.md) - Overall coding standards and patterns
- [EasyPlatform.README.md](../EasyPlatform.README.md) - Platform framework documentation

### External API Documentation

- [ITViec API Documentation](https://itviec.com/customer/api-documents) - Official ITViec employer API reference

---

## Version History

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2024-01    | Initial ITViec API integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 1.0.1   | 2025-12-17 | Documentation fixes: Updated PartialJobBoardEmails (TopCV→TopCv, added OrientSoftware), fixed IJobBoardApplicationProvider interface signatures, corrected BaseApiJobBoardProvider abstract methods, fixed ITViec API endpoints (/oauth.json, /jobs.json), updated JobBoardProviderFactory to Dictionary-based pattern, corrected file paths in Key Provider Files table, added OrientSoftware to Supported Providers                                                                                                                                                      |
| 1.0.2   | 2025-12-17 | Documentation fixes: Fixed AuthType enum values (None=0, OAuth2ClientCredentials=1, OAuth2AuthorizationCode=2, ApiKey=3, BasicAuth=4 - removed non-existent BearerToken/Custom), removed non-existent TokenUrl from AuthConfigurationValue entity diagram, updated "Adding New Providers" section with correct method signatures (AuthenticateWithProviderAsync, GetJobsCountInternalAsync, GetJobsPagedInternalAsync, GetApplicationsCountInternalAsync, GetApplicationsPagedInternalAsync, GetDefaultMappingConfig), added ScanOtherMailboxService to email parsers list |
| 1.0.3   | 2025-12-18 | Bug fix: Added double-checked locking pattern to `BaseApiJobBoardProvider.AuthenticateAsync()` to prevent race condition when multiple concurrent requests try to authenticate for the same configuration. Uses `ConcurrentDictionary<string, SemaphoreSlim>` for per-config locks. Updated documentation with authentication concurrency handling diagram.                                                                                                                                                                                                                |
| 2.0.0   | 2026-01-08 | Template compliance: Added Business Requirements, Design Reference, Frontend Components, Backend Controllers, Permission System sections; standardized to 15-section template format |
| 1.1.0   | TBD        | VietnamWorks integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 1.2.0   | TBD        | TopCV integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

_Last Updated: 2026-01-08_
