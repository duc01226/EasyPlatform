# Cross-Module Integration Test Specifications

> End-to-end test scenarios spanning multiple BravoSUITE modules

---

## Overview

These integration tests verify data flow and event processing between services via RabbitMQ message bus. Each test validates the complete workflow from producer to consumer.

---

## Integration Test Categories

| Category | Producer | Consumer(s) | Priority |
|----------|----------|-------------|----------|
| Employee Lifecycle | bravoTALENTS, Accounts | All services | P0 |
| Goal & Performance | bravoGROWTH | bravoINSIGHTS | P1 |
| Survey Analytics | bravoSURVEYS | bravoINSIGHTS | P1 |
| Notification Delivery | All services | NotificationMessage | P1 |
| Permission Sync | Accounts | PermissionProvider | P0 |

---

## TC-INT-EMP-001: Candidate Hired Creates Employee

**Priority**: P0-Critical

**Preconditions**:
- Candidate exists in bravoTALENTS with status "Offer Accepted"
- Target company exists in Accounts
- RabbitMQ message bus is operational

**Test Steps** (Given-When-Then):
```gherkin
Given a candidate "John Doe" exists in bravoTALENTS
  And the candidate has accepted an offer for company "ACME Corp"
  And the offer has a start date of "2025-02-01"
When the recruiter marks the candidate as "Hired"
Then a "CandidateHiredEvent" message is published to RabbitMQ
  And Accounts service receives the message
  And a new User record is created with the candidate's email
  And bravoGROWTH service receives the message
  And a new Employee record is created linked to the User
  And the employee's start date matches the offer date
```

**Acceptance Criteria**:
- ✅ User created in Accounts within 30 seconds of hiring
- ✅ Employee created in bravoGROWTH with correct company association
- ✅ Employee linked to newly created User ID
- ❌ Duplicate User not created if email exists
- ❌ Hiring fails gracefully if company doesn't exist

**Evidence**:
- Producer: `bravoTALENTS.Service/Application/UseCaseEvents/Candidate/PublishCandidateHiredEventHandler.cs`
- Consumer (Accounts): `Accounts.Service/Application/MessageBusConsumers/CandidateHiredConsumer.cs`
- Consumer (Growth): `bravoGROWTH.Service/Application/MessageBusConsumers/CandidateHiredConsumer.cs`
- Message: `bravoTALENTS.Service/Domain/Events/CandidateHiredEventBusMessage.cs`

**Test Data**:
```json
{
  "candidateId": "cand-001",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "companyId": "comp-acme-001",
  "offerId": "offer-001",
  "startDate": "2025-02-01",
  "jobTitle": "Software Engineer"
}
```

---

## TC-INT-EMP-002: User Created Syncs Across Services

**Priority**: P0-Critical

**Preconditions**:
- User created in Accounts service
- All consuming services are operational

**Test Steps** (Given-When-Then):
```gherkin
Given an administrator creates a new user in Accounts
  And the user is assigned to company "ACME Corp"
  And the user has role "Employee"
When the user record is saved successfully
Then a "UserCreatedEvent" message is published to RabbitMQ
  And bravoTALENTS receives and creates a corresponding candidate app user
  And bravoGROWTH receives and creates a corresponding employee record
  And bravoSURVEYS receives and creates a corresponding respondent record
  And PermissionProvider receives and caches user permissions
```

**Acceptance Criteria**:
- ✅ All services sync user data within 60 seconds
- ✅ User ID is consistent across all services
- ✅ Company association is preserved
- ❌ Partial sync does not leave orphan records

**Evidence**:
- Producer: `Accounts.Service/Application/UseCaseEvents/User/PublishUserCreatedEventHandler.cs`
- Message: `Accounts.Service/Domain/Events/UserEntityEventBusMessage.cs`
- Consumer Pattern: Each service has `UserCreatedConsumer.cs`

---

## TC-INT-GOL-001: Goal Completion Updates Analytics

**Priority**: P1-High

**Preconditions**:
- Employee has an active goal in bravoGROWTH
- Goal progress is at 100%
- bravoINSIGHTS dashboard exists for the company

**Test Steps** (Given-When-Then):
```gherkin
Given employee "Jane Smith" has a goal "Complete Q4 Sales Target"
  And the goal belongs to objective "Increase Revenue"
  And the goal progress is at 95%
When the employee updates goal progress to 100%
  And the goal status changes to "Completed"
Then a "GoalCompletedEvent" message is published
  And bravoINSIGHTS receives the event
  And the Goal Completion Rate tile is recalculated
  And the Objective Progress dashboard is updated
  And historical trend data is recorded
```

**Acceptance Criteria**:
- ✅ Analytics updated within 5 minutes
- ✅ Goal completion counted in period statistics
- ✅ Objective rollup percentages recalculated
- ❌ Deleted goals not counted in statistics

**Evidence**:
- Producer: `bravoGROWTH.Service/Application/UseCaseEvents/Goal/PublishGoalCompletedEventHandler.cs`
- Consumer: `bravoINSIGHTS.Service/Application/MessageBusConsumers/GoalCompletedConsumer.cs`
- Analytics: `bravoINSIGHTS.Service/Application/UseCaseCommands/Dashboard/RecalculateGoalMetricsCommand.cs`

---

## TC-INT-SUR-001: Survey Response Aggregation

**Priority**: P1-High

**Preconditions**:
- Survey published and distributed to employees
- Survey has numeric rating questions
- Response deadline not passed

**Test Steps** (Given-When-Then):
```gherkin
Given a survey "Employee Engagement 2025" is active
  And 50 employees have been invited
  And 30 employees have already submitted responses
When employee #31 submits their survey response
Then a "SurveyResponseSubmittedEvent" is published
  And bravoINSIGHTS receives the event
  And real-time response count is updated (31/50)
  And aggregate scores are recalculated
  And response rate percentage is updated (62%)
```

