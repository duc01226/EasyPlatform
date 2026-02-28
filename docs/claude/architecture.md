# BravoSUITE Architecture

> System architecture, file locations, and service boundaries

## High-Level Architecture

**System Overview:**

- **Backend:** .NET 8 microservices with Clean Architecture layers (Domain, Application, Persistence, Service)
- **Frontend:** Angular 19 Nx workspace with micro frontend architecture (WebV2) + Angular 12 (Web)
- **Platform Foundation:** Easy.Platform framework providing base infrastructure components
- **Communication:** RabbitMQ message bus for cross-service communication
- **Data Storage:** Multi-database approach (MongoDB, SQL Server, PostgreSQL)

## Core Business Applications

| Service           | Description                        | Primary Responsibility           |
| ----------------- | ---------------------------------- | -------------------------------- |
| **bravoTALENTS**  | Recruitment & talent management    | Candidate pipeline, job postings |
| **bravoGROWTH**   | Employee lifecycle & HR management | Employee records, org structure  |
| **bravoSURVEYS**  | Survey creation & feedback         | Survey builder, responses        |
| **bravoINSIGHTS** | Analytics & business intelligence  | Reports, dashboards              |

## Supporting Services

| Service                 | Description                    |
| ----------------------- | ------------------------------ |
| **Accounts**            | Authentication & authorization |
| **CandidateApp**        | Candidate-specific operations  |
| **NotificationMessage** | Cross-service notifications    |
| **ParserApi**           | Document processing            |

## File Locations

### Essential Documentation

```
README.md                           # Complete platform overview & quick start
EasyPlatform.README.md              # Framework deep dive & patterns
CLEAN-CODE-RULES.md                 # Coding standards & anti-patterns
.github/AI-DEBUGGING-PROTOCOL.md    # MANDATORY debugging protocol for AI agents
.ai/docs/prompt-context.md          # Comprehensive development patterns
```

### Backend Architecture

```
src/Platform/                       # Easy.Platform framework components
├── Easy.Platform/                  # Core framework (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/       # ASP.NET Core integration
├── Easy.Platform.MongoDB/          # MongoDB data access patterns
├── Easy.Platform.RabbitMQ/         # Message bus implementation
└── Easy.Platform.*/                # Other infrastructure modules

src/Services/                       # Microservices implementation
├── bravoTALENTS/                   # Recruitment service
├── bravoGROWTH/                    # Employee management service
├── bravoSURVEYS/                   # Survey platform service
├── bravoINSIGHTS/                  # Analytics service
├── Accounts/                       # Authentication service
└── _SharedCommon/Bravo.Shared/     # Cross-service utilities
```

### Frontend Architecture (Nx Workspace)

```
src/WebV2/                          # Modern Angular 19 micro frontends
├── apps/                           # Micro frontend applications
│   ├── growth-for-company/         # HR management app (port 4206)
│   └── employee/                   # Employee self-service app (port 4205)
└── libs/                           # Shared libraries
    ├── platform-core/              # Framework base (PlatformComponent, stores)
    ├── bravo-domain/               # Business domain (APIs, models, validators)
    ├── bravo-common/               # UI components & utilities
    ├── share-styles/               # SCSS themes & variables
    └── share-assets/               # Images, icons, fonts

src/Web/                            # Angular 12 applications
├── bravoTALENTSClient/             # HR recruitment portal
├── CandidateAppClient/             # Candidate portal
└── bravoSURVEYSClient/             # Survey creator
```

### BravoCommon Library

```
src/WebV2/libs/bravo-common/src/
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
Bravo-DevStarts/                    # Development startup scripts
src/AutomationTest/                 # End-to-end automation tests
src/PlatformExampleApp/             # Complete working example
testing/                            # Additional test specifications
deploy/                             # Kubernetes & deployment configs
```

## Design System Documentation

**CRITICAL: When creating or modifying frontend UI code, follow the design system for the specific application:**

| Application                       | Design System Location                           | Angular Version |
| --------------------------------- | ------------------------------------------------ | --------------- |
| **WebV2 Apps** (growth, employee) | `docs/design-system/`                            | Angular 19      |
| **bravoTALENTSClient**            | `src/Web/bravoTALENTSClient/docs/design-system/` | Angular 12      |
| **CandidateAppClient**            | `src/Web/CandidateAppClient/docs/design-system/` | Angular 12      |

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
dotnet build BravoSUITE.sln                     # Build entire solution
dotnet run --project [ServiceName].Service      # Run specific service

# Frontend (WebV2)
npm run dev-start:growth                        # Start growth app (port 4206)
npm run dev-start:employee                      # Start employee app (port 4205)
nx build growth-for-company                     # Build specific app
nx test bravo-domain                            # Test shared library

# Infrastructure
.\Bravo-DevStarts\"COMMON Infrastructure Dev-start.cmd"  # Start infrastructure
.\Bravo-DevStarts\"COMMON Accounts Api Dev-start.cmd"    # Start auth service

# Testing
.\src\AutomationTest\test-systemtest-ALL.cmd    # Run all automation tests
dotnet test [Project].csproj                    # Run unit tests
```
