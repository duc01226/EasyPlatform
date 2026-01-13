# Copilot Configuration Index

> Central navigation for all GitHub Copilot configuration files in EasyPlatform

---

## Quick Links

| Resource                                                        | Description                                    |
| --------------------------------------------------------------- | ---------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                          | Coding agent instructions (mirrors CLAUDE.md)  |
| [Main Instructions](copilot-instructions.md)                    | Comprehensive platform patterns and guidelines |
| [Quick Reference](instructions/quick-reference.instructions.md) | One-liner patterns cheat sheet                 |
| [AI Debugging Protocol](AI-DEBUGGING-PROTOCOL.md)               | Anti-hallucination debugging methodology       |

---

## By Technology

### Backend (.NET)

| File                                                                          | Description                              |
| ----------------------------------------------------------------------------- | ---------------------------------------- |
| [backend-dotnet.instructions.md](instructions/backend-dotnet.instructions.md) | CQRS, entities, repositories, validation |
| [clean-code.instructions.md](instructions/clean-code.instructions.md)         | SOLID, naming, architecture rules        |

### Frontend (Angular)

| File                                                                              | Description                             |
| --------------------------------------------------------------------------------- | --------------------------------------- |
| [frontend-angular.instructions.md](instructions/frontend-angular.instructions.md) | Components, stores, forms, API services |

### Testing & Quality

| File                                                                | Description                                  |
| ------------------------------------------------------------------- | -------------------------------------------- |
| [testing.instructions.md](instructions/testing.instructions.md)     | Unit tests, integration tests, test patterns |
| [debugging.instructions.md](instructions/debugging.instructions.md) | Debugging strategies and tools               |

---

## By Task Type

### Bug Fixing & Debugging

| Resource                                                                            | Type        | Description                           |
| ----------------------------------------------------------------------------------- | ----------- | ------------------------------------- |
| [bug-investigation.instructions.md](instructions/bug-investigation.instructions.md) | Instruction | Systematic bug investigation protocol |
| [debugging](skills/debugging/SKILL.md)                                              | Skill       | Systematic debugging with platform patterns |
| [tasks-bug-diagnosis](skills/tasks-bug-diagnosis/SKILL.md)                          | Skill       | Task-based bug diagnosis              |
| [debugging.agent.md](agents/debugging.agent.md)                                     | Agent       | Autonomous debugging agent            |

### New Features

| Resource                                                                                    | Type        | Description                       |
| ------------------------------------------------------------------------------------------- | ----------- | --------------------------------- |
| [feature-investigation.instructions.md](instructions/feature-investigation.instructions.md) | Instruction | Feature analysis protocol         |
| [feature-implementation](skills/feature-implementation/SKILL.md)                            | Skill       | Full-stack feature implementation |
| [tasks-feature-implementation](skills/tasks-feature-implementation/SKILL.md)                | Skill       | Task-based feature implementation |
| [feature-planner.agent.md](agents/feature-planner.agent.md)                                 | Agent       | Feature planning and design       |

### Code Review

| Resource                                               | Type  | Description            |
| ------------------------------------------------------ | ----- | ---------------------- |
| [code-review](skills/code-review/SKILL.md)             | Skill | Code review workflow   |
| [tasks-code-review](skills/tasks-code-review/SKILL.md) | Skill | Task-based code review |
| [code-review.agent.md](agents/code-review.agent.md)    | Agent | Autonomous code review |

### Testing

| Resource                                                       | Type  | Description                |
| -------------------------------------------------------------- | ----- | -------------------------- |
| [test-generation](skills/test-generation/SKILL.md)             | Skill | Test case generation       |
| [tasks-test-generation](skills/tasks-test-generation/SKILL.md) | Skill | Task-based test generation |
| [test-generator.agent.md](agents/test-generator.agent.md)      | Agent | Autonomous test generation |

### Documentation

| Resource                                                   | Type  | Description                                  |
| ---------------------------------------------------------- | ----- | -------------------------------------------- |
| [documentation](skills/documentation/SKILL.md)             | Skill | Code documentation workflow                  |
| [tasks-documentation](skills/tasks-documentation/SKILL.md) | Skill | Task-based documentation                     |
| [readme-improvement](skills/readme-improvement/SKILL.md)   | Skill | README enhancement                           |
| [feature-docs](skills/feature-docs/SKILL.md)               | Skill | Feature documentation with test verification |

