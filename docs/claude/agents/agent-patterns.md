# Agent Patterns

> When and how to use each agent type effectively

## Overview

This guide provides detailed patterns for using each agent type, including decision trees, real-world examples, and composition strategies for complex workflows.

---

## Exploration Agents

### Scout Agent

**Purpose:** Fast file discovery using pattern matching.

**Best For:**
- Finding files by name patterns
- Locating implementations before changes
- Understanding file distribution across directories

**Invocation:**

```typescript
Task({
  subagent_type: "scout",
  prompt: "Find all files related to employee validation in bravoTALENTS",
  description: "Find employee validation files"
})
```

**Pattern: Targeted Search**

```typescript
// Specific file type in specific service
Task({
  subagent_type: "scout",
  prompt: "Find all *CommandHandler.cs files in bravoGROWTH/UseCaseCommands/",
  description: "Find Growth command handlers"
})
```

**Pattern: Relationship Discovery**

```typescript
// Find related files across boundaries
Task({
  subagent_type: "scout",
  prompt: "Find all files that reference EmployeeEntity - include consumers, producers, DTOs, and tests",
  description: "Find EmployeeEntity dependencies"
})
```

**When to Use Scout vs Direct Tools:**

| Need | Use Scout | Use Direct Tools |
|------|-----------|------------------|
| Find by name pattern | Multiple directories | Single known directory |
| Find by content | Cross-service | Known file |
| Understand structure | Yes | No |
| Quick lookup | No | Yes |

---

### Explore Agent

**Purpose:** Thorough codebase exploration with context.

**Best For:**
- Understanding how features work
- Mapping service boundaries
- Answering architectural questions

**Invocation:**

```typescript
Task({
  subagent_type: "Explore",
  prompt: "How does the leave request approval workflow work? Trace from API endpoint to final state change.",
  description: "Explore leave approval workflow"
})
```

**Thoroughness Levels:**

```typescript
// Quick exploration
Task({
  subagent_type: "Explore",
  prompt: "quick: Find the main entry points for user authentication"
})

// Medium exploration
Task({
  subagent_type: "Explore",
  prompt: "medium: How is form validation implemented in Angular components"
})

// Very thorough
Task({
  subagent_type: "Explore",
  prompt: "very thorough: Map the complete data flow for performance review submission including all cross-service communication"
})
```

---

### Researcher Agent

**Purpose:** Comprehensive research combining codebase and external sources.

**Best For:**
- Learning new technologies
- Finding best practices
- Comparing implementation approaches

**Invocation:**

```typescript
Task({
  subagent_type: "researcher",
  prompt: "Research Signal-based state management in Angular 19. Compare with PlatformVmStore patterns. Provide migration recommendations.",
  description: "Research Angular signals"
})
```

**Pattern: Technology Evaluation**

```typescript
Task({
  subagent_type: "researcher",
  prompt: `
    Research options for implementing real-time notifications:
    1. SignalR vs Server-Sent Events vs WebSockets
    2. Integration with RabbitMQ message bus
    3. Angular client implementation
    Provide comparison matrix and recommendation for BravoSUITE.
  `,
  description: "Research real-time notifications"
})
```

**Pattern: Documentation Synthesis**

```typescript
Task({
  subagent_type: "researcher",
  prompt: "Gather all Better Auth documentation for implementing OAuth 2.1 with refresh token rotation. Summarize key implementation steps for .NET 9.",
  description: "Research Better Auth OAuth"
})
```

---

## Planning Agents

### Planner Agent

**Purpose:** Create comprehensive implementation plans.

**Best For:**
- Feature implementation planning
- Refactoring strategies
- Migration planning

**Invocation:**

```typescript
Task({
  subagent_type: "planner",
  prompt: `
    Create implementation plan for adding dark mode support:
    - Context: Angular 19 frontend with SCSS
    - Constraints: Must work with existing design tokens
    - Output: Phased plan with files to modify
  `,
  description: "Plan dark mode implementation"
})
```

**Pattern: Phased Implementation**

```typescript
Task({
  subagent_type: "planner",
  prompt: `
    Plan migration from BehaviorSubject to Angular Signals:

    Phase 1: Identify all BehaviorSubject usage
    Phase 2: Create signal equivalents
    Phase 3: Update consumers
    Phase 4: Remove deprecated code

    For each phase, list specific files and changes.
  `,
  description: "Plan signal migration"
})
```

---

### Brainstormer Agent

**Purpose:** Evaluate options before committing to approach.

**Best For:**
- Architectural decisions
- Trade-off analysis
- Complex problem solving

**Invocation:**

