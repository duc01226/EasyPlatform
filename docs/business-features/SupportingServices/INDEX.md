# Supporting Services Documentation Index

**Quick navigation guide for Supporting Services documentation**

---

## Service Navigation

### 1. NotificationMessage Service
**Managing in-app and push notifications**

- **Overview**: User notification management and device registration
- **Key Features**:
  - [Send Push Notification](#11-send-push-notification)
  - [Mark Notification as Read](#12-mark-notification-as-read)
  - [Delete Notification](#13-delete-notification)
  - [Register Receiver Device](#14-register-receiver-device)
  - [Check Device Registration](#15-check-device-registration)
  - [Remove Device Registration](#16-remove-device-registration)
  - [Get In-App Messages](#17-get-in-app-messages)

- **API Base Path**: `/api/notification` and `/api/notification-receiver`
- **Technology**: .NET 8, CQRS, Entity Event Bus
- **Key Entities**: NotificationMessageEntity, NotificationMessageReceiverDeviceEntity

---

### 2. ParserApi Service
**Resume/CV parsing from files and websites**

- **Overview**: Extract structured data from LinkedIn profiles and PDF resumes
- **Key Features**:
  - [Parse LinkedIn HTML Profile](#21-parse-linkedin-html-profile)
  - [Parse LinkedIn PDF Resume](#22-parse-linkedin-pdf-resume)

- **API Paths**: `/api/importHtml2Json`, `/api/importPdf2Json`
- **Technology**: Python 3, Django, PDF/HTML parsing libraries
- **Integration**: Called by CandidateApp for resume import

---

### 3. PermissionProvider Service
**Subscription and access control management**

- **Overview**: Subscription lifecycle, user policies, roles, and permissions
- **Key Features**:
  - [Create Subscription](#31-create-subscription)
  - [Upgrade Subscription](#32-upgrade-subscription)
  - [Cancel Subscription](#33-cancel-subscription)
  - [Activate/Deactivate Subscription](#34-activatedeactivate-subscription)
  - [Reinstate Subscription](#35-reinstate-subscription)
  - [Change Payment Card](#36-change-payment-card)
  - [Pay Invoice](#37-pay-invoice)
  - [Get Subscription Details](#38-get-subscription-details)
  - [Check Subscription Existence](#39-check-subscription-existence)
  - [Get User Policies](#310-get-user-policies)
  - [Set User Roles](#311-set-user-roles)
  - [Sync User Policies](#312-sync-user-policies)
  - [Get Accessible Subscription Packages](#313-get-accessible-subscription-packages)
  - [Get Subscription Overview](#314-get-subscription-overview)
  - [Get Company Subscriptions Map](#315-get-company-subscriptions-map)

- **API Base Path**: `/api/subscription`, `/api/user-policy`
- **Technology**: .NET 8, CQRS, Entity Framework
- **Key Entities**: Subscription, SubscriptionPackage, UserPolicy, Role, Period
- **Authentication**: IdentityServer required

---

### 4. CandidateApp Service
**Candidate self-service profile and application management**

- **Overview**: Applicant profile, CV management, job applications, and document storage
- **Key Features**:
  - [Get/Update Applicant Profile](#41-getupdate-applicant-profile)
  - [Refresh/Add Applicant with CV](#42-refreshadd-applicant-with-cv)
  - [Set Language Configuration](#43-set-language-configuration)
  - [Get Applications](#44-get-applications)
  - [Create Application](#45-create-application)
  - [Submit Application](#46-submit-application)
  - [Update Application](#47-update-application)
  - [Delete Application](#48-delete-application)
  - [Get Applied Jobs](#49-get-applied-jobs)
  - [Get Job List](#410-get-job-list)
  - [Manage CV Profile](#411-manage-cv-profile)
  - [Add Education](#412-add-education)
  - [Add Work Experience](#413-add-work-experience)
  - [Add Skills](#414-add-skills)
  - [Add Certifications](#415-add-certifications)
  - [Manage Attachments](#416-manage-attachments)
  - [Mark CV Completion Tasks](#417-mark-cv-completion-tasks)

- **API Base Paths**: `/api/applicant`, `/api/application`, `/api/job`, `/api/curriculum-vitae`, `/api/education`, `/api/work-experience`, `/api/skill`, `/api/certification`, `/api/attachments`
- **Technology**: .NET 8, CQRS, OData, File Storage
- **Key Controllers** (12+): ApplicantController, ApplicationController, JobController, and more
- **Event Integration**: ApplicantChangedEventBusMessage, ApplicationSubmittedEventBusMessage

---

### 5. CandidateHub Service
**Candidate aggregation, matching, and scoring**

- **Overview**: Candidate data aggregation from multiple sources with job matching and scoring
- **Key Features**:
  - [Get Job Matching Scores](#51-get-job-matching-scores)
  - [Get Candidates Score](#52-get-candidates-score)
  - [Get Candidates by IDs](#53-get-candidates-by-ids)
  - [Search Candidates](#54-search-candidates)
  - [Get Matched Candidates for Job](#55-get-matched-candidates-for-job)
  - [Get Candidate CV](#56-get-candidate-cv)
  - [Import Candidates from CandidateApp](#57-import-candidates-from-candidateapp)
  - [Import Candidates from Vip24](#58-import-candidates-from-vip24)
  - [Update Candidate Vip24 Profiles Daily](#59-update-candidate-vip24-profiles-daily)
  - [Update Candidate Vip24 Profiles Weekly](#510-update-candidate-vip24-profiles-weekly)
  - [Update Candidate Privacy Settings](#511-update-candidate-privacy-settings)

- **API Base Path**: `/api/candidates`
- **Technology**: .NET 8, CQRS, Memory Caching, Basic Authentication
- **Key Queries**: GetJobMatchingScoresQuery, GetMatchedCandidatesQuery, SearchCandidatesQuery, GetCandidateScoreQuery
- **Data Sources**: CandidateApp, Vip24, internal hub database
- **Caching**: Memory cache with configurable TTL (hours)

---

## API Quick Reference

### NotificationMessage
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notification/push-notification` | POST | Send notification |
| `/api/notification/mark-as-read-notification/{id}` | PUT | Mark single as read |
| `/api/notification/mark-as-read-many-notifications` | PUT | Mark multiple as read |
| `/api/notification/delete-notification/{id}` | DELETE | Delete single |
| `/api/notification/delete-many-notifications` | DELETE | Delete multiple |
| `/api/notification-receiver/save-receiver-device` | POST | Register device |
| `/api/notification-receiver/check-receiver-device-existing` | GET | Check device exists |
| `/api/notification-receiver/delete-receiver-device/{token}` | DELETE | Unregister device |
| `/api/notification-receiver/get-in-app-message` | GET | Get all messages |
| `/api/notification-receiver/get-in-app-message/{appId}` | GET | Get by app |

### ParserApi
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/importHtml2Json` | POST | Parse HTML profile |
| `/api/importPdf2Json` | POST | Parse PDF resume |

### PermissionProvider
| Category | Endpoints | Count |
|----------|-----------|-------|
| Subscription Management | CREATE, READ, UPDATE, DELETE, UPGRADE, CANCEL, ACTIVATE, DEACTIVATE, REINSTATE | 9 |
| Payment Management | CHANGE CARD, PAY INVOICE | 2 |
| User Policy | GET, SET ROLES, SYNC | 4 |
| Information Queries | DETAILS, EXISTENCE, OVERVIEW, COMPANY MAP, PACKAGES | 5 |

### CandidateApp
| Resource | Operations | Status |
|----------|-----------|--------|
| Applicant | GET with CVs, PUT update, refresh from source | Documented |
| Application | GET list, POST create, PUT update, DELETE | Documented |
| Job | GET list, GET applied | Documented |
| CV | Create, edit, delete, duplicate | Documented |
| Education | POST, PUT, DELETE | Documented |
| Work Experience | POST, PUT, DELETE | Documented |
| Skills | POST, PUT, DELETE | Documented |
| Certifications | POST, PUT, DELETE | Documented |
| Attachments | GET (download), POST (upload), DELETE | Documented |

### CandidateHub
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/candidates/get-job-matching-scores` | POST | Calculate match scores |
| `/api/candidates/get-candidates-score` | POST | Score candidates |
| `/api/candidates/get-candidates-by-ids` | POST | Get by ID batch |
| `/api/candidates/search` | POST | Full-text search |
| `/api/candidates/import-candidates-from-cv-app` | GET | Sync from app |
| `/api/candidates/schedule-candidate-daily` | PUT | Daily sync job |
| `/api/candidates/schedule-candidates-weekly` | PUT | Weekly sync job |
| `/api/candidates/update-candidates-privacy-setting` | PUT | Update privacy |

---

## Integration Patterns

### Service-to-Service Communication

**Event Bus** (Asynchronous)
- `ApplicantChangedEventBusMessage` - CandidateApp → other services
- `ApplicationSubmittedEventBusMessage` - CandidateApp → employer module
- `NotificationMessageEventBusMessage` - NotificationMessage → delivery systems

**Direct API Calls** (Synchronous)
- CandidateApp → ParserApi (resume parsing)
- CandidateHub → CandidateApp (candidate import)
- Services → PermissionProvider (access verification)

**Scheduled Jobs** (Background)
- CandidateHub daily/weekly Vip24 sync
- NotificationMessage cleanup
- Permission cache refresh

---

## Common Workflows

### Candidate Registration & Profile Import
1. User registers in CandidateApp
2. Selects resume import source (LinkedIn/PDF)
3. System calls ParserApi for parsing
4. Parsed data stored in applicant/CV records
5. ApplicantChangedEventBusMessage broadcast
6. CandidateHub imports updated profile

### Job Application Submission
1. Applicant creates application in CandidateApp
2. Selects CV and fills application form
3. Applicant submits application
4. ApplicationSubmittedEventBusMessage broadcast
5. NotificationMessage sends employer notification
6. Employer module records application

### Candidate Search & Matching
1. Recruiter requests job matching
2. CandidateHub receives query
3. Checks memory cache by query hash
4. If miss: calculates scores, caches result
5. Returns ranked candidates with scores
6. Recruiter can drill into candidate details via CandidateApp

### Subscription Management
1. Company admin initiates subscription purchase
2. PermissionProvider creates subscription
3. Sets up billing schedule
4. Provisions features based on package
5. Updates user policies for team members
6. Weekly: SyncAllUserPoliciesCommand reconciles state

---

## Cross-Service Data Flow

```
External Systems (LinkedIn, Vip24)
    ↓
ParserApi → CandidateApp (parsed profiles)
    ↓
CandidateApp (applicant/CV records)
    ↓↘
    ↓ EventBus: ApplicantChanged
    ↓ DirectAPI: Import
CandidateHub (aggregated candidates)
    ↓
Recruiter Searches/Matches (job matching)

NotificationMessage Service (independent)
- Receives notifications from all services
- Manages device registrations
- Delivers push notifications

PermissionProvider Service (independent)
- Manages subscription lifecycle
- Controls feature access
- Maintains user roles/policies
```

---

## Key Architectural Decisions

1. **Async-First**: Event bus for non-blocking inter-service communication
2. **Caching**: Memory caches with TTL for frequently accessed data (job scores, policies)
3. **Eventual Consistency**: Services sync periodically rather than real-time locks
4. **API Gateway Pattern**: Each service has own REST API, no shared dependencies
5. **CQRS Pattern**: Commands for writes, Queries for reads in most services
6. **Tenancy**: All services enforce company-level isolation for multi-tenant security

---

## Documentation Maintenance

**How to Update This Documentation**

When making changes to supporting services:

1. **API Changes**: Update corresponding section in README.md
2. **New Features**: Add feature subsection under service section
3. **Workflow Changes**: Update workflow step descriptions
4. **Integration Changes**: Update integration patterns section
5. **Version This Doc**: Tag version with service release

**Review Frequency**: Quarterly or per major release

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [Supporting Services README](./README.md) | Complete detailed documentation |
| [API Reference](./API-REFERENCE.md) | Comprehensive API endpoints for all services |
| [Troubleshooting Guide](./TROUBLESHOOTING.md) | Common issues, debugging, and FAQ |
| [Architecture Overview](#overview) | High-level service overview |
| [NotificationMessage Details](#1-notificationmessage-service) | Notifications section |
| [ParserApi Details](#2-parserapi-service) | Resume parsing section |
| [PermissionProvider Details](#3-permissionprovider-service) | Subscriptions & access control section |
| [CandidateApp Details](#4-candidateapp-service) | Applicant profile section |
| [CandidateHub Details](#5-candidatehub-service) | Candidate matching section |

---

## Documentation Structure

```
SupportingServices/
├── README.md                 # Overview of all 5 services (1071 lines)
├── INDEX.md                  # Navigation guide (this file)
├── API-REFERENCE.md          # Detailed API endpoints, request/response examples
├── TROUBLESHOOTING.md        # Common issues, debugging steps, FAQ
└── detailed-features/        # Detailed feature implementations and delivery summaries
    └── DELIVERY_SUMMARY.txt  # Comprehensive documentation delivery report
```

### Using These Documents

1. **First Time?** Start with [INDEX.md](#quick-links) (this file) for navigation
2. **Need API Details?** See [API-REFERENCE.md](./API-REFERENCE.md) for complete endpoint documentation
3. **Having Issues?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for debugging steps
4. **Full Context?** Read [README.md](./README.md) for comprehensive service descriptions
5. **Detailed Feature Info?** See [detailed-features/DELIVERY_SUMMARY.txt](./detailed-features/DELIVERY_SUMMARY.txt) for comprehensive feature inventory and documentation metrics

---

## Detailed Features Directory

The `detailed-features/` subdirectory contains in-depth documentation about feature implementations and documentation delivery metrics.

### Contents

| File | Purpose |
|------|---------|
| [DELIVERY_SUMMARY.txt](./detailed-features/DELIVERY_SUMMARY.txt) | Complete inventory of 52+ documented features across 5 supporting services, including feature descriptions, API routes, integration patterns, and quality metrics |

### Key Information in DELIVERY_SUMMARY.txt

- **Feature Count**: 52+ features across all supporting services
- **API Routes**: 80+ documented REST endpoints
- **Service Breakdown**:
  - NotificationMessage: 7 features, 10 endpoints
  - ParserApi: 2 features, 2 endpoints
  - PermissionProvider: 15 features, 28+ endpoints
  - CandidateApp: 17 features, 30+ endpoints
  - CandidateHub: 11 features, 10+ endpoints
- **Documentation Quality**: 95% API coverage, validated against source code
- **Standards Applied**: OpenAPI conventions, clean Markdown formatting, cross-service references

---

## Cross-References Between Documents

### From README.md to API-REFERENCE.md
- Feature descriptions in README → API endpoint details in API-REFERENCE
- Example: Section 1.1 "Send Push Notification" → `POST /api/notification/push-notification` in API-REFERENCE

### From API-REFERENCE.md to TROUBLESHOOTING.md
- API error responses → Troubleshooting solutions
- Example: 422 error from ParserApi → "Resume Parsing Fails with 422 Error" in TROUBLESHOOTING

### From TROUBLESHOOTING.md to API-REFERENCE.md
- Debugging steps reference API endpoints
- Example: "Check Device Registration" → `GET /api/notification-receiver/check-receiver-device-existing`

---

**Last Updated**: 2025-12-31
**Documentation Version**: 1.0
**Maintenance**: Quarterly review or per major release