---

## Skills Reference

### Backend Development

| Skill                                                                        | Trigger Keywords                                | Description                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------- |
| [backend-cqrs-command](skills/backend-cqrs-command/SKILL.md)                 | "command", "save", "create", "update", "delete" | CQRS command handlers         |
| [backend-cqrs-query](skills/backend-cqrs-query/SKILL.md)                     | "query", "get", "list", "search"                | CQRS query handlers           |
| [backend-entity-development](skills/backend-entity-development/SKILL.md)     | "entity", "domain model"                        | Entity and domain models      |
| [backend-entity-event-handler](skills/backend-entity-event-handler/SKILL.md) | "event handler", "side effect", "notification"  | Entity event handlers         |
| [backend-background-job](skills/backend-background-job/SKILL.md)             | "background job", "scheduled", "recurring"      | Background job implementation |
| [backend-message-bus](skills/backend-message-bus/SKILL.md)                   | "message bus", "consumer", "producer"           | Cross-service messaging       |
| [backend-data-migration](skills/backend-data-migration/SKILL.md)             | "migration", "data migration"                   | Database migrations           |

### Frontend Development

| Skill                                                                        | Trigger Keywords                      | Description                    |
| ---------------------------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| [frontend-angular-component](skills/frontend-angular-component/SKILL.md)     | "component", "angular component"      | Angular component development  |
| [frontend-angular-store](skills/frontend-angular-store/SKILL.md)             | "store", "state management"           | PlatformVmStore implementation |
| [frontend-angular-form](skills/frontend-angular-form/SKILL.md)               | "form", "validation", "reactive form" | Reactive form development      |
| [frontend-angular-api-service](skills/frontend-angular-api-service/SKILL.md) | "api service", "http service"         | API service implementation     |

### Architecture & Cross-Cutting

| Skill                                                                            | Trigger Keywords               | Description                  |
| -------------------------------------------------------------------------------- | ------------------------------ | ---------------------------- |
| [arch-cross-service-integration](skills/arch-cross-service-integration/SKILL.md) | "cross-service", "integration" | Service integration patterns |
| [arch-performance-optimization](skills/arch-performance-optimization/SKILL.md)   | "performance", "optimize"      | Performance optimization     |
| [arch-security-review](skills/arch-security-review/SKILL.md)                     | "security", "vulnerability"    | Security review and fixes    |

### Analysis & Planning

| Skill                                                          | Trigger Keywords                        | Description              |
| -------------------------------------------------------------- | --------------------------------------- | ------------------------ |
| [feature-investigation](skills/feature-investigation/SKILL.md) | "investigate", "understand", "how does" | Feature investigation    |
| [branch-comparison](skills/branch-comparison/SKILL.md)         | "compare branches", "diff"              | Branch diff analysis     |
| [package-upgrade](skills/package-upgrade/SKILL.md)             | "upgrade", "outdated", "dependencies"   | Package upgrade analysis |
| [plan-analysis](skills/plan-analysis/SKILL.md)                 | "analyze plan", "implementation plan"   | Plan impact assessment   |

### Utilities

| Skill                                                  | Trigger Keywords            | Description               |
| ------------------------------------------------------ | --------------------------- | ------------------------- |
| [context-curator](skills/context-curator/SKILL.md)     | "context", "relevant files" | Context file selection    |
| [memory-manager](skills/memory-manager/SKILL.md)       | "memory", "session"         | Session memory management |
| [mcp-optimizer](skills/mcp-optimizer/SKILL.md)         | "mcp", "tools"              | MCP tool optimization     |
| [tasks-spec-update](skills/tasks-spec-update/SKILL.md) | "spec", "specification"     | Specification updates     |

---

## Agents Reference

### Core Agents

| Agent                                                       | Auto-Trigger | Description                                      |
| ----------------------------------------------------------- | ------------ | ------------------------------------------------ |
| [code-review.agent.md](agents/code-review.agent.md)         | Yes          | Reviews code for patterns, security, performance |
| [test-generator.agent.md](agents/test-generator.agent.md)   | Yes          | Generates unit and integration tests             |
| [feature-planner.agent.md](agents/feature-planner.agent.md) | Yes          | Plans feature implementation strategy            |
| [debugging.agent.md](agents/debugging.agent.md)             | Yes          | Systematic debugging with evidence-based analysis |

