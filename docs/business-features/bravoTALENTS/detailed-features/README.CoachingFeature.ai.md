# Coaching Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.CoachingFeature.md](./README.CoachingFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Service | Employee.Service (MongoDB), Common.Profile (Shared) |
| Database | MongoDB (bravoTALENTS), SQL Server (Accounts) |
| Full Docs | [README.CoachingFeature.md](./README.CoachingFeature.md) |

### File Locations

```
Coaching Domain:
├── Entities:    src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/
├── Commands:    src/Services/bravoTALENTS/Employee.Application/UseCaseCommands/Coaching/
├── Queries:     src/Services/bravoTALENTS/Employee.Application/UseCaseQueries/Coaching/
├── Controller:  src/Services/bravoTALENTS/Employee.Service/Controllers/CoachingController.cs
├── Repository:  src/Services/bravoTALENTS/Employee.Application/Repositories/ICoachingRepository.cs
└── Frontend:    src/WebV2/apps/bravo-{module}-*/src/app/coaching/

Shared Profile (Connections):
├── Entities:    src/Services/Common/Common.Profile/AggregatesModel/Sharing.cs
├── Entities:    src/Services/Common/Common.Profile/AggregatesModel/OverallSharingState.cs
└── Enums:       src/Services/Common/Common.Profile/Enums/ConnectionType.cs
```

---

## Domain Model

### Entities

```
User : RootEntity
├── Id: string (ULID)
├── ExternalId: string (auth system)
├── FirstName, MiddleName, LastName: string
├── Email: string
├── ProductScope: int
├── ProfileImage: Image (URL)
├── Sharings: List<Sharing> (coaching connections)
├── AssignedModules: List<AssignedModule> (coaching role info)
└── Methods: GetAssignedCoachModule(companyId), FullName

DisconnectedUserHistory : RootEntity
├── Id: string
├── ExternalId: string (coach who was removed)
├── FullName: string (snapshot at disconnect)
├── ProductScope: int
├── ProfileImageUrl: string
├── DisconnectedDate: DateTime
├── TotalUsedCoachingConnections: int?
├── AssignedModule: AssignedModule (role info at disconnect)
└── IsAnonymous: bool (true if FullName empty after user deleted)

Sharing : RootEntity (Common.Profile)
├── Id: string
├── UserId: string (coachee profile owner)
├── CreatedByUserId: string (coach who created connection)
├── CompanyId: string
├── ProductScope: int
├── ConnectionType: ConnectionType (Individual for coaching)
├── Status: SharingStatus (Accepted | Rejected | Pending)
├── IsDeleted: bool (soft delete)
├── IsActive: bool
├── ExpirationDate: DateTime?
└── CreatedDate: DateTime

OverallSharingState : RootEntity (Common.Profile)
├── UserId: string (whose profile)
├── CreatedByUserId: string (coach)
├── CompanyId: string
├── ProductScope: int
├── ConnectionType: ConnectionType
├── Status: SharingStatus
└── IsDeleted: bool (when connection removed)
```

### Value Objects

```
AssignedModule {
  ModuleName: string ("Coaching")
  AssignedDate: DateTime
  RemovedDate: DateTime? (null if still assigned)
}

Image {
  Url: string
  Height: int?
  Width: int?
}
```

### Enums

```
CoachingStatus: Active(0) | Disconnected(1)
ConnectionType: Individual(1) | Group(2)  [Coaching uses Individual only]
SharingStatus: Accepted(1) | Rejected(2) | Pending(3)
SortingType: None(0) | Asc(1) | Desc(2)  [For expiration date sorting]
```

### Key Expressions

```csharp
// Individual connections filter
public static Expression<Func<Sharing, bool>> IndividualConnectionExpr()
    => s => s.ConnectionType == ConnectionType.Individual && !s.IsDeleted && s.Status == SharingStatus.Accepted;

// Active coaches in company
public static Expression<Func<Sharing, bool>> ActiveCoachesExpr(string companyId)
    => s => s.CompanyId == companyId && IndividualConnectionExpr().Invoke(s);

// Expiration filter (within 7 days)
public static Expression<Func<Sharing, bool>> ExpiringConnectionsExpr(DateTime checkDate)
    => s => s.ExpirationDate.HasValue && s.ExpirationDate.Value <= checkDate.AddDays(7);
```

---

## API Contracts

### Commands

