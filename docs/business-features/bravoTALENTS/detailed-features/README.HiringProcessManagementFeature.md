# Hiring Process Management Feature Documentation

<!-- Metadata -->
**Module**: bravoTALENTS
**Feature**: Hiring Process Management (Pipeline Builder)
**Parent Feature**: [Recruitment Pipeline](README.RecruitmentPipelineFeature.md)
**Version**: 1.0.0
**Status**: Production
**Last Updated**: 2026-01-14

> **Technical Documentation for Customizable Hiring Process/Pipeline Management in bravoTALENTS**
>
> **Note**: This is a sub-feature of the Recruitment Pipeline. See [README.RecruitmentPipelineFeature.md](README.RecruitmentPipelineFeature.md) for the complete recruitment flow.

---

## Quick Navigation

| Section                                                      | Audience     | Purpose                           |
| ------------------------------------------------------------ | ------------ | --------------------------------- |
| [Executive Summary](#1-executive-summary)                    | All          | High-level feature overview       |
| [Business Value](#2-business-value)                          | BA, PO       | ROI and business impact           |
| [Business Requirements](#3-business-requirements)            | BA, PO       | Functional requirements catalog   |
| [Business Rules](#4-business-rules)                          | BA, PO, Dev  | Business logic and constraints    |
| [Process Flows](#5-process-flows)                            | BA, PO, QA   | End-to-end workflows              |
| [Design Reference](#6-design-reference)                      | UI/UX, Dev   | Figma designs and mockups         |
| [System Design](#7-system-design)                            | Dev          | Technical architecture            |
| [Architecture](#8-architecture)                              | Dev          | Component diagrams                |
| [Domain Model](#9-domain-model)                              | Dev          | Core entities and data structures |
| [API Reference](#10-api-reference)                           | Dev          | Complete API documentation        |
| [Frontend Components](#11-frontend-components)               | Dev          | UI component catalog              |
| [Backend Controllers](#12-backend-controllers)               | Dev          | API controller details            |
| [Cross-Service Integration](#13-cross-service-integration)   | Dev          | Service dependencies              |
| [Security Architecture](#14-security-architecture)           | Dev, QA      | Authorization and permissions     |
| [Performance Considerations](#15-performance-considerations) | Dev          | Optimization guidelines           |
| [Implementation Guide](#16-implementation-guide)             | Dev          | Development patterns              |
| [Test Specifications](#17-test-specifications)               | QA, QC       | Test cases and verification       |
| [Test Data Requirements](#18-test-data-requirements)         | QA           | Test data setup                   |
| [Edge Cases Catalog](#19-edge-cases-catalog)                 | QA, Dev      | Boundary conditions               |
| [Regression Impact](#20-regression-impact)                   | QA           | Areas affected by changes         |
| [Troubleshooting](#21-troubleshooting)                       | Dev, Support | Common issues and solutions       |
| [Operational Runbook](#22-operational-runbook)               | DevOps       | Deployment and monitoring         |
| [Roadmap and Dependencies](#23-roadmap-and-dependencies)     | PO, Dev      | Future plans                      |
| [Related Documentation](#24-related-documentation)           | All          | Links to related docs             |
| [Glossary](#25-glossary)                                     | All          | Term definitions                  |
| [Version History](#26-version-history)                       | All          | Change log                        |

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

### Overview

The Hiring Process Management feature enables companies to create, customize, and manage recruitment pipelines (hiring workflows) tailored to their specific hiring needs. Companies can define multiple hiring processes with different stage configurations for various job types (e.g., technical roles, sales roles, executive positions).

**Core Values**: Customizable - Reusable - Auditable

### Key Capabilities

- **Pipeline Creation**: Create custom hiring processes with selected stages
- **Stage Management**: Manage company-wide stage library with multi-language support
- **Stage Ordering**: Drag-and-drop reordering of stages within pipelines
- **Pipeline Lifecycle**: Draft → Published → Archived status workflow
- **Default Pipeline**: Set default hiring process for new jobs
- **Usage Tracking**: Track which pipelines are used by jobs/applications

### Scope

This document covers the hiring process configuration module:
```
Stage Library → Pipeline Builder → Pipeline Assignment → Usage Tracking
```

### Key Locations

| Layer                     | Location                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| **Frontend - Settings**   | `src/Web/bravoTALENTSClient/src/app/settings/pages/hiring-process-page/`         |
| **Frontend - Shared**     | `src/Web/bravoTALENTSClient/src/app/shared/components/save-hiring-process-form/` |
| **Backend - Application** | `src/Services/bravoTALENTS/Candidate.Application/Pipelines/`                     |
| **Backend - Domain**      | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Pipeline.cs`         |
| **Backend - Domain**      | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Stage.cs`            |

### Key Metrics

- **Pipeline reuse rate**: Target 80% of jobs use defined pipelines
- **Average stages per pipeline**: 6-10 stages
- **Default pipeline usage**: 60% of new jobs

---

## 2. Business Value

### Strategic Objectives

| Objective                   | Description                             | KPI                             |
| --------------------------- | --------------------------------------- | ------------------------------- |
| **Process Standardization** | Define consistent hiring workflows      | 100% jobs use defined processes |
| **Flexibility**             | Different processes for different roles | 3+ active pipelines per company |
| **Time Savings**            | Reuse configured pipelines              | 15 min saved per job creation   |
| **Compliance**              | Documented hiring stages                | 100% stage coverage             |

### ROI Analysis

**Productivity Gains**:
- **Template Reuse**: Save 15 min per job by using pre-configured pipelines
- **Reduced Errors**: Standardized stages prevent skipped steps
- **Faster Onboarding**: New HR staff use established processes

### User Impact

| Stakeholder    | Pain Point Addressed          | Benefit                             |
| -------------- | ----------------------------- | ----------------------------------- |
| **HR Admin**   | Manual pipeline setup per job | Pre-configured reusable processes   |
| **HR Manager** | Inconsistent hiring stages    | Standardized company-wide workflows |
| **Recruiter**  | Unclear next steps            | Clear stage progression             |

---

## 3. Business Requirements

### Pipeline Management

#### FR-HP-01: Pipeline Creation

| Aspect          | Details                                                           |
| --------------- | ----------------------------------------------------------------- |
| **Description** | HR Admin can create custom hiring processes                       |
| **Priority**    | P0 - Critical                                                     |
| **Fields**      | Name (required), Stages (min 4), Status                           |
| **Validation**  | Name must be unique within company                                |
| **Min Stages**  | Sourced, Applied, Offer, Hired (system stages)                    |
| **Evidence**    | `Candidate.Application/Pipelines/Commands/SavePipelineCommand.cs` |

#### FR-HP-02: Stage Selection

| Aspect            | Details                                                        |
| ----------------- | -------------------------------------------------------------- |
| **Description**   | Select stages from company stage library                       |
| **Priority**      | P0 - Critical                                                  |
| **Categories**    | Application, AssessmentAndInterview, Offer, Hired              |
| **System Stages** | Sourced, Applied (start); Offer, Hired (end) - always included |
| **Custom Stages** | In Review, Phone Interview, Technical Interview, etc.          |
| **Evidence**      | `Candidate.Application/Stage/Queries/GetStageListQuery.cs`     |

#### FR-HP-03: Stage Reordering

| Aspect          | Details                                       |
| --------------- | --------------------------------------------- |
| **Description** | Drag-and-drop reorder stages within pipeline  |
| **Priority**    | P1 - High                                     |
| **Constraints** | System stages (start/end) cannot be reordered |
| **UI**          | Visual drag handles with animation            |
| **Evidence**    | `save-hiring-process-form.component.ts`       |

#### FR-HP-04: Pipeline Status Management

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Manage pipeline lifecycle through status transitions                |
| **Priority**    | P0 - Critical                                                       |
| **Statuses**    | Draft, Published, Archived                                          |
| **Rules**       | Only Published pipelines can be assigned to jobs                    |
| **Transitions** | Draft → Published, Published → Draft/Archived, Archived → Published |
| **Evidence**    | `Pipeline.ValidateStatusTransition()`                               |

#### FR-HP-05: Default Pipeline

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Set one pipeline as company default                                     |
| **Priority**    | P1 - High                                                               |
| **Usage**       | Auto-selected when creating new jobs                                    |
| **Constraints** | Cannot delete or unpublish default pipeline                             |
| **Evidence**    | `Candidate.Application/Pipelines/Commands/SetDefaultPipelineCommand.cs` |

#### FR-HP-06: Pipeline Duplication

| Aspect          | Details                                                                |
| --------------- | ---------------------------------------------------------------------- |
| **Description** | Duplicate existing pipeline as new Draft                               |
| **Priority**    | P2 - Medium                                                            |
| **Behavior**    | Copies name (with suffix), stages; resets status to Draft              |
| **Evidence**    | `Candidate.Application/Pipelines/Commands/DuplicatePipelineCommand.cs` |

#### FR-HP-07: Pipeline Deletion

| Aspect          | Details                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Description** | Delete unused pipelines                                             |
| **Priority**    | P1 - High                                                           |
| **Constraints** | Cannot delete if used by jobs or is default                         |
| **Evidence**    | `Candidate.Application/Pipelines/Commands/DeletePipelineCommand.cs` |

### Stage Management

#### FR-HP-08: Stage Library

| Aspect             | Details                                                 |
| ------------------ | ------------------------------------------------------- |
| **Description**    | Company-wide stage library with multi-language names    |
| **Priority**       | P0 - Critical                                           |
| **System Stages**  | 4 required: Sourced, Applied, Offer, Hired              |
| **Default Custom** | 3 default: In Review, Phone Interview, Onsite Interview |
| **Evidence**       | `Candidate.Domain/AggregatesModel/Stage.cs`             |

#### FR-HP-09: Stage Global Order

| Aspect          | Details                                          |
| --------------- | ------------------------------------------------ |
| **Description** | Company-wide ordering of all stages              |
| **Priority**    | P1 - High                                        |
| **Purpose**     | Ensures consistent ordering across all pipelines |
| **Structure**   | [Sourced, Applied, ...custom..., Offer, Hired]   |
| **Evidence**    | `Candidate.Domain/AggregatesModel/StageOrder.cs` |

---

## 4. Business Rules

### Pipeline Rules

| Rule ID  | Rule                                              | Validation Location                                          |
| -------- | ------------------------------------------------- | ------------------------------------------------------------ |
| BR-HP-01 | Pipeline name must be unique per company          | `CheckPipelineNameUniquenessQuery`                           |
| BR-HP-02 | Pipeline must have at least 4 stages              | `SavePipelineCommand.Validate()`                             |
| BR-HP-03 | First stage must be Sourced, last must be Hired   | `SavePipelineCommandHandler.ValidateStageOrderConstraints()` |
| BR-HP-04 | Cannot delete pipeline used by active jobs        | `DeletePipelineCommandHandler.ValidateRequestAsync()`        |
| BR-HP-05 | Cannot unpublish default pipeline                 | `HiringProcess.canUnpublishStatus()`                         |
| BR-HP-06 | Cannot delete default pipeline                    | `DeletePipelineCommandHandler.ValidateRequestAsync()`        |
| BR-HP-07 | Cannot modify stages if pipeline has applications | `HiringProcess.canUpdateStages()`                            |

### Stage Rules

| Rule ID  | Rule                                          | Validation Location           |
| -------- | --------------------------------------------- | ----------------------------- |
| BR-HP-08 | Stage name is required (default language)     | `SaveStageCommand.Validate()` |
| BR-HP-09 | System stages cannot be deleted               | `Stage.IsSystem` flag check   |
| BR-HP-10 | New stages insert before Offer in GlobalOrder | `SaveStageCommandHandler`     |

### Status Transition Matrix

| From          | To Draft                    | To Published | To Archived   |
| ------------- | --------------------------- | ------------ | ------------- |
| **Draft**     | N/A                         | ✅ Always     | ❌ Not allowed |
| **Published** | ✅ If not default & not used | N/A          | ✅ Always      |
| **Archived**  | ❌ Not allowed               | ✅ Always     | N/A           |

---

## 5. Process Flows

### Pipeline Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Creation Flow                    │
└─────────────────────────────────────────────────────────────┘

User → Settings → Hiring Process
              │
              ▼
        Click "Create"
              │
              ▼
     ┌────────────────────┐
     │   Enter Name       │
     │   (unique check)   │
     └────────────────────┘
              │
              ▼
     ┌────────────────────┐
     │  Select Stages     │
     │  from library      │
     └────────────────────┘
              │
              ▼
     ┌────────────────────┐
     │  Reorder Stages    │
     │  (drag-drop)       │
     └────────────────────┘
              │
              ▼
     ┌────────────────────┐
     │  Save as Draft     │
     │  or Publish        │
     └────────────────────┘
              │
              ▼
      Pipeline Available
```

### Pipeline Assignment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Pipeline Assignment Flow                    │
└─────────────────────────────────────────────────────────────┘

Create/Edit Job
       │
       ▼
┌──────────────────┐
│ Select Hiring    │  ← Only Published pipelines shown
│ Process          │
└──────────────────┘
       │
       ▼
Pipeline stages applied to job
       │
       ▼
Candidates flow through pipeline stages
```

### Pipeline Status Workflow

```
                    ┌──────────┐
                    │  Draft   │◄─────────────┐
                    └────┬─────┘              │
                         │                    │
                    Publish                Unpublish
                         │                (if allowed)
                         ▼                    │
                   ┌──────────┐               │
         ┌────────│ Published │───────────────┘
         │        └─────┬─────┘
         │              │
     Archive       Archive
         │              │
         ▼              ▼
    ┌──────────┐
    │ Archived │
    └────┬─────┘
         │
     Republish
         │
         ▼
   ┌──────────┐
   │ Published│
   └──────────┘
```

---

## 6. Design Reference

### Figma Designs

| Screen                  | Link | Status      |
| ----------------------- | ---- | ----------- |
| Hiring Process List     | TBD  | Implemented |
| Pipeline Builder Dialog | TBD  | Implemented |
| Stage Drag-Drop         | TBD  | Implemented |

### UI Screenshots

```
┌────────────────────────────────────────────────────────────┐
│  Settings > Hiring Process                                 │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐                          │
│  │  Usable (3) │ │ Archived (2)│     [+ Create Process]   │
│  └─────────────┘ └─────────────┘                          │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📋 Technical Hiring                      Published   │ │
│  │ Sourced → Applied → Phone → Tech → Offer → Hired    │ │
│  │ Created by: John | Updated: 2026-01-10              │ │
│  │ [Edit] [Duplicate] [...]                            │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📋 Sales Hiring                           ⭐ Default │ │
│  │ Sourced → Applied → Screen → Offer → Hired          │ │
│  │ Created by: Jane | Updated: 2026-01-08              │ │
│  │ [Edit] [Duplicate] [...]                            │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 7. System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Angular 19)                   │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ HiringProcess   │  │ SaveHiringProcess│                 │
│  │ PageComponent   │  │ FormComponent    │                 │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
│           ▼                    ▼                            │
│  ┌─────────────────────────────────────────┐               │
│  │         HiringProcessApiService         │               │
│  └─────────────────────┬───────────────────┘               │
└────────────────────────┼───────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (.NET 9)                          │
│  ┌─────────────────┐                                       │
│  │ PipelineController│                                     │
│  │ StageController   │                                     │
│  └────────┬──────────┘                                     │
│           │                                                 │
│           ▼ CQRS                                           │
│  ┌─────────────────────────────────────────┐               │
│  │  Commands: Save, Delete, Duplicate,     │               │
│  │            SetDefault                   │               │
│  │  Queries:  GetList, GetById, GetDefault,│               │
│  │            CheckUniqueName              │               │
│  └────────┬────────────────────────────────┘               │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────┐               │
│  │         Domain Layer                    │               │
│  │  Pipeline, Stage, StageOrder            │               │
│  └────────┬────────────────────────────────┘               │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────┐               │
│  │         MongoDB                         │               │
│  │  Pipelines, Stages, StageOrders         │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User creates pipeline
   │
   ▼
2. Frontend validates name uniqueness (async)
   │
   ▼
3. SavePipelineCommand sent to backend
   │
   ▼
4. Handler validates:
   - Stage IDs exist
   - Stage order constraints (Sourced first, Hired last)
   - Status transition valid
   │
   ▼
5. Pipeline created/updated in MongoDB
   │
   ▼
6. Response returned to frontend
```

---

## 8. Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Candidate.Service                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Controllers                          │ │
│  │  PipelineController    StageController                 │ │
│  └──────────────────────────┬─────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────▼────────────────────────────┐ │
│  │               Candidate.Application                    │ │
│  │  ┌──────────────────┐  ┌──────────────────┐           │ │
│  │  │ Pipelines/       │  │ Stage/           │           │ │
│  │  │  Commands/       │  │  Command/        │           │ │
│  │  │  Queries/        │  │  Queries/        │           │ │
│  │  │  PipelineDto.cs  │  │  StageDto.cs     │           │ │
│  │  └──────────────────┘  └──────────────────┘           │ │
│  │  ┌──────────────────────────────────────────┐         │ │
│  │  │ Helper/                                  │         │ │
│  │  │  PipelineHelper.cs                       │         │ │
│  │  └──────────────────────────────────────────┘         │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────▼────────────────────────────┐ │
│  │                 Candidate.Domain                       │ │
│  │  Pipeline.cs  Stage.cs  StageOrder.cs                  │ │
│  │  StageCategory.cs  StageStatus.cs                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────▼────────────────────────────┐ │
│  │               Candidate.Persistance                    │ │
│  │  PipelineRepository.cs                                 │ │
│  │  DataMigrations/                                       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Domain Model

### Entity Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     Pipeline    │       │      Stage      │
├─────────────────┤       ├─────────────────┤
│ Id              │       │ Id              │
│ OrganizationalUnitId    │ CompanyId       │
│ Name            │       │ NameMultiLanguage│
│ StageIds[]      │──────▶│ IsSystem        │
│ IsDefault       │       │ Category        │
│ Status          │       │ Status          │
│ CreatedByUserId │       │ Color           │
│ CreatedDate     │       └─────────────────┘
│ UpdatedDate     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   StageOrder    │
├─────────────────┤
│ Id              │
│ CompanyId       │
│ GlobalOrder[]   │ ← All stage IDs in company order
└─────────────────┘
```

### Entity Details

#### Pipeline

| Property             | Type         | Required | Description                        |
| -------------------- | ------------ | -------- | ---------------------------------- |
| Id                   | string       | Yes      | ULID identifier                    |
| OrganizationalUnitId | string       | Yes      | Company ID                         |
| Name                 | string       | Yes      | Pipeline name (unique per company) |
| StageIds             | List<string> | Yes      | Ordered stage IDs (min 4)          |
| IsDefault            | bool         | No       | Is default for new jobs            |
| Status               | StageStatus  | Yes      | Draft/Published/Archived           |
| CreatedByUserId      | string       | Yes      | Creator user ID                    |
| CreatedDate          | DateTime     | Yes      | Creation timestamp                 |
| UpdatedByUserId      | string       | No       | Last updater user ID               |
| UpdatedDate          | DateTime     | No       | Last update timestamp              |

#### Stage

| Property          | Type           | Required | Description                        |
| ----------------- | -------------- | -------- | ---------------------------------- |
| Id                | string         | Yes      | ULID identifier                    |
| CompanyId         | string         | Yes      | Company ID                         |
| NameMultiLanguage | LanguageString | Yes      | Multi-language name                |
| IsSystem          | bool           | No       | Cannot be deleted if true          |
| Category          | StageCategory  | Yes      | Application/Assessment/Offer/Hired |
| Status            | StageStatus    | Yes      | Published/Archived                 |
| Color             | string         | No       | Stage color code (#RRGGBB)         |

#### StageOrder

| Property    | Type         | Required | Description            |
| ----------- | ------------ | -------- | ---------------------- |
| Id          | string       | Yes      | ULID identifier        |
| CompanyId   | string       | Yes      | Company ID             |
| GlobalOrder | List<string> | Yes      | All stage IDs in order |

### Enums

```csharp
public enum StageStatus { Draft, Published, Archived }

public enum StageCategory {
    Application,            // Start stages (Sourced, Applied)
    AssessmentAndInterview, // Custom middle stages
    Offer,                  // End stage
    Hired                   // Final stage
}
```

---

## 10. API Reference

### Pipeline Endpoints

| Method | Endpoint                          | Description                 | Authorization                 |
| ------ | --------------------------------- | --------------------------- | ----------------------------- |
| GET    | `/api/Pipeline`                   | Get paginated pipeline list | RecruitmentPipelineManagement |
| GET    | `/api/Pipeline/{id}`              | Get pipeline by ID          | RecruitmentPipelineManagement |
| GET    | `/api/Pipeline/default`           | Get default pipeline        | RecruitmentPipelineManagement |
| POST   | `/api/Pipeline/default/{id}`      | Set default pipeline        | RecruitmentPipelineManagement |
| POST   | `/api/Pipeline`                   | Create/update pipeline      | RecruitmentPipelineManagement |
| DELETE | `/api/Pipeline/{id}`              | Delete pipeline             | RecruitmentPipelineManagement |
| POST   | `/api/Pipeline/duplicate/{id}`    | Duplicate pipeline          | RecruitmentPipelineManagement |
| GET    | `/api/Pipeline/check-unique-name` | Check name uniqueness       | RecruitmentPipelineManagement |

### Stage Endpoints

| Method | Endpoint          | Description              | Authorization                 |
| ------ | ----------------- | ------------------------ | ----------------------------- |
| GET    | `/api/Stage`      | Get paginated stage list | RecruitmentPipelineManagement |
| POST   | `/api/Stage`      | Create/update stage      | RecruitmentPipelineManagement |
| DELETE | `/api/Stage/{id}` | Delete stage             | RecruitmentPipelineManagement |

### Request/Response Examples

#### GET /api/Pipeline

**Request**:
```http
GET /api/Pipeline?status=Published&includeStages=true&maxResultCount=25&skipCount=0
Authorization: Bearer {token}
```

**Response**:
```json
{
  "items": [{
    "id": "01HXYZ123ABC",
    "name": "Technical Hiring",
    "organizationalUnitId": "company-123",
    "stageIds": ["stage1", "stage2", "stage3", "stage4"],
    "isDefault": false,
    "status": "Published",
    "isUsedByJobs": true,
    "isUsedByApplications": false,
    "createdByUserId": "user-456",
    "createdByUserName": "John Doe",
    "createdDate": "2026-01-10T10:00:00Z",
    "updatedDate": "2026-01-12T15:30:00Z",
    "stages": [
      { "id": "stage1", "nameMultiLanguage": { "defaultValue": "Sourced" }, "category": "Application", "isSystem": true },
      { "id": "stage2", "nameMultiLanguage": { "defaultValue": "Applied" }, "category": "Application", "isSystem": true },
      { "id": "stage3", "nameMultiLanguage": { "defaultValue": "Offer" }, "category": "Offer", "isSystem": true },
      { "id": "stage4", "nameMultiLanguage": { "defaultValue": "Hired" }, "category": "Hired", "isSystem": true }
    ]
  }],
  "totalCount": 5,
  "usableCount": 3,
  "archivedCount": 2
}
```

#### POST /api/Pipeline

**Request**:
```http
POST /api/Pipeline
Content-Type: application/json
Authorization: Bearer {token}

{
  "pipeline": {
    "name": "Sales Hiring Process",
    "stageIds": ["sourced-id", "applied-id", "phone-id", "offer-id", "hired-id"],
    "status": "Draft"
  }
}
```

**Response**:
```json
{
  "pipeline": {
    "id": "01HXYZ789DEF",
    "name": "Sales Hiring Process",
    "stageIds": ["sourced-id", "applied-id", "phone-id", "offer-id", "hired-id"],
    "status": "Draft",
    "createdDate": "2026-01-14T06:00:00Z"
  }
}
```

---

## 11. Frontend Components

### Component Hierarchy

```
settings.routing.module
└── hiring-process-page
    ├── workflow-card (list item)
    ├── hiring-process-status (status badge)
    └── save-hiring-process-form (dialog)
        ├── stage-index (order number)
        ├── tag-pill (stage pill)
        └── pill-row (stage row)
```

### Component Details

| Component                         | Location             | Purpose                 | Props/Inputs         |
| --------------------------------- | -------------------- | ----------------------- | -------------------- |
| `HiringProcessPageComponent`      | `settings/pages/`    | Main list page          | -                    |
| `SaveHiringProcessFormComponent`  | `shared/components/` | Pipeline builder dialog | `pipeline`, `mode`   |
| `WorkflowCardComponent`           | `shared/components/` | Pipeline card display   | `pipeline`           |
| `HiringProcessStatusComponent`    | `shared/components/` | Status badge            | `status`             |
| `HiringProcessSelectionComponent` | `shared/components/` | Pipeline dropdown       | `selectedPipelineId` |
| `PillRowComponent`                | `shared/components/` | Stage row with pills    | `stages`             |
| `StageIndexComponent`             | `shared/components/` | Order number display    | `index`              |

### Services

| Service                   | Location           | Purpose            |
| ------------------------- | ------------------ | ------------------ |
| `HiringProcessApiService` | `shared/services/` | Pipeline API calls |
| `StageService`            | `shared/services/` | Stage API calls    |

### Models

| Model            | Location         | Purpose                            |
| ---------------- | ---------------- | ---------------------------------- |
| `HiringProcess`  | `shared/models/` | Pipeline model with business logic |
| `Stage`          | `shared/models/` | Stage model with grouping methods  |
| `LanguageString` | `shared/models/` | Multi-language text support        |

---

## 12. Backend Controllers

### PipelineController

**Location**: `Candidate.Service/Controllers/PipelineController.cs`

```csharp
[BravoTalentsSubscriptionClaimAuthorize]
[Authorize(Policy = Policies.BravoTALENTS)]
[Authorize(Policy = CompanyRoleAuthorizationPolicies.RecruitmentPipelineManagementPolicy)]
[Route("api/[controller]")]
[ApiController]
public class PipelineController : BaseController
```

| Action             | HTTP Method | Route                | Command/Query                      |
| ------------------ | ----------- | -------------------- | ---------------------------------- |
| GetPipelines       | GET         | `/`                  | `GetPipelineListQuery`             |
| GetDefaultPipeline | GET         | `/default`           | `GetDefaultPipelineQuery`          |
| SetDefaultPipeline | POST        | `/default/{id}`      | `SetDefaultPipelineCommand`        |
| GetPipelineById    | GET         | `/{id}`              | `GetPipelineByIdQuery`             |
| CheckUniqueName    | GET         | `/check-unique-name` | `CheckPipelineNameUniquenessQuery` |
| Save               | POST        | `/`                  | `SavePipelineCommand`              |
| Delete             | DELETE      | `/{id}`              | `DeletePipelineCommand`            |
| Duplicate          | POST        | `/duplicate/{id}`    | `DuplicatePipelineCommand`         |

### StageController

**Location**: `Candidate.Service/Controllers/StageController.cs`

| Action    | HTTP Method | Route   | Command/Query        |
| --------- | ----------- | ------- | -------------------- |
| GetStages | GET         | `/`     | `GetStageListQuery`  |
| Save      | POST        | `/`     | `SaveStageCommand`   |
| Delete    | DELETE      | `/{id}` | `DeleteStageCommand` |

---

## 13. Cross-Service Integration

### Internal Dependencies

| Service           | Dependency                 | Purpose                           |
| ----------------- | -------------------------- | --------------------------------- |
| Candidate.Service | Job.Service (indirect)     | Pipeline assigned to Jobs         |
| Candidate.Service | Account.Service (indirect) | User info for CreatedBy/UpdatedBy |

### Data Flow with Related Entities

```
┌────────────────┐        ┌────────────────┐
│    Pipeline    │───────▶│      Job       │
│   (Candidate)  │        │    (Job)       │
└────────────────┘        └────────────────┘
        │
        │ StageIds[]
        ▼
┌────────────────┐        ┌────────────────┐
│     Stage      │        │  Application   │
│   (Candidate)  │───────▶│  (Candidate)   │
└────────────────┘        │ CurrentStageId │
                          └────────────────┘
```

### Message Bus Events

Currently no cross-service message bus events for Pipeline/Stage entities. All operations are synchronous within Candidate.Service.

---

## 14. Security Architecture

### Authorization Policies

| Policy                                | Required Claims                       | Description                   |
| ------------------------------------- | ------------------------------------- | ----------------------------- |
| `BravoTALENTS`                        | `bravo_talents_subscription`          | Access to bravoTALENTS module |
| `RecruitmentPipelineManagementPolicy` | Company role with pipeline permission | Manage hiring processes       |

### Permission Matrix

| Action          | HR Admin | HR Manager | Recruiter |
| --------------- | -------- | ---------- | --------- |
| View pipelines  | ✅        | ✅          | ✅         |
| Create pipeline | ✅        | ✅          | ❌         |
| Edit pipeline   | ✅        | ✅          | ❌         |
| Delete pipeline | ✅        | ❌          | ❌         |
| Set default     | ✅        | ❌          | ❌         |

### Data Isolation

- Pipelines are scoped by `OrganizationalUnitId` (company)
- Users can only access pipelines within their company
- Cross-company access is blocked at query level

---

## 15. Performance Considerations

### Query Optimization

| Operation     | Optimization     | Implementation               |
| ------------- | ---------------- | ---------------------------- |
| Pipeline list | Pagination       | `PageBy(skip, take)`         |
| Stage loading | Batch load       | `GetByIdsAsync(stageIds)`    |
| Usage check   | Parallel queries | `await (jobCheck, appCheck)` |

### Caching Strategy

| Data          | Cache Type     | TTL     | Invalidation   |
| ------------- | -------------- | ------- | -------------- |
| Stage list    | Request-scoped | Request | On save/delete |
| Pipeline list | None (dynamic) | -       | -              |

### Expected Load

| Metric                | Expected Value |
| --------------------- | -------------- |
| Pipelines per company | 5-20           |
| Stages per company    | 10-30          |
| API calls per session | 10-20          |

---

## 16. Implementation Guide

### Backend Patterns

#### Command Handler Pattern

```csharp
public sealed class SavePipelineCommand : PlatformCqrsCommand<SavePipelineCommandResult>
{
    public PipelineDto Pipeline { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate()
            .And(x => Pipeline.Name.IsNotNullOrEmpty(), "Name required")
            .And(x => Pipeline.StageIds.Count >= 4, "Min 4 stages");
}

internal sealed class SavePipelineCommandHandler : PlatformCqrsCommandApplicationHandler<...>
{
    protected override async Task<PlatformValidationResult<SavePipelineCommand>> ValidateRequestAsync(...)
        => await validation
            .AndAsync(r => ValidateStageIdsExist(r), "Invalid stage IDs")
            .AndAsync(r => ValidateStageOrderConstraints(r), "Invalid stage order");

    protected override async Task<SavePipelineCommandResult> HandleAsync(...)
    {
        var toSave = request.Pipeline.NotHasSubmitId()
            ? request.Pipeline.MapToNewEntity()
            : await repository.GetByIdAsync(request.Pipeline.Id)
                .Then(existing => request.Pipeline.UpdateToEntity(existing));

        var saved = await repository.CreateOrUpdateAsync(toSave);
        return new SavePipelineCommandResult { Pipeline = new PipelineDto(saved) };
    }
}
```

### Frontend Patterns

#### Component with State

```typescript
export class HiringProcessPageComponent extends PlatformComponent {
    public query$ = new BehaviorSubject<Query>(new Query());
    public result$ = new BehaviorSubject<Result>(new Result());

    public loadHiringProcess = this.effectSimple(() => {
        return this.api.getList(this.query$.value).pipe(
            this.tapResponse(result => this.result$.next(result))
        );
    }, 'LoadPipelines');
}
```

#### Model with Business Logic

```typescript
export class HiringProcess {
    canDelete(): boolean {
        return !this.isUsedByJobs && !this.isDefault && !this.isUsedByApplications;
    }

    getNextAllowedStatuses(): StageStatus[] {
        switch (this.status) {
            case StageStatus.Draft: return [StageStatus.Published];
            case StageStatus.Published: return this.canUnpublishStatus()
                ? [StageStatus.Draft, StageStatus.Archived]
                : [StageStatus.Archived];
            case StageStatus.Archived: return [StageStatus.Published];
            default: return [];
        }
    }
}
```

---

## 17. Test Specifications

### Test Summary

| Category           | P0 (Critical) | P1 (High) | P2 (Medium) | Total  |
| ------------------ | :-----------: | :-------: | :---------: | :----: |
| Pipeline CRUD      |       3       |     2     |      1      |   6    |
| Stage Management   |       2       |     1     |      0      |   3    |
| Status Transitions |       2       |     1     |      0      |   3    |
| Validation Rules   |       2       |     2     |      1      |   5    |
| **Total**          |     **9**     |   **6**   |    **2**    | **17** |

---

### Pipeline CRUD Test Specs

#### TC-HP-001: Pipeline Creation [P0]

**Acceptance Criteria**:
- ✅ Pipeline created with valid data
- ✅ Status defaults to Draft
- ✅ CreatedDate and CreatedByUserId set
- ✅ Name uniqueness enforced

**Test Data**:
```json
{
  "name": "Test Pipeline",
  "stageIds": ["sourced-id", "applied-id", "offer-id", "hired-id"],
  "status": "Draft"
}
```

**GIVEN** HR Admin with create permission
**WHEN** submitting valid pipeline creation form
**THEN** pipeline created with Draft status

**Edge Cases**:
- ❌ Empty name → "Pipeline name is required"
- ❌ Duplicate name → "Pipeline name already exists"
- ❌ Less than 4 stages → "Pipeline must have at least 4 stages"

**Evidence**: `Candidate.Application/Pipelines/Commands/SavePipelineCommand.cs:17-27`

---

#### TC-HP-002: Pipeline Update [P0]

**Acceptance Criteria**:
- ✅ Pipeline updated with valid data
- ✅ UpdatedDate and UpdatedByUserId set
- ✅ StageIds can be modified (if not used by applications)

**GIVEN** existing pipeline in Draft status
**WHEN** HR Admin updates pipeline
**THEN** pipeline updated with new data

**Edge Cases**:
- ❌ Pipeline has applications → Stages cannot be modified
- ❌ Invalid status transition → "Invalid status transition"

**Evidence**: `Candidate.Application/Pipelines/Commands/SavePipelineCommand.cs:121-145`

---

#### TC-HP-003: Pipeline Deletion [P0]

**Acceptance Criteria**:
- ✅ Pipeline deleted when not used
- ✅ Cannot delete default pipeline
- ✅ Cannot delete pipeline used by jobs

**GIVEN** unused pipeline (not default, not used by jobs)
**WHEN** HR Admin deletes pipeline
**THEN** pipeline removed from database

**Edge Cases**:
- ❌ Is default pipeline → "Cannot delete default pipelines"
- ❌ Used by jobs → "Cannot delete pipeline that is being used by jobs"

**Evidence**: `Candidate.Application/Pipelines/Commands/DeletePipelineCommand.cs:52-71`

---

#### TC-HP-004: Pipeline Duplication [P1]

**Acceptance Criteria**:
- ✅ New pipeline created with Draft status
- ✅ Name suffixed with "(Copy)"
- ✅ StageIds copied from source

**GIVEN** existing Published pipeline
**WHEN** HR Admin duplicates pipeline
**THEN** new Draft pipeline created with same stages

**Evidence**: `Candidate.Application/Pipelines/Commands/DuplicatePipelineCommand.cs`

---

#### TC-HP-005: Set Default Pipeline [P1]

**Acceptance Criteria**:
- ✅ Selected pipeline marked as default
- ✅ Previous default unmarked
- ✅ Only Published pipelines can be default

**GIVEN** Published pipeline
**WHEN** HR Admin sets as default
**THEN** pipeline marked as default, previous default unmarked

**Edge Cases**:
- ❌ Draft pipeline → "Cannot set Draft pipeline as default"

**Evidence**: `Candidate.Application/Pipelines/Commands/SetDefaultPipelineCommand.cs`

---

#### TC-HP-006: Get Pipeline List [P2]

**Acceptance Criteria**:
- ✅ Paginated list returned
- ✅ Filtered by status
- ✅ Includes usage flags (isUsedByJobs, isUsedByApplications)

**GIVEN** multiple pipelines in database
**WHEN** querying with status filter
**THEN** filtered paginated list returned

**Evidence**: `Candidate.Application/Pipelines/Queries/GetPipelineListQuery.cs`

---

### Stage Management Test Specs

#### TC-HP-007: Stage Creation [P0]

**Acceptance Criteria**:
- ✅ Stage created with valid data
- ✅ Added to StageOrder.GlobalOrder before Offer
- ✅ Default status is Published

**Test Data**:
```json
{
  "nameMultiLanguage": { "defaultValue": "Technical Interview" },
  "category": "AssessmentAndInterview",
  "color": "#FF5733"
}
```

**GIVEN** HR Admin with stage management permission
**WHEN** creating new stage
**THEN** stage created and added to global order

**Edge Cases**:
- ❌ Empty name → "Stage name is required"

**Evidence**: `Candidate.Application/Stage/Command/SaveStageCommand.cs`

---

#### TC-HP-008: Stage Deletion [P0]

**Acceptance Criteria**:
- ✅ Stage deleted when not system stage
- ✅ System stages cannot be deleted

**GIVEN** custom stage not used in any pipeline
**WHEN** HR Admin deletes stage
**THEN** stage removed from database

**Edge Cases**:
- ❌ System stage → "Cannot delete system stage"

**Evidence**: `Candidate.Application/Stage/Command/DeleteStageCommand.cs`

---

#### TC-HP-009: Get Stage List [P1]

**Acceptance Criteria**:
- ✅ Paginated list returned
- ✅ Ordered by GlobalOrder
- ✅ Includes order number

**Evidence**: `Candidate.Application/Stage/Queries/GetStageListQuery.cs`

---

### Status Transition Test Specs

#### TC-HP-010: Publish Pipeline [P0]

**Acceptance Criteria**:
- ✅ Status changes from Draft to Published
- ✅ Pipeline can be assigned to jobs after publish

**GIVEN** pipeline in Draft status
**WHEN** HR Admin publishes
**THEN** status = Published

**Evidence**: `Pipeline.ValidateStatusTransition()`

---

#### TC-HP-011: Unpublish Pipeline [P0]

**Acceptance Criteria**:
- ✅ Status changes from Published to Draft
- ✅ Cannot unpublish if default or used by jobs

**GIVEN** Published pipeline (not default, not used)
**WHEN** HR Admin unpublishes
**THEN** status = Draft

**Edge Cases**:
- ❌ Is default → "Cannot unpublish default pipeline"
- ❌ Used by active jobs → "Cannot unpublish pipeline in use"

**Evidence**: `HiringProcess.canUnpublishStatus()`

---

#### TC-HP-012: Archive Pipeline [P1]

**Acceptance Criteria**:
- ✅ Status changes from Published to Archived
- ✅ Archived pipelines not shown in job creation

**GIVEN** Published pipeline
**WHEN** HR Admin archives
**THEN** status = Archived

**Evidence**: `Pipeline.ValidateStatusTransition()`

---

### Validation Rules Test Specs

#### TC-HP-013: Name Uniqueness [P0]

**Acceptance Criteria**:
- ✅ Async validation on name input
- ✅ Case-insensitive comparison
- ✅ Scoped to company

**GIVEN** existing pipeline named "Technical Hiring"
**WHEN** creating new pipeline with same name
**THEN** validation error shown

**Evidence**: `CheckPipelineNameUniquenessQuery.cs`, `save-hiring-process-form.component.ts:224-234`

---

#### TC-HP-014: Minimum Stages [P0]

**Acceptance Criteria**:
- ✅ At least 4 stages required
- ✅ Must include Sourced, Applied, Offer, Hired

**GIVEN** pipeline with only 3 stages
**WHEN** saving
**THEN** validation error "Pipeline must have at least 4 stages"

**Evidence**: `SavePipelineCommand.Validate()` line 25

---

#### TC-HP-015: Stage Order Constraint [P1]

**Acceptance Criteria**:
- ✅ First stage must be Sourced (position 0 in GlobalOrder)
- ✅ Last stage must be Hired (last position in GlobalOrder)

**GIVEN** pipeline with Hired not at end
**WHEN** saving
**THEN** validation error "Pipeline stages must follow company's stage order"

**Evidence**: `SavePipelineCommandHandler.ValidateStageOrderConstraints()` lines 98-119

---

#### TC-HP-016: Status Transition Validation [P1]

**Acceptance Criteria**:
- ✅ Only valid transitions allowed
- ✅ Draft → Archived blocked
- ✅ Archived → Draft blocked

**GIVEN** pipeline in Draft status
**WHEN** attempting to archive directly
**THEN** validation error "Invalid status transition"

**Evidence**: `Pipeline.ValidateStatusTransition()` lines 67-77

---

#### TC-HP-017: Usage Check Before Modification [P2]

**Acceptance Criteria**:
- ✅ Check if pipeline used by jobs before deletion
- ✅ Check if pipeline used by applications before stage modification

**GIVEN** pipeline used by active job
**WHEN** attempting to delete
**THEN** validation error with usage info

**Evidence**: `DeletePipelineCommandHandler.ValidateRequestAsync()` lines 65-70

---

### Default Pipeline Test Specs

#### TC-HP-018: Set Pipeline as Default [P0]

**Acceptance Criteria**:
- ✅ Only one pipeline can be default per company
- ✅ Previous default automatically unset when new default is set
- ✅ Default pipeline auto-selected for new jobs
- ✅ Menu item "Set as Default" only shown for published non-default pipelines

**GIVEN** Company has Pipeline A as default and Pipeline B published
**WHEN** HR Admin clicks "Set as Default" on Pipeline B
**THEN**:
- Pipeline B.IsDefault = true
- Pipeline A.IsDefault = false
- Success toast message displayed
- Pipeline list reloaded to show updated default

**Edge Cases**:
- ✅ Setting already-default pipeline → No-op, pipeline stays default
- ✅ Only Published pipelines can be set as default → Menu item hidden for Draft/Archived
- ✅ Default badge shown on pipeline card

**Evidence**:
- Backend: `SavePipelineCommand.cs` lines 18-19, 63-84 (IsSetDefaultOnly flag)
- Frontend Service: `hiring-process.service.ts` lines 57-71 (setDefaultPipeline method)
- Frontend Component: `hiring-process-page.component.ts` lines 143-157 (setDefaultPipeline effectSimple)
- Frontend Template: `hiring-process-page.component.html` lines 86-90 (menu item with conditional display)

---

#### TC-HP-019: Set Default Only Operation [P0]

**Acceptance Criteria**:
- ✅ Backend validates pipeline exists and user has access
- ✅ No full pipeline validation required when IsSetDefaultOnly = true
- ✅ Optimized update: only default status changed
- ✅ Operation fails gracefully if pipeline not found

**GIVEN** Pipeline with ID "pipeline-123" exists and is Published
**WHEN** API called: `POST /api/Pipeline { pipeline: { id: "pipeline-123" }, isSetDefaultOnly: true }`
**THEN**:
- SavePipelineCommandHandler calls HandleSetDefaultOnlyAsync
- Validation skips name/stages checks
- Only IsDefault flag updated
- Returns updated pipeline DTO

**Edge Cases**:
- ❌ Pipeline ID not provided → "Pipeline ID is required for set default operation"
- ❌ Pipeline doesn't exist → "Pipeline not found or access denied"
- ❌ Pipeline from different company → "Pipeline not found or access denied"

**Evidence**:
- Backend Command: `SavePipelineCommand.cs` lines 21-30 (conditional validation)
- Backend Handler: `SavePipelineCommand.cs` lines 63-84 (HandleSetDefaultOnlyAsync)
- Backend Validation: `SavePipelineCommand.cs` lines 93-100 (IsSetDefaultOnly check)

---

#### TC-HP-020: Default Pipeline UI Indicators [P1]

**Acceptance Criteria**:
- ✅ Default pipeline shows "Default" badge
- ✅ "Set as Default" menu item hidden for default pipeline
- ✅ "Set as Default" menu item hidden for Draft/Archived pipelines
- ✅ Checkmark icon displayed for "Set as Default" action

**GIVEN** Company has 3 pipelines: Default Published, Non-Default Published, Draft
**WHEN** HR Admin views pipeline list
**THEN**:
- Default Published shows: "Default" tag badge, menu has NO "Set as Default" option
- Non-Default Published shows: No badge, menu HAS "Set as Default" option
- Draft shows: No badge, menu has NO "Set as Default" option

**Evidence**:
- Template: `hiring-process-page.component.html` line 86 (`*ngIf="workflow?.isPublished && !workflow?.isDefault"`)
- Card Component: `workflow-card.component.ts` (showTag, tagText inputs)

---

#### TC-HP-021: Set Default Error Handling [P1]

**Acceptance Criteria**:
- ✅ User-friendly error message on failure
- ✅ Loading indicator during API call
- ✅ Pipeline list state preserved on error

**GIVEN** Network issue or server error
**WHEN** HR Admin clicks "Set as Default"
**THEN**:
- Error toast: "Set default hiring process failed"
- Pipeline list NOT reloaded
- UI returns to previous state

**Evidence**:
- Frontend Component: `hiring-process-page.component.ts` lines 150-152 (error callback)
- Frontend Template: `hiring-process-page.component.html` lines 29-33 (loading indicator)

---

#### TC-HP-022: Set Default Success Flow [P0]

**Acceptance Criteria**:
- ✅ Success message displayed
- ✅ Pipeline list reloaded to reflect changes
- ✅ Previous default shows no badge
- ✅ New default shows "Default" badge

**GIVEN** Pipeline B is non-default Published
**WHEN** HR Admin successfully sets Pipeline B as default
**THEN**:
- Success toast: "Set default hiring process successfully"
- reload() called to refresh pipeline list
- UI updated with new default badge placement

**Evidence**:
- Frontend Component: `hiring-process-page.component.ts` lines 146-149 (success callback)

---

#### TC-HP-023: Cannot Delete Default Pipeline [P0]

**Acceptance Criteria**:
- ✅ Delete menu item hidden for default pipeline
- ✅ Backend validation prevents deletion if default
- ✅ User must unset default before deletion

**GIVEN** Pipeline is set as default
**WHEN** HR Admin attempts to delete
**THEN**:
- Delete menu item not shown in UI
- If API called directly: validation error "Cannot delete default pipelines"

**Edge Cases**:
- Must set another pipeline as default first, then delete

**Evidence**:
- Frontend Template: `hiring-process-page.component.html` line 97 (`*ngIf="!workflow?.isDefault"`)
- Backend Validation: `DeletePipelineCommandHandler.ValidateRequestAsync()`

---

#### TC-HP-024: Cannot Unpublish Default Pipeline [P0]

**Acceptance Criteria**:
- ✅ Unpublish menu item hidden for default pipeline
- ✅ Backend validation prevents unpublish if default
- ✅ User must unset default before unpublishing

**GIVEN** Pipeline is Published and set as default
**WHEN** HR Admin attempts to unpublish
**THEN**:
- Unpublish menu item not shown in UI
- If API called directly: validation error per existing BR-HP-05

**Evidence**:
- Frontend Template: `hiring-process-page.component.html` line 68 (`&& !workflow?.isDefault`)
- Frontend Model: `HiringProcess.canUnpublishStatus()`

---

#### TC-HP-025: Set Default Multi-Language Support [P1]

**Acceptance Criteria**:
- ✅ "Set as Default" translated in all supported languages
- ✅ Success/error messages translated
- ✅ UI labels consistent across languages

**GIVEN** User switches language to Vietnamese
**WHEN** viewing pipeline menu
**THEN**:
- "Set as Default" → "Đặt làm mặc định"
- Success: "Đặt quy trình tuyển dụng mặc định thành công"
- Error: "Đặt quy trình tuyển dụng mặc định thất bại"

**Evidence**:
- English: `src/Web/bravoTALENTSClient/src/assets/i18n/en.json` lines 2451-2453
- Vietnamese: `src/Web/bravoTALENTSClient/src/assets/i18n/vi.json` lines 2103-2105
- Japanese: `src/Web/bravoTALENTSClient/src/assets/i18n/ja.json` (placeholder)
- Norwegian: `src/Web/bravoTALENTSClient/src/assets/i18n/nb.json` (placeholder)
- Swedish: `src/Web/bravoTALENTSClient/src/assets/i18n/sv.json` (placeholder)

---

#### TC-HP-026: Set Default API Pattern Consistency [P2]

**Acceptance Criteria**:
- ✅ Uses effectSimple pattern for reactive programming
- ✅ Automatic subscription cleanup with untilDestroyed
- ✅ Consistent error handling with tapResponse

**GIVEN** Frontend codebase standards
**WHEN** Implementing set default functionality
**THEN**:
- Method uses `readonly effectSimple` pattern
- Observable subscription auto-cleaned on component destroy
- Success/error callbacks use tapResponse operator

**Evidence**:
- Component: `hiring-process-page.component.ts` lines 143-157 (effectSimple implementation)
- Service: `hiring-process.service.ts` lines 57-71 (API call pattern)

---

## 18. Test Data Requirements

### Prerequisite Data

| Entity        | Count | Description                                                                         |
| ------------- | ----- | ----------------------------------------------------------------------------------- |
| Company       | 1     | Test company with bravoTALENTS subscription                                         |
| Users         | 3     | HR Admin, HR Manager, Recruiter                                                     |
| System Stages | 4     | Sourced, Applied, Offer, Hired                                                      |
| Custom Stages | 5     | In Review, Phone Interview, Technical Interview, Onsite Interview, Background Check |

### Test Data Setup Script

```javascript
// MongoDB seed data
db.stages.insertMany([
  { _id: "stage-sourced", companyId: "test-company", nameMultiLanguage: { defaultValue: "Sourced" }, isSystem: true, category: "Application" },
  { _id: "stage-applied", companyId: "test-company", nameMultiLanguage: { defaultValue: "Applied" }, isSystem: true, category: "Application" },
  { _id: "stage-offer", companyId: "test-company", nameMultiLanguage: { defaultValue: "Offer" }, isSystem: true, category: "Offer" },
  { _id: "stage-hired", companyId: "test-company", nameMultiLanguage: { defaultValue: "Hired" }, isSystem: true, category: "Hired" },
  { _id: "stage-review", companyId: "test-company", nameMultiLanguage: { defaultValue: "In Review" }, isSystem: false, category: "AssessmentAndInterview" }
]);

db.stageOrders.insertOne({
  _id: "order-1",
  companyId: "test-company",
  globalOrder: ["stage-sourced", "stage-applied", "stage-review", "stage-offer", "stage-hired"]
});
```

---

## 19. Edge Cases Catalog

### Pipeline Edge Cases

| ID       | Scenario                                         | Expected Behavior                       |
| -------- | ------------------------------------------------ | --------------------------------------- |
| EC-HP-01 | Create pipeline with special characters in name  | Allowed (Unicode support)               |
| EC-HP-02 | Create pipeline with max length name (500 chars) | Allowed                                 |
| EC-HP-03 | Delete last remaining pipeline                   | Allowed (if not default)                |
| EC-HP-04 | Duplicate pipeline with max length name          | Truncate and add "(Copy)"               |
| EC-HP-05 | Set default on already default pipeline          | No-op, no error, stays default          |
| EC-HP-06 | Publish already published pipeline               | No-op, no error                         |
| EC-HP-07 | Set default on Draft pipeline                    | Blocked, menu item hidden               |
| EC-HP-08 | Set default on Archived pipeline                 | Blocked, menu item hidden               |
| EC-HP-09 | Set default with no existing default             | Sets as first default                   |
| EC-HP-10 | Delete only published pipeline (is default)      | Blocked, must set another default first |

### Stage Edge Cases

| ID       | Scenario                                    | Expected Behavior      |
| -------- | ------------------------------------------- | ---------------------- |
| EC-HP-11 | Create stage with same name as system stage | Allowed (different ID) |
| EC-HP-12 | Delete stage used in archived pipeline      | Allowed                |
| EC-HP-13 | Reorder stages to put Hired in middle       | Blocked by validation  |

### Concurrent Access

| ID       | Scenario                                                    | Expected Behavior                        |
| -------- | ----------------------------------------------------------- | ---------------------------------------- |
| EC-HP-14 | Two users edit same pipeline simultaneously                 | Last write wins                          |
| EC-HP-15 | Delete pipeline while another user is editing               | Delete succeeds, editor gets 404 on save |
| EC-HP-16 | Two users set different pipelines as default simultaneously | Last set wins, previous default unset    |
| EC-HP-17 | User sets default while another deletes current default     | Set succeeds, no validation error        |

---

## 20. Regression Impact

### Affected Areas

| Area                    | Impact                      | Test Required                               |
| ----------------------- | --------------------------- | ------------------------------------------- |
| Job Creation            | Pipeline selection dropdown | Verify pipelines load correctly             |
| Candidate Pipeline View | Stage display               | Verify stages show from new structure       |
| Candidate Movement      | Stage transitions           | Verify movement works with new Stage entity |

### Backward Compatibility

- `Pipeline.Stages` (legacy) marked `@Obsolete` but still present
- Migration converts existing `PipelineStage` to new `Stage` entities
- `Pipeline.StageIds` is new source of truth

### Migration Verification

```sql
-- Verify migration success
db.pipelines.countDocuments({ stageIds: { $exists: true, $ne: [] } })
db.stages.countDocuments({})
db.stageOrders.countDocuments({})
```

---

## 21. Troubleshooting

### Common Issues

| Issue                        | Cause                                     | Solution                                            |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Cannot save pipeline         | Duplicate name                            | Use unique name                                     |
| Cannot delete pipeline       | In use by jobs                            | Remove pipeline assignment from jobs first          |
| Stages not loading           | API error                                 | Check network, verify authentication                |
| Cannot unpublish             | Is default pipeline                       | Set different default first                         |
| Stage order wrong            | GlobalOrder mismatch                      | Verify StageOrder document                          |
| Cannot set as default        | Pipeline is Draft/Archived                | Publish pipeline first                              |
| "Set as Default" menu hidden | Pipeline already default OR not published | Menu only shows for published non-default pipelines |

### Error Messages

| Message                                             | Meaning                                    | Resolution                                  |
| --------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| "Pipeline name is required"                         | Name field empty                           | Enter pipeline name                         |
| "Pipeline must have at least 4 stages"              | Missing required stages                    | Add at least Sourced, Applied, Offer, Hired |
| "Cannot delete default pipelines"                   | Trying to delete default                   | Set another pipeline as default first       |
| "Cannot delete pipeline used by jobs"               | Pipeline assigned to active jobs           | Remove from jobs or close jobs first        |
| "Pipeline stages must follow company's stage order" | Invalid stage sequence                     | Ensure Sourced first, Hired last            |
| "Pipeline ID is required for set default operation" | Missing pipeline ID in set default request | Provide valid pipeline ID                   |
| "Pipeline not found or access denied"               | Invalid pipeline ID or permission issue    | Verify pipeline exists and user has access  |
| "Set default hiring process failed"                 | Network or server error                    | Check connection, retry operation           |

### Diagnostic Queries

```javascript
// Check pipeline status
db.pipelines.findOne({ _id: "pipeline-id" }, { name: 1, status: 1, isDefault: 1, stageIds: 1 })

// Check stage order for company
db.stageOrders.findOne({ companyId: "company-id" })

// Check pipeline usage
db.jobs.countDocuments({ pipelineId: "pipeline-id" })
```

---

## 22. Operational Runbook

### Deployment Checklist

- [ ] Run data migration: `20251216000000_MigrateDefaultStagesForExistingCompanies`
- [ ] Verify Stage entities created for all companies
- [ ] Verify StageOrder created for all companies
- [ ] Verify Pipeline.StageIds populated from legacy Stages
- [ ] Test pipeline CRUD operations
- [ ] Test stage management

### Rollback Procedure

1. Migration is forward-only (no rollback script)
2. If issues, restore from MongoDB backup
3. Legacy `Pipeline.Stages` preserved for fallback

### Monitoring

| Metric               | Alert Threshold | Action                 |
| -------------------- | --------------- | ---------------------- |
| Pipeline save errors | >5/minute       | Check validation logic |
| Migration failures   | Any             | Review migration logs  |
| API 5xx errors       | >1%             | Check service health   |

---

## 23. Roadmap and Dependencies

### Current Version (1.0.0)

- ✅ Pipeline CRUD operations
- ✅ Stage management
- ✅ Status workflow
- ✅ Default pipeline
- ✅ Usage tracking

### Planned Enhancements

| Feature                      | Target Version | Priority |
| ---------------------------- | -------------- | -------- |
| Stage templates per category | 1.1.0          | P2       |
| Pipeline analytics           | 1.2.0          | P2       |
| Bulk stage operations        | 1.2.0          | P3       |
| Pipeline versioning          | 2.0.0          | P3       |

### Dependencies

| Feature                  | Depends On       | Status  |
| ------------------------ | ---------------- | ------- |
| Job Pipeline Assignment  | This feature     | Ready   |
| Candidate Stage Movement | Stage entities   | Ready   |
| Pipeline Analytics       | Reporting module | Pending |

---

## 24. Related Documentation

### Parent Feature

- [Recruitment Pipeline Feature](README.RecruitmentPipelineFeature.md) - Complete recruitment workflow

### Related Features

- [Candidate Management](recruitment/README.CandidateManagementFeature.md) - Candidate handling and pipeline movement
- [Interview Management](recruitment/README.InterviewManagementFeature.md) - Interview scheduling per stage

### Technical References

- [Backend Patterns](../../docs/claude/backend-patterns.md) - CQRS and repository patterns
- [Frontend Patterns](../../docs/claude/frontend-patterns.md) - Angular component patterns

---

## 25. Glossary

| Term                 | Definition                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| **Pipeline**         | A hiring process/workflow consisting of ordered stages                    |
| **Stage**            | A step in the hiring process (e.g., Phone Interview, Technical Interview) |
| **System Stage**     | Required stage that cannot be deleted (Sourced, Applied, Offer, Hired)    |
| **Custom Stage**     | User-created stage for company-specific needs                             |
| **StageOrder**       | Company-wide ordering of all stages (GlobalOrder)                         |
| **Default Pipeline** | Pipeline auto-selected when creating new jobs                             |
| **Published**        | Pipeline status allowing assignment to jobs                               |
| **Draft**            | Pipeline status for editing before publishing                             |
| **Archived**         | Pipeline status for retired workflows                                     |

---

## 26. Version History

| Version | Date       | Author      | Changes                 |
| ------- | ---------- | ----------- | ----------------------- |
| 1.0.0   | 2026-01-14 | Claude Code | Initial feature release |

---

*Documentation follows BravoSUITE 26-section standard template*
*Last updated: 2026-01-14*
