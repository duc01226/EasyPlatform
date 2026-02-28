# Kudos & Peer Recognition Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.KudosFeature.md](./README.KudosFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoGROWTH |
| Service | Growth.Service (PostgreSQL) |
| Database | PostgreSQL 14+ |
| Schema | Kudos schema |
| Feature Code | KD-PR-001 |
| Version | 2.0 |
| Full Docs | [README.KudosFeature.md](./README.KudosFeature.md) |

### File Locations

```
Entities:    src/Services/bravoGROWTH/Growth.Domain/Entities/Kudos/
Commands:    src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Kudos/
Queries:     src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/Kudos/
Controllers: src/Services/bravoGROWTH/Growth.Service/Controllers/KudosController.cs
Helpers:     src/Services/bravoGROWTH/Growth.Application/Helper/Kudos/
Consumers:   src/Services/bravoGROWTH/Growth.Application/ApplyPlatform/MessageBus/Consumers/
Background:  src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/
Teams Plugin: src/TeamsPlugins/kudos-plugin/src/Tab/
Angular:     src/WebV2/apps/growth-for-company/src/app/routes/kudos/
```

---

## Domain Model

### Entities

```
KudosTransaction : RootAuditedEntity<KudosTransaction, string, string?>
├── CompanyId: string
├── SenderId: string (FK to Employee)
├── ReceiverId: string (FK to Employee)
├── Quantity: int (1-5)
├── Message: string (max 2000 chars, GIN indexed)
├── Tags: List<string>
├── SentAt: DateTime
├── Status: KudosTransactionStatus (Valid | Deleted | Flagged)
├── NotificationSent: bool
├── NotificationError: string?
└── IsPotentiallyCircular: bool (fraud detection)

KudosUserQuota : RootEntity<KudosUserQuota, string>
├── EmployeeId: string (PK)
├── CompanyId: string
├── WeeklyQuotaTotal: int (default: 5)
├── WeeklyQuotaUsed: int
├── CurrentWeekStart: DateTime (Monday 00:00 UTC)
├── RemainingQuota: int (computed)
└── CanSendKudos: bool (computed)

KudosCompanySetting : RootEntity<KudosCompanySetting, string>
├── CompanyId: string
├── IsEnabled: bool
├── DefaultWeeklyQuota: int (default: 5)
├── MaxKudosPerTransaction: int (default: 5, range: 1-50)
├── QuotaResetDay: DayOfWeek (default: Monday)
└── NotificationProviders: List<NotificationProviderConfig>

KudosReaction : RootAuditedEntity<KudosReaction, string, string?>
├── TransactionId: string (FK)
├── SenderId: string (FK to Employee)
├── SentAt: DateTime
└── Unique constraint: (TransactionId, SenderId)

KudosComment : RootAuditedEntity<KudosComment, string, string?>
├── TransactionId: string (FK)
├── SenderId: string (FK to Employee)
├── Comment: string
├── SentAt: DateTime
└── Reactions: List<KudosCommentReaction>
```

### Value Objects

```
NotificationProviderConfig {
  Name: string
  ProviderType: NotificationProviderType (Microsoft=1)
  EmailDomains: List<string> (e.g., ["bravo.com.vn"])
  IsActive: bool
  MicrosoftSettings?: MicrosoftProviderSettings
}

MicrosoftProviderSettings {
  TenantId: string
}

KudosAuthContext {
  AuthSource: KudosAuthSourceType
  Employee: Employee
  KudosSetting: KudosCompanySetting
  MatchedProvider: NotificationProviderConfig?
  TimeZoneOffset: int
}
```

### Enums

```
KudosTransactionStatus: Valid | Deleted | Flagged
KudosAuthSourceType: BravoJwt=0 | Microsoft=1
NotificationProviderType: Microsoft=1
HistoryType: Received=0 | Sent=1
LeaderboardType: MostAppreciated=0 | TopGivers=1
TimePeriod: ThisWeek | ThisMonth | LastMonth | Custom
```

