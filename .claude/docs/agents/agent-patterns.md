# Agent Patterns

> When and how to use each agent type effectively

## Overview

This guide provides detailed patterns for using each agent type, including decision trees, real-world examples, and composition strategies for complex workflows.

---

## Exploration and Investigation

### `/investigate` Skill

**Purpose:** Evidence-based codebase investigation with dependency tracing, graph context, and explicit validation of findings.

**Best For:**

- Finding relevant files and entry points before changes
- Tracing behavior across layers and service boundaries
- Mapping callers, dependents, tests, and failure paths

**Invocation:**

```text
/investigate "Find all files related to employee validation in ServiceB and trace the request flow"
```

Use direct search tools for a single known path. Use `/investigate` when the answer requires cross-file relationships, runtime flow, or evidence-backed recommendations.

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
    subagent_type: 'Explore',
    prompt: 'How does the leave request approval workflow work? Trace from API endpoint to final state change.',
    description: 'Explore leave approval workflow'
});
```

**Thoroughness Levels:**

```typescript
// Quick exploration
Task({
    subagent_type: 'Explore',
    prompt: 'Find the main entry points for user authentication'
});

// Medium exploration
Task({
    subagent_type: 'Explore',
    prompt: 'medium: How is form validation implemented in Angular components'
});

// Very thorough
Task({
    subagent_type: 'Explore',
    prompt: 'very thorough: Map the complete data flow for performance review submission including all cross-service communication'
});
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
    subagent_type: 'researcher',
    prompt: "Research Signal-based state management in the frontend framework (e.g., Angular, React). Compare with the project's store patterns. Provide migration recommendations.",
    description: 'Research Angular signals'
});
```

**Pattern: Technology Evaluation**

```typescript
Task({
    subagent_type: 'researcher',
    prompt: `
    Research options for implementing real-time notifications:
    1. SignalR vs Server-Sent Events vs WebSockets
    2. Integration with RabbitMQ message bus
    3. Angular client implementation
    Provide comparison matrix and recommendation for YourProject.
  `,
    description: 'Research real-time notifications'
});
```

**Pattern: Documentation Synthesis**

```typescript
Task({
    subagent_type: 'researcher',
    prompt: 'Gather all Better Auth documentation for implementing OAuth 2.1 with refresh token rotation. Summarize key implementation steps for .NET 9.',
    description: 'Research Better Auth OAuth'
});
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
    subagent_type: 'planner',
    prompt: `
    Create implementation plan for adding dark mode support:
    - Context: Angular 19 frontend with SCSS
    - Constraints: Must work with existing design tokens
    - Output: Phased plan with files to modify
  `,
    description: 'Plan dark mode implementation'
});
```

**Pattern: Phased Implementation**

```typescript
Task({
    subagent_type: 'planner',
    prompt: `
    Plan migration from BehaviorSubject to Angular Signals:

    Phase 1: Identify all BehaviorSubject usage
    Phase 2: Create signal equivalents
    Phase 3: Update consumers
    Phase 4: Remove deprecated code

    For each phase, list specific files and changes.
  `,
    description: 'Plan signal migration'
});
```

---

### Planner Agent (Architecture Evaluation)

**Purpose:** Evaluate options before committing to approach.

**Best For:**

- Architectural decisions
- Trade-off analysis
- Complex problem solving

**Invocation:**

```typescript
Task({
    subagent_type: 'planner',
    prompt: `
    Evaluate: How should we handle file uploads > 1GB?

    Options to consider:
    1. Chunked upload with resume
    2. Pre-signed URLs to blob storage
    3. Background processing with webhooks

    Analyze: complexity, cost, UX, reliability
  `,
    description: 'Plan large file uploads'
});
```

**Pattern: Architecture Review**

```typescript
Task({
    subagent_type: 'planner',
    prompt: `
    Review proposed change: Move validation from command handlers to entities.

    Current: Validation in SaveEmployeeCommandHandler
    Proposed: Validation in Employee entity static method

    Analyze: reusability, testability, single responsibility, existing patterns in codebase
  `,
    description: 'Review validation architecture'
});
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
    subagent_type: 'fullstack-developer',
    prompt: `
    Execute Phase 2 from plan: 250113-dark-mode/phase-02-theme-provider.md (under the plans root)

    Files owned:
    - src/{FrontendApp}/libs/{core-lib}/theme/
    - src/{FrontendApp}/apps/{app-name}/styles/

    Do NOT modify files outside ownership boundary.
  `,
    description: 'Implement theme provider'
});
```

**Pattern: Parallel Implementation**

```typescript
// Launch multiple developers for independent phases
Task({
    subagent_type: 'fullstack-developer',
    prompt: 'Implement backend API endpoint per Phase 1',
    description: 'Backend API'
});

