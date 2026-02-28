# bravoGROWTH Documentation Index

> Complete documentation set for bravoGROWTH Performance & OKR Management Module

---

## Quick Navigation

### Main Documentation
- **[README.md](README.md)** - Complete module documentation
  - 6 major sub-modules
  - 43+ features with workflows
  - 1000+ lines of comprehensive content

### Specialized Guides
- **[API-REFERENCE.md](API-REFERENCE.md)** - REST API reference
  - 40+ endpoint documentation
  - Request/response examples
  - Error handling guide
  - Controller-specific references

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Issue resolution guide
  - 20+ common issues
  - Detailed solutions
  - Best practices
  - FAQ section

### Detailed Features
- **[detailed-features/README.GoalManagementFeature.md](detailed-features/README.GoalManagementFeature.md)** - Goal Management deep dive
  - Complete Goal Management (OKR) feature documentation
  - Comprehensive workflows and use cases
  - Data models and API integration patterns

- **[detailed-features/README.KudosFeature.md](detailed-features/README.KudosFeature.md)** - Kudos Peer Recognition deep dive
  - Complete Kudos/peer recognition feature documentation
  - Microsoft Teams plugin integration
  - Social engagement (reactions, comments) v1.1.0
  - Configuration and deployment guides

---

## Documentation by Audience

