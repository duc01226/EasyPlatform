# EasyPlatform Business Features

> Comprehensive documentation for all EasyPlatform business modules

---

## Platform Overview

EasyPlatform is a .NET 9 + Angular 19 development platform framework demonstrating enterprise application patterns. The example application (TextSnippet) showcases:

- **CQRS Pattern** - Command/Query separation with handlers
- **Event-Driven Architecture** - Entity events, domain events, message bus
- **Multi-Database Support** - SQL Server, MongoDB, PostgreSQL
- **Background Jobs** - Scheduled and manual job execution
- **State Management** - PlatformVmStore for Angular

---

## Module Index

| Module                                                       | Description             | Backend    | Frontend   |
| ------------------------------------------------------------ | ----------------------- | ---------- | ---------- |
| **[TextSnippet](./business-features/TextSnippet/README.md)** | Text snippet management | .NET 9 API | Angular 19 |

---

## Quick Links by Category

### Business Features

- [TextSnippet Overview](./business-features/TextSnippet/README.md)
- [TextSnippet API Reference](./business-features/TextSnippet/API-REFERENCE.md)
- [TextSnippet Feature Index](./business-features/TextSnippet/INDEX.md)

### Test Specifications

- [Test Specs Overview](./test-specs/README.md)
- [Priority Index](./test-specs/PRIORITY-INDEX.md)
- [Integration Tests](./test-specs/INTEGRATION-TESTS.md)
- [TextSnippet Tests](./test-specs/TextSnippet/README.md)

### Design System

- [Design System Index](./design-system/README.md)
- [Angular 19 Design System](./design-system/FrontendDesignSystem.md)

### Claude AI Patterns

- [Claude Patterns Overview](./claude/README.md)
- [Backend Patterns](./claude/backend-patterns.md)
- [Frontend Patterns](./claude/frontend-patterns.md)

---

## Architecture Summary

### Backend Architecture

```
src/Backend/
├── PlatformExampleApp.TextSnippet.Api/        # Web API Layer
│   └── Controllers/                           # REST endpoints
│
├── PlatformExampleApp.TextSnippet.Application/ # Application Layer
│   ├── UseCaseCommands/                       # CQRS Commands
│   ├── UseCaseQueries/                        # CQRS Queries
│   ├── BackgroundJob/                         # Scheduled jobs
│   └── MessageBus/                            # Producers/Consumers
│
├── PlatformExampleApp.TextSnippet.Domain/     # Domain Layer
│   └── Entities/                              # Domain entities
│
└── PlatformExampleApp.TextSnippet.Persistence/ # Data Layer
    └── DbContext/                             # EF Core context
```

### Frontend Architecture

```
src/Frontend/
├── apps/
│   └── playground-text-snippet/               # Example application
│       └── src/app/
│           ├── shared/components/             # Feature components
│           └── app.store.ts                   # App state store
│
└── libs/
    ├── platform-core/                         # Base classes & utilities
    ├── apps-domains/                          # Domain models & services
    ├── share-styles/                          # SCSS mixins & variables
    └── share-assets/                          # Static assets
```

---

## Feature Summary

### TextSnippet Module

| Feature             | Description                           | Status     |
| ------------------- | ------------------------------------- | ---------- |
| Snippet CRUD        | Create, read, update, delete snippets | ✅ Complete |
| Category Management | Organize snippets by category         | ✅ Complete |
| Full-Text Search    | Search across snippet content         | ✅ Complete |
| Task Management     | Simple task tracking demo             | ✅ Complete |
| Message Bus Demo    | Producer/Consumer patterns            | ✅ Complete |
| Background Jobs     | Job scheduling demos                  | ✅ Complete |
| Multi-DB Demo       | Cross-database operations             | ✅ Complete |

---

## Technology Stack

### Backend

| Technology            | Version | Purpose         |
| --------------------- | ------- | --------------- |
| .NET                  | 9.0     | Runtime         |
| ASP.NET Core          | 9.0     | Web framework   |
| Entity Framework Core | 9.0     | ORM             |
| MediatR               | 12.x    | CQRS mediator   |
| RabbitMQ              | 3.x     | Message bus     |
| Hangfire              | 1.8.x   | Background jobs |

### Frontend

| Technology       | Version | Purpose              |
| ---------------- | ------- | -------------------- |
| Angular          | 19      | Framework            |
| Nx               | 20.x    | Monorepo tooling     |
| RxJS             | 7.x     | Reactive programming |
| Angular Material | 19      | UI components        |

### Infrastructure

| Service    | Port  | Purpose          |
| ---------- | ----- | ---------------- |
| SQL Server | 14330 | Primary database |
| MongoDB    | 27017 | Document store   |
| PostgreSQL | 54320 | Relational DB    |
| RabbitMQ   | 15672 | Message broker   |
| Redis      | 6379  | Caching          |

---

## Getting Started

### Prerequisites

```bash
# Start infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Backend

```bash
# Build and run API
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api
```

### Frontend

```bash
cd src/Frontend
npm install
nx serve playground-text-snippet
```

---

## Documentation Standards

### Business Features

Each module should have:

- `README.md` - Overview, architecture, features
- `INDEX.md` - Quick feature navigation
- `API-REFERENCE.md` - Endpoint documentation
- `TROUBLESHOOTING.md` - Common issues
- `detailed-features/` - Deep-dive feature docs

### Test Specs

Each module should have:

- Given-When-Then format
- Priority classification (P0-P3)
- Code evidence with file paths
- Test data examples

---

## Contributing

1. Follow existing documentation patterns
2. Include code evidence for all features
3. Update indexes when adding new content
4. Link between related documents
