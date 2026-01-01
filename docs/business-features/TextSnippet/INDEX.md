# TextSnippet Feature Index

Quick navigation for TextSnippet module features.

## Features by Category

### Snippet Management
| Feature | Description | API | Frontend |
|---------|-------------|-----|----------|
| Create Snippet | Create new text snippet | `POST /api/TextSnippet/SaveSnippetText` | TextSnippetDetail |
| Edit Snippet | Update existing snippet | `POST /api/TextSnippet/SaveSnippetText` | TextSnippetDetail |
| Search Snippets | Full-text search | `POST /api/TextSnippet/SearchSnippetTexts` | Snippet List |
| Delete Snippet | Remove snippet | `POST /api/TextSnippet/DeleteSnippetText` | List actions |

### Category Management
| Feature | Description | API | Frontend |
|---------|-------------|-----|----------|
| Create Category | Add new category | `POST /api/TextSnippet/SaveSnippetCategory` | Category Form |
| List Categories | Get all categories | `GET /api/TextSnippet/GetCategories` | Category Dropdown |

### Task Management
| Feature | Description | API | Frontend |
|---------|-------------|-----|----------|
| Task List | View all tasks | `GET /api/TaskItem/GetAll` | TaskList |
| Task Detail | View/edit task | `GET /api/TaskItem/{id}` | TaskDetail |
| Create Task | Add new task | `POST /api/TaskItem` | TaskDetail |

### Background Jobs
| Job | Schedule | Description |
|-----|----------|-------------|
| DemoScheduleBackgroundJob | Manual | Demonstrates manual job scheduling |

### Message Bus
| Producer | Consumer | Message Type |
|----------|----------|--------------|
| TextSnippetEntityEventBusMessageProducer | SnippetTextEntityEventBusConsumer | Entity events |
| SaveTextSnippetCommandEventBusMessageProducer | SaveSnippetTextCommandEventBusMessageConsumer | Command events |

---

## Quick Links

- [README](./README.md) - Module overview
- [API Reference](./API-REFERENCE.md) - Endpoint details
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues
