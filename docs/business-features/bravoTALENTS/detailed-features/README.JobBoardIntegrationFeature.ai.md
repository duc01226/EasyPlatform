# Job Board Integration Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.JobBoardIntegrationFeature.md](./README.JobBoardIntegrationFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Services | Setting.Service (MongoDB), Candidate.Service |
| Database | MongoDB (configurations), SQL Server (candidates) |
| Message Bus | RabbitMQ |

### File Locations

```
Entities:
├── Setting.Domain/AggregatesModel/JobBoardProviderConfiguration.cs
├── Setting.Domain/AggregatesModel/AuthConfigurationValue.cs
├── Setting.Domain/AggregatesModel/SyncStateValue.cs
├── Candidate.Application/ScanMailBoxModule/Models/

Commands:
├── Setting.Application/UseCaseCommands/JobBoardProviderConfiguration/
├── Candidate.Application/UseCaseCommands/ScanMailBox/

Queries:
├── Setting.Application/UseCaseQueries/JobBoardProviderConfiguration/
├── Candidate.Application/UseCaseQueries/ScanMailBox/

Controllers:
├── Setting.Service/Controllers/JobBoardProviderConfigurationController.cs
├── Candidate.Service/Controllers/ScanMailBoxController.cs

Providers/Services:
├── Candidate.Application/ScanMailBoxModule/MailService/
├── Candidate.Application/ScanMailBoxModule/ProviderFactory/
├── Candidate.Application/ScanMailBoxModule/Parsers/

Frontend:
├── src/WebV2/apps/bravo-talents-**/src/app/job-board-integration/
├── src/WebV2/apps/bravo-talents-**/src/app/company-settings/job-board-tab/
```

---

## Domain Model

### Entities

```
JobBoardProviderConfiguration : RootEntity<JobBoardProviderConfiguration, string>
├── Id: string (ULID)
├── CompanyId: string (FK → OrganizationalUnit)
├── ProviderType: JobBoardProviderType (enum)
├── FetchMethod: FetchMethod (Email|API|Hybrid)
├── IsEnabled: bool
├── DisplayName: string (unique per company)
├── Notes: string?
├── CreatedDate: DateTime
├── LastUpdatedDate: DateTime?
├── CreatedBy: string
├── LastUpdatedBy: string?
├── AuthConfiguration: AuthConfigurationValue (embedded value object)
└── SyncState: SyncStateValue (embedded value object)

OrganizationalUnit (extension)
├── JobBoardIntegration: JobBoardIntegrationModel (embedded)
│   ├── IsEnabled: bool
│   ├── JobBoardIntegrationEmailAddress: string
│   ├── ImapServer: string
│   ├── ImapPort: int
│   ├── UseSSL: bool
│   ├── AuthenticationType: string (Basic|OAuth2)
│   ├── Username: string
│   ├── Password: string (encrypted)
│   └── LastScannedMailTime: DateTime?
```

### Value Objects

```
AuthConfigurationValue {
  AuthType: AuthType (None|OAuth2ClientCredentials|OAuth2AuthorizationCode|ApiKey|BasicAuth)
  ClientId: string?
  ClientSecret: string? (encrypted at rest)
  ApiKey: string? (encrypted at rest)
  Username: string?
  Password: string? (encrypted at rest)
  BaseUrl: string
  TimeoutSeconds: int (default: 30)
  MaxRetryAttempts: int (default: 3)
  CustomHeaders: Dict<string, string>?
}

SyncStateValue {
  LastSyncedAt: DateTime?
  LastSuccessfulSyncAt: DateTime?
  LastProcessedApplicationDate: DateTime?
  JobSyncInfos: Dict<string, JobSyncInfo>
  SameDateProcessedIds: List<string> (max 200)
  RecentErrors: List<SyncError> (max 10)
  TotalApplicationsProcessed: long
  ConsecutiveFailureCount: int
}

JobSyncInfo { ApplicationCount: int, LastSeenAt: DateTime }
SyncError { Message: string, Timestamp: DateTime }
```

### Enums

