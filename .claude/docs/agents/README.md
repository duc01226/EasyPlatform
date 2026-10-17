# Agents Reference

> 25 specialized subagents for autonomous task execution

## Contents

- [Overview](#overview)
- [Agent Catalog](#agent-catalog)
- [Agent Usage](#agent-usage)
- [Agent Selection Guide](#agent-selection-guide)
- [Agent Configuration](#agent-configuration)
- [Agent Communication](#agent-communication)
- [Best Practices](#best-practices)
- [Agent Model Selection](#agent-model-selection)
- [Authoring Rule — No Meta-Log](#authoring-rule--no-meta-log)
- [Quality-Parity with Skills](#quality-parity-with-skills)
- [Related Documentation](#related-documentation)

## Overview

Agents are specialized subprocesses spawned via the `Task` tool to handle complex, multi-step operations autonomously. Each agent type has specific capabilities, tools, and behavioral patterns optimized for particular task categories.

```
Main Claude Session
       │
       ├── /investigate ─────────────────────► Deep codebase investigation
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

| Agent              | Purpose                                               | Tools                                  |
| ------------------ | ----------------------------------------------------- | -------------------------------------- |
| `Explore`          | Fast codebase exploration                             | Built-in read-only toolset             |
| `researcher`       | Comprehensive technical research                      | All tools (no frontmatter restriction) |
| `knowledge-worker` | Web research, knowledge synthesis, structured reports | All tools (no frontmatter restriction) |

### Planning & Design

| Agent                | Purpose                                                          | Tools                                  |
| -------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| `architect`          | System design decisions, ADR creation                            | All tools (no frontmatter restriction) |
| `solution-architect` | Greenfield project inception: tech stack, DDD, project structure | All tools (no frontmatter restriction) |
| `planner`            | Create comprehensive implementation plans                        | All tools (no frontmatter restriction) |
| `Plan`               | Software architect for implementation strategy                   | Built-in read-only toolset             |

### Development & Implementation

| Agent                 | Purpose                                                                | Tools     |
| --------------------- | ---------------------------------------------------------------------- | --------- |
| `fullstack-developer` | Execute implementation phases                                          | All tools |
| `backend-developer`   | Backend features using the project's configured stack and architecture | All tools |
| `integration-tester`  | Generate integration tests from changes                                | All tools |
| `performance-tester` | Write/update or statically review performance tests and reusable harnesses through `performance-test`; execution stays with the explicitly authorized caller | All tools |
| `code-simplifier`     | Simplify code for clarity and maintainability                          | All tools |

### Quality & Review

| Agent                      | Purpose                                                                | Tools                                  |
| -------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| `code-reviewer`            | Comprehensive code review and quality assessment                       | All tools (no frontmatter restriction) |
| `ai-engineering-reviewer`  | Read-only review of plans and code that call models (LLM calls, prompts, agents, RAG, tool use, evals, cost, safety) | All tools (no frontmatter restriction) |
| `spec-compliance-reviewer` | Verify implementation matches spec (before code review)                | All tools (no frontmatter restriction) |
| `tester`                   | Validate code through testing                                          | All tools                              |
| `debugger`                 | Investigate issues and analyze system behavior                         | All tools                              |
| `e2e-runner`               | E2E testing with the project's configured runner and patterns (Sonnet) | All tools                              |

### Operations & Management

| Agent          | Purpose                                           | Tools                                  |
| -------------- | ------------------------------------------------- | -------------------------------------- |
| `git-manager`  | Stage, commit, and push with conventional commits | All tools (no frontmatter restriction) |
| `docs-manager` | Manage technical documentation; drives `/docs-manager --mode=update` | All tools                              |

### Team Collaboration

| Agent            | Purpose                                                    | Tools     |
| ---------------- | ---------------------------------------------------------- | --------- |
| `ui-ux-designer` | Design specifications, wireframes, user flow documentation | All tools |

### Specialized

| Agent                   | Purpose                                                                               | Tools                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `journal-writer`        | Document technical difficulties                                                       | All tools                                                                               |
| `database-admin`        | Database systems management                                                           | All tools                                                                               |
| `frontend-developer`    | Project-configured frontend/UI implementation (components, state, styling)            | All tools                                                                               |
| `security-auditor`      | Read-only security analysis, OWASP compliance                                         | All tools                                                                               |
| `performance-optimizer` | Performance analysis (N+1, bundle, indexes)                                           | All tools                                                                               |
| `framework-maintainer`  | Maintain the portable .claude AI-harness (skills, agents, hooks, SYNC, Codex mirrors) | Read, Write, Edit, MultiEdit, Grep, Glob, Bash, TaskCreate, TaskUpdate, AskUserQuestion |

---

## Agent Usage

### Basic Invocation

```typescript
Task({
    subagent_type: 'researcher',
    prompt: 'Find all entity event handlers in the Growth service',
    description: 'Locate Growth event handlers'
});
```

### Parallel Execution

Launch multiple agents in a single message for concurrent execution:

```typescript
// Single message with multiple Task calls
Task({
    subagent_type: 'researcher',
    prompt: 'Find authentication-related files',
    description: 'Find auth files'
});

Task({
    subagent_type: 'researcher',
    prompt: 'Research JWT best practices for .NET 9',
    description: 'JWT research'
});
```

### Background Execution

```typescript
Task({
    subagent_type: 'tester',
    prompt: 'Run full test suite and report results',
    description: 'Run tests',
    run_in_background: true
});
// Returns output_file path - use Read or Bash tail to check progress
```

### Agent Resumption

```typescript
// Resume previous agent with full context preserved
Task({
    subagent_type: 'debugger',
    resume: 'agent-id-from-previous-run',
    prompt: 'Continue investigating with the new error logs'
});
```

---

## Agent Selection Guide

### When to Use Each Agent

| Scenario                      | Agent                  | Why                                                         |
| ----------------------------- | ---------------------- | ----------------------------------------------------------- |
| Investigate codebase behavior | `/investigate`         | Deep tracing with evidence and graph context                |
| Understand codebase structure | `Explore`              | Comprehensive exploration with context                      |
| Research new technology       | `researcher`           | Web search + documentation synthesis                        |
| Plan feature implementation   | `planner`              | Creates structured implementation plans                     |
| Evaluate architecture options | `planner`              | Creates structured plans with trade-off analysis            |
| Design system architecture    | `architect`            | ADR creation, cross-service analysis                        |
| Greenfield project inception  | `solution-architect`   | Tech stack, DDD, project structure                          |
| Plan E2E test structure       | `e2e-runner`           | Configured test organization and stable accessible locators |
| Write/update or review performance tests | `performance-tester` | Shared performance-test gates; author/static review only; explicit caller owns runs |
| Implement from plan           | `fullstack-developer`  | Executes implementation phases                              |
| Debug failing tests           | `debugger`             | Systematic issue investigation                              |
| Run and analyze tests         | `tester`               | Test execution and coverage analysis                        |
| Review code quality           | `code-reviewer`        | Security, performance, best practices                       |
| Review an AI-feature plan or diff | `ai-engineering-reviewer` | Model calls, prompts, agents, RAG, tool use, evals; `AF`/`AE`/`AR` gates with provider facts verified |
| Clean up code                 | `code-simplifier`      | Refactor for clarity and maintainability                    |
| Commit changes                | `git-manager`          | Conventional commits with proper messages                   |
| Update documentation          | `docs-manager`         | Technical docs maintenance (`/docs-manager --mode=update`)   |
| Create test plan              | `tester`               | Test coverage, case generation                              |
| Synthesize knowledge          | `knowledge-worker`     | Web research, structured reports, course material           |
| Design specification          | `ui-ux-designer`       | Platform-aware visual language, layouts, and accessibility  |
| Edit the .claude framework    | `framework-maintainer` | Skills, agents, hooks, SYNC blocks, Codex mirrors           |

### When NOT to Use Agents

| Scenario                  | Better Alternative             |
| ------------------------- | ------------------------------ |
| Read a specific file      | `Read` tool directly           |
| Search for specific class | `Glob` or `Grep` directly      |
| Simple find-replace       | `Edit` tool directly           |
| Quick git status          | `Bash` with git command        |
| 2-3 file search           | `Read` multiple files directly |

---

## Agent Configuration

### Subagent Context (static agent prompt; `SubagentStart` delivers protocols)

> There is **no** portable `SubagentStart` contract shared by every host. On Claude, `SubagentStart` carries the five
> `protocol-inject-<group>.cjs` protocol-delivery handlers, which add the full protocol texts of the skills an agent
> preloads (`skills:` frontmatter; a body the agent file already inlines is not repeated), and the four `protocol-inject-universal-<n>.cjs` bins, which deliver the universal bundle to every agent type once per spawn. Each agent's context contract — project rules,
> reports path, naming, and the development-rules / lessons read contract — is carried
> in the agent's `.md` system prompt and the shared SYNC blocks it inlines; the universal bundle
> is the one part no agent file carries, because the `SubagentStart` hook delivers it (a host that runs no hook is unsupported). Each agent's `.md`
> carries, in effect:

```
## Context
- Plan: [active_plan_path or none]
- Reports: [reports_path]
- Paths: [plans_root] | docs/

## Rules
- **MUST ATTENTION READ:** .claude/docs/development-rules.md before implementation
- Reports → [reports_path]
- YAGNI / KISS / DRY
- Class Responsibility: place behavior with the data or invariant owner established by project architecture and evidence

## Naming
- Report: [reports_path][agent_type]-[naming_pattern].md
- Plan dir: [plans_root]/[naming_pattern]/
```

### Custom Agent Context

Configure agent-specific instructions in `.claude/.ck.json`:

```json
{
    "subagent": {
        "agents": {
            "debugger": {
                "contextPrefix": "Check project framework patterns first"
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
const result = Task({ subagent_type: "researcher", ... });
// result contains agent's findings + agent_id for resumption
```

**Important:** Agent output is NOT directly visible to the user. Summarize results in your response.

---

## Best Practices

### 1. Choose the Right Agent

```typescript
// ❌ Over-using agents for simple tasks
Task({ subagent_type: 'researcher', prompt: 'Find Button.tsx' });

// ✅ Direct tool for simple searches
Glob({ pattern: '**/Button.tsx' });
```

### 2. Provide Clear Prompts

```typescript
// ❌ Vague prompt
Task({ subagent_type: 'researcher', prompt: 'Research auth' });

// ✅ Specific, actionable prompt
Task({
    subagent_type: 'researcher',
    prompt: 'Research JWT refresh token rotation patterns for .NET 9 with Better Auth integration. Focus on security best practices and implementation examples.'
});
```

### 3. Parallel When Independent

```typescript
// ❌ Sequential when parallel is possible
const files = await Task({ subagent_type: "researcher", ... });
const research = await Task({ subagent_type: "researcher", ... });

// ✅ Parallel execution in single message
Task({ subagent_type: "researcher", ... })
Task({ subagent_type: "researcher", ... })
```

### 4. Background for Long Tasks

```typescript
// ❌ Blocking on long operation
Task({ subagent_type: 'tester', prompt: 'Run full integration tests' });

// ✅ Background execution
Task({
    subagent_type: 'tester',
    prompt: 'Run full integration tests',
    run_in_background: true
});
// Continue other work while tests run
```

### 5. Resume When Possible

```typescript
// ❌ Starting fresh when context exists
Task({ subagent_type: 'debugger', prompt: 'Continue debugging...' });

// ✅ Resume with preserved context
Task({
    subagent_type: 'debugger',
    resume: 'previous-agent-id',
    prompt: 'Found new error - investigate this as well'
});
```

---

## Agent Model Selection

Optionally specify model for cost/speed optimization:

```typescript
Task({
    subagent_type: 'researcher',
    prompt: 'Quick file search',
    model: 'sonnet' // Default, balanced capability
});

Task({
    subagent_type: 'planner',
    prompt: 'Design complex system architecture',
    model: 'opus' // Most capable for complex reasoning
});
```

| Model    | Best For                                       |
| -------- | ---------------------------------------------- |
| `sonnet` | Default - balanced capability/cost (all tasks) |
| `opus`   | Complex reasoning, architecture                |

---

## Authoring Rule — No Meta-Log

> An agent `.md` is read as live instruction. Write only the CURRENT actionable truth. Do NOT add change-history, migration rationale, or provenance — "formerly", "removed in the … refactor", "now baked statically", "used to be hook-injected". It carries zero instruction value and dilutes the directive the agent acts on. Change history belongs in git / `CHANGELOG.md` / the ADR root (default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path) / `tmp/reports/**`. State what IS, not what changed.

## Quality-Parity with Skills

Every agent carries the **same role-specific quality protocol** as its twin skill(s). Skills are heavily enhanced (severity rubrics, evidence gates, adversarial review, incremental persistence); agents that do equivalent work inherit those same SYNC blocks so a `code-reviewer` _agent_ reviews with the rigor of the `changes-review` _skill_. Agents do NOT inherit **orchestration** blocks — main-loop, session and review-loop blocks listed in `EXCLUDED_ORCHESTRATION` (`.claude/scripts/agent_protocol_matrix.py`, the only owner of that list) — because those govern the orchestrator, not a spawned worker.

**Source of truth (do not re-describe per-agent block lists here — they drift):**

| Concern                                   | File                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-agent block assignment (the manifest) | `.claude/scripts/agent_protocol_matrix.py` (`AGENT_QUALITY_BLOCKS`)                                                                                                                                                                                                                                                    |
| Agent-to-skill connection map             | `.claude/scripts/agent_protocol_matrix.py` (`AGENT_SKILL_CONNECTIONS`)                                                                                                                                                                                                                                                 |
| Injector / idempotent maintenance tool    | `.claude/scripts/inject_agent_protocol_blocks.py`                                                                                                                                                                                                                                                                      |
| Connection-block injector                 | `.claude/scripts/inject_agent_skill_connections.py`                                                                                                                                                                                                                                                                    |
| Canonical block bodies                    | `.claude/skills/shared/sync-inline-versions.md`                                                                                                                                                                                                                                                                        |
| Full agent↔skill evaluation               | [`260616-agent-skill-quality-parity/research/agent-skill-mapping.md`](../../../plans/260616-agent-skill-quality-parity/research/agent-skill-mapping.md) under the plans root — default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path (the link target assumes the default) |

**Tier model** (enforced by `agent_protocol_matrix.py` `validate()` and the `agent-universal-rules` test suite — `TC-UAR-003..007`):

- **Core-2** universal blocks (`sequential-thinking-protocol`, `agent-bootstrap`) → all 25 agents. The protocols of the `universal` group are not blocks: the universal hook delivers them to every agent, so an agent file holds no body, reminder or pointer for them.
- **Code-6** blocks (Core-2 plus `understand-code-first`, `evidence-based-reasoning`, `cross-service-check`, `fix-layer-accountability`) → only the 19 code-touching/fixing agents; NEVER a core-only agent (docs-manager, git-manager, journal-writer, knowledge-worker).
- **Readonly-Code-4** blocks (Core-2 plus `understand-code-first`, `evidence-based-reasoning` only) → the 2 read-only/design agents (`researcher`, `ui-ux-designer`) that locate/read/design code but never fix a layer or cross a service boundary; the two mutation-oriented blocks (`cross-service-check`, `fix-layer-accountability`) are deliberately excluded to save tokens.
- **Code-standards** (`agent-code-standards`) → the 19 agents that author/review code (a separate axis — `researcher`/`ui-ux-designer` read code but don't author it, so they're excluded).
- **Additive quality blocks** → per the matrix manifest; all 25 agents carry a quality-block row. Operational agents may have an empty additive row when their connected skill has no role-specific SYNC block; `git-manager` carries `SYNC:estimation-framework` through the manifest. Every agent also carries a generated **Connected Skill Contracts** block from `AGENT_SKILL_CONNECTIONS`, which links the prompt to its canonical task-specific skill procedures without blanket-copying orchestrator-only instructions.

Partition: 19 Code-6 + 2 Readonly-Code-4 + 4 Core-2 = 25 agents (pairwise disjoint).

> See [agent-patterns.md](./agent-patterns.md) → _Adding or changing an agent's quality protocol_ for the contributor loop and the `framework-maintainer` orchestration whitelist. Source-side edits land first; mirrors (`.agents/`, `.codex/`, `AGENTS.md`) regenerate via `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` + `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only` as a tracked follow-up.

## Related Documentation

- [agent-patterns.md](./agent-patterns.md) - Detailed agent usage patterns
- [../skills/README.md](../skills/README.md) - Skills that enhance agent capabilities
- [../hooks/README.md](../hooks/README.md) - Hook lifecycle (`SubagentStart` runs only the protocol-delivery handlers; standing sub-agent context is static in `agents/*.md`)
- [../configuration/README.md](../configuration/README.md) - Agent configuration options

---

_Source: Task tool system prompt | 25 specialized agent types_
