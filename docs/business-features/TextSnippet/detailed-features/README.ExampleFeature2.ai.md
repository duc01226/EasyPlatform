<!-- AI-Agent Context Document v1.0 -->
<!-- Companion to: README.ExampleFeature2.md (Job Board Integration) -->

# Job Board Integration - AI Context

**Module**: TextSnippet.Setting + Candidate | **Feature**: JobBoardIntegration | **Updated**: 2026-01-11

---

## 1. Context

| Aspect | Value |
|--------|-------|
| **Purpose** | Auto-fetch job applications from external job boards via email scanning (IMAP) and direct API integration |
| **Key Entities** | JobBoardProviderConfiguration, OrganizationalUnit.JobBoardIntegration, Candidate, Application, Job |
| **Service** | Setting.Service (config), Candidate.Service (processing) |
| **Database** | MongoDB |
| **Status** | ITViec API: Released; Email: Active; Other Providers: Planned |

### Scope
- **Users**: HR Admins configure providers; System auto-syncs applications
- **Operations**: CRUD configs, scheduled sync (every 5 min), dual integration (Email + API)
- **Integration**: Cross-service via RabbitMQ (Setting → Candidate)

---

## 2. File Locations

| Layer | Path |
|-------|------|
| **Entity** | `Setting.Domain/.../JobBoardProviderConfiguration.cs`, `AuthConfigurationValue.cs`, `SyncStateValue.cs` |
| **Enums** | `Setting.Domain/Enums/{JobBoardProviderType,AuthType,FetchMethod}.cs` |
| **Command** | `Setting.Application/UseCaseCommands/.../SaveJobBoardProviderConfigurationCommand.cs` |
| **Controller** | `Setting.Service/Controllers/JobBoardProviderConfigurationController.cs` |
| **Scheduler** | `Setting.Application/UseCaseJobs/JobBoardApiSyncSchedulerHostedService.cs` |
| **Provider Base** | `Candidate.Application/ScanMailBoxModule/Providers/Base/BaseApiJobBoardProvider.cs` |
| **ITViec Provider** | `ScanMailBoxModule/Providers/ITViec/ITViecApiProvider.cs` |
| **Sync Service** | `ScanMailBoxModule/Services/JobBoardApplicationSyncService.cs` |
| **Email Parsers** | `ScanMailBoxModule/Services/Scan{Provider}MailboxService.cs` |
| **Frontend** | `apps/playground-setting/src/app/routes/job-board/*.component.ts` |

---

## 3. Domain Model

### JobBoardProviderConfiguration

| Property | Type | Constraints | Notes |
|----------|------|-------------|-------|
| Id | string | ULID, Required | Primary key |
| CompanyId | string | Required | Tenant scope |
| ProviderType | JobBoardProviderType | Required | ITViec=1, VietnamWorks=2, TopCV=3, etc. |
| FetchMethod | FetchMethod | Required | Email=0, API=1, Hybrid=2 |
| IsEnabled | bool | Required | Scheduler filter |
| DisplayName | string | Required, MaxLength(256) | UI label |
| AuthConfiguration | AuthConfigurationValue | Embedded | Credentials, BaseUrl, timeout |
| SyncState | SyncStateValue | Embedded | LastSyncedAt, LastProcessedApplicationDate, JobSyncInfos, SameDateProcessedIds |

### AuthConfigurationValue (Embedded)

| Property | Type | Notes |
|----------|------|-------|
| AuthType | AuthType | OAuth2ClientCredentials=1, ApiKey=3, BasicAuth=4 |
| ClientId | string? | For OAuth2 |
| ClientSecret | string? | **Encrypted** at rest |
| ApiKey | string? | **Encrypted** |
| BaseUrl | string | API endpoint (SSRF validated) |
| TimeoutSeconds | int | Default: 30 |
| MaxRetryAttempts | int | Default: 3 |

### SyncStateValue (Embedded)

| Property | Type | Notes |
|----------|------|-------|
| LastSyncedAt | DateTime? | Last attempted sync |
| LastSuccessfulSyncAt | DateTime? | Last successful sync |
| LastProcessedApplicationDate | DateTime? | Newest SubmittedAt date processed (primary filter) |
| JobSyncInfos | Dict<string, JobSyncInfo> | Track app counts per job (max 5000, auto-prune > 90 days) |
| SameDateProcessedIds | List<string> | IDs with SubmittedAt == LastProcessedApplicationDate (edge case) |
| TotalApplicationsProcessed | long | Total counter |
| ConsecutiveFailureCount | int | Auto-disable threshold |