```
JobBoardProviderType: Email=0 | ITViec=1 | VietnamWorks=2 | TopCV=3 | TopDev=4 | LinkedIn=5 | CareerLink=6 | CareerBuilder=7
AuthType: None=0 | OAuth2ClientCredentials=1 | OAuth2AuthorizationCode=2 | ApiKey=3 | BasicAuth=4
FetchMethod: Email=0 | API=1 | Hybrid=2
```

### Key Expressions

```csharp
// Duplicate display name check (per company)
public static Expression<Func<JobBoardProviderConfiguration, bool>> HasDuplicateDisplayNameExpr(
    string companyId, string displayName, string? excludeId = null)
    => c => c.CompanyId == companyId && c.DisplayName == displayName && c.Id != excludeId;

// Duplicate auth configuration check (per company)
public static Expression<Func<JobBoardProviderConfiguration, bool>> HasDuplicateAuthConfigurationExpr(
    string companyId, AuthConfigurationValue authConfig, string? excludeId = null)
    => c => c.CompanyId == companyId
            && c.AuthConfiguration.AuthType == authConfig.AuthType
            && c.AuthConfiguration.ApiKey == authConfig.ApiKey
            && c.AuthConfiguration.BaseUrl == authConfig.BaseUrl
            && c.AuthConfiguration.ClientId == authConfig.ClientId
            && c.AuthConfiguration.ClientSecret == authConfig.ClientSecret
            && c.AuthConfiguration.Username == authConfig.Username
            && c.AuthConfiguration.Password == authConfig.Password
            && c.Id != excludeId;

// Get enabled configurations for company
public static Expression<Func<JobBoardProviderConfiguration, bool>> EnabledByCompanyExpr(string companyId)
    => c => c.CompanyId == companyId && c.IsEnabled;
```

---

## API Contracts

### Commands

```
POST /api/job-board-provider-configuration/save
├── Request:  SaveJobBoardProviderConfigurationCommand
│   ├── id?: string (null for create)
│   ├── companyId: string (required)
│   ├── providerType: JobBoardProviderType (required)
│   ├── fetchMethod: FetchMethod (required)
│   ├── displayName: string (required, unique per company)
│   ├── isEnabled: bool
│   ├── authConfiguration: AuthConfigurationDto
│   │   ├── authType: AuthType (required)
│   │   ├── clientId?: string
│   │   ├── clientSecret?: string (required on create or if "Change Secret" checked)
│   │   ├── apiKey?: string (encrypted)
│   │   ├── username?: string
│   │   ├── password?: string (encrypted)
│   │   ├── baseUrl: string (required)
│   │   ├── timeoutSeconds: int (default: 30)
│   │   ├── maxRetryAttempts: int (default: 3)
│   │   └── customHeaders?: Dict
│   └── notes?: string
├── Response: SaveJobBoardProviderConfigurationCommandResult { configuration: JobBoardProviderConfigurationDto }
├── Handler:  SaveJobBoardProviderConfigurationCommandHandler
└── Evidence: Setting.Application/UseCaseCommands/JobBoardProviderConfiguration/

DELETE /api/job-board-provider-configuration/{id}
├── Response: { success: boolean }
├── Handler:  DeleteJobBoardProviderConfigurationCommandHandler
└── Evidence: Setting.Application/UseCaseCommands/JobBoardProviderConfiguration/
```

### Queries

```
GET /api/job-board-provider-configuration/{id}
├── Response: { configuration: JobBoardProviderConfigurationDto }
├── Handler:  GetJobBoardProviderConfigurationQueryHandler
└── Evidence: Setting.Application/UseCaseQueries/JobBoardProviderConfiguration/

GET /api/job-board-provider-configuration/by-company?companyId={companyId}&includeDisabled=false
├── Response: { configurations: JobBoardProviderConfigurationDto[] }
├── Handler:  GetJobBoardProviderConfigurationsByCompanyQueryHandler
└── Evidence: Setting.Application/UseCaseQueries/JobBoardProviderConfiguration/
```

### DTOs

