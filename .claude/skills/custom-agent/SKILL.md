---
name: custom-agent
description: '[AI & Tools] Use when creating, verifying, or enhancing Claude Code custom agent files.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Create new custom agents, audit existing agent quality, or enhance agent definitions so each agent is valid, least-privilege, structurally complete, and ready for safe delegation.

**Summary:** Produce valid agents through the selected mode: Create — clarify → check existing → scaffold → write → validate; Audit — discover → read/parse → validate → report → fix confirmed Errors; Enhance — read → analyze → recommend → apply confirmed changes. Validate frontmatter, tools, structure, and quality score.

**Workflow:** Detect mode (Create/Audit/Enhance) from `$ARGUMENTS` → Execute → Validate

**Key Rules:**

- Agent files: `.claude/agents/{name}.md` with YAML frontmatter + markdown body as system prompt
- Agent does NOT inherit Claude Code system prompt — write complete instructions
- Minimize tools to only what the agent needs
- System prompt structure: `## Role` → `## Workflow` → `## Key Rules` → `## Output`
- Analyze scope and use `TaskCreate` for small tasks/subtasks before starting, including final review. Keep task depth proportional to the work.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Modes](#modes)
- [Mode 1: Create Agent](#mode-1-create-agent)
- [Mode 2: Audit Agents](#mode-2-audit-agents)
- [Mode 3: Enhance Agent](#mode-3-enhance-agent)
- [Agent Frontmatter Schema](#agent-frontmatter-schema)
- [Tool Restriction Patterns](#tool-restriction-patterns)
- [Model Selection](#model-selection)
- [Description Best Practices](#description-best-practices)
- [Common Anti-Patterns](#common-anti-patterns)
- [Context Passing](#context-passing)
- [Audit Checklist](#audit-checklist)
- [File Priority (highest first)](#file-priority-highest-first)
- [Requirements](#requirements)
- [Closing Reminders](#closing-reminders)

## Modes

| Mode        | Trigger                                        | Action                 |
| ----------- | ---------------------------------------------- | ---------------------- |
| **Create**  | `$ARGUMENTS` describes a new agent             | Create agent file      |
| **Audit**   | mentions verify, audit, review, check, quality | Audit existing agents  |
| **Enhance** | mentions refactor, enhance, improve, optimize  | Improve existing agent |

## Mode 1: Create Agent

1. **Clarify** — `ask user question tool`: purpose, read-only vs read-write, model preference, memory needs
2. **Check Existing** — Glob `.claude/agents/*.md` for similar agents. Avoid duplication.
3. **Scaffold** — Create `.claude/agents/{name}.md` using frontmatter template below
4. **Write System Prompt** — Structure: `## Role` → `## Workflow` → `## Key Rules` → `## Output`
5. **Validate** — Run audit checklist below

## Mode 2: Audit Agents

1. **Discover** — Glob `.claude/agents/*.md`
2. **Read and parse** — Read each complete frontmatter and body before checking or scoring it. A header preview is discovery only; follow multiline YAML through its closing delimiter.
3. **Validate** — Apply the [Audit Checklist](#audit-checklist) and quality score; consult [Agent Frontmatter Schema](#agent-frontmatter-schema) for field definitions and [Tool Restriction Patterns](#tool-restriction-patterns) for tool scope.
4. **Report** — Issues grouped by severity (Error > Warning > Info), include quality scores
5. **Fix** — If user confirms, fix Error-level issues automatically

## Mode 3: Enhance Agent

1. **Read** — Load specified agent file
2. **Analyze** — Check against best practices and audit checklist
3. **Recommend** — List improvements with rationale
4. **Apply** — If user confirms, apply enhancements

---

## Agent Frontmatter Schema

```yaml
---
# REQUIRED
name: my-agent # Lowercase + hyphens only
description: >- # Claude uses this to decide when to delegate
    Use this agent when [specific trigger scenarios].

# OPTIONAL — Tools
tools: Read, Grep, Glob, Bash # Allowlist (omit both → inherits all)
disallowedTools: Write, Edit # Denylist (removes from inherited set)
# Task(agent1, agent2) restricts spawnable subagents

# OPTIONAL — Model
model: inherit # inherit | sonnet | opus | haiku

# OPTIONAL — Permissions
permissionMode: default # default | acceptEdits | dontAsk | bypassPermissions | plan

# OPTIONAL — Skills (content injected at startup)
skills:
    - skill-name

# OPTIONAL — MCP Servers
mcpServers:
    - server-name

# OPTIONAL — Hooks (scoped to this agent)
hooks:
    PreToolUse:
        - matcher: 'Bash'
          hooks:
              - type: command
                command: './scripts/validate.sh'

# OPTIONAL — Memory (MEMORY.md auto-injected, Read/Write/Edit auto-added)
memory: project # user (~/.claude/agent-memory/) | project (.claude/agent-memory/) | local (.claude/agent-memory-local/); .claude/.gitignore ignores both project folders

# OPTIONAL — Execution
background: false # true = always background task
isolation: worktree # Run in temporary git worktree
---
```

## Tool Restriction Patterns

| Agent Type           | Recommended `tools`                     |
| -------------------- | --------------------------------------- |
| Explorer / `/investigate` | `Read, Grep, Glob, Bash`                |
| Reviewer (read-only) | `Read, Grep, Glob`                      |
| Writer/Implementer   | `Read, Write, Edit, Grep, Glob, Bash`   |
| Researcher           | `Read, Grep, Glob, WebFetch, WebSearch` |
| Orchestrator         | `Read, Grep, Glob, Task(sub1, sub2)`    |

Available tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, WebFetch, WebSearch, Task, NotebookRead, NotebookEdit, TaskCreate, TaskUpdate, ask user question tool, + MCP tools.

## Model Selection

These are routing heuristics, not measured quality rankings or compatibility evidence. Preserve an explicit user choice; otherwise prefer `inherit`. Record representative model/runtime tests separately, with unavailable comparisons marked `NOT RUN`.

| Model     | Best For                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `haiku`   | Fast read-only: scanning, search, file listing                                                         |
| `sonnet`  | Balanced: code review, debugging, analysis                                                             |
| `opus`    | Candidate for high-stakes architecture or complex implementation; verify suitability on representative tasks |
| `inherit` | Default — match parent's model                                                                         |

## Description Best Practices

```yaml
# BAD — too vague, Claude won't auto-delegate
description: Reviews code

# GOOD — specific trigger conditions
description: >-
  Use this agent for comprehensive code review after implementing features,
  before merging PRs, or when assessing code quality and technical debt.
```

- Include "Use this agent when..." phrasing with concrete scenarios
- Add "use proactively" to encourage auto-invocation

## Common Anti-Patterns

| Anti-Pattern                       | Fix                                       |
| ---------------------------------- | ----------------------------------------- |
| No tool restrictions               | Add `tools` allowlist                     |
| Vague description                  | Write specific trigger conditions         |
| Giant system prompt                | Keep concise, use `skills` for detail     |
| Recursive subagents                | Restrict `Task` in tools                  |
| Windows long prompts (>8191 chars) | Use file-based agents, not `--agents` CLI |

## Context Passing

- Agent receives ONLY its system prompt + task prompt — NOT parent conversation
- Parent receives ONLY agent's final result — NOT intermediate tool calls
- This isolation is the primary context management benefit

## Audit Checklist

| #   | Check                | Rule                           | Severity |
| --- | -------------------- | ------------------------------ | -------- |
| 1   | Frontmatter exists   | Must have `---` delimiters     | Error    |
| 2   | Name present & valid | Lowercase + hyphens only       | Error    |
| 3   | Description present  | Non-empty, >20 chars           | Error    |
| 4   | No duplicate names   | Unique across all agent files  | Error    |
| 5   | Description quality  | Specific trigger scenarios     | Warning  |
| 6   | Tools minimal        | Only what agent needs          | Warning  |
| 7   | Prompt structure     | Has `## Role` + `## Workflow`  | Warning  |
| 8   | Model set            | When task differs from default | Info     |

**Quality Score:** Valid frontmatter (20) + Description >50 chars (20) + Tools restricted (15) + Role section (15) + Workflow section (10) + Model set (10) = 90. Rating: 80+ Excellent, 60-79 Good, 40-59 Needs Work, <40 Poor.

## File Priority (highest first)

1. `--agents` CLI flag (session only)
2. `.claude/agents/*.md` (project)
3. `~/.claude/agents/*.md` (user)
4. Plugin `agents/` directory

Same `name` across levels: higher-priority wins. Use `claude agents` CLI to list all.

## Requirements

<user-prompt>$ARGUMENTS</user-prompt>

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Create new custom agents, audit existing agent quality, or enhance agent definitions so each agent is valid, least-privilege, structurally complete, and ready for safe delegation.

**IMPORTANT MUST ATTENTION** follow the mode-specific path: detect mode → Create: clarify, check existing agents, scaffold, write the system prompt, validate; Audit: discover, parse, validate, report, and fix only after confirmation; Enhance: read, analyze, recommend, apply only after confirmation; then run the final audit checklist and quality-score validation.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistakes:** holistic-first debug, fix at responsible layer, surgical diff, verify ALL outputs.

- Use `TaskCreate` before starting, including final review; keep task depth proportional to the work.
- Search 3+ similar patterns before creating code; cite `file:line` for every claim, with confidence >80% to act.

| Evasion | Required action |
| --- | --- |
| "Header preview is enough" | Read complete frontmatter and body before checking or scoring |
| "Audit found Errors, fix now" | Report first; fix Error-level issues only after user confirmation |
