# TextSnippet - Text Snippet Management

## Overview

TextSnippet is a comprehensive text snippet management module within the EasyPlatform example application. It demonstrates all core platform patterns including CQRS commands/queries, entity management, background jobs, message bus integration, and multi-database support.

**Key Capabilities:**
- Text snippet CRUD operations with category organization
- Task item management with status tracking
- Background job scheduling and execution
- Message bus producer/consumer patterns
- Multi-database demonstration (SQL Server, MongoDB, PostgreSQL)

---

## Architecture

### Backend Services
- **Service:** `PlatformExampleApp.TextSnippet.Api` (.NET 9)
- **API Route:** `/api/[Controller]`
- **Authentication:** JWT Bearer (via Identity Server)

### Frontend Applications
- **Playground App:** `playground-text-snippet` (Angular 19)
- **Shared Library:** `platform-core` (base components and utilities)
- **Domain Library:** `apps-domains` (domain models and API services)

### Technology Stack
- **Backend:** C# / .NET 9, Entity Framework Core, CQRS pattern
- **Frontend:** Angular 19, Reactive Forms, PlatformVmStore
- **Database:** SQL Server, MongoDB, PostgreSQL (multi-db demo)
- **Messaging:** RabbitMQ (for cross-service events)

---

## Sub-Modules & Feature Architecture

### 1. Snippet Management

**Description:** Core text snippet management system for creating, editing, and organizing text snippets with categories.

**Domain Entities:**
- `TextSnippetEntity` - Main snippet aggregate with snippet text, full text, and category
- `TextSnippetCategory` - Category for organizing snippets
- `MultiDbDemoEntity` - Demonstrates multi-database patterns

**Controllers & Endpoints:**
- `TextSnippetController` - CRUD operations for snippets
  - `POST /api/TextSnippet/SaveSnippetText` - Create/update snippet
  - `GET /api/TextSnippet/GetSnippetTextDetail` - Get snippet by ID
  - `POST /api/TextSnippet/SearchSnippetTexts` - Search with pagination

#### Features

##### 1.1 Create/Edit Snippet
- **Description:** Allows users to create and edit text snippets with category assignment
- **Backend API:** `POST /api/TextSnippet/SaveSnippetText`
- **Commands:** `SaveSnippetTextCommand`
- **Queries:** `GetSnippetTextDetailQuery`
- **Frontend:** TextSnippetDetail component with form-based editing
- **Workflow:**
  1. User opens snippet editor
  2. Fills in snippet text and selects category
  3. System validates and saves with audit trail
  4. Triggers entity event for cross-service sync

##### 1.2 Search Snippets
- **Description:** Full-text search across snippets with pagination and filtering
- **Backend API:** `POST /api/TextSnippet/SearchSnippetTexts`
- **Queries:** `SearchSnippetTextQuery`
- **Frontend:** List view with search input and pagination
- **Workflow:**
  1. User enters search term
  2. System performs full-text search
  3. Returns paginated results with relevance scoring

##### 1.3 Category Management
- **Description:** Organize snippets into categories for better organization
- **Backend API:** `POST /api/TextSnippet/SaveSnippetCategory`
- **Commands:** `SaveSnippetCategoryCommand`
- **Frontend:** Category dropdown in snippet form

### 2. Task Management

**Description:** Simple task item management demonstrating CRUD patterns.

**Domain Entities:**
- `TaskItemEntity` - Task with title, description, and completion status

**Controllers & Endpoints:**
- `TaskItemController` - Task CRUD operations

#### Features

##### 2.1 Task List
- **Description:** Display all tasks with status indicators
- **Frontend:** TaskList component with PlatformVmStore

##### 2.2 Task Detail
- **Description:** View and edit individual task details
- **Frontend:** TaskDetail component with form validation

### 3. Background Jobs Demo

**Description:** Demonstrates platform background job patterns.

**Job Types:**
- `DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor` - Manual job scheduling
- Recurring job patterns with cron expressions

### 4. Message Bus Demo

**Description:** Demonstrates cross-service communication patterns.

**Producers:**
- `TextSnippetEntityEventBusMessageProducer` - Publishes snippet entity events
- `SaveTextSnippetCommandEventBusMessageProducer` - Command event publishing

**Consumers:**
- `SnippetTextEntityEventBusConsumer` - Handles incoming entity events
- `SaveSnippetTextCommandEventBusMessageConsumer` - Command event handling

---

## File Organization

```
src/PlatformExampleApp/
├── PlatformExampleApp.TextSnippet.Api/
│   └── Controllers/
│       ├── TextSnippetController.cs
│       └── TaskItemController.cs
│
├── PlatformExampleApp.TextSnippet.Application/
│   ├── UseCaseCommands/
│   │   ├── SaveSnippetTextCommand.cs
│   │   └── Category/SaveSnippetCategoryCommand.cs
│   ├── UseCaseQueries/
│   │   ├── SearchSnippetTextQuery.cs
│   │   └── GetSnippetTextDetailQuery.cs
│   ├── BackgroundJob/
│   │   └── DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor.cs
│   └── MessageBus/
│       ├── Producers/
│       └── Consumers/
│
├── PlatformExampleApp.TextSnippet.Domain/
│   └── Entities/
│       ├── TextSnippetEntity.cs
│       ├── TextSnippetCategory.cs
│       └── TaskItemEntity.cs
│
└── PlatformExampleApp.TextSnippet.Persistence/
    └── TextSnippetDbContext.cs
```

---

## Related Documentation

- **[API Reference](./API-REFERENCE.md)** - Detailed API endpoints
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Feature Index](./INDEX.md)** - Quick navigation
- **[Test Specifications](../../test-specs/TextSnippet/README.md)** - Test cases