### Key Expressions

```csharp
// Company filter
public static Expression<Func<KudosTransaction, bool>> OfCompanyExpr(string companyId)
    => t => t.CompanyId == companyId;

// Valid transactions only
public static Expression<Func<KudosTransaction, bool>> ValidTransactionExpr()
    => t => t.Status == KudosTransactionStatus.Valid;

// Time period filter
public static Expression<Func<KudosTransaction, bool>> ByTimePeriodExpr(DateTime start, DateTime end)
    => t => t.SentAt >= start && t.SentAt < end;

// Sender/Receiver filters
public static Expression<Func<KudosTransaction, bool>> BySenderExpr(string senderId)
    => t => t.SenderId == senderId;

public static Expression<Func<KudosTransaction, bool>> ByReceiverExpr(string receiverId)
    => t => t.ReceiverId == receiverId;
```

---

## API Contracts

### Commands

```
POST /api/Kudos/send
├── Request:  SendKudosCommand { receiverEmployeeId, quantity, message?, tags? }
├── Response: SendKudosCommandResult { id, transaction: KudosTransactionDto }
└── Handler:  SendKudosCommandHandler.cs

POST /api/Kudos/reaction-transaction (v1.1.0)
├── Request:  ReactionTransactionCommand { transactionId }
├── Response: ReactionTransactionCommandResult { id, transaction }
└── Handler:  ReactionTransactionCommandHandler.cs

POST /api/Kudos/comment-transaction (v1.1.0)
├── Request:  CommentTransactionCommand { transactionId, comment }
├── Response: CommentTransactionCommandResult { id, transaction }
└── Handler:  CommentTransactionCommandHandler.cs

POST /api/Kudos/reaction-comment (v1.1.0)
├── Request:  ReactionCommentCommand { commentId, transactionId }
├── Response: ReactionCommentCommandResult { id, transaction }
└── Handler:  ReactionCommentCommandHandler.cs
```

### Queries

```
GET /api/Kudos/quota
├── Response: KudosQuotaWithEmployeesDto { quota, employees }
└── Handler:  GetKudosQuotaQueryHandler.cs

GET /api/Kudos/me
├── Response: KudosCurrentUserDto { employee, remainingQuota, transaction }
└── Handler:  GetKudosCurrentUserQueryHandler.cs

POST /api/Kudos/history
├── Request:  GetKudosHistoryQuery { type, timePeriod, employeeIds?, pageIndex, pageSize }
├── Response: PaginatedResult<KudosHistoryDto>
└── Handler:  GetKudosHistoryQueryHandler.cs

POST /api/Kudos/history-latest
├── Request:  GetKudosHistoryLatestQuery { type, timePeriod, latestDate }
├── Response: List<KudosHistoryDto>
└── Handler:  GetKudosHistoryLatestQueryHandler.cs

POST /api/Kudos/leaderboard
├── Request:  GetKudosLeaderboardQuery { type, timePeriod, organizationIds?, top? }
├── Response: KudosLeaderboardDto { items: TopEmployee[], totalQuantity }
└── Handler:  GetKudosLeaderboardQueryHandler.cs

GET /api/Kudos/admin/dashboard
├── Request:  GetKudosAdminDashboardQuery { startDate?, endDate?, branchId? }
├── Response: GetKudosAdminDashboardQueryResult { totalKudosSent, topGivers, topReceivers, dailyTrend }
└── Handler:  GetKudosAdminDashboardQueryHandler.cs

GET /api/Kudos/admin/transactions
├── Request:  GetKudosAdminTransactionsQuery { searchText?, senderId?, status?, onlyFlagged? }
├── Response: PaginatedResult<KudosTransactionDto>
└── Handler:  GetKudosAdminTransactionsQueryHandler.cs

GET /api/Kudos/employees
├── Response: List<EmployeeDto>
└── Handler:  GetKudosEmployeesQueryHandler.cs

GET /api/Kudos/organizations
├── Response: List<OrganizationDto>
└── Handler:  GetKudosOrganizationsQueryHandler.cs
```