### For Developers
1. Read: [README.md](README.md#architecture) - Architecture Overview
2. Reference: [API-REFERENCE.md](API-REFERENCE.md) - All endpoints
3. Deep dive: [README.md](README.md#sub-modules--feature-architecture) - Feature details
4. Troubleshoot: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

### For Product Owners
1. Overview: [README.md](README.md#overview) - Module Overview
2. Features: [README.md](README.md#sub-modules--feature-architecture) - All features
3. Workflows: [README.md](README.md#common-workflows) - Business flows
4. Help: [TROUBLESHOOTING.md](TROUBLESHOOTING.md#faq) - FAQ

### For Business Analysts
1. Module: [README.md](README.md) - Complete documentation
2. Features: [README.md](README.md#sub-modules--feature-architecture) - Feature details
3. Workflows: [README.md](README.md#common-workflows) - Example workflows
4. Authorization: [README.md](README.md#user-roles--permissions) - Role matrix

### For Support/Operations
1. Quick reference: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Start here
2. Features: [README.md](README.md) - Feature catalog
3. Workflows: [README.md](README.md#common-workflows) - User journeys
4. FAQ: [TROUBLESHOOTING.md](TROUBLESHOOTING.md#faq) - Quick answers

---

## Documentation Content Summary

| File | Focus | Use For |
|------|-------|---------|
| README.md | Complete module documentation | Everything |
| API-REFERENCE.md | API endpoints and integration | Development & integration |
| TROUBLESHOOTING.md | Issue resolution | Support & troubleshooting |
| **TOTAL** | **All aspects** | **Reference** |

---

## Module Coverage (in README.md)

### Sub-Modules
1. **Goal Management (OKR)** - 6 features
2. **Check-In Management** - 7 features
3. **Performance Review** - 8 features
4. **Time & Attendance Management** - 10 features
5. **Form Templates** - 6 features
6. **Kudos Management** - 6 features (v1.1.0 with social engagement)

---

## Key Features Documented

- **43+ core features** with complete workflows
- **53+ REST API endpoints** with examples
- **8 end-to-end workflows** from goal setting to review
- **28+ troubleshooting issues** with solutions
- **5 user roles** with permission matrices
- **18 dashboard views** across roles
- **Integration patterns** with other services
- **Microsoft Teams plugin** for Kudos peer recognition

---

## How to Use This Documentation

### By Task
- **"I want to create a goal"** → README.md → Goal Management → Create/Edit Goal
- **"I want to schedule a check-in"** → README.md → Check-In Management → Schedule Check-In Series
- **"I want to run a performance review"** → README.md → Performance Review → Create Performance Review Event
- **"I have an error"** → TROUBLESHOOTING.md → Find your error
- **"I need an API endpoint"** → API-REFERENCE.md → Find endpoint

### By Role
- **Developer** → Start with [API-REFERENCE.md](API-REFERENCE.md)
- **Product Owner** → Start with [README.md Overview](README.md#overview)
- **Business Analyst** → Start with [README.md Features](README.md#sub-modules--feature-architecture)
- **Support Staff** → Start with [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### By Problem
- **Technical issue** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md) → Category → Issue → Solution
- **Feature question** → [README.md](README.md) → Module → Feature → Workflow
- **API question** → [API-REFERENCE.md](API-REFERENCE.md) → Controller → Endpoint → Example
- **Best practice** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#best-practices) → Best Practices

---

## Quick API Reference

### Goal Controller
```
POST   /api/goal                              Save Goal
GET    /api/goal/by-id                        Get Goal Detail
POST   /api/goal/update-goal-current-value    Update Progress
GET    /api/goal/get-goal-list                List Employee Goals
POST   /api/goal/delete                       Delete Goals
GET    /api/goal/dashboard-*                  Various Dashboards
```

### Check-In Controller
```
POST   /api/checkin                           Save Check-In
GET    /api/checkin                           List Check-Ins
GET    /api/checkin/{id}                      Get Check-In Detail
POST   /api/checkin/update                    Update Check-In
POST   /api/checkin/update-status             Update Status
POST   /api/checkin/delete                    Delete Check-In
GET    /api/checkin/dashboard-*               Various Dashboards
```

### Performance Review Controller
```
POST   /api/performancereview/save-event                    Create Event
GET    /api/performancereview/{eventId}                     Get Event Detail
POST   /api/performancereview/assessment/answer-assessment  Answer Assessment
GET    /api/performancereview/events                        List Events
GET    /api/performancereview/assessment/get-calibration-session  Calibration
```

### TimeSheet Controller
```
GET    /api/timesheet/time-sheet-cycle                      Get Cycles
POST   /api/timesheet                                       Get Employee Logs
POST   /api/timesheet/add-time-log-for-employee             Add Time Log
GET    /api/timesheet/get-setting-of-current-company        Get Settings
POST   /api/timesheet/save-setting                          Save Settings
POST   /api/timesheet/export-file                           Export Data
POST   /api/timesheet/import-from-file                      Import Data
```

### Form Template Controller
```
GET    /api/formtemplate                     List Templates
POST   /api/formtemplate                     Save Template
POST   /api/formtemplate/clone               Clone Template
POST   /api/formtemplate/delete              Delete Template
```

### Kudos Controller
```
POST   /api/Kudos/send                       Send Kudos
GET    /api/Kudos/quota                      Get User Quota
GET    /api/Kudos/me                         Get Current User Profile
POST   /api/Kudos/history                    Get Personal History
POST   /api/Kudos/leaderboard                Get Leaderboard
POST   /api/Kudos/list                       Admin: Get All Transactions
POST   /api/Kudos/reaction-transaction       React to Transaction (v1.1.0)
POST   /api/Kudos/comment-transaction        Comment on Transaction (v1.1.0)
POST   /api/Kudos/reaction-comment           React to Comment (v1.1.0)
```

---

## Feature Comparison

| Feature | Complexity | Users | API Endpoints |
|---------|-----------|-------|---|
| Goal CRUD | Medium | Employees, Managers | 5 |
| Check-In Scheduling | Medium | Managers | 4 |
| Check-In Dashboard | High | Managers, HR | 4 |
| Performance Review Cycle | High | HR, Managers, Employees | 25+ |
| Assessment Completion | Medium | Reviewers | 4 |
| Timesheet Management | Medium | Employees, Managers | 10+ |
| Leave Requests | Medium | Employees, Managers | 5+ |
| Form Templates | Low | HR Admins | 6 |
| Kudos Send/History | Medium | All Employees | 10 |
| Kudos Social Engagement | Medium | All Employees | 3 |
| Kudos Admin Dashboard | Low | HR, Admins | 2 |

---

## Document Quality Metrics

✅ 1000+ lines of comprehensive documentation
✅ 43+ features fully documented
✅ 53+ API endpoints with examples
✅ 28+ troubleshooting issues covered
✅ 8 complete workflows documented
✅ Multiple audience perspectives
✅ Cross-referenced and linked
✅ Version dated and maintained
✅ Teams plugin documentation included

---

## Related Documentation

- **Backend Patterns:** See `docs/claude/backend-patterns.md` for CQRS, Repository, and Validation patterns
- **Frontend Patterns:** See `docs/claude/frontend-patterns.md` for Component and Store patterns
- **System Architecture:** See `docs/claude/architecture.md` for authorization policy details
- **bravoTALENTS Module:** See `docs/business-features/bravoTALENTS/` for recruitment module docs
- **bravoSURVEYS Module:** See `docs/business-features/bravoSURVEYS/` for surveys module docs

---

## Detailed Features List

### Goal Management (1. section)
- 1.1 Create/Edit Goal
- 1.2 View Goal List
- 1.3 Update Goal Progress
- 1.4 Goal Visibility & Sharing
- 1.5 Goal Dashboard & Reporting
- 1.6 Delete Goals

### Check-In Management (2. section)
- 2.1 Schedule Check-In Series
- 2.2 Create One-Time Check-In
- 2.3 Update Check-In Status
- 2.4 Record Check-In Notes
- 2.5 View Check-In History
- 2.6 Check-In Dashboard
- 2.7 Delete Check-In

### Performance Review (3. section)
- 3.1 Create Performance Review Event
- 3.2 Add Participants to Review
- 3.3 Answer Performance Assessment
- 3.4 Final Assessment & Feedback
- 3.5 Calibration Session
- 3.6 View Performance Review Event
- 3.7 Export Review Results
- 3.8 Delete Performance Review Event

### Time & Attendance Management (4. section)
- 4.1 View Timesheet
- 4.2 Add Time Log for Employee
- 4.3 Configure Timesheet Settings
- 4.4 Submit Timesheet for Approval
- 4.5 Request Leave
- 4.6 Request Attendance Exception
- 4.7 View/Manage Working Shifts
- 4.8 Holiday and Day-off Management
- 4.9 Timesheet Export & Reporting
- 4.10 Bulk Import Timesheet

### Form Templates (5. section)
- 5.1 Create Form Template
- 5.2 Clone Form Template
- 5.3 Edit Form Questions
- 5.4 Reorder Questions & Sections
- 5.5 Manage Template Status
- 5.6 Delete Form Template

### Kudos Management (6. section)
- 6.1 Send Kudos
- 6.2 View Kudos Feed
- 6.3 View Personal History
- 6.4 View Leaderboard
- 6.5 React to Kudos (v1.1.0)
- 6.6 Comment on Kudos (v1.1.0)

---

## Tips for Using This Documentation

1. **For Feature Understanding:** Start with the module overview, then read specific feature sections in README.md
2. **For API Integration:** Jump to [API-REFERENCE.md](API-REFERENCE.md) or feature sections with Backend API details
3. **For Workflow Design:** See [Common Workflows](README.md#common-workflows) section and individual feature workflow steps
4. **For Security Review:** Check [User Roles & Permissions](README.md#user-roles--permissions) and authorization policies
5. **For Database Design:** Reference [Key Data Models](README.md#key-data-models) for entity structures
6. **For Frontend Development:** Look at feature descriptions and workflow steps for UI/UX requirements

---

## Contact & Updates

This documentation is maintained as part of the bravoGROWTH module documentation. For updates or corrections:

1. Review corresponding source code in `src/Services/bravoGROWTH/`
2. Check recent commits for recent changes
3. Coordinate with BravoSUITE technical team for major updates

---

**Last Updated:** 2025-12-31
**Maintained By:** Documentation Team
**Version Control:** Git repository `docs/business-features/bravoGROWTH/`
