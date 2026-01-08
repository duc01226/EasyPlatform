# EasyPlatform Architecture

> System architecture, file locations, and service boundaries

## High-Level Architecture

**System Overview:**

- **Backend:** .NET 9 microservices with Clean Architecture layers (Domain, Application, Persistence, Service)
- **Frontend:** Angular 19 Nx workspace with component-based architecture
- **Platform Foundation:** Easy.Platform framework providing base infrastructure components
- **Communication:** RabbitMQ message bus for cross-service communication
- **Data Storage:** Multi-database approach (MongoDB, SQL Server, PostgreSQL)

## Example Application

| Service         | Description                     | Primary Responsibility                     |
| --------------- | ------------------------------- | ------------------------------------------ |
| **TextSnippet** | Example/template microservice   | Demonstrates all platform patterns         |

This is a **template project** with one example service. Use TextSnippet as a reference for implementing new services.

## File Locations

### Essential Documentation

```
README.md                           # Complete platform overview & quick start
../architecture-overview.md         # System architecture & diagrams
CLEAN-CODE-RULES.md                 # Coding standards & anti-patterns
.github/AI-DEBUGGING-PROTOCOL.md    # MANDATORY debugging protocol for AI agents
ai-prompt-context.md                # Comprehensive development patterns
```

### Backend Architecture

```
src/Platform/                       # Easy.Platform framework components
├── Easy.Platform/                  # Core framework (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/       # ASP.NET Core integration
├── Easy.Platform.MongoDB/          # MongoDB data access patterns
├── Easy.Platform.RabbitMQ/         # Message bus implementation
└── Easy.Platform.*/                # Other infrastructure modules

src/PlatformExampleApp/             # Example microservice implementation
├── PlatformExampleApp.TextSnippet.Api/         # Web API layer
├── PlatformExampleApp.TextSnippet.Application/ # CQRS handlers, jobs, events
├── PlatformExampleApp.TextSnippet.Domain/      # Entities, domain events
├── PlatformExampleApp.TextSnippet.Persistence*/# Database implementations
└── PlatformExampleApp.TextSnippet.Shared/      # Cross-service utilities
```

### Frontend Architecture (Nx Workspace)

```
src/PlatformExampleAppWeb/          # Angular 19 Nx workspace
├── apps/                           # Applications
│   └── playground-text-snippet/    # Example app
└── libs/                           # Shared libraries
    ├── platform-core/              # Framework base (PlatformComponent, stores)
    ├── apps-domains/               # Business domain (APIs, models, validators)
    ├── share-styles/               # SCSS themes & variables
    └── share-assets/               # Images, icons, fonts
```

### Platform-Core Library

```
src/PlatformExampleAppWeb/libs/platform-core/src/
├── abstracts/                      # Base classes (BaseComponent, BaseDirective)
├── components/                     # UI components (alerts, tables, icons)
├── directives/                     # Custom directives (popover, ellipsis)
├── pipes/                          # Data transformation pipes
├── services/                       # Business services (theme, translate)
├── ui-models/                      # Data models and interfaces
└── utils/                          # Utility functions and helpers
```

### Testing & Development

```
src/PlatformExampleApp/             # Complete working example
testing/                            # Additional test specifications
deploy/                             # Kubernetes & deployment configs
```

## Design System Documentation

**When creating or modifying frontend UI code, follow the design system:**

| Application               | Design System Location | Angular Version |
| ------------------------- | ---------------------- | --------------- |
| **playground-text-snippet** | `docs/design-system/`  | Angular 19      |

**Design System Contents:**

- 01-design-tokens.md - Colors, typography, spacing, shadows
- 02-component-catalog.md - Available UI components and usage
- 03-form-patterns.md - Form validation, modes, error handling
- 04-dialog-patterns.md - Modal, panel, confirm dialog patterns
- 05-table-patterns.md - Tables, pagination, filtering
- 06-state-management.md - State management patterns
- 07-technical-guide.md - Implementation checklist, best practices

## Database Connections (Development)

| Database   | Connection      | Credentials         |
| ---------- | --------------- | ------------------- |
| SQL Server | localhost,14330 | sa / 123456Abc      |
| MongoDB    | localhost:27017 | root / rootPassXXX  |
| PostgreSQL | localhost:54320 | postgres / postgres |
| Redis      | localhost:6379  | -                   |
| RabbitMQ   | localhost:15672 | guest / guest       |

## Development Commands

```bash
# Backend
dotnet build EasyPlatform.sln                   # Build entire solution
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api  # Run example service

# Frontend
cd src/PlatformExampleAppWeb
npm install                                     # Install dependencies
nx serve playground-text-snippet                # Start example app
nx build playground-text-snippet                # Build specific app
nx test platform-core                           # Test shared library

# Infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d  # Start infrastructure

# Testing
dotnet test [Project].csproj                    # Run unit tests
```