**Key Expressions**: `EnabledApiProvidersExpr()` → `c => c.IsEnabled && c.FetchMethod != Email`, `HasValidCredentials()` → check ClientId/Secret

---

## 4. API Contracts

### Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | `/api/job-board-provider-configuration` | GetJobBoardProviderConfigurationsQuery | OrgUnitAdmin+ |
| GET | `/api/job-board-provider-configuration/{id}` | GetJobBoardProviderConfigurationByIdQuery | OrgUnitAdmin+ |
| POST | `/api/job-board-provider-configuration` | SaveJobBoardProviderConfigurationCommand | OrgUnitAdmin+ |
| DELETE | `/api/job-board-provider-configuration/{id}` | DeleteJobBoardProviderConfigurationCommand | SystemAdmin |
| POST | `/api/job-board-provider-configuration/trigger-sync` | TriggerJobBoardApiSyncCommand | OrgUnitAdmin+ |

**SaveCommand**: `{ id?, companyId, providerType, fetchMethod, displayName, isEnabled, authConfiguration: { authType, clientId, clientSecret?, baseUrl } }` → `{ id, companyId, providerType, displayName, createdDate }`

**Messages**: `JobBoardApiTriggerSyncRequestBusMessage` (Setting→Candidate), `SettingUpdateJobBoardSyncStateRequestBusMessage` (Candidate→Setting)

---

## 5. Business Rules

### Validation Rules

| ID | Rule | Condition | Action | Evidence |
|----|------|-----------|--------|----------|
| BR-01 | DisplayName required | DisplayName.IsNullOrEmpty() | Validation error | `SaveJobBoardProviderConfigurationCommand.Validate()` |
| BR-02 | BaseUrl HTTPS only | !BaseUrl.StartsWith("https://") | Validation error | `BaseApiJobBoardProvider.ValidateBaseUrl()` |
| BR-03 | SSRF prevention | BaseUrl points to private IP | Throw JobBoardSecurityException | `BaseApiJobBoardProvider.ValidateBaseUrl()` |
| BR-04 | ClientSecret encrypted | On save | Encrypt before persist | `SaveJobBoardProviderConfigurationCommandHandler` |
| BR-05 | Unique provider per company | Duplicate ProviderType + CompanyId | Validation error | `JobBoardProviderConfiguration.UniqueExpr()` |

**State Transitions**: Disabled → Enabled (valid creds), Enabled → Disabled (5 consecutive failures), Empty SyncState → Populated (first sync)

**Async Validation**: `.AndNotAsync(r => repo.AnyAsync(UniqueExpr(r.CompanyId, r.ProviderType), ct), "Provider already configured")`

---

## 6. Patterns

### Required ✅

| Pattern | Implementation |
|---------|----------------|
| **Strategy** | `IJobBoardApplicationProvider` (ITViecApiProvider, VietnamWorksApiProvider, etc.) |
| **Template Method** | `BaseApiJobBoardProvider` (common auth, paging, filtering) |
| **Factory** | `JobBoardProviderFactory.GetProvider(JobBoardProviderType)` |
| **Object Pool** | `MailikitScanningMailService.ImapClientPool` (IMAP connections) |
| **Double-Checked Locking** | `BaseApiJobBoardProvider.AuthenticateAsync()` (prevents race on token refresh) |
| **Request Pattern** | `SettingUpdateJobBoardSyncStateRequestBusMessage` (Setting owns contract, Candidate sends) |
| **Date-Based Filtering** | `SyncStateValue.LastProcessedApplicationDate` (avoid storing all IDs) |

### Anti-Patterns ❌

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Store all processed app IDs | Use `LastProcessedApplicationDate` + `SameDateProcessedIds` (bounded) |
| Sync without pagination | Use skip/take pagination (`GetJobsPagedAsync`, `GetApplicationsPagedAsync`) |
| Expose ClientSecret in API | Return `HasClientSecret: bool` only |
| No SSRF validation | Validate BaseUrl blocks private IPs before requests |
| Unbounded JobSyncInfos growth | Auto-prune stale jobs > 90 days, limit to 5000 |

---

## 7. Integration

### Message Bus Events

| Event | Direction | Consumer | Purpose |
|-------|-----------|----------|---------|
| JobBoardApiTriggerSyncRequestBusMessage | Setting → Candidate | JobBoardApiTriggerSyncRequestBusMessageConsumer | Trigger scheduled sync |
| ScanMailBoxTriggerScanRequestBusMessage | Setting → Candidate | ScanMailBoxTriggerScanRequestBusMessageConsumer | Trigger email scan |
| ScanMailBoxNewJobApplicationEmailReceivedEventBusMessage | Candidate → Candidate | ScanMailBoxNewJobApplicationEmailReceivedEventBusConsumer | Create Candidate/Application |
| SettingUpdateJobBoardSyncStateRequestBusMessage | Candidate → Setting | SettingUpdateJobBoardSyncStateRequestBusMessageConsumer | Update SyncState after sync |

