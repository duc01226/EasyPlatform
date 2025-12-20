# Copilot Configuration Index

> Central navigation for all GitHub Copilot configuration files in EasyPlatform

---

## Quick Links

| Resource                                                        | Description                                    |
| --------------------------------------------------------------- | ---------------------------------------------- |
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
| [bug-diagnosis](skills/bug-diagnosis/SKILL.md)                                      | Skill       | Root cause analysis workflow          |
| [tasks-bug-diagnosis](skills/tasks-bug-diagnosis/SKILL.md)                          | Skill       | Task-based bug diagnosis              |
| [bug-diagnosis.agent.md](agents/bug-diagnosis.agent.md)                             | Agent       | Autonomous bug diagnosis              |

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

| Agent                                                       | Auto-Trigger | Description                                      |
| ----------------------------------------------------------- | ------------ | ------------------------------------------------ |
| [code-review.agent.md](agents/code-review.agent.md)         | Yes          | Reviews code for patterns, security, performance |
| [test-generator.agent.md](agents/test-generator.agent.md)   | Yes          | Generates unit and integration tests             |
| [feature-planner.agent.md](agents/feature-planner.agent.md) | Yes          | Plans feature implementation strategy            |
| [bug-diagnosis.agent.md](agents/bug-diagnosis.agent.md)     | Yes          | Diagnoses bugs with evidence-based analysis      |

---

## File Types

| Extension          | Purpose                                         | Location                 |
| ------------------ | ----------------------------------------------- | ------------------------ |
| `.instructions.md` | Auto-applied context based on `applyTo` pattern | `.github/instructions/`  |
| `SKILL.md`         | Invocable workflows with checklists             | `.github/skills/{name}/` |
| `.agent.md`        | Autonomous task handlers                        | `.github/agents/`        |
| `.prompt.md`       | Reusable prompt templates                       | `.github/prompts/`       |

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
