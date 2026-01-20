---
# Module Discovery Metadata (Required for /idea, /refine auto-context)
# AI agents parse this frontmatter to match user keywords to modules
module: TextSnippet
aliases: [text-snippet, textsnippet, txt]
keywords:
    - snippet
    - text
    - search
    - category
    - full-text
    - note
    - clipboard
features:
    - task
    - todo
    - checklist
    - item
entities:
    - TextSnippetEntity
    - TextSnippetCategory
    - TaskItemEntity
domain_path: src/Backend/PlatformExampleApp.TextSnippet.Domain
api_prefix: /api/TextSnippet
status: active
---

# TextSnippet Feature Documentation

**Module**: PlatformExampleApp
**Feature**: TextSnippet
**Version**: 2.0.0
**Last Updated**: 2026-01-08

---

## Table of Contents

1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [Design Reference](#design-reference)
4. [Architecture](#architecture)
5. [Domain Model](#domain-model)
6. [Core Workflows](#core-workflows)
7. [API Reference](#api-reference)
8. [Frontend Components](#frontend-components)
9. [Backend Controllers](#backend-controllers)
10. [Cross-Service Integration](#cross-service-integration)
11. [Permission System](#permission-system)
12. [Test Specifications](#test-specifications)
13. [Troubleshooting](#troubleshooting)
14. [Related Documentation](#related-documentation)
15. [Version History](#version-history)

---

## Overview

> **Objective**: Demonstrate all core EasyPlatform patterns including CQRS, entity management, background jobs, and message bus integration.
>
> **Core Values**: Educational - Pattern-Complete - Multi-Database

TextSnippet is a comprehensive text snippet management module within the EasyPlatform example application. It demonstrates all core platform patterns including CQRS commands/queries, entity management, background jobs, message bus integration, and multi-database support.

### Key Capabilities

- **Text Snippet CRUD**: Create, read, update, delete text snippets with category organization
- **Task Item Management**: Simple task tracking with status
- **Background Jobs**: Manual and scheduled job patterns
- **Message Bus**: Producer/consumer event-driven patterns
- **Multi-Database**: SQL Server, MongoDB, PostgreSQL demonstration

---

## Business Requirements

> **Objective**: Provide a reference implementation for all EasyPlatform patterns
>
> **Core Values**: Simplicity - Completeness - Clarity

### Snippet Management

#### FR-TS-01: Create/Update Snippets

| Aspect          | Details                                                   |
| --------------- | --------------------------------------------------------- |
| **Description** | Users can create and update text snippets with categories |
| **Scope**       | All authenticated users                                   |
| **Validation**  | SnippetText required, Category optional                   |
| **Evidence**    | `SaveSnippetTextCommand.cs`                               |

#### FR-TS-02: Search Snippets

| Aspect          | Details                                          |
| --------------- | ------------------------------------------------ |
| **Description** | Full-text search across snippets with pagination |
| **Output**      | Paginated results with relevance scoring         |
| **Evidence**    | `SearchSnippetTextQuery.cs`                      |

### Task Management

#### FR-TS-03: Task CRUD

| Aspect          | Details                                                |
| --------------- | ------------------------------------------------------ |
| **Description** | Simple task management with title, description, status |
| **Scope**       | All authenticated users                                |
| **Evidence**    | `TaskItemController.cs`                                |

---

## Design Reference

| Information       | Details                             |
| ----------------- | ----------------------------------- |
| **Figma Link**    | _(Example app - no formal designs)_ |
| **Screenshots**   | _(To be added)_                     |
| **UI Components** | Forms, Lists, Tables, Search inputs |

### Key UI Patterns

- **Snippet List**: Paginated table with search
- **Snippet Form**: Create/edit form with category dropdown
- **Task List**: Simple list with status toggles

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TextSnippet.Service                           │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Controller  │──▶│ Command Handler │──▶│   Repository    │   │
│  └─────────────┘   └─────────────────┘   └─────────────────┘   │
│         │                   │                     │             │
│         │                   ▼                     │             │
│         │          ┌─────────────────┐           │             │
│         │          │  Entity Event   │           │             │
│         │          │    Handler      │           │             │
│         │          └────────┬────────┘           │             │
└─────────────────────────────┼────────────────────┼─────────────┘
                              │                    │
                              ▼                    ▼
                    ┌─────────────────┐   ┌─────────────────┐
                    │   Message Bus   │   │   Database      │
                    │   (RabbitMQ)    │   │ (SQL/Mongo/PG)  │
                    └─────────────────┘   └─────────────────┘
```

### Service Responsibilities

| Service                 | Responsibility                      |
| ----------------------- | ----------------------------------- |
| TextSnippet.Domain      | Business entities, validation rules |
| TextSnippet.Application | CQRS commands/queries, handlers     |
| TextSnippet.Api         | REST API controllers                |
| TextSnippet.Persistence | Database context, migrations        |

### Design Patterns

| Pattern       | Usage                       | Evidence                              |
| ------------- | --------------------------- | ------------------------------------- |
| CQRS          | Commands/Queries separation | `UseCaseCommands/`, `UseCaseQueries/` |
| Repository    | Data access abstraction     | `IPlatformQueryableRootRepository<T>` |
| Entity Events | Side effects handling       | `MessageBus/Producers/`               |

---

## Domain Model

### Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│   TextSnippetEntity     │       │  TextSnippetCategory    │
├─────────────────────────┤       ├─────────────────────────┤
│ Id: string              │──────▶│ Id: string              │
│ SnippetText: string     │       │ Name: string            │
│ FullText: string        │       │ Description: string     │
│ CategoryId: string      │       └─────────────────────────┘
└─────────────────────────┘

┌─────────────────────────┐
│    TaskItemEntity       │
├─────────────────────────┤
│ Id: string              │
│ Title: string           │
│ Description: string     │
│ IsCompleted: bool       │
└─────────────────────────┘
```

### TextSnippetEntity

**Location**: `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs`

| Property    | Type    | Description                 |
| ----------- | ------- | --------------------------- |
| Id          | string  | Unique identifier (ULID)    |
| SnippetText | string  | Short snippet text          |
| FullText    | string  | Full text content           |
| CategoryId  | string? | Optional category reference |

### TaskItemEntity

**Location**: `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TaskItemEntity.cs`

| Property    | Type   | Description       |
| ----------- | ------ | ----------------- |
| Id          | string | Unique identifier |
| Title       | string | Task title        |
| Description | string | Task description  |
| IsCompleted | bool   | Completion status |

---

## Core Workflows

### Workflow 1: Create/Update Snippet

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│Controller│───▶│ Handler  │───▶│Repository│
│ Action   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │  Event   │
                               │ Producer │
                               └──────────┘
```

**Steps**:

1. **Trigger**: User submits snippet form
2. **Validation**: Handler validates SnippetText required
3. **Processing**: CreateOrUpdate via repository
4. **Side Effects**: Entity event published to message bus
5. **Result**: SaveSnippetTextCommandResult returned

**Key Files**:

- `SaveSnippetTextCommand.cs` - Command handler
- `TextSnippetEntityEventBusMessageProducer.cs` - Event producer

### Workflow 2: Search Snippets

**Steps**:

1. **Trigger**: User enters search term
2. **Processing**: Full-text search query
3. **Result**: Paginated SearchSnippetTextQueryResult

**Key Files**:

- `SearchSnippetTextQuery.cs` - Query handler

---

## API Reference

### Endpoints Summary

| Method | Endpoint                                | Description           | Auth   |
| ------ | --------------------------------------- | --------------------- | ------ |
| POST   | `/api/TextSnippet/SaveSnippetText`      | Create/update snippet | Bearer |
| GET    | `/api/TextSnippet/GetSnippetTextDetail` | Get snippet by ID     | Bearer |
| POST   | `/api/TextSnippet/SearchSnippetTexts`   | Search snippets       | Bearer |
| POST   | `/api/TextSnippet/SaveSnippetCategory`  | Save category         | Bearer |

### Request/Response Examples

See [API-REFERENCE.md](./API-REFERENCE.md) for detailed examples.

---

## Frontend Components

### Component Hierarchy

```
PlaygroundTextSnippetApp (Container)
├── SnippetListComponent
│   ├── SnippetTableComponent
│   └── SearchInputComponent
├── SnippetDetailComponent (Form)
└── TaskListComponent
    └── TaskItemComponent
```

### Key Components

| Component              | Type           | Purpose          | Path                            |
| ---------------------- | -------------- | ---------------- | ------------------------------- |
| SnippetListComponent   | Container      | List with search | `apps/playground-text-snippet/` |
| SnippetDetailComponent | Form           | Create/edit form | `apps/playground-text-snippet/` |
| TaskListComponent      | Presentational | Task display     | `apps/playground-text-snippet/` |

---

## Backend Controllers

### TextSnippetController

**Location**: `src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs`

| Action               | Method | Route                   | Command/Query              |
| -------------------- | ------ | ----------------------- | -------------------------- |
| SaveSnippetText      | POST   | `/SaveSnippetText`      | SaveSnippetTextCommand     |
| GetSnippetTextDetail | GET    | `/GetSnippetTextDetail` | GetSnippetTextDetailQuery  |
| SearchSnippetTexts   | POST   | `/SearchSnippetTexts`   | SearchSnippetTextQuery     |
| SaveSnippetCategory  | POST   | `/SaveSnippetCategory`  | SaveSnippetCategoryCommand |

### TaskItemController

**Location**: `src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/TaskItemController.cs`

| Action | Method | Route   | Command/Query         |
| ------ | ------ | ------- | --------------------- |
| GetAll | GET    | `/`     | GetTaskItemsQuery     |
| Save   | POST   | `/`     | SaveTaskItemCommand   |
| Delete | DELETE | `/{id}` | DeleteTaskItemCommand |

---

## Cross-Service Integration

### Message Bus Events

| Event                                 | Producer            | Consumer        | Purpose        |
| ------------------------------------- | ------------------- | --------------- | -------------- |
| TextSnippetEntityEventBusMessage      | TextSnippet.Service | (Demo consumer) | Snippet sync   |
| SaveTextSnippetCommandEventBusMessage | TextSnippet.Service | (Demo consumer) | Command events |

### Event Flow

```
TextSnippet.Service                     Demo Consumer
     │                                      │
     │  1. Snippet Created/Updated          │
     ▼                                      │
┌─────────────────┐                         │
│ EntityEvent     │                         │
│ BusProducer     │────RabbitMQ────────────▶│
└─────────────────┘                         ▼
                                    ┌─────────────────┐
                                    │ Message         │
                                    │ Consumer        │
                                    └─────────────────┘
```

---

## Permission System

### Role Permissions

| Role          | View  | Create | Edit  | Delete |
| ------------- | :---: | :----: | :---: | :----: |
| Authenticated |   ✅   |   ✅    |   ✅   |   ✅    |
| Anonymous     |   ❌   |   ❌    |   ❌   |   ❌    |

### Permission Checks

**Backend Authorization**:

```csharp
// Evidence: TextSnippetController.cs
[PlatformAuthorize]
public class TextSnippetController : PlatformBaseController
```

---

## Test Specifications

### Test Summary

| Category     |  P0   |  P1   |  P2   | Total |
| ------------ | :---: | :---: | :---: | :---: |
| Snippet CRUD |   2   |   2   |   1   |   5   |
| Search       |   1   |   1   |   0   |   2   |
| Task CRUD    |   1   |   1   |   0   |   2   |
| **Total**    | **4** | **4** | **1** | **9** |

### Snippet CRUD Test Specs

#### TC-TS-001: Create Snippet Successfully [P0]

**Acceptance Criteria**:

- ✅ Authenticated user can create snippet
- ✅ SnippetText is saved correctly
- ✅ Category association works

**GIVEN** authenticated user
**WHEN** POST /api/TextSnippet/SaveSnippetText with valid data
**THEN** snippet is created with generated ID

**Evidence**: `SaveSnippetTextCommand.cs`

#### TC-TS-002: Search Snippets [P0]

**Acceptance Criteria**:

- ✅ Full-text search returns matching results
- ✅ Pagination works correctly

**GIVEN** snippets exist in database
**WHEN** POST /api/TextSnippet/SearchSnippetTexts with search term
**THEN** matching snippets returned with pagination

**Evidence**: `SearchSnippetTextQuery.cs`

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

### Common Issues

#### Database Connection Issues

**Symptoms**: Service fails to start, connection timeout errors

**Causes**:

1. Database server not running
2. Connection string incorrect
3. Firewall blocking port

**Resolution**:

- Verify Docker containers are running
- Check appsettings.json connection strings
- Test network connectivity

### Diagnostic Queries

```sql
-- Check snippet count
SELECT COUNT(*) FROM TextSnippets;

-- Find snippets by category
SELECT * FROM TextSnippets WHERE CategoryId = 'category-id';
```

---

## Related Documentation

- **[API Reference](./API-REFERENCE.md)** - Detailed API endpoints
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Feature Index](./INDEX.md)** - Quick navigation
- **[Test Specifications](../../test-specs/TextSnippet/README.md)** - Test cases
- **[Backend Patterns](../../claude/backend-patterns.md)** - Platform patterns

---

## Version History

| Version | Date       | Changes                                      |
| ------- | ---------- | -------------------------------------------- |
| 2.0.0   | 2026-01-08 | Template compliance: expanded to 15 sections |
| 1.0.0   | 2025-01-01 | Initial documentation                        |

---

_Last Updated: 2026-01-08_