```typescript
Task({
  subagent_type: "brainstormer",
  prompt: `
    Debate: How should we handle file uploads > 1GB?

    Options to consider:
    1. Chunked upload with resume
    2. Pre-signed URLs to blob storage
    3. Background processing with webhooks

    Evaluate: complexity, cost, UX, reliability
  `,
  description: "Brainstorm large file uploads"
})
```

**Pattern: Architecture Review**

```typescript
Task({
  subagent_type: "brainstormer",
  prompt: `
    Review proposed change: Move validation from command handlers to entities.

    Current: Validation in SaveEmployeeCommandHandler
    Proposed: Validation in Employee entity static method

    Analyze: reusability, testability, single responsibility, existing patterns in codebase
  `,
  description: "Review validation architecture"
})
```

---

## Development Agents

### Fullstack Developer Agent

**Purpose:** Execute implementation phases from plans.

**Best For:**
- Implementing planned features
- Parallel execution with file ownership boundaries
- Multi-file changes

**Invocation:**

```typescript
Task({
  subagent_type: "fullstack-developer",
  prompt: `
    Execute Phase 2 from plan: plans/250113-dark-mode/phase-02-theme-provider.md

    Files owned:
    - src/WebV2/libs/platform-core/theme/
    - src/WebV2/apps/growth-for-company/styles/

    Do NOT modify files outside ownership boundary.
  `,
  description: "Implement theme provider"
})
```

**Pattern: Parallel Implementation**

```typescript
// Launch multiple developers for independent phases
Task({
  subagent_type: "fullstack-developer",
  prompt: "Implement backend API endpoint per Phase 1",
  description: "Backend API"
})

Task({
  subagent_type: "fullstack-developer",
  prompt: "Implement frontend component per Phase 2",
  description: "Frontend component"
})
```

---

### Code Simplifier Agent

**Purpose:** Refactor code for clarity and maintainability.

**Best For:**
- Post-implementation cleanup
- Technical debt reduction
- Code review follow-up

**Invocation:**

```typescript
Task({
  subagent_type: "code-simplifier",
  prompt: "Simplify the SaveEmployeeCommand handler - reduce nesting, extract methods, improve naming",
  description: "Simplify employee command"
})
```

**Pattern: Focused Refactoring**

```typescript
Task({
  subagent_type: "code-simplifier",
  prompt: `
    Review and simplify recently modified files:
    - EmployeeFormComponent.ts
    - EmployeeValidation.cs

    Focus: reduce complexity, improve readability, maintain functionality
  `,
  description: "Simplify recent changes"
})
```

---

## Quality Agents

### Code Reviewer Agent

**Purpose:** Comprehensive code review and quality assessment.

**Best For:**
- Pre-merge review
- Security audit
- Performance review

**Invocation:**

```typescript
Task({
  subagent_type: "code-reviewer",
  prompt: "Review changes in branch feature/employee-import for security vulnerabilities and platform pattern compliance",
  description: "Review employee import"
})
```

**Pattern: Focused Review**

```typescript
Task({
  subagent_type: "code-reviewer",
  prompt: `
    Review for specific concerns:
    1. SQL injection risks in query builders
    2. Proper authorization checks
    3. Entity validation patterns

    Files: src/Services/bravoTALENTS/UseCaseCommands/Import/
  `,
  description: "Security review import"
})
```

---

### Debugger Agent

**Purpose:** Systematic issue investigation.

**Best For:**
- Test failures
- Production issues
- Performance problems

**Invocation:**

```typescript
Task({
  subagent_type: "debugger",
  prompt: `
    Investigate: EmployeeValidationTest.ShouldFailForDuplicateEmail fails intermittently

    Error: Expected validation to fail but it passed

    Check:
    1. Test isolation issues
    2. Database state between tests
    3. Async timing problems
  `,
  description: "Debug flaky test"
})
```

**Pattern: Error Trace**

```typescript
Task({
  subagent_type: "debugger",
  prompt: `
    Trace error:
    "NullReferenceException at EmployeeService.GetFullName()"

    Stack trace:
    at EmployeeService.GetFullName(Employee e)
    at SaveEmployeeCommandHandler.HandleAsync()

    Find root cause and suggest fix.
  `,
  description: "Debug null reference"
})
```

---

### Tester Agent

**Purpose:** Test execution and validation.

**Best For:**
- Running test suites
- Coverage analysis
- Test creation

**Invocation:**

```typescript
Task({
  subagent_type: "tester",
  prompt: "Run all tests for bravoGROWTH service and report failures with suggested fixes",
  description: "Run Growth tests",
  run_in_background: true
})
```

**Pattern: Targeted Testing**

```typescript
Task({
  subagent_type: "tester",
  prompt: `
    Test the SaveEmployeeCommand:
    1. Run existing unit tests
    2. Identify untested edge cases
    3. Generate additional tests for:
       - Duplicate email validation
       - Invalid department reference
       - Concurrent updates
  `,
  description: "Test employee save"
})
```

