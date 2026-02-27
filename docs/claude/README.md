# Claude Documentation Index

> Detailed documentation for AI-assisted development in EasyPlatform

This directory contains comprehensive documentation split from the root CLAUDE.md for optimal Claude Code performance. Each file focuses on a specific domain to provide targeted guidance.

## Documentation Structure

| Document                                                     | Description                                                | When to Use                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------- |
| [claude-kit-setup.md](./claude-kit-setup.md)                 | Hooks, skills, agents, workflows, learning system          | Understanding Claude Code setup in this project     |
| [architecture.md](./architecture.md)                         | System architecture, file locations, planning protocol     | Starting new tasks, understanding project structure |
| [troubleshooting.md](./troubleshooting.md)                   | Investigation protocol, common issues and solutions        | Debugging, when stuck or encountering errors        |
| [backend-patterns.md](./backend-patterns.md)                 | CQRS, Repository, Entity, DTO, Message Bus, Jobs           | Backend development tasks                           |
| [frontend-patterns.md](./frontend-patterns.md)               | Components, Forms, Stores, API Services, platform-core     | Frontend development tasks                          |
| [authorization-patterns.md](./authorization-patterns.md)     | Security, authentication, and migration patterns           | Security implementations                            |
| [decision-trees.md](./decision-trees.md)                     | Quick decision guides and templates                        | Choosing implementation approach                    |
| [advanced-patterns.md](./advanced-patterns.md)               | Advanced fluent helpers, expression composition, utilities | Complex implementations                             |
| [clean-code-rules.md](./clean-code-rules.md)                 | Universal coding standards                                 | Code quality, best practices                        |
| [dependency-policy.md](./dependency-policy.md)               | Dependency evaluation criteria before adding packages      | Adding external packages                            |
| [team-collaboration-guide.md](./team-collaboration-guide.md) | Team roles, commands, workflows, artifact management       | Team collaboration, PBI/design workflows            |
| [scss-styling-guide.md](./scss-styling-guide.md)             | BEM methodology, design tokens, SCSS patterns              | Styling and CSS tasks                               |
| [subagent-registry.md](./subagent-registry.md)               | Subagent capabilities and protocols                        | Multi-agent orchestration                           |
| [agent-orchestration-principles.md](./agent-orchestration-principles.md) | Multi-agent coordination patterns              | Agent workflow design                               |
| [backend-csharp-complete-guide.md](./backend-csharp-complete-guide.md) | Comprehensive C# reference with SOLID patterns   | Deep backend reference                              |
| [frontend-typescript-complete-guide.md](./frontend-typescript-complete-guide.md) | Complete Angular/TS guide with principles | Deep frontend reference                             |

## Quick Navigation

### Claude Kit & Setup

- **Learning System**: See [claude-kit-setup.md](./claude-kit-setup.md#learning-system)
- **Hooks Configuration**: See [claude-kit-setup.md](./claude-kit-setup.md#hooks-system)
- **Skills Framework**: See [claude-kit-setup.md](./claude-kit-setup.md#skills-framework)
- **Agents System**: See [claude-kit-setup.md](./claude-kit-setup.md#agents-system)
- **Workflow Orchestration**: See [claude-kit-setup.md](./claude-kit-setup.md#workflow-orchestration)
- **Code Review Rules**: See [../code-review-rules.md](../code-review-rules.md) - Auto-injected on `/code-review` skills

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

### Review & Quality

- **Understanding verification**: `/why-review` — Reasoning quality audit (0-5 score), runs after implementation in workflows
- **Architecture Decision Records**: See [../adr/](../adr/) — 5 ADRs documenting core platform decisions
- **Dependency evaluation**: See [dependency-policy.md](./dependency-policy.md) — Before adding external packages

### MCP & External Tools

- **MCP Configuration**: See [.mcp.README.md](../../.mcp.README.md)
- **Figma Integration**: See [.claude/docs/figma-setup.md](../../.claude/docs/figma-setup.md)
- **Team Collaboration**: See [team-collaboration-guide.md](./team-collaboration-guide.md)

## Related Documentation

- **Root CLAUDE.md**: Essential rules and quick decision trees
- **[Code Review Rules](../code-review-rules.md)**: Project-specific review checklist (auto-injected)
- **.ai/docs/prompt-context.md**: Solution planning guidance
- **../architecture-overview.md**: System architecture & diagrams
- **.ai/docs/AI-DEBUGGING-PROTOCOL.md**: Debugging protocol

## Usage Tips

1. **Start with root CLAUDE.md** for mandatory rules and quick decisions
2. **Navigate to specific docs** based on task type
3. **Check advanced-patterns.md** for anti-patterns before implementing solutions
4. **Reference troubleshooting.md** when stuck