### Headers

```
Authorization: Bearer {jwt-token}
TimeZone-Offset: {hours-from-utc}  (e.g., 7 for Vietnam)
Content-Type: application/json
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-KD-001 | Cannot send kudos to self (SenderId != ReceiverId) | `SendKudosCommand.cs:119-145` |
| BR-KD-002 | Receiver must be same company (receiver.CompanyId == sender.CompanyId) | `SendKudosCommand.cs:146-165` |
| BR-KD-003 | Quantity: 1 <= qty <= MaxKudosPerTransaction (default 5) | `SendKudosCommand.cs:119-145` |
| BR-KD-004 | Feature must be enabled (KudosCompanySetting.IsEnabled == true) | `KudosAuthContextResolver.cs:83-148` |
| BR-QM-001 | Quantity consumes quota (NewQuotaUsed = CurrentQuotaUsed + Quantity) | `KudosUserQuota.cs:51-58` |
| BR-QM-002 | Quota resets Monday 00:00 timezone-aware | `KudosQuotaResetBackgroundJobExecutor.cs:19-96` |
| BR-QM-003 | Auto-reset on week boundary before validation | `KudosQuotaHelper.cs:18-56` |
| BR-NT-001 | Notification provider matches email domain | `MicrosoftNotificationService.cs:30-86` |
| BR-NT-002 | Auto-install Teams app if not present | `MicrosoftNotificationService.cs:60-72` |
| BR-SE-001 | One reaction per user per transaction (unique: TransactionId + SenderId) | `KudosReaction.cs` |
| BR-SE-002 | Multiple comments allowed per user per transaction | `KudosComment.cs` |
| BR-SE-003 | Flat comment structure (no nested comments) | `KudosComment.cs` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => ReceiverId.IsNotNullOrEmpty(), "Receiver required")
        .And(_ => Quantity >= 1 && Quantity <= 5, "Quantity must be 1-5")
        .And(_ => Message?.Length <= 2000, "Message max 2000 chars");

// Async validation in handler
await validation
    .AndAsync(r => repo.GetByIdAsync(r.ReceiverId, ct).ThenValidateFoundAsync())
    .AndAsync(r => settingRepo.GetByCompanyAsync(companyId, ct).ThenValidateFoundAsync())
    .AndNotAsync(r => quotaRepo.AnyAsync(q => q.RemainingQuota < r.Quantity, ct), "Insufficient quota");
```

---

## Service Boundaries

### Produces Events

```
KudosTransactionCreated (via entity event bus)
├── Producer: Auto-generated platform event system
├── Trigger: KudosTransaction entity created/updated
├── Payload: KudosTransactionEntityEventBusMessage
└── Consumers: Notification service → Teams notifications
```

### Consumes Events

```
EmployeeUpdatedEvent ← Accounts service
├── Action: Sync employee display name/email for kudos
├── Idempotent: Yes (entity update checks)

CompanySettingsChangedEvent ← Accounts service
├── Action: Update KudosCompanySetting (quota, notification config)
├── Idempotent: Yes (LastMessageSyncDate check)
```

### Cross-Service Data Flow

```
Teams Plugin ──(AzureAdTeams)──▶ KudosAuthContextResolver ──▶ Growth.Service
                                        │
                                        ▼
                                Microsoft Graph API
                                        │
                                        ▼
                                    Teams Client
                                    (Notification)
```

---

## Critical Paths

### Send Kudos

