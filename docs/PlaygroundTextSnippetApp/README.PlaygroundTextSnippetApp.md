# Playground Text Snippet Application

> **Comprehensive Technical Documentation for the EasyPlatform Example Application**

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [TextSnippet Feature](#textsnippet-feature)
- [TaskItem Feature](#taskitem-feature)
- [Frontend Components](#frontend-components)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Configuration Guide](#configuration-guide)
- [Test Specifications](#test-specifications)
  - [Priority Levels](#priority-levels)
  - [P0 Critical Tests](#p0-critical-tests-smoke-tests)
  - [P1 High Priority Tests](#p1-high-priority-tests)
  - [P2 Medium Priority Tests](#p2-medium-priority-tests)
  - [P3 Low Priority Tests](#p3-low-priority-tests-edge-cases)
- [Troubleshooting](#troubleshooting)
- [Version History](#version-history)

---

## Overview

The Playground Text Snippet Application is a comprehensive example application demonstrating all EasyPlatform framework patterns including Clean Architecture, CQRS, state management, reactive forms, and modern Angular development practices.

### Key Capabilities

- **Text Snippet Management**: Full-text search, CRUD operations, pagination
- **Task Management**: Complete workflow with statuses, priorities, subtasks
- **Soft Delete/Restore**: Non-destructive deletion with recovery capability
- **Real-time Statistics**: Live aggregate data for tasks
- **Advanced Filtering**: Multi-criteria filtering with search
- **Draft Auto-save**: LocalStorage-based form drafts
- **Reactive Forms**: FormArray for dynamic subtasks with validation

### Technology Stack

| Layer                | Technology                                    |
| -------------------- | --------------------------------------------- |
| **Backend**          | .NET 9, ASP.NET Core Web API                  |
| **Frontend**         | Angular 19, Nx Workspace                      |
| **Database**         | PostgreSQL (primary), MongoDB (multi-db demo) |
| **Cache**            | Redis                                         |
| **Message Bus**      | RabbitMQ                                      |
| **State Management** | PlatformVmStore (ComponentStore-based)        |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Playground Text Snippet Application                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────┐                    ┌────────────────────────────┐   │
│  │   Angular Frontend     │                    │     .NET Backend API       │   │
│  │   (localhost:4001)     │◄──── HTTP/REST ───►│     (localhost:5001)       │   │
│  │                        │                    │                            │   │
│  │ ┌────────────────────┐ │                    │ ┌────────────────────────┐ │   │
│  │ │  AppComponent      │ │                    │ │  TextSnippetController │ │   │
│  │ │  • TextSnippet Tab │ │                    │ │  • /api/TextSnippet    │ │   │
│  │ │  • Tasks Tab       │ │                    │ └────────────────────────┘ │   │
│  │ └────────────────────┘ │                    │                            │   │
│  │                        │                    │ ┌────────────────────────┐ │   │
│  │ ┌────────────────────┐ │                    │ │  TaskItemController    │ │   │
│  │ │  TaskListComponent │ │                    │ │  • /api/TaskItem       │ │   │
│  │ │  TaskDetailComponent│ │                    │ └────────────────────────┘ │   │
│  │ │  TextSnippetDetail │ │                    │                            │   │
│  │ └────────────────────┘ │                    │ ┌────────────────────────┐ │   │
│  │                        │                    │ │  Application Layer     │ │   │
│  │ ┌────────────────────┐ │                    │ │  • CQRS Handlers       │ │   │
│  │ │  State Management  │ │                    │ │  • Domain Events       │ │   │
│  │ │  • AppStore        │ │                    │ │  • Background Jobs     │ │   │
│  │ │  • TaskListStore   │ │                    │ └────────────────────────┘ │   │
│  │ └────────────────────┘ │                    │                            │   │
│  └────────────────────────┘                    └────────────────────────────┘   │
│           │                                                  │                   │
│           ▼                                                  ▼                   │
│  ┌────────────────────────┐                    ┌────────────────────────────┐   │
│  │   Platform-Core Lib    │                    │     Infrastructure         │   │
│  │ • PlatformComponent    │                    │ ┌──────────────────────┐   │   │
│  │ • PlatformVmStore      │                    │ │ PostgreSQL :54320    │   │   │
│  │ • PlatformApiService   │                    │ │ MongoDB :27017       │   │   │
│  │ • Form Validators      │                    │ │ Redis :6379          │   │   │
│  └────────────────────────┘                    │ │ RabbitMQ :15672      │   │   │
│                                                 │ └──────────────────────┘   │   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

#### Backend Services

| Service                   | Responsibility                                |
| ------------------------- | --------------------------------------------- |
| **TextSnippetController** | Text snippet CRUD, search with pagination     |
| **TaskItemController**    | Task CRUD, filtering, statistics, soft delete |
| **Application Layer**     | CQRS handlers, validation, domain events      |
| **Persistence Layer**     | EF Core repositories, PostgreSQL/MongoDB      |

#### Frontend Services

| Service                   | Responsibility                |
| ------------------------- | ----------------------------- |
| **TextSnippetApiService** | HTTP calls for text snippets  |
| **TaskItemApiService**    | HTTP calls for tasks          |
| **AppStore**              | Text snippet state management |
| **TaskListStore**         | Task list state management    |

### Design Patterns Used

| Pattern                    | Usage                          | Location                                  |
| -------------------------- | ------------------------------ | ----------------------------------------- |
| **CQRS**                   | Command/Query separation       | Application layer handlers                |
| **Repository**             | Data access abstraction        | Persistence layer                         |
| **Store (ComponentStore)** | Reactive state management      | Frontend stores                           |
| **Page Object Model**      | E2E test organization          | Playwright tests                          |
| **Form Component**         | Reactive forms with validation | TaskDetailComponent                       |
| **Strategy**               | Full-text search providers     | IPlatformFullTextSearchPersistenceService |

---

## TextSnippet Feature

The TextSnippet module provides a simple CRUD interface for managing text snippets with full-text search capabilities.

### Feature Capabilities

- Search snippets with full-text matching
- Create new snippets (SnippetText + FullText)
- Update existing snippets
- Pagination with configurable page size
- Selection highlighting in search results

### Entity Model

```csharp
public class TextSnippetEntity : RootAuditedEntity<TextSnippetEntity, string, string>
{
    // Core Properties
    public string SnippetText { get; set; }           // Short code/identifier (100 chars)
    public string FullText { get; set; }              // Full content (4000 chars)
    public SnippetStatus Status { get; set; }         // Draft, Published, Archived
    public string? CategoryId { get; set; }           // FK to category
    public List<string> Tags { get; set; } = [];      // Tag list
    public int ViewCount { get; set; }                // Analytics
    public DateTime? PublishedDate { get; set; }
    public bool IsDeleted { get; set; }               // Soft delete flag

    // Computed Properties
    [ComputedEntityProperty]
    public int WordCount { get => SnippetText?.Split(' ').Length ?? 0; set { } }

    [ComputedEntityProperty]
    public bool IsRecentlyModified {
        get => LastUpdatedDate.HasValue && (DateTime.UtcNow - LastUpdatedDate.Value).TotalDays <= 7;
        set { }
    }

    // Static Expressions for Queries
    public static Expression<Func<TextSnippetEntity, bool>> IsActiveExpr()
        => e => !e.IsDeleted && e.Status == SnippetStatus.Published;

    public static Expression<Func<TextSnippetEntity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.SnippetText, e => e.FullText, e => e.FullTextSearch];
}
```

### User Flow

```
1. User enters search text in input field
                    ↓
2. AppStore.loadSnippetTextItems() triggered (with 500ms debounce)
                    ↓
3. API call: GET /api/TextSnippet/search?searchText=...&skipCount=0&maxResultCount=10
                    ↓
4. Results displayed in grid with pagination
                    ↓
5. User clicks row → AppStore.toggleSelectTextSnippedGridRow()
                    ↓
6. Detail form loads selected snippet
                    ↓
7. User edits SnippetText/FullText → hasSelectedSnippetItemChanged tracks changes
                    ↓
8. User clicks Create/Update → onSaveSelectedTextSnippetItem()
                    ↓
9. API call: POST /api/TextSnippet/save
                    ↓
10. Success → Form resets (create) or updates (edit), list refreshes
```

---

## TaskItem Feature

The TaskItem module provides comprehensive task management with workflow states, subtasks, filtering, and statistics.

### Feature Capabilities

- **CRUD Operations**: Create, read, update, delete tasks
- **Workflow States**: Todo → In Progress → Completed/Cancelled
- **Priority Levels**: Low, Medium, High, Critical
- **Subtasks**: Hierarchical task breakdown with completion tracking
- **Soft Delete**: Non-destructive deletion with restore capability
- **Statistics**: Real-time aggregates (total, active, completed, overdue, due soon)
- **Advanced Filtering**: Status, priority, overdue, due soon, search, tags
- **Draft Auto-save**: Form drafts saved to localStorage

### Entity Model

```csharp
public class TaskItemEntity : RootAuditedEntity<TaskItemEntity, string, string>
{
    // Core Properties
    public string Title { get; set; }                 // Required, max 200 chars
    public string? Description { get; set; }          // Optional, max 4000 chars
    public TaskItemStatus Status { get; set; }        // Todo, InProgress, Completed, Cancelled
    public TaskItemPriority Priority { get; set; }    // Low, Medium, High, Critical
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string? AssigneeId { get; set; }
    public string? RelatedSnippetId { get; set; }     // FK to TextSnippet
    public List<string> Tags { get; set; } = [];

    // Soft Delete
    public bool IsDeleted { get; set; }
    public DateTime? DeletedDate { get; set; }
    public string? DeletedBy { get; set; }

    // Subtasks (JSON-stored value objects)
    public List<SubTaskItem> SubTasks { get; set; } = [];

    // Computed Properties
    [ComputedEntityProperty]
    public bool IsOverdue {
        get => DueDate.HasValue && DueDate.Value < DateTime.UtcNow
               && Status != TaskItemStatus.Completed
               && Status != TaskItemStatus.Cancelled
               && !IsDeleted;
        set { }
    }

    [ComputedEntityProperty]
    public int? DaysUntilDue {
        get => DueDate.HasValue ? (int)(DueDate.Value - DateTime.UtcNow).TotalDays : null;
        set { }
    }

    [ComputedEntityProperty]
    public decimal CompletionPercentage {
        get => SubTasks.Count == 0 ? 0 :
               (decimal)SubTasks.Count(s => s.IsCompleted) / SubTasks.Count * 100;
        set { }
    }

    // Instance Methods
    public void MarkCompleted()
    {
        Status = TaskItemStatus.Completed;
        CompletedDate = DateTime.UtcNow;
    }

    public void SoftDelete(string deletedBy)
    {
        IsDeleted = true;
        DeletedDate = DateTime.UtcNow;
        DeletedBy = deletedBy;
    }

    public void Restore()
    {
        IsDeleted = false;
        DeletedDate = null;
        DeletedBy = null;
    }

    // Static Expressions
    public static Expression<Func<TaskItemEntity, bool>> OverdueExpr()
        => e => e.DueDate.HasValue && e.DueDate.Value < DateTime.UtcNow
             && e.Status != TaskItemStatus.Completed
             && e.Status != TaskItemStatus.Cancelled
             && !e.IsDeleted;

    public static Expression<Func<TaskItemEntity, bool>> DueSoonExpr(int withinDays = 3)
        => e => e.DueDate.HasValue
             && e.DueDate.Value >= DateTime.UtcNow
             && e.DueDate.Value <= DateTime.UtcNow.AddDays(withinDays)
             && e.Status != TaskItemStatus.Completed
             && e.Status != TaskItemStatus.Cancelled
             && !e.IsDeleted;
}

// Value Object for Subtasks
public class SubTaskItem
{
    public string Id { get; set; } = Ulid.NewUlid().ToString();
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int Order { get; set; }
    public DateTime? CompletedDate { get; set; }
}
```

### Enumerations

```csharp
public enum TaskItemStatus
{
    Todo = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

public enum TaskItemPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}
```

### Statistics Data Model

```typescript
interface TaskStatisticsDataModel {
  totalCount: number;
  activeCount: number; // Not completed/cancelled/deleted
  completedCount: number;
  overdueCount: number; // Past due, not completed
  dueSoonCount: number; // Due within 3 days
  completionRate: number; // 0-100 percentage
}
```

### User Flows

#### Create Task Flow

```
1. User clicks "New Task" button
                    ↓
2. TaskDetailComponent initializes with empty form
                    ↓
3. Draft loaded from localStorage (if exists)
                    ↓
4. User fills form fields (title, description, status, priority, dates, tags)
                    ↓
5. Form auto-saves draft every 500ms on change
                    ↓
6. User clicks Save → validateForm() checks all rules
                    ↓
7. API call: POST /api/TaskItem/save
                    ↓
8. Success → Draft cleared, taskSaved event emitted
                    ↓
9. TaskListStore reloads tasks + statistics
```

#### Filter Tasks Flow

```
1. User clicks status chip (e.g., "In Progress")
                    ↓
2. TaskListStore.filterByStatus() updates selectedStatuses
                    ↓
3. Query rebuilt with new filter criteria
                    ↓
4. API call: GET /api/TaskItem/list?statuses=1&...
                    ↓
5. Results displayed, chip shows active state
                    ↓
6. User can add more filters (priority, overdue, search)
                    ↓
7. Each filter change triggers query rebuild
                    ↓
8. "Clear All" resets all filters
```

#### Soft Delete/Restore Flow

```
1. User clicks delete action on task row
                    ↓
2. API call: POST /api/TaskItem/delete { taskId, permanentDelete: false }
                    ↓
3. Task marked: IsDeleted=true, DeletedDate=now, DeletedBy=userId
                    ↓
4. Task hidden from default list view
                    ↓
5. User enables "Include Deleted" filter
                    ↓
6. Deleted tasks appear with special styling
                    ↓
7. User opens deleted task → sees "Deleted" banner
                    ↓
8. User clicks "Restore" button
                    ↓
9. API call: POST /api/TaskItem/restore { task: {...} }
                    ↓
10. Task restored: IsDeleted=false, DeletedDate=null
                    ↓
11. Task reappears in normal list
```

---

## Frontend Components

### Component Hierarchy

```
PlatformComponent (base)
├── PlatformVmComponent<TViewModel>
│   └── AppTextSnippetDetailComponent
│       • Manages text snippet detail/edit form
│       • Two-way binding with parent via @Input/@Output
│
├── PlatformFormComponent<TFormVm>
│   └── TaskDetailComponent
│       • Reactive form with FormArray for subtasks
│       • Draft auto-save to localStorage
│       • Dependent validation (startDate ≤ dueDate)
│
└── PlatformVmStoreComponent<TViewModel, TStore>
    ├── AppComponent
    │   • Root component with tab navigation
    │   • Manages text snippet list and selection
    │
    └── TaskListComponent
        • Task list with filtering and statistics
        • Pagination and search
        • Delete/restore actions
```

### AppComponent

**Type**: `PlatformVmStoreComponent<AppVm, AppStore>`

**Location**: `apps/playground-text-snippet/src/app/app.component.ts`

**State (AppVm)**:

```typescript
interface AppVm {
  searchText: string;
  textSnippetItems: AppVm_TextSnippetItem[];
  totalTextSnippetItems: number;
  currentTextSnippetItemsPageNumber: number;
  selectedSnippetTextId: string | null;
}
```

**Key Methods**:

- `onSearchTextChange(text)` - Update search text
- `onTextSnippetGridChangePage(pageIndex)` - Handle pagination
- `loadSnippetTextItems()` - Fetch snippets from API
- `toggleSelectTextSnippedGridRow(id)` - Select/deselect snippet

### TaskListComponent

**Type**: `PlatformVmStoreComponent<TaskListVm, TaskListStore>`

**Location**: `apps/playground-text-snippet/src/app/shared/components/task-list/`

**State (TaskListVm)**:

```typescript
interface TaskListVm {
  // Filters
  searchText: string;
  selectedStatuses: TaskItemStatus[];
  selectedPriorities: TaskItemPriority[];
  overdueOnly: boolean;
  dueSoonOnly: boolean;
  includeDeleted: boolean;

  // Data
  tasks: TaskItemDataModel[];
  totalTasks: number;
  currentPageNumber: number;

  // Statistics
  statistics: TaskStatisticsDataModel;
  statusCounts: Map<TaskItemStatus, number>;
  overdueCount: number;

  // Selection
  selectedTaskId: string | null;
}
```

**Template Sections**:

1. **Statistics Cards** - Total, Active, Completed, Overdue, Due Soon, Completion Rate
2. **Search Input** - Full-text search with 500ms throttle
3. **Status Filter Chips** - Todo, In Progress, Completed, Cancelled
4. **Priority Filter Chips** - Low, Medium, High, Critical
5. **Data Table** - Status icon, Priority badge, Title, Due Date, Actions
6. **Pagination** - 10 items per page

### TaskDetailComponent

**Type**: `PlatformFormComponent<TaskDetailFormVm>`

**Location**: `apps/playground-text-snippet/src/app/shared/components/task-detail/`

**Form Configuration**:

```typescript
initialFormConfig = () => ({
  controls: {
    title: new FormControl("", [
      Validators.required,
      Validators.maxLength(200),
    ]),
    description: new FormControl("", [Validators.maxLength(2000)]),
    taskStatus: new FormControl(TaskItemStatus.Todo, [Validators.required]),
    priority: new FormControl(TaskItemPriority.Medium, [Validators.required]),
    startDate: new FormControl(null),
    dueDate: new FormControl(null, [
      startEndValidator(
        "dueBeforeStart",
        (ctrl) => ctrl.parent?.get("startDate")?.value,
        (ctrl) => ctrl.value,
        { allowEqual: true },
      ),
    ]),
    tags: new FormControl(""),
    subTasks: new FormArray([]), // Dynamic FormArray
  },
  dependentValidations: {
    dueDate: ["startDate"], // Revalidate dueDate when startDate changes
  },
});
```

**Subtask Management**:

```typescript
addSubTask() {
  this.subTasksArray.push(new FormGroup({
    id: new FormControl(ulid()),
    title: new FormControl('', [Validators.required]),
    isCompleted: new FormControl(false),
    order: new FormControl(this.subTasksArray.length),
    completedDate: new FormControl(null)
  }));
}

toggleSubTaskCompletion(index: number) {
  const subtask = this.subTasksArray.at(index);
  const isCompleted = subtask.get('isCompleted')?.value;
  subtask.patchValue({
    isCompleted: !isCompleted,
    completedDate: !isCompleted ? new Date() : null
  });
}

get completedSubTasksCount(): number {
  return this.subTasksArray.controls.filter(
    c => c.get('isCompleted')?.value === true
  ).length;
}
```

**Draft Auto-save**:

```typescript
// Auto-save draft on form value changes (create mode only)
this.form.valueChanges.pipe(
  debounceTime(500),
  filter(() => this.isCreateMode()),
  this.untilDestroyed()
).subscribe(values => {
  localStorage.setItem(this.draftKey, JSON.stringify(values));
});

// Load draft on init
loadDraft() {
  const draft = localStorage.getItem(this.draftKey);
  if (draft && this.isCreateMode()) {
    this.form.patchValue(JSON.parse(draft));
  }
}

// Clear draft on successful save
clearDraft() {
  localStorage.removeItem(this.draftKey);
}
```

---

## API Reference

### TextSnippet API

**Base URL**: `{apiHost}/api/TextSnippet`

#### Search Text Snippets

```
GET /api/TextSnippet/search
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| searchText | string | No | Full-text search query |
| searchId | string | No | Get specific snippet by ID |
| skipCount | number | No | Pagination offset (default: 0) |
| maxResultCount | number | No | Page size (default: 10) |

**Response**: `SearchSnippetTextQueryResult`

```json
{
  "items": [
    {
      "id": "01HQ...",
      "snippetText": "ANGULAR_COMPONENT",
      "fullText": "Angular component with dependency injection...",
      "status": 1,
      "createdDate": "2024-01-15T10:00:00Z",
      "wordCount": 15,
      "isRecentlyModified": true
    }
  ],
  "totalCount": 42
}
```

#### Save Text Snippet

```
POST /api/TextSnippet/save
```

**Request Body**: `SaveSnippetTextCommand`

```json
{
  "data": {
    "id": null, // null for create, ULID for update
    "snippetText": "NEW_SNIPPET",
    "fullText": "Full text content here..."
  }
}
```

**Response**: `SaveSnippetTextCommandResult`

```json
{
  "data": {
    "id": "01HQ...",
    "snippetText": "NEW_SNIPPET",
    "fullText": "Full text content here...",
    "createdDate": "2024-01-15T10:00:00Z"
  }
}
```

---

### TaskItem API

**Base URL**: `{apiHost}/api/TaskItem`

#### Get Task List

```
GET /api/TaskItem/list
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| statuses | number[] | No | Filter by status(es): 0=Todo, 1=InProgress, 2=Completed, 3=Cancelled |
| priorities | number[] | No | Filter by priority(ies): 0=Low, 1=Medium, 2=High, 3=Critical |
| searchText | string | No | Full-text search on title/description |
| overdueOnly | boolean | No | Only show overdue tasks |
| dueSoonOnly | boolean | No | Only show tasks due within dueSoonDays |
| dueSoonDays | number | No | Days threshold for "due soon" (default: 3) |
| includeDeleted | boolean | No | Include soft-deleted tasks |
| tag | string | No | Filter by tag |
| skipCount | number | No | Pagination offset |
| maxResultCount | number | No | Page size (default: 10) |

**Response**: `GetTaskListQueryResult`

```json
{
  "items": [
    {
      "id": "01HQ...",
      "title": "Complete documentation",
      "description": "Write full feature docs",
      "status": 1,
      "priority": 2,
      "startDate": "2024-01-15",
      "dueDate": "2024-01-30",
      "tags": ["docs", "priority"],
      "subTasks": [
        {
          "id": "01HQ...",
          "title": "Overview section",
          "isCompleted": true,
          "order": 0
        }
      ],
      "isOverdue": false,
      "daysUntilDue": 15,
      "completionPercentage": 50,
      "isDeleted": false
    }
  ],
  "totalCount": 25,
  "statusCounts": {
    "0": 10,
    "1": 8,
    "2": 5,
    "3": 2
  },
  "overdueCount": 3
}
```

#### Get Task Statistics

```
GET /api/TaskItem/stats
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assigneeId | string | No | Filter by assignee |
| includeDeleted | boolean | No | Include deleted in counts |

**Response**: `GetTaskStatisticsQueryResult`

```json
{
  "totalCount": 50,
  "activeCount": 30,
  "completedCount": 18,
  "overdueCount": 5,
  "dueSoonCount": 8,
  "completionRate": 36.0
}
```

#### Save Task

```
POST /api/TaskItem/save
```

**Request Body**: `SaveTaskItemCommand`

```json
{
  "task": {
    "id": null, // null for create
    "title": "New Task",
    "description": "Task description",
    "status": 0,
    "priority": 1,
    "startDate": "2024-01-15",
    "dueDate": "2024-01-30",
    "tags": ["feature"],
    "subTasks": [{ "title": "Subtask 1", "isCompleted": false, "order": 0 }]
  },
  "restoreDeleted": false
}
```

**Response**: `SaveTaskItemCommandResult`

```json
{
  "savedTask": { ... },
  "wasRestored": false,
  "wasCreated": true
}
```

#### Delete Task

```
POST /api/TaskItem/delete
```

**Request Body**: `DeleteTaskItemCommand`

```json
{
  "taskId": "01HQ...",
  "permanentDelete": false // true = hard delete, false = soft delete
}
```

**Response**: `DeleteTaskItemCommandResult`

```json
{
  "wasSoftDeleted": true
}
```

#### Restore Task

```
POST /api/TaskItem/restore
```

**Request Body**:

```json
{
  "task": {
    "id": "01HQ...",
    "title": "Restored Task",
    ...
  }
}
```

---

## Data Models

### Frontend Data Models

```typescript
// Text Snippet
class TextSnippetDataModel extends PlatformDataModel {
  id?: string;
  snippetText: string = "";
  fullText: string = "";
  createdDate?: Date;
}

// Task Item
class TaskItemDataModel extends PlatformDataModel {
  // Core
  id?: string;
  title: string = "";
  description?: string;
  status: TaskItemStatus = TaskItemStatus.Todo;
  priority: TaskItemPriority = TaskItemPriority.Medium;
  startDate?: Date;
  dueDate?: Date;
  completedDate?: Date;
  tags: string[] = [];

  // Soft Delete
  isDeleted: boolean = false;
  deletedDate?: Date;

  // Subtasks
  subTasks: SubTaskItemDataModel[] = [];

  // Computed (from backend)
  isOverdue: boolean = false;
  daysUntilDue?: number;
  completionPercentage: number = 0;
  isDueSoon: boolean = false;
  isActive: boolean = true;

  // Methods
  static createNew(title?: string): TaskItemDataModel;
  canEdit(): boolean;
  canComplete(): boolean;
}

// Subtask
class SubTaskItemDataModel extends PlatformDataModel {
  id: string = ulid();
  title: string = "";
  isCompleted: boolean = false;
  order: number = 0;
  completedDate?: Date;
}

// Statistics
interface TaskStatisticsDataModel {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  dueSoonCount: number;
  completionRate: number;
}
```

---

## Configuration Guide

### Prerequisites

- **Docker Desktop**: For infrastructure services
- **Node.js 18+**: For frontend development
- **.NET 9 SDK**: For backend development

### Infrastructure Services

Start Docker services:

```bash
cd /path/to/EasyPlatform
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

**Services**:
| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 54320 | postgres / postgres |
| MongoDB | 27017 | root / rootPassXXX |
| Redis | 6379 | - |
| RabbitMQ | 15672 | guest / guest |

### Backend Server

```bash
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api

# API available at: http://localhost:5001
# Swagger UI: http://localhost:5001/swagger
```

### Frontend Server

```bash
cd src/PlatformExampleAppWeb
npm install  # First time only
npx nx serve playground-text-snippet

# App available at: http://localhost:4001
```

### Environment Configuration

**Frontend**: `apps/playground-text-snippet/src/environments/`

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:5001",
};
```

---

## Test Specifications

This section provides comprehensive test specifications using the **Given...When...Then** (BDD) format, organized by priority levels.

### Priority Levels

| Priority | Label       | Description                                | When to Run              |
| -------- | ----------- | ------------------------------------------ | ------------------------ |
| **P0**   | 🔴 Critical | Core functionality - app unusable if fails | Every build, smoke tests |
| **P1**   | 🟠 High     | Main business flows, common use cases      | Every PR, regression     |
| **P2**   | 🟡 Medium   | Important but less frequent scenarios      | Daily/Weekly regression  |
| **P3**   | 🟢 Low      | Edge cases, boundary conditions            | Full regression only     |

### Test Case Summary

| Category            | P0     | P1     | P2     | P3     | Total  |
| ------------------- | ------ | ------ | ------ | ------ | ------ |
| TextSnippet CRUD    | 2      | 3      | 2      | 2      | 9      |
| TextSnippet Search  | 1      | 2      | 2      | 1      | 6      |
| TaskItem CRUD       | 2      | 4      | 3      | 2      | 11     |
| TaskItem Filtering  | 1      | 3      | 3      | 2      | 9      |
| TaskItem SubTasks   | 1      | 2      | 2      | 1      | 6      |
| TaskItem Statistics | 1      | 2      | 1      | 1      | 5      |
| Soft Delete/Restore | 1      | 2      | 2      | 1      | 6      |
| Form Validation     | 1      | 3      | 2      | 2      | 8      |
| UI/UX               | 1      | 2      | 2      | 2      | 7      |
| **Total**           | **11** | **23** | **19** | **14** | **67** |

---

### P0 Critical Tests (Smoke Tests)

```gherkin
Feature: Application Smoke Tests

  Background:
    Given the backend API is running on port 5001
    And the frontend app is accessible at localhost:4001

  @P0 @Smoke @TextSnippet
  Scenario: TS-SNIPPET-P0-001 - App loads and displays text snippets tab
    When the user navigates to the application
    Then the Text Snippets tab should be visible
    And the search input should be displayed
    And the detail panel should show create mode
    And no errors should be displayed

  @P0 @Smoke @TextSnippet
  Scenario: TS-SNIPPET-P0-002 - Create new text snippet
    Given the user is on the Text Snippets tab
    When the user enters "TEST001" in Snippet Text field
    And enters "Test full text content for smoke test" in Full Text field
    And clicks the Create button
    Then a success response should be received
    And the snippet "TEST001" should appear in the list
    And the form should reset to empty state

  @P0 @Smoke @Task
  Scenario: TS-TASK-P0-001 - Tasks tab loads with statistics
    When the user navigates to the Tasks tab
    Then the task list should load within 3 seconds
    And statistics cards should display:
      | Card       | Visible |
      | Total      | true    |
      | Active     | true    |
      | Completed  | true    |
      | Overdue    | true    |
      | Due Soon   | true    |
    And filter chips should be visible for statuses and priorities

  @P0 @Smoke @Task
  Scenario: TS-TASK-P0-002 - Create new task with required fields
    Given the user is on the Tasks tab
    When the user clicks "New Task" button
    And enters "Smoke Test Task" in Title field
    And selects "Todo" status
    And selects "Medium" priority
    And clicks Save button
    Then the task should be created successfully
    And "Smoke Test Task" should appear in the task list
    And the Total statistic should increment by 1

  @P0 @Smoke @API
  Scenario: TS-API-P0-001 - Backend API health check
    When a GET request is sent to /api/TextSnippet/search
    Then the response status should be 200
    And the response should contain "items" array
    And the response should contain "totalCount" field

  @P0 @Smoke @API
  Scenario: TS-API-P0-002 - Task API health check
    When a GET request is sent to /api/TaskItem/list
    Then the response status should be 200
    And the response should contain "items" array
    And the response should contain "statusCounts" object
```

---

### P1 High Priority Tests

```gherkin
Feature: TextSnippet Main Flows

  @P1 @TextSnippet @Search
  Scenario: TS-SNIPPET-P1-001 - Full-text search returns matching results
    Given text snippets exist with content containing "angular"
    When the user enters "angular" in the search field
    And waits for search results
    Then only snippets containing "angular" should be displayed
    And the result count should be greater than 0

  @P1 @TextSnippet @Update
  Scenario: TS-SNIPPET-P1-002 - Update existing text snippet
    Given a text snippet exists with SnippetText "UPDATE_TEST"
    When the user clicks on the snippet in the list
    Then the detail form should load with snippet data
    When the user changes Full Text to "Updated content"
    And clicks the Update button
    Then the snippet should be updated successfully
    And the list should show the updated content

  @P1 @TextSnippet @Pagination
  Scenario: TS-SNIPPET-P1-003 - Pagination works correctly
    Given more than 10 text snippets exist
    When the user views the snippet list
    Then only 10 snippets should be displayed per page
    And pagination controls should be visible
    When the user clicks page 2
    Then the next 10 snippets should be displayed

Feature: TaskItem Main Flows

  @P1 @Task @CRUD
  Scenario: TS-TASK-P1-001 - Create task with all fields
    Given the user is on the create task form
    When the user fills all fields:
      | Field       | Value                    |
      | Title       | Complete Documentation   |
      | Description | Full feature docs needed |
      | Status      | In Progress              |
      | Priority    | High                     |
      | Start Date  | 2024-01-15               |
      | Due Date    | 2024-01-30               |
      | Tags        | docs, priority           |
    And clicks Save button
    Then the task should be created with all values
    And the task should appear in the list with "High" priority badge
    And the task should show "In Progress" status

  @P1 @Task @CRUD
  Scenario: TS-TASK-P1-002 - Edit existing task
    Given a task exists with title "Edit Test Task"
    When the user clicks on the task in the list
    And changes the title to "Edited Task Title"
    And changes priority to "Critical"
    And clicks Save button
    Then the task should be updated
    And the list should show "Edited Task Title"
    And the priority badge should show "Critical"

  @P1 @Task @Filter
  Scenario: TS-TASK-P1-003 - Filter tasks by status
    Given tasks exist with various statuses
    When the user clicks the "In Progress" status chip
    Then only In Progress tasks should be displayed
    And the chip should show selected state
    And the task count should match In Progress count in statusCounts

  @P1 @Task @Filter
  Scenario: TS-TASK-P1-004 - Filter tasks by multiple criteria
    Given tasks exist with various statuses and priorities
    When the user selects "High" priority filter
    And selects "Todo" status filter
    Then only High priority Todo tasks should be displayed
    And both filter chips should show selected state

  @P1 @Task @Filter
  Scenario: TS-TASK-P1-005 - Search tasks by text
    Given tasks exist with various titles and descriptions
    When the user enters "documentation" in the search field
    Then only tasks containing "documentation" should be displayed
    And the search should match both title and description

  @P1 @Task @SubTask
  Scenario: TS-TASK-P1-006 - Add and complete subtasks
    Given the user is editing a task
    When the user clicks "Add Subtask" button
    And enters subtask title "Review code"
    And clicks "Add Subtask" again
    And enters subtask title "Write tests"
    Then 2 subtasks should be displayed
    When the user marks the first subtask as complete
    Then completion percentage should show "50%"
    And the completed subtask should have a checkmark

  @P1 @Task @SoftDelete
  Scenario: TS-TASK-P1-007 - Soft delete and restore task
    Given a task exists with title "Delete Test Task"
    When the user clicks the delete action on the task
    Then the task should be removed from the default list
    When the user enables "Include Deleted" filter
    Then "Delete Test Task" should appear with deleted styling
    When the user opens the deleted task
    And clicks the Restore button
    Then the task should be restored
    And it should appear in the normal list without deleted styling

  @P1 @Task @Statistics
  Scenario: TS-TASK-P1-008 - Statistics update on task changes
    Given the initial statistics are recorded
    When the user creates a new task with status "Todo"
    Then the Total count should increment by 1
    And the Active count should increment by 1
    When the user marks the task as "Completed"
    Then the Completed count should increment by 1
    And the Active count should decrement by 1
    And the Completion Rate should update accordingly
```

---

### P2 Medium Priority Tests

```gherkin
Feature: TextSnippet Extended Scenarios

  @P2 @TextSnippet @Search
  Scenario: TS-SNIPPET-P2-001 - Search with no results
    Given text snippets exist
    When the user searches for "zzz_nonexistent_xyz"
    Then no snippets should be displayed
    And an empty state message should be shown

  @P2 @TextSnippet @Search
  Scenario: TS-SNIPPET-P2-002 - Search is case-insensitive
    Given a text snippet exists with content "Angular Framework"
    When the user searches for "angular framework"
    Then the snippet should be found
    When the user searches for "ANGULAR FRAMEWORK"
    Then the snippet should still be found

  @P2 @TextSnippet @Reset
  Scenario: TS-SNIPPET-P2-003 - Reset form discards changes
    Given a text snippet is selected
    And the user has made changes to the form
    When the user clicks the Reset button
    Then the form should revert to original values
    And the Update button should be disabled

Feature: TaskItem Extended Scenarios

  @P2 @Task @Filter
  Scenario: TS-TASK-P2-001 - Overdue filter shows only overdue tasks
    Given tasks exist with past due dates
    And tasks exist with future due dates
    When the user enables "Overdue Only" filter
    Then only tasks with past due dates should be displayed
    And tasks should show overdue styling

  @P2 @Task @Filter
  Scenario: TS-TASK-P2-002 - Due Soon filter shows tasks due within 3 days
    Given tasks exist with due dates:
      | Title      | Due Date    |
      | Task1      | Tomorrow    |
      | Task2      | In 2 days   |
      | Task3      | In 5 days   |
    When the user enables "Due Soon" filter
    Then Task1 and Task2 should be displayed
    And Task3 should not be displayed

  @P2 @Task @Filter
  Scenario: TS-TASK-P2-003 - Clear all filters resets to default view
    Given multiple filters are active
    When the user clicks "Clear All" button
    Then all filter chips should show unselected state
    And the full task list should be displayed
    And "Include Deleted" should be unchecked

  @P2 @Task @SubTask
  Scenario: TS-TASK-P2-004 - Remove subtask
    Given a task exists with 3 subtasks
    When the user opens the task for editing
    And removes the middle subtask
    And saves the task
    Then only 2 subtasks should remain
    And subtask order should be preserved

  @P2 @Task @SubTask
  Scenario: TS-TASK-P2-005 - Subtask completion updates percentage
    Given a task exists with 4 subtasks (0 completed)
    When the user completes 1 subtask
    Then completion percentage should show "25%"
    When the user completes another subtask
    Then completion percentage should show "50%"
    When the user uncompletes a subtask
    Then completion percentage should show "25%"

  @P2 @Task @Draft
  Scenario: TS-TASK-P2-006 - Draft auto-save and restore
    Given the user is on the create task form
    When the user enters "Draft Test Task" as title
    And enters "Draft description" as description
    And waits 1 second for auto-save
    And refreshes the page
    And navigates back to create task
    Then the form should restore "Draft Test Task" as title
    And "Draft description" should be restored

Feature: Form Validation Extended

  @P2 @Validation @Task
  Scenario: TS-VALIDATION-P2-001 - Date validation: due date must be >= start date
    Given the user is on the task form
    When the user selects start date "2024-01-15"
    And selects due date "2024-01-10"
    Then a validation error should be displayed
    And the error message should indicate "Due date must be after start date"
    And the Save button should be disabled

  @P2 @Validation @Task
  Scenario: TS-VALIDATION-P2-002 - Subtask title is required
    Given the user is editing a task
    When the user adds a subtask
    And leaves the subtask title empty
    And tries to save
    Then a validation error should appear on the subtask
    And saving should be prevented
```

---

### P3 Low Priority Tests (Edge Cases)

```gherkin
Feature: TextSnippet Edge Cases

  @P3 @TextSnippet @EdgeCase
  Scenario: TS-SNIPPET-P3-001 - Handle special characters in search
    Given a text snippet exists with content "C++ & C# <programming>"
    When the user searches for "C++ & C#"
    Then the snippet should be found
    And special characters should be handled correctly

  @P3 @TextSnippet @EdgeCase
  Scenario: TS-SNIPPET-P3-002 - Maximum length content handling
    When the user tries to enter 101 characters in Snippet Text
    Then only 100 characters should be accepted
    And a max length indicator should be shown

Feature: TaskItem Edge Cases

  @P3 @Task @EdgeCase
  Scenario: TS-TASK-P3-001 - Handle concurrent task updates
    Given a task is open in two browser tabs
    When the task is modified and saved in tab 1
    And the task is modified and saved in tab 2
    Then a conflict error should be handled gracefully
    And the user should be notified of the conflict

  @P3 @Task @EdgeCase
  Scenario: TS-TASK-P3-002 - Empty task list state
    Given no tasks exist
    When the user views the task list
    Then an empty state message should be displayed
    And the "New Task" button should be prominent

  @P3 @Task @EdgeCase
  Scenario: TS-TASK-P3-003 - Maximum 50 subtasks
    Given a task exists
    When the user tries to add 51 subtasks
    Then the 51st subtask should be rejected
    And an error message should indicate the maximum limit

  @P3 @Task @EdgeCase
  Scenario: TS-TASK-P3-004 - Tags with special characters
    When the user creates a task with tags "C++, .NET, #Angular"
    Then the tags should be saved correctly
    And filtering by these tags should work

  @P3 @Task @EdgeCase
  Scenario: TS-TASK-P3-005 - Pagination boundary conditions
    Given exactly 10 tasks exist
    When viewing the task list
    Then no pagination should be shown
    When 1 more task is added
    Then pagination should appear with 2 pages

Feature: UI/UX Edge Cases

  @P3 @UI @EdgeCase
  Scenario: TS-UI-P3-001 - Loading states displayed correctly
    Given the API is slow (>1 second response)
    When the user triggers a search
    Then a loading indicator should be displayed
    And the indicator should disappear when data loads

  @P3 @UI @EdgeCase
  Scenario: TS-UI-P3-002 - Error state displayed on API failure
    Given the API returns a 500 error
    When the user tries to load tasks
    Then an error message should be displayed
    And a retry option should be available
```

---

## Troubleshooting

### Common Issues

| Issue                     | Cause                   | Solution                                          |
| ------------------------- | ----------------------- | ------------------------------------------------- |
| API connection refused    | Backend not running     | Start backend: `dotnet run --project ...Api`      |
| Database connection error | Docker not running      | Start Docker Desktop, then `docker-compose up -d` |
| CORS errors               | API URL mismatch        | Check environment.ts apiUrl matches backend       |
| Build errors              | Outdated packages       | Run `npm install` in PlatformExampleAppWeb        |
| Sass deprecation warnings | Mixed declaration order | Move CSS variables before @include statements     |

### Debugging Tips

1. **Backend Logging**: Check console output for detailed error messages
2. **Browser DevTools**: Network tab for API calls, Console for JS errors
3. **Angular DevTools**: Install extension for component inspection
4. **Swagger UI**: Test API endpoints at `/swagger`

---

## Version History

| Version | Date       | Changes                                             |
| ------- | ---------- | --------------------------------------------------- |
| 1.0.0   | 2024-12-20 | Initial documentation with full test specifications |

---

_Generated with [Claude Code](https://claude.com/claude-code)_