```
JobBoardProviderConfigurationDto : PlatformEntityDto<JobBoardProviderConfiguration, string>
├── Id: string?
├── CompanyId: string
├── ProviderType: JobBoardProviderType
├── FetchMethod: FetchMethod
├── DisplayName: string
├── IsEnabled: bool
├── Notes: string?
├── AuthConfiguration: AuthConfigurationDto
├── SyncState: SyncStateDto
├── CreatedDate: DateTime
├── LastUpdatedDate: DateTime?
└── MapToEntity(): JobBoardProviderConfiguration

AuthConfigurationDto
├── AuthType: AuthType
├── ClientId: string?
├── HasClientSecret: bool (true if secret exists)
├── ApiKey: string?
├── BaseUrl: string
├── TimeoutSeconds: int
├── MaxRetryAttempts: int
└── CustomHeaders: Dict?

SyncStateDto
├── LastSyncedAt: DateTime?
├── LastSuccessfulSyncAt: DateTime?
├── TotalApplicationsProcessed: long
├── ConsecutiveFailureCount: int
├── RecentErrorsCount: int
└── LastErrorMessage: string?
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-JB-001 | DisplayName must be unique within company | `SaveJobBoardProviderConfigurationCommand.Validate()` |
| BR-JB-002 | AuthConfiguration must be unique within company | `HasDuplicateAuthConfigurationExpr` check in handler |
| BR-JB-003 | Multiple configs allowed per provider type, differentiated by DisplayName | Domain rule, not enforced technically |
| BR-JB-004 | Email method requires IMAP settings in OrganizationalUnit | `SaveJobBoardProviderConfigurationCommand.Validate()` |
| BR-JB-005 | API method requires BaseUrl + auth credentials | `SaveJobBoardProviderConfigurationCommand.Validate()` |
| BR-JB-006 | Secret required on create; on update, required only if "Change Secret" checkbox checked | Command handler logic |
| BR-JB-007 | Jobs must exist before linking applications; non-existent jobs create sourced candidates | `ICreateCandidateCommandHandler.ExecuteAsync()` |
| BR-JB-008 | Duplicate detection by external app ID or candidate email+job+date | `SyncStateValue.SameDateProcessedIds` |
| BR-JB-009 | Email scanning always marks emails as read (success or failure) | `MailikitScanningMailService.MarkSeenEmails()` |
| BR-JB-010 | Consecutive failure threshold = 3; triggers admin email notification | `SyncStateValue.ConsecutiveFailureCount >= 3` |
| BR-JB-011 | Max 10 recent errors retained; 200 same-day processed IDs | `SyncStateValue constants` |
| BR-JB-012 | Secrets encrypted at rest; decrypted before sending via message bus | `SecurityHelper.EncryptString/DecryptString` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => DisplayName.IsNotNullOrEmpty(), "Display name required")
        .And(_ => AuthConfiguration.BaseUrl.IsNotNullOrEmpty(), "Base URL required")
        .And(_ => FetchMethod != FetchMethod.API || AuthConfiguration.AuthType != AuthType.None, "Auth type required for API");

// Async validation (duplicate check)
await validation
    .AndNotAsync(r => repo.AnyAsync(HasDuplicateDisplayNameExpr(CompanyId, DisplayName, Id), ct),
        "Display name already exists")
    .AndNotAsync(r => repo.AnyAsync(HasDuplicateAuthConfigurationExpr(CompanyId, AuthConfiguration, Id), ct),
        "Auth configuration already exists");
```

---

## Service Boundaries

### Produces Events (Setting.Service)

```
JobBoardProviderConfigurationEntityEventBusMessage → [Candidate]
├── Producer: Auto-generated by platform
├── Triggers: Create, Update, Delete on JobBoardProviderConfiguration
├── Payload: JobBoardProviderConfigurationEntityEventBusMessagePayload
└── Action: Notify consumers of config changes

ScanMailBoxTriggerScanRequestBusMessage → Candidate.Service
├── Source: ScanMailSettingSchedulerHostedService (configurable interval)
├── Payload: { companyId, emails, lastScannedTime }
└── Frequency: Configurable (default: every 15 min)

JobBoardApiTriggerSyncRequestBusMessage → Candidate.Service
├── Source: JobBoardApiSyncSchedulerHostedService
├── Payload: { configurations, decryptedSecrets }
└── Frequency: Every 5 minutes
```

### Consumes Events

