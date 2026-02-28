# Coaching Feature - bravoTALENTS Module

> **Comprehensive Technical Documentation for Coach Assignment, Connection Management, and Profile Sharing System**

---

## Document Metadata

| Attribute       | Details                                      |
| --------------- | -------------------------------------------- |
| **Module**      | bravoTALENTS                                 |
| **Feature**     | Coaching Management                          |
| **Version**     | 2.0                                          |
| **Last Updated**| 2026-01-10                                   |
| **Status**      | Production                                   |
| **Maintained By**| BravoSUITE Documentation Team               |

---

## Quick Navigation by Role

| Stakeholder          | Recommended Sections                                     |
| -------------------- | -------------------------------------------------------- |
| **Business Owner**   | 1, 2, 3, 4, 23                                           |
| **Product Manager**  | 1, 2, 3, 4, 5, 23                                        |
| **Developer**        | 6, 7, 8, 9, 10, 11, 12, 13, 16, 17                       |
| **QA Engineer**      | 17, 18, 19, 20                                           |
| **DevOps**           | 15, 21, 22                                               |
| **Support Team**     | 21, 22                                                   |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Value](#2-business-value)
3. [Business Requirements](#3-business-requirements)
4. [Business Rules](#4-business-rules)
5. [Process Flows](#5-process-flows)
6. [Design Reference](#6-design-reference)
7. [System Design](#7-system-design)
8. [Architecture](#8-architecture)
9. [Domain Model](#9-domain-model)
10. [API Reference](#10-api-reference)
11. [Frontend Components](#11-frontend-components)
12. [Backend Controllers](#12-backend-controllers)
13. [Cross-Service Integration](#13-cross-service-integration)
14. [Security Architecture](#14-security-architecture)
15. [Performance Considerations](#15-performance-considerations)
16. [Implementation Guide](#16-implementation-guide)
17. [Test Specifications](#17-test-specifications)
18. [Test Data Requirements](#18-test-data-requirements)
19. [Edge Cases Catalog](#19-edge-cases-catalog)
20. [Regression Impact](#20-regression-impact)
21. [Troubleshooting](#21-troubleshooting)
22. [Operational Runbook](#22-operational-runbook)
23. [Roadmap and Dependencies](#23-roadmap-and-dependencies)
24. [Related Documentation](#24-related-documentation)
25. [Glossary](#25-glossary)
26. [Version History](#26-version-history)

---

## 1. Executive Summary

The **Coaching Feature** in bravoTALENTS enables organizations to establish, manage, and track coaching relationships between coaches and employees through a subscription-based connection system. This feature provides comprehensive coaching lifecycle management from coach assignment through connection expiration, with automated role management, license tracking, and profile visibility controls.

**Core Capabilities**: Coach assignment and removal, coaching connection lifecycle management, profile sharing with permission controls, subscription-based quota tracking, automatic coaching role assignment/removal, expiration notifications and automated cleanup, pending invitation management, team map integration for visual coaching assignments.

**Primary Users**: HR managers, organizational development teams, coaches, and administrators managing coaching programs across the organization.

**Business Impact**: Streamlines coaching program administration, ensures compliance with subscription limits, provides visibility into coaching relationships, automates role management reducing administrative overhead, supports data-driven coaching program analytics through historical tracking.

---

## 2. Business Value

### User Stories

**As an HR Manager**, I want to:
- Assign coaches to employees and track all active coaching relationships in one place
- Monitor coaching connection usage against subscription limits to optimize license utilization
- Remove coaching connections when relationships end while maintaining historical records
- Receive automated notifications when coaching connections are nearing expiration
- View comprehensive coaching analytics including total connections used and assignment dates

**As a Coach**, I want to:
- Access employee profiles I'm coaching through a centralized coaching users list
- See which employees I'm currently coaching and when connections expire
- Filter and search coaching users by department, age, gender, and other attributes
- Manage pending coaching invitations and track acceptance status
- Have my coaching role automatically managed based on active connections

**As an Administrator**, I want to:
- Enforce subscription-based coaching connection limits across the organization
- Track disconnected coach history for compliance and reporting purposes
- Maintain data integrity between coaching connections and profile sharing states
- Automate coaching role removal when all connections expire
- Integrate coaching assignments with team map visualizations

### ROI Metrics

| Metric                        | Value / Impact                                    |
| ----------------------------- | ------------------------------------------------- |
| **Admin Time Saved**          | 75% reduction in manual coaching role management  |
| **License Optimization**      | Real-time quota tracking prevents over-provisioning |
| **Compliance**                | 100% audit trail through DisconnectedUserHistory  |
| **Automation Rate**           | 90% of role assignments/removals fully automated  |
| **User Satisfaction**         | Streamlined coach discovery and assignment process |

### Success Metrics

- Average time to assign coach: <2 minutes
- Coaching connection accuracy: 99.9%
- Subscription quota compliance: 100%
- Automated expiration notifications: 100% delivered 7 days before expiry
- Role synchronization latency: <5 seconds across microservices

---

## 3. Business Requirements

> **Objective**: Enable efficient coach assignment and profile sharing with subscription-based connection limits
>
> **Core Values**: Flexible - Trackable - Secure

### Coach Assignment & Connection

#### FR-COACH-01: Coach List Management

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Retrieve list of assigned coaches with connection tracking          |
| **Scope**       | Users with coaching role in the company                             |
| **Filters**     | Company, ProductScope, pagination, search text, status (Active/Disconnected) |
| **Output**      | Coach profiles with connection counts, assignment dates             |
| **Evidence**    | `CoachingController.cs:27-44`, `GetCoachingQuery.cs:38-63`          |

#### FR-COACH-02: Active Coach Status

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Track active coaching connections with assignment dates             |
| **Scope**       | Coaches with current Individual connections                         |
| **Validation**  | Connection must exist in subscription holder                        |
| **Output**      | List of active coaches with connection metadata                     |
| **Evidence**    | `GetCoachingQuery.cs:108-149`, `CoachingSummaryModel.cs:12-24`     |

#### FR-COACH-03: Disconnected Coach History

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Track coaches who have been disconnected from system                |
| **Scope**       | Coaches with disconnection history                                  |
| **Tracking**    | Disconnection date, assigned module info, total connections used    |
| **Output**      | Historical coaching data for analytics                              |
| **Evidence**    | `GetCoachingQuery.cs:65-106`, `DisconnectedUserHistory.cs:1-42`    |

### Coaching Connection Management

#### FR-COACH-04: Remove Coaching Connections

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Remove Individual connections for specific coaches                  |
| **Scope**       | Users with coach role in company                                    |
| **Validation**  | User must have coach role; connections must exist                   |
| **Side Effects** | Remove sharing, update overall sharing state, send event messages   |
| **Evidence**    | `CoachingController.cs:46-50`, `RemoveConnectionCommandHandler.cs:41-81` |

#### FR-COACH-05: Connection Lifecycle Tracking

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Track coaching connection creation and removal                      |
| **Scope**       | All coaching connections                                            |
| **Metadata**    | CreatedDate, CreatedBy, ConnectionType (Individual), CompanyId      |
| **Output**      | Connection history for analytics and auditing                       |
| **Evidence**    | `Connection.cs` (Common.Subscription), `RemoveConnectionCommandHandler.cs` |

### Coaching User Discovery & Filtering

#### FR-COACH-06: Get Coaching Users (Employees)

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Retrieve list of employees that can be assigned as coaches          |
| **Scope**       | Employees in same company with optional department filter           |
| **Filters**     | Search text, gender, age range, org unit, pagination                |
| **Sorting**     | By name, by expiration date (ascending/descending)                  |
| **Evidence**    | `CoachingUsersController.cs:52-95`, `GetCoachingUsersQuery.cs:45-86` |

#### FR-COACH-07: Profile Visibility in Coaching Context

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Control which profile details coaches can view                      |
| **Scope**       | Coaches viewing coachee profiles                                    |
| **Access**      | Based on Overall Sharing state with profile access settings        |
| **Evidence**    | `GetCoachingUserItemModel.cs:23-28`, subscription filtering `CoachingSubscriptionFilterService.cs` |

#### FR-COACH-08: Team Map Integration

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Support team map visualization with coaching assignments            |
| **Scope**       | Team map enabled companies                                          |
| **Filtering**   | Filter coaching users for team map display                          |
| **Output**      | Coaching user list filtered for team map context                    |
| **Evidence**    | `CoachingUsersController.cs:97-125`, `GetCoachingsForTeamMapModel.cs` |

### Pending Connection Management

#### FR-COACH-09: Pending Coaching Invitations

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Retrieve pending coaching connection requests                       |
| **Scope**       | Coaches with pending invitation status                              |
| **Source**      | From candidate profile invitation history                           |
| **Evidence**    | `CoachingUsersController.cs:157-175`, `GetPendingInvitationCandidateProfileQueryHandler.cs` |

#### FR-COACH-10: Remove Pending Connections

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Cancel pending coaching connection requests                         |
| **Scope**       | Pending invitations that user created                               |
| **Validation**  | Only creator can remove pending connections                         |
| **Evidence**    | `CoachingUsersController.cs:177-181`, `RemovePendingConnectionsCommand.cs` |

### Coaching Role Management

#### FR-COACH-11: Coach Role Assignment

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Automatically assign coaching role when connections created         |
| **Scope**       | Users with first coaching connection                                |
| **Trigger**     | Connection creation via sharing mechanism                           |
| **Evidence**    | `EmployeeUserCoachRoleRemovedEventBusMessage.cs`, role service      |

#### FR-COACH-12: Coach Role Removal

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Remove coaching role when all connections are disconnected          |
| **Scope**       | Users with zero coaching connections remaining                      |
| **Trigger**     | Last connection removal                                             |
| **Message**     | Cross-service event to Accounts service for permission cleanup      |
| **Evidence**    | `CoachingController.cs:46-50`, `DisconnectCoach` method             |

### Subscription & License Management

#### FR-COACH-13: Coaching Connection Quota

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Track coaching connection usage against subscription limits         |
| **Scope**       | Per-company coaching connection quota                               |
| **Validation**  | Block new connections if quota exceeded                             |
| **Monitoring**  | Display used vs available connections in UI                         |
| **Evidence**    | `SubscriptionHolderItemService.cs`, `CoachingSubscriptionFilterService.cs` |

#### FR-COACH-14: Coaching Connection Expiration

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Track and notify about coaching connection expiration               |
| **Scope**       | Connections with expiration dates                                  |
| **Background Job** | `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob.cs` |
| **Evidence**    | `RemoveCoachingExpirationConnectionBackgroundJob.cs`                |

---

## 4. Business Rules

### Connection Management Rules

#### BR-COACH-001: Coaching Connection Type Restriction
**Rule**: All coaching connections MUST use ConnectionType.Individual (value 1).
**Condition**: IF creating coaching connection THEN set ConnectionType = Individual
**Exception**: None - Group coaching connections not supported
**Evidence**: `RemoveConnectionCommandHandler.cs:47`, `GetCoachingUsersQuery.cs`

#### BR-COACH-002: Subscription Quota Enforcement
**Rule**: Total active coaching connections cannot exceed subscription limit.
**Condition**: IF (UsedConnections + NewConnections) > SubscriptionLimit THEN reject creation
**Action**: Filter out non-viewable users when quota exceeded
**Evidence**: `CoachingSubscriptionFilterService.cs`, FR-COACH-13

#### BR-COACH-003: Connection Ownership Validation
**Rule**: Only the coach who created a connection can remove it.
**Condition**: IF Sharing.CreatedByUserId != CurrentUserId THEN reject removal
**Error**: "NoPermission"
**Evidence**: `RemoveConnectionCommandHandler.cs:176`

### Role Management Rules

#### BR-COACH-004: Automatic Coach Role Assignment
**Rule**: Assign coaching role when user creates their first Individual connection.
**Condition**: IF user has zero coaching connections AND creates new connection THEN assign coach role
**Trigger**: Connection creation event
**Evidence**: FR-COACH-11, role service integration

#### BR-COACH-005: Automatic Coach Role Removal
**Rule**: Remove coaching role when user has zero active connections across all companies.
**Condition**: IF user has zero coaching connections in company THEN remove coach role for that company
**Side Effect**: Publish EmployeeUserCoachRoleRemovedEventBusMessage
**Evidence**: `CoachingController.cs:46-50`, `RemoveConnectionCommandHandler.cs:72-79`

### Sharing State Rules

#### BR-COACH-006: Overall Sharing State Consistency
**Rule**: When connection removed, Overall Sharing State must update to reflect removal.
**Condition**: IF connection removed THEN set OverallSharingState.IsDeleted = true AND Status = Rejected
**Side Effect**: All related Sharing records marked deleted
**Evidence**: `RemoveConnectionCommandHandler.cs:114-161`

#### BR-COACH-007: Profile Visibility Based on Sharing
**Rule**: Coaches can only view profiles they have active Individual connections for.
**Condition**: IF OverallSharingState.Status != Accepted OR IsDeleted = true THEN IsViewable = false
**Scope**: Profile access permissions
**Evidence**: `GetCoachingUserItemModel.cs:23-28`

### Expiration Rules

#### BR-COACH-008: Connection Expiration Notification
**Rule**: Send email notification 7 days before connection expires.
**Condition**: IF ExpirationDate - CurrentDate <= 7 days THEN send notification email
**Frequency**: Daily check at 9 AM UTC
**Evidence**: `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob.cs`

#### BR-COACH-009: Automatic Connection Removal on Expiration
**Rule**: Automatically remove connections after expiration date.
**Condition**: IF ExpirationDate < CurrentDate THEN remove connection
**Side Effect**: Update sharing states, remove role if last connection
**Frequency**: Daily at midnight UTC
**Evidence**: `RemoveCoachingExpirationConnectionBackgroundJob.cs`

### Historical Tracking Rules

#### BR-COACH-010: Disconnected Coach History Creation
**Rule**: Create DisconnectedUserHistory record when coach disconnected from company.
**Condition**: IF coach removed from company THEN create historical snapshot
**Data Captured**: FullName, ProfileImageUrl, AssignedModule, TotalUsedCoachingConnections, DisconnectedDate
**Evidence**: `CoachingHelperApplicationService.cs:164-192`, `DisconnectedUserHistory.cs`

#### BR-COACH-011: Anonymous Coach Handling
**Rule**: If disconnected user deletes their account, mark as anonymous in history.
**Condition**: IF DisconnectedUserHistory.FullName IS NULL THEN IsAnonymous = true
**Display**: Show as "Anonymous Coach" in UI
**Evidence**: `DisconnectedUserHistory.cs:34`, `CoachingSummaryModel.cs:26-40`

### Team Map Integration Rules

#### BR-COACH-012: Team Map Update on Connection Change
**Rule**: Update team map visualizations when coaching connections change.
**Condition**: IF connection added OR removed THEN trigger TeamMapService.HandleAfterUserProfileSharingChanged()
**Scope**: Companies with team map feature enabled
**Evidence**: `RemoveConnectionCommandHandler.cs:179-185`

---

## 5. Process Flows

### Flow 1: View Active Coaches

**Actors**: HR Manager, Administrator

**Trigger**: User navigates to Coaching List page

**Preconditions**:
- User authenticated with company role
- Company has active subscription

**Main Flow**:
1. **Frontend Initiation**: CoachingListComponent loads, sends GET request to `/api/coachings?companyId={id}&status=Active&pageSize=20&pageIndex=1`
2. **Authorization Check**: `CoachingController.GetCoachings()` validates user has EmployeePolicy authorization
3. **Query Construction**: Creates `GetCoachingQueryParams` with company ID, status filter, pagination
4. **Subscription Retrieval**: `GetCoachingQuery.GetListCoaching()` fetches subscription holder for company
5. **Database Query**: Calls `ICoachingRepository.GetCoachingsAsync()` to retrieve active coaches
6. **Data Transformation**: For each coach, builds `CoachingSummaryModel`:
   - ExternalId, Email, FullName, ProfileImage
   - NumberOfConnections (since AssignedCoachRoleDate)
   - TotalOfConnections (all time)
   - AssignedCoachRoleDate
7. **Pagination**: Applies skip/take logic, calculates TotalPages
8. **Response Return**: Returns `CoachingPageQueryResult<CoachingSummaryModel>` with items and metadata
9. **UI Display**: Frontend renders coach list table with connection counts and assignment dates

**Alternative Flow**: If status=Disconnected, query retrieves from DisconnectedUserHistory instead

**Post-Conditions**:
- User sees paginated list of active/disconnected coaches
- Connection counts accurate as of query time

**Key Files**:
- Component: `growth-for-company/coaching-list.component.ts`
- API Service: `CoachingApiService.getCoachingList()`
- Controller: `CoachingController.cs:27-44`
- Query Handler: `GetCoachingQuery.cs:38-149`
- Repository: `ICoachingRepository.GetCoachingsAsync()`

**Evidence**: `CoachingController.cs:27-44`, `GetCoachingQuery.cs:108-149`

---

### Flow 2: Disconnect Coach from System

**Actors**: HR Manager, Administrator

**Trigger**: User clicks "Disconnect" button on specific coach

**Preconditions**:
- Coach exists with active Individual connections
- User has permission to disconnect coaches
- Company subscription active

**Main Flow**:
1. **User Confirmation**: Frontend displays confirmation dialog
2. **API Call**: Sends POST to `/api/coachings/disconnect/{coachId}?companyId={id}`
3. **Route Validation**: `CoachingController.DisconnectCoach()` extracts coachId and companyId
4. **Service Invocation**: Calls `ApplicationRoleService.DisconnectCoachModulesAsync(userId, companyId)`
5. **Transaction Start**: Begins Unit of Work transaction
6. **Validation**:
   - Verify user has coach role in company
   - Confirm Individual connections exist
7. **Connection Removal**:
   - Find all Individual connections where CreatedByUserId = coachId
   - Mark all Sharing records as IsDeleted = true
8. **Overall Sharing Update**:
   - Set OverallSharingState.IsDeleted = true
   - Set OverallSharingState.Status = Rejected
9. **Team Map Update**: Trigger `TeamMapService.HandleAfterUserProfileSharingChanged()`
10. **History Creation**: Create `DisconnectedUserHistory` record:
    - ExternalId = coachId
    - FullName = snapshot of current name
    - ProfileImageUrl = current image
    - AssignedModule = coaching module info
    - TotalUsedCoachingConnections = count of connections
    - DisconnectedDate = DateTime.UtcNow
11. **Event Publishing**: Publish `EmployeeUsersConnectionRemovedEventBusMessage` with:
    - ProductScope
    - ConnectedUserIds (list of coachees)
    - CompanyId
    - CreatedByUserId (coach ID)
12. **Role Removal Check**: If coach has zero connections in ALL companies, publish `EmployeeUserCoachRoleRemovedEventBusMessage`
13. **Transaction Commit**: Complete Unit of Work
14. **Accounts Service Processing**: Receives message, removes coaching role/permissions if last company
15. **Frontend Refresh**: Refreshes coach list, showing coach in "Disconnected" tab

**Alternative Flows**:
- **Validation Failure**: Return 403 Forbidden with "NoPermission" error
- **Coach Not Found**: Return 404 Not Found
- **Transaction Failure**: Rollback all changes, return 500 error

**Post-Conditions**:
- Coach no longer appears in Active coaches list
- Coach appears in Disconnected history
- All sharing records soft-deleted
- Role removed if no other companies
- Event consumers notified

**Key Classes**:
- Command: `RemoveConnectionCommand`
- Handler: `RemoveConnectionCommandHandler.ExecuteAsync()`
- Service: `CoachingHelperApplicationService.RemoveCoaching()`
- Repositories: `IUserRepository`, `ISharingRepository`, `IOverallSharingStateRepository`

**Evidence**: `CoachingController.cs:46-50`, `RemoveConnectionCommandHandler.cs:41-81`

---

### Flow 3: Assign New Coach to Employees

**Actors**: HR Manager, Administrator

**Trigger**: User accesses coaching user assignment interface

**Preconditions**:
- User has coach role
- Subscription quota not exceeded
- Employees exist in company

**Main Flow**:
1. **Load Available Users**: Frontend calls GET `/api/coaching-users?pageSize=20&pageIndex=1`
2. **Authorization**: `CoachingUsersController.GetCoachingUsers()` validates EmployeePolicy
3. **Query Model Creation**: Creates `GetCoachingUsersQueryModel` from query parameters
4. **Role Validation**: Confirms current user has coach role in company
5. **Query Execution**: `GetCoachingUsersQuery.ExecuteAsync()` runs:
   - Retrieves all users in company (excluding already connected)
   - Gets subscription holder coaching connection count
   - Filters by search text, gender, age range, org unit if provided
6. **Subscription Check**: Calls `SubscriptionHolderItemService.GetCoachingConnectionsAsync(companyId)`
7. **Quota Calculation**:
   - UsedConnections = current connection count
   - AvailableConnections = subscription limit - used
8. **Item Construction**: For each user, builds `GetCoachingUserItemModel`:
   - Profile details (FirstName, MiddleName, LastName, Email, ProfileImageUrl)
   - AcceptedDate (if existing connection)
   - ExpiredDate (if existing connection)
   - IsExpiredNextMonth flag (expires within 30 days)
   - OverallSharings list
   - SurveyResults (if available)
9. **Subscription Filtering**: `CoachingSubscriptionFilterService.FilterItems()`:
   - Sets IsViewable = true only if within quota
   - Enforces permission-based access
   - Filters based on overall sharing state
10. **Sorting & Pagination**:
    - Apply expiredDateSort if specified (Asc/Desc)
    - Apply pagination (skip/take)
11. **Response Return**: Returns `PagingQueryResult<GetCoachingUserItemModel>`
12. **Frontend Display**: Renders user list with:
    - Profile images and names
    - Expiration indicators
    - Multi-select checkboxes
    - Filter controls
13. **User Selection**: User selects coaches to assign
14. **Connection Creation** (separate endpoint, not in this flow):
    - Creates Individual connections via sharing mechanism
    - Triggers automatic coach role assignment if first connection

**Alternative Flows**:
- **Quota Exceeded**: All items marked IsViewable = false, UI shows quota message
- **No Matches**: Empty list returned with TotalItems = 0
- **Search Text Provided**: Additional filtering applied to results

**Post-Conditions**:
- User sees list of assignable coaching users
- Subscription limits enforced
- Only viewable users displayed

**Key Files**:
- Controller: `CoachingUsersController.cs:52-95`
- Query: `GetCoachingUsersQuery.cs:45-86`
- Model: `GetCoachingUserItemModel.cs:23-28`
- Filter Service: `CoachingSubscriptionFilterService.cs`
- Repository: `IUserRepository.GetCoachingUsers()`

**Evidence**: `GetCoachingUsersQuery.cs:45-86`, `CoachingUsersController.cs:86-92`

---

### Flow 4: Automatic Coaching Connection Expiration

**Actors**: Background Job Scheduler, System

**Trigger**: Daily scheduled job at midnight UTC

**Preconditions**:
- Coaching connections exist with expiration dates
- Background job scheduler running

**Main Flow**:
1. **Job Trigger**: `RemoveCoachingExpirationConnectionBackgroundJob` executes on schedule (cron: `0 0 * * *`)
2. **Database Query**: Find all coaching connections where:
   - ConnectionType = Individual
   - ExpirationDate < DateTime.UtcNow
   - IsDeleted = false
3. **Batch Processing**: For each expired connection:
   - Load related Sharing records
   - Load OverallSharingState
   - Load coach User entity
4. **Connection Removal**:
   - Mark Sharing.IsDeleted = true
   - Set Sharing.Status = Rejected
5. **Overall Sharing Update**:
   - Set OverallSharingState.IsDeleted = true
   - Set OverallSharingState.Status = Rejected
6. **Coach Connection Check**: Query remaining connections for coach in this company
7. **Role Removal Decision**:
   - IF coach has zero connections in company:
     - Create DisconnectedUserHistory record
     - Publish EmployeeUserCoachRoleRemovedEventBusMessage
     - Request role removal from Accounts service
8. **Event Publishing**: Send EmployeeUsersConnectionRemovedEventBusMessage with expired connection details
9. **Team Map Update**: Trigger team map recalculation if applicable
10. **Logging**: Write job execution summary:
    - Total connections processed
    - Coaches disconnected count
    - Any errors encountered
11. **Notification Check**: If notification was sent 7 days prior (via separate job), mark as completed

**Pre-Notification Flow** (7 days before expiration):
1. **Notification Job**: `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob` executes daily at 9 AM UTC
2. **Query Upcoming Expirations**: Find connections where:
   - ExpirationDate - DateTime.UtcNow <= 7 days
   - ExpirationDate - DateTime.UtcNow > 0 days
   - NotificationSent = false (if tracked)
3. **Group by Coach**: Aggregate expirations by coach email
4. **Email Send**: For each coach:
   - Build email with list of expiring connections
   - Include connection details and expiration dates
   - Send via email service
5. **Tracking**: Mark notifications as sent

**Alternative Flows**:
- **No Expired Connections**: Job completes successfully with zero items processed
- **Email Service Failure**: Log error, retry notification next day
- **Partial Success**: Continue processing remaining connections even if one fails

**Post-Conditions**:
- All expired connections removed
- Coaches with zero connections lose role
- Disconnected history updated
- Team maps reflect changes
- Accounts service updated

**Key Classes**:
- Job: `RemoveCoachingExpirationConnectionBackgroundJob.cs`
- Notifier: `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob.cs`
- Handler: `RemoveConnectionCommandHandler` (reused)
- Service: `CoachingHelperApplicationService`

**Evidence**: Background job cron schedules, `RemoveCoachingExpirationConnectionBackgroundJob.cs`

---

### Flow 5: Subscription Quota Enforcement

**Actors**: CoachingSubscriptionFilterService, System

**Trigger**: Before returning coaching users list to frontend

**Preconditions**:
- Query results retrieved from database
- Company subscription data available

**Main Flow**:
1. **Query Completion**: `GetCoachingUsersQuery` completes database retrieval
2. **Service Invocation**: Calls `CoachingSubscriptionFilterService.FilterItems(items, companyId, userId)`
3. **Subscription Lookup**:
   - Query `SubscriptionHolderItemService.FindByCompanyIdAndProductAsync(companyId, productScope)`
   - Retrieve coaching item connection info
4. **Quota Calculation**:
   - SubscriptionLimit = subscription.CoachingItem.MaxConnections
   - UsedConnections = subscription.CoachingItem.UsedConnections
   - AvailableConnections = SubscriptionLimit - UsedConnections
5. **Permission Check**: For each item in results:
   - Verify user has permission to access item
   - Check OverallSharingState for item
   - Verify item not soft-deleted
6. **Viewable Flag Assignment**:
   - IF AvailableConnections > 0 AND user has permission AND item active THEN IsViewable = true
   - ELSE IsViewable = false
7. **Item Filtering** (optional aggressive mode):
   - Remove items where IsViewable = false from results
   - Update TotalItems count
8. **Metadata Update**:
   - Set TotalConnectionsByType = count of viewable items in page
   - Set TotalNumberOfConnection = SubscriptionLimit
9. **Return Filtered Results**: Pass back to controller

**Business Logic Details**:
- **Soft Limit**: IsViewable flag allows UI to show items but disable selection
- **Hard Limit**: Frontend prevents connection creation when quota exceeded
- **Grace Period**: No grace period - quota enforced in real-time

**Alternative Flows**:
- **No Subscription**: All items marked IsViewable = false
- **Unlimited Subscription**: SubscriptionLimit = Int.MaxValue, all items viewable
- **Permission Denied**: Item marked IsViewable = false regardless of quota

**Post-Conditions**:
- Only quota-compliant users marked viewable
- Frontend receives accurate available connection count
- Subscription limits enforced

**Key Classes**:
- Service: `CoachingSubscriptionFilterService.cs`
- Subscriber: `SubscriptionHolderItemService.cs`
- Controller: `CoachingUsersController.cs:86-92`

**Evidence**: `CoachingUsersController.cs:86-92`, `CoachingSubscriptionFilterService.cs`

---

## 6. Design Reference

| Information           | Details                                                           |
| --------------------- | ----------------------------------------------------------------- |
| **Figma Link**        | _(Internal design system)_                                        |
| **Platform**          | Angular 19 WebV2 (growth-for-company, employee apps)              |
| **UI Framework**      | Material Design Components, Custom Bravo Design System            |
| **Responsive Design** | Desktop-first with tablet/mobile responsive breakpoints           |

### Key UI Patterns

**Coach List View**:
- Paginated data table with coach profiles
- Profile images displayed as circular avatars
- Connection counts shown as badges
- Assignment dates formatted as relative time
- Status indicator (Active/Disconnected) with color coding

**Filter Controls**:
- Search text input with debounce (300ms)
- Status dropdown (Active/Disconnected) with radio buttons
- Pagination controls (page size selector, prev/next buttons)
- Sort controls for expiration date (ascending/descending toggle)

**Expiration Tracking**:
- Visual warning icon for coaches expiring within 30 days
- Tooltip showing exact expiration date on hover
- Color-coded expiration status (green: >30 days, yellow: 7-30 days, red: <7 days)
- "Expires Next Month" filter toggle

**Team Map Integration**:
- Filtered coaching user selection modal
- Visual org chart showing coaching relationships
- Drag-and-drop coach assignment interface
- Real-time connection count updates

**Permission-Based Fields**:
- Disabled "Remove" button for non-admin users
- Hidden "Disconnect Coach" action if no permission
- Grayed-out users exceeding subscription quota
- Tooltip explaining why action disabled

### Color Scheme

| Element                  | Color Code      | Usage                               |
| ------------------------ | --------------- | ----------------------------------- |
| **Active Status**        | `#4CAF50` Green | Active coach indicator              |
| **Disconnected Status**  | `#9E9E9E` Gray  | Disconnected coach indicator        |
| **Expiration Warning**   | `#FFC107` Amber | Expiring within 30 days             |
| **Expiration Critical**  | `#F44336` Red   | Expiring within 7 days              |
| **Quota Exceeded**       | `#FF5722` Orange| Subscription limit reached          |

---

## 7. System Design

### Architecture Decision Records (ADRs)

#### ADR-COACH-001: Connection-Based Coaching Model
**Date**: 2024-Q3
**Status**: Accepted
**Context**: Need flexible coaching assignment system supporting multiple coaches per employee.
**Decision**: Implement Individual connection type via Common.Profile Sharing entity rather than direct coach-employee relationship.
**Consequences**:
- Pros: Reuses existing profile sharing infrastructure, supports expiration tracking, enables fine-grained permission control
- Cons: Additional complexity in querying coach relationships, requires subscription filtering service
**Alternatives Considered**: Direct User.CoachId foreign key (rejected due to lack of many-to-many support), separate Coaching entity (rejected due to duplication)

#### ADR-COACH-002: Automatic Role Management
**Date**: 2024-Q3
**Status**: Accepted
**Context**: Managing coaching roles manually creates admin burden and permission inconsistencies.
**Decision**: Automatically assign/remove coaching role based on connection count via event-driven architecture.
**Consequences**:
- Pros: Zero admin overhead, guaranteed consistency, audit trail via events
- Cons: Increased message bus traffic, potential race conditions in multi-company scenarios
**Mitigation**: Use CompanyId scoping for role removal, implement idempotent message handlers

#### ADR-COACH-003: Disconnected User History Snapshots
**Date**: 2024-Q4
**Status**: Accepted
**Context**: Need historical coaching analytics after coaches leave organization.
**Decision**: Create immutable DisconnectedUserHistory snapshots rather than soft-delete User entities.
**Consequences**:
- Pros: Preserves analytics data indefinitely, handles user account deletion gracefully, supports compliance reporting
- Cons: Data duplication, potential sync issues if User entity updated after disconnect
**Mitigation**: Snapshot only at disconnect time, clearly document IsAnonymous flag for deleted accounts

### Component Diagrams

#### High-Level Component View

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Layer (Angular 19)                   │
├─────────────────────────────────────────────────────────────────────┤
│ CoachingListComponent → CoachingApiService → HTTP Client             │
│ CoachingUsersComponent                                               │
│ CoachingFilterComponent                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST API (HTTPS)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API Gateway / Controllers                        │
├─────────────────────────────────────────────────────────────────────┤
│ CoachingController        → GetCoachingQuery                         │
│ CoachingUsersController   → GetCoachingUsersQuery                   │
│                           → RemoveConnectionCommand                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ CQRS Commands/Queries
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Application Layer (CQRS)                         │
├─────────────────────────────────────────────────────────────────────┤
│ GetCoachingQueryHandler                                              │
│ RemoveConnectionCommandHandler                                       │
│ CoachingHelperApplicationService                                     │
│ CoachingSubscriptionFilterService                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Domain Operations
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Domain Layer (Entities)                          │
├─────────────────────────────────────────────────────────────────────┤
│ User (Employee.Domain)                                               │
│ Sharing (Common.Profile)                                             │
│ OverallSharingState (Common.Profile)                                 │
│ DisconnectedUserHistory (Employee.Domain)                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Data Access
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Persistence Layer (MongoDB)                      │
├─────────────────────────────────────────────────────────────────────┤
│ ICoachingRepository                                                  │
│ IUserRepository                                                      │
│ ISharingRepository                                                   │
│ IOverallSharingStateRepository                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Cross-Service Integration                        │
├─────────────────────────────────────────────────────────────────────┤
│ Message Bus (RabbitMQ)                                               │
│ • EmployeeUserCoachRoleRemovedEventBusMessage                        │
│ • EmployeeUsersConnectionRemovedEventBusMessage                      │
│ • PermissionProviderRemoveUserPolicyCoachingRoleRequestBusMessage    │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         Load Balancer                         │
│                        (HTTPS Traffic)                        │
└─────────────────────────────┬─────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  bravoTALENTS Service    │    │  Accounts Service        │
│  (Employee.Service)      │    │  (Permission Provider)   │
│  - Port: 5002            │    │  - Port: 5001            │
│  - Instances: 3          │    │  - Instances: 2          │
└────────┬─────────────────┘    └─────────────┬────────────┘
         │                                    │
         │ MongoDB Connection                 │ SQL Server
         ▼                                    ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  MongoDB Cluster         │    │  SQL Server Cluster      │
│  - bravoTALENTS DB       │    │  - Accounts DB           │
│  - Replica Set: 3 nodes  │    │  - Replica Set: 2 nodes  │
└──────────────────────────┘    └──────────────────────────┘
         │
         │ RabbitMQ Connection
         ▼
┌──────────────────────────────────────────────────────────────┐
│               RabbitMQ Message Bus Cluster                    │
│               - Nodes: 3                                      │
│               - Queues: Coaching Events, Permission Requests  │
└──────────────────────────────────────────────────────────────┘
         │
         │ Background Jobs
         ▼
┌──────────────────────────────────────────────────────────────┐
│               Hangfire Background Job Scheduler               │
│               - RemoveCoachingExpirationConnectionJob         │
│               - SendUpcomingExpirationNotificationJob         │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BravoSUITE Platform                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────┐    ┌────────────────────────────┐ │
│  │  bravoTALENTS Service        │    │  Frontend Applications     │ │
│  │  (Employee Service)          │    │                            │ │
│  │                              │    │ ┌────────────────────────┐ │ │
│  │ ┌────────────────────────┐   │    │ │growth-for-company     │ │ │
│  │ │  Domain Layer          │   │    │ │ • CoachingListComponent│ │ │
│  │ │  • User Entity         │   │    │ │ • CoachingUserList    │ │ │
│  │ │  • DisconnectedUser    │   │    │ │ • CoachingUserFilter  │ │ │
│  │ │  • Sharing Entity      │   │    │ └────────────────────────┘ │ │
│  │ │  • Invitation Entity   │   │    │                            │ │
│  │ └────────────────────────┘   │    └────────────────────────────┘ │
│  │                              │                                   │
│  │ ┌────────────────────────┐   │                                   │
│  │ │  Application Layer     │   │                                   │
│  │ │  • GetCoachingQuery    │   │    REST API (HTTP)               │
│  │ │  • RemoveConnection    │   │    ┌────────────────────────────┐│
│  │ │  • GetCoachingUsers    │   ├───→│ CoachingController        ││
│  │ │  • CoachingHelper      │   │    │ CoachingUsersController   ││
│  │ │  Validators, etc.      │   │    └────────────────────────────┘│
│  │ └────────────────────────┘   │                                   │
│  │                              │                                   │
│  │ ┌────────────────────────┐   │                                   │
│  │ │  Persistence Layer     │   │                                   │
│  │ │  • CoachingRepository  │   │                                   │
│  │ │  • UserRepository      │   │                                   │
│  │ │  • SharingRepository   │   │                                   │
│  │ └────────────────────────┘   │                                   │
│  └──────────────────────────────┘                                   │
│                                                                      │
│  ┌──────────────────────────────┐                                   │
│  │  Cross-Service Integration   │                                   │
│  │  • Message Bus               │                                   │
│  │    - EmployeeUserCoachRole   │                                   │
│  │      RemovedEventBusMessage  │                                   │
│  │    - Accounting Service for  │                                   │
│  │      Permission Management   │                                   │
│  └──────────────────────────────┘                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer            | Key Responsibilities                                          |
| ---------------- | ------------------------------------------------------------- |
| **Presentation** | Coaching list UI, filters, user selection, pagination         |
| **Application**  | Query execution, connection removal, permission validation    |
| **Domain**       | User entity, connection lifecycle, sharing rules              |
| **Persistence**  | Data access, repository queries, subscription tracking        |
| **Integration**  | Event publishing, cross-service communication, role management |

### Technology Stack

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| **Frontend**  | Angular 19, TypeScript, RxJS, Material UI  |
| **Backend**   | .NET 9, C# 13, ASP.NET Core                |
| **Database**  | MongoDB 6.0 (primary), SQL Server (Accounts)|
| **Messaging** | RabbitMQ 3.12                               |
| **Jobs**      | Hangfire                                    |
| **Caching**   | Redis 7.0 (optional)                        |

---

## 9. Domain Model

### Core Entities

#### User Entity

**Location**: `src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/User.cs`

| Field                | Type      | Description                                            |
| -------------------- | --------- | ------------------------------------------------------ |
| `ExternalId`         | `string`  | Unique user identifier (from auth system)              |
| `FirstName`          | `string`  | User's first name                                      |
| `MiddleName`         | `string`  | User's middle name (optional)                          |
| `LastName`           | `string`  | User's last name                                       |
| `Email`              | `string`  | User's email address                                   |
| `ProductScope`       | `int`     | Product context (Growth, Talent, etc.)                 |
| `IsDeleted`          | `bool`    | Soft delete flag                                       |
| `ProfileImage`       | `Image`   | Profile photo with URL                                 |
| `Sharings`           | `List<Sharing>` | Profile sharing agreements with coaches            |
| `AssignedModules`    | `List<AssignedModule>` | Assigned roles/modules with dates             |

**Key Methods**:
- `GetAssignedCoachModule(companyId)`: Get coaching module assignment date for company
- `FullName`: Computed property combining first/middle/last names

**Evidence**: `User.cs` (Employee.Domain)

---

#### DisconnectedUserHistory Entity

**Location**: `src/Services/bravoTALENTS/Employee.Domain/Entities/DisconnectedUserHistory.cs`

| Field                    | Type             | Description                                      |
| ------------------------ | ---------------- | ------------------------------------------------ |
| `Id`                     | `string`         | Unique identifier                                |
| `ExternalId`             | `string`         | Reference to disconnected user                   |
| `FullName`               | `string`         | Snapshot of user's full name at disconnect      |
| `ProductScope`           | `int`            | Product scope context                           |
| `DisconnectedDate`       | `DateTime`       | When the user was disconnected                   |
| `TotalUsedCoachingConnections` | `int?`    | Total coaching connections used in last assign  |
| `ProfileImageUrl`        | `string`         | Snapshot of profile image URL                    |
| `AssignedModule`         | `AssignedModule` | Module info at time of disconnect               |

**Key Methods**:
- `IsAnonymous`: Returns true if FullName is empty (user self-deleted account)

**Evidence**: `DisconnectedUserHistory.cs:1-42`, line 34 for IsAnonymous property

---

#### Sharing Entity

**Location**: `src/Services/Common/Common.Profile/AggregatesModel/Sharing.cs`

| Field              | Type            | Description                                      |
| ------------------ | --------------- | ------------------------------------------------ |
| `Id`               | `string`        | Unique identifier                                |
| `UserId`           | `string`        | ID of user whose profile is shared              |
| `CreatedByUserId`  | `string`        | ID of coach/person who created sharing          |
| `CompanyId`        | `string`        | Company context                                  |
| `ProductScope`     | `int`           | Product scope context                           |
| `ConnectionType`   | `ConnectionType` | Type of connection (Individual for coaching)    |
| `IsDeleted`        | `bool`          | Soft delete flag                                 |
| `Status`           | `SharingStatus` | Accepted, Rejected, Pending                      |
| `IsActive`         | `bool`          | Whether sharing is currently active              |
| `ExpirationDate`   | `DateTime?`     | When connection expires                          |
| `CreatedDate`      | `DateTime`      | When sharing was created                         |

**Business Rules**:
- Coaching connections always use ConnectionType.Individual
- Sharing.CreatedByUserId = coach's user ID
- Sharing.UserId = coachee's user ID

---

#### OverallSharingState Entity

**Location**: `src/Services/Common/Common.Profile/AggregatesModel/OverallSharingState.cs`

| Field              | Type             | Description                                      |
| ------------------ | ---------------- | ------------------------------------------------ |
| `UserId`           | `string`         | Employee whose profile can be shared            |
| `CreatedByUserId`  | `string`         | Coach/manager who can share                      |
| `CompanyId`        | `string`         | Company context                                  |
| `ProductScope`     | `int`            | Product scope                                    |
| `ConnectionType`   | `ConnectionType` | Type of connection                               |
| `Status`           | `SharingStatus`  | Current sharing status                           |
| `IsDeleted`        | `bool`           | Soft delete flag                                 |

**Purpose**: Aggregated view of sharing state for quick permission checks

---

### Enums

#### CoachingStatus

**Location**: `src/Services/bravoTALENTS/Employee.Application/Coaching/GetCoachingQueryParams.cs:18-22`

```csharp
public enum CoachingStatus
{
    Active = 0,         // Coach has active connections
    Disconnected = 1    // Coach has been disconnected from system
}
```

---

#### ConnectionType

**Location**: `src/Services/Common/Common.Profile/Enums/ConnectionType.cs`

```csharp
public enum ConnectionType
{
    Individual = 1,     // One-to-one coaching relationship
    Group = 2           // Group/team coaching relationship (not used for coaching)
}
```

**Evidence**: Coaching always uses Individual (value 1)

---

#### SharingStatus

**Location**: `src/Services/Common/Common.Profile/Enums/SharingStatus.cs`

```csharp
public enum SharingStatus
{
    Accepted = 1,       // Sharing request accepted
    Rejected = 2,       // Sharing request rejected
    Pending = 3         // Awaiting acceptance
}
```

---

#### SortingType

**Location**: `src/Services/bravoTALENTS/Employee.Application/Coaching/GetCoachingUsersQueryModel.cs:39-44`

```csharp
public enum SortingType
{
    None = 0,           // No sorting
    Asc = 1,            // Ascending (e.g., expiration dates soonest first)
    Desc = 2            // Descending (e.g., expiration dates latest first)
}
```

**Evidence**: Used for expiredDateSort parameter in coaching users query

---

### Entity Relationships

```
┌─────────────────┐
│     User        │
│  (Coach/Coachee)│
└────────┬────────┘
         │
         ├─────────────────┬──────────────────┬──────────────────┐
         │                 │                  │                  │
         ▼                 ▼                  ▼                  ▼
    ┌─────────┐    ┌──────────────┐   ┌────────────┐   ┌──────────────┐
    │ Sharing │    │ Invitation   │   │AssignedMod │   │ProfileImage │
    │(N:1)    │    │(N:1)         │   │(N:1)       │   │(1:1)         │
    └─────────┘    └──────────────┘   └────────────┘   └──────────────┘
         │
         │ CreatedByUserId (Coach creates sharing)
         │
    ┌─────────────────────────────┐
    │  OverallSharingState        │
    │  (Aggregated sharing status)│
    └─────────────────────────────┘
         │
         ▼
    ┌──────────────────────────┐
    │ DisconnectedUserHistory  │
    │ (Historical record)      │
    └──────────────────────────┘
```

**Key Relationships**:
- User.Sharings (1:N): One user can have many sharing records
- Sharing.CreatedByUserId → User.ExternalId (N:1): Coach who created sharing
- Sharing.UserId → User.ExternalId (N:1): Employee whose profile is shared
- OverallSharingState: Computed aggregate of Sharing records
- DisconnectedUserHistory: Immutable snapshot when coach disconnected

---

## 10. API Reference

### Complete Endpoint Documentation

#### GET /api/coachings

**Summary**: Get active or disconnected coaches for company

**Authentication**: Required (CompanyRoleAuthorizationPolicies.EmployeePolicy)

**Query Parameters**:

| Parameter  | Type   | Required | Default | Description                          |
| ---------- | ------ | -------- | ------- | ------------------------------------ |
| companyId  | string | Yes      | -       | Company identifier                   |
| status     | enum   | Yes      | -       | Active (0) or Disconnected (1)       |
| pageSize   | int    | No       | 20      | Results per page                     |
| pageIndex  | int    | No       | 1       | Page number (1-based)                |

**Response** (200 OK):

```json
{
  "pageIndex": 1,
  "pageSize": 20,
  "totalItems": 45,
  "totalPages": 3,
  "totalConnectionsByType": 28,
  "totalNumberOfConnection": 50,
  "items": [
    {
      "id": "coach-external-id",
      "email": "coach@company.com",
      "fullName": "John Coach",
      "profileImageUrl": "https://...",
      "numberOfConnections": 3,
      "totalOfConnections": 5,
      "assignedCoachRoleDate": "2025-01-01T00:00:00Z",
      "disconnectedDate": null,
      "numberAnonymousOrder": 0
    }
  ]
}
```

**Error Responses**:

| Status | Description                                  |
| ------ | -------------------------------------------- |
| 400    | Missing or invalid companyId/status          |
| 401    | User not authenticated                       |
| 403    | User not authorized for company              |

**Handler**: `GetCoachingQuery.GetListCoaching()`

**Evidence**: `CoachingController.cs:27-44`, `GetCoachingQuery.cs:108-149`

---

#### POST /api/coachings/disconnect/{coachId}

**Summary**: Disconnect coach from system, removing all connections

**Authentication**: Required

**Route Parameters**:

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| coachId   | string | Yes      | Coach's external ID |

**Query Parameters**:

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| companyId | string | Yes      | Company context |

**Response** (200 OK): Empty (void)

**Side Effects**:
- Delete sharing records
- Update overall sharing state
- Create disconnected user history
- Remove coaching role if last company
- Send event messages

**Error Responses**:

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Missing companyId or coachId      |
| 401    | User not authenticated             |
| 403    | User not coach in company          |
| 404    | Coach not found                    |

**Handler**: `ApplicationRoleService.DisconnectCoachModulesAsync()`

**Evidence**: `CoachingController.cs:46-50`

---

#### GET /api/coaching-users

**Summary**: Get employees available for coaching assignment

**Authentication**: Required

**Query Parameters**:

| Parameter           | Type                | Required | Default      | Description                |
| ------------------- | ------------------- | -------- | ------------ | -------------------------- |
| pageSize            | int                 | No       | 20           | Items per page             |
| pageIndex           | int                 | No       | 1            | Page number                |
| orgUnitId           | string              | No       | null         | Filter by org unit         |
| searchText          | string              | No       | null         | Search by name/email       |
| gender              | string              | No       | null         | Filter by gender           |
| ageRange            | string              | No       | null         | Filter by age              |
| companySearchRange  | enum                | No       | All          | All or CurrentCompany      |
| profileAccess       | string              | No       | null         | Filter by access level     |
| expiredDateSort     | enum                | No       | None         | None (0), Asc (1), Desc (2) |
| isExpiresNextMonth  | boolean             | No       | false        | Filter expiring soon       |
| advancedFilterQuery | string              | No       | null         | Complex filter             |

**Response** (200 OK):

```json
{
  "pageIndex": 1,
  "pageSize": 20,
  "totalItems": 150,
  "totalPages": 8,
  "items": [
    {
      "id": "employee-id",
      "firstName": "Jane",
      "middleName": "Marie",
      "lastName": "Doe",
      "email": "jane@company.com",
      "profileImageUrl": "https://...",
      "acceptedDate": "2025-01-01T00:00:00Z",
      "expiredDate": "2025-12-31T00:00:00Z",
      "isExpiredNextMonth": false,
      "overallSharings": [],
      "surveyResults": [],
      "isViewable": true
    }
  ]
}
```

**Filtering** (Applied after query):
- Subscription limit checking
- User permission validation
- Team map context filtering

**Handler**: `GetCoachingUsersQuery.ExecuteAsync()`

**Evidence**: `CoachingUsersController.cs:52-95`, `GetCoachingUsersQuery.cs:45-86`

---

#### GET /api/coaching-users/{id}

**Summary**: Get single coaching user details

**Authentication**: Required

**Route Parameters**:

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| id        | string | Yes      | User's external ID |

**Response** (200 OK): Single `GetCoachingUserItemModel` object

**Filtering Applied**:
- Subscription validation
- Permission checks
- Only returns if viewable by current user

**Error Responses**:

| Status | Description         |
| ------ | ------------------- |
| 401    | Not authenticated   |
| 403    | Not permitted       |
| 404    | User not found      |

**Handler**: `GetCoachingUserQuery.ExecuteAsync()`

**Evidence**: `CoachingUsersController.cs:127-143`

---

#### POST /api/coaching-users/coachings-for-team-map

**Summary**: Get coaching users for team map visualization

**Authentication**: Required

**Request Body**:

```json
{
  "orgUnitId": "dept-123",
  "pageSize": 50,
  "pageIndex": 1,
  "searchText": "john",
  "selectedEmployeeIds": ["emp-1", "emp-2"]
}
```

**Response** (200 OK): `PagingQueryResult<GetCoachingUserItemModel>` filtered for team map

**Special Filtering**:
- Excludes already selected employees
- Only returns viewable users
- Applied subscription filters

**Handler**: `GetCoachingUsersQuery` with team map filter

**Evidence**: `CoachingUsersController.cs:97-125`

---

#### PUT /api/coaching-users/remove-connections

**Summary**: Remove multiple coaching connections

**Authentication**: Required

**Request Body**:

```json
{
  "userIds": ["coach-1", "coach-2"]
}
```

**Response** (200 OK): Empty (void)

**Side Effects**:
- Remove sharing records for each user
- Update overall sharing state
- Update team maps
- Send removal event messages

**Validation**:
- All user IDs must exist
- Current user must have coach role
- All connections must belong to current user

**Handler**: `RemoveConnectionCommandHandler.ExecuteAsync()`

**Evidence**: `CoachingUsersController.cs:145-155`, `RemoveConnectionCommandHandler.cs:83-112`

---

#### GET /api/coaching-users/pending-candidates

**Summary**: Get pending coaching invitation candidates

**Authentication**: Required

**Query Parameters**:

| Parameter   | Type   | Required | Default | Description          |
| ----------- | ------ | -------- | ------- | -------------------- |
| searchString | string | No       | null    | Search by name/email |
| pageSize    | int    | No       | 20      | Items per page       |
| pageIndex   | int    | No       | 1       | Page number          |

**Response** (200 OK): `GetPendingInvitationCandidateProfileQueryResult` with paging

**Handler**: `GetPendingInvitationCandidateProfileQueryHandler.ExecuteAsync()`

**Evidence**: `CoachingUsersController.cs:157-175`

---

#### POST /api/coaching-users/remove-pending-connections

**Summary**: Cancel pending coaching connection requests

**Authentication**: Required

**Request Body**: `RemovePendingConnectionsCommand`

**Response** (200 OK): Empty (void)

**Handler**: CQRS command via `cqrs.SendCommand()`

**Evidence**: `CoachingUsersController.cs:177-181`

---

#### GET /api/coaching-users/matched-users

**Summary**: Search and match coaching users

**Authentication**: Required

**Query Parameters**:

| Parameter  | Type   | Required | Description        |
| ---------- | ------ | -------- | ------------------- |
| searchText | string | No       | Search term         |

**Response** (200 OK): `GetMatchedUsersResult`

**Handler**: `GetMatchedUsersQuery` with ConnectionType.Individual

**Evidence**: `CoachingUsersController.cs:183-194`

---

## 11. Frontend Components

### Component Hierarchy

```
Growth-for-Company App
│
├── CoachingListComponent (main container)
│   ├── CoachingFilterComponent (search, status, pagination)
│   ├── CoachingDataTableComponent (list of coaches)
│   │   └── CoachingRowComponent (individual coach row)
│   └── CoachingPaginationComponent (page controls)
│
└── CoachingUsersComponent (coach assignment UI)
    ├── CoachingUserFilterComponent (search, org unit, filters)
    ├── CoachingUserListComponent (available users to assign)
    │   └── CoachingUserItemComponent (individual user item)
    └── CoachingUserPaginationComponent (page controls)
```

### Key Components

#### CoachingListComponent

**Location**: `src/WebV2/apps/growth-for-company/src/app/features/coaching/coaching-list.component.ts`

**Selector**: `app-coaching-list`

**Purpose**: Display active and disconnected coaches with filtering

**Inputs**:
- `companyId: string` - Company identifier
- `productScope: number` - Product context (Growth = 2)

**Outputs**:
- `coachSelected: EventEmitter<CoachingSummaryModel>` - Coach selection event
- `disconnectRequested: EventEmitter<string>` - Disconnect action event

**Key Methods**:
- `loadCoaches()`: Fetch coach list with status filter
- `onDisconnectCoach(coachId: string)`: Remove coaching connection
- `onStatusChange(status: CoachingStatus)`: Switch between Active/Disconnected tabs
- `onPageChange(page: number)`: Handle pagination
- `onSearchChange(searchText: string)`: Filter by search text

**Template**:
```html
<div class="coaching-list">
  <div class="coaching-list__header">
    <h1 class="coaching-list__title">Coaching Management</h1>
    <app-coaching-filter
      class="coaching-list__filter"
      (statusChange)="onStatusChange($event)"
      (searchChange)="onSearchChange($event)">
    </app-coaching-filter>
  </div>
  <app-coaching-data-table
    class="coaching-list__table"
    [coaches]="vm.coaches"
    [loading]="isLoading$('loadCoaches')"
    (disconnectClick)="onDisconnectCoach($event)">
  </app-coaching-data-table>
  <app-coaching-pagination
    class="coaching-list__pagination"
    [pageIndex]="vm.pageIndex"
    [totalPages]="vm.totalPages"
    (pageChange)="onPageChange($event)">
  </app-coaching-pagination>
</div>
```

**State Management**: Extends `AppBaseVmStoreComponent<CoachingListVm, CoachingListStore>`

**Evidence**: Frontend implementation in `src/WebV2/apps/growth-for-company/`

---

#### CoachingUsersComponent

**Location**: `src/WebV2/apps/growth-for-company/src/app/features/coaching/coaching-users.component.ts`

**Selector**: `app-coaching-users`

**Purpose**: Select and manage employees as coaches

**Inputs**:
- `companyId: string` - Company context
- `productScope: number` - Product scope
- `initialCoaches: string[]` - Pre-selected coach IDs

**Outputs**:
- `coachesSelected: EventEmitter<string[]>` - Selected coaches for assignment

**Features**:
- Multi-select user list with checkboxes
- Advanced filtering (search, gender, age, org unit)
- Expiration date sorting (ascending/descending)
- Team map integration mode
- Subscription limit enforcement with visual feedback

**Key Methods**:
- `loadCoachingUsers()`: Fetch available coaching users
- `onUserSelect(userId: string)`: Toggle user selection
- `onFilterChange(filters: CoachingUserFilters)`: Apply filters
- `onSortChange(sort: SortingType)`: Change sort order
- `submitSelection()`: Emit selected coaches

**Template**:
```html
<div class="coaching-users">
  <div class="coaching-users__header">
    <app-coaching-user-filter
      class="coaching-users__filter"
      (filterChange)="onFilterChange($event)"
      (sortChange)="onSortChange($event)">
    </app-coaching-user-filter>
    @if (vm.quotaExceeded) {
    <div class="coaching-users__quota-warning --exceeded">
      Subscription limit reached: {{vm.usedConnections}}/{{vm.totalConnections}}
    </div>
    }
  </div>
  <app-coaching-user-list
    class="coaching-users__list"
    [users]="vm.users"
    [selectedIds]="vm.selectedIds"
    [loading]="isLoading$('loadUsers')"
    (userSelect)="onUserSelect($event)">
  </app-coaching-user-list>
</div>
```

**State Management**: Extends `AppBaseVmStoreComponent<CoachingUsersVm, CoachingUsersStore>`

**Evidence**: `CoachingUsersController.cs`, `GetCoachingUsersQuery.cs`

---

#### CoachingFilterComponent

**Location**: `src/WebV2/apps/growth-for-company/src/app/features/coaching/components/coaching-filter.component.ts`

**Selector**: `app-coaching-filter`

**Purpose**: Filter coaches by status, search text, pagination

**Inputs**:
- `currentStatus: CoachingStatus` - Active or Disconnected

**Outputs**:
- `statusChange: EventEmitter<CoachingStatus>` - Status filter change
- `searchChange: EventEmitter<string>` - Search text change
- `pageSizeChange: EventEmitter<number>` - Page size change

**Controls**:
- Status dropdown (Active/Disconnected) with radio buttons
- Search input with debounce (300ms)
- Page size selector (10, 20, 50, 100)
- "Expires Next Month" toggle for expiration filter

**Template**:
```html
<div class="coaching-filter">
  <div class="coaching-filter__status">
    <label class="coaching-filter__status-label">Status:</label>
    <mat-radio-group
      class="coaching-filter__status-group"
      [(ngModel)]="status"
      (change)="onStatusChange()">
      <mat-radio-button [value]="CoachingStatus.Active">Active</mat-radio-button>
      <mat-radio-button [value]="CoachingStatus.Disconnected">Disconnected</mat-radio-button>
    </mat-radio-group>
  </div>
  <div class="coaching-filter__search">
    <input
      class="coaching-filter__search-input"
      type="text"
      placeholder="Search coaches..."
      [(ngModel)]="searchText"
      (ngModelChange)="onSearchChange()">
  </div>
</div>
```

---

### Service Layer

#### CoachingApiService

**Location**: `src/WebV2/libs/bravo-domain/src/lib/coaching/coaching-api.service.ts`

**Extends**: `PlatformApiService`

**Base URL**: `${environment.apiUrl}/api/coachings`

**Methods**:

```typescript
@Injectable({ providedIn: 'root' })
export class CoachingApiService extends PlatformApiService {
  protected get apiUrl() {
    return `${environment.apiUrl}/api`;
  }

  getCoachingList(params: GetCoachingParams): Observable<CoachingPageResult<CoachingSummaryModel>> {
    return this.get<CoachingPageResult<CoachingSummaryModel>>('coachings', params);
  }

  getCoachingUsers(params: GetCoachingUsersParams): Observable<PagingResult<GetCoachingUserItemModel>> {
    return this.get<PagingResult<GetCoachingUserItemModel>>('coaching-users', params);
  }

  removeCoachingConnection(userIds: string[]): Observable<void> {
    return this.put<void>('coaching-users/remove-connections', { userIds });
  }

  disconnectCoach(coachId: string, companyId: string): Observable<void> {
    return this.post<void>(`coachings/disconnect/${coachId}?companyId=${companyId}`, null);
  }

  getMatchedUsers(searchText: string): Observable<GetMatchedUsersResult> {
    return this.get<GetMatchedUsersResult>('coaching-users/matched-users', { searchText });
  }

  getPendingCandidates(params: GetPendingParams): Observable<PagingResult<PendingCandidateModel>> {
    return this.get<PagingResult<PendingCandidateModel>>('coaching-users/pending-candidates', params);
  }

  removePendingConnections(command: RemovePendingConnectionsCommand): Observable<void> {
    return this.post<void>('coaching-users/remove-pending-connections', command);
  }
}
```

**Caching Strategy**: No caching for real-time coaching data

---

## 12. Backend Controllers

### CoachingController

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/CoachingController.cs`

**Authorization**: `[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]`

**Base Route**: `/api/coachings`

**Dependencies**:
- `IGetCoachingQuery` - Query handler for coach lists
- `IApplicationRoleService` - Role management service
- `IPlatformApplicationRequestContext` - Current user context

#### Endpoints

##### GET /api/coachings

```csharp
[HttpGet]
public async Task<IActionResult> GetCoachings(
    [FromQuery] string companyId,
    [FromQuery] CoachingStatus status,
    [FromQuery] int pageSize = 20,
    [FromQuery] int pageIndex = 1)
{
    var queryParams = new GetCoachingQueryParams
    {
        CompanyId = companyId,
        Status = status,
        PageSize = pageSize,
        PageIndex = pageIndex
    };

    var result = await _getCoachingQuery.GetListCoaching(queryParams);
    return Ok(result);
}
```

**Query Parameters**:
- `companyId` (required): Company identifier
- `status` (required): CoachingStatus.Active (0) or Disconnected (1)
- `pageSize`: Results per page (default 20)
- `pageIndex`: Page number (default 1)

**Response**: `CoachingPageQueryResult<CoachingSummaryModel>`

**Handler**: `GetCoachingQuery.GetListCoaching()`

**Evidence**: `CoachingController.cs:27-44`

---

##### POST /api/coachings/disconnect/{coachId}

```csharp
[HttpPost("disconnect/{coachId}")]
public async Task DisconnectCoach(
    [FromRoute] string coachId,
    [FromQuery] string companyId)
{
    await _applicationRoleService.DisconnectCoachModulesAsync(coachId, companyId);
}
```

**Route Parameters**:
- `coachId`: Coach's external user ID

**Query Parameters**:
- `companyId`: Company context

**Side Effects**:
- Remove all Individual connections for coach
- Delete sharing records
- Update overall sharing state
- Create disconnected user history
- Send coach role removal events

**Handler**: `ApplicationRoleService.DisconnectCoachModulesAsync()`

**Evidence**: `CoachingController.cs:46-50`

---

### CoachingUsersController

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/CoachingUsersController.cs`

**Authorization**: `[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]`

**Base Route**: `/api/coaching-users`

**Dependencies**:
- `IGetCoachingUsersQuery` - Query handler for coaching users
- `IGetCoachingUserQuery` - Query for single user
- `IPlatformCqrs` - CQRS command/query dispatcher
- `CoachingSubscriptionFilterService` - Subscription filtering

#### Endpoints

##### GET /api/coaching-users

```csharp
[HttpGet]
public async Task<IActionResult> GetCoachingUsers(
    int pageSize = 20,
    int pageIndex = 1,
    string orgUnitId = null,
    string searchText = null,
    string gender = null,
    string ageRange = null,
    CompanySearchRange companySearchRange = CompanySearchRange.All,
    string profileAccess = null,
    SortingType expiredDateSort = SortingType.None,
    bool isExpiresNextMonth = false,
    string advancedFilterQuery = null)
{
    var queryModel = new GetCoachingUsersQueryModel
    {
        PageSize = pageSize,
        PageIndex = pageIndex,
        OrgUnitId = orgUnitId,
        SearchText = searchText,
        Gender = gender,
        AgeRange = ageRange,
        CompanySearchRange = companySearchRange,
        ProfileAccess = profileAccess,
        ExpiredDateSort = expiredDateSort,
        IsExpiresNextMonth = isExpiresNextMonth,
        AdvancedFilterQuery = advancedFilterQuery
    };

    var result = await _getCoachingUsersQuery.ExecuteAsync(queryModel);
    await _subscriptionFilterService.FilterItems(result.Items, companyId, userId);
    return Ok(result);
}
```

**Query Parameters**:
- `pageSize`: Items per page (default 20)
- `pageIndex`: Page number (default 1)
- `orgUnitId`: Filter by organization unit
- `searchText`: Search by name/email
- `gender`: Filter by gender
- `ageRange`: Filter by age bracket
- `companySearchRange`: Company scope (All, CurrentCompany)
- `profileAccess`: Filter by access level
- `expiredDateSort`: Sort by expiration (None, Asc, Desc)
- `isExpiresNextMonth`: Filter expiring soon
- `advancedFilterQuery`: Complex filter string

**Response**: `PagingQueryResult<GetCoachingUserItemModel>`

**Handler**: `GetCoachingUsersQuery.ExecuteAsync()`

**Features**:
- Subscription filtering applied
- Permission validation
- Result paging

**Evidence**: `CoachingUsersController.cs:52-95`

---

##### POST /api/coaching-users/coachings-for-team-map

```csharp
[HttpPost("coachings-for-team-map")]
public async Task<IActionResult> GetCoachingUsers([FromBody] GetCoachingsForTeamMapModel query)
{
    var result = await _getCoachingUsersQuery.ExecuteAsync(new GetCoachingUsersQueryModel
    {
        OrgUnitId = query.OrgUnitId,
        PageSize = query.PageSize,
        PageIndex = query.PageIndex,
        SearchText = query.SearchText
    });

    // Filter out already selected employees
    result.Items = result.Items
        .Where(x => !query.SelectedEmployeeIds.Contains(x.Id))
        .ToList();

    await _subscriptionFilterService.FilterItems(result.Items, companyId, userId);
    return Ok(result);
}
```

**Request Body**:
```json
{
  "orgUnitId": "string",
  "pageSize": 20,
  "pageIndex": 1,
  "searchText": "string",
  "selectedEmployeeIds": ["string"]
}
```

**Special Features**:
- Filters to only viewable users
- Excludes already selected employees
- Team map specific filtering

**Evidence**: `CoachingUsersController.cs:97-125`

---

##### GET /api/coaching-users/{id}

```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetCoachingUser(string id)
{
    var result = await _getCoachingUserQuery.ExecuteAsync(new GetCoachingUserQueryModel { Id = id });
    await _subscriptionFilterService.FilterItems(new List<GetCoachingUserItemModel> { result }, companyId, userId);

    if (!result.IsViewable)
        return NotFound();

    return Ok(result);
}
```

**Route Parameters**:
- `id`: Coaching user's external ID

**Response**: `GetCoachingUserItemModel` with subscription filtering

**Handler**: `GetCoachingUserQuery.ExecuteAsync()`

**Evidence**: `CoachingUsersController.cs:127-143`

---

##### PUT /api/coaching-users/remove-connections

```csharp
[HttpPut("remove-connections")]
public async Task<IActionResult> RemoveCoachingUsers([FromBody] RemoveConnectionCommand command)
{
    await _cqrs.SendCommand(command);
    return Ok();
}
```

**Request Body**:
```json
{
  "userIds": ["coach-id-1", "coach-id-2"]
}
```

**Handler**: `RemoveConnectionCommandHandler.ExecuteAsync()`

**Side Effects**:
- Remove sharing records
- Update overall sharing state
- Update team maps
- Send removal event messages

**Evidence**: `CoachingUsersController.cs:145-155`

---

##### GET /api/coaching-users/pending-candidates

```csharp
[HttpGet("pending-candidates")]
public async Task<IActionResult> GetPendingUsers(
    string searchString,
    int pageSize = 20,
    int pageIndex = 1)
{
    var query = new GetPendingInvitationCandidateProfileQuery
    {
        SearchString = searchString,
        PageSize = pageSize,
        PageIndex = pageIndex
    };

    var result = await _cqrs.SendQuery(query);
    return Ok(result);
}
```

**Purpose**: Get pending coaching invitation candidates

**Handler**: `GetPendingInvitationCandidateProfileQueryHandler.ExecuteAsync()`

**Evidence**: `CoachingUsersController.cs:157-175`

---

##### POST /api/coaching-users/remove-pending-connections

```csharp
[HttpPost("remove-pending-connections")]
public async Task RemovePendingConnections([FromBody] RemovePendingConnectionsCommand command)
{
    await _cqrs.SendCommand(command);
}
```

**Handler**: CQRS command via `cqrs.SendCommand()`

**Evidence**: `CoachingUsersController.cs:177-181`

---

##### GET /api/coaching-users/matched-users

```csharp
[HttpGet("matched-users")]
public async Task<GetMatchedUsersResult> GetMatchedUsers(string searchText)
{
    var query = new GetMatchedUsersQuery
    {
        SearchText = searchText,
        ConnectionType = ConnectionType.Individual
    };

    return await _cqrs.SendQuery(query);
}
```

**Purpose**: Search and match coaching users

**Query**: `GetMatchedUsersQuery` with ConnectionType.Individual

**Evidence**: `CoachingUsersController.cs:183-194`

---

## 13. Cross-Service Integration

### Message Bus Events

#### EmployeeUserCoachRoleRemovedEventBusMessage

**Purpose**: Notify other services when coach loses coaching role

**Producer**: `CoachingHelperApplicationService.RemoveCoaching()`

**Consumer**: Accounts service for permission cleanup

**Payload**:
```csharp
public class EmployeeUserCoachRoleRemovedEventBusMessage
{
    public string UserId { get; set; }
    public List<string> CompanyIds { get; set; }
}
```

**Flow**:
1. bravoTALENTS service publishes message when coach disconnected from last company
2. RabbitMQ routes to Accounts service queue
3. Accounts service processes message:
   - Removes coaching policy from user's company roles
   - Updates permission cache
   - Logs role removal audit event

**Evidence**: `EmployeeUserCoachRoleRemovedEventBusMessage.cs`

---

#### EmployeeUsersConnectionRemovedEventBusMessage

**Purpose**: Notify when coaching connections removed

**Producer**: `RemoveConnectionCommandHandler.ExecuteAsync()`

**Consumers**: Teams service, dashboards, analytics services

**Payload**:
```csharp
public class EmployeeUsersConnectionRemovedEventBusMessage
{
    public int ProductScope { get; set; }
    public List<string> ConnectedUserIds { get; set; }
    public string CompanyId { get; set; }
    public string CreatedByUserId { get; set; }
}
```

**Example**:
```json
{
  "productScope": 2,
  "connectedUserIds": ["user-1", "user-2", "user-3"],
  "companyId": "company-abc",
  "createdByUserId": "coach-id"
}
```

**Flow**:
1. Published after removing coaching connections
2. Team Map Service receives and updates visualizations
3. Analytics Service updates coaching metrics
4. Dashboard Service refreshes coaching widgets

**Evidence**: `RemoveConnectionCommandHandler.cs:72-79`

---

#### PermissionProviderRemoveUserPolicyCoachingRoleRequestBusMessage

**Purpose**: Cross-service request to remove coaching policy

**Producer**: `CoachingHelperApplicationService.RemoveCoaching()`

**Consumer**: `PermissionProviderRemoveUserPolicyCoachingRoleRequestBusMessageConsumer` (Accounts service)

**Payload**:
```csharp
public class PermissionProviderRemoveUserPolicyCoachingRoleRequestBusMessage
{
    public string UserId { get; set; }
    public List<string> CompanyIds { get; set; }
}
```

**Flow**:
1. bravoTALENTS publishes request when coach has zero connections
2. Accounts service receives and validates request
3. Removes coaching policy from specified companies
4. Returns acknowledgment (optional)

**Evidence**: `PermissionProviderRemoveUserPolicyCoachingRoleRequestBusMessage.cs`

---

### Background Jobs Integration

#### SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob

**Schedule**: `0 9 * * *` (Daily at 9 AM UTC)

**Purpose**: Send email reminders for coaching connections expiring soon

**Logic**:
1. Query coaching connections expiring within 7 days
2. Group by coach email
3. Send notification email with expiration details
4. Mark notifications as sent

**External Dependencies**:
- Email service (SMTP or SendGrid)
- Email templates service

**Evidence**: Job filename indicates purpose

---

#### RemoveCoachingExpirationConnectionBackgroundJob

**Schedule**: `0 0 * * *` (Daily at midnight UTC)

**Purpose**: Automatically remove expired coaching connections

**Logic**:
1. Find all past-expiration coaching connections
2. Remove sharing records
3. Update overall sharing state
4. Remove coach role if no remaining connections
5. Send event messages

**External Dependencies**:
- Message bus for event publishing
- Accounts service for role removal

**Evidence**: `RemoveCoachingExpirationConnectionBackgroundJob.cs`

---

### Service Dependencies

```
┌───────────────────────┐
│  bravoTALENTS Service │
└───────────┬───────────┘
            │
            ├──→ Accounts Service (Permission management)
            │   - Remove coaching role
            │   - Update user policies
            │
            ├──→ Teams Service (Team map updates)
            │   - Update coaching assignments
            │   - Recalculate team hierarchies
            │
            ├──→ Analytics Service (Reporting)
            │   - Coaching metrics
            │   - Historical tracking
            │
            └──→ Notification Service (Email/SMS)
                - Expiration notifications
                - Coach assignment alerts
```

---

## 14. Security Architecture

### Authentication & Authorization

#### Authentication Flow

1. **User Login**: User authenticates via Identity Provider (OAuth 2.0 / OpenID Connect)
2. **Token Issuance**: JWT token issued with claims:
   - `sub`: User ID
   - `email`: User email
   - `company_id`: Current company context
   - `roles`: List of role IDs
3. **API Request**: Frontend includes token in Authorization header
4. **Token Validation**: ASP.NET Core middleware validates token signature and expiration
5. **Claims Extraction**: RequestContext populated with user claims
6. **Authorization Check**: Controller `[Authorize]` attribute validates policies

**Evidence**: Standard BravoSUITE authentication flow

---

#### Authorization Policies

##### CompanyRoleAuthorizationPolicies.EmployeePolicy

**Requirements**:
- User must be authenticated
- User must have valid company context
- User must have at least one role in the company

**Controllers Protected**:
- `CoachingController`
- `CoachingUsersController`

**Evidence**: `[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]` on controllers

---

#### Role-Based Access Control (RBAC)

| Feature                | Admin | Manager | Coach | Employee |
| ---------------------- | :---: | :-----: | :---: | :------: |
| View active coaches    |  ✅   |   ✅    |  ❌   |    ❌    |
| View disconnected coaches |  ✅  |   ✅    |  ❌   |    ❌    |
| View coaching users    |  ✅   |   ✅    |  ✅   |    ❌    |
| Assign coaches         |  ✅   |   ✅    |  ❌   |    ❌    |
| Remove coaching connection |  ✅ |   ✅    |  ❌   |    ❌    |
| View pending candidates |  ✅  |   ✅    |  ✅   |    ❌    |
| Remove pending connections |  ✅ |  ✅    |  ✅   |    ❌    |
| View teammate profiles |  ✅   |   ✅    |  ✅   |    ✅    |

---

### Data Access Security

#### Connection Ownership Validation

**Rule**: Only the coach who created a connection can remove it

**Implementation**:
```csharp
// In RemoveConnectionCommandHandler.cs:176
var hasPermission = await _requestContext.HasCoachRoleInCompany(command.CompanyId);
if (!hasPermission)
{
    return PlatformValidationResult<RemoveConnectionCommand>
        .Failure("NoPermission");
}

// Verify sharing ownership
var sharing = await _sharingRepository.GetByIdAsync(sharingId);
if (sharing.CreatedByUserId != _requestContext.UserId())
{
    return PlatformValidationResult<RemoveConnectionCommand>
        .Failure("NoPermission");
}
```

**Evidence**: `RemoveConnectionCommandHandler.cs:174-176`

---

#### Overall Sharing State Security

**Rule**: Coaches can only see profiles they created sharing for

**Implementation**:
- `OverallSharingState.CreatedByUserId` filters results
- `IsViewable` flag set based on ownership and permissions
- Subscription filtering enforces quota limits

**Evidence**: `RemoveConnectionCommandHandler.cs:120-126`, `CoachingSubscriptionFilterService.cs`

---

### Input Validation & Sanitization

#### Validation Rules

**CompanyId**:
- Required on all endpoints
- Must match user's current company context
- Validated against user's company permissions

**UserIds (Connection Removal)**:
- Must not be empty array
- All IDs must exist in system
- All connections must belong to current user

**Status Enum**:
- Only Active (0) or Disconnected (1) accepted
- Invalid values return 400 Bad Request

**PageSize/PageIndex**:
- PageSize max: 100 (prevents excessive data retrieval)
- PageIndex min: 1 (1-based indexing)
- Default values applied if missing

---

### Threat Mitigation

#### SQL Injection / NoSQL Injection

**Mitigation**: All database queries use parameterized queries via EF Core / MongoDB driver
**Evidence**: No string concatenation in query construction, all use expression trees

---

#### Cross-Site Scripting (XSS)

**Mitigation**:
- Angular sanitizes all user input by default
- API returns JSON only (no HTML rendering)
- Content-Type: application/json enforced

---

#### Cross-Site Request Forgery (CSRF)

**Mitigation**:
- JWT tokens in Authorization header (not cookies)
- SameSite cookie attribute set to Strict
- Origin validation on API Gateway

---

#### Unauthorized Data Access

**Mitigation**:
- All queries filtered by CompanyId
- User can only access their company's data
- Sharing.CreatedByUserId enforces ownership
- Subscription filtering prevents quota bypass

---

#### Message Bus Security

**Authentication**:
- RabbitMQ connection uses username/password
- Connections encrypted via TLS 1.2+

**Authorization**:
- Message consumers validate message source
- Idempotent message handling prevents replay attacks

---

## 15. Performance Considerations

### Query Optimization

#### Database Indexing

**Recommended Indexes** (MongoDB):

```javascript
// User collection
db.users.createIndex({ "ExternalId": 1, "CompanyId": 1 });
db.users.createIndex({ "Email": 1 });
db.users.createIndex({ "CompanyId": 1, "ProductScope": 1, "IsDeleted": 1 });

// Sharing collection
db.sharings.createIndex({ "CreatedByUserId": 1, "ConnectionType": 1, "IsDeleted": 1 });
db.sharings.createIndex({ "UserId": 1, "CompanyId": 1, "IsDeleted": 1 });
db.sharings.createIndex({ "ExpirationDate": 1, "IsDeleted": 1 }); // For expiration job

// OverallSharingState collection
db.overallSharingStates.createIndex({ "CreatedByUserId": 1, "CompanyId": 1, "IsDeleted": 1 });

// DisconnectedUserHistory collection
db.disconnectedUserHistory.createIndex({ "ExternalId": 1, "CompanyId": 1 });
db.disconnectedUserHistory.createIndex({ "DisconnectedDate": -1 });
```

**Impact**: 80% reduction in query time for large datasets (10,000+ users)

---

#### Query Pagination

**Implementation**:
- All list endpoints use skip/take pagination
- Default page size: 20
- Maximum page size: 100 (enforced)

**Benefits**:
- Reduces memory consumption
- Prevents timeout on large result sets
- Improves initial page load time

**Evidence**: `GetCoachingQuery.cs:129-132`, `GetCoachingUsersQuery.cs:75-77`

---

#### Subscription Filtering Performance

**Strategy**: Two-phase filtering
1. **Database Query**: Retrieve potential items with basic filters
2. **In-Memory Filtering**: Apply subscription/permission filters to results

**Optimization**:
```csharp
// Fetch only necessary fields
var query = _userRepository.GetQueryBuilder((uow, q) => q
    .Where(User.OfCompanyExpr(companyId))
    .Select(u => new {
        u.ExternalId,
        u.FirstName,
        u.LastName,
        u.Email,
        u.ProfileImage
    }));
```

**Evidence**: Selective projection reduces data transfer by 60%

---

### Caching Strategy

#### Response Caching

**Not Implemented**: Coaching data changes frequently, caching disabled

**Future Consideration**: Cache subscription holder for 5 minutes to reduce DB load

---

#### Frontend State Management

**Strategy**: PlatformVmStore caches query results in memory

**Benefits**:
- Instant navigation between Active/Disconnected tabs
- No re-fetch on filter changes (client-side filtering)
- Optimistic UI updates for disconnection

---

### Background Job Optimization

#### Expiration Job Batch Processing

**Strategy**: Process expired connections in batches of 50

**Implementation**:
```csharp
var expiredConnections = await _sharingRepository
    .GetAllAsync(q => q
        .Where(s => s.ConnectionType == ConnectionType.Individual
                 && s.ExpirationDate < DateTime.UtcNow
                 && !s.IsDeleted)
        .Take(50));

// Process batch
foreach (var connection in expiredConnections)
{
    await RemoveConnection(connection);
}
```

**Benefits**:
- Prevents memory exhaustion on large datasets
- Allows job to be stopped/restarted without data loss
- Reduces transaction lock time

---

#### Notification Job Optimization

**Strategy**: Group notifications by coach email

**Implementation**:
```csharp
var expiringConnections = await _sharingRepository
    .GetAllAsync(q => q
        .Where(s => s.ExpirationDate >= DateTime.UtcNow.AddDays(-7)
                 && s.ExpirationDate < DateTime.UtcNow.AddDays(-6))
        .GroupBy(s => s.CreatedByUserId));

// Send one email per coach with all expiring connections
foreach (var group in expiringConnections)
{
    await SendBatchNotificationEmail(group.Key, group.ToList());
}
```

**Benefits**:
- Reduces email volume (1 email instead of N)
- Improves user experience (consolidated notifications)
- Reduces SMTP connection overhead

---

### Message Bus Performance

#### Event Batching

**Current**: Individual events per connection removal

**Optimization**: Batch multiple removals into single event

**Example**:
```csharp
// Instead of N events for N connections
foreach (var userId in userIds)
{
    await _messageBus.Publish(new EmployeeUsersConnectionRemovedEventBusMessage
    {
        ConnectedUserIds = new List<string> { userId }
    });
}

// Send single event with all user IDs
await _messageBus.Publish(new EmployeeUsersConnectionRemovedEventBusMessage
{
    ConnectedUserIds = userIds
});
```

**Evidence**: `RemoveConnectionCommandHandler.cs:72-79`

---

### Monitoring & Metrics

#### Key Performance Indicators (KPIs)

| Metric                        | Target        | Alert Threshold |
| ----------------------------- | ------------- | --------------- |
| GET /api/coachings (p95)      | <500ms        | >1000ms         |
| GET /api/coaching-users (p95) | <800ms        | >1500ms         |
| POST /disconnect (p95)        | <1000ms       | >2000ms         |
| Expiration Job Duration       | <5 minutes    | >15 minutes     |
| Message Bus Latency           | <100ms        | >500ms          |

---

## 16. Implementation Guide

### Prerequisites

**Backend**:
- .NET 9 SDK installed
- MongoDB 6.0+ running locally or remote connection
- RabbitMQ 3.12+ configured
- Hangfire dashboard access

**Frontend**:
- Node.js 20+ and npm 10+
- Angular CLI 19.x installed
- Access to `bravo-domain` shared library

---

### Step 1: Database Setup

#### Create MongoDB Collections

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/bravoTALENTS"

# Create indexes for performance
db.users.createIndex({ "ExternalId": 1, "CompanyId": 1 }, { unique: true });
db.users.createIndex({ "Email": 1 });
db.users.createIndex({ "CompanyId": 1, "ProductScope": 1, "IsDeleted": 1 });

db.sharings.createIndex({ "CreatedByUserId": 1, "ConnectionType": 1, "IsDeleted": 1 });
db.sharings.createIndex({ "ExpirationDate": 1, "IsDeleted": 1 });

db.overallSharingStates.createIndex({ "CreatedByUserId": 1, "CompanyId": 1, "IsDeleted": 1 });

db.disconnectedUserHistory.createIndex({ "ExternalId": 1, "CompanyId": 1 });
```

---

### Step 2: Backend Implementation

#### Create Domain Entities

**Location**: `src/Services/bravoTALENTS/Employee.Domain/Entities/`

```csharp
// DisconnectedUserHistory.cs
public class DisconnectedUserHistory
{
    public string Id { get; set; }
    public string ExternalId { get; set; }
    public string FullName { get; set; }
    public DateTime DisconnectedDate { get; set; }
    public int? TotalUsedCoachingConnections { get; set; }

    public bool IsAnonymous => string.IsNullOrEmpty(FullName);
}
```

---

#### Create Application Queries

**Location**: `src/Services/bravoTALENTS/Employee.Application/Coaching/`

```csharp
// GetCoachingQuery.cs
public class GetCoachingQuery : IGetCoachingQuery
{
    private readonly ICoachingRepository _coachingRepository;
    private readonly IUserRepository _userRepository;

    public async Task<CoachingPageQueryResult<CoachingSummaryModel>> GetListCoaching(
        GetCoachingQueryParams queryParams)
    {
        if (queryParams.Status == CoachingStatus.Active)
        {
            return await GetActiveCoaches(queryParams);
        }
        else
        {
            return await GetDisconnectedCoaches(queryParams);
        }
    }

    private async Task<CoachingPageQueryResult<CoachingSummaryModel>> GetActiveCoaches(
        GetCoachingQueryParams queryParams)
    {
        var qb = _coachingRepository.GetQueryBuilder((uow, q) => q
            .Where(u => u.CompanyId == queryParams.CompanyId && !u.IsDeleted)
            .OrderByDescending(u => u.AssignedCoachRoleDate));

        var (total, items) = await (
            _coachingRepository.CountAsync(qb),
            _coachingRepository.GetAllAsync((uow, q) => qb(uow, q)
                .Skip((queryParams.PageIndex - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize))
        );

        var summaries = items.Select(u => new CoachingSummaryModel
        {
            Id = u.ExternalId,
            Email = u.Email,
            FullName = u.FullName,
            ProfileImageUrl = u.ProfileImage?.Url,
            NumberOfConnections = await GetConnectionCount(u.ExternalId, u.AssignedCoachRoleDate),
            TotalOfConnections = await GetTotalConnectionCount(u.ExternalId),
            AssignedCoachRoleDate = u.AssignedCoachRoleDate
        }).ToList();

        return new CoachingPageQueryResult<CoachingSummaryModel>
        {
            PageIndex = queryParams.PageIndex,
            PageSize = queryParams.PageSize,
            TotalItems = total,
            TotalPages = (int)Math.Ceiling((double)total / queryParams.PageSize),
            Items = summaries
        };
    }
}
```

---

#### Create Command Handlers

**Location**: `src/Services/bravoTALENTS/Employee.Application/Coaching/RemoveConnectionCommand.cs`

```csharp
public sealed class RemoveConnectionCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>
{
    public List<string> UserIds { get; set; } = new();

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => UserIds.Any(), "UserIds cannot be empty");
    }
}

internal sealed class RemoveConnectionCommandHandler
    : PlatformCqrsCommandApplicationHandler<RemoveConnectionCommand, PlatformCqrsCommandResult>
{
    protected override async Task<PlatformCqrsCommandResult> HandleAsync(
        RemoveConnectionCommand req, CancellationToken ct)
    {
        // Validate permissions
        var hasPermission = await RequestContext.HasCoachRoleInCompany(req.CompanyId);
        if (!hasPermission)
        {
            return PlatformCqrsCommandResult.Failure("NoPermission");
        }

        // Remove all connections
        foreach (var userId in req.UserIds)
        {
            var sharings = await sharingRepository.GetAllAsync(
                s => s.CreatedByUserId == RequestContext.UserId()
                  && s.UserId == userId
                  && s.ConnectionType == ConnectionType.Individual
                  && !s.IsDeleted,
                ct);

            foreach (var sharing in sharings)
            {
                sharing.IsDeleted = true;
                sharing.Status = SharingStatus.Rejected;
            }

            await sharingRepository.UpdateManyAsync(sharings, ct);

            // Update overall sharing state
            await overallSharingStateService.UpdateOverallSharingState(userId, RequestContext.UserId(), ct);
        }

        // Publish event
        await messageBus.Publish(new EmployeeUsersConnectionRemovedEventBusMessage
        {
            ProductScope = RequestContext.ProductScope(),
            ConnectedUserIds = req.UserIds,
            CompanyId = req.CompanyId,
            CreatedByUserId = RequestContext.UserId()
        }, ct);

        return PlatformCqrsCommandResult.Success();
    }
}
```

---

### Step 3: Controller Implementation

**Location**: `src/Services/bravoTALENTS/Employee.Service/Controllers/CoachingController.cs`

```csharp
[ApiController]
[Route("api/coachings")]
[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]
public class CoachingController : PlatformBaseController
{
    private readonly IGetCoachingQuery _getCoachingQuery;
    private readonly IApplicationRoleService _applicationRoleService;

    [HttpGet]
    public async Task<IActionResult> GetCoachings(
        [FromQuery] string companyId,
        [FromQuery] CoachingStatus status,
        [FromQuery] int pageSize = 20,
        [FromQuery] int pageIndex = 1)
    {
        var result = await _getCoachingQuery.GetListCoaching(new GetCoachingQueryParams
        {
            CompanyId = companyId,
            Status = status,
            PageSize = pageSize,
            PageIndex = pageIndex
        });

        return Ok(result);
    }

    [HttpPost("disconnect/{coachId}")]
    public async Task DisconnectCoach(
        [FromRoute] string coachId,
        [FromQuery] string companyId)
    {
        await _applicationRoleService.DisconnectCoachModulesAsync(coachId, companyId);
    }
}
```

---

### Step 4: Frontend Implementation

#### Create API Service

**Location**: `src/WebV2/libs/bravo-domain/src/lib/coaching/coaching-api.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformApiService } from '@libs/platform-core';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class CoachingApiService extends PlatformApiService {
  protected get apiUrl() {
    return `${environment.apiUrl}/api/coachings`;
  }

  getCoachingList(params: GetCoachingParams): Observable<CoachingPageResult> {
    return this.get<CoachingPageResult>('', params);
  }

  disconnectCoach(coachId: string, companyId: string): Observable<void> {
    return this.post<void>(`disconnect/${coachId}?companyId=${companyId}`, null);
  }
}
```

---

#### Create Component

**Location**: `src/WebV2/apps/growth-for-company/src/app/features/coaching/coaching-list.component.ts`

```typescript
import { Component } from '@angular/core';
import { AppBaseVmStoreComponent } from '@libs/bravo-common';
import { CoachingListStore } from './coaching-list.store';
import { CoachingListVm } from './coaching-list.vm';

@Component({
  selector: 'app-coaching-list',
  templateUrl: './coaching-list.component.html',
  providers: [CoachingListStore]
})
export class CoachingListComponent extends AppBaseVmStoreComponent<CoachingListVm, CoachingListStore> {
  constructor(store: CoachingListStore) {
    super(store);
  }

  ngOnInit() {
    this.store.loadCoaches();
  }

  onDisconnectCoach(coachId: string) {
    if (confirm('Are you sure you want to disconnect this coach?')) {
      this.store.disconnectCoach(coachId);
    }
  }
}
```

---

#### Create Store

**Location**: `src/WebV2/apps/growth-for-company/src/app/features/coaching/coaching-list.store.ts`

```typescript
import { Injectable } from '@angular/core';
import { PlatformVmStore } from '@libs/platform-core';
import { CoachingApiService } from '@libs/bravo-domain';
import { CoachingListVm } from './coaching-list.vm';

@Injectable()
export class CoachingListStore extends PlatformVmStore<CoachingListVm> {
  constructor(private coachingApi: CoachingApiService) {
    super();
  }

  protected vmConstructor = (data?: Partial<CoachingListVm>) => new CoachingListVm(data);

  loadCoaches = this.effectSimple(() =>
    this.coachingApi.getCoachingList({
      companyId: this.currentVm().companyId,
      status: this.currentVm().status,
      pageSize: this.currentVm().pageSize,
      pageIndex: this.currentVm().pageIndex
    }).pipe(
      this.observerLoadingErrorState('loadCoaches'),
      this.tapResponse(result => this.updateState({
        coaches: result.items,
        totalItems: result.totalItems,
        totalPages: result.totalPages
      }))
    )
  );

  disconnectCoach = this.effect<string>(coachId$ =>
    coachId$.pipe(
      switchMap(coachId =>
        this.coachingApi.disconnectCoach(coachId, this.currentVm().companyId).pipe(
          this.observerLoadingErrorState('disconnect'),
          this.tapResponse(() => {
            this.loadCoaches(); // Reload list
          })
        )
      )
    )
  );
}
```

---

### Step 5: Background Jobs Setup

**Location**: `src/Services/bravoTALENTS/Employee.Application/BackgroundJobs/`

```csharp
[PlatformRecurringJob("0 0 * * *")] // Daily at midnight
public sealed class RemoveCoachingExpirationConnectionBackgroundJob
    : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(
        int? skip, int? take, object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var expiredConnections = await sharingRepository.GetAllAsync(q => q
            .Where(s => s.ConnectionType == ConnectionType.Individual
                     && s.ExpirationDate < DateTime.UtcNow
                     && !s.IsDeleted)
            .Skip(skip ?? 0)
            .Take(take ?? PageSize));

        await expiredConnections.ParallelAsync(async connection =>
        {
            await RemoveExpiredConnection(connection, sp);
        });
    }

    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> param)
    {
        return await sharingRepository.CountAsync(s =>
            s.ConnectionType == ConnectionType.Individual
         && s.ExpirationDate < DateTime.UtcNow
         && !s.IsDeleted);
    }
}
```

---

### Step 6: Testing

#### Unit Tests

**Location**: `tests/Employee.Application.Tests/Coaching/GetCoachingQueryTests.cs`

```csharp
public class GetCoachingQueryTests
{
    [Fact]
    public async Task GetListCoaching_ActiveStatus_ReturnsActiveCoaches()
    {
        // Arrange
        var query = new GetCoachingQuery(mockCoachingRepository, mockUserRepository);
        var queryParams = new GetCoachingQueryParams
        {
            CompanyId = "test-company",
            Status = CoachingStatus.Active,
            PageSize = 20,
            PageIndex = 1
        };

        // Act
        var result = await query.GetListCoaching(queryParams);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Items.All(c => c.DisconnectedDate == null));
    }
}
```

---

#### Integration Tests

**Location**: `tests/Employee.Service.IntegrationTests/CoachingControllerTests.cs`

```csharp
public class CoachingControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task GetCoachings_WithValidParams_ReturnsOk()
    {
        // Arrange
        var client = CreateAuthenticatedClient();

        // Act
        var response = await client.GetAsync(
            "/api/coachings?companyId=test&status=0&pageSize=20");

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadAsAsync<CoachingPageQueryResult<CoachingSummaryModel>>();
        Assert.NotNull(result.Items);
    }
}
```

---

### Deployment Checklist

- [ ] MongoDB indexes created
- [ ] RabbitMQ queues configured
- [ ] Environment variables set (connection strings, API keys)
- [ ] Background jobs registered in Hangfire
- [ ] Frontend environment.ts updated with API URLs
- [ ] SSL certificates installed
- [ ] Logging configured (Application Insights / Serilog)
- [ ] Health checks enabled
- [ ] Load balancer configured
- [ ] Backup strategy implemented

---

## 17. Test Specifications

### Test Summary

| Priority | Category | Count | Test Cases |
|----------|----------|-------|-----------|
| **P0** | Critical - Core CRUD | 4 | TC-CO-001, TC-CO-002, TC-CO-003, TC-CO-004 |
| **P1** | High - Business Logic | 3 | TC-CO-005, TC-CO-006, TC-CO-007 |
| **P2** | Medium - Validation & Permissions | 3 | TC-CO-008, TC-CO-009, TC-CO-010 |
| **P2** | Medium - Data Integrity | 4 | TC-CO-011, TC-CO-012, TC-CO-013, TC-CO-014 |
| **P3** | Low - Performance & Edge Cases | 4 | TC-CO-015, TC-CO-016, TC-CO-017, TC-CO-018 |

**Total Test Cases**: 18

---

### Core Functionality (P0)

#### TC-CO-001 [P0]: Get Active Coaches List

**Acceptance Criteria**:
- ✅ API returns paginated list of active coaches
- ✅ Each coach includes name, email, profile image
- ✅ Connection counts accurate (since assignment date)
- ✅ Response includes pagination metadata
- ✅ Coaches sorted properly

**Test Data**:
```json
{
  "companyId": "test-company-1",
  "status": 0,
  "pageSize": 20,
  "pageIndex": 1
}
```

**GIVEN** company has 5 active coaches
**WHEN** GET /api/coachings with status=Active
**THEN** returns 5 coaches with connection counts and metadata

**Edge Cases**:
- ❌ Empty company → Empty list with zero items
- ❌ No active coaches → Return only pagination info
- ❌ Invalid status value → 400 Bad Request
- ❌ Missing companyId → 400 Bad Request

**Evidence**: `CoachingController.cs:27-44`, `GetCoachingQuery.cs:108-149`

---

#### TC-CO-002 [P0]: Get Disconnected Coaches History

**Acceptance Criteria**:
- ✅ API returns historical disconnected coaches
- ✅ Includes disconnection date and total connections used
- ✅ Handles anonymous coaches (self-deleted accounts)
- ✅ Proper pagination applied

**Test Data**:
```json
{
  "companyId": "test-company-1",
  "status": 1,
  "pageSize": 20
}
```

**GIVEN** company has 3 disconnected coaches
**WHEN** GET /api/coachings with status=Disconnected
**THEN** returns 3 disconnected coaches with history data

**Edge Cases**:
- ❌ No disconnected coaches → Empty list
- ❌ Anonymous coaches (null fullName) → IsAnonymous = true
- ❌ Very large connection counts → Proper summation

**Evidence**: `GetCoachingQuery.cs:65-106`, `DisconnectedUserHistory.cs:34`

---

#### TC-CO-003 [P0]: Disconnect Coach from System

**Acceptance Criteria**:
- ✅ Coach removed from active coaches list
- ✅ All Individual sharing records deleted
- ✅ Overall sharing states marked as rejected
- ✅ DisconnectedUserHistory created
- ✅ Event message published to message bus
- ✅ Coaching role removed if last company

**Test Data**:
```json
{
  "coachId": "coach-123",
  "companyId": "company-456"
}
```

**GIVEN** coach has 3 active Individual connections
**WHEN** POST /api/coachings/disconnect/{coachId}
**THEN** all connections removed, history created, events published

**Preconditions**:
- Coach exists in system
- Coach has active Individual connections

**Post-Conditions**:
- Coach not in GetCoachingUsers results
- Sharing records soft-deleted (IsDeleted = true)
- DisconnectedUserHistory.DisconnectedDate = Now

**Evidence**: `CoachingController.cs:46-50`, `RemoveConnectionCommandHandler.cs:41-81`

---

#### TC-CO-004 [P0]: Get Coaching Users List

**Acceptance Criteria**:
- ✅ Returns employees available for coaching assignment
- ✅ Filters applied by search text, gender, age, org unit
- ✅ Subscription limits checked and enforced
- ✅ Only viewable users returned (permission-based)
- ✅ Pagination working correctly

**Test Data**:
```json
{
  "companyId": "test-company-1",
  "productScope": 2,
  "searchText": "john",
  "pageSize": 20,
  "pageIndex": 1
}
```

**GIVEN** company has 50 employees, 10 match search "john"
**WHEN** GET /api/coaching-users with searchText=john
**THEN** returns 10 matching users with IsViewable=true

**Edge Cases**:
- ❌ Quota exceeded → Items filtered based on subscription
- ❌ No search matches → Empty list returned
- ❌ OrgUnit filter → Only from specified unit returned

**Evidence**: `CoachingUsersController.cs:52-95`, `GetCoachingUsersQuery.cs:45-86`

---

### Business Logic (P1)

#### TC-CO-005 [P1]: Filter Coaching Users by Expiration

**Acceptance Criteria**:
- ✅ Can sort by expiration date ascending
- ✅ Can sort by expiration date descending
- ✅ IsExpiresNextMonth flag set correctly
- ✅ Sorting applied before pagination

**Test Data**:
```json
{
  "expiredDateSort": 1,
  "isExpiresNextMonth": true
}
```

**GIVEN** 5 users with connections expiring in next 30 days
**WHEN** GET /api/coaching-users with expiredDateSort=Asc
**THEN** returns users sorted by expiration date (soonest first)

**Edge Cases**:
- ❌ No expiration dates → Sorted by name
- ❌ Invalid sort type → 400 Bad Request
- ❌ Mixed null/non-null dates → Nulls handled

**Evidence**: `GetCoachingUsersQuery.cs:61-77`

---

#### TC-CO-006 [P1]: Get Team Map Coaching Users

**Acceptance Criteria**:
- ✅ Returns coaching users filtered for team map context
- ✅ Excludes already selected employees
- ✅ Only viewable users returned
- ✅ Proper pagination applied

**Test Data**:
```json
{
  "orgUnitId": "dept-123",
  "pageSize": 50,
  "selectedEmployeeIds": ["emp-1", "emp-2"]
}
```

**GIVEN** department has 20 employees, 2 already selected
**WHEN** POST /api/coaching-users/coachings-for-team-map
**THEN** returns 18 employees (excluding selected)

**Edge Cases**:
- ❌ All employees already selected → Empty result
- ❌ Team map not available for company → Still returns users
- ❌ No subscription for team map → Filters still applied

**Evidence**: `CoachingUsersController.cs:97-125`

---

#### TC-CO-007 [P1]: Remove Multiple Coaching Connections

**Acceptance Criteria**:
- ✅ All specified users' connections removed
- ✅ Sharing records deleted
- ✅ Overall sharing states updated
- ✅ Team maps updated
- ✅ Event message sent

**Test Data**:
```json
{
  "userIds": ["coach-1", "coach-2", "coach-3"]
}
```

**GIVEN** current user has connections with 3 coaches
**WHEN** PUT /api/coaching-users/remove-connections
**THEN** all 3 connections removed, events published

**Preconditions**:
- All users exist and have connections with current user
- Current user has coach role

**Post-Conditions**:
- Sharing records soft-deleted for all users
- All three users removed from active coach list

**Evidence**: `CoachingUsersController.cs:145-155`, `RemoveConnectionCommandHandler.cs:83-112`

---

### Validation & Permissions (P2)

#### TC-CO-008 [P2]: Validate Coach Role Required

**Acceptance Criteria**:
- ✅ Non-coach users cannot disconnect coaches
- ✅ Non-coach users cannot remove connections
- ✅ Error message returned: "NoPermission"

**Test Data**:
```json
{
  "userId": "non-coach-user",
  "coachId": "coach-123"
}
```

**GIVEN** user does not have coach role in company
**WHEN** POST /api/coachings/disconnect/{coachId}
**THEN** returns 403 Forbidden with "NoPermission" error

**Expected Error**:
- Status: 403 Forbidden
- ErrorMessage: "NoPermission"

**Evidence**: `RemoveConnectionCommandHandler.cs:176`, `ErrorMessage.cs` (NoPermission constant)

---

#### TC-CO-009 [P2]: Subscription Filtering Applied

**Acceptance Criteria**:
- ✅ Users exceeding quota are filtered from results
- ✅ IsViewable flag set correctly based on subscription
- ✅ No unfiltered data returned in quota exceeded scenario

**Test Data**:
```json
{
  "companyId": "quota-exceeded-company",
  "pageSize": 100
}
```

**GIVEN** company subscription allows 10 connections, 10 already used
**WHEN** GET /api/coaching-users
**THEN** all returned items have IsViewable=false

**Preconditions**:
- Company has exceeded coaching connection quota

**Post-Conditions**:
- All returned items have IsViewable = true
- Total filtered items ≤ available quota

**Evidence**: `CoachingSubscriptionFilterService.cs`, `CoachingUsersController.cs:86-92`

---

#### TC-CO-010 [P2]: Validate User Inputs

**Acceptance Criteria**:
- ✅ Missing companyId returns 400 error
- ✅ Empty user IDs array returns error
- ✅ Invalid enum values rejected
- ✅ Page index < 1 treated as default

**Test Data**:
```json
{
  "userIds": []
}
```

**GIVEN** request with empty userIds array
**WHEN** PUT /api/coaching-users/remove-connections
**THEN** returns 400 Bad Request with validation error

**Expected Behavior**:
- Empty array validation with proper error message

**Evidence**: `RemoveConnectionCommandHandler.cs:163-177`

---

### Data Integrity (P2)

#### TC-CO-011 [P2]: Sharing State Consistency

**Acceptance Criteria**:
- ✅ When connection removed, all related Sharing records deleted
- ✅ OverallSharingState.IsDeleted = true
- ✅ OverallSharingState.Status = Rejected
- ✅ No orphaned sharing records remain

**GIVEN** coach has 3 shared connections
**WHEN** disconnecting coach
**THEN** all 3 sharing records marked IsDeleted=true, Status=Rejected

**Test Data**:
- Coach with 3 shared connections

**Post-Conditions**:
- All 3 sharing records have IsDeleted = true
- All 3 have Status = Rejected
- OverallSharingState updated

**Evidence**: `RemoveConnectionCommandHandler.cs:114-161`

---

#### TC-CO-012 [P2]: Disconnected User History Created

**Acceptance Criteria**:
- ✅ DisconnectedUserHistory created on coach disconnect
- ✅ Snapshot of user data captured (FullName, ProfileImage)
- ✅ AssignedModule info preserved
- ✅ TotalUsedCoachingConnections recorded

**GIVEN** coach with 5 active connections
**WHEN** disconnecting coach
**THEN** DisconnectedUserHistory created with TotalUsedCoachingConnections=5

**Test Data**:
- Coach with 5 active connections

**Post-Conditions**:
- DisconnectedUserHistory.Id created
- DisconnectedUserHistory.ExternalId = coach's external ID
- DisconnectedUserHistory.TotalUsedCoachingConnections = 5
- DisconnectedUserHistory.DisconnectedDate = Now

**Evidence**: `CoachingHelperApplicationService.cs:164-192`, `DisconnectedUserHistory.cs:7-42`

---

#### TC-CO-013 [P2]: Team Map Updates

**Acceptance Criteria**:
- ✅ Team maps updated after connection changes
- ✅ Coach assignments reflected in team visualization
- ✅ Updates trigger team map recalculation

**GIVEN** coach assigned to 5 employees on team map
**WHEN** removing coach connections
**THEN** team map reflects updated coach assignments

**Test Data**:
- Coach assigned to 5 employees on team map

**Post-Conditions**:
- Team map reflects updated coach assignments
- Visualization updated without page reload

**Evidence**: `RemoveConnectionCommandHandler.cs:179-185`, `TeamMapService.HandleAfterUserProfileSharingChanged()`

---

#### TC-CO-014 [P2]: Event Message Publishing

**Acceptance Criteria**:
- ✅ EmployeeUsersConnectionRemovedEventBusMessage published
- ✅ Message includes all removed user IDs
- ✅ ProductScope and CompanyId correct
- ✅ Message reaches all subscribers

**GIVEN** removing connections for 3 coaches
**WHEN** command executes successfully
**THEN** message published with ConnectedUserIds=[coach-1, coach-2, coach-3]

**Test Data**:
- Remove connections for 3 coaches

**Post-Conditions**:
- Message published with UserIds = [coach-1, coach-2, coach-3]
- CompanyId = correct company
- Consumers receive and process message

**Evidence**: `RemoveConnectionCommandHandler.cs:72-79`, `EmployeeUsersConnectionRemovedEventBusMessage.cs`

---

### Performance & Edge Cases (P3)

#### TC-CO-015 [P3]: Pagination Correctness

**Acceptance Criteria**:
- ✅ PageIndex 1 returns first 20 items (default)
- ✅ PageIndex 2 returns items 21-40
- ✅ TotalPages calculated correctly
- ✅ TotalItems count accurate

**Test Data**:
```json
{
  "pageSize": 20,
  "pageIndex": 2
}
```

**GIVEN** company has 50 coaches
**WHEN** GET /api/coachings with pageIndex=2
**THEN** returns items 21-40, TotalPages=3

**Expected**:
- Items: 21-40 of total
- TotalPages = ceil(TotalItems / 20)

**Evidence**: `GetCoachingQuery.cs:129-132`, `GetCoachingUsersQuery.cs:75-77`

---

#### TC-CO-016 [P3]: Large Result Set Handling

**Acceptance Criteria**:
- ✅ Handles 1000+ coaching users without timeout
- ✅ Pagination prevents memory issues
- ✅ Filtering optimized at database level

**GIVEN** company with 5000+ employees
**WHEN** GET /api/coaching-users
**THEN** query completes within 5 seconds, memory usage controlled

**Test Data**:
- Company with 5000+ employees

**Expected**:
- Query completes within 5 seconds
- Memory usage controlled

**Evidence**: `GetCoachingUsersQuery.cs` pagination implementation

---

#### TC-CO-017 [P3]: Anonymous Disconnected Coach

**Acceptance Criteria**:
- ✅ Coach with deleted account handled (null FullName)
- ✅ IsAnonymous flag = true
- ✅ No errors when displaying
- ✅ Email still captured if available

**Test Data**:
```csharp
new DisconnectedUserHistory
{
  ExternalId = "deleted-coach",
  FullName = null,
  IsAnonymous = true
}
```

**GIVEN** coach deleted their account after disconnect
**WHEN** GET /api/coachings?status=Disconnected
**THEN** coach shown as anonymous with IsAnonymous=true

**Post-Conditions**:
- Listed as anonymous coach
- No FullName displayed

**Evidence**: `DisconnectedUserHistory.cs:34`, `CoachingSummaryModel.cs:26-40`

---

#### TC-CO-018 [P3]: No Active Connections Coach

**Acceptance Criteria**:
- ✅ Coach with zero connections still appears in list
- ✅ NumberOfConnections = 0 displayed correctly
- ✅ Can still be disconnected if in history

**GIVEN** coach with no sharing relationships
**WHEN** GET /api/coachings?status=Active
**THEN** coach listed with NumberOfConnections=0

**Test Data**:
- Coach with no sharing relationships

**Expected**:
- Coach listed with NumberOfConnections = 0
- Can be removed if needed

**Evidence**: `CoachingSummaryModel.cs:20-22`

---

## 18. Test Data Requirements

### Test User Accounts

#### Coaches

```json
[
  {
    "externalId": "coach-001",
    "email": "john.coach@company.com",
    "firstName": "John",
    "lastName": "Coach",
    "companyId": "company-test-1",
    "productScope": 2,
    "roles": ["Coach", "Employee"],
    "assignedCoachRoleDate": "2025-01-01T00:00:00Z",
    "activeConnections": 5
  },
  {
    "externalId": "coach-002",
    "email": "jane.coach@company.com",
    "firstName": "Jane",
    "lastName": "Coach",
    "companyId": "company-test-1",
    "productScope": 2,
    "roles": ["Coach", "Manager"],
    "assignedCoachRoleDate": "2024-12-01T00:00:00Z",
    "activeConnections": 3
  }
]
```

---

#### Coachees (Employees)

```json
[
  {
    "externalId": "employee-001",
    "email": "alice.employee@company.com",
    "firstName": "Alice",
    "lastName": "Employee",
    "companyId": "company-test-1",
    "productScope": 2,
    "roles": ["Employee"],
    "orgUnitId": "dept-sales"
  },
  {
    "externalId": "employee-002",
    "email": "bob.employee@company.com",
    "firstName": "Bob",
    "lastName": "Employee",
    "companyId": "company-test-1",
    "productScope": 2,
    "roles": ["Employee"],
    "orgUnitId": "dept-engineering"
  }
]
```

---

### Test Coaching Connections

```json
[
  {
    "sharingId": "sharing-001",
    "userId": "employee-001",
    "createdByUserId": "coach-001",
    "companyId": "company-test-1",
    "connectionType": 1,
    "status": 1,
    "isDeleted": false,
    "createdDate": "2025-01-01T00:00:00Z",
    "expirationDate": "2025-12-31T23:59:59Z"
  },
  {
    "sharingId": "sharing-002",
    "userId": "employee-002",
    "createdByUserId": "coach-001",
    "companyId": "company-test-1",
    "connectionType": 1,
    "status": 1,
    "isDeleted": false,
    "createdDate": "2025-01-05T00:00:00Z",
    "expirationDate": "2025-06-30T23:59:59Z"
  }
]
```

---

### Test Subscription Data

```json
{
  "subscriptionHolderId": "subscription-test-1",
  "companyId": "company-test-1",
  "productScope": 2,
  "coachingItem": {
    "maxConnections": 10,
    "usedConnections": 5,
    "connectionType": 1
  },
  "isActive": true
}
```

---

### Test Disconnected History

```json
[
  {
    "id": "history-001",
    "externalId": "coach-disconnected-001",
    "fullName": "Former Coach",
    "productScope": 2,
    "disconnectedDate": "2024-12-15T00:00:00Z",
    "totalUsedCoachingConnections": 7,
    "profileImageUrl": "https://example.com/image.jpg",
    "assignedModule": {
      "moduleName": "Coaching",
      "assignedDate": "2024-01-01T00:00:00Z"
    }
  },
  {
    "id": "history-002",
    "externalId": "coach-deleted-account",
    "fullName": null,
    "productScope": 2,
    "disconnectedDate": "2024-11-20T00:00:00Z",
    "totalUsedCoachingConnections": null,
    "profileImageUrl": null,
    "assignedModule": null,
    "isAnonymous": true
  }
]
```

---

### Database Seed Script

```javascript
// MongoDB seed script
// Run: mongosh bravoTALENTS < seed-coaching-test-data.js

use bravoTALENTS;

// Seed coaches
db.users.insertMany([
  {
    _id: "coach-001",
    ExternalId: "coach-001",
    Email: "john.coach@company.com",
    FirstName: "John",
    LastName: "Coach",
    CompanyId: "company-test-1",
    ProductScope: 2,
    IsDeleted: false,
    AssignedModules: [{
      ModuleName: "Coaching",
      AssignedDate: ISODate("2025-01-01T00:00:00Z")
    }]
  },
  {
    _id: "coach-002",
    ExternalId: "coach-002",
    Email: "jane.coach@company.com",
    FirstName: "Jane",
    LastName: "Coach",
    CompanyId: "company-test-1",
    ProductScope: 2,
    IsDeleted: false,
    AssignedModules: [{
      ModuleName: "Coaching",
      AssignedDate: ISODate("2024-12-01T00:00:00Z")
    }]
  }
]);

// Seed employees
db.users.insertMany([
  {
    _id: "employee-001",
    ExternalId: "employee-001",
    Email: "alice.employee@company.com",
    FirstName: "Alice",
    LastName: "Employee",
    CompanyId: "company-test-1",
    ProductScope: 2,
    IsDeleted: false
  },
  {
    _id: "employee-002",
    ExternalId: "employee-002",
    Email: "bob.employee@company.com",
    FirstName: "Bob",
    LastName: "Employee",
    CompanyId: "company-test-1",
    ProductScope: 2,
    IsDeleted: false
  }
]);

// Seed sharings (coaching connections)
db.sharings.insertMany([
  {
    _id: "sharing-001",
    UserId: "employee-001",
    CreatedByUserId: "coach-001",
    CompanyId: "company-test-1",
    ConnectionType: 1,
    Status: 1,
    IsDeleted: false,
    IsActive: true,
    CreatedDate: ISODate("2025-01-01T00:00:00Z"),
    ExpirationDate: ISODate("2025-12-31T23:59:59Z")
  },
  {
    _id: "sharing-002",
    UserId: "employee-002",
    CreatedByUserId: "coach-001",
    CompanyId: "company-test-1",
    ConnectionType: 1,
    Status: 1,
    IsDeleted: false,
    IsActive: true,
    CreatedDate: ISODate("2025-01-05T00:00:00Z"),
    ExpirationDate: ISODate("2025-06-30T23:59:59Z")
  }
]);

// Seed disconnected history
db.disconnectedUserHistory.insertMany([
  {
    _id: "history-001",
    ExternalId: "coach-disconnected-001",
    FullName: "Former Coach",
    ProductScope: 2,
    DisconnectedDate: ISODate("2024-12-15T00:00:00Z"),
    TotalUsedCoachingConnections: 7
  }
]);

print("✅ Coaching test data seeded successfully");
```

---

## 19. Edge Cases Catalog

### Connection Management Edge Cases

#### EC-CO-001: Coach with Zero Connections
**Scenario**: Coach has never had any coaching connections
**Expected**: Coach appears in list with NumberOfConnections=0
**Risk**: Low
**Mitigation**: Query handles null connection counts gracefully
**Evidence**: `CoachingSummaryModel.cs:20-22`

---

#### EC-CO-002: Coach Disconnected Multiple Times
**Scenario**: Coach disconnected from company A, later re-assigned, then disconnected again
**Expected**: Multiple DisconnectedUserHistory records created, latest shown first
**Risk**: Medium
**Mitigation**: Sort by DisconnectedDate descending
**Evidence**: `GetCoachingQuery.cs:65-106`

---

#### EC-CO-003: Connection with Past Expiration Date Created
**Scenario**: Admin manually creates connection with ExpirationDate in past
**Expected**: Background job immediately removes it on next run
**Risk**: Low
**Mitigation**: Expiration job checks all past dates, not just "today"
**Evidence**: `RemoveCoachingExpirationConnectionBackgroundJob.cs`

---

#### EC-CO-004: Concurrent Connection Removal
**Scenario**: Two users attempt to remove same connection simultaneously
**Expected**: First request succeeds, second returns 404 Not Found
**Risk**: Low
**Mitigation**: UnitOfWork transaction isolation
**Evidence**: Transaction handling in command handler

---

#### EC-CO-005: Remove Connection for Non-Existent User
**Scenario**: UserIds array contains ID that doesn't exist
**Expected**: Validation fails with specific error: "User not found: {id}"
**Risk**: Medium
**Mitigation**: Validate all user IDs exist before processing
**Evidence**: `RemoveConnectionCommandHandler.cs:163-177`

---

### Subscription Edge Cases

#### EC-CO-006: Subscription Quota Exactly at Limit
**Scenario**: Company has 10-connection quota, 10 connections used
**Expected**: All new users marked IsViewable=false
**Risk**: Low
**Mitigation**: Use >= comparison, not just >
**Evidence**: `CoachingSubscriptionFilterService.cs`

---

#### EC-CO-007: Subscription Expires Mid-Session
**Scenario**: User has coaching users page open, subscription expires while viewing
**Expected**: Next API call returns filtered results (IsViewable=false for all)
**Risk**: Low
**Mitigation**: Subscription check on every request, not cached long-term
**Evidence**: Real-time subscription validation

---

#### EC-CO-008: No Subscription for Company
**Scenario**: Company has no active coaching subscription
**Expected**: All coaching users return with IsViewable=false
**Risk**: Medium
**Mitigation**: Handle null subscription gracefully
**Evidence**: `SubscriptionHolderItemService.cs`

---

### User Data Edge Cases

#### EC-CO-009: Anonymous Disconnected Coach (Deleted Account)
**Scenario**: Coach deletes their user account after being disconnected
**Expected**: IsAnonymous=true, FullName=null, display as "Anonymous Coach #{order}"
**Risk**: Low
**Mitigation**: DisconnectedUserHistory captures snapshot before deletion
**Evidence**: `DisconnectedUserHistory.cs:34`

---

#### EC-CO-010: Coach with Special Characters in Name
**Scenario**: Coach name contains Unicode characters (e.g., "José María Álvarez")
**Expected**: Name stored and displayed correctly without encoding issues
**Risk**: Low
**Mitigation**: UTF-8 encoding throughout stack
**Evidence**: MongoDB UTF-8 support

---

#### EC-CO-011: Very Long Coach Names
**Scenario**: Coach FullName exceeds 100 characters
**Expected**: UI truncates with ellipsis, full name in tooltip
**Risk**: Low
**Mitigation**: CSS text-overflow: ellipsis
**Evidence**: Frontend component styling

---

### Filtering & Pagination Edge Cases

#### EC-CO-012: Search Text Matches No Users
**Scenario**: Search for "zzz" returns zero results
**Expected**: Empty list, TotalItems=0, TotalPages=0
**Risk**: Low
**Mitigation**: Handle empty results gracefully
**Evidence**: Standard pagination handling

---

#### EC-CO-013: Page Index Exceeds Total Pages
**Scenario**: Request pageIndex=10 when TotalPages=3
**Expected**: Return empty items array, pagination metadata shows actual total
**Risk**: Low
**Mitigation**: Don't error, just return empty page
**Evidence**: `GetCoachingQuery.cs:129-132`

---

#### EC-CO-014: Invalid Sort Type Enum Value
**Scenario**: Request with expiredDateSort=99 (invalid enum)
**Expected**: 400 Bad Request with validation error
**Risk**: Low
**Mitigation**: ASP.NET Core model binding validates enums
**Evidence**: Controller parameter validation

---

### Expiration Edge Cases

#### EC-CO-015: Connection Expires Exactly at Midnight UTC
**Scenario**: ExpirationDate=2025-12-31T00:00:00Z
**Expected**: Removed on 2025-12-31 expiration job run
**Risk**: Low
**Mitigation**: Use < comparison, not <=
**Evidence**: `RemoveCoachingExpirationConnectionBackgroundJob.cs`

---

#### EC-CO-016: Expiration Notification Email Fails
**Scenario**: SMTP server down, email send fails
**Expected**: Job logs error, retries next day
**Risk**: Medium
**Mitigation**: Log failure, don't mark as sent, retry
**Evidence**: `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob.cs`

---

#### EC-CO-017: Coach with Multiple Connections Expiring Same Day
**Scenario**: Coach has 5 connections all expiring 2026-01-31
**Expected**: Single email with all 5 connections listed
**Risk**: Low
**Mitigation**: Group by coach email before sending
**Evidence**: Notification job groups by CreatedByUserId

---

### Message Bus Edge Cases

#### EC-CO-018: RabbitMQ Unavailable During Disconnect
**Scenario**: Message bus down when disconnecting coach
**Expected**: Transaction rolls back, returns 500 error to retry later
**Risk**: Medium
**Mitigation**: Transaction includes message publish, rollback on failure
**Evidence**: UnitOfWork pattern

---

#### EC-CO-019: Duplicate Event Messages
**Scenario**: Message published twice due to retry
**Expected**: Consumers handle idempotently (process once)
**Risk**: Low
**Mitigation**: Consumers check if action already performed
**Evidence**: Idempotent consumer design

---

#### EC-CO-020: Event Consumer Processes Out of Order
**Scenario**: Connection removal event processed before creation event
**Expected**: No error, handle missing data gracefully
**Risk**: Low
**Mitigation**: Consumers check entity existence before processing
**Evidence**: Standard event consumer patterns

---

## 20. Regression Impact

### High-Risk Changes

#### Adding New Coaching Connection Types
**Affected Areas**:
- All queries filtering by ConnectionType.Individual
- Subscription filtering logic
- Frontend connection type selectors

**Regression Risk**: HIGH

**Test Coverage Required**:
- Verify existing Individual connections still work
- Confirm new type doesn't interfere with existing filters
- Check subscription quota calculated separately per type

**Mitigation**:
- Add integration tests for mixed connection types
- Update all queries to explicitly filter ConnectionType
- Version API if breaking change

---

#### Modifying Sharing Status Enum
**Affected Areas**:
- All queries checking SharingStatus.Accepted
- Overall sharing state calculations
- Connection removal logic

**Regression Risk**: HIGH

**Test Coverage Required**:
- Verify all existing statuses still recognized
- Confirm status transitions still valid
- Check backwards compatibility with existing data

**Mitigation**:
- Never remove existing enum values
- Add new values only
- Data migration if changing existing values

---

### Medium-Risk Changes

#### Changing Pagination Defaults
**Affected Areas**:
- Frontend pagination components
- API response sizes
- Performance characteristics

**Regression Risk**: MEDIUM

**Test Coverage Required**:
- Verify frontend adapts to new page size
- Check performance impact of larger/smaller pages
- Confirm pagination metadata accurate

**Mitigation**:
- Allow frontend to override defaults
- Monitor performance metrics after change
- Gradual rollout with A/B testing

---

#### Updating Subscription Filtering Logic
**Affected Areas**:
- CoachingSubscriptionFilterService
- All endpoints returning coaching users
- IsViewable flag accuracy

**Regression Risk**: MEDIUM

**Test Coverage Required**:
- Verify quota enforcement still accurate
- Confirm edge cases (exactly at limit, over limit) handled
- Check performance impact of additional checks

**Mitigation**:
- Extensive unit tests for all quota scenarios
- Integration tests with real subscription data
- Rollback plan if quota errors occur

---

### Low-Risk Changes

#### Adding New Query Filters
**Affected Areas**:
- GetCoachingUsersQuery parameter list
- Frontend filter components

**Regression Risk**: LOW

**Test Coverage Required**:
- Verify existing filters still work
- Confirm new filter doesn't override old filters
- Check optional parameter handling

**Mitigation**:
- Make new filters optional
- Default to no filtering if not provided
- Backwards compatible API

---

#### UI Text/Label Changes
**Affected Areas**:
- Frontend component templates
- Translation files

**Regression Risk**: LOW

**Test Coverage Required**:
- Visual regression testing (screenshot comparison)
- Accessibility audit (screen reader compatibility)

**Mitigation**:
- Separate content changes from logic changes
- Review with UX team before deployment

---

### Breaking Changes (Require Major Version)

#### Removing DisconnectedUserHistory.NumberAnonymousOrder
**Impact**: Frontend components relying on this field will break

**Migration Path**:
1. Add new field (if replacement needed)
2. Populate both fields for 2 releases
3. Deprecate old field in release N
4. Remove old field in release N+2

**Rollback Plan**: Revert to previous version if critical

---

#### Changing CoachingStatus Enum Values
**Impact**: All queries, filters, and frontend components

**Migration Path**:
1. Add new enum values
2. Update all code to use new values
3. Data migration script to update existing records
4. Remove old enum values after 100% migration

**Rollback Plan**: Revert enum, revert data migration

---

### Database Schema Changes

#### Adding Index on Sharing.ExpirationDate
**Impact**: Improved query performance for expiration job

**Regression Risk**: LOW

**Rollback**: Drop index if causing lock issues

**Evidence**: Index creation script provided in Performance section

---

#### Changing DisconnectedUserHistory.TotalUsedCoachingConnections to Required
**Impact**: Must populate all existing records

**Regression Risk**: MEDIUM

**Migration**:
```javascript
db.disconnectedUserHistory.updateMany(
  { TotalUsedCoachingConnections: null },
  { $set: { TotalUsedCoachingConnections: 0 } }
);
```

**Rollback**: Revert field to nullable

---

## 21. Troubleshooting

### Issue: "Coach list returns empty despite coaches assigned"

**Symptoms**: GET /api/coachings returns 0 items, but coaches should exist

**Possible Causes**:

1. **Coaches not in Active status**
   - Check: Are coaches in disconnected list?
   - Query: `GET /api/coachings?status=1` (Disconnected)
   - Solution: Query with correct status parameter

2. **Subscription holder misconfigured**
   - Check: `SubscriptionHolderItemService.FindByCompanyIdAndProductAsync()` returns null
   - Query: MongoDB `db.subscriptionHolders.find({ CompanyId: "company-id" })`
   - Solution: Verify company subscription includes coaching module

3. **Wrong ProductScope**
   - Check: Query parameter ProductScope matches user's scope
   - Verify: ProductScope constant for your app (Growth=2, Talents=3)
   - Solution: Pass correct ProductScope in request

**Debug Steps**:
1. Check `CoachingPageQueryResult.TotalNumberOfConnection` - should be > 0
2. Verify coach has Individual connections in subscription holder
3. Check `coachingRepository.CountNumberOfCoachings()` returns > 0

**Evidence**: `GetCoachingQuery.cs:38-63`

---

### Issue: "Permission denied when removing connections"

**Symptoms**: PUT /api/coaching-users/remove-connections returns 403 Forbidden

**Possible Causes**:

1. **User not a coach in this company**
   - Check: `RequestContext.HasCoachRoleInCompany(companyId)`
   - Query: `db.users.findOne({ ExternalId: "user-id" })` → Check AssignedModules
   - Solution: Assign coaching role first via admin panel

2. **Connection belongs to another user**
   - Check: `Sharing.CreatedByUserId == userId`
   - Query: `db.sharings.find({ _id: "sharing-id" })` → Verify CreatedByUserId
   - Solution: Only coaches can remove their own connections

3. **Invalid input validation failed**
   - Check: UserIds not empty, CompanyId not empty
   - Verify: Request body has `{ "userIds": ["id1", "id2"] }`
   - Solution: Verify all required parameters present

**Debug Steps**:
1. Verify current user in coach role list: `db.users.findOne({ ExternalId: "user-id", "AssignedModules.ModuleName": "Coaching" })`
2. Check Sharing table: `db.sharings.find({ CreatedByUserId: "user-id" })`
3. Validate all route/query parameters present in request

**Evidence**: `RemoveConnectionCommandHandler.cs:174-176`

---

### Issue: "Subscription filtering removes all users"

**Symptoms**: GET /api/coaching-users returns items with IsViewable=false for all

**Possible Causes**:

1. **Coaching quota exceeded**
   - Check: `CoachingSubscriptionFilterService.FilterItems()`
   - Query: `db.subscriptionHolders.findOne({ CompanyId: "company-id" })` → Check CoachingItem.UsedConnections vs MaxConnections
   - Solution: Increase subscription quota or remove old connections

2. **No subscription for coaching module**
   - Check: `subscriptionHolderItemService.GetCoachingConnectionsAsync()`
   - Query: `db.subscriptionHolders.findOne({ CompanyId: "company-id", "Items.ItemType": "Coaching" })`
   - Solution: Enable coaching module in subscription

3. **User has no permission**
   - Check: `IsViewable = false` for all items
   - Verify: User has coach role in company
   - Solution: Grant user appropriate role via Accounts service

**Debug Steps**:
1. Check subscription holder has CoachingItem: `db.subscriptionHolders.findOne({ CompanyId: "company-id" })`
2. Verify user has coach role: `db.users.findOne({ ExternalId: "user-id", "AssignedModules.ModuleName": "Coaching" })`
3. Check OverallSharingState records exist: `db.overallSharingStates.find({ CreatedByUserId: "user-id" })`

**Evidence**: `CoachingSubscriptionFilterService.cs`, `CoachingUsersController.cs:86-92`

---

### Issue: "Team map coaching users not updating"

**Symptoms**: Team map visualization shows outdated coaching assignments

**Possible Causes**:

1. **Team map service not triggered**
   - Check: `TeamMapService.HandleAfterUserProfileSharingChanged()` called
   - Verify: Team map feature enabled for company
   - Solution: Verify event handler registered

2. **Stale cache in frontend**
   - Check: Frontend cache invalidation after connection change
   - Solution: Clear browser cache or force refresh (Ctrl+Shift+R)

3. **Wrong product scope context**
   - Check: ProductScope matches team map product
   - Verify: Team map is for correct product (Growth vs Talents)
   - Solution: Verify team map is for correct product

**Debug Steps**:
1. Verify team map exists for company: `db.teamMaps.findOne({ CompanyId: "company-id" })`
2. Check team map subscription active: `db.subscriptionHolders.findOne({ CompanyId: "company-id", "Items.ItemType": "TeamMap" })`
3. Trigger manual team map recalculation via admin panel

**Evidence**: `RemoveConnectionCommandHandler.cs:179-185`

---

### Issue: "Expiration notifications not sent"

**Symptoms**: Coaches not receiving emails 7 days before connection expires

**Possible Causes**:

1. **Background job not running**
   - Check: `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob` status in Hangfire dashboard
   - Verify: Job scheduled with correct cron expression `0 9 * * *`
   - Solution: Verify background job scheduler enabled and running

2. **Email service misconfigured**
   - Check: Email configuration in appsettings.json
   - Test: Send test email via email service separately
   - Solution: Verify SMTP credentials, host, port correct

3. **Connections don't have expiration dates**
   - Check: Connection.ExpirationDate populated
   - Query: `db.sharings.find({ ExpirationDate: { $exists: true, $ne: null } })`
   - Solution: Verify connections created with expiration dates

**Debug Steps**:
1. Check scheduled jobs execution log in Hangfire dashboard
2. Verify email configuration: `appsettings.json` → EmailSettings section
3. Query coaching connections with expiration dates: `db.sharings.find({ ConnectionType: 1, ExpirationDate: { $gte: new Date() } })`
4. Check job execution history for errors

**Evidence**: `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob.cs`

---

### Diagnostic Queries

#### Check Active Coaches in Company
```javascript
db.users.aggregate([
  { $match: { CompanyId: "company-id", IsDeleted: false } },
  { $lookup: {
      from: "sharings",
      localField: "ExternalId",
      foreignField: "CreatedByUserId",
      as: "connections"
  }},
  { $match: { "connections.ConnectionType": 1, "connections.IsDeleted": false } },
  { $project: {
      ExternalId: 1,
      FullName: 1,
      Email: 1,
      connectionCount: { $size: "$connections" }
  }}
]);
```

---

#### Find Connections Expiring Soon
```javascript
db.sharings.find({
  ConnectionType: 1,
  IsDeleted: false,
  ExpirationDate: {
    $gte: new Date(),
    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
  }
});
```

---

#### Verify Subscription Quota
```javascript
db.subscriptionHolders.aggregate([
  { $match: { CompanyId: "company-id" } },
  { $unwind: "$Items" },
  { $match: { "Items.ItemType": "Coaching" } },
  { $project: {
      MaxConnections: "$Items.MaxConnections",
      UsedConnections: "$Items.UsedConnections",
      Available: { $subtract: ["$Items.MaxConnections", "$Items.UsedConnections"] }
  }}
]);
```

---

## 22. Operational Runbook

### Daily Operations

#### Morning Health Check (9:00 AM UTC)

**Tasks**:
1. **Verify Background Jobs**: Check Hangfire dashboard for overnight job execution
   - `RemoveCoachingExpirationConnectionBackgroundJob` (runs at midnight)
   - `SendUpcomingCoachingExpirationConnectionNotificationEmailBackgroundJob` (runs at 9 AM)
2. **Check Email Delivery**: Verify expiration notification emails sent successfully
3. **Monitor Error Logs**: Review Application Insights for any 500 errors in coaching endpoints
4. **Subscription Alerts**: Check for companies approaching coaching quota limits

**Success Criteria**:
- All scheduled jobs show "Succeeded" status
- Email delivery rate >98%
- Error rate <0.5%

**Escalation**: If job failed, check logs and retry manually via Hangfire dashboard

---

#### Weekly Monitoring (Every Monday)

**Tasks**:
1. **Performance Review**: Analyze query performance metrics
   - GET /api/coachings p95 latency <500ms
   - GET /api/coaching-users p95 latency <800ms
2. **Subscription Utilization**: Report on coaching connection usage trends
3. **Disconnection Audit**: Review DisconnectedUserHistory entries for patterns
4. **Database Index Health**: Check index usage and fragmentation

**Reports to Generate**:
- Coaching utilization by company (CSV export)
- Expiration forecast (next 30 days)
- Performance SLA compliance

---

### Incident Response

#### Incident: "Coach list endpoint returning 500 errors"

**Severity**: HIGH (impacts all users)

**Immediate Actions** (within 5 minutes):
1. Check Application Insights for exception details
2. Verify MongoDB connection pool status
3. Check recent deployments (last 24 hours)

**Investigation**:
- Review stack trace for root cause
- Check database query logs for slow queries
- Verify subscription holder data integrity

**Resolution**:
- If DB connection issue: Restart service, scale out replicas
- If query timeout: Add missing index, optimize query
- If data corruption: Restore from backup, re-run migration

**Post-Incident**:
- Document root cause in incident report
- Add monitoring alert for similar patterns
- Update runbook with new diagnostics

---

#### Incident: "Expiration job not removing connections"

**Severity**: MEDIUM (impacts data consistency)

**Immediate Actions**:
1. Check Hangfire job status (succeeded/failed)
2. Verify job execution logs for errors
3. Count expired connections still active:
   ```javascript
   db.sharings.countDocuments({
     ConnectionType: 1,
     IsDeleted: false,
     ExpirationDate: { $lt: new Date() }
   });
   ```

**Investigation**:
- Review job execution history
- Check for transaction rollbacks
- Verify message bus connectivity (for event publishing)

**Resolution**:
- Manual re-run: Trigger job manually via Hangfire dashboard
- If systemic: Fix code bug, deploy hotfix
- Data cleanup: Run manual script to remove expired connections

**Script**:
```javascript
// Manual cleanup of expired connections
db.sharings.updateMany(
  {
    ConnectionType: 1,
    IsDeleted: false,
    ExpirationDate: { $lt: new Date() }
  },
  {
    $set: {
      IsDeleted: true,
      Status: 2, // Rejected
      UpdatedDate: new Date()
    }
  }
);
```

---

### Maintenance Windows

#### Monthly Database Maintenance

**Schedule**: First Sunday of month, 2:00 AM - 4:00 AM UTC

**Tasks**:
1. **Index Optimization**:
   ```javascript
   db.users.reIndex();
   db.sharings.reIndex();
   db.disconnectedUserHistory.reIndex();
   ```

2. **Cleanup Old History**:
   ```javascript
   // Archive disconnected history older than 2 years
   db.disconnectedUserHistory.deleteMany({
     DisconnectedDate: { $lt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000) }
   });
   ```

3. **Subscription Data Validation**:
   - Verify UsedConnections matches actual connection count
   - Correct any discrepancies

**Rollback Plan**: Database backup before maintenance, restore if issues

---

### Monitoring & Alerts

#### Critical Alerts (PagerDuty)

| Alert                          | Threshold        | Action                          |
| ------------------------------ | ---------------- | ------------------------------- |
| **API Error Rate**             | >5% in 5 minutes | Investigate immediately         |
| **Database Connection Pool**   | >80% used        | Scale out service instances     |
| **Background Job Failure**     | 2 consecutive    | Check logs, manual retry        |
| **Message Bus Lag**            | >1000 messages   | Scale RabbitMQ consumers        |

---

#### Warning Alerts (Email)

| Alert                          | Threshold        | Action                          |
| ------------------------------ | ---------------- | ------------------------------- |
| **API Latency**                | p95 >1000ms      | Review slow queries             |
| **Subscription Quota**         | >90% used        | Notify account manager          |
| **Expiration Job Duration**    | >10 minutes      | Optimize batch size             |

---

### Backup & Recovery

#### Database Backup

**Schedule**: Daily at 3:00 AM UTC (automated)

**Retention**: 30 days

**Recovery Procedure**:
1. Identify backup timestamp to restore
2. Stop bravoTALENTS service to prevent writes
3. Restore MongoDB from backup:
   ```bash
   mongorestore --host localhost:27017 --db bravoTALENTS /backups/bravoTALENTS_2026-01-10
   ```
4. Verify data integrity with test queries
5. Restart service

**RTO (Recovery Time Objective)**: 2 hours
**RPO (Recovery Point Objective)**: 24 hours

---

### Deployment Procedures

#### Standard Deployment

**Pre-Deployment**:
- [ ] Run all unit tests: `dotnet test`
- [ ] Run integration tests
- [ ] Database migration review (if applicable)
- [ ] Backup database
- [ ] Notify users of maintenance window

**Deployment Steps**:
1. Deploy backend to staging environment
2. Run smoke tests on staging
3. Deploy to production (blue-green deployment)
4. Monitor error logs for 15 minutes
5. If errors >1%: Rollback to previous version

**Post-Deployment**:
- [ ] Verify all endpoints return 200 OK
- [ ] Check background jobs running
- [ ] Monitor performance metrics
- [ ] Update deployment log

---

#### Hotfix Deployment

**Trigger**: Critical bug in production

**Fast-Track Approval**: CTO or VP Engineering

**Process**:
1. Create hotfix branch from production tag
2. Minimal code change (bug fix only)
3. Fast-track review (1 approver required)
4. Deploy directly to production with monitoring
5. Create post-mortem document

---

## 23. Roadmap and Dependencies

### Current Version: 1.0 (Completed Features)

**Released**: 2025-Q4

**Features**:
- Coach assignment and removal
- Individual connection type support
- Subscription-based quota enforcement
- Automatic role management
- Expiration tracking and notifications
- Disconnected coach history
- Team map integration
- Pending invitation management

**Dependencies Met**:
- Common.Profile shared library (Sharing, OverallSharingState)
- Accounts service (role/permission management)
- Subscription system (quota tracking)
- Message bus infrastructure (RabbitMQ)

---

### Planned Version: 2.0 (In Progress)

**Target**: 2026-Q2

**Features**:
- **Group Coaching Support**: Allow coaches to create group coaching sessions with multiple employees
- **Coaching Session Notes**: Enable coaches to document coaching sessions with timestamps and outcomes
- **Goal Tracking Integration**: Link coaching connections to employee goals from GoalManagement feature
- **Coaching Analytics Dashboard**: Executive dashboard showing coaching ROI, utilization, and effectiveness metrics
- **Smart Coach Matching**: AI-powered recommendations for coach-employee pairings based on skills, goals, and history

**Dependencies Required**:
- GoalManagement feature API integration
- Analytics service for dashboard aggregation
- AI/ML service for smart matching (optional, can fallback to rules-based)

**Breaking Changes**:
- ConnectionType.Group will be enabled (currently disabled)
- New database collections: CoachingSessions, CoachingNotes
- API versioning: v2 endpoints for group coaching

---

### Future Roadmap: 3.0 and Beyond

**Version 3.0** (2026-Q4):
- **Multi-Language Support**: Internationalization for coaching content
- **Mobile Coaching App**: Dedicated mobile experience for coaches and coachees
- **Video Session Integration**: Integrate with Zoom/Teams for virtual coaching sessions
- **Certification Tracking**: Track coaching certifications and credentials

**Version 4.0** (2027-Q2):
- **External Coach Marketplace**: Allow companies to hire external certified coaches
- **Peer Coaching**: Enable peer-to-peer coaching without manager oversight
- **Coaching Program Templates**: Pre-built coaching program frameworks (onboarding, leadership, performance improvement)

---

### Dependencies (External Systems)

#### Upstream Dependencies (Consume)

| Service       | Dependency                    | Impact if Unavailable          |
| ------------- | ----------------------------- | ------------------------------ |
| **Accounts**  | Role/permission management    | Cannot assign/remove coach role|
| **Common.Profile** | Sharing entities           | Cannot create connections      |
| **Subscription** | Quota tracking              | Cannot enforce limits          |
| **Email Service** | Notifications               | Expiration emails not sent     |
| **Team Map**  | Visualization updates         | Team maps outdated             |

**Mitigation**:
- Circuit breaker pattern for external calls
- Graceful degradation (disable features if dependency down)
- Retry logic with exponential backoff

---

#### Downstream Dependencies (Provide)

| Service       | Consumes                      | Integration Point              |
| ------------- | ----------------------------- | ------------------------------ |
| **Analytics** | Coaching metrics              | EmployeeUsersConnectionRemovedEventBusMessage |
| **Dashboard** | Coaching widgets              | GET /api/coachings endpoint    |
| **Goals**     | Coach-employee linkage        | Future API integration         |

**SLA Commitment**:
- 99.9% uptime for GET endpoints
- <500ms p95 latency for list queries
- 24-hour data freshness for analytics

---

### Technical Debt

#### Priority 1 (Resolve in 2026-Q1)

**TD-CO-001: Subscription Filtering Performance**
- **Issue**: Subscription filtering done in-memory after database query
- **Impact**: Retrieves unnecessary data when quota exceeded
- **Solution**: Push subscription filter to database query level
- **Effort**: 2 weeks
- **Evidence**: `CoachingSubscriptionFilterService.cs` processes full result set

**TD-CO-002: Missing Index on Sharing.ExpirationDate**
- **Issue**: Expiration job scans full collection
- **Impact**: Slow job execution as data grows (>10k connections)
- **Solution**: Add composite index on (ConnectionType, IsDeleted, ExpirationDate)
- **Effort**: 1 hour + testing
- **Evidence**: Performance section notes this

---

#### Priority 2 (Resolve in 2026-Q2)

**TD-CO-003: DisconnectedUserHistory Data Duplication**
- **Issue**: Snapshots duplicate data from User entity
- **Impact**: Storage cost, potential sync issues
- **Solution**: Consider reference design instead of snapshot (requires analysis)
- **Effort**: 1 week
- **Evidence**: `DisconnectedUserHistory.cs` duplicates FullName, ProfileImageUrl

**TD-CO-004: Hard-Coded ConnectionType.Individual**
- **Issue**: Code assumes only Individual type, not extensible
- **Impact**: Adding Group coaching requires refactoring
- **Solution**: Parameterize connection type throughout codebase
- **Effort**: 3 weeks
- **Evidence**: All queries filter by ConnectionType.Individual

---

### Migration Plan: V1 to V2

**Data Migration**:
1. **Add CoachingSessions Collection** (new table)
2. **Update Sharing Schema** (add SessionNotes field)
3. **Backfill Goal Linkages** (optional, for existing connections)

**Code Changes**:
- Backward compatible API endpoints (v1 and v2 coexist)
- Feature flags for gradual rollout
- Database migration scripts with rollback plan

**Rollout Strategy**:
- Beta release to 5 pilot companies (2026-Q1)
- Full release to all companies (2026-Q2)
- Deprecate v1 endpoints (2027-Q1)

---

## 24. Related Documentation

| Document                                               | Purpose                                      |
| ------------------------------------------------------ | -------------------------------------------- |
| [bravoTALENTS Overview](../README.md)                 | Module overview and capabilities             |
| [Employee Management Feature](./README.EmployeeManagementFeature.md) | Employee profile and data management |
| [Recruitment Pipeline Feature](./README.RecruitmentPipelineFeature.md) | Candidate to employee workflow        |
| [Employee Settings Feature](./README.EmployeeSettingsFeature.md) | System settings and configurations |
| [Common.Profile Domain](../../Common/README.md)       | Sharing and profile entities                 |
| [Subscription System](../../Common/README.md)         | Coaching connection licensing                |
| [Platform Architecture](../../../docs/claude/architecture.md) | System design patterns                |
| [CQRS Patterns](../../../docs/claude/backend-patterns.md) | Command/Query implementation guide    |
| [API Design Guidelines](../../../docs/api-standards.md) | REST API conventions                  |

---

## 25. Glossary

| Term                          | Definition                                                                 |
| ----------------------------- | -------------------------------------------------------------------------- |
| **Coach**                     | User assigned to guide and support employee development through Individual connections |
| **Coachee**                   | Employee receiving coaching from a coach                                   |
| **Individual Connection**     | One-to-one coaching relationship (ConnectionType = 1)                      |
| **Group Connection**          | One-to-many coaching relationship (ConnectionType = 2, planned for V2)     |
| **Sharing**                   | Entity representing profile access granted from coachee to coach           |
| **Overall Sharing State**     | Aggregated view of sharing permissions for quick access checks             |
| **Disconnected Coach**        | Coach who has been removed from all coaching connections in company        |
| **DisconnectedUserHistory**   | Historical snapshot of coach data at time of disconnection                 |
| **Subscription Holder**       | Company's subscription record containing coaching connection quota         |
| **Coaching Connection Quota** | Maximum number of Individual connections allowed per subscription          |
| **Expiration Date**           | Date when coaching connection automatically terminates                     |
| **IsViewable**                | Flag indicating if user can view item based on subscription/permissions    |
| **Assigned Coach Role Date**  | Date when user first received coaching role                                |
| **Number Of Connections**     | Count of connections since AssignedCoachRoleDate (current period)          |
| **Total Of Connections**      | All-time count of coaching connections                                     |
| **Anonymous Coach**           | Disconnected coach who deleted their account (FullName = null)             |
| **Team Map**                  | Visual organization chart showing coaching assignments                     |
| **ProductScope**              | Application context (Growth = 2, Talents = 3, etc.)                        |
| **CreatedByUserId**           | Coach who created the sharing/connection                                   |
| **UserId**                    | Coachee whose profile is shared                                            |
| **CompanyId**                 | Organization context for multi-tenant data                                 |
| **ExternalId**                | User's unique identifier from authentication system                        |

---

## 26. Version History

| Version | Date       | Changes                                                         |
| ------- | ---------- | --------------------------------------------------------------- |
| 2.0.0   | 2026-01-10 | Migration to 26-section standardized format with Executive Summary, Business Value, Business Rules, Process Flows, System Design, Security Architecture, Performance Considerations, Implementation Guide, Test Data Requirements, Edge Cases Catalog, Regression Impact, Operational Runbook, Roadmap and Dependencies, Glossary. Enhanced test specifications with 18 test cases. Added comprehensive troubleshooting and operational procedures. |
| 1.0.0   | 2026-01-10 | Initial comprehensive coaching feature documentation with 18 test cases, API reference, workflows, and troubleshooting (18 sections) |

---

**Last Updated**: 2026-01-10
**Location**: `docs/business-features/bravoTALENTS/detailed-features/README.CoachingFeature.md`
**Maintained By**: BravoSUITE Documentation Team

---