### Development Agents

| Agent                                                                 | Auto-Trigger | Description                                    |
| --------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| [fullstack-developer.agent.md](agents/fullstack-developer.agent.md)   | Yes          | Execute implementation phases with boundaries  |
| [database-admin.agent.md](agents/database-admin.agent.md)             | Yes          | Database performance, optimization, migrations |
| [git-manager.agent.md](agents/git-manager.agent.md)                   | Yes          | Git operations, conventional commits, branches |
| [researcher.agent.md](agents/researcher.agent.md)                     | Yes          | Technology research, documentation lookup      |

### Design & Documentation Agents

| Agent                                                           | Auto-Trigger | Description                                     |
| --------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| [ui-ux-designer.agent.md](agents/ui-ux-designer.agent.md)       | Yes          | BEM naming, responsive design, accessibility    |
| [copywriter.agent.md](agents/copywriter.agent.md)               | Yes          | Technical copywriting, UI text, documentation   |
| [docs-manager.agent.md](agents/docs-manager.agent.md)           | Yes          | Documentation audits, updates, PDR management   |
| [journal-writer.agent.md](agents/journal-writer.agent.md)       | Yes          | Development journals for significant issues     |

### Planning & Analysis Agents

| Agent                                                           | Auto-Trigger | Description                                     |
| --------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| [brainstormer.agent.md](agents/brainstormer.agent.md)           | Yes          | Creative problem-solving, solution exploration  |
| [project-manager.agent.md](agents/project-manager.agent.md)     | Yes          | Progress tracking, status reporting             |
| [scout.agent.md](agents/scout.agent.md)                         | Yes          | Codebase exploration, file location             |
| [scout-external.agent.md](agents/scout-external.agent.md)       | Yes          | External tool-powered codebase exploration      |
| [mcp-manager.agent.md](agents/mcp-manager.agent.md)             | Yes          | MCP server integration, tool discovery          |

---

## Prompts Reference

### Workflow Prompts

| Prompt | Description |
| ------ | ----------- |
| [planning.prompt.md](prompts/planning.prompt.md) | Systematic planning for implementation tasks |
| [code.prompt.md](prompts/code.prompt.md) | Code implementation workflow with verification |
| [fix.prompt.md](prompts/fix.prompt.md) | Intelligent bug fixing with root cause analysis |
| [debugging.prompt.md](prompts/debugging.prompt.md) | Systematic debugging strategies |
| [testing.prompt.md](prompts/testing.prompt.md) | Test planning and execution |
| [code-review.prompt.md](prompts/code-review.prompt.md) | Code review workflow |
| [brainstorm.prompt.md](prompts/brainstorm.prompt.md) | Solution brainstorming with YAGNI/KISS/DRY |
| [scout.prompt.md](prompts/scout.prompt.md) | Fast codebase exploration |
| [codebase-review.prompt.md](prompts/codebase-review.prompt.md) | Comprehensive codebase analysis |

### Feature Development

| Prompt | Description |
| ------ | ----------- |
| [feature-implementation.prompt.md](prompts/feature-implementation.prompt.md) | Full-stack feature implementation |
| [debugging.prompt.md](prompts/debugging.prompt.md) | Systematic debugging strategies |
| [backend-development.prompt.md](prompts/backend-development.prompt.md) | Backend development patterns |
| [frontend-angular.prompt.md](prompts/frontend-angular.prompt.md) | Angular frontend development patterns |
| [security-review.prompt.md](prompts/security-review.prompt.md) | Security vulnerability assessment |
| [performance-optimization.prompt.md](prompts/performance-optimization.prompt.md) | Performance analysis and optimization |

### Code Generation

| Prompt | Description |
| ------ | ----------- |
| [create-cqrs-command.prompt.md](prompts/create-cqrs-command.prompt.md) | CQRS command handler creation |
| [create-cqrs-query.prompt.md](prompts/create-cqrs-query.prompt.md) | CQRS query handler creation |
| [create-entity-dto.prompt.md](prompts/create-entity-dto.prompt.md) | Entity and DTO creation |
| [create-entity-event.prompt.md](prompts/create-entity-event.prompt.md) | Entity event handler creation |
| [create-angular-component.prompt.md](prompts/create-angular-component.prompt.md) | Angular component scaffolding |
| [create-api-service.prompt.md](prompts/create-api-service.prompt.md) | API service creation |
| [create-unit-test.prompt.md](prompts/create-unit-test.prompt.md) | Unit test generation |