```
JobBoardApplicationSyncService ← Candidate.Service (internal)
├── Trigger: JobBoardApiTriggerSyncRequestBusMessageConsumer
├── Action: Process job applications from APIs
└── Idempotent: Yes (via SameDateProcessedIds + external app IDs)

ScanMailBoxCommandConsumer ← Candidate.Service (internal)
├── Trigger: ScanMailBoxTriggerScanRequestBusMessageConsumer
├── Action: Scan emails, create candidates
└── Idempotent: Yes (email marked as seen)

SettingUpdateJobBoardSyncStateRequestBusMessageConsumer ← Setting.Service
├── Trigger: Candidate.Service sends state update
├── Action: Persist sync state to JobBoardProviderConfiguration
└── Response: SettingUpdateJobBoardSyncStateRequestBusMessage
```

### Cross-Service Data Flow

```
Setting.Service ──schedule──▶ [RabbitMQ] ──consume──▶ Candidate.Service
  (every 5 min)               JobBoardApiTriggerSync     (process jobs)
  (every 15 min)              ScanMailBoxTriggerScan     (process emails)
                                    │
                                    ▼
                          Send: SettingUpdateSync
                                    │
                                    ▼
  ◀──update state────────── [RabbitMQ] ◀────────────
    (sync errors/counts)    SettingUpdateSyncState
```

---

## Critical Paths

### Configure API Provider (Save)

```
1. Validate input (BR-JB-001, BR-JB-002, BR-JB-005)
   ├── DisplayName not empty
   ├── BaseUrl not empty (for API)
   └── AuthConfiguration populated
2. Check DisplayName uniqueness → fail: return validation error
3. Check AuthConfiguration uniqueness → fail: return validation error
4. Generate ID if create mode → Ulid.NewUlid()
5. Initialize SyncState with defaults
6. Encrypt secrets (ClientSecret, ApiKey, Password) → SecurityHelper.EncryptString()
7. Save via repository.CreateOrUpdateAsync()
8. Platform auto-publishes entity event → Consumers notified
9. If create/update: TriggerSyncOnSave event handler triggers immediate sync
```

### Sync Job Applications (API)

```
1. JobBoardApiSyncSchedulerHostedService fires (every 5 min)
2. Query enabled configurations with FetchMethod=API
3. For each configuration (parallel, max 5):
   a. JobBoardProviderFactory.GetProvider(ProviderType)
   b. provider.AuthenticateAsync(config)
      ├── Check token cache (double-checked locking)
      ├── Exchange credentials for access token
      └── Return ProviderAuthResult with expiry
   c. Fetch jobs (paged, 50/page):
      ├── provider.GetJobsCountAsync()
      └── Loop: provider.GetJobsPagedAsync(skip, take)
   d. provider.DetectJobsWithNewApplications(jobs, syncState)
      └── Compare job.ApplicationCount vs syncState.JobSyncInfos
   e. For each job with new applications:
      ├── provider.GetApplicationsCountAsync(jobId)
      ├── Loop: provider.GetApplicationsPagedAsync(jobId, skip, take)
      ├── provider.FilterNewApplications(apps, syncState)
      │  └── Filter by LastProcessedApplicationDate + SameDateProcessedIds
      └── For each new application:
         ├── Create/update Candidate
         ├── Find Job by exact name match
         ├── If found: Create Application linking Candidate+Job
         ├── If not found: Create sourced candidate + warning log
         ├── Download CV from provider
         ├── Upload CV to Azure Storage
         └── Track processed app ID
4. Update SyncState:
   ├── LastSyncedAt = now
   ├── LastSuccessfulSyncAt = now
   ├── LastProcessedApplicationDate = latest
   ├── JobSyncInfos[jobId] = new counts
   ├── SameDateProcessedIds = same-day IDs
   ├── ConsecutiveFailureCount = 0
   └── RecentErrors.Clear()
5. Send: SettingUpdateJobBoardSyncStateRequestBusMessage (Success=true)
6. On error:
   ├── LastSyncedAt = now
   ├── ConsecutiveFailureCount++
   ├── RecentErrors.Insert(0, error)
   └── Send: SettingUpdateJobBoardSyncStateRequestBusMessage (Success=false)
   ├── If ConsecutiveFailureCount >= 3: Email admin notification
```

### Delete Configuration