**Producer**: `JobBoardApiSyncMessageProvider.SendSyncTriggerMessagesAsync()` → fetch enabled configs, send message

**Consumer**: `JobBoardApiTriggerSyncRequestBusMessageConsumer.HandleLogicAsync()` → `syncService.SyncFromMessageAsync()` (max 5 parallel)

---

## 8. Security

### Authorization Matrix

| Role | View Config | Create | Edit | Delete | Trigger Sync |
|------|:-----------:|:------:|:----:|:------:|:------------:|
| SystemAdmin | ✅ | ✅ | ✅ | ✅ | ✅ |
| OrgUnitAdmin | ✅ (own company) | ✅ | ✅ | ❌ | ✅ |
| HR Manager | ✅ | ❌ | ❌ | ❌ | ✅ |

**Auth**: `[PlatformAuthorize(SystemAdmin, OrgUnitAdmin)]` on Save/Delete endpoints

**Encryption**: ClientSecret encrypted on save (`SecurityHelper.EncryptText`), decrypted in provider only

**SSRF**: `ValidateBaseUrl()` blocks http://, localhost, private IPs (10.x, 172.16-31.x, 192.168.x)

---

## 9. Test Scenarios

### Critical Test Cases

| ID | Scenario | Priority |
|----|----------|----------|
| TS-API-P0-001 | Create valid ITViec config | P0 |
| TS-API-P0-002 | OAuth2 authentication works | P0 |
| TS-API-P0-003 | Sync fetches jobs and applications | P0 |
| TS-API-P1-004 | Skip already processed applications via date-based filtering | P1 |
| TS-EMAIL-P0-001 | Email scan creates Candidate | P0 |
| TS-API-P2-001 | Token caching prevents redundant auth | P2 |
| TS-API-P3-003 | Auto-prune stale jobs > 90 days | P3 |

**TS-API-P1-004 - Date-Based Filtering**:
GIVEN LastProcessedApplicationDate="2024-01-15T10:00:00Z", app-older (2024-01-14), app-same (2024-01-15 in SameDateProcessedIds)
WHEN sync encounters → THEN skip older, skip same-date, early termination
Evidence: `BaseApiJobBoardProvider.FilterNewApplicationsWithEarlyTermination()`

---

## 10. Quick Reference

**Common Operations**:
```csharp
var provider = providerFactory.GetProvider(JobBoardProviderType.ITViec);
var auth = await provider.AuthenticateAsync(config, ct); // Cached w/ double-check locking
var jobs = await provider.GetJobsPagedAsync(config, auth, skip, take, ct);
var jobsWithNew = provider.DetectJobsWithNewApplications(jobs, syncState); // Count comparison
var newApps = provider.FilterNewApplications(apps, syncState); // Date-based filter
var cvResult = await provider.DownloadCvAsync(auth, downloadUrl, ct);
```

### Decision Tree

```
New provider to add?
├── Step 1: Add enum to JobBoardProviderType (Setting.Domain)
├── Step 2: Create {Provider}ApiProvider : BaseApiJobBoardProvider (Candidate.Application)
│   └── Override: AuthenticateWithProviderAsync, GetJobsPagedInternalAsync, GetApplicationsPagedInternalAsync
├── Step 3: Register in JobBoardProviderFactory.GetProvider()
└── Step 4: Register DI: services.AddScoped<{Provider}ApiProvider>()

Troubleshooting sync issues?
├── Check SyncState.RecentErrors for error messages
├── Verify IsEnabled = true and FetchMethod = API
├── Check LastSyncedAt vs LastSuccessfulSyncAt (if different → failing)
├── Verify ConsecutiveFailureCount < 5 (auto-disables at 5)
└── Check token cache: db.ProviderCachedAuthTokens.find({ ConfigurationId: "..." })
```

**SyncState Methods**: `CheckApplicationStatus(appId, submittedAt)`, `UpdateJobInfo(jobId, count)`, `PruneStaleJobs()`, `UpdateLastProcessedDate(date, ids)`, `MarkSuccess(count)`

**Constants**: StaleJobThresholdDays=90, MaxTrackedJobs=5000, SyncIntervalMinutes=5, MaxConcurrentSyncs=5, MaxConcurrentCvDownloads=3, JobPageSize=50, ApplicationPageSize=100

---

_Companion to full documentation: [README.ExampleFeature2.md](README.ExampleFeature2.md)_