### Documentation

| Prompt | Description |
| ------ | ----------- |
| [documentation.prompt.md](prompts/documentation.prompt.md) | General documentation workflow |
| [docs-init.prompt.md](prompts/docs-init.prompt.md) | Initialize project documentation |
| [docs-summarize.prompt.md](prompts/docs-summarize.prompt.md) | Summarize existing documentation |
| [docs-update.prompt.md](prompts/docs-update.prompt.md) | Update docs based on code changes |

### Git Operations

| Prompt | Description |
| ------ | ----------- |
| [git-commit.prompt.md](prompts/git-commit.prompt.md) | Conventional commit workflow |
| [git-pr.prompt.md](prompts/git-pr.prompt.md) | Pull request creation |

---

## Chat Modes Reference

| Chat Mode                                                           | Description                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| [tech-lead.chatmode.md](chatmodes/tech-lead.chatmode.md)            | Strategic thinking, risk assessment for tech leads    |
| [senior-developer.chatmode.md](chatmodes/senior-developer.chatmode.md) | Trade-offs, architecture for senior developers     |
| [backend-developer.chatmode.md](chatmodes/backend-developer.chatmode.md) | .NET 9 CQRS, Clean Architecture focus            |
| [frontend-developer.chatmode.md](chatmodes/frontend-developer.chatmode.md) | Angular 19, PlatformVmStore, BEM naming focus  |

---

## File Types

| Extension          | Purpose                                         | Location                 |
| ------------------ | ----------------------------------------------- | ------------------------ |
| `.instructions.md` | Auto-applied context based on `applyTo` pattern | `.github/instructions/`  |
| `SKILL.md`         | Invocable workflows with checklists             | `.github/skills/{name}/` |
| `.agent.md`        | Autonomous task handlers                        | `.github/agents/`        |
| `.prompt.md`       | Reusable prompt templates                       | `.github/prompts/`       |
| `.chatmode.md`     | Custom conversation modes and personas          | `.github/chatmodes/`     |

---

## MCP Configuration

MCP servers are configured in `.vscode/mcp.json`:

| Server               | Type  | Description                       |
| -------------------- | ----- | --------------------------------- |
| `github`             | http  | GitHub API operations             |
| `context7`           | stdio | Library documentation lookup      |
| `memory`             | stdio | Knowledge graph persistence       |
| `playwright`         | stdio | Browser automation                |
| `sequential-thinking`| stdio | Structured problem solving        |

---

## Configuration Tips

### For Best Results

1. **Keep relevant files open** - Copilot uses open files as context
2. **Use `@workspace`** - For codebase-wide questions
3. **Reference files with `#filename`** - For specific file context
4. **Clear conversation** - When switching topics

### Custom Instructions Priority

1. Project-level: `.github/copilot-instructions.md`
2. Instruction files: `.github/instructions/*.instructions.md` (matched by `applyTo` glob)
3. Skills: Invoked explicitly or by keyword triggers
4. Agents: Auto-triggered or explicitly invoked

---

## Quick Links by Role

### For New Developers

1. Start with [Main Instructions](copilot-instructions.md) - Overview section
2. Read [Quick Reference](instructions/quick-reference.instructions.md) - Common patterns
3. Study [clean-code.instructions.md](instructions/clean-code.instructions.md) - Coding standards

### For Backend Developers

1. [backend-dotnet.instructions.md](instructions/backend-dotnet.instructions.md)
2. [backend-cqrs-command](skills/backend-cqrs-command/SKILL.md)
3. [backend-entity-development](skills/backend-entity-development/SKILL.md)

### For Frontend Developers

1. [frontend-angular.instructions.md](instructions/frontend-angular.instructions.md)
2. [frontend-angular-component](skills/frontend-angular-component/SKILL.md)
3. [frontend-angular-store](skills/frontend-angular-store/SKILL.md)

### For Code Reviewers

1. [code-review.agent.md](agents/code-review.agent.md)
2. [arch-security-review](skills/arch-security-review/SKILL.md)
3. [arch-performance-optimization](skills/arch-performance-optimization/SKILL.md)