**Acceptance Criteria**:
- ✅ Real-time count updated immediately
- ✅ Aggregate calculations include new response
- ✅ Anonymous responses not traceable to individuals
- ❌ Late responses (after deadline) marked but not counted

**Evidence**:
- Producer: `bravoSURVEYS.Service/Application/UseCaseEvents/Response/PublishResponseSubmittedEventHandler.cs`
- Consumer: `bravoINSIGHTS.Service/Application/MessageBusConsumers/SurveyResponseConsumer.cs`

---

## TC-INT-NOT-001: Notification Delivery Pipeline

**Priority**: P1-High

**Preconditions**:
- NotificationMessage service operational
- Email/Push notification channels configured
- User notification preferences set

**Test Steps** (Given-When-Then):
```gherkin
Given user "Jane Smith" has email notifications enabled
  And user has registered a mobile device for push notifications
When bravoGROWTH triggers a "Goal Deadline Reminder" notification
Then NotificationMessage service receives the notification request
  And user preferences are checked
  And email notification is queued for delivery
  And push notification is sent to registered devices
  And notification status is recorded as "Sent"
```

**Acceptance Criteria**:
- ✅ Notification delivered via all enabled channels
- ✅ User preferences respected (no spam)
- ✅ Delivery status tracked per channel
- ❌ Disabled channels skipped without error

**Evidence**:
- Producer: Various services via `INotificationService.SendAsync()`
- Consumer: `NotificationMessage.Service/Application/MessageBusConsumers/NotificationRequestConsumer.cs`
- Delivery: `NotificationMessage.Service/Application/UseCaseCommands/Notification/ProcessNotificationCommand.cs`

---

## TC-INT-PER-001: Permission Cache Invalidation

**Priority**: P0-Critical

**Preconditions**:
- User has cached permissions in PermissionProvider
- Role change pending in Accounts

**Test Steps** (Given-When-Then):
```gherkin
Given user "John Doe" has role "Employee" with limited permissions
  And the permissions are cached in PermissionProvider
When an administrator promotes John to "Manager" role
Then Accounts publishes "UserRoleChangedEvent"
  And PermissionProvider invalidates John's permission cache
  And new permission set is calculated
  And all services receive updated permission context
  And John can immediately access manager-level features
```

**Acceptance Criteria**:
- ✅ Permission cache invalidated within 10 seconds
- ✅ No stale permissions used after role change
- ✅ All services respect new permission level
- ❌ Demoted users lose access immediately

**Evidence**:
- Producer: `Accounts.Service/Application/UseCaseEvents/Role/PublishRoleChangedEventHandler.cs`
- Consumer: `PermissionProvider.Service/Application/MessageBusConsumers/UserRoleChangedConsumer.cs`
- Cache: `PermissionProvider.Service/Infrastructure/Caching/PermissionCacheManager.cs`

---

## TC-INT-TEN-001: Multi-Tenant Data Isolation

**Priority**: P0-Critical

**Preconditions**:
- Two companies exist: "ACME Corp" and "Beta Inc"
- Both companies have employees and data

**Test Steps** (Given-When-Then):
```gherkin
Given user "Admin A" belongs to "ACME Corp"
  And user "Admin B" belongs to "Beta Inc"
  And both companies have goals, surveys, and employees
When Admin A queries for all goals
Then only "ACME Corp" goals are returned
  And "Beta Inc" goals are never visible
  And database queries include CompanyId filter
  And API responses contain only tenant-scoped data
```

**Acceptance Criteria**:
- ✅ 100% data isolation between tenants
- ✅ CompanyId enforced at repository level
- ✅ Cross-tenant access returns empty results, not errors
- ❌ No data leakage in any API response

**Evidence**:
- Repository Filter: All repositories extend `OfCompanyExpr()` pattern
- Request Context: `IPlatformApplicationRequestContext.CurrentCompanyId()`
- Query Example: `repository.GetAllAsync(Entity.OfCompanyExpr(companyId))`

---

## Integration Test Execution Order

For regression testing, execute in this order:

1. **P0 - Security & Data Integrity**
   - TC-INT-TEN-001 (Multi-tenant isolation)
   - TC-INT-PER-001 (Permission sync)
   - TC-INT-EMP-002 (User sync)

2. **P0 - Employee Lifecycle**
   - TC-INT-EMP-001 (Candidate hired)

3. **P1 - Business Workflows**
   - TC-INT-GOL-001 (Goal analytics)
   - TC-INT-SUR-001 (Survey aggregation)
   - TC-INT-NOT-001 (Notification delivery)

---

## Message Bus Verification

### Required Message Types

| Message | Producer | Consumers |
|---------|----------|-----------|
| `UserEntityEventBusMessage` | Accounts | All services |
| `CandidateHiredEventBusMessage` | bravoTALENTS | Accounts, bravoGROWTH |
| `GoalCompletedEventBusMessage` | bravoGROWTH | bravoINSIGHTS |
| `SurveyResponseEventBusMessage` | bravoSURVEYS | bravoINSIGHTS |
| `NotificationRequestMessage` | All | NotificationMessage |
| `PermissionChangedEventBusMessage` | Accounts | PermissionProvider |

### Health Check Endpoints

```
GET /health/rabbitmq - Message bus connectivity
GET /health/consumers - Consumer registration status
GET /health/producers - Producer registration status
```

---

## Document Maintenance

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-30 | Initial integration test specifications |

---

*Generated for BravoSUITE v2.0 - Enterprise HR & Talent Management Platform*