Task({
    subagent_type: 'fullstack-developer',
    prompt: 'Implement frontend component per Phase 2',
    description: 'Frontend component'
});
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
    subagent_type: 'code-simplifier',
    prompt: 'Simplify the SaveEmployeeCommand handler - reduce nesting, extract methods, improve naming',
    description: 'Simplify employee command'
});
```

**Pattern: Focused Refactoring**

```typescript
Task({
    subagent_type: 'code-simplifier',
    prompt: `
    Review and simplify recently modified files:
    - EmployeeFormComponent.ts
    - EmployeeValidation.cs

    Focus: reduce complexity, improve readability, maintain functionality
  `,
    description: 'Simplify recent changes'
});
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
    subagent_type: 'code-reviewer',
    prompt: 'Review changes in branch feature/employee-import for security vulnerabilities and platform pattern compliance',
    description: 'Review employee import'
});
```

**Pattern: Focused Review**

```typescript
Task({
    subagent_type: 'code-reviewer',
    prompt: `
    Review for specific concerns:
    1. SQL injection risks in query builders
    2. Proper authorization checks
    3. Entity validation patterns

    Files: src/Services/ServiceB/UseCaseCommands/Import/
  `,
    description: 'Security review import'
});
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
    subagent_type: 'debugger',
    prompt: `
    Investigate: EmployeeValidationTest.ShouldFailForDuplicateEmail fails intermittently

    Error: Expected validation to fail but it passed

    Check:
    1. Test isolation issues
    2. Database state between tests
    3. Async timing problems
  `,
    description: 'Debug flaky test'
});
```

**Pattern: Error Trace**

```typescript
Task({
    subagent_type: 'debugger',
    prompt: `
    Trace error:
    "NullReferenceException at EmployeeService.GetFullName()"

    Stack trace:
    at EmployeeService.GetFullName(Employee e)
    at SaveEmployeeCommandHandler.HandleAsync()

    Find root cause and suggest fix.
  `,
    description: 'Debug null reference'
});
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
    subagent_type: 'tester',
    prompt: 'Run all tests for ServiceA service and report failures with suggested fixes',
    description: 'Run ServiceA tests',
    run_in_background: true
});
```

**Pattern: Targeted Testing**

```typescript
Task({
    subagent_type: 'tester',
    prompt: `
    Test the SaveEmployeeCommand:
    1. Run existing unit tests
    2. Identify untested edge cases
    3. Generate additional tests for:
       - Duplicate email validation
       - Invalid department reference
       - Concurrent updates
  `,
    description: 'Test employee save'
});
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
    subagent_type: 'git-manager',
    prompt: 'Stage all changes and create commit with conventional commit message',
    description: 'Commit changes'
});
```

**Pattern: Feature Commit**

```typescript
Task({
    subagent_type: 'git-manager',
    prompt: `
    Create commit for employee import feature:
    - Stage: src/Services/ServiceB/UseCaseCommands/Import/
    - Message type: feat
    - Scope: employee
    - Description: add bulk import with validation
  `,
    description: 'Commit import feature'
});
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
    subagent_type: 'docs-manager',
    prompt: 'Update backend-patterns.md with the new entity event handler pattern discovered in employee import',
    description: 'Update backend patterns'
});
```

---

## Composition Patterns

### Sequential Workflow

```typescript
// 1. Research → 2. Plan → 3. Implement → 4. Test → 5. Review

// Step 1: Research
const research = Task({ subagent_type: 'researcher', prompt: 'Research...' });

// Step 2: Plan (uses research results)
const plan = Task({ subagent_type: 'planner', prompt: 'Plan based on research...' });

// Step 3: Implement (follows plan)
const impl = Task({ subagent_type: 'fullstack-developer', prompt: 'Implement phase 1...' });

// Step 4: Test
const tests = Task({ subagent_type: 'tester', prompt: 'Test implementation...' });

// Step 5: Review
const review = Task({ subagent_type: 'code-reviewer', prompt: 'Review changes...' });
```

### Parallel Research

```typescript
// Launch multiple researchers in parallel
Task({
    subagent_type: 'researcher',
    prompt: 'Research Angular state management options'
});

Task({
    subagent_type: 'researcher',
    prompt: 'Research .NET caching strategies'
});

// Wait for both, then synthesize
```

### Investigation Pipeline

```typescript
// 1. The main session investigates the code path
/investigate "Find and trace all files related to performance review calculation"

// 2. Explore understands flow
Task({
    subagent_type: 'Explore',
    prompt: 'Trace performance review calculation from API to database'
});

// 3. Debugger investigates issue
Task({
    subagent_type: 'debugger',
    prompt: 'Debug incorrect score calculation based on exploration findings'
});
```

---

## Anti-Patterns

### Over-Orchestration

```typescript
// ❌ Too many agents for simple task
Glob({ pattern: "**/Button.tsx" })
Task({ subagent_type: "Explore", prompt: "Understand Button.tsx" })
Task({ subagent_type: "planner", prompt: "Plan Button change" })

