# Test Specifications Priority Index

> Quick reference for test prioritization by severity level

---

## Priority Legend

| Priority | Level | SLA | Automation |
|----------|-------|-----|------------|
| **P0** | Critical | Block release if failing | Must be automated |
| **P1** | High | Fix within sprint | Should be automated |
| **P2** | Medium | Fix within 2 sprints | Consider automation |
| **P3** | Low | Backlog | Manual acceptable |

---

## P0 - Critical (Security & Data Integrity)

> **Release Blocker** - Must pass before any deployment

### Authentication & Authorization

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ACC-AUTH-001 | Valid User Login | Accounts | `LoginCommand.cs` |
| TC-ACC-AUTH-002 | Invalid Credentials Rejection | Accounts | `LoginCommand.cs` |
| TC-ACC-AUTH-003 | Account Lockout After Failed Attempts | Accounts | `LoginAttemptTracker.cs` |
| TC-ACC-AUTH-004 | JWT Token Validation | Accounts | `TokenService.cs` |
| TC-ACC-AUTH-005 | Token Refresh Flow | Accounts | `RefreshTokenCommand.cs` |
| TC-ACC-AUTH-006 | Session Timeout Enforcement | Accounts | `SessionManager.cs` |

### Password Security

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ACC-PWD-001 | Password Strength Validation | Accounts | `PasswordValidator.cs` |
| TC-ACC-PWD-002 | Password Reset Flow | Accounts | `ResetPasswordCommand.cs` |
| TC-ACC-PWD-003 | Password Expiry Enforcement | Accounts | `PasswordPolicy.cs` |
| TC-ACC-PWD-004 | Password History Prevention | Accounts | `PasswordHistoryService.cs` |

### Two-Factor Authentication

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ACC-2FA-001 | 2FA Setup Flow | Accounts | `Setup2FACommand.cs` |
| TC-ACC-2FA-002 | 2FA Code Validation | Accounts | `Verify2FACommand.cs` |
| TC-ACC-2FA-003 | 2FA Bypass Prevention | Accounts | `2FAMiddleware.cs` |
| TC-ACC-2FA-004 | Recovery Code Usage | Accounts | `RecoveryCodeService.cs` |

### Multi-Tenancy Data Isolation

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ACC-TEN-001 | Company Data Isolation | Accounts | `OfCompanyExpr()` |
| TC-ACC-TEN-002 | Cross-Tenant Access Prevention | Accounts | Repository filters |
| TC-ACC-TEN-003 | Tenant Context Propagation | All | `RequestContext` |
| TC-INT-TEN-001 | End-to-End Tenant Isolation | Integration | All repositories |

### Permission Enforcement

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-INT-PER-001 | Permission Cache Sync | Integration | `PermissionCacheManager.cs` |
| TC-ACC-ROL-001 | Role-Based Access Control | Accounts | `PlatformAuthorize` |

---

## P1 - High (Core Business Workflows)

> **Sprint Priority** - Critical business functionality

### bravoTALENTS - Recruitment

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-TAL-CAN-001 | Create Candidate | bravoTALENTS | `SaveCandidateCommand.cs` |
| TC-TAL-CAN-002 | Update Candidate | bravoTALENTS | `SaveCandidateCommand.cs` |
| TC-TAL-CAN-003 | Candidate Pipeline Movement | bravoTALENTS | `MoveCandidateStageCommand.cs` |
| TC-TAL-CAN-004 | Candidate Search | bravoTALENTS | `SearchCandidatesQuery.cs` |
| TC-TAL-JOB-001 | Create Job Posting | bravoTALENTS | `SaveJobCommand.cs` |
| TC-TAL-JOB-002 | Publish Job to Board | bravoTALENTS | `PublishJobCommand.cs` |
| TC-TAL-JOB-003 | Close Job Position | bravoTALENTS | `CloseJobCommand.cs` |
| TC-TAL-INT-001 | Schedule Interview | bravoTALENTS | `ScheduleInterviewCommand.cs` |
| TC-TAL-INT-002 | Submit Interview Feedback | bravoTALENTS | `SubmitFeedbackCommand.cs` |
| TC-TAL-OFF-001 | Create Offer | bravoTALENTS | `CreateOfferCommand.cs` |
| TC-TAL-OFF-002 | Accept/Reject Offer | bravoTALENTS | `UpdateOfferStatusCommand.cs` |
| TC-INT-EMP-001 | Candidate Hired → Employee | Integration | Event handlers |

### bravoGROWTH - Performance

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-GRO-GOL-001 | Create Goal | bravoGROWTH | `SaveGoalCommand.cs` |
| TC-GRO-GOL-002 | Update Goal Progress | bravoGROWTH | `UpdateGoalProgressCommand.cs` |
| TC-GRO-GOL-003 | Complete Goal | bravoGROWTH | `CompleteGoalCommand.cs` |
| TC-GRO-OBJ-001 | Create Objective | bravoGROWTH | `SaveObjectiveCommand.cs` |
| TC-GRO-OBJ-002 | Objective Rollup Calculation | bravoGROWTH | `CalculateObjectiveProgressCommand.cs` |
| TC-GRO-CHK-001 | Create Check-In | bravoGROWTH | `SaveCheckInCommand.cs` |
| TC-GRO-CHK-002 | Submit Check-In | bravoGROWTH | `SubmitCheckInCommand.cs` |
| TC-GRO-REV-001 | Create Review Cycle | bravoGROWTH | `CreateReviewCycleCommand.cs` |
| TC-GRO-REV-002 | Submit Self-Assessment | bravoGROWTH | `SubmitSelfAssessmentCommand.cs` |
| TC-GRO-REV-003 | Manager Review Submission | bravoGROWTH | `SubmitManagerReviewCommand.cs` |
| TC-INT-GOL-001 | Goal Completion → Analytics | Integration | Event handlers |

