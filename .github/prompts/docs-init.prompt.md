---
description: "Initialize project documentation by analyzing codebase structure"
---

# Documentation Initialization Prompt

## Overview

This prompt guides the creation of initial project documentation by analyzing the codebase structure and creating foundational documentation files.

## Workflow

### Phase 1: Codebase Discovery

1. Run `ls -la` to identify actual project directories
2. Analyze project structure and identify key areas:
   - Source code directories
   - Configuration files
   - Test directories
   - Build/deployment files
3. Scan for existing documentation

### Phase 2: Documentation Creation

Create the following documentation files in `docs/` directory:

#### Required Documentation

| File | Purpose |
|------|---------|
| `docs/project-overview-pdr.md` | Project overview and Product Development Requirements |
| `docs/codebase-summary.md` | Codebase structure and organization |
| `docs/code-standards.md` | Coding standards and conventions |
| `docs/system-architecture.md` | System architecture overview |

#### README Update

Update root `README.md` with:
- Project description
- Quick start guide
- Prerequisites
- Installation steps
- Links to detailed documentation

**Keep README under 300 lines.**

## EasyPlatform Structure Reference

### Backend (.NET)
```
src/Platform/                    # Easy.Platform framework
├── Easy.Platform/               # Core (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/    # ASP.NET Core integration
├── Easy.Platform.MongoDB/       # MongoDB patterns
├── Easy.Platform.RabbitMQ/      # Message bus

src/PlatformExampleApp/          # Example microservice
├── *.Api/                       # Web API layer
├── *.Application/               # CQRS handlers, jobs, events
├── *.Domain/                    # Entities, domain events
├── *.Persistence*/              # Database implementations
```

### Frontend (Angular)
```
src/PlatformExampleAppWeb/       # Angular 19 Nx workspace
├── apps/                        # Applications
└── libs/
    ├── platform-core/           # Base classes, utilities
    ├── apps-domains/            # Business domain code
    ├── share-styles/            # SCSS themes
    └── share-assets/            # Static assets
```

## Documentation Standards

### Principles
1. **Single Source of Truth** - One place for each piece of information
2. **Code as Primary Documentation** - Self-documenting code through clear naming
3. **Write for Audience** - Technical detail appropriate for developers

### Format Guidelines
- Use Markdown with consistent heading hierarchy
- Include code examples where applicable
- Link to related documentation
- Keep each document focused on one topic

## Output

Use `docs/` directory as the source of truth for documentation.

**IMPORTANT:** Do not start implementing code. Focus only on documentation creation.