// ✅ Direct action for simple task
Read({ file_path: "src/components/Button.tsx" })
Edit({ file_path: "src/components/Button.tsx", ... })
```

### Missing Context

```typescript
// ❌ Vague prompt without context
Task({ subagent_type: 'debugger', prompt: 'Fix the bug' });

// ✅ Complete context
Task({
    subagent_type: 'debugger',
    prompt: `
    Fix failing test: EmployeeValidationTest.ShouldFailForDuplicateEmail
    Error: System.InvalidOperationException
    Location: src/Services/ServiceB/Tests/
  `
});
```

### Sequential When Parallel Works

```typescript
// ❌ Sequential for independent tasks
const a = await Task({ subagent_type: 'researcher', prompt: 'Find A' });
const b = await Task({ subagent_type: 'researcher', prompt: 'Find B' });

// ✅ Parallel in single message
Task({ subagent_type: 'researcher', prompt: 'Find A' });
Task({ subagent_type: 'researcher', prompt: 'Find B' });
```

---

## Adding or changing an agent's quality protocol

Agents carry the same applicable role-specific quality SYNC blocks as their twin skills (see [README.md](./README.md) → _Quality-Parity with Skills_). The per-agent assignment and agent-to-skill connection live in `.claude/scripts/agent_protocol_matrix.py` — those manifests are the single source of truth; never hand-edit generated SYNC or connection blocks in an agent `.md` directly.

**Contributor loop (3 steps):**

1. **Edit the matrix** — add/adjust the agent's row in `AGENT_QUALITY_BLOCKS`, its `FAMILIES` membership, or its `AGENT_SKILL_CONNECTIONS` entry in `agent_protocol_matrix.py`. The quality row is a **persistent target set**: list every block the agent should carry, including ones it already has — the manifest is the single source of truth for intended per-agent state, so blocks are never pruned after injection. Every agent must have at least one valid connected skill, and every native frontmatter `skills:` entry must appear in that connection list. Then `python .claude/scripts/agent_protocol_matrix.py --validate` → must print `OK` (canonical tags, no orchestration leak, partition clean, spawn-capability clear, tier policy clear, connection coverage clear).
2. **Dry-run both injectors** — `python .claude/scripts/inject_agent_protocol_blocks.py --dry-run` and `python .claude/scripts/inject_agent_skill_connections.py --dry-run` → review the planned adds. A bare quality invocation targets every matrix agent; the connection invocation targets every connected agent. Narrow either with `--family=<name>`, `--agents=<a,b>` (quality), or `--agents=<a,b>` (connections). There is no `--all` flag — the unknown-argument guard rejects it.
3. **Real run + idempotent re-run** — run both injectors, then re-run both with `--dry-run` → must report zero changes. Re-run the `agent-universal-rules` suite (`node .claude/hooks/tests/run-all-tests.cjs`) → `TC-UAR-003..018` green.

**Tier rule (enforced — `TC-UAR-004`):** the four code-tier blocks (`understand-code-first`, `evidence-based-reasoning`, `cross-service-check`, `fix-layer-accountability`) go on code-touching agents ONLY. A core-only agent (docs-manager, git-manager, journal-writer, knowledge-worker) must carry NONE of them. `validate()` check (e) and the test suite both hard-fail on a leak.

**Orchestration-exclusion rule:** orchestration blocks must NOT propagate to agents — they govern the orchestrator, not a worker. The owner of the list is `EXCLUDED_ORCHESTRATION` in `.claude/scripts/agent_protocol_matrix.py` (read it there, never a copy here): main-loop and session blocks such as `sub-agent-selection` and `session-goal-ledger`, plus the review-loop blocks (`systematic-review-batching`, `review-protocol-injection`, `review-policy`) that the orchestrating review skill carries inline. The **sole whitelist exception** is `framework-maintainer`, which legitimately spawns/curates sub-agents and so carries `sub-agent-selection`. Any new exception must be declared explicitly in the matrix, not added ad-hoc to an agent file.

**Deferred-mirror convention:** source-side agent + doc edits under `.claude/` land first; the AI-harness mirrors (`.agents/`, `.codex/`, `AGENTS.md`) regenerate via `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` then `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only` as a **separate, single-purpose commit** — never bundled with the hand-curated source change. See the Phase 09 handoff in [`260616-agent-skill-quality-parity/phase-09-verify-and-handoff.md`](../../../plans/260616-agent-skill-quality-parity/phase-09-verify-and-handoff.md), under the plans root — default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path (the relative link assumes the default).

## Related Documentation

- [README.md](./README.md) - Agent overview and catalog
- [../skills/README.md](../skills/README.md) - Skills that enhance agents
- [../hooks/README.md](../hooks/README.md) - Hook lifecycle (standing sub-agent context is static in `agents/*.md`; `SubagentStart` runs only the protocol-delivery handlers)

---

_Source: Agent usage patterns and best practices_