```
POST /api/coachings/disconnect/{coachId}?companyId={id}
├── Request:  { coachId, companyId }
├── Response: { success: boolean }
├── Handler:  DisconnectCoach() → RemoveConnectionCommandHandler
└── Evidence: CoachingController.cs:46-50, RemoveConnectionCommandHandler.cs:41-81

POST /api/coachings/remove-pending
├── Request:  { candidateId, coachId, companyId }
├── Response: { success: boolean }
├── Handler:  RemovePendingConnectionsCommand
└── Evidence: CoachingUsersController.cs:177-181
```

### Queries

```
GET /api/coachings?companyId={id}&status={0|1}&pageSize={n}&pageIndex={n}
├── Response: CoachingPageQueryResult<CoachingSummaryModel>
├── Handler:  GetCoachingQuery → GetListCoaching()
└── Evidence: CoachingController.cs:27-44, GetCoachingQuery.cs:38-149

GET /api/coachings/users?companyId={id}&searchText={?}&gender={?}&ageRange={?}&skip={?}&take={?}
├── Response: GetCoachingUsersQueryResult { items[], totalCount, pageSize }
├── Handler:  GetCoachingUsersQuery
└── Evidence: CoachingUsersController.cs:52-95, GetCoachingUsersQuery.cs:45-86

GET /api/coachings/team-map?companyId={id}&orgUnitId={?}
├── Response: GetCoachingsForTeamMapModel[]
├── Handler:  GetCoachingUsersQuery (team map filtered)
└── Evidence: CoachingUsersController.cs:97-125

GET /api/coachings/pending-invitations?companyId={id}&pageSize={?}&pageIndex={?}
├── Response: PaginatedResult<PendingInvitation>
├── Handler:  GetPendingInvitationCandidateProfileQuery
└── Evidence: CoachingUsersController.cs:157-175
```

### DTOs

```
CoachingSummaryModel {
  ExternalId: string
  Email: string
  FullName: string
  ProfileImage: Image
  NumberOfConnections: int (since AssignedCoachRoleDate)
  TotalOfConnections: int (all time)
  AssignedCoachRoleDate: DateTime
}

GetCoachingUsersQueryResult {
  Items: GetCoachingUserItemModel[]
  TotalCount: int
  PageSize: int
  CurrentIndex: int
}

GetCoachingUserItemModel {
  UserId: string
  ExternalId: string
  Email: string
  FullName: string
  Gender: string?
  Age: int?
  ProfileImageUrl: string
  OrgUnitId: string?
  IsViewable: bool (based on OverallSharingState)
  ExpirationDate: DateTime?
  IsPending: bool
}

DisconnectedUserHistoryModel {
  ExternalId: string
  FullName: string (or "Anonymous Coach" if IsAnonymous)
  ProfileImageUrl: string
  DisconnectedDate: DateTime
  TotalUsedCoachingConnections: int?
  AssignedModule: AssignedModule
}
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-COACH-001 | Coaching uses ConnectionType.Individual only | `RemoveConnectionCommandHandler.cs:47` |
| BR-COACH-002 | Active connections cannot exceed subscription quota | `CoachingSubscriptionFilterService.cs` |
| BR-COACH-003 | Only coach (CreatedByUserId) can remove connection | `RemoveConnectionCommandHandler.cs:176` |
| BR-COACH-004 | Auto-assign coaching role on first connection | `FR-COACH-11: Coach Role Assignment` |
| BR-COACH-005 | Auto-remove coaching role when zero connections | `RemoveConnectionCommandHandler.cs:72-79` |
| BR-COACH-006 | Connection removal updates OverallSharingState.IsDeleted | `RemoveConnectionCommandHandler.cs:114-161` |
| BR-COACH-007 | Coaches can only view profiles with Accepted sharing | `GetCoachingUserItemModel.cs:23-28` |
| BR-COACH-008 | Send expiration notification 7 days before | `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob.cs` |
| BR-COACH-009 | Auto-remove expired connections at midnight UTC | `RemoveCoachingExpirationConnectionBackgroundJob.cs` |
| BR-COACH-010 | Create DisconnectedUserHistory snapshot on removal | `CoachingHelperApplicationService.cs:164-192` |
| BR-COACH-011 | Mark as anonymous if user deletes account | `DisconnectedUserHistory.cs:34` |
| BR-COACH-012 | Update team map on connection change | `RemoveConnectionCommandHandler.cs:179-185` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => CoachId.IsNotNullOrEmpty(), "Coach ID required")
        .And(_ => CompanyId.IsNotNullOrEmpty(), "Company ID required");

// Async validation in handler
await validation
    .AndAsync(r => repository.AnyAsync(s => s.CreatedByUserId == r.CoachId && s.CompanyId == r.CompanyId, ct),
        "Coach has no connections to remove")
    .AndNotAsync(r => repository.AnyAsync(s => s.CreatedByUserId != currentUserId && s.Id == r.ConnectionId, ct),
        "NoPermission");
```