```
1. Validate input (BR-KD-001, BR-KD-003)
   ├── SenderId != ReceiverId
   ├── 1 <= Quantity <= MaxKudosPerTransaction
   └── Message not null/empty
2. Resolve auth context (BravoJwt or AzureAdTeams)
   └── KudosAuthContextResolver.ResolveCurrentUserAsync()
3. Get or create quota
   ├── KudosQuotaHelper.GetOrCreateQuotaAsync()
   └── Auto-reset if week boundary crossed (BR-QM-003)
4. Validate quota sufficient (BR-QM-001)
   └── quantity <= RemainingQuota
5. Validate receiver exists + same company (BR-KD-002)
   └── repository.GetByIdAsync(ReceiverId)
6. Validate feature enabled (BR-KD-004)
   └── settingRepo.GetByCompanyAsync(companyId)
7. Create KudosTransaction entity
   ├── Id = Ulid.NewUlid()
   ├── Status = Valid
   └── Circular detection: check A→B→A pattern
8. Consume quota: quota.ConsumeQuota(quantity)
9. Save transaction + quota via repository
10. Platform auto-publishes entity event
11. Notification service receives event
12. Send Teams notification via MS Graph API (BR-NT-001, BR-NT-002)
```

### React to Kudos (v1.1.0)

```
1. Resolve auth context
2. Validate transaction exists (not Deleted)
3. Check unique reaction
   └── repo.AnyAsync(r => r.TransactionId == txId && r.SenderId == userId)
4. Create KudosReaction
   ├── Id = Ulid.NewUlid()
   ├── TransactionId = request.TransactionId
   ├── SenderId = current employee
   └── SentAt = DateTime.UtcNow
5. Save reaction
6. Return updated transaction with new totalLikes count
```

### Comment on Kudos (v1.1.0)

```
1. Resolve auth context
2. Validate transaction exists
3. Validate comment text (required, max 2000 chars)
4. Create KudosComment
   ├── Id = Ulid.NewUlid()
   ├── TransactionId = request.TransactionId
   ├── SenderId = current employee
   └── Comment = request.Comment
5. Save comment
6. Return updated transaction with new totalComments + comment details
```

### Weekly Quota Reset

```
Scheduled: Cron "0 * * * *" (every hour at minute 0)

1. For each timezone offset (-12 to +14):
   ├── Calculate Monday 00:00 boundary in UTC
   ├── Count quotas where CurrentWeekStart < NewWeekStart
2. Batch process (100 quotas per batch, max 5 concurrent):
   ├── For each quota:
   │   ├── Get company setting for WeeklyQuotaTotal
   │   ├── quota.ResetForNewWeek(newWeekStart)
   │   └── Save to repository
3. Continue batching until all quotas processed
```

### Admin Dashboard Load

```
1. CanActivateKudosPageGuard checks role: [Admin, HR, HRManager, CompanyAdmin]
2. GET /api/Kudos/admin/dashboard
3. Query transactions by date range
   └── aggregate(Sum(Quantity), Count, Distinct(SenderId), Distinct(ReceiverId))
4. Get top 10 givers/receivers (ranked by total kudos)
5. Calculate daily trend (kudos count per day)
6. Return dashboard result with counts + tables + charts
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-KD-001 | Send valid kudos | Transaction created, quota consumed, notification sent |
| TC-KD-002 | Self-kudos rejected | Validation error BR-KD-001 |
| TC-KD-003 | Cross-company rejected | Validation error BR-KD-002 |
| TC-KD-004 | Quantity out of range | Validation error BR-KD-003 |
| TC-KD-005 | Feature disabled | Validation error BR-KD-004 |
| TC-KD-006 | Insufficient quota | Validation error BR-QM-001 |
| TC-KD-007 | Quota auto-reset | Monday boundary resets quota |
| TC-KD-008 | Circular detection | IsPotentiallyCircular = true for A→B→A |
| TC-KD-009 | Teams notification sent | NotificationSent = true within 3 seconds |
| TC-KD-010 | React to kudos (v1.1.0) | Reaction created, totalLikes incremented |
| TC-KD-011 | Duplicate reaction rejected | Unique constraint on (TransactionId, SenderId) |
| TC-KD-012 | Comment on kudos (v1.1.0) | Comment created, totalComments incremented |
| TC-KD-013 | Admin dashboard loads | Correct aggregates, top givers/receivers |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Timezone offset +14 boundary | Resets on Monday 00:00 +14 | `KudosDateTimeHelper.cs:75-84` |
| Message with HTML/script | Sanitized or escaped | `SaveKudosCommand.Validate()` |
| Rapid quota clicks | Only one transaction processed | Idempotency via transaction ID |
| App uninstalled for receiver | Auto-reinstall on next notification | `MicrosoftNotificationService.cs:60-72` |
| Out-of-order message events | No state corruption | Timestamp-based validation |
| Concurrent reaction clicks | One reaction persisted | DB unique constraint |

---

## Implementation Notes

### Database Indexes

```sql
-- Primary query performance
CREATE INDEX IX_KudosTransaction_CompanyId_SentAt
  ON KudosTransaction(CompanyId, SentAt DESC);