```
1. Load configuration by ID → not found: 404
2. Validate authorization: Admin role required
3. Delete via repository.DeleteAsync()
4. Platform auto-publishes Delete event → Consumers notified
```

### Scan Email (Email Method)

```
1. ScanMailSettingSchedulerHostedService fires (configurable interval)
2. Query companies with JobBoardIntegration enabled + active subscription
3. For each company (paged, 10/batch):
   a. Decrypt email password (SecurityHelper)
   b. Refresh OAuth token if expired
   c. MailikitScanningMailService.GetUnreadIds()
      └── Connect to IMAP, search SearchQuery.NotSeen
   d. MailikitScanningMailService.GetEmails()
      └── Fetch bodies + attachments
   e. For each email:
      ├── GetApplicationInfo():
      │  ├── Detect job board from From domain
      │  └── Extract job title via board-specific regex
      ├── GetScanMailboxService() (Strategy pattern):
      │  ├── ITViec → ScanOuterCareerSiteMailboxService
      │  ├── TopCV → ScanTopCvMailboxService
      │  ├── LinkedIn → ScanLinkedInMailboxService
      │  └── Other → Fallback parser
      ├── ScanMailBoxApplication():
      │  ├── Extract candidate name from subject
      │  ├── Extract email from body/reply-to
      │  ├── Parse CV attachment
      │  ├── Upload CV to Azure Storage
      │  └── Return ScanMailBoxApplicationResult
      └── MarkSeenEmails() - ALWAYS (success or failure)
4. Send: ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage
5. Consumer processes: Create candidate + application
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-JB-001 | Save new configuration with valid data | Config created, ID generated, event published |
| TC-JB-002 | Save duplicate display name | Returns validation error BR-JB-001 |
| TC-JB-003 | Save duplicate auth config | Returns validation error BR-JB-002 |
| TC-JB-004 | Update configuration (change secret) | Secrets re-encrypted, sync triggered |
| TC-JB-005 | Update without changing secret | Existing secret retained, not re-encrypted |
| TC-JB-006 | Delete configuration | Config deleted, event published |
| TC-JB-007 | Sync with new applications | Applications created, sync state updated |
| TC-JB-008 | Sync detects duplicates (same-day) | Duplicates skipped, SameDateProcessedIds tracked |
| TC-JB-009 | Sync with job not found | Sourced candidate created, warning logged |
| TC-JB-010 | Sync failure (API timeout) | ConsecutiveFailureCount++, error logged |
| TC-JB-011 | 3 consecutive failures | Email notification sent to admin, failure count reset on success |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty DisplayName | Validation error | `SaveJobBoardProviderConfigurationCommand.Validate()` |
| Secret field empty on update without "Change" flag | Existing secret retained | Command handler logic |
| Concurrent API calls with expired token | Cache miss, re-authenticate, thread-safe via SemaphoreSlim | `BaseApiJobBoardProvider.AuthenticateAsync()` |
| Email marked seen fails | Email still tracked, retry on next cycle | `MailikitScanningMailService.MarkSeenEmails()` |
| 200+ same-day applications | Keep last 200 IDs, oldest removed | `SyncStateValue.SameDateProcessedIds max=200` |
| Job board API unreachable | ConsecutiveFailureCount++, max 10 errors retained | `SyncStateValue.RecentErrors max=10` |
| Job name exact match not found | Sourced candidate created without job link | `ICreateCandidateCommandHandler` logic |
| Out-of-order messages via message bus | Handled via LastMessageSyncDate idempotency | Consumer pattern |

---

## Usage Notes

### When to Use This File

- Implementing new Job Board provider integrations
- Fixing bugs related to sync failures or deduplication
- Understanding API contracts and validation rules
- Code review context for configuration management
- Debugging credential encryption/decryption
- Implementing new email parser strategies

### When to Use Full Documentation

- Understanding business requirements and ROI
- Stakeholder communication and demos
- Comprehensive test planning with manual QA
- Troubleshooting production sync issues
- Understanding UI/UX flows and design decisions
- Provider-specific API documentation needs

---

*Generated from comprehensive documentation. For full details, see [README.JobBoardIntegrationFeature.md](./README.JobBoardIntegrationFeature.md)*