---

## Service Boundaries

### Produces Events

```
EmployeeUserCoachRoleRemovedEventBusMessage → [Accounts Service]
├── Producer: RemoveConnectionCommandHandler.cs:72-79
├── Trigger: Last coaching connection removed in company
├── Payload: { UserId, CompanyId, ProductScope, ModuleName="Coaching" }
└── Purpose: Remove coach role/permission in Accounts service

EmployeeUsersConnectionRemovedEventBusMessage → [Growth, Candidate, Insights]
├── Producer: RemoveConnectionCommandHandler.cs:69-71
├── Trigger: Any Individual connection removal
├── Payload: { ProductScope, ConnectedUserIds, CompanyId, CreatedByUserId }
└── Purpose: Notify other services of connection removal
```

### Consumes Events

```
EmployeeUserCoachRoleAssignedEventBusMessage ← [Accounts Service]
├── Consumer: Handles incoming role assignment
├── Action: Update User.AssignedModules with coaching role info
└── Idempotent: Yes (checks existing assignment)

UserDeletedEventBusMessage ← [Accounts Service]
├── Consumer: Marks disconnected history as anonymous
├── Action: Clear FullName in DisconnectedUserHistory if exists
└── Idempotent: Yes (IsAnonymous flag idempotent)
```

### Cross-Service Data Flow

```
Employee.Service ──publish──▶ [RabbitMQ] ──consume──▶ Growth.Service
   (MongoDB)                                         ──consume──▶ Candidate.Service
   Source of Truth                                   ──consume──▶ Insights.Service
                                                     ──request──▶ Accounts.Service
                                                                (Permission removal)
```

---

## Critical Paths

### Disconnect Coach (Remove All Connections)

```
1. Validate request
   └── BR-COACH-001: Coach role must exist
2. Load coach by ExternalId
   └── not found: 404
3. Get all Individual connections where CreatedByUserId = coachId
   └── none found: 204 No Content
4. For each Sharing record:
   ├── Set IsDeleted = true (BR-COACH-006)
   ├── Update OverallSharingState.IsDeleted = true
   ├── Update OverallSharingState.Status = Rejected
   └── Save via SharingRepository.UpdateAsync()
5. Create DisconnectedUserHistory snapshot (BR-COACH-010)
   ├── Capture: FullName, ProfileImageUrl, AssignedModule
   ├── Set: DisconnectedDate = DateTime.UtcNow
   └── Save via DisconnectedUserHistoryRepository.CreateAsync()
6. Check if coach has ANY connections left in ANY company
   ├── If none: Publish EmployeeUserCoachRoleRemovedEventBusMessage (BR-COACH-005)
   └── If exists: Skip role removal
7. Update team map (BR-COACH-012)
   └── TeamMapService.HandleAfterUserProfileSharingChanged()
8. Publish EmployeeUsersConnectionRemovedEventBusMessage
   └── Notify Growth, Candidate services
9. Return { success: true }
```

### Get Active Coaches List

```
1. Validate: User has EmployeePolicy authorization
2. Query subscription holder by CompanyId
   └── not found: return empty list
3. Build expression for active coaches
   ├── ConnectionType == Individual (BR-COACH-001)
   ├── IsDeleted == false
   ├── Status == Accepted
   └── CreatedByUserId != null
4. Execute repository.GetCoachingsAsync() with:
   ├── Filter expression
   ├── Status filter (Active=0 or Disconnected=1)
   ├── Pagination (skip, take)
   └── Search text (optional)
5. For Active status: Query active Sharings
   ├── Count connections since AssignedCoachRoleDate
   └── Include TotalOfConnections (all time)
6. For Disconnected status: Query DisconnectedUserHistory
   ├── Include anonymity check (BR-COACH-011)
   └── Display "Anonymous Coach" if IsAnonymous
7. Transform to CoachingSummaryModel[]
   ├── Map User → ExternalId, Email, FullName, ProfileImage
   ├── Calculate NumberOfConnections
   └── Include AssignedCoachRoleDate
8. Apply pagination: skip, take, totalCount
9. Return { items[], totalCount, pageSize, pageIndex }
```

### Get Coaching Users (For Assignment)

