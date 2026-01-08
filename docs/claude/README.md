# Claude Documentation Index

> Detailed documentation for AI-assisted development in EasyPlatform

This directory contains comprehensive documentation split from the root CLAUDE.md for optimal Claude Code performance. Each file focuses on a specific domain to provide targeted guidance.

## Documentation Structure

| Document                                       | Description                                                | When to Use                                         |
| ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| [architecture.md](./architecture.md)           | System architecture, file locations, service boundaries    | Starting new tasks, understanding project structure |
| [backend-patterns.md](./backend-patterns.md)   | CQRS, Repository, Entity, DTO, Message Bus, Jobs           | Backend development tasks                           |
| [frontend-patterns.md](./frontend-patterns.md) | Components, Forms, Stores, API Services, platform-core     | Frontend development tasks                          |
| [advanced-patterns.md](./advanced-patterns.md) | Advanced fluent helpers, expression composition, utilities | Complex implementations                             |
| [anti-patterns.md](./anti-patterns.md)         | Common mistakes and how to avoid them                      | Code review, debugging                              |
| [troubleshooting.md](./troubleshooting.md)     | Common issues and solutions                                | When stuck or encountering errors                   |

## Quick Navigation

### Backend Tasks

- **New API endpoint**: See [backend-patterns.md](./backend-patterns.md#cqrs-implementation-patterns)
- **Repository queries**: See [backend-patterns.md](./backend-patterns.md#repository-pattern)
- **Validation**: See [backend-patterns.md](./backend-patterns.md#validation-patterns)
- **Background jobs**: See [backend-patterns.md](./backend-patterns.md#background-job-patterns)
- **Cross-service sync**: See [backend-patterns.md](./backend-patterns.md#message-bus-patterns)

### Frontend Tasks

- **New component**: See [frontend-patterns.md](./frontend-patterns.md#component-hierarchy)
- **Forms with validation**: See [frontend-patterns.md](./frontend-patterns.md#platform-form-component)
- **State management**: See [frontend-patterns.md](./frontend-patterns.md#platform-vm-store)
- **API integration**: See [frontend-patterns.md](./frontend-patterns.md#api-service-pattern)

### Architecture

- **Service boundaries**: See [architecture.md](./architecture.md#microservices)
- **File locations**: See [architecture.md](./architecture.md#file-locations)
- **Frontend structure**: See [architecture.md](./architecture.md#frontend-architecture)

## Related Documentation

- **Root CLAUDE.md**: Essential rules and quick decision trees
- **ai-prompt-context.md**: Solution planning guidance
- **../architecture-overview.md**: System architecture & diagrams
- **.github/AI-DEBUGGING-PROTOCOL.md**: Debugging protocol

## Usage Tips

1. **Start with root CLAUDE.md** for mandatory rules and quick decisions
2. **Navigate to specific docs** based on task type
3. **Check anti-patterns.md** before implementing solutions
4. **Reference troubleshooting.md** when stuck
