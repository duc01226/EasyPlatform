# EasyPlatform Rules Index

This directory contains modular instruction files for Claude Code. Each file focuses on a specific aspect of the EasyPlatform development workflow.

## Quick Navigation

| File                                                         | Purpose                                  | When to Read                          |
| ------------------------------------------------------------ | ---------------------------------------- | ------------------------------------- |
| [01-planning-protocol.md](01-planning-protocol.md)           | Mandatory planning before implementation | Before ANY task                       |
| [02-investigation-protocol.md](02-investigation-protocol.md) | Systematic codebase exploration          | Before investigating bugs or features |
| [03-backend-patterns.md](03-backend-patterns.md)             | .NET backend development patterns        | When working on backend code          |
| [04-frontend-patterns.md](04-frontend-patterns.md)           | Angular frontend patterns                | When working on frontend code         |
| [05-authorization-patterns.md](05-authorization-patterns.md) | Security and auth patterns               | When implementing permissions         |
| [06-decision-trees.md](06-decision-trees.md)                 | Quick decision guides                    | When unsure which pattern to use      |
| [07-advanced-patterns.md](07-advanced-patterns.md)           | Advanced techniques                      | For complex implementations           |
| [08-clean-code-rules.md](08-clean-code-rules.md)             | Universal coding standards               | Always apply                          |

## Architecture Overview

**EasyPlatform Stack:**

- **Backend:** .NET 9 with Clean Architecture (Domain → Application → Persistence → Api)
- **Frontend:** Angular 19 Nx workspace with platform-core library
- **Communication:** RabbitMQ message bus for cross-service events
- **Databases:** MongoDB, SQL Server, PostgreSQL (multi-DB support)

## Critical Directories

```
src/Platform/              # Easy.Platform framework (DO NOT MODIFY without approval)
src/PlatformExampleApp/    # Backend microservice example
src/PlatformExampleAppWeb/ # Frontend Nx workspace
```

## Rule Priority

1. **01-planning-protocol** - ALWAYS apply first
2. **08-clean-code-rules** - ALWAYS apply
3. Other files - Apply based on task context