```
1. Validate: CompanyId required
2. Check subscription quota
   ├── If exceeded: Filter out non-viewable users (BR-COACH-002)
   └── Signal: Show "quota limit reached" UI hint
3. Build query expression
   ├── Same CompanyId
   ├── Active employees (IsDeleted=false)
   ├── Apply search filter if provided
   ├── Apply gender filter if provided
   ├── Apply age range filter if provided
   └── Apply org unit filter if provided
4. Execute repository.GetCoachingUsersAsync()
5. For each user, determine viewability
   ├── Check OverallSharingState.Status (BR-COACH-007)
   ├── If Accepted AND !IsDeleted: IsViewable = true
   ├── Otherwise: IsViewable = false (cannot be assigned)
   └── Even if not viewable: include in list (for UI context)
6. Apply sorting
   ├── By name (default)
   ├── By expiration date (ascending/descending)
   └── Separate pending from accepted
7. Apply pagination: skip, take
8. Return { items: GetCoachingUserItemModel[], totalCount, pageSize, currentIndex }
```

### Remove Coaching Connection

```
1. Validate request
   ├── ConnectionId required
   ├── CoachId required
   └── CompanyId required
2. Load Sharing by ConnectionId
   └── not found: 404
3. Validate ownership (BR-COACH-003)
   ├── IF Sharing.CreatedByUserId != currentUserId: "NoPermission"
   └── IF Sharing.ConnectionType != Individual: error (BR-COACH-001)
4. Load OverallSharingState for same user+coach+company
5. Mark Sharing as deleted
   ├── Set IsDeleted = true
   ├── Set Status = Rejected (if was Pending)
   └── Save via SharingRepository.UpdateAsync()
6. Update OverallSharingState
   ├── Set IsDeleted = true
   ├── Set Status = Rejected
   └── Save via OverallSharingStateRepository.UpdateAsync()
7. Check if coach has remaining connections
   ├── Query Sharing where CreatedByUserId=coachId AND !IsDeleted
   ├── If count=0: Trigger role removal (BR-COACH-005)
   └── If count>0: Skip role removal
8. Update team map (BR-COACH-012)
   └── TeamMapService.HandleAfterUserProfileSharingChanged()
9. Publish event: EmployeeUsersConnectionRemovedEventBusMessage
10. Return { success: true, message: "Connection removed" }
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-COACH-001 | Get active coaches list | Returns pagination, connection counts, assignment dates |
| TC-COACH-002 | Disconnect last coach connection | Triggers role removal event, creates history snapshot |
| TC-COACH-003 | Disconnect with no permissions | Returns "NoPermission" error (BR-COACH-003) |
| TC-COACH-004 | Get coaching users list | Filters by company, applies quota limit |
| TC-COACH-005 | Get coaching users list (quota exceeded) | Shows only viewable users |
| TC-COACH-006 | Remove coaching connection | Updates OverallSharingState, publishes event |
| TC-COACH-007 | Disconnect disconnected coach | Handles idempotently (no duplicate history) |
| TC-COACH-008 | Expiration notification | Sends email 7 days before expiry |
| TC-COACH-009 | Auto-remove expired connection | Removes at midnight UTC, updates sharing state |
| TC-COACH-010 | Get pending invitations | Returns from candidate profile history |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Coach with multiple companies | Role removed only for target company | BR-COACH-005 |
| User deleted after disconnect | Mark as anonymous in history | `DisconnectedUserHistory.cs:34` |
| Concurrent removal attempts | Idempotent (second fails gracefully) | `RemoveConnectionCommandHandler.cs` |
| Quota exactly met | Allow assignment if count <= limit | `CoachingSubscriptionFilterService.cs` |
| Expired connection removal | Check ExpirationDate <= DateTime.UtcNow | `RemoveCoachingExpirationConnectionBackgroundJob.cs` |
| Team map enabled company | Update map on every change | `RemoveConnectionCommandHandler.cs:179-185` |
| Non-Individual connection type | Reject (Group connections not supported) | BR-COACH-001 |

---

## Usage Notes

### When to Use This File

- Implementing coaching connection features
- Fixing bugs in coach assignment/removal logic
- Adding coaching permission checks
- Debugging cross-service sync issues
- Understanding connection lifecycle

### When to Use Full Documentation

- Business requirements clarification
- Stakeholder presentations
- Comprehensive test planning
- Troubleshooting production issues
- Understanding UI flows and user stories

---

*Generated from comprehensive documentation. For full details, see [README.CoachingFeature.md](./README.CoachingFeature.md)*
