# Subagent Registry

> Last updated: 2026-02-24

Reference documentation for all known subagent types used in EasyPlatform's Claude Code setup.

## Agent Types

| Agent Type | Category | Workflows | Context Injection | Key Capabilities |
|-----------|----------|-----------|-------------------|-----------------|
| planner | Planning | plan, plan-fast, plan-hard | Compact patterns | Creates phased implementation plans with YAML frontmatter |
| fullstack-developer | Implementation | cook, code, fix | Full patterns + CQRS | Implements features end-to-end across backend/frontend |
| debugger | Fix & Debug | debug, fix-hard | Full patterns | Systematic root cause investigation |
| tester | Testing | test, fix-test | Full patterns | Runs tests, analyzes failures, validates fixes |
| code-reviewer | Review | code-review, review | Full patterns | Structured code review with file:line references |
| code-simplifier | Review | code-simplifier | Full patterns | Simplifies code for clarity and maintainability |
| qa-engineer | Testing | generate-tests | Full patterns | Creates test plans and test cases |
| architect | Planning | research, plan | Compact patterns | Designs system architecture, evaluates trade-offs |
| researcher | Research | cook, plan-hard | None (external) | Parallel research for information gathering |
| product-owner | Planning | (manual) | None | Requirements, backlog, prioritization |
| project-manager | Management | cook (final step) | None | Progress tracking, documentation updates |
| ui-ux-designer | Design | cook (frontend) | None | UI/UX design, accessibility review |
| docs-manager | Documentation | cook (final step) | None | Documentation creation and updates |
| git-manager | Git | commit, git-cp | None | Stage, commit, push with conventional commits |
| brainstormer | Planning | (manual) | None | Explores solutions, evaluates approaches |
| scout | Research | scout | None | Fast codebase file discovery |

## Pattern-Aware Agent Types

These agents receive `compact-pattern-reference.md` injection via `subagent-init.cjs` (line 49-53):

```
PATTERN_AWARE_AGENT_TYPES = Set {
  'fullstack-developer', 'debugger', 'tester',
  'code-reviewer', 'code-simplifier', 'qa-engineer',
  'planner', 'architect'
}
```

When a subagent's `agent_type` is in this set, `buildCodingPatternContext()` loads `.ai/docs/compact-pattern-reference.md` and appends it to the context prefix. All other agent types receive no pattern injection.

## Communication Protocol

### Input (SubagentStart payload)

- JSON on stdin from Claude Code SDK
- `subagent-init.cjs` hook intercepts and injects context via `hookSpecificOutput.additionalContext`
- Context includes: subagent identification, plan path, reports path, rules reminder, naming templates, optional pattern reference

### Output

- Markdown reports to `plans/reports/` (or `{planDir}/reports/` when a session plan is active)
- Tool calls (Read, Write, Edit, Bash, etc.) during execution
- Final summary returned to parent agent

### State

- No cross-agent state sharing (each agent has independent context)
- Parent agent coordinates via sequential/parallel Task tool calls
- Subagents inherit parent todo state for context continuity (up to 3 active items)
- Todo state passed via `getTodoStateForSubagent()` in `lib/todo-state.cjs`

## Context Injection Rules

### All Subagents Receive (subagent-init.cjs)

1. **Identification** -- agent type, agent ID, current working directory
2. **Plan context** -- active plan path (from session state) or suggested plan (from branch name)
3. **Reports path** -- `{planDir}/reports/` or `plans/reports/`
4. **Language settings** -- thinking and response language if configured in `.ck.json`
5. **Rules reminder** -- MUST READ development-rules.md, YAGNI/KISS/DRY, class responsibility
6. **Naming templates** -- report filename pattern, plan directory pattern
7. **Trust verification** -- passphrase if enabled in config
8. **Parent todo context** -- up to 3 active todos from parent session

### Pattern-Aware Agents Additionally Receive

- Contents of `.ai/docs/compact-pattern-reference.md`
- Pointers to full pattern files (`backend-code-patterns.md`, `frontend-code-patterns.md`)

### Agent-Specific Context

- Configurable via `config.subagent.agents[type].contextPrefix` in `.ck.json`
- Currently no agent-specific overrides are configured in this project
- The mechanism exists in `getAgentContext()` (subagent-init.cjs line 28-32) for future use

## Naming Conventions

Subagent reports follow a computed naming pattern:

```
{reportsPath}{agentType}-{datePattern}-{slug}.md
```

Example: `plans/reports/fullstack-developer-260224-1444-feature-name.md`

The pattern is resolved from `.ck.json` config:
- `plan.dateFormat`: `"YYMMDD-HHmm"` (default)
- `plan.namingFormat`: `"{date}-{issue}-{slug}"` (default)
- `plan.issuePrefix`: `"GH-"` (project-specific)

## Plan Resolution

Subagents resolve their active plan using cascading resolution (`ck-config.cjs`):

1. **Session state** -- checks `.claude/.session-state.json` for `activePlan`
2. **Branch name** -- extracts slug from git branch using `branchPattern` regex

Resolution order is configurable via `plan.resolution.order` in `.ck.json`.

## Limitations

1. **No recursive spawning control** -- agents can spawn sub-subagents without depth limit
2. **No cross-agent state** -- agents cannot read each other's context or results directly
3. **No result validation** -- parent agent receives output but no format validation occurs
4. **Context window pressure** -- large subagent outputs consume parent context
5. **No cancellation** -- once launched, subagents run to completion or timeout
6. **Todo inheritance is shallow** -- only top 3 todos passed, no full state sync
7. **Fail-open design** -- if `subagent-init.cjs` errors, subagent starts without context (exit code 0)

## Best Practices

1. **Maximize parallelism** -- launch independent agents concurrently via parallel Task calls
2. **Limit scope** -- give each agent a focused, well-defined task
3. **Use background mode** -- for non-blocking research tasks
4. **Provide context** -- include file paths, plan references, specific instructions
5. **Cap tool calls** -- set `max_turns` for research agents to prevent runaway exploration
6. **Check reports** -- verify subagent output in `plans/reports/` after completion
7. **Trust the protocol** -- subagents inherit rules and patterns automatically; avoid duplicating context in prompts
