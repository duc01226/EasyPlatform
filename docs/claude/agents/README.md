# Agents Reference

> 26+ specialized subagents for autonomous task execution

## Overview

Agents are specialized subprocesses spawned via the `Task` tool to handle complex, multi-step operations autonomously. Each agent type has specific capabilities, tools, and behavioral patterns optimized for particular task categories.

```
Main Claude Session
       │
       ├── Task(subagent_type="scout") ──────► Scout Agent (codebase exploration)
       │
       ├── Task(subagent_type="planner") ────► Planner Agent (implementation plans)
       │
       ├── Task(subagent_type="debugger") ───► Debugger Agent (issue diagnosis)
       │
       └── Task(subagent_type="tester") ─────► Tester Agent (test execution)
```

---

## Agent Catalog

### Exploration & Research

| Agent | Purpose | Tools |
|-------|---------|-------|
| `scout` | Locate relevant files across codebase | Glob, Grep, Read |
| `scout-external` | External agentic tools (Gemini, OpenCode) | All + Bash, MCP |
| `Explore` | Fast codebase exploration | All tools |
| `researcher` | Comprehensive technical research | All tools |

### Planning & Design

| Agent | Purpose | Tools |
|-------|---------|-------|
| `architect` | System design decisions, ADR creation (Opus) | All tools |
| `planner` | Create comprehensive implementation plans | All tools |
| `Plan` | Software architect for implementation strategy | All tools |
| `brainstormer` | Evaluate architectural approaches and debates | All tools |

### Development & Implementation

| Agent | Purpose | Tools |
|-------|---------|-------|
| `fullstack-developer` | Execute implementation phases | All tools |
| `code-simplifier` | Simplify code for clarity and maintainability | All tools |

### Quality & Review

| Agent | Purpose | Tools |
|-------|---------|-------|
| `code-reviewer` | Comprehensive code review and quality assessment | All tools |
| `tester` | Validate code through testing | All tools |
| `debugger` | Investigate issues and analyze system behavior | All tools |
| `e2e-runner` | E2E testing docs, Playwright patterns (Sonnet) | All tools |

### Operations & Management

| Agent | Purpose | Tools |
|-------|---------|-------|
| `git-manager` | Stage, commit, and push with conventional commits | Glob, Grep, Read, Bash |
| `project-manager` | Track progress, consolidate reports | All except Bash |
| `docs-manager` | Manage technical documentation | All tools |

### Team Collaboration

| Agent | Purpose | Tools |
|-------|---------|-------|
| `business-analyst` | Requirements refinement, user story creation, BDD acceptance criteria | All tools |
| `product-owner` | Backlog management, feature prioritization, stakeholder communication | All tools |
| `qc-specialist` | Quality checkpoints, compliance audits, standards enforcement | All tools |
| `ux-designer` | Design specifications, wireframes, user flow documentation | All tools |

### Specialized

| Agent | Purpose | Tools |
|-------|---------|-------|
| `journal-writer` | Document technical difficulties | All tools |
| `ui-ux-designer` | UI/UX design work | All tools |
| `copywriter` | Marketing and engagement copy | All tools |
| `database-admin` | Database systems management | All tools |
| `mcp-manager` | MCP server integrations | All tools |

---

## Agent Usage

### Basic Invocation

```typescript
Task({
  subagent_type: "scout",
  prompt: "Find all entity event handlers in the Growth service",
  description: "Locate Growth event handlers"
})
```

### Parallel Execution

Launch multiple agents in a single message for concurrent execution:

```typescript
// Single message with multiple Task calls
Task({
  subagent_type: "scout",
  prompt: "Find authentication-related files",
  description: "Find auth files"
})

Task({
  subagent_type: "researcher",
  prompt: "Research JWT best practices for .NET 9",
  description: "JWT research"
})
```

### Background Execution

```typescript
Task({
  subagent_type: "tester",
  prompt: "Run full test suite and report results",
  description: "Run tests",
  run_in_background: true
})
// Returns output_file path - use Read or Bash tail to check progress
```

### Agent Resumption

```typescript
// Resume previous agent with full context preserved
Task({
  subagent_type: "debugger",
  resume: "agent-id-from-previous-run",
  prompt: "Continue investigating with the new error logs"
})
```

---

## Agent Selection Guide

### When to Use Each Agent

| Scenario | Agent | Why |
|----------|-------|-----|
| Find files by pattern | `scout` | Fast file discovery with pattern matching |
| Understand codebase structure | `Explore` | Comprehensive exploration with context |
| Research new technology | `researcher` | Web search + documentation synthesis |
| Plan feature implementation | `planner` | Creates structured implementation plans |
| Evaluate architecture options | `brainstormer` | Debates trade-offs before commitment |
| Design system architecture | `architect` | ADR creation, Opus model |
| Plan E2E test structure | `e2e-runner` | Playwright patterns, BEM selectors |
| Implement from plan | `fullstack-developer` | Executes implementation phases |
| Debug failing tests | `debugger` | Systematic issue investigation |
| Run and analyze tests | `tester` | Test execution and coverage analysis |
| Review code quality | `code-reviewer` | Security, performance, best practices |
| Clean up code | `code-simplifier` | Refactor for clarity and maintainability |
| Commit changes | `git-manager` | Conventional commits with proper messages |
| Update documentation | `docs-manager` | Technical docs maintenance |
| Track project status | `project-manager` | Progress reports and task consolidation |
| Refine requirements | `business-analyst` | GIVEN/WHEN/THEN format, BDD patterns |
| Prioritize backlog | `product-owner` | MoSCoW, effort/value matrix |
| Create test plan | `test-spec` | Test coverage, case generation |
| Quality checkpoint | `qc-specialist` | Audit trails, compliance checks |
| Design specification | `ux-designer` | Figma integration, design tokens |