### bravoSURVEYS - Feedback

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-SUR-SUR-001 | Create Survey | bravoSURVEYS | `SaveSurveyCommand.cs` |
| TC-SUR-SUR-002 | Add Questions to Survey | bravoSURVEYS | `AddQuestionCommand.cs` |
| TC-SUR-SUR-003 | Publish Survey | bravoSURVEYS | `PublishSurveyCommand.cs` |
| TC-SUR-DIS-001 | Distribute to Employees | bravoSURVEYS | `DistributeSurveyCommand.cs` |
| TC-SUR-RES-001 | Submit Response | bravoSURVEYS | `SubmitResponseCommand.cs` |
| TC-SUR-RES-002 | Anonymous Response Handling | bravoSURVEYS | `AnonymityService.cs` |
| TC-SUR-ANA-001 | Response Aggregation | bravoSURVEYS | `AggregateResponsesQuery.cs` |
| TC-INT-SUR-001 | Survey Response → Analytics | Integration | Event handlers |

### Notifications

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-NOT-DEL-001 | Email Notification Delivery | NotificationMessage | `SendEmailCommand.cs` |
| TC-NOT-DEL-002 | Push Notification Delivery | NotificationMessage | `SendPushCommand.cs` |
| TC-NOT-PRF-001 | Respect User Preferences | NotificationMessage | `PreferenceService.cs` |
| TC-INT-NOT-001 | Cross-Service Notification | Integration | Message consumers |

---

## P2 - Medium (Secondary Features)

> **Quality Enhancement** - Important but not blocking

### Search & Filtering

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-TAL-FIL-001 | Candidate Filter by Status | bravoTALENTS | Query handlers |
| TC-TAL-FIL-002 | Job Filter by Department | bravoTALENTS | Query handlers |
| TC-GRO-FIL-001 | Goal Filter by Period | bravoGROWTH | Query handlers |
| TC-SUR-FIL-001 | Survey Filter by Status | bravoSURVEYS | Query handlers |

### Sorting & Pagination

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ALL-PAG-001 | List Pagination | All | `PageBy()` extension |
| TC-ALL-SRT-001 | Multi-Column Sorting | All | `OrderBy()` chains |

### bravoINSIGHTS - Analytics

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-INS-DSH-001 | Create Dashboard | bravoINSIGHTS | `SaveDashboardCommand.cs` |
| TC-INS-TIL-001 | Add Tile to Dashboard | bravoINSIGHTS | `AddTileCommand.cs` |
| TC-INS-TIL-002 | Configure Tile Data Source | bravoINSIGHTS | `ConfigureTileCommand.cs` |
| TC-INS-DAT-001 | Data Source Query Execution | bravoINSIGHTS | `ExecuteQueryCommand.cs` |
| TC-INS-EXP-001 | Export Dashboard to PDF | bravoINSIGHTS | `ExportDashboardCommand.cs` |

### Resume Parsing

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-PAR-RES-001 | Parse PDF Resume | ParserApi | `ParseResumeCommand.cs` |
| TC-PAR-RES-002 | Extract Contact Info | ParserApi | `ContactExtractor.cs` |
| TC-PAR-RES-003 | Extract Work Experience | ParserApi | `ExperienceExtractor.cs` |

---

## P3 - Low (UI Enhancements)

> **Nice-to-Have** - Visual and UX improvements

### UI Preferences

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ALL-PRF-001 | Save Column Preferences | All | `UserPreferenceService.cs` |
| TC-ALL-PRF-002 | Remember Filter State | All | Local storage |
| TC-ALL-PRF-003 | Default Page Size | All | User settings |

### Theme & Styling

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ALL-THM-001 | Theme Toggle | All | Frontend components |
| TC-ALL-THM-002 | Custom Branding | All | Company settings |

### Tooltips & Help

| Test ID | Test Name | Module | Evidence |
|---------|-----------|--------|----------|
| TC-ALL-HLP-001 | Field Tooltips Display | All | UI components |
| TC-ALL-HLP-002 | Help Link Navigation | All | Documentation links |

---

## Test Count Summary

| Priority | Count | Automation Status |
|----------|-------|-------------------|
| P0 - Critical | ~20 | Required |
| P1 - High | ~40 | Recommended |
| P2 - Medium | ~25 | Optional |
| P3 - Low | ~10 | Manual |
| **Total** | **~95** | |

---

## Regression Test Suite

### Smoke Test (P0 only) - ~10 min
Run before every deployment:
- Authentication flow
- Multi-tenant isolation
- Permission check

### Sanity Test (P0 + P1 critical) - ~30 min
Run daily on staging:
- All P0 tests
- Core CRUD operations per module

### Full Regression (All priorities) - ~2 hours
Run weekly or before major releases:
- All automated tests
- Manual verification of P3 items

---

## Document Maintenance

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-30 | Initial priority index |

---

*Generated for BravoSUITE v2.0 - Enterprise HR & Talent Management Platform*
