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

| Service         | Description                   | Primary Responsibility             |
| --------------- | ----------------------------- | ---------------------------------- |
| **TextSnippet** | Example/template microservice | Demonstrates all platform patterns |

This is a **template project** with one example service. Use TextSnippet as a reference for implementing new services.

## File Locations

### Essential Documentation

```
README.md                           # Complete platform overview & quick start
../architecture-overview.md         # System architecture & diagrams
CLEAN-CODE-RULES.md                 # Coding standards & anti-patterns
.github/AI-DEBUGGING-PROTOCOL.md    # MANDATORY debugging protocol for AI agents
.ai/prompts/context.md                # Comprehensive development patterns
```

### Backend Architecture

```
src/Platform/                       # Easy.Platform framework components
├── Easy.Platform/                  # Core framework (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/       # ASP.NET Core integration
├── Easy.Platform.MongoDB/          # MongoDB data access patterns
├── Easy.Platform.RabbitMQ/         # Message bus implementation
└── Easy.Platform.*/                # Other infrastructure modules

src/Backend/             # Example microservice implementation
├── PlatformExampleApp.TextSnippet.Api/         # Web API layer
├── PlatformExampleApp.TextSnippet.Application/ # CQRS handlers, jobs, events
├── PlatformExampleApp.TextSnippet.Domain/      # Entities, domain events
├── PlatformExampleApp.TextSnippet.Persistence*/# Database implementations
└── PlatformExampleApp.TextSnippet.Shared/      # Cross-service utilities
```

### Frontend Architecture (Nx Workspace)

```
src/Frontend/          # Angular 19 Nx workspace
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
src/Frontend/libs/platform-core/src/
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
src/Backend/             # Complete working example
testing/                            # Additional test specifications
deploy/                             # Kubernetes & deployment configs
```

## Design System Documentation

**When creating or modifying frontend UI code, follow the design system:**

| Application                 | Design System Location | Angular Version |
| --------------------------- | ---------------------- | --------------- |
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
dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api  # Run example service

# Frontend
cd src/Frontend
npm install                                     # Install dependencies
nx serve playground-text-snippet                # Start example app
nx build playground-text-snippet                # Build specific app
nx test platform-core                           # Test shared library

# Infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d  # Start infrastructure

# Testing
dotnet test [Project].csproj                    # Run unit tests
```

## Planning Protocol

**CRITICAL:** Before implementing ANY non-trivial task (bug fixes, new features, refactoring, analysis with changes), you MUST:

1. **Enter Plan Mode First** - Use `EnterPlanMode` tool automatically for non-trivial tasks
2. **Investigate & Analyze** - Explore codebase, understand context, identify affected areas
3. **Create Implementation Plan** - Write detailed plan with specific files, changes, and approach
4. **Get User Approval** - Present plan and wait for user confirmation before any code changes
5. **Only Then Implement** - Execute the approved plan

### Applies To

- Bug diagnosis and fixes
- New feature implementation
- Code refactoring
- Any task requiring file modifications

### Exceptions (Can Implement Directly)

- Single-line typo fixes
- User explicitly says "just do it" or "skip planning"
- Pure research/exploration with no code changes

### Planning Checklist

Before starting implementation:

- [ ] Understood the requirements completely
- [ ] Explored relevant codebase areas
- [ ] Identified all files that need changes
- [ ] Considered edge cases and error handling
- [ ] Verified no existing solution exists
- [ ] Created step-by-step implementation plan
- [ ] Got user approval for the plan

**DO NOT** start writing code without presenting a plan first. Always investigate, plan, then implement.