### When NOT to Use Agents

| Scenario | Better Alternative |
|----------|-------------------|
| Read a specific file | `Read` tool directly |
| Search for specific class | `Glob` or `Grep` directly |
| Simple find-replace | `Edit` tool directly |
| Quick git status | `Bash` with git command |
| 2-3 file search | `Read` multiple files directly |

---

## Agent Configuration

### SubagentStart Hook

The `subagent-init.cjs` hook injects context into all spawned agents:

```
## Subagent: [agent_type]
ID: [agent_id] | CWD: [working_directory]

## Context
- Plan: [active_plan_path or none]
- Reports: [reports_path]
- Paths: plans/ | docs/

## Rules
- **MUST READ:** .claude/workflows/development-rules.md before implementation
- Reports → [reports_path]
- YAGNI / KISS / DRY
- Class Responsibility: Logic in LOWEST layer

## Naming
- Report: [reports_path][agent_type]-[naming_pattern].md
- Plan dir: plans/[naming_pattern]/
```

### Custom Agent Context

Configure agent-specific instructions in `.claude/.ck.json`:

```json
{
  "subagent": {
    "agents": {
      "scout": {
        "contextPrefix": "Focus on BravoSUITE service boundaries when exploring"
      },
      "debugger": {
        "contextPrefix": "Check Easy.Platform patterns first"
      }
    }
  }
}
```

---

## Agent Communication

### Context Passing

Agents inherit conversation context up to their spawn point:

```
User Message → Claude Response → Task(agent) → Agent sees full prior context
```

**Tip:** When spawning agents with context access, write concise prompts that reference earlier context (e.g., "investigate the error discussed above").

### Output Handling

Agent results are returned to the main session:

```typescript
// Agent completes and returns result
const result = Task({ subagent_type: "scout", ... });
// result contains agent's findings + agent_id for resumption
```

**Important:** Agent output is NOT directly visible to the user. Summarize results in your response.

---

## Best Practices

### 1. Choose the Right Agent

```typescript
// ❌ Over-using agents for simple tasks
Task({ subagent_type: "scout", prompt: "Find Button.tsx" })

// ✅ Direct tool for simple searches
Glob({ pattern: "**/Button.tsx" })
```

### 2. Provide Clear Prompts

```typescript
// ❌ Vague prompt
Task({ subagent_type: "researcher", prompt: "Research auth" })

// ✅ Specific, actionable prompt
Task({
  subagent_type: "researcher",
  prompt: "Research JWT refresh token rotation patterns for .NET 9 with Better Auth integration. Focus on security best practices and implementation examples."
})
```

### 3. Parallel When Independent

```typescript
// ❌ Sequential when parallel is possible
const files = await Task({ subagent_type: "scout", ... });
const research = await Task({ subagent_type: "researcher", ... });

// ✅ Parallel execution in single message
Task({ subagent_type: "scout", ... })
Task({ subagent_type: "researcher", ... })
```

### 4. Background for Long Tasks

```typescript
// ❌ Blocking on long operation
Task({ subagent_type: "tester", prompt: "Run full integration tests" })

// ✅ Background execution
Task({
  subagent_type: "tester",
  prompt: "Run full integration tests",
  run_in_background: true
})
// Continue other work while tests run
```

### 5. Resume When Possible

```typescript
// ❌ Starting fresh when context exists
Task({ subagent_type: "debugger", prompt: "Continue debugging..." })

// ✅ Resume with preserved context
Task({
  subagent_type: "debugger",
  resume: "previous-agent-id",
  prompt: "Found new error - investigate this as well"
})
```

---

## Agent Model Selection

Optionally specify model for cost/speed optimization:

```typescript
Task({
  subagent_type: "scout",
  prompt: "Quick file search",
  model: "sonnet"  // Default, balanced capability
})

Task({
  subagent_type: "planner",
  prompt: "Design complex system architecture",
  model: "opus"  // Most capable for complex reasoning
})
```

| Model | Best For |
|-------|----------|
| `sonnet` | Default - balanced capability/cost (all tasks) |
| `opus` | Complex reasoning, architecture |

---

## Related Documentation

- [agent-patterns.md](./agent-patterns.md) - Detailed agent usage patterns
- [../skills/README.md](../skills/README.md) - Skills that enhance agent capabilities
- [../hooks/architecture.md](../hooks/architecture.md) - SubagentStart hook details
- [../configuration/README.md](../configuration/README.md) - Agent configuration options

---

*Source: Task tool system prompt | 26+ specialized agent types*
