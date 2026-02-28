# BravoSUITE Business Features

> Comprehensive enterprise HR & Talent Management platform with integrated recruitment, performance management, surveys, and analytics modules

---

## Detailed Module Documentation

For comprehensive feature specifications with API references, component names, and business workflows, see the detailed documentation:

| Module | Description | Detailed Docs |
|--------|-------------|---------------|
| **bravoTALENTS** | Recruitment & Applicant Tracking | [View Details](./business-features/bravoTALENTS/README.md) |
| **bravoGROWTH** | Performance, Goals & Time Management | [View Details](./business-features/bravoGROWTH/README.md) |
| **bravoSURVEYS** | Survey & Feedback Platform | [View Details](./business-features/bravoSURVEYS/README.md) |
| **bravoINSIGHTS** | Analytics & Business Intelligence | [View Details](./business-features/bravoINSIGHTS/README.md) |
| **Accounts** | Identity & Multi-tenancy | [View Details](./business-features/Accounts/README.md) |
| **Supporting Services** | Notifications, Parser, Permissions | [View Details](./business-features/SupportingServices/README.md) |

---

## Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture Diagrams](#system-architecture-diagrams)
   - [Complete System Overview](#complete-system-overview)
   - [bravoTALENTS Architecture](#bravotalents-architecture)
   - [bravoGROWTH Architecture](#bravogrowth-architecture)
   - [bravoSURVEYS Architecture](#bravosurveys-architecture)
   - [Accounts & Supporting Services](#accounts--supporting-services-architecture)
   - [Frontend Architecture](#frontend-architecture-diagram)
   - [Data Flow & User Journeys](#data-flow--user-journeys)
3. [Core Business Modules](#core-business-modules)
   - [bravoTALENTS - Recruitment & ATS](#bravotalents---recruitment--ats)
   - [bravoGROWTH - Performance & OKR Management](#bravogrowth---performance--okr-management)
   - [bravoSURVEYS - Survey & Feedback Platform](#bravosurveys---survey--feedback-platform)
   - [bravoINSIGHTS - Analytics & Business Intelligence](#bravoinsights---analytics--business-intelligence)
4. [Supporting Services](#supporting-services)
   - [Accounts - Identity & Multi-tenancy](#accounts---identity--multi-tenancy)
   - [CandidateApp & CandidateHub](#candidateapp--candidatehub)
   - [NotificationMessage - Communication Hub](#notificationmessage---communication-hub)
   - [ParserApi - Document Processing](#parserapi---document-processing)
   - [PermissionProvider - Authorization Service](#permissionprovider---authorization-service)
5. [Frontend Applications](#frontend-applications)
6. [Cross-Service Integration](#cross-service-integration)
7. [Integration Architecture](#integration-architecture)

---

## System Overview

**BravoSUITE** is an enterprise-grade HR & Talent Management platform built on:

| Layer | Technology | Description |
|-------|------------|-------------|
| **Backend** | .NET 8 Microservices | Clean Architecture, CQRS pattern |
| **Frontend** | Angular 19 (WebV2) + Angular 12 (Web) | Nx monorepo with micro-frontends |
| **Framework** | Easy.Platform | Custom platform providing base infrastructure |
| **Communication** | RabbitMQ | Cross-service event-driven messaging |
| **Data Storage** | MongoDB, SQL Server, PostgreSQL | Multi-database per service |
| **Caching** | Redis | Distributed caching |

### Architecture Principles

- **Multi-tenancy**: Company-based isolation with subscription tiers
- **Event-driven**: 18 producers, 178 consumers for cross-service sync
- **Clean Architecture**: Domain → Application → Infrastructure → Service layers
- **CQRS**: Commands and Queries separated for scalability

---

## System Architecture Diagrams

### Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BRAVOSUITE PLATFORM                                       │
│                         Enterprise HR & Talent Management System                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │   End Users     │
                                    │ ┌─────┐ ┌─────┐ │
                                    │ │ HR  │ │ Emp │ │
                                    │ └─────┘ └─────┘ │
                                    │ ┌─────┐ ┌─────┐ │
                                    │ │Cand │ │Admin│ │
                                    │ └─────┘ └─────┘ │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
    ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
    │   ANGULAR 19 (WebV2)  │  │   ANGULAR 12 (Web)    │  │   CANDIDATE PORTAL    │
    │  ┌─────────────────┐  │  │  ┌─────────────────┐  │  │  ┌─────────────────┐  │
    │  │ growth-company  │  │  │  │ bravoTALENTS    │  │  │  │ CandidateApp    │  │
    │  │ employee-portal │  │  │  │ bravoSURVEYS    │  │  │  │ (Self-Service)  │  │
    │  │ notification    │  │  │  │ Client Apps     │  │  │  │                 │  │
    │  └─────────────────┘  │  │  └─────────────────┘  │  │  └─────────────────┘  │
    └───────────┬───────────┘  └───────────┬───────────┘  └───────────┬───────────┘
                │                          │                          │
                └──────────────────────────┼──────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API GATEWAY / LOAD BALANCER                               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
         ┌─────────────┬─────────────┬─────┴─────┬─────────────┬─────────────┐
         │             │             │           │             │             │
         ▼             ▼             ▼           ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│             │ │             │ │             │ │             │ │             │ │             │
│  ACCOUNTS   │ │bravoTALENTS │ │ bravoGROWTH │ │bravoSURVEYS │ │bravoINSIGHTS│ │  SUPPORT    │
│             │ │             │ │             │ │             │ │             │ │  SERVICES   │
│ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │
│ │  Auth   │ │ │ │Candidate│ │ │ │  Goals  │ │ │ │ Survey  │ │ │ │Analytics│ │ │ │ Parser  │ │
│ │  Users  │ │ │ │  Jobs   │ │ │ │ Review  │ │ │ │ Design  │ │ │ │ Reports │ │ │ │  API    │ │
│ │ Company │ │ │ │Interview│ │ │ │Check-in │ │ │ │ Results │ │ │ │Dashboard│ │ │ │Notif.   │ │
│ │  Roles  │ │ │ │  Offer  │ │ │ │  Time   │ │ │ │Schedule │ │ │ │ Metrics │ │ │ │Permiss. │ │
│ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │
│             │ │             │ │             │ │             │ │             │ │             │
│  .NET 8     │ │  .NET 8     │ │  .NET 8     │ │  .NET 8     │ │  .NET 8     │ │  .NET 8     │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │               │               │
       └───────────────┴───────────────┴───────┬───────┴───────────────┴───────────────┘
                                               │
                                               ▼
                            ┌─────────────────────────────────────┐
                            │           MESSAGE BUS               │
                            │            RabbitMQ                 │
                            │  ┌─────────────────────────────┐    │
                            │  │  18 Producers │ 178 Consumers│   │
                            │  └─────────────────────────────┘    │
                            └──────────────────┬──────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
          ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
          │    MongoDB      │        │   SQL Server    │        │   PostgreSQL    │
          │  (bravoSURVEYS) │        │  (Accounts,     │        │  (bravoGROWTH)  │
          │                 │        │   bravoTALENTS) │        │                 │
          └─────────────────┘        └─────────────────┘        └─────────────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │      Redis      │
                                      │   (Caching)     │
                                      └─────────────────┘
```

---

### bravoTALENTS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            bravoTALENTS - Recruitment & ATS                          │
│                     Applicant Tracking System & Talent Management                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────────┐
                              │    External Users    │
                              │  ┌──────┐ ┌──────┐   │
                              │  │Recrui│ │Hiring│   │
                              │  │ ters │ │ Mgrs │   │
                              │  └──────┘ └──────┘   │
                              └──────────┬───────────┘
                                         │
┌────────────────────────────────────────┼────────────────────────────────────────────┐
│                                        │                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           SERVICE LAYER (.NET 8)                               │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │ │
│  │  │ Candidate   │ │    Job      │ │  Employee   │ │   Email     │ │ Setting  │  │ │
│  │  │  Service    │ │   Service   │ │   Service   │ │  Service    │ │ Service  │  │ │
│  │  │ Controller  │ │ Controller  │ │ Controller  │ │ Controller  │ │Controller│  │ │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └────┬─────┘  │ │
│  └─────────┼───────────────┼───────────────┼───────────────┼────────────┼────────┘ │
│            │               │               │               │            │          │
│  ┌─────────┼───────────────┼───────────────┼───────────────┼────────────┼────────┐ │
│  │         │    APPLICATION LAYER (CQRS Commands & Queries)│            │        │ │
│  │         ▼               ▼               ▼               ▼            ▼        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │ │
│  │  │ UseCases:   │ │ UseCases:   │ │ UseCases:   │ │ UseCases:   │ │UseCases: │ │ │
│  │  │ •Create     │ │ •CreateJob  │ │ •Sync       │ │ •SendBulk   │ │•JobBoard │ │ │
│  │  │ •Update     │ │ •Publish    │ │ •Import     │ │ •Templates  │ │•Configure│ │ │
│  │  │ •Search     │ │ •Close      │ │ •Onboard    │ │ •Track      │ │•Integrate│ │ │
│  │  │ •Interview  │ │ •Archive    │ │ •Invite     │ │ •Schedule   │ │          │ │ │
│  │  │ •Offer      │ │ •Clone      │ │             │ │             │ │          │ │ │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └────┬─────┘ │ │
│  └─────────┼───────────────┼───────────────┼───────────────┼────────────┼────────┘ │
│            │               │               │               │            │          │
│  ┌─────────┼───────────────┼───────────────┼───────────────┼────────────┼────────┐ │
│  │         ▼               ▼               ▼               ▼            ▼        │ │
│  │                          DOMAIN LAYER (Entities)                              │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────────────┐  │  │ │
│  │  │  │ Candidate │   │    Job    │   │ Employee  │   │   JobBoardConfig  │  │  │ │
│  │  │  │ •Profile  │   │ •Posting  │   │ •Record   │   │   •ITViec         │  │  │ │
│  │  │  │ •Resume   │   │ •Template │   │ •Dept     │   │   •LinkedIn       │  │  │ │
│  │  │  │ •Status   │   │ •Pipeline │   │ •Position │   │   •VietnamWorks   │  │  │ │
│  │  │  └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   │   •TopCV          │  │  │ │
│  │  │        │               │               │         └───────────────────┘  │  │ │
│  │  │        ▼               ▼               ▼                                │  │ │
│  │  │  ┌───────────┐   ┌───────────┐   ┌───────────┐                          │  │ │
│  │  │  │Application│   │ Interview │   │   Offer   │                          │  │ │
│  │  │  │ •Apply    │   │ •Schedule │   │ •Letter   │                          │  │ │
│  │  │  │ •Screen   │   │ •Feedback │   │ •Approve  │                          │  │ │
│  │  │  │ •Track    │   │ •Panel    │   │ •Accept   │                          │  │ │
│  │  │  └───────────┘   └───────────┘   └───────────┘                          │  │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        MESSAGE BUS INTEGRATION                                │  │
│  │  Producers:                          Consumers:                               │  │
│  │  • EmployeeEntityEventBus            • AccountUserEvents                      │  │
│  │  • InvitationEntityEventBus          • CompanySettingsEvents                  │  │
│  │  • InterviewScheduleEventBus         • PermissionUpdates                      │  │
│  │  • JobAccessRightEventBus                                                     │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                          │
│                                         ▼                                          │
│                              ┌─────────────────────┐                               │
│                              │     SQL Server      │                               │
│                              │   bravoTALENTS DB   │                               │
│                              └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │           EXTERNAL INTEGRATIONS             │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
                    │  │ ITViec  │ │LinkedIn │ │VietWorks│        │
                    │  │   API   │ │   API   │ │   API   │        │
                    │  └─────────┘ └─────────┘ └─────────┘        │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
                    │  │  TopCV  │ │ Calendar│ │ParserAPI│        │
                    │  │   API   │ │ (Google)│ │(Resume) │        │
                    │  └─────────┘ └─────────┘ └─────────┘        │
                    └─────────────────────────────────────────────┘
```

#### Recruitment Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              RECRUITMENT PIPELINE                                         │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
  │ SOURCED │ ───▶ │ APPLIED │ ───▶ │SCREENING│ ───▶ │INTERVIEW│ ───▶ │  OFFER  │
  └────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘
       │                │                │                │                │
       ▼                ▼                ▼                ▼                ▼
  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
  │•Job     │      │•Resume  │      │•Phone   │      │•Round 1 │      │•Generate│
  │ Boards  │      │ Parse   │      │ Screen  │      │•Round 2 │      │•Approve │
  │•Referral│      │•Auto    │      │•Qualify │      │•Panel   │      │•Send    │
  │•Direct  │      │ Match   │      │•Score   │      │•Tech    │      │•Negotiate│
  │•Import  │      │•Notify  │      │•Advance │      │•HR      │      │•Accept  │
  └─────────┘      └─────────┘      └─────────┘      └─────────┘      └─────────┘
                                                                            │
                                                                            ▼
                                                                      ┌─────────┐
                                                                      │  HIRED  │
                                                                      │•Onboard │
                                                                      │•Account │
                                                                      │•Employee│
                                                                      └─────────┘
```

---

### bravoGROWTH Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         bravoGROWTH - Performance & OKR                              │
│                    Goal Management, Reviews, Check-ins, Time                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────────┐
                              │       Users          │
                              │  ┌──────┐ ┌──────┐   │
                              │  │Employ│ │Manage│   │
                              │  │  ee  │ │  r   │   │
                              │  └──────┘ └──────┘   │
                              └──────────┬───────────┘
                                         │
┌────────────────────────────────────────┼────────────────────────────────────────────┐
│                                        ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                        Growth.Service (Controllers)                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│  │  │    Goal     │  │  Review     │  │  Check-In   │  │    Time     │            │ │
│  │  │ Controller  │  │ Controller  │  │ Controller  │  │ Controller  │            │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │ │
│  └─────────┼────────────────┼────────────────┼────────────────┼───────────────────┘ │
│            │                │                │                │                     │
│  ┌─────────┼────────────────┼────────────────┼────────────────┼───────────────────┐ │
│  │         ▼                ▼                ▼                ▼                   │ │
│  │                    Growth.Application (CQRS)                                   │ │
│  │                                                                                │ │
│  │    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐     │ │
│  │    │  GOAL MANAGEMENT  │    │ PERFORMANCE REVIEW│    │   CHECK-IN        │     │ │
│  │    │ ┌───────────────┐ │    │ ┌───────────────┐ │    │ ┌───────────────┐ │     │ │
│  │    │ │CreateGoal     │ │    │ │CreateReview   │ │    │ │ScheduleCheckIn│ │     │ │
│  │    │ │UpdateProgress │ │    │ │SubmitFeedback │ │    │ │RecordNotes    │ │     │ │
│  │    │ │AlignGoal      │ │    │ │ApprovePeriod  │ │    │ │CompleteItems  │ │     │ │
│  │    │ │ArchiveGoal    │ │    │ │Calibrate      │ │    │ │SetReminders   │ │     │ │
│  │    │ │GetGoalTree    │ │    │ │GenerateReport │ │    │ │GetHistory     │ │     │ │
│  │    │ └───────────────┘ │    │ └───────────────┘ │    │ └───────────────┘ │     │ │
│  │    └───────────────────┘    └───────────────────┘    └───────────────────┘     │ │
│  │                                                                                │ │
│  │    ┌───────────────────┐    ┌───────────────────┐                              │ │
│  │    │  TIME MANAGEMENT  │    │   FORM TEMPLATE   │                              │ │
│  │    │ ┌───────────────┐ │    │ ┌───────────────┐ │                              │ │
│  │    │ │RequestLeave   │ │    │ │CreateTemplate │ │                              │ │
│  │    │ │ApproveTime    │ │    │ │ConfigureFields│ │                              │ │
│  │    │ │LogHours       │ │    │ │CloneTemplate  │ │                              │ │
│  │    │ │GetBalance     │ │    │ │VersionControl │ │                              │ │
│  │    │ └───────────────┘ │    │ └───────────────┘ │                              │ │
│  │    └───────────────────┘    └───────────────────┘                              │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                           │
│  ┌──────────────────────────────────────┼─────────────────────────────────────────┐ │
│  │                      Growth.Domain (Entities)                                  │ │
│  │                                      │                                         │ │
│  │   ┌──────────────┐  ┌──────────────┐ │ ┌──────────────┐  ┌──────────────┐      │ │
│  │   │     Goal     │  │   Review     │ │ │  CheckIn     │  │ FormTemplate │      │ │
│  │   │  ┌────────┐  │  │  ┌────────┐  │ │ │  ┌────────┐  │  │  ┌────────┐  │      │ │
│  │   │  │Objectiv│  │  │  │ Cycle  │  │ │ │  │ Event  │  │  │  │ Field  │  │      │ │
│  │   │  │KeyResul│  │  │  │ Event  │  │ │ │  │ Note   │  │  │  │ Logic  │  │      │ │
│  │   │  │Progress│  │  │  │Calendar│  │ │ │  │ Action │  │  │  │Version │  │      │ │
│  │   │  │Alignmnt│  │  │  │Feedback│  │ │ │  │Reminder│  │  │  │Questns │  │      │ │
│  │   │  └────────┘  │  │  └────────┘  │ │ │  └────────┘  │  │  └────────┘  │      │ │
│  │   └──────────────┘  └──────────────┘ │ └──────────────┘  └──────────────┘      │ │
│  │                                      │                                         │ │
│  │   ┌──────────────┐  ┌──────────────┐ │                                         │ │
│  │   │TimeManagement│  │  HistoryLog  │ │                                         │ │
│  │   │  ┌────────┐  │  │  ┌────────┐  │ │                                         │ │
│  │   │  │ Leave  │  │  │  │ Audit  │  │ │                                         │ │
│  │   │  │Timesheet│  │  │  │Changes │  │ │                                         │ │
│  │   │  │Schedule │  │  │  │History │  │ │                                         │ │
│  │   │  │Overtime │  │  │  └────────┘  │ │                                         │ │
│  │   │  └────────┘  │  └──────────────┘ │                                         │ │
│  │   └──────────────┘                   │                                         │ │
│  └──────────────────────────────────────┼─────────────────────────────────────────┘ │
│                                         │                                           │
│                                         ▼                                           │
│                              ┌─────────────────────┐                                │
│                              │    PostgreSQL       │                                │
│                              │   bravoGROWTH DB    │                                │
│                              └─────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### OKR Goal Hierarchy

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                OKR GOAL HIERARCHY                                         │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────────┐
                              │     COMPANY GOALS       │
                              │    (Vision & Mission)   │
                              │  ┌─────────────────────┐│
                              │  │ "Become #1 HR Tech" ││
                              │  └─────────────────────┘│
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
          ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
          │ DEPARTMENT GOAL │    │ DEPARTMENT GOAL │    │ DEPARTMENT GOAL │
          │   Engineering   │    │     Sales       │    │      HR         │
          │ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
          │ │"Ship 10 new"│ │    │ │"100 new     │ │    │ │"Hire 50 new│ │
          │ │ features/Q  │ │    │ │ customers"  │ │    │ │ employees" │ │
          │ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
          └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
                   │                      │                      │
         ┌─────────┴─────────┐            │            ┌─────────┴─────────┐
         │                   │            │            │                   │
         ▼                   ▼            ▼            ▼                   ▼
   ┌───────────┐       ┌───────────┐ ┌───────────┐ ┌───────────┐    ┌───────────┐
   │TEAM GOAL  │       │TEAM GOAL  │ │TEAM GOAL  │ │TEAM GOAL  │    │TEAM GOAL  │
   │ Backend   │       │ Frontend  │ │  APAC     │ │Recruiting │    │ Training  │
   │┌─────────┐│       │┌─────────┐│ │┌─────────┐│ │┌─────────┐│    │┌─────────┐│
   ││"5 APIs" ││       ││"3 UIs"  ││ ││"50 deals││ ││"30 hires││    ││"10 progs││
   │└─────────┘│       │└─────────┘│ │└─────────┘│ │└─────────┘│    │└─────────┘│
   └─────┬─────┘       └─────┬─────┘ └───────────┘ └─────┬─────┘    └───────────┘
         │                   │                           │
    ┌────┴────┐         ┌────┴────┐                 ┌────┴────┐
    ▼         ▼         ▼         ▼                 ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        ┌───────┐ ┌───────┐
│INDIV. │ │INDIV. │ │INDIV. │ │INDIV. │        │INDIV. │ │INDIV. │
│ Goal  │ │ Goal  │ │ Goal  │ │ Goal  │        │ Goal  │ │ Goal  │
│ John  │ │ Jane  │ │ Alex  │ │ Sara  │        │ Mike  │ │ Emma  │
└───────┘ └───────┘ └───────┘ └───────┘        └───────┘ └───────┘
```

#### Performance Review Cycle

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             PERFORMANCE REVIEW CYCLE                                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
   │  SETUP  │ ──▶ │  SELF   │ ──▶ │ MANAGER │ ──▶ │CALIBRATE│ ──▶ │ FINALIZE│
   │  CYCLE  │     │ REVIEW  │     │ REVIEW  │     │         │     │         │
   └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
        │               │               │               │               │
        ▼               ▼               ▼               ▼               ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
   │•Define  │     │•Complete│     │•Review  │     │•Compare │     │•Publish │
   │ Period  │     │ Self    │     │ Goals   │     │ Ratings │     │ Results │
   │•Assign  │     │ Assess  │     │•Rate    │     │•Adjust  │     │•Notify  │
   │ Template│     │•Submit  │     │ Perform │     │ Curves  │     │ Employee│
   │•Set     │     │         │     │•Comment │     │•Ensure  │     │•Archive │
   │ Deadline│     │         │     │         │     │ Fair    │     │         │
   └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                                        │
                                                                        ▼
                                                        ┌───────────────────────┐
                                                        │   360 FEEDBACK        │
                                                        │  (Optional Round)     │
                                                        │  • Peer Reviews       │
                                                        │  • Skip-level         │
                                                        │  • Surveys            │
                                                        └───────────────────────┘
```

---

### bravoSURVEYS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         bravoSURVEYS - Survey Platform                               │
│                     (Learning Platform - Surveys & Assessments)                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────────┐
                              │    Survey Users      │
                              │  ┌──────┐ ┌──────┐   │
                              │  │Admin │ │Respond│  │
                              │  │      │ │ ent  │   │
                              │  └──────┘ └──────┘   │
                              └──────────┬───────────┘
                                         │
┌────────────────────────────────────────┼────────────────────────────────────────────┐
│                                        ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                  LearningPlatform.Service (API)                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│  │  │   Survey    │  │  Question   │  │ Respondent  │  │   Report    │            │ │
│  │  │ Controller  │  │ Controller  │  │ Controller  │  │ Controller  │            │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │ │
│  └─────────┼────────────────┼────────────────┼────────────────┼───────────────────┘ │
│            │                │                │                │                     │
│  ┌─────────┼────────────────┼────────────────┼────────────────┼───────────────────┐ │
│  │         ▼                ▼                ▼                ▼                   │ │
│  │                LearningPlatform.Application                                    │ │
│  │                                                                                │ │
│  │  ┌───────────────────────────────────────────────────────────────────────┐     │ │
│  │  │                        SURVEY DESIGN                                  │     │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │ │
│  │  │  │CreateSurvey │  │AddQuestion  │  │ConfigLogic  │  │SetTemplate  │   │     │ │
│  │  │  │CloneSurvey  │  │UseLibrary   │  │SetBranching │  │Preview      │   │     │ │
│  │  │  │Publish      │  │ConfigTypes  │  │SetPiping    │  │Translate    │   │     │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │     │ │
│  │  └───────────────────────────────────────────────────────────────────────┘     │ │
│  │                                                                                │ │
│  │  ┌───────────────────────────────────────────────────────────────────────┐     │ │
│  │  │                     RESPONDENT & EXECUTION                            │     │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │ │
│  │  │  │AddResponden │  │ScheduleSend │  │TrackRespons │  │SendReminder │   │     │ │
│  │  │  │ImportBulk   │  │SetDeadline  │  │CollectData  │  │AnonymizeOpt │   │     │ │
│  │  │  │GroupManage  │  │AutoDistrib  │  │ValidateInput│  │CloseWindow  │   │     │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │     │ │
│  │  └───────────────────────────────────────────────────────────────────────┘     │ │
│  │                                                                                │ │
│  │  ┌───────────────────────────────────────────────────────────────────────┐     │ │
│  │  │                      RESULTS & REPORTING                              │     │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │ │
│  │  │  │AggregateRes │  │SegmentData  │  │ExportPDF    │  │BuildDashbrd │   │     │ │
│  │  │  │AnalyzeTrend │  │CompareGroup │  │ExportExcel  │  │CustomReport │   │     │ │
│  │  │  │CalcNPS      │  │FilterResult │  │ScheduleRep  │  │ShareAccess  │   │     │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │     │ │
│  │  └───────────────────────────────────────────────────────────────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                           │
│  ┌──────────────────────────────────────┼─────────────────────────────────────────┐ │
│  │                  LearningPlatform.Domain                                       │ │
│  │                                      │                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                          SURVEY DESIGN                                   │  │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │ │
│  │  │  │  Survey  │  │ Question │  │ Question │  │  Survey  │  │  Logic   │    │  │ │
│  │  │  │          │  │          │  │ Library  │  │ Template │  │  Rules   │    │  │ │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │ │
│  │  └──────────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                                │ │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                        RESPONDENTS                                       │  │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │  │ │
│  │  │  │Respondent│  │ Respond  │  │ Contacts │  │  Access  │                  │  │ │
│  │  │  │          │  │  Group   │  │          │  │ Control  │                  │  │ │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                  │  │ │
│  │  └──────────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                                │ │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    RESULTS & REPORTING                                   │  │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │  │ │
│  │  │  │ Response │  │ Response │  │ Report   │  │  Report  │                  │  │ │
│  │  │  │          │  │ Analysis │  │  Design  │  │          │                  │  │ │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                  │  │ │
│  │  └──────────────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                           │
│  ┌──────────────────────────────────────┴─────────────────────────────────────────┐ │
│  │                          DATA STORAGE                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │   MongoDB    │  │    SQL       │  │Elasticsearch │  │    Memory    │        │ │
│  │  │ (Documents)  │  │  (Entity)    │  │  (Search)    │  │  (Session)   │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### Survey Types & Question Types

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SURVEY TYPES                                            │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐
│  ENGAGEMENT │ │    360      │ │   PULSE     │ │    EXIT     │ │  ONBOARD    │ │   NPS     │
│   Survey    │ │  Feedback   │ │   Check     │ │  Interview  │ │   Survey    │ │  Survey   │
│  ┌───────┐  │ │  ┌───────┐  │ │  ┌───────┐  │ │  ┌───────┐  │ │  ┌───────┐  │ │ ┌───────┐ │
│  │Annual │  │ │  │Multi  │  │ │  │Weekly/│  │ │  │Leaving│  │ │  │New    │  │ │ │0-10   │ │
│  │/Semi  │  │ │  │Rater  │  │ │  │Monthly│  │ │  │Reasons│  │ │  │Hire   │  │ │ │Scale  │ │
│  │Assess │  │ │  │Assess │  │ │  │Quick  │  │ │  │Feedbck│  │ │  │Exp    │  │ │ │Score  │ │
│  └───────┘  │ │  └───────┘  │ │  └───────┘  │ │  └───────┘  │ │  └───────┘  │ │ └───────┘ │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  QUESTION TYPES                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  SINGLE CHOICE   │  │  MULTIPLE CHOICE │  │   RATING SCALE   │  │   TEXT / ESSAY   │
│  ○ Option A      │  │  ☑ Option A      │  │  ★★★★☆ (4/5)     │  │  ┌────────────┐  │
│  ● Option B      │  │  ☑ Option B      │  │  ○○○○○ → ●●●●○   │  │  │ Free text  │  │
│  ○ Option C      │  │  ☐ Option C      │  │  Likert Scale    │  │  │ response   │  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│     MATRIX       │  │     RANKING      │  │   FILE UPLOAD    │  │    NET PROMOTER  │
│     │ A │ B │ C  │  │  1. First        │  │  ┌────────────┐  │  │  0 1 2...8 9 10  │
│  X  │ ● │   │    │  │  2. Second       │  │  │ 📎 Upload  │  │  │  ○○○○○○○○●○○    │
│  Y  │   │ ● │    │  │  3. Third        │  │  │   file     │  │  │  Detractor→Prom │
│  Z  │   │   │ ●  │  │  ↕ Drag to rank  │  │  └────────────┘  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

### Accounts & Supporting Services Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                      ACCOUNTS & SUPPORTING SERVICES                                  │
│                   Identity, Auth, Notifications, Parsing                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ACCOUNTS SERVICE                                        │
│                        (Central Identity Provider)                                   │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Domain Layer                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │    Users    │  │   Company   │  │    Roles    │  │AccessPlans  │          │  │
│  │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │          │  │
│  │  │ │Profile  │ │  │ │Tenant   │ │  │ │RoleDefn │ │  │ │Features │ │          │  │
│  │  │ │Auth     │ │  │ │Settings │ │  │ │Permissn │ │  │ │Limits   │ │          │  │
│  │  │ │Session  │ │  │ │Branding │ │  │ │Assign   │ │  │ │Tiers    │ │          │  │
│  │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │          │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │  │
│  │                                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐                                            │  │
│  │  │  OrgUnits   │  │     OTP     │                                            │  │
│  │  │ ┌─────────┐ │  │ ┌─────────┐ │                                            │  │
│  │  │ │Departrnt│ │  │ │ 2FA     │ │                                            │  │
│  │  │ │Team     │ │  │ │ Verify  │ │                                            │  │
│  │  │ │Hierarchy│ │  │ │ Expire  │ │                                            │  │
│  │  │ └─────────┘ │  │ └─────────┘ │                                            │  │
│  │  └─────────────┘  └─────────────┘                                            │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Authentication Flows                                  │  │
│  │                                                                               │  │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │  │
│  │   │Password │    │ OAuth2  │    │   SSO   │    │   2FA   │    │  Token  │    │  │
│  │   │  Login  │    │ Social  │    │ SAML/   │    │  OTP/   │    │   JWT   │    │  │
│  │   │         │    │ Login   │    │ OIDC    │    │ TOTP    │    │ Refresh │    │  │
│  │   └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  Events Published: UserCreated, UserDeleted, UserUpdated, OrgUnitChanged            │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│      NOTIFICATION SERVICE           │  │         PARSER API                  │
│                                     │  │                                     │
│  ┌─────────────────────────────┐    │  │  ┌─────────────────────────────┐    │
│  │        CHANNELS             │    │  │  │      CAPABILITIES           │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ │    │  │  │  ┌──────────────────────┐   │    │
│  │  │Email │ │In-App│ │ Push │ │    │  │  │  │  Resume/CV Parsing   │   │    │
│  │  │ SMTP │ │ Web  │ │Mobile│ │    │  │  │  │  • PDF, Word, Text   │   │    │
│  │  └──────┘ └──────┘ └──────┘ │    │  │  │  │  • Contact Extract   │   │    │
│  │           ┌──────┐          │    │  │  │  │  • Experience Parse  │   │    │
│  │           │ SMS  │          │    │  │  │  │  • Education Parse   │   │    │
│  │           │Twilio│          │    │  │  │  │  • Skills Extract    │   │    │
│  │           └──────┘          │    │  │  │  │  • Language Detect   │   │    │
│  └─────────────────────────────┘    │  │  │  └──────────────────────┘   │    │
│                                     │  │  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │  │                                     │
│  │       FEATURES              │    │  │  Input:  [PDF/DOC] ──────┐          │
│  │  • Template Management      │    │  │                          ▼          │
│  │  • User Preferences         │    │  │  Output: ┌──────────────────┐       │
│  │  • Delivery Tracking        │    │  │          │ Structured JSON  │       │
│  │  • Notification History     │    │  │          │ • name, email    │       │
│  │  • Bulk Send                │    │  │          │ • phone, address │       │
│  └─────────────────────────────┘    │  │          │ • experience[]   │       │
└─────────────────────────────────────┘  │          │ • education[]    │       │
                                         │          │ • skills[]       │       │
┌─────────────────────────────────────┐  │          └──────────────────┘       │
│    PERMISSION PROVIDER              │  └─────────────────────────────────────┘
│                                     │
│  ┌─────────────────────────────┐    │  ┌─────────────────────────────────────┐
│  │    RBAC Components          │    │  │       CANDIDATE SERVICES            │
│  │  ┌─────────────────────┐    │    │  │                                     │
│  │  │ Role Definitions    │    │    │  │  ┌───────────────┐ ┌───────────────┐│
│  │  │ • Admin, Manager    │    │    │  │  │ CandidateApp  │ │ CandidateHub  ││
│  │  │ • Employee, Guest   │    │    │  │  │ (Self-Service)│ │ (Recruiter)   ││
│  │  └─────────────────────┘    │    │  │  │ ┌───────────┐ │ │ ┌───────────┐ ││
│  │  ┌─────────────────────┐    │    │  │  │ │Job Search │ │ │ │Pipeline   │ ││
│  │  │ Permission Matrix   │    │    │  │  │ │Apply      │ │ │ │Management │ ││
│  │  │ • Read, Write       │    │    │  │  │ │Status     │ │ │ │Bulk Ops   │ ││
│  │  │ • Delete, Admin     │    │    │  │  │ │Profile    │ │ │ │Communicate││ │
│  │  └─────────────────────┘    │    │  │  │ │Documents  │ │ │ │Interview  │ ││
│  │  ┌─────────────────────┐    │    │  │  │ │Interview  │ │ │ │Coordinate │ ││
│  │  │ Time-Based Access   │    │    │  │  │ └───────────┘ │ │ └───────────┘ ││
│  │  │ • Period Controls   │    │    │  │  └───────────────┘ └───────────────┘│
│  │  │ • External App Auth │    │    │  └─────────────────────────────────────┘
│  │  └─────────────────────┘    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

### Frontend Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND ARCHITECTURE                                      │
│                     Angular 19 (WebV2) + Angular 12 (Web)                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              WebV2 (Angular 19 - Nx Monorepo)                        │
│                                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              APPLICATIONS                                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │ │
│  │  │ growth-company  │  │    employee     │  │  notification   │                 │ │
│  │  │   (Port 4206)   │  │   (Port 4205)   │  │                 │                 │ │
│  │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │                 │ │
│  │  │ │HR Dashboard │ │  │ │Self-Service │ │  │ │Alert Center │ │                 │ │
│  │  │ │Goals & OKRs │ │  │ │Leave Request│ │  │ │Preferences  │ │                 │ │
│  │  │ │Reviews      │ │  │ │Check-ins    │ │  │ │History      │ │                 │ │
│  │  │ │Check-ins    │ │  │ │Goals View   │ │  │ │Real-time    │ │                 │ │
│  │  │ │Time Mgmt    │ │  │ │Time Entry   │ │  │ │             │ │                 │ │
│  │  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │                 │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                           │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                            SHARED LIBRARIES                                    │ │
│  │                                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                        platform-core                                    │   │ │
│  │  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────┐  │   │ │
│  │  │  │Platform       │ │PlatformVm     │ │PlatformForm   │ │PlatformApi  │  │   │ │
│  │  │  │Component      │ │Store          │ │Component      │ │Service      │  │   │ │
│  │  │  │(Base Class)   │ │(State Mgmt)   │ │(Form Handle)  │ │(HTTP Base)  │  │   │ │
│  │  │  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────┘  │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                         bravo-domain                                    │   │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │ │
│  │  │  │ account  │ │ employee │ │   goal   │ │  growth  │ │ check-in │       │   │ │
│  │  │  │  APIs    │ │  APIs    │ │  APIs    │ │  APIs    │ │  APIs    │       │   │ │
│  │  │  │  Models  │ │  Models  │ │  Models  │ │  Models  │ │  Models  │       │   │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                         bravo-common                                    │   │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │ │
│  │  │  │Components│ │Directives│ │  Pipes   │ │  Utils   │ │ Services │       │   │ │
│  │  │  │• Select  │ │• Ellipsis│ │• Date    │ │• Array   │ │• Theme   │       │   │ │
│  │  │  │• Table   │ │• Popover │ │• Plural  │ │• String  │ │• i18n    │       │   │ │
│  │  │  │• Alert   │ │• Swipe   │ │• Format  │ │• Date    │ │• Auth    │       │   │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                                │ │
│  │  ┌───────────────────────────────────┐                                         │ │
│  │  │          share-styles             │                                         │ │
│  │  │  • SCSS Variables & Themes        │                                         │ │
│  │  │  • Design Tokens                  │                                         │ │
│  │  │  • BEM Styling Patterns           │                                         │ │
│  │  └───────────────────────────────────┘                                         │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Web (Angular 12 - Legacy)                               │
│                                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │ │
│  │  │bravoTALENTSClient│ │CandidateAppClient│ │bravoSURVEYSClient│                │ │
│  │  │                 │  │                 │  │                 │                 │ │
│  │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │                 │ │
│  │  │ │Recruitment  │ │  │ │Candidate    │ │  │ │Survey       │ │                 │ │
│  │  │ │Dashboard    │ │  │ │Job Search   │ │  │ │Builder      │ │                 │ │
│  │  │ │Jobs & Cands │ │  │ │Applications │ │  │ │Respondents  │ │                 │ │
│  │  │ │Interviews   │ │  │ │Profile      │ │  │ │Results      │ │                 │ │
│  │  │ │Reports      │ │  │ │Status Track │ │  │ │Reports      │ │                 │ │
│  │  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │                 │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Data Flow & User Journeys

#### Employee Lifecycle Journey

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           EMPLOYEE LIFECYCLE JOURNEY                                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                      │
  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │
  │  │ ATTRACT │ ──▶│  HIRE   │ ──▶│ONBOARD  │ ──▶│ DEVELOP │ ──▶│ RETAIN  │            │
  │  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘            │
  │       │              │              │              │              │                  │
  │       ▼              ▼              ▼              ▼              ▼                  │
  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │
  │  │bravoTAL │    │bravoTAL │    │Accounts │    │bravoGRO │    │bravoSUR │            │
  │  │ ENTS    │    │ ENTS    │    │         │    │  WTH    │    │ VEYS    │            │
  │  │         │    │         │    │bravoTAL │    │         │    │         │            │
  │  │•Job Post│    │•Interview│   │ ENTS    │    │•Goals   │    │•Engage  │            │
  │  │•Sourcing│    │•Offer   │    │         │    │•Reviews │    │ Survey  │            │
  │  │•Apply   │    │•Accept  │    │•Create  │    │•Check-in│    │•Pulse   │            │
  │  └─────────┘    └─────────┘    │ User    │    │•Time    │    │•360     │            │
  │                               │•Create  │    └─────────┘    └─────────┘            │
  │                               │ Employee│                                          │
  │                               └─────────┘                                          │
  │                                                                                      │
  │  ════════════════════════════════════════════════════════════════════════════════   │
  │                              MESSAGE BUS (RabbitMQ)                                  │
  │  ════════════════════════════════════════════════════════════════════════════════   │
  │                                                                                      │
  │       ┌────────────────────────────────────────────────────────────────────┐        │
  │       │                    Event Flow Examples                             │        │
  │       │                                                                    │        │
  │       │  CandidateHired ──▶ CreateUser ──▶ CreateEmployee ──▶ SetupGoals   │        │
  │       │                                                                    │        │
  │       │  ReviewCompleted ──▶ UpdatePerformance ──▶ TriggerSurvey           │        │
  │       │                                                                    │        │
  │       │  EmployeeResigned ──▶ TriggerExitSurvey ──▶ ArchiveData            │        │
  │       └────────────────────────────────────────────────────────────────────┘        │
  │                                                                                      │
  └──────────────────────────────────────────────────────────────────────────────────────┘
```

#### Cross-Service Data Synchronization

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-SERVICE DATA SYNCHRONIZATION                                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │  Accounts   │
                                    │  (Source)   │
                                    └──────┬──────┘
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                              ▼            ▼            ▼
                   UserCreated    UserUpdated    UserDeleted
                              │            │            │
              ┌───────────────┼────────────┼────────────┼───────────────┐
              │               │            │            │               │
              ▼               ▼            ▼            ▼               ▼
       ┌──────────┐    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
       │bravoTAL  │    │bravoGRO  │  │bravoSUR  │  │bravoINS  │  │Notificat │
       │ ENTS     │    │  WTH     │  │ VEYS     │  │ IGHTS    │  │  ion     │
       │          │    │          │  │          │  │          │  │          │
       │•Sync     │    │•Sync     │  │•Sync     │  │•Update   │  │•Send     │
       │ Employee │    │ Employee │  │ Contact  │  │ Metrics  │  │ Welcome  │
       │          │    │ Goals    │  │ Survey   │  │          │  │ Email    │
       └──────────┘    └──────────┘  └──────────┘  └──────────┘  └──────────┘


┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         TYPICAL SYNC PATTERNS                                             │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Pattern 1: User → Employee Sync                                                         │
│                                                                                         │
│   Accounts                    bravoTALENTS                 bravoGROWTH                  │
│   ┌───────┐                   ┌───────┐                    ┌───────┐                    │
│   │Create │ ──UserCreated──▶  │Create │ ──EmployeeCreated▶ │Create │                    │
│   │ User  │                   │Employee│                   │Employee│                   │
│   └───────┘                   │Profile │                   │ Record │                   │
│                               └───────┘                    └───────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Pattern 2: Hire → Onboard Flow                                                          │
│                                                                                         │
│   bravoTALENTS                Accounts                     NotificationMessage          │
│   ┌───────┐                   ┌───────┐                    ┌───────┐                    │
│   │Accept │ ──CandidateHired▶ │Create │ ──UserCreated────▶ │Send   │                    │
│   │ Offer │                   │ User  │                    │Welcome│                    │
│   └───────┘                   │Account│                    │ Email │                    │
│                               └───────┘                    └───────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Pattern 3: 360 Review Trigger                                                           │
│                                                                                         │
│   bravoGROWTH                 bravoSURVEYS                 NotificationMessage          │
│   ┌───────┐                   ┌───────┐                    ┌───────┐                    │
│   │Start  │ ──360ReviewStart▶ │Create │ ──SurveySent─────▶ │Send   │                    │
│   │ 360   │                   │Feedback│                   │Survey │                    │
│   │Review │                   │ Survey │                   │ Link  │                    │
│   └───────┘                   └───────┘                    └───────┘                    │
│                                    │                                                    │
│                                    ▼                                                    │
│                               ┌───────┐                                                 │
│                               │Survey │ ──ResponseSaved──▶ bravoGROWTH                  │
│                               │Respond│                    (Update Score)               │
│                               └───────┘                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Business Modules

### bravoTALENTS - Recruitment & ATS

**Purpose**: End-to-end Applicant Tracking System (ATS) for managing the entire recruitment lifecycle.

#### Sub-modules

| Module | Purpose |
|--------|---------|
| **Candidate** | Candidate profiles, applications, talent pool |
| **Job** | Job postings, descriptions, requirements |
| **Employee** | Internal employee records linked to HR |
| **Email** | Email campaigns, templates, notifications |
| **Setting** | System configuration, job board integrations |
| **Talent** | Talent pool and pipeline management |

#### Key Entities

```
Candidate.Domain/AggregatesModel/
├── Candidate.cs              # Core candidate profile
├── Application.cs            # Job application record
├── Interview/                # Interview scheduling & feedback
├── Offer/                    # Job offer management
└── TalentPool/               # Candidate talent pools

Job.Domain/AggregatesModel/
├── Job.cs                    # Job posting entity
├── JobTemplate.cs            # Reusable job templates
└── JobRequirement.cs         # Job requirements/skills

Setting.Domain/AggregatesModel/
├── JobBoardProviderConfiguration/  # External job board configs
└── JobBoardProviderType (Enum):
    - ITViec
    - LinkedIn
    - VietnamWorks
    - TopCV
    - CareerBuilder
    - Other
```

#### Business Features

**Candidate Management**
- Candidate profile creation and management
- Resume parsing and data extraction (via ParserApi)
- Candidate status tracking (screening, interview, offer, hired, rejected)
- Talent pool segmentation and categorization
- Candidate search with full-text search capabilities
- Duplicate candidate detection and merging

**Job Posting & Management**
- Job creation with templates
- Multi-channel publishing (internal + external job boards)
- Job approval workflows
- Application tracking per job
- Job analytics (views, applications, conversion rates)

**Interview Management**
- Interview scheduling with calendar integration
- Multiple interview rounds/stages
- Interview feedback collection
- Interviewer assignment and availability
- Video interview integration support

**Offer Management**
- Offer letter generation
- Offer approval workflows
- Compensation package management
- Offer acceptance/rejection tracking

**Job Board Integrations**
- ITViec API integration (Vietnam tech jobs)
- LinkedIn job posting
- VietnamWorks integration
- TopCV integration
- CareerBuilder integration
- Automatic candidate import from job boards

**Email Campaigns**
- Email template management
- Bulk email campaigns to candidates
- Automated email sequences (application received, interview scheduled, etc.)
- Email tracking and analytics

#### Cross-Service Integration

| Publishes | Consumes |
|-----------|----------|
| `EmployeeEntityEventBusMessage` | Account user events |
| `InvitationEntityEventBusMessage` | Company settings |
| `InterviewScheduleEntityEventBusMessage` | Notification triggers |
| `JobAccessRightEntityEventBusMessage` | Permission updates |

---

### bravoGROWTH - Performance & OKR Management

**Purpose**: Comprehensive performance management system with goals, reviews, check-ins, and time tracking.

#### Domain Structure

```
Growth.Domain/Entities/
├── GoalManagement/           # OKRs, goals, key results
├── PerformanceReview/        # Review cycles and events
│   ├── Calendar/             # Review calendar scheduling
│   ├── Event/                # Review events (360, self, manager)
│   └── ValueObjects/         # Review-related value objects
├── CheckIn/                  # Regular check-in meetings
│   └── Extensions/           # Check-in utilities
├── FormTemplate/             # Reusable review form templates
│   └── ValueObjects/         # Form field configurations
├── TimeManagement/           # Time tracking and leave
│   ├── Extensions/           # Time calculation utilities
│   └── ValueObjects/         # Time-related value objects
├── HistoryLog/               # Audit trail and history
└── Subscription/             # Feature subscription management
```

#### Business Features

**Goal & OKR Management**
- Company/Team/Individual goal setting
- OKR framework support (Objectives & Key Results)
- Goal alignment and cascading
- Progress tracking with key result updates
- Goal visibility controls (public/private/team)
- Goal templates and best practices
- Historical goal archive

**Performance Review**
- Multiple review types:
  - Self-review
  - Manager review
  - 360-degree feedback
  - Peer review
  - Skip-level review
- Review cycle management with calendar
- Customizable review templates (FormTemplate)
- Rating scales and competency frameworks
- Review approval workflows
- Review acknowledgment tracking
- Performance calibration support

**Check-In Management**
- Regular 1:1 check-in scheduling
- Check-in templates and agendas
- Check-in notes and action items
- Check-in frequency configuration
- Manager/employee check-in tracking
- Check-in reminders and notifications

**Time Management**
- Time tracking and logging
- Leave request management
- Leave balance tracking
- Timesheet approval workflows
- Overtime tracking
- Work schedule management

**Form Templates**
- Drag-and-drop form builder
- Multiple question types (text, rating, multiple choice, etc.)
- Conditional logic in forms
- Reusable template library
- Form versioning

#### Cross-Service Integration

| Consumes From | Purpose |
|---------------|---------|
| Accounts | User/employee data sync |
| bravoTALENTS | Employee profile data |
| bravoSURVEYS | 360 feedback surveys |
| PermissionProvider | Access control periods |

---

### bravoSURVEYS - Survey & Feedback Platform

**Purpose**: Comprehensive survey platform (branded as "Learning Platform") for employee engagement, 360 feedback, pulse surveys, and assessments.

#### Domain Structure

```
LearningPlatform.Domain/
├── SurveyDesign/             # Survey creation and design
│   ├── Survey.cs             # Core survey entity
│   ├── Question.cs           # Question definitions
│   ├── QuestionLibrary.cs    # Reusable question banks
│   └── SurveyTemplate.cs     # Survey templates
├── Respondents/              # Survey participants
│   ├── Respondent.cs         # Survey respondent
│   └── RespondentGroup.cs    # Respondent grouping
├── Results/                  # Survey responses
│   ├── Response.cs           # Individual responses
│   └── ResponseAnalysis.cs   # Aggregated analytics
├── Scheduling/               # Survey distribution scheduling
├── AccessControl/            # Survey permissions
├── Reporting/                # Custom report generation
├── ReportDesign/             # Report template design
├── Libraries/                # Content libraries
├── Contacts/                 # Contact management
├── OrganizationalUnits/      # Org structure for surveys
├── Licenses/                 # Survey licensing
└── Common/                   # Shared utilities

LearningPlatform.Domain.SurveyExecution/
└── Survey execution runtime
```

#### Business Features

**Survey Design**
- Visual survey builder
- Multiple question types:
  - Single choice / Multiple choice
  - Rating scales (Likert, NPS, star rating)
  - Text/Essay responses
  - Matrix questions
  - Ranking questions
  - File upload questions
- Question libraries and reusable question banks
- Survey templates for common use cases
- Survey logic (skip logic, branching, piping)
- Multi-language survey support
- Survey preview and testing

**Survey Types Supported**
- Employee engagement surveys
- 360-degree feedback assessments
- Pulse surveys (quick, frequent check-ins)
- Exit interviews
- Onboarding surveys
- Training feedback
- Custom assessments
- NPS surveys

**Respondent Management**
- Anonymous and identified responses
- Respondent groups and segmentation
- Bulk respondent import
- Respondent contact management
- Response rate tracking
- Reminder automation

**Survey Distribution & Scheduling**
- Email distribution
- Link sharing
- Scheduled survey launches
- Survey deadlines and reminders
- Response window management

**Results & Analytics**
- Real-time response tracking
- Response aggregation and analytics
- Demographic segmentation
- Trend analysis over time
- Export to Excel/PDF
- Custom report builder

**Access Control**
- Survey-level permissions
- Result visibility controls
- Anonymous response protection
- Admin/viewer role separation

#### Cross-Service Integration

| Publishes | Purpose |
|-----------|---------|
| `SurveysRespondentSavedEventBusMessage` | Notify when survey responses submitted |

| Consumes | Purpose |
|----------|---------|
| Account/Company events | Org structure sync |
| Employee events | Employee data for surveys |

---

### bravoINSIGHTS - Analytics & Business Intelligence

**Purpose**: Centralized analytics and reporting service for cross-module business intelligence.

#### Structure

```
bravoINSIGHTS/
└── Analyze/                  # Analytics engine
    ├── Services/             # Analysis services
    ├── Reports/              # Report definitions
    └── Dashboards/           # Dashboard configurations
```

#### Business Features

**Analytics Capabilities**
- Cross-module data aggregation
- Recruitment funnel analytics
- Performance trend analysis
- Survey result insights
- Employee lifecycle metrics
- Time-to-hire analytics
- Retention rate tracking
- Headcount analytics

**Reporting**
- Pre-built report templates
- Custom report builder
- Scheduled report generation
- Report sharing and permissions
- Export formats (PDF, Excel, CSV)

**Dashboards**
- Executive dashboards
- HR metrics dashboard
- Recruitment dashboard
- Performance dashboard
- Custom dashboard builder

---

## Supporting Services

### Accounts - Identity & Multi-tenancy

**Purpose**: Central authentication, authorization, and multi-tenant company management.

#### Domain Structure

```
Accounts/Domain/
├── Users/                    # User accounts
│   ├── User.cs               # User entity
│   └── UserRole.cs           # User role assignments
├── Company/                  # Tenant/company management
│   ├── Company.cs            # Company entity
│   └── CompanySettings.cs    # Company configurations
├── Roles/                    # Role definitions
├── AccessPlans/              # Subscription tiers
├── OrganizationalUnits/      # Org structure (departments, teams)
└── OTP/                      # One-time password for 2FA
```

#### Business Features

**User Management**
- User registration and onboarding
- Email verification
- Password management (reset, change)
- Profile management
- User deactivation/reactivation

**Authentication**
- Username/password authentication
- OAuth2/OpenID Connect integration
- Single Sign-On (SSO) support
- Multi-factor authentication (OTP)
- Session management
- Token-based API authentication

**Multi-tenancy**
- Company (tenant) registration
- Company branding/customization
- Company-level settings
- Tenant data isolation

**Subscription & Access Plans**
- Feature-based subscription tiers
- User seat licensing
- Feature toggles per plan
- Usage limits and quotas

**Organization Structure**
- Department hierarchy
- Team management
- Reporting relationships
- Org chart visualization

#### Cross-Service Events Published

| Event | Purpose |
|-------|---------|
| `AccountUserDeletedEntityEventBusMessage` | Notify services of user deletion |
| `AccountOrganizationalUnitDeleteEntityEventBusMessage` | Notify of org unit changes |
| `AccountLimitedCustomerUserEntityEventBusMessage` | Limited user access events |

---

### CandidateApp & CandidateHub

**Purpose**: Candidate-facing portal (CandidateApp) and internal candidate management (CandidateHub).

#### CandidateApp Features
- Candidate self-service portal
- Job search and application
- Application status tracking
- Profile management
- Document upload
- Interview scheduling confirmation

#### CandidateHub Features
- Recruiter workspace
- Candidate pipeline management
- Bulk candidate actions
- Candidate communication
- Interview coordination

---

### NotificationMessage - Communication Hub

**Purpose**: Centralized notification service for all system communications.

#### Features
- Multi-channel notifications:
  - Email notifications
  - In-app notifications
  - Push notifications (mobile)
  - SMS notifications
- Notification templates
- Notification preferences per user
- Delivery tracking
- Notification history

---

### ParserApi - Document Processing

**Purpose**: Resume/CV parsing and document data extraction.

#### Features
- Resume parsing (PDF, Word, text)
- Contact information extraction
- Work experience parsing
- Education extraction
- Skills extraction
- Language detection
- Structured data output

---

### PermissionProvider - Authorization Service

**Purpose**: Centralized permission and access control management.

#### Domain Structure

```
PermissionProvider/
├── Period/                   # Time-based access periods
├── ExternalAppAuthentication/ # External app OAuth settings
└── Role-Permission mappings
```

#### Features
- Role-based access control (RBAC)
- Permission definitions per module
- Time-based access (periods)
- External app authentication settings
- API key management

---

## Frontend Applications

### WebV2 Applications (Angular 19)

| Application | Port | Purpose |
|-------------|------|---------|
| **growth-for-company** | 4206 | Company HR management portal |
| **employee** | 4205 | Employee self-service portal |
| **notification** | - | Notification center |

#### Shared Libraries

```
src/WebV2/libs/
├── platform-core/           # Framework base components
│   ├── PlatformComponent    # Base component class
│   ├── PlatformVmStore      # State management
│   └── PlatformFormComponent # Form handling
├── bravo-domain/            # Business domain models & services
│   ├── account/             # Account API services
│   ├── employee/            # Employee API services
│   ├── goal/                # Goal management
│   ├── growth/              # Growth module services
│   ├── check-in/            # Check-in features
│   └── notifications/       # Notification services
├── bravo-common/            # Shared UI components
│   ├── components/          # Reusable UI components
│   ├── directives/          # Custom Angular directives
│   ├── pipes/               # Data transformation pipes
│   └── utils/               # Utility functions
└── share-styles/            # SCSS themes and variables
```

### Web Applications (Angular 12 - Legacy)

| Application | Purpose |
|-------------|---------|
| **bravoTALENTSClient** | Full recruitment portal |
| **CandidateAppClient** | Candidate portal |
| **bravoSURVEYSClient** | Survey creation and management |

---

## Cross-Service Integration

### Message Bus Architecture

BravoSUITE uses RabbitMQ for event-driven cross-service communication.

```
                    ┌──────────────────────┐
                    │      RabbitMQ        │
                    │   (Message Broker)   │
                    └──────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Accounts    │     │ bravoTALENTS  │     │  bravoGROWTH  │
│  (Publisher)  │────▶│  (Consumer)   │────▶│  (Consumer)   │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        │                     ▼                     ▼
        │             ┌───────────────┐     ┌───────────────┐
        └────────────▶│ bravoSURVEYS  │     │ bravoINSIGHTS │
                      │  (Consumer)   │     │  (Consumer)   │
                      └───────────────┘     └───────────────┘
```

### Key Integration Patterns

#### 1. User Lifecycle Sync
```
Accounts ──(UserCreated)──▶ bravoTALENTS (Employee)
         ──(UserDeleted)──▶ bravoGROWTH (cleanup)
         ──(UserUpdated)──▶ bravoSURVEYS (sync)
```

#### 2. Employee-Candidate Conversion
```
bravoTALENTS (Candidate hired) ──▶ Accounts (Create User)
                               ──▶ bravoGROWTH (Create Employee Record)
```

#### 3. Performance-Survey Integration
```
bravoGROWTH (360 Review) ──▶ bravoSURVEYS (Create Feedback Survey)
bravoSURVEYS (Results)   ──▶ bravoGROWTH (Update Review Scores)
```

#### 4. Notification Triggers
```
All Services ──(Events)──▶ NotificationMessage ──▶ Users
```

### Message Types Summary

| Producer Service | Message Type | Consumers |
|-----------------|--------------|-----------|
| Accounts | AccountUserDeletedEventBusMessage | Growth, Talents, Surveys |
| Accounts | AccountOrganizationalUnitDeleteEventBusMessage | Growth, Talents |
| bravoTALENTS | EmployeeEntityEventBusMessage | Growth, Surveys |
| bravoTALENTS | InvitationEntityEventBusMessage | Accounts |
| bravoTALENTS | InterviewScheduleEntityEventBusMessage | Notifications |
| bravoSURVEYS | SurveysRespondentSavedEventBusMessage | Growth, Insights |
| PermissionProvider | PeriodEntityEventBusMessage | All services |

---

## Integration Architecture

### External System Integrations

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| **ITViec** | REST API | Job posting, candidate import |
| **LinkedIn** | OAuth + API | Job posting, profile import |
| **VietnamWorks** | API | Job posting |
| **TopCV** | API | Job posting, candidate import |
| **Google Calendar** | OAuth | Interview scheduling |
| **Microsoft 365** | OAuth | Calendar, email integration |
| **Slack** | Webhook | Notifications |
| **Email (SMTP)** | SMTP | Transactional emails |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Systems                          │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐   │
│   │ ITViec │ │LinkedIn│ │  TopCV │ │Calendar│ │Email Server│   │
│   └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └─────┬──────┘   │
└───────┼──────────┼──────────┼──────────┼────────────┼──────────┘
        │          │          │          │            │
        ▼          ▼          ▼          ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BravoSUITE Platform                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API Gateway / Load Balancer              ││
│  └─────────────────────────────────────────────────────────────┘│
│        │              │              │              │            │
│        ▼              ▼              ▼              ▼            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Accounts │  │ Talents  │  │  Growth  │  │ Surveys  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴──────┬──────┴─────────────┘               │
│                            ▼                                     │
│                    ┌──────────────┐                             │
│                    │   RabbitMQ   │                             │
│                    │  Event Bus   │                             │
│                    └──────────────┘                             │
│                            │                                     │
│        ┌───────────────────┼───────────────────┐                │
│        ▼                   ▼                   ▼                │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐            │
│  │ MongoDB  │       │SQL Server│       │PostgreSQL│            │
│  └──────────┘       └──────────┘       └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Matrix by Module

| Feature | Talents | Growth | Surveys | Insights | Accounts |
|---------|:-------:|:------:|:-------:|:--------:|:--------:|
| Job Posting | ✅ | - | - | - | - |
| Candidate Management | ✅ | - | - | - | - |
| Interview Scheduling | ✅ | - | - | - | - |
| Offer Management | ✅ | - | - | - | - |
| Job Board Integration | ✅ | - | - | - | - |
| Goal/OKR Management | - | ✅ | - | - | - |
| Performance Reviews | - | ✅ | - | - | - |
| Check-ins | - | ✅ | - | - | - |
| Time Tracking | - | ✅ | - | - | - |
| Survey Builder | - | - | ✅ | - | - |
| 360 Feedback | - | ✅ | ✅ | - | - |
| Pulse Surveys | - | - | ✅ | - | - |
| Analytics | - | - | - | ✅ | - |
| Dashboards | - | - | - | ✅ | - |
| User Management | - | - | - | - | ✅ |
| Multi-tenancy | - | - | - | - | ✅ |
| SSO/OAuth | - | - | - | - | ✅ |

---

## Glossary

| Term | Definition |
|------|------------|
| **ATS** | Applicant Tracking System |
| **OKR** | Objectives and Key Results |
| **NPS** | Net Promoter Score |
| **360 Feedback** | Multi-rater feedback from peers, managers, and direct reports |
| **Pulse Survey** | Short, frequent surveys to gauge employee sentiment |
| **Talent Pool** | Database of potential candidates for future positions |
| **Check-in** | Regular 1:1 meetings between managers and employees |

---

*Document generated: 2024-12-30*
*Last updated: 2024-12-30*