CREATE INDEX IX_KudosTransaction_CompanyId_SenderId_SentAt
  ON KudosTransaction(CompanyId, SenderId, SentAt DESC);

-- Full-text search
CREATE INDEX IX_KudosTransaction_Message_GIN
  ON KudosTransaction USING GIN(to_tsvector('english', Message));

-- Reaction uniqueness + performance
CREATE UNIQUE INDEX IX_KudosReaction_TransactionId_SenderId
  ON KudosReaction(TransactionId, SenderId);

-- Comment queries
CREATE INDEX IX_KudosComment_TransactionId
  ON KudosComment(TransactionId);
```

### Helper Classes

```csharp
// Quota management
KudosQuotaHelper.GetOrCreateQuotaAsync(employeeId, companyId, timeZoneOffset, ct)
KudosQuotaHelper.ResetQuotaIfNewWeek(quota, timeZoneOffset)

// DateTime handling
KudosDateTimeHelper.GetCurrentWeekStart(timeZoneOffset)
KudosDateTimeHelper.IsNewWeekBoundary(oldStart, newStart)

// Transaction helpers
KudosTransactionHelper.GetTransactionByIdWithReactionsAndComments(id, ct)
KudosTransactionHelper.DetectCircularPattern(senderId, receiverId, ct)

// Auth
KudosAuthContextResolver.ResolveCurrentUserAsync(httpContext, ct)
KudosAuthContextResolver.ResolveUserByEmailAsync(email, companyId, ct)
```

### Background Jobs

```
KudosQuotaResetBackgroundJobExecutor
├── Schedule: 0 * * * * (hourly)
├── Batch size: 100 quotas
├── Max concurrent: 5
└── Duration target: < 5 min for 10K quotas

SupportQuotaRecalculationBackgroundJob (for orphaned quotas)
├── Schedule: 0 0 * * * (daily at midnight)
├── Cleanup: Reset quotas with invalid timezone offsets
```

### Microsoft Graph Integration

```csharp
// Service location
MicrosoftNotificationService.cs:30-118

// Steps
1. GetUserIdInAzureEntraIdByEmail(email) → GraphServiceClient.Users.GetAsync()
2. GetOrInstallAppAsync(userId, appId) → Ensure Teams app installed
3. SendActivityNotification(userId, message) → TeamsActivity.Send permission
```

---

## Usage Notes

### When to Use This File

- Implementing new kudos features or fixing bugs
- Adding/modifying validation rules
- Debugging notification delivery issues
- Understanding API contracts quickly
- Code review context for kudos-related PRs

### When to Use Full Documentation

- Business requirement clarification
- Stakeholder presentations
- Comprehensive test planning
- Troubleshooting production issues
- Understanding UI/UX flows and design
- Performance analysis and tuning

---

*Generated from comprehensive documentation. For full details, see [README.KudosFeature.md](./README.KudosFeature.md)*
