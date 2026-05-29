---
name: custom-agent
description: '[AI & Tools] Use when you need create, verify, or enhance Claude Code custom agents (Claude Code custom agent files).'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Create new custom agents, audit existing agent quality, or enhance agent definitions.

**Workflow:** Detect mode (Create/Audit/Enhance) from `$ARGUMENTS` → Execute → Validate

**Key Rules:**

- Agent files: `.claude/agents/{name}.md` with YAML frontmatter + markdown body as system prompt
- Agent does NOT inherit Claude Code system prompt — write complete instructions
- Minimize tools to only what the agent needs
- System prompt structure: `## Role` → `## Workflow` → `## Key Rules` → `## Output`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Modes

| Mode        | Trigger                                        | Action                 |
| ----------- | ---------------------------------------------- | ---------------------- |
| **Create**  | `$ARGUMENTS` describes a new agent             | Create agent file      |
| **Audit**   | mentions verify, audit, review, check, quality | Audit existing agents  |
| **Enhance** | mentions refactor, enhance, improve, optimize  | Improve existing agent |

## Mode 1: Create Agent

1. **Clarify** — a direct user question: purpose, read-only vs read-write, model preference, memory needs
2. **Check Existing** — Glob `.claude/agents/*.md` for similar agents. Avoid duplication.
3. **Scaffold** — Create `.claude/agents/{name}.md` using frontmatter template below
4. **Write System Prompt** — Structure: `## Role` → `## Workflow` → `## Key Rules` → `## Output`
5. **Validate** — Run audit checklist below

## Mode 2: Audit Agents

1. **Discover** — Glob `.claude/agents/*.md`
2. **Parse** — Read first 30 lines of each, extract frontmatter
3. **Validate** — Check each audit rule below
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
memory: project # user (~/.claude/agent-memory/) | project (.claude/agent-memory/) | local (gitignored)

# OPTIONAL — Execution
background: false # true = always background task
isolation: worktree # Run in temporary git worktree
---
```

## Tool Restriction Patterns

| Agent Type           | Recommended `tools`                     |
| -------------------- | --------------------------------------- |
| Explorer/Scout       | `Read, Grep, Glob, Bash`                |
| Reviewer (read-only) | `Read, Grep, Glob`                      |
| Writer/Implementer   | `Read, Write, Edit, Grep, Glob, Bash`   |
| Researcher           | `Read, Grep, Glob, WebFetch, WebSearch` |
| Orchestrator         | `Read, Grep, Glob, Task(sub1, sub2)`    |

Available tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, WebFetch, WebSearch, Task, NotebookRead, NotebookEdit, task tracking, TaskUpdate, ask the user directly, + MCP tools.

## Model Selection

| Model     | Best For                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `haiku`   | Fast read-only: scanning, search, file listing                                                         |
| `sonnet`  | Balanced: code review, debugging, analysis                                                             |
| `opus`    | High-stakes: architecture, complex implementation. Better quality for code review, debugging, analysis |
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

**IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always break work into small todo tasks
- Always add a final review todo task

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