---

## Operations Agents

### Git Manager Agent

**Purpose:** Git operations with conventional commits.

**Best For:**
- Staging and committing changes
- Creating PRs
- Branch management

**Invocation:**

```typescript
Task({
  subagent_type: "git-manager",
  prompt: "Stage all changes and create commit with conventional commit message",
  description: "Commit changes"
})
```

**Pattern: Feature Commit**

```typescript
Task({
  subagent_type: "git-manager",
  prompt: `
    Create commit for employee import feature:
    - Stage: src/Services/bravoTALENTS/UseCaseCommands/Import/
    - Message type: feat
    - Scope: employee
    - Description: add bulk import with validation
  `,
  description: "Commit import feature"
})
```

---

### Docs Manager Agent

**Purpose:** Technical documentation maintenance.

**Best For:**
- Updating documentation
- Creating feature docs
- API documentation

**Invocation:**

```typescript
Task({
  subagent_type: "docs-manager",
  prompt: "Update backend-patterns.md with the new entity event handler pattern discovered in employee import",
  description: "Update backend patterns"
})
```

---

### Project Manager Agent

**Purpose:** Progress tracking and reporting.

**Best For:**
- Status summaries
- Plan progress tracking
- Report consolidation

**Invocation:**

```typescript
Task({
  subagent_type: "project-manager",
  prompt: "Consolidate reports from plans/250113-employee-import/ and provide status summary with next steps",
  description: "Project status"
})
```

---

## Composition Patterns

### Sequential Workflow

```typescript
// 1. Research → 2. Plan → 3. Implement → 4. Test → 5. Review

// Step 1: Research
const research = Task({ subagent_type: "researcher", prompt: "Research..." });

// Step 2: Plan (uses research results)
const plan = Task({ subagent_type: "planner", prompt: "Plan based on research..." });

// Step 3: Implement (follows plan)
const impl = Task({ subagent_type: "fullstack-developer", prompt: "Implement phase 1..." });

// Step 4: Test
const tests = Task({ subagent_type: "tester", prompt: "Test implementation..." });

// Step 5: Review
const review = Task({ subagent_type: "code-reviewer", prompt: "Review changes..." });
```

### Parallel Research

```typescript
// Launch multiple researchers in parallel
Task({
  subagent_type: "researcher",
  prompt: "Research Angular state management options"
})

Task({
  subagent_type: "researcher",
  prompt: "Research .NET caching strategies"
})

// Wait for both, then synthesize
```

### Investigation Pipeline

```typescript
// 1. Scout finds files
Task({
  subagent_type: "scout",
  prompt: "Find all files related to performance review calculation"
})

// 2. Explore understands flow
Task({
  subagent_type: "Explore",
  prompt: "Trace performance review calculation from API to database"
})

// 3. Debugger investigates issue
Task({
  subagent_type: "debugger",
  prompt: "Debug incorrect score calculation based on exploration findings"
})
```

---

## Anti-Patterns

### Over-Orchestration

```typescript
// ❌ Too many agents for simple task
Task({ subagent_type: "scout", prompt: "Find Button.tsx" })
Task({ subagent_type: "Explore", prompt: "Understand Button.tsx" })
Task({ subagent_type: "planner", prompt: "Plan Button change" })

// ✅ Direct action for simple task
Read({ file_path: "src/components/Button.tsx" })
Edit({ file_path: "src/components/Button.tsx", ... })
```

### Missing Context

```typescript
// ❌ Vague prompt without context
Task({ subagent_type: "debugger", prompt: "Fix the bug" })

// ✅ Complete context
Task({
  subagent_type: "debugger",
  prompt: `
    Fix failing test: EmployeeValidationTest.ShouldFailForDuplicateEmail
    Error: System.InvalidOperationException
    Location: src/Services/bravoTALENTS/Tests/
  `
})
```

### Sequential When Parallel Works

```typescript
// ❌ Sequential for independent tasks
const a = await Task({ subagent_type: "scout", prompt: "Find A" });
const b = await Task({ subagent_type: "scout", prompt: "Find B" });

// ✅ Parallel in single message
Task({ subagent_type: "scout", prompt: "Find A" })
Task({ subagent_type: "scout", prompt: "Find B" })
```

---

## Related Documentation

- [README.md](./README.md) - Agent overview and catalog
- [../skills/README.md](../skills/README.md) - Skills that enhance agents
- [../commands/workflow-commands.md](../commands/workflow-commands.md) - Workflow commands using agents
- [../hooks/architecture.md](../hooks/architecture.md) - SubagentStart hook

---

*Source: Agent usage patterns and best practices*
