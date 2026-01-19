# Agents Reference

> 22+ specialized agents for delegating complex tasks.

## What are Agents?

Agents are specialized subagents that Claude spawns via the `Task` tool to handle complex, multi-step tasks autonomously. Each agent has specific capabilities and tools.

## Agents by Category

### Research & Investigation

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `researcher` | Technology research, documentation synthesis | Investigating technologies, finding best practices, gathering plugin/package info |
| `scout` | Codebase exploration, file discovery | Finding files, understanding project structure, debugging file relationships |
| `scout-external` | External tool exploration (Gemini, etc.) | When built-in scout needs augmentation |

### Planning & Design

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `planner` | Implementation planning, architecture | Planning implementation strategy, identifying critical files, trade-offs |
| `brainstormer` | Solution brainstorming, technical debates | Evaluating architectural approaches, debating decisions before implementation |
| `ui-ux-designer` | UI/UX design work | Interface designs, wireframes, design systems, accessibility review |

### Implementation

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `fullstack-developer` | Full-stack implementation | Implementing from parallel plans (backend, frontend, infrastructure) |
| `code-simplifier` | Code simplification | Simplifying code for clarity while preserving functionality |
| `debugger` | Issue investigation | Investigating issues, diagnosing performance, analyzing logs |

### Quality & Review

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `code-reviewer` | Comprehensive code review | After implementing features, before merging PRs, security assessment |
| `tester` | Testing validation | Running tests, analyzing coverage, validating error handling |

### Documentation & Management

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `docs-manager` | Technical documentation | Managing docs, updating based on code changes, writing PDRs |
| `project-manager` | Project coordination | Tracking progress, consolidating reports, analyzing task completeness |
| `journal-writer` | Development journaling | Recording technical difficulties, significant events |

### Specialty

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `database-admin` | Database operations | Query optimization, schema design, backup strategies, replication |
| `copywriter` | Marketing copy | Landing pages, email campaigns, social media, product descriptions |
| `git-manager` | Git operations | Staging, committing, pushing with conventional commits |
| `mcp-manager` | MCP server management | Discover tools, analyze relevance, execute MCP capabilities |

### Team Collaboration

| Agent | Description | When to Use |
|-------|-------------|-------------|
| `business-analyst` | Requirements refinement, user stories | Converting ideas to PBIs, writing BDD acceptance criteria |
| `product-owner` | Product backlog, prioritization | Managing backlog, stakeholder requirements, RICE scoring |
| `qa-engineer` | Test specification, test design | Creating test specs from PBIs, designing test cases |
| `qc-specialist` | Quality assessment, release gates | Quality gate checks, release readiness validation |

## Agent Invocation

Agents are invoked via the `Task` tool:

```javascript
Task({
  description: "Research authentication options",
  prompt: "Research OAuth vs JWT for our API...",
  subagent_type: "researcher"
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | string | Short (3-5 word) summary |
| `prompt` | string | Detailed task instructions |
| `subagent_type` | string | Agent type from list above |
| `model` | string? | Optional: "sonnet", "opus", "haiku" |
| `run_in_background` | bool? | Run asynchronously |
| `resume` | string? | Agent ID to resume |

## Agent Structure

Agents defined in `.claude/agents/agent-name.md`:

```yaml
---
name: agent-name
description: >-
  When to use this agent and what it does.
model: inherit
---

[Agent instructions and capabilities]
```

### Agent Capabilities

Agents have access to different tool sets:

| Agent Type | Tools Available |
|------------|-----------------|
| `researcher` | All tools |
| `scout` | Glob, Grep, Read, WebFetch, TodoWrite, WebSearch, Bash |
| `planner` | All tools |
| `fullstack-developer` | All tools |
| `git-manager` | Glob, Grep, Read, Bash |

## Best Practices

### When to Use Agents

Use agents when:
- Task requires multiple exploration steps
- Task spans multiple files/areas
- Task benefits from focused context
- Need parallel execution

### When NOT to Use Agents

Don't use agents for:
- Reading a specific file (use `Read` directly)
- Searching for specific class (use `Glob`)
- Simple single-file operations

### Parallel Agent Execution

Launch multiple agents in one message:

```javascript
// Multiple Task calls in single response
Task({ subagent_type: "researcher", prompt: "Research auth options..." })
Task({ subagent_type: "researcher", prompt: "Research database options..." })
```

### Background Agents

For long-running tasks:

```javascript
Task({
  subagent_type: "tester",
  prompt: "Run full test suite...",
  run_in_background: true
})
// Returns output_file path for later checking
```

### Resuming Agents

Continue previous agent work:

```javascript
Task({
  subagent_type: "researcher",
  resume: "abc123",  // Agent ID from previous result
  prompt: "Continue research on..."
})
```

## Creating Custom Agents

1. Create `.claude/agents/my-agent.md`
2. Add frontmatter with name, description, model
3. Write agent instructions
4. Reference in Task tool calls

Example:
```yaml
---
name: my-custom-agent
description: >-
  Use this agent when you need to...
model: haiku
---

You are a specialized agent for...

## Capabilities
- [Capability 1]
- [Capability 2]

## Instructions
[Detailed instructions]
```

## Agent Context Inheritance

Agents inherit from parent session:
- Todo state (via `subagent-init.cjs`)
- Plan context
- Environment variables
- Project configuration

## Debugging

View available agents:
```bash
ls .claude/agents/
```

Check agent invocation in session:
```bash
# Agents log their execution to stdout
# Check Claude's response for agent outputs
```

---

*Total agents: 18 | Last updated: 2026-01-13*
