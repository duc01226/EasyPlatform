# Claude Kit Setup - Comprehensive Guide

> Complete documentation for the EasyPlatform Claude Code Kit configuration, hooks, skills, agents, learning system, and workflow orchestration.

## Executive Summary

The `.claude/` directory contains a sophisticated Claude Code Kit that transforms Claude from a basic code assistant into an intelligent, self-improving development partner. Key capabilities:

- **Learning System**: Simple `/learn` command that appends lessons to `docs/lessons.md`, injected into sessions by `lessons-injector.cjs`
- **18 Specialized Agents**: Role-specific subagents for scouting, planning, debugging, reviewing, etc.
- **150+ Skills**: Domain-specific capabilities from backend development to AI prompting
- **Workflow Orchestration**: Intent detection with multilingual support, automatic workflow routing, and auto-checkpoints
- **Notification System**: Multi-provider alerts (Discord, Slack, Telegram) for task completion
- **Todo Enforcement**: Ensures planned, structured task execution
- **Memory Persistence**: Cross-session learning via `MEMORY.md` and `lessons.md`

---

## Directory Structure

```
.claude/
├── settings.json           # Main configuration (permissions, hooks, plugins)
├── settings.local.json     # Developer-specific overrides (gitignored)
├── settings.local.json.example # Template for local settings
├── workflows.json          # Workflow definitions with multilingual triggers
├── .ck.json               # Claude Kit project-specific settings
├── agents/                 # 18 specialized subagent definitions
│   ├── scout.md           # Codebase exploration
│   ├── planner.md         # Implementation planning
│   ├── code-reviewer.md   # Code quality assessment
│   ├── debugger.md        # Issue investigation
│   └── ...                # 14 more agents
├── config/                 # Configuration templates
│   ├── README.md          # Directory documentation
│   ├── release-notes-template.yaml  # Release notes structure
│   ├── skill-template.md  # Template for new skills
│   └── agent-template.md  # Template for new agents
├── hooks/                  # Event-driven processing
│   ├── auto-fix-trigger.cjs # Build/test failure escalation
│   ├── lessons-injector.cjs # Inject lessons into context
│   ├── pattern-learner.cjs  # Detect /learn commands
│   ├── session-init.cjs   # Session initialization
│   ├── workflow-router.cjs # Intent detection
│   ├── todo-enforcement.cjs # Task tracking + plan gate
│   ├── tool-output-swap.cjs # External memory swap hook
│   ├── config/            # Hook configurations
│   │   └── swap-config.json # Swap thresholds and limits
│   ├── notifications/     # Multi-provider notification system
│   │   ├── notify.cjs     # Main router
│   │   ├── lib/
│   │   │   ├── env-loader.cjs  # .env cascade loader
│   │   │   └── sender.cjs      # HTTP with throttling
│   │   └── providers/
│   │       ├── discord.cjs
│   │       ├── slack.cjs
│   │       └── telegram.cjs
│   └── lib/               # Shared utilities
│       ├── failure-state.cjs      # Build/test failure tracking
│       ├── lessons-writer.cjs     # Append-only lesson capture
│       └── swap-engine.cjs        # External memory swap engine
├── skills/                 # 70+ capability modules
│   ├── SKILL.md files     # Individual skill definitions
│   └── references/        # Skill reference documentation
├── (lessons.md moved to docs/lessons.md)
├── scripts/                # Utility scripts
│   ├── resolve_env.py     # Environment resolution
│   ├── generate_catalogs.py
│   └── ...
└── workflows/              # Workflow guidelines
    └── development-rules.md
```

---

## Learning System

Simple manual learning mechanism for cross-session knowledge persistence.

### How It Works

1. **User teaches:** `/learn <instruction>` or "remember this/that"
2. **Hook saves:** `pattern-learner.cjs` (UserPromptSubmit) appends to `docs/lessons.md`
3. **Hook injects:** `lessons-injector.cjs` (UserPromptSubmit + PreToolUse:Edit|Write|MultiEdit) injects lessons.md as system-reminder

### Files

- `docs/lessons.md` - Append-only lesson log
- `.claude/hooks/pattern-learner.cjs` - Detects /learn commands, writes lessons
- `.claude/hooks/lessons-injector.cjs` - Injects lessons into context
- `.claude/hooks/lib/lessons-writer.cjs` - `appendLesson()` utility

### Lesson Format

```markdown
## Behavioral Lessons
- [2026-02-24] INIT: Always verify BEM classes on every template element after frontend edits
- [2026-02-24] INIT: Check base class hierarchy -- extend AppBaseComponent, not PlatformComponent

## Process Improvements
(manually added during retrospectives)
```

---

## Hooks System

### Hook Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HOOK LIFECYCLE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SESSION START                                                        │    │
│  │  ├── session-init.cjs ──────────► Set CK_* env vars, detect project │    │
│  │  ├── session-resume.cjs ────────► Restore todos after compact       │    │
│  │  └── lessons-injector.cjs ─────► Inject lessons from lessons.md    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ USER PROMPT SUBMIT                                                   │    │
│  │  ├── workflow-router.cjs ───────► Detect intent, route workflow     │    │
│  │  ├── dev-rules-reminder.cjs ───► Inject development rules           │    │
│  │  └── pattern-learner.cjs ──────► Detect /learn & implicit patterns  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PRE TOOL USE (Before execution)                                      │    │
│  │  ├── todo-enforcement.cjs ─────► Block /cook without todos          │    │
│  │  ├── scout-block.cjs ──────────► Prevent wasteful queries           │    │
│  │  ├── privacy-block.cjs ────────► Filter sensitive files             │    │
│  │  └── *-context.cjs (4 hooks) ──► Inject domain patterns on edit:    │    │
│  │       ├── backend-csharp-context.cjs     (.cs files)                │    │
│  │       ├── frontend-typescript-context.cjs (.ts/.tsx)                │    │
│  │       ├── design-system-context.cjs      (UI work)                  │    │
│  │       └── scss-styling-context.cjs       (.scss files)              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│                            [TOOL EXECUTION]                                  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ POST TOOL USE (After execution)                                      │    │
│  │  ├── todo-tracker.cjs ─────────► Track TodoWrite changes            │    │
│  │  ├── post-edit-prettier.cjs ──► Auto-format edited files            │    │
│  │  ├── workflow-step-tracker.cjs ► Track workflow progress            │    │
│  │  └── auto-fix-trigger.cjs ───► Detect build/test failures (3-tier) │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PRE COMPACT (Before context compaction)                              │    │
│  │  ├── write-compact-marker.cjs ─► Mark compaction point              │    │
│  │  ├── save-context-memory.cjs ──► Persist todos before compact       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ NOTIFICATION (Task completion)                                       │    │
│  │  └── notify.cjs ───────────────► Send Discord/Slack/Telegram alert  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SESSION END (Session termination)                                    │    │
│  │  └── session-end.cjs ────────► Capture failure lessons, cleanup     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hook Quick Reference

| Hook | Count | Key Handlers |
|------|-------|--------------|
| SessionStart | 3 | session-init, session-resume, root-deps-check |
| UserPromptSubmit | 4 | workflow-router, dev-rules-reminder, pattern-learner, lessons-injector |
| PreToolUse | 16 | search-before-code, lessons-injector, todo-enforcement, code-review-rules-injector, cross-platform-bash, scout-block, privacy-block, project-boundary, 5× context injectors, role-context-injector, figma-context-extractor, artifact-path-resolver, notify |
| PostToolUse | 10 | todo-tracker, edit-complexity-tracker, post-edit-rule-check, prettier, workflow-step-tracker, tool-output-swap, bash-cleanup, compact-suggestion, ownership-tracker, auto-fix-trigger |
| PreCompact | 2 | write-compact-marker, save-context-memory |
| Notification | 1 | notify.cjs (Discord/Slack/Telegram) |
| SessionEnd | 1 | session-end.cjs (failure lessons, cleanup) |
| Stop | 1 | notify.cjs (send alert on stop) |
| SubagentStart | 1 | subagent-init.cjs (context inheritance) |
| **Total** | **~40** | Across 9 hook types |

### Hook Types

| Hook              | Trigger Event                    | Use Case                              |
|-------------------|----------------------------------|---------------------------------------|
| SessionStart      | New session begins               | Environment setup, pattern injection  |
| SubagentStart     | Subagent spawned                 | Context inheritance                   |
| UserPromptSubmit  | User sends message               | Workflow detection, todo enforcement  |
| PreToolUse        | Before tool execution            | Validation, logging                   |
| PostToolUse       | After tool execution             | Event capture, feedback tracking      |
| PreCompact        | Before context compaction        | Pattern analysis, playbook curation   |
| SessionEnd        | Session terminates               | Cleanup, final sync                   |
| Notification      | System notifications             | User feedback capture                 |

### Hook Configuration (settings.json)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-init.cjs"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/lessons-injector.cjs"
          }
        ]
      }
    ]
  }
}
```

### Key Hooks

#### session-init.cjs
- Detects project type (monorepo, npm, pip)
- Sets 30+ CK_* environment variables
- Injects coding level guidelines
- Outputs user assertions for context

#### workflow-router.cjs
- Pattern-based intent detection from user prompts
- Supports 5 languages (en, vi, zh, ja, ko)
- Routes to appropriate workflow sequence
- Tracks workflow state across messages

#### todo-enforcement.cjs
- Blocks implementation skills without active todos
- Allows research skills (scout, investigate, plan)
- Bypass with "quick:" prefix
- Ensures structured task execution

#### compact-suggestion.cjs
- Suggests `/compact` after 50 tool calls
- Tracks heavy tools: Bash, Read, Grep, Glob, Skill, Edit, Write, MultiEdit, WebFetch, WebSearch
- One-time suggestion per session (no spam)
- Auto-resets when /compact detected
- State: `.claude/.compact-state.json` via `lib/compact-state.cjs`
- Test: `CK_DEBUG=1 echo '{"tool_name":"Read"}' | node .claude/hooks/compact-suggestion.cjs`

#### code-review-rules-injector.cjs
- Auto-injects project-specific code review rules when running review skills
- Triggers on: `code-review`, `review-pr`, `review-changes`, `tasks-code-review` (and prefix variants)
- Rules file: `docs/code-review-rules.md` (external, not in `.claude/`)
- Config: `.claude/.ck.json` under `codeReview` section
- Test: `echo '{"tool_name":"Skill","tool_input":{"skill":"code-review"}}' | node .claude/hooks/code-review-rules-injector.cjs`

**Configuration (.claude/.ck.json):**
```json
{
  "codeReview": {
    "rulesPath": "docs/code-review-rules.md",
    "injectOnSkills": ["code-review", "review-pr", "review-changes", "tasks-code-review"],
    "enabled": true
  }
}
```

**To update code review rules:**
1. Edit `docs/code-review-rules.md` directly
2. Changes take effect immediately on next `/code-review` skill invocation
3. No hook restart required

#### auto-fix-trigger.cjs

- **Hook**: PostToolUse (Bash)
- Detects build/test command failures (dotnet, npm, nx, npx, yarn)
- 3-tier escalation based on consecutive failures per category:
  - **1st failure**: Suggestion to investigate
  - **2nd failure**: Stronger warning to change approach + **error snippet** (last ~10 lines, truncated at 500 chars)
  - **3rd+ failure**: Rollback review recommendation + error snippet
- `extractErrorSummary(toolResult, maxLines=10)` extracts tail of stderr/stdout from `payload.tool_result`
- Tracks failure state via `lib/failure-state.cjs` (per-session temp files)
- Resets counter on successful command in same category
- Fail-open design (always exits 0)

#### post-edit-rule-check.cjs

- **Hook**: PostToolUse (Edit|Write|MultiEdit)
- Validates edited `.cs`/`.ts` files against 6 CLAUDE.md rules after each edit
- Reads the actual file from disk post-edit for full-context validation
- Uses positive regex + negative regex (e.g., detects `HttpClient` but suppresses if `PlatformApiService` present)
- Session dedup via `rule-violations.json` — same rule on same file fires once per session
- Violation metrics counter in `violation-metrics.json` for feedback loop measurement
- Advisory only — **never blocks** (always exits 0)

**Rules enforced:**

| Rule ID | File | Detects | Negative Pattern |
|---------|------|---------|-----------------|
| `raw-httpclient` | `.ts` | Direct `HttpClient` usage | `PlatformApiService` present |
| `missing-untilDestroyed` | `.ts` | `.subscribe()` without `untilDestroyed()` | `untilDestroyed` present |
| `throw-validation` | `.cs` | `throw.*ValidationException` | — |
| `side-effect-in-handler` | `.cs` | Side effects in `CommandHandler` | — |
| `dto-mapping-in-handler` | `.cs` | `MapToEntity`/`MapToObject` in handler | — |
| `raw-component` | `.ts` | Extends `PlatformComponent` directly | `AppBaseComponent` present |

#### todo-enforcement.cjs (Plan Gate Addition)

- Added plan artifact gate for implementation skills (`cook`, `fix`, `code`, `implement`, `feature`)
- Checks if workflow has a plan step and current step is past it
- Verifies `plans/` directory contains a plan matching today's date (YYMMDD format)
- Advisory warning only — never blocks execution

#### Self-Improvement Hooks

**lessons-writer.cjs** (`lib/lessons-writer.cjs`):

- `appendLesson(category, description)`: Thread-safe append to `docs/lessons.md` with date prefix
- `captureFailureLessons(maxLessons)`: Scans recent events, writes unique failure types
- Called from `session-end.cjs` on exit and `pattern-learner.cjs` on confirmed/taught patterns
- **Frequency scoring**: Sidecar `docs/lessons-freq.json` tracks per-rule hit counts
  - `recordLessonFrequency(ruleId, description)` — increment count for a rule
  - `getTopLessons(n=10)` — return top N lessons sorted by frequency
  - `loadFrequencyData()` / `saveFrequencyData(data)` — raw sidecar access
- `lessons-injector.cjs` now sorts lessons by frequency (highest first) via `sortLessonsByFrequency()`
- All sync, all fail-open

**failure-state.cjs** (`lib/failure-state.cjs`):

- `recordFailure(sessionId, category, commandSummary, errorSnippet)` — tracks consecutive failures per category, returns count
- `recordSuccess(sessionId, category)` — resets counter for category
- `getFailureSummary(sessionId)` — returns all active failures with counts and last error snippets
- `clearFailureState(sessionId)` — clears all failure state for session
- State file: `{os.tmpdir()}/ck/{sessionId}/failure-state.json`

#### search-before-code.cjs

- **Hook**: PreToolUse (Edit|Write|MultiEdit)
- Enforces "search existing patterns first" before code modifications
- **Dynamic threshold** by file extension:
  - `.cs`, `.ts` → **10 lines** (strict — primary codebase languages)
  - `.html`, `.scss`, `.tsx`, `.css`, `.sass` → **20 lines** (default)
- Checks transcript for Grep/Glob evidence; caches via `CK_SEARCH_PERFORMED` env var
- Exempt: `.claude/`, `plans/`, `docs/`, `.md`, `node_modules/`, `dist/`, `obj/`, `bin/`
- Bypass: "skip search" / "no search" / "just do it" keywords, or `CK_SKIP_SEARCH_CHECK=1`
- Exit code **1** to block (not 2)

---

## Notification System

### Overview

Multi-provider notification system that alerts users when Claude completes tasks or needs input. Supports Discord, Slack, and Telegram with automatic provider detection and smart throttling.

### Architecture

```
User → Claude Task → Notification Hook → notify.cjs
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                    Discord              Slack               Telegram
                   (webhook)           (webhook)            (Bot API)
```

### Configuration

1. Copy `.claude/hooks/notifications/.env.example` to `.claude/.env` or `~/.claude/.env`
2. Add credentials for your preferred provider(s)
3. Notifications auto-enable when credentials detected

### Environment Cascade

Priority (highest to lowest):
1. `process.env` - Runtime environment
2. `~/.claude/.env` - User global settings
3. `.claude/.env` - Project settings

### Providers

| Provider | Credential | Setup Guide |
|----------|------------|-------------|
| Telegram | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Create bot via @BotFather |
| Discord | `DISCORD_WEBHOOK_URL` | Server Settings > Integrations > Webhooks |
| Slack | `SLACK_WEBHOOK_URL` | api.slack.com/apps > Incoming Webhooks |

### Throttling

Provider errors trigger 5-minute cooldown to prevent spam:
- State file: `/tmp/ck-noti-throttle.json`
- Clears automatically on successful send

### Hook Configuration

```json
{
  "Notification": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/notifications/notify.cjs"
        }
      ]
    }
  ]
}
```

---

## Agents System

### Overview

23 specialized subagents with role-specific prompts, tools, and behavioral guidelines. Each agent is defined in `.claude/agents/*.md` with YAML frontmatter.

### Agent Definition Format

```markdown
---
name: agent-name
description: >-
  When to use this agent and what it does
tools: Glob, Grep, Read, ...  # Available tools
model: inherit                 # Model selection
---

[Agent system prompt with instructions]
```

### Available Agents

| Agent             | Purpose                                        | Key Tools                          |
|-------------------|------------------------------------------------|------------------------------------|
| scout             | Codebase exploration with priority categorization | Glob, Grep, Read                  |
| scout-external    | External tool integration (Gemini, OpenCode)   | Bash, WebFetch                     |
| planner           | Implementation planning with mental models     | All tools                          |
| code-reviewer     | Comprehensive code quality assessment          | All tools                          |
| debugger          | Issue investigation and root cause analysis   | All tools                          |
| tester            | Test validation and coverage analysis         | All tools                          |
| database-admin    | Database operations and optimization          | All tools                          |
| docs-manager      | Documentation management                      | All tools                          |
| fullstack-developer | Implementation execution                     | All tools                          |
| git-manager       | Git operations with conventional commits      | Glob, Grep, Read, Bash             |
| journal-writer    | Technical difficulty documentation            | All tools                          |
| mcp-manager       | MCP server integration management             | All tools                          |
| project-manager   | Project coordination and reporting            | All tools (except Bash)            |
| researcher        | Technical research and synthesis              | All tools                          |
| brainstormer      | Solution exploration and architectural debate | All tools                          |
| architect         | System architecture, trade-offs, ADRs         | All tools (opus model)             |
| code-simplifier   | Code refinement for clarity                   | All tools                          |
| copywriter        | Marketing and engagement copy                 | All tools                          |
| ui-ux-designer    | Interface design and accessibility            | All tools                          |

### Agent Output Standards

Agents follow structured output formats:
- **Scout**: Priority-categorized numbered file lists
- **Planner**: Implementation plans with effort estimates
- **Code-reviewer**: Severity-prioritized findings with fixes
- **Debugger**: Root cause analysis with evidence
- **Architect**: Trade-off matrices, ADRs with alternatives, service boundary diagrams

### Architect Agent

Senior architecture agent with 8 mental models for complex design decisions:
- Second-Order Thinking, Systems Thinking, Trade-off Analysis
- Risk-First Architecture, Inversion, 80/20 Rule
- Conway's Law Awareness, Technical Debt Quadrant

**Use for:** Technology trade-offs, service boundaries, ADR creation, integration strategy.

**Model:** opus (for reasoning depth)

See `.claude/agents/architect.md` for full mental models and ADR template.

---

## Skills Framework

### Skill Structure

Each skill is defined in `.claude/skills/{skill-name}/SKILL.md`:

```markdown
---
name: skill-name
description: When to use this skill
triggers: keyword patterns that activate
tools: available tools
---

[Skill instructions and guidelines]

## References (optional)
- references/topic.md
```

### Skill Categories (Complete Inventory)

| Category | Skills | Count |
|----------|--------|-------|
| **Planning** | `ask`, `brainstorm`, `context`, `plan`, `plan-fast`, `plan-hard`, `plan-two`, `plan-review`, `plan-validate`, `plan-ci`, `plan-archive`, `plan-analysis`, `problem-solving`, `research`, `sequential-thinking` | 15 |
| **Implementation** | `code`, `code-auto`, `code-no-test`, `code-parallel`, `code-patterns`, `cook`, `cook-auto`, `cook-auto-fast`, `cook-auto-parallel`, `cook-fast`, `cook-hard`, `cook-parallel`, `create-feature`, `feature`, `migration`, `generate-dto` | 16 |
| **Fix & Debug** | `fix`, `fix-fast`, `fix-hard`, `fix-ci`, `fix-issue`, `fix-logs`, `fix-parallel`, `fix-test`, `fix-types`, `fix-ui`, `debug`, `investigate` | 12 |
| **Review & Quality** | `review`, `review-changes`, `review-codebase`, `review-post-task`, `code-review`, `code-simplifier`, `security`, `performance`, `why-review` | 9 |
| **Testing** | `test`, `test-ui`, `review-tests`, `update-tests`, `generate-tests`, `test-generation`, `test-specs-docs`, `webapp-testing`, `e2e-record` | 9 |
| **Documentation** | `docs-init`, `docs-update`, `docs-summarize`, `docs-seeker`, `documentation`, `business-feature-docs`, `feature-docs` | 7 |
| **Frontend** | `frontend-angular`, `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `design-describe`, `design-fast`, `design-good`, `design-screenshot`, `design-video` | 9 |
| **Backend / Platform** | `easyplatform-backend`, `api-design`, `database-optimization`, `bug-diagnosis`, `arch-cross-service-integration`, `arch-performance-optimization`, `arch-security-review` | 7 |
| **Git & Release** | `git-cp`, `git-pr`, `git-merge`, `git-conflict-resolve`, `pr`, `changelog-update`, `release-notes`, `branch-comparison` | 8 |
| **DevOps & Infra** | `devops`, `build`, `lint`, `package-upgrade` | 4 |
| **Team Collaboration** | `team-idea`, `team-refine`, `team-story`, `team-prioritize`, `team-dependency`, `team-status`, `team-team-sync`, `team-quality-gate`, `team-test-spec`, `team-test-cases`, `team-design-spec`, `team-figma-extract` | 12 |
| **Tooling & Meta** | `ck-help`, `claude-code`, `ai-dev-tools-sync`, `checkpoint`, `compact`, `recover`, `kanban`, `watzup`, `coding-level`, `mcp-management`, `use-mcp`, `repomix`, `scout`, `scout-ext` | 14 |
| **Learning** | `learn`, `memory-management`, `context-optimization` | 3 |
| **Skill Management** | `skill-create`, `skill-add`, `skill-optimize`, `skill-plan`, `skill-fix-logs` | 5 |
| **Document Conversion** | `docx-to-markdown`, `markdown-to-docx`, `markdown-to-pdf`, `pdf-to-markdown` | 4 |
| **Subagent Tasks** | `tasks-code-review`, `tasks-documentation`, `tasks-feature-implementation`, `tasks-spec-update`, `tasks-test-generation` | 5 |
| **Workflow** | `workflow-start`, `worktree`, `refactoring` | 3 |
| | **Total** | **~150** |

### Skill Activation

Skills activate via:
1. **Explicit**: `/skill-name` or `/skill-name args`
2. **Automatic**: Trigger keyword detection in prompts
3. **Agent delegation**: Agents invoke skills during execution

### Command Variants (cook)

The `/cook` command supports hierarchical variants for different execution modes:

| Command | Mode | Description |
|---------|------|-------------|
| `/cook` | Default | Standard implementation with planning |
| `/cook/fast` | ⚡ Fast | Skip research, minimal planning, trust knowledge |
| `/cook/hard` | ⚡⚡⚡⚡ Thorough | Extra research, detailed planning, mandatory reviews |
| `/cook/parallel` | ⚡⚡⚡ Parallel | Multiple subagents working concurrently |

#### /cook/fast
```
Workflow: Quick Plan → Rapid Implementation → Quick Validation → Optional Commit
Use when: Simple features, bug fixes with known solutions, "just do it"
Trade-off: ~2x faster, skips research/review phases
```

#### /cook/hard
```
Workflow: Deep Research (2-3 agents) → Comprehensive Plan → Verified Implementation → Mandatory Testing → Mandatory Review → Documentation
Use when: Critical production features, security changes, API modifications
Trade-off: Thorough with quality gates (2+ researcher reports, 0 critical findings required)
```

#### /cook/parallel
```
Workflow: Task Decomposition → Parallel Research → Parallel Planning → Parallel Implementation → Integration
Use when: Multi-component features, large refactoring, parallel test writing
Trade-off: ~2-3x faster but higher coordination complexity
Rules: File ownership per subagent, max 3 concurrent, sync points between phases
```

Example parallel task split:
```
"Add user authentication with login UI"
├── Backend API (subagent 1)
│   ├── auth-controller.ts
│   └── auth-service.ts
├── Frontend UI (subagent 2)
│   ├── login-page.component.ts
│   └── login-form.component.ts
└── Tests (subagent 3)
    ├── auth.spec.ts
    └── login.e2e.ts
```

---

## Workflow Orchestration

> How this project's `.claude/` setup automatically detects user intent and orchestrates multi-step development workflows.

### Overview

This workspace implements a **multi-layer orchestration system** for Claude Code that:

1. **Automatically detects** user intent from natural language prompts
2. **Injects workflow instructions** into the LLM's context before it responds
3. **Guides the AI** through multi-step development workflows (plan → implement → test → review)

The system uses **hooks** (JavaScript scripts), **configuration files** (JSON), and **skills** (prompt templates) to achieve zero-touch workflow automation.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE CODE RUNTIME                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐   │
│  │ User Prompt │────▶│ UserPromptSubmit │────▶│ Workflow Router Hook    │   │
│  │             │     │ Hook Event       │     │ (workflow-router.cjs)   │   │
│  └─────────────┘     └──────────────────┘     └───────────┬─────────────┘   │
│                                                           │                  │
│                                   ┌───────────────────────▼────────────────┐│
│                                   │          workflows.json                ││
│                                   │  - Pattern matching rules              ││
│                                   │  - Workflow sequences                  ││
│                                   │  - Command mappings                    ││
│                                   └───────────────────────┬────────────────┘│
│                                                           │                  │
│                                   ┌───────────────────────▼────────────────┐│
│                                   │     Inject Instructions to LLM         ││
│                                   │  "Detected: Feature Implementation"   ││
│                                   │  "Following: /plan → /plan-validate → /plan-review..."││
│                                   └───────────────────────┬────────────────┘│
│                                                           │                  │
│  ┌───────────────────────────────────────────────────────▼─────────────────┐│
│  │                          CLAUDE AI (LLM)                                ││
│  │  1. Reads injected instructions                                         ││
│  │  2. Announces workflow to user                                          ││
│  │  3. Executes Skill tool with each step (/plan, /cook, /test...)        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Workflow Configuration (workflows.json)

Defines all workflow types, their trigger patterns, and step sequences:

```json
{
  "$schema": "./workflows.schema.json",
  "version": "2.0.0",
  "settings": {
    "enabled": true,
    "confirmHighImpact": true,
    "showDetection": true,
    "allowOverride": true,
    "overridePrefix": "quick:"
  },
  "workflows": {
    "feature": {
      "name": "Feature Implementation",
      "triggerPatterns": [
        "\\b(implement|add|create|build|develop|make)\\b.*\\b(feature|functionality|capability)\\b",
        "\\bnew\\s+(feature|functionality|capability)\\b"
      ],
      "excludePatterns": ["\\b(fix|bug|error|broken|issue)\\b"],
      "sequence": ["scout", "investigate", "plan", "plan-validate", "plan-review", "cook", "why-review", "code-simplifier", "code-review", "changelog-update", "test", "docs-update", "watzup"],
      "confirmFirst": false
    },
    "bugfix": {
      "name": "Bug Fix",
      "whenToUse": "Bug, error, crash, broken functionality",
      "sequence": ["scout", "investigate", "debug", "plan", "plan-review", "plan-validate", "why-review", "fix", "code-simplifier", "review-changes", "code-review", "changelog", "test", "watzup"],
      "confirmFirst": false
    }
  },
  "commandMapping": {
    "plan": { "claude": "/plan" },
    "cook": { "claude": "/cook" },
    "test": { "claude": "/test" },
    "fix": { "claude": "/fix" },
    "code-review": { "claude": "/review-codebase" }
  }
}
```

### Workflow Types — Complete Catalog (23 Workflows)

All workflows are defined in `.claude/workflows.json` v2.0.0. The workflow router automatically matches user intent to the correct workflow.

#### Code-Producing Workflows (9)

| ID | Name | Sequence | When to Use |
|----|------|----------|-------------|
| `feature` | Feature Implementation | scout → investigate → plan → plan-review → plan-validate → why-review → cook → code-simplifier → review-changes → code-review → changelog → test → docs-update → watzup | New feature, functionality, module, component |
| `bugfix` | Bug Fix | scout → investigate → debug → plan → plan-review → plan-validate → why-review → fix → code-simplifier → review-changes → code-review → changelog → test → watzup | Bug, error, crash, broken functionality |
| `refactor` | Code Refactoring | scout → investigate → plan → plan-review → plan-validate → why-review → code → code-simplifier → review-changes → code-review → changelog → test → watzup | Restructure, clean up, technical debt |
| `migration` | Database Migration | scout → investigate → plan → plan-review → plan-validate → code → review-changes → code-review → test → watzup | Schema changes, data migrations, EF migrations |
| `batch-operation` | Batch Operation | plan → plan-review → plan-validate → why-review → code → code-simplifier → review-changes → test → watzup | Multi-file batch changes, bulk renames |
| `deployment` | Deployment & Infra | scout → investigate → plan → plan-review → plan-validate → code → review-changes → code-review → test → watzup | CI/CD, Docker, deploy to environments |
| `performance` | Performance Optimization | scout → investigate → plan → plan-review → plan-validate → code → review-changes → code-review → test → watzup | Slow queries, latency, bottlenecks |
| `verification` | Verification & Validation | scout → investigate → test-initial → plan → plan-review → plan-validate → fix → code-simplifier → review-changes → code-review → test → watzup | Verify correctness, ensure expected behavior |
| `e2e-testing` | E2E Testing | scout → investigate → plan → plan-review → plan-validate → code → review-changes → code-review → test → watzup | Playwright test creation, E2E coverage |

#### Review & Quality Workflows (4)

| ID | Name | Sequence | When to Use |
|----|------|----------|-------------|
| `quality-audit` | Quality Audit | code-review → plan → plan-review → plan-validate → code → review-changes → test → watzup | Review code for best practices, audit-and-fix |
| `review` | Code Review | code-review → watzup | PR review, code quality check |
| `review-changes` | Review Changes | review-changes | Pre-commit review of uncommitted changes |
| `security-audit` | Security Audit | scout → investigate → watzup | Vulnerability assessment, OWASP check |

#### Documentation Workflows (2)

| ID | Name | Sequence | When to Use |
|----|------|----------|-------------|
| `documentation` | Documentation Update | scout → investigate → plan → plan-review → plan-validate → docs-update → review-changes → review-post-task → watzup | General docs, README, code comments |
| `business-feature-docs` | Business Feature Docs | scout → investigate → plan → plan-review → plan-validate → docs-update → review-changes → review-post-task → watzup | 26-section business feature template |

#### Planning & Investigation Workflows (3)

| ID | Name | Sequence | When to Use |
|----|------|----------|-------------|
| `investigation` | Code Investigation | scout → investigate | Understand how code works (read-only) |
| `pre-development` | Pre-Development Setup | quality-gate → plan → plan-review → plan-validate | Quality gate + plan before coding |
| `design-workflow` | Design Workflow | design-spec → review-changes → code-review → watzup | UI/UX design specification |

#### Team & PM Workflows (5)

| ID | Name | Sequence | When to Use |
|----|------|----------|-------------|
| `idea-to-pbi` | Idea to PBI | idea → refine → story → prioritize → watzup | Product idea → PBI → user stories |
| `pbi-to-tests` | PBI to Tests | test-spec → test-cases → quality-gate → watzup | Generate test specs from PBIs |
| `pm-reporting` | PM Reporting | status → dependency | Sprint status report, project progress |
| `sprint-planning` | Sprint Planning | prioritize → dependency → team-sync | Backlog prioritization, sprint kickoff |
| `release-prep` | Release Preparation | quality-gate → status | Pre-release checks, go-live verification |
| `full-feature-lifecycle` | Full Feature Lifecycle | idea → refine → story → design-spec → plan → plan-review → plan-validate → cook → review-changes → test-spec → quality-gate → watzup | Complete feature from idea to release |

*Lower priority number = higher preference when multiple workflows match*

### Workflow Router (workflow-router.cjs)

The **core orchestration engine** intercepts every user prompt:

```javascript
function detectIntent(userPrompt, config) {
  const { workflows, settings } = config;

  // Check for override prefix ("quick:" skips detection)
  if (settings.allowOverride && userPrompt.toLowerCase().startsWith(settings.overridePrefix)) {
    return { skipped: true, reason: 'override_prefix' };
  }

  // Check for explicit command (e.g., "/plan" bypasses detection)
  if (/^\/\w+/.test(userPrompt.trim())) {
    return { skipped: true, reason: 'explicit_command' };
  }

  // Score each workflow by pattern matching
  const scores = [];
  for (const [workflowId, workflow] of Object.entries(workflows)) {
    let score = 0;

    // Check exclude patterns first
    if (workflow.excludePatterns?.some(p => new RegExp(p, 'i').test(userPrompt))) continue;

    // Check trigger patterns
    for (const pattern of workflow.triggerPatterns || []) {
      if (new RegExp(pattern, 'i').test(userPrompt)) score += 10;
    }

    if (score > 0) scores.push({ workflowId, workflow, score });
  }

  // Return highest scoring workflow
  scores.sort((a, b) => (b.score - b.workflow.priority) - (a.score - a.workflow.priority));
  return scores[0] ? { detected: true, ...scores[0] } : { detected: false };
}
```

### Workflow Detection Matrix

| User Prompt                 | Matched Patterns | Excluded By            | Result            |
|-----------------------------|------------------|------------------------|-------------------|
| "Add dark mode feature"     | `add.*feature`   | -                      | Feature workflow  |
| "Fix the login bug"         | `fix`, `bug`     | -                      | Bugfix workflow   |
| "Add a fix for the crash"   | `add`, `fix`     | `fix` excludes feature | Bugfix wins       |
| "/plan dark mode"           | -                | `^\/\w+` (explicit)    | Skip detection    |
| "quick: add button"         | -                | `quick:` prefix        | Skip detection    |
| "How does auth work?"       | `how does.*work` | -                      | Investigation     |

### Override Mechanisms

| Method | Example | Result |
|--------|---------|--------|
| **Quick prefix** | `quick: add a button` | Skip workflow, handle directly |
| **Explicit command** | `/plan implement dark mode` | Execute /plan directly |
| **Say "quick"** | (after detection) `quick` | Cancel workflow |
| **Say "skip"** | (during workflow) `skip` | Skip current step |
| **Say "abort"** | (during workflow) `abort` | Cancel entire workflow |

### Workflow State Persistence

For long-running workflows, the system includes **state persistence** to prevent context loss:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW STATE PERSISTENCE                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Workflow Detected ──▶ Creates .claude/.workflow-state.json             │
│           │                                                             │
│  Each User Prompt ──▶ Checks for active workflow                        │
│           │           ├─▶ Injects continuation reminder                 │
│           │           └─▶ Shows progress: "Step 2/7"                    │
│           │                                                             │
│  Skill Completes ──▶ Updates state, advances to next step               │
│           │                                                             │
│  Workflow Complete ──▶ Clears state file                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**State File Schema** (`.claude/.workflow-state.json`):

```json
{
  "workflowId": "bugfix",
  "workflowName": "Bug Fix",
  "sequence": ["scout", "investigate", "debug", "plan", "plan-validate", "plan-review", "fix", "code-simplifier", "code-review", "test"],
  "currentStep": 0,
  "completedSteps": [],
  "startTime": "2026-01-07T15:23:34.000Z",
  "originalPrompt": "fix the login bug",
  "ttlHours": 24
}
```

### Todo Enforcement System

The workspace enforces todo list creation before implementation work via runtime hooks.

```
┌─────────────────────────────────────────────────────────────────┐
│                   TODO ENFORCEMENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  User calls Skill tool (e.g., /cook, /fix)                       │
│           │                                                      │
│  PreToolUse event fires → todo-enforcement.cjs executes          │
│           │                                                      │
│           ├─ Skill in ALLOWED list? → Pass through               │
│           ├─ Has "quick:" bypass? → Pass through                 │
│           └─ Check .todo-state.json for active todos             │
│                   │                                              │
│                   ├─ Has todos → Allow execution                 │
│                   └─ No todos → BLOCK with error message         │
└─────────────────────────────────────────────────────────────────┘
```

**Allowed Skills (No Todos Required):**

| Category | Skills |
|----------|--------|
| Research | `/scout`, `/investigate`, `/research`, `/docs-seeker` |
| Planning | `/plan`, `/plan-fast`, `/plan-hard`, `/plan-validate` |
| Status | `/watzup`, `/checkpoint`, `/kanban`, `/compact` |

**Blocked Skills (Todos Required):**

| Category | Skills |
|----------|--------|
| Implementation | `/cook`, `/fix`, `/code`, `/feature`, `/refactoring` |
| Testing | `/test`, `/debug`, `/build` |
| Review/Git | `/code-review`, `/commit` |

### Context Preservation System

Automatic checkpoint/restore prevents loss of todos and progress during context compaction:

```
┌─────────────────────────────────────────────────────────────────┐
│                CONTEXT PRESERVATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│  SAVE (PreCompact)                    RESTORE (SessionStart)     │
│  ─────────────────                    ─────────────────────      │
│  save-context-memory.cjs              session-resume.cjs          │
│           │                                    │                  │
│  1. Export todos from state           1. Find latest checkpoint   │
│  2. Capture context stats             2. Check age (<24h)         │
│  3. Write checkpoint file             3. Parse "Active Todos"     │
│     plans/reports/memory-             4. Restore to state file    │
│     checkpoint-YYMMDD-HHMMSS.md       5. Output reminder to LLM   │
└─────────────────────────────────────────────────────────────────┘
```

**Age Validation:**
- **< 24h:** Auto-restore todos on session resume
- **> 24h:** Warning shown, manual restore required

### Automatic Checkpoints

Workflows can auto-save context at regular intervals:

```json
{
  "settings": {
    "checkpoints": {
      "enabled": true,
      "intervalMinutes": 30,
      "path": "plans/reports",
      "autoSaveOnCompact": true,
      "filenamePattern": "checkpoint-{YYMMDD}-{HHMM}-{slug}.md"
    }
  }
}
```

Workflows with `enableCheckpoints: true`:
- Feature Implementation
- Bug Fix
- Code Investigation
- Code Refactoring

### Complete Execution Flow Example

**User Types:** "Add a dark mode toggle to the settings page"

**Phase 1: Hook Execution**
```
1. UserPromptSubmit event fires
2. workflow-router.cjs executes:
   - Pattern "add" matches feature.triggerPatterns ✓
   - No exclude patterns matched
   - Score: 10 points for "feature" workflow
   - Output: Workflow instructions to stdout
```

**Phase 2: LLM Receives Context**
```
[User Message]
Add a dark mode toggle to the settings page

[System Reminder - from workflow-router.cjs]
## Workflow Detected

**Intent:** Feature Implementation (100% confidence)
**Workflow:** /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /changelog → /test → /docs-update → /watzup

### Instructions (MUST FOLLOW)
1. Announce detected workflow to user
2. CREATE TODO LIST (MANDATORY) for each step
3. ASK: "Proceed with this workflow? (yes/no/quick)"
4. EXECUTE each step, marking todos completed
```

**Phase 3: LLM Response**
```
> Detected: **Feature Implementation** workflow.
> I will follow: /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /changelog → /test → /docs-update → /watzup

[Creates todo list:]
- [ ] Execute /plan - Create implementation plan
- [ ] Execute /plan-validate - Validate plan with critical questions
- [ ] Execute /plan-review - Self-review plan
- [ ] Execute /cook - Implement feature
- [ ] Execute /code-simplifier - Simplify code
...

Proceed with this workflow? (yes/no/quick)
```

**Phase 4: Sequential Execution**
```
User: "yes"

Step 1: Claude calls Skill("plan") → Creates plan → ✓
Step 2: Claude calls Skill("plan-validate") → Validates plan → ✓
Step 3: Claude calls Skill("plan-review") → Self-reviews plan → ✓
Step 4: Claude calls Skill("cook") → Implements feature → ✓
Step 5: Claude calls Skill("code-simplifier") → Simplifies code → ✓
Step 6: Claude calls Skill("code-review") → Reviews changes → ✓
Step 7: Claude calls Skill("test") → Runs tests → ✓
Step 8: Claude calls Skill("docs-update") → Updates docs → ✓
Step 9: Claude calls Skill("watzup") → Summarizes → ✓
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow not detected | Check patterns in `workflows.json`, verify `settings.enabled` |
| Wrong workflow detected | Review priorities, add exclude patterns, use `quick:` prefix |
| Hook errors | Check script syntax, verify `%CLAUDE_PROJECT_DIR%` resolves |
| State not persisting | Check `.claude/.workflow-state.json` write permissions |

### Best Practices

1. **Define Clear Patterns**: Use specific regex that minimize false positives
2. **Use Exclude Patterns**: Prevent workflow conflicts by excluding competing keywords
3. **Set Appropriate Priorities**: Lower priority number = higher preference
4. **Require Confirmation**: Set `confirmFirst: true` for high-impact workflows
5. **Include Code Review**: Add `/code-review` step after code changes

---

## Memory Management

### Memory Files

| File                    | Location          | Purpose                                                 |
|-------------------------|-------------------|---------------------------------------------------------|
| `MEMORY.md`             | project root      | Project memory reference (golden rules, patterns)       |
| `lessons.md`            | `docs/`           | Append-only lesson log (behavioral, process)            |

### Lesson Lifecycle

1. **Capture**: User invokes `/learn <instruction>` or says "remember this"
2. **Storage**: `pattern-learner.cjs` appends to `docs/lessons.md` with date prefix
3. **Injection**: `lessons-injector.cjs` injects all lessons into session context
4. **Persistence**: Lessons persist across sessions (append-only, never pruned automatically)

---

## External Memory Swap System

### Overview

The External Memory Swap system externalizes large tool outputs to disk files with semantic summaries for **post-compaction recovery** without re-executing tools. This enables Claude to recover exact content after context compaction.

### Critical Constraint

> **PostToolUse hooks CANNOT transform tool output.** They can only observe and inject additional content. The original output still enters context during the active session.

### Value Proposition

| What It Does | What It Does NOT Do |
|--------------|---------------------|
| ✅ Post-compaction exact recovery | ❌ Reduce active session tokens |
| ✅ Semantic summaries for quick reference | ❌ Transform tool output |
| ✅ Session-isolated storage | ❌ Work as virtual memory |
| ✅ Tool-specific threshold tuning | ❌ Provide token savings during session |

### Architecture

```
Tool Execution (Read/Grep/Glob/Bash)
         │
         ▼
┌─────────────────────┐
│  PostToolUse Hook   │
│  tool-output-swap   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     size < threshold
│  shouldExternalize  │─────────────────────► No action
└─────────┬───────────┘
          │ size >= threshold
          ▼
┌─────────────────────┐
│    externalize()    │──► Write swap files + inject pointer
└─────────────────────┘

... After Context Compaction ...

┌─────────────────────┐
│  SessionStart Hook  │
│ post-compact-recovery│
└─────────┬───────────┘
          │
          ▼
Inject swap inventory table → LLM can Read exact content
```

### Components

| File | Location | Purpose |
|------|----------|---------|
| `swap-engine.cjs` | `.claude/hooks/lib/` | Core externalization logic |
| `tool-output-swap.cjs` | `.claude/hooks/` | PostToolUse hook entry |
| `swap-config.json` | `.claude/hooks/config/` | Thresholds and limits |

### Configuration

```json
{
  "enabled": true,
  "thresholds": {
    "default": 4096,
    "Read": 8192,
    "Grep": 4096,
    "Bash": 6144,
    "Glob": 2048
  },
  "retention": {
    "defaultHours": 24,
    "accessedHours": 48,
    "neverAccessedHours": 6
  },
  "limits": {
    "maxEntriesPerSession": 100,
    "maxTotalBytes": 52428800,
    "maxSingleFile": 5242880
  }
}
```

### Storage Structure

```
{os.tmpdir()}/ck/swap/{sessionId}/
├── index.jsonl          # Session manifest (JSONL format - atomic appends)
├── {uuid}.content       # Raw content (exact)
└── {uuid}.meta.json     # Metadata + summary
```

**Note:** Uses `os.tmpdir()` for cross-platform support (Windows: `%TEMP%`, Unix: `/tmp`)

### Key Functions

#### shouldExternalize(toolName, toolResult, toolInput)
- Checks if swap is enabled
- Prevents recursion (skips swap file reads)
- Compares byte size against tool-specific thresholds
- Returns true if output should be externalized

#### externalize(sessionId, toolName, toolInput, toolResult)
- Validates disk space limits
- Generates UUID for swap entry
- Writes content file and metadata
- Appends to JSONL index (atomic)
- Returns pointer info or null on failure

#### extractSummary(content, toolName)
- Tool-specific summarization:
  - **Read**: Extracts class/function/interface signatures
  - **Grep**: Shows match count and preview
  - **Glob**: Shows file count and extension types
  - **Default**: Truncates content

#### buildPointer(entry)
- Creates markdown reference with:
  - Swap ID, tool, input
  - Size metrics (chars, estimated tokens)
  - Summary and key patterns
  - Retrieval command

### Integration Points

#### PostToolUse Hook (tool-output-swap.cjs)
- Triggered for: Read, Grep, Glob, Bash
- Calls shouldExternalize() → externalize() → buildPointer()
- Outputs markdown pointer to stdout

#### SessionStart Hook (session-resume.cjs)
- Loads swap entries for current session
- Injects inventory table with retrieval paths
- Escapes markdown pipes in summaries

#### SessionEnd Hook (session-end.cjs)
- On "clear": Deletes entire session swap directory
- On "compact": Runs retention cleanup + orphan removal

### Cleanup Behavior

| Trigger | Action |
|---------|--------|
| `/clear` | Delete all swap files for session |
| Context compact | Remove expired files (>24h default) |
| Session end | Cleanup orphan files |

### Safety Features

1. **Fail-open**: All errors exit 0 (never blocks Claude)
2. **Recursion prevention**: Skips reads from swap directory
3. **Session isolation**: Files scoped by session ID
4. **Atomic writes**: JSONL append-only index
5. **Disk limits**: maxTotalBytes, maxEntriesPerSession

---

## Scripts & Utilities

### resolve_env.py

Centralized environment variable resolver with priority hierarchy:

1. Runtime environment variables (highest)
2. Project skill-specific: `.claude/skills/<skill>/.env`
3. Project shared: `.claude/skills/.env`
4. Project global: `.claude/.env`
5. User skill-specific: `~/.claude/skills/<skill>/.env`
6. User shared: `~/.claude/skills/.env`
7. User global: `~/.claude/.env` (lowest)

```bash
# Usage
python .claude/scripts/resolve_env.py GEMINI_API_KEY --skill ai-multimodal
```

### generate_catalogs.py

Generates YAML catalogs from skill data files.

```bash
python .claude/scripts/generate_catalogs.py --skills
```

### Other Scripts

- `scan_skills.py`: Discovers and catalogs skill definitions
- `set-active-plan.cjs`: Plan state management
- `worktree.cjs`: Git worktree operations

---

## ClaudeKit Paths (`ck-paths.cjs`)

Centralized namespace for all temp files:

```javascript
const CK_TMP_DIR = '/tmp/ck';          // Root directory
const MARKERS_DIR = '/tmp/ck/markers'; // Session markers
const DEBUG_DIR = '/tmp/ck/debug';
const CALIBRATION_PATH = '/tmp/ck/calibration.json';
```

Benefits:
- Single namespace cleanup (`rm -rf /tmp/ck/`)
- No collisions with other tools
- Easy debugging (all state in one place)

---

## Configuration Files

### settings.json

Main configuration covering:
- **Permissions**: allow/deny/ask lists for tools and commands
- **Hooks**: Event-to-handler mappings
- **Plugins**: Enabled integrations (code-review, lsp, etc.)
- **Models**: Default model settings

### settings.local.json (Developer Overrides)

Developer-specific settings that override `settings.json` without modifying shared configuration. This file is gitignored.

**Load Priority** (highest to lowest):
1. `settings.local.json` - Developer overrides
2. `settings.json` - Project shared settings
3. `~/.claude/settings.json` - User global settings

**Merge Behavior**: Deep merge - local settings add to or override specific values without replacing entire sections.

**Setup**:
```bash
# Copy template and customize
cp .claude/settings.local.json.example .claude/settings.local.json
```

**Example settings.local.json**:
```json
{
  "permissions": {
    "allow": [
      "Bash(python*)",
      "Bash(docker*)",
      "Bash(for*)",
      "Bash(while*)"
    ]
  }
}
```

**Use Cases**:
- Add developer-specific Bash permissions (python, docker, etc.)
- Enable plugins for personal workflows
- Override model settings for testing

### config/ Directory

Centralized configuration templates for skills, agents, and workflows.

| File | Purpose |
|------|---------|
| `release-notes-template.yaml` | Template for release notes generation |
| `skill-template.md` | Template for creating new skills |
| `agent-template.md` | Template for creating new agents |

**Creating New Skills**:
1. Copy `.claude/config/skill-template.md` to `.claude/skills/{skill-name}/SKILL.md`
2. Update YAML frontmatter with skill details
3. Add skill-specific content and examples

**Creating New Agents**:
1. Copy `.claude/config/agent-template.md` to `.claude/agents/{agent-name}.md`
2. Update frontmatter with agent details
3. Define agent behavior and constraints

### .ck.json

Project-specific Claude Kit settings:
- Coding level (0-5 scale)
- Plan naming format
- User assertions (15 EasyPlatform architecture rules)
- Validation settings

### workflows.json

Workflow definitions with:
- Sequence of skills/commands
- Multilingual trigger patterns
- Priority weights
- Copilot command mappings

---

## How Everything Works Together

### Session Lifecycle

```
1. SESSION START
   ├── session-init.cjs → Detect project, set env vars
   ├── lessons-injector.cjs → Inject lessons from lessons.md
   └── Output environment context + assertions

2. USER PROMPT
   ├── workflow-router.cjs → Detect intent, suggest workflow
   ├── todo-enforcement.cjs → Check/require todo list
   └── Route to appropriate skill/agent

3. SKILL EXECUTION
   ├── PreToolUse hooks → Validation + context injection
   ├── Tool execution
   ├── PostToolUse hooks → Track workflow progress
   └── Auto-format edited files

4. CONTEXT COMPACTION
   ├── write-compact-marker.cjs → Mark compaction point
   └── save-context-memory.cjs → Persist todos + state

5. SESSION END
   └── Cleanup, state persistence
```

### Learning Flow

```
User teaches (/learn) → pattern-learner.cjs → lessons.md → lessons-injector.cjs → Session Context
       ↑                                                                              │
       └──────────────────── Improved Future Executions ◀─────────────────────────────┘
```

### Value Proposition

| Component            | Benefit                                                |
|----------------------|--------------------------------------------------------|
| Learning System      | Claude retains lessons across sessions via lessons.md |
| Specialized Agents   | Expert-level handling for specific task types         |
| Skills Framework     | Consistent, well-documented capabilities              |
| Workflow Orchestration | Structured, complete task execution with checkpoints |
| Notification System  | Never miss task completion, reduced context-switching |
| Todo Enforcement     | No forgotten steps, visible progress                  |
| Memory Persistence   | Cross-session knowledge retention                     |
| Environment Detection | Context-aware behavior                               |

---

## Best Practices

### For Users

1. **Use workflows**: Let intent detection route to appropriate sequence
2. **Maintain todos**: Keep task list updated for visibility
3. **Teach with /learn**: Use `/learn` to persist important patterns
4. **Use agents**: Delegate complex tasks to specialized agents

### For Extension

1. **Add skills**: Create `SKILL.md` with YAML frontmatter
2. **Add agents**: Create `agent.md` in `.claude/agents/`
3. **Add hooks**: Register in `settings.json`
4. **Customize workflows**: Edit `workflows.json`

### Troubleshooting

| Issue                          | Solution                                           |
|--------------------------------|----------------------------------------------------|
| Lessons not injecting          | Check `lessons.md` has entries, lessons-injector.cjs is active |
| Workflow not detected          | Check trigger patterns in workflows.json          |
| Todo enforcement blocking      | Use "quick:" prefix or create todo list           |

---

## How to Trigger Learning

This project has two complementary learning mechanisms.

### 1. Explicit Pattern Teaching (`/learn`)

Teach Claude specific patterns, conventions, or corrections that persist across sessions.

**Teach a pattern:**
```
/learn always use PlatformValidationResult instead of throwing exceptions
```

**Teach with wrong/right examples:**
```
/learn [wrong] throw new ValidationException() [right] return PlatformValidationResult.Invalid()
```

**What happens:** The `pattern-learner.cjs` hook captures your teaching and appends it to `docs/lessons.md`. The `lessons-injector.cjs` hook injects all lessons into future sessions.

### 2. Claude Auto-Memory

Claude's built-in auto-memory at `~/.claude/projects/<project>/memory/MEMORY.md` stores stable patterns confirmed across multiple interactions. The project-level `MEMORY.md` at the repo root is also auto-loaded.

### Quick Reference: Learning Triggers

| Trigger | System | Storage | Injection |
|---------|--------|---------|-----------|
| `/learn <pattern>` | Lessons | `docs/lessons.md` | UserPromptSubmit + PreToolUse |
| "remember this" | Lessons | `docs/lessons.md` | Same |
| Claude notices stable pattern | Auto-Memory | `~/.claude/projects/.../MEMORY.md` | System prompt |

---

## How Hooks Help - Detailed Workflow Execution

This section provides detailed explanations of how each hook category helps and step-by-step workflow execution traces for main use cases.

### Hook Categories and Their Purpose

#### 1. SessionStart Hooks - Environment Bootstrap

**What they do**: Initialize the session environment, detect project context, and inject learned patterns.

**Why they help**:
- **Consistency**: Every session starts with the same context awareness (project type, package manager, framework)
- **Memory**: Previously learned patterns are injected, so Claude doesn't repeat mistakes
- **Efficiency**: Environment variables (`CK_*`) are set once, avoiding repeated detection

**Execution Trace**:
```
User starts Claude session
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ session-init.cjs (fires on: startup|resume|clear|compact)                    │
│                                                                              │
│ 1. Read stdin JSON payload: { source: "startup", session_id: "..." }        │
│                                                                              │
│ 2. Detect project context:                                                   │
│    ├── detectProjectType() → "single-repo" (checks pnpm-workspace.yaml,     │
│    │                          lerna.json, package.json workspaces)          │
│    ├── detectPackageManager() → "npm" (checks lock files)                   │
│    └── detectFramework() → "react" (checks package.json deps)               │
│                                                                              │
│ 3. Set 30+ environment variables via CLAUDE_ENV_FILE:                       │
│    CK_PROJECT_TYPE=single-repo                                               │
│    CK_PACKAGE_MANAGER=npm                                                    │
│    CK_GIT_BRANCH=main                                                        │
│    CK_CODING_LEVEL=4                                                         │
│    CK_NAME_PATTERN=260112-1430-GH-88-{slug}                                  │
│    ...                                                                       │
│                                                                              │
│ 4. Output context summary:                                                   │
│    "Session startup. Project: single-repo | PM: npm | Plan naming: ..."     │
│                                                                              │
│ 5. Inject coding level guidelines (if codingLevel != -1):                   │
│    Output: "# Tech Lead Communication Mode..."                               │
│                                                                              │
│ 6. Output user assertions (15 EasyPlatform rules)                           │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ session-resume.cjs (fires on: startup|resume|compact)                        │
│                                                                              │
│ 1. Load checkpoint from .claude/memory/checkpoints/<session_id>.json        │
│ 2. If checkpoint exists and < 24h old:                                       │
│    ├── Restore todo list state                                               │
│    ├── Restore workflow state                                                │
│    └── Output: "Restored: 3 todos, workflow: feature-implementation"        │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ lessons-injector.cjs (fires on: UserPromptSubmit + PreToolUse:Edit|Write)   │
│                                                                              │
│ 1. Load lessons from docs/lessons.md                                      │
│                                                                              │
│ 2. Parse lesson lines (format: "- [date] Category: Description")           │
│                                                                              │
│ 3. Inject as system-reminder:                                               │
│    "## Lessons Learned                                                       │
│    - Always verify BEM classes on every template element                    │
│    - Check base class hierarchy -- extend AppBaseComponent                 │
│    - Run search-before-code before writing any new code"                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2. UserPromptSubmit Hooks - Intent Detection & Workflow Routing

**What they do**: Analyze user prompts to detect intent and route to appropriate workflows.

**Why they help**:
- **Automation**: Users don't need to know which skills to invoke
- **Consistency**: Same request triggers same workflow sequence
- **Guidance**: Provides step-by-step workflow instructions

**Execution Trace**:
```
User submits: "Add a dark mode toggle to the settings page"
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ workflow-router.cjs                                                          │
│                                                                              │
│ 1. Parse stdin: { prompt: "Add a dark mode toggle..." }                     │
│                                                                              │
│ 2. Check for override prefix ("quick:"):                                     │
│    if (prompt.startsWith("quick:")) → skip detection                        │
│                                                                              │
│ 3. Check for explicit command (/skill):                                      │
│    if (/^\/\w+/.test(prompt)) → skip detection                              │
│                                                                              │
│ 4. Detect intent from workflows.json:                                        │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │ For each workflow in config.workflows:                                │ │
│    │   - Check excludePatterns first (skip if matched)                    │ │
│    │   - Check triggerPatterns: ["\\b(implement|add|create|build)\\b"]    │ │
│    │   - "add" matches → score += 10                                       │ │
│    │   - adjustedScore = score - priority (lower = higher preference)      │ │
│    │                                                                        │ │
│    │ Result: { workflowId: "feature", confidence: 100 }                    │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ 5. Create workflow state:                                                    │
│    createState({                                                             │
│      workflowId: "feature",                                                  │
│      workflowName: "Feature Implementation",                                 │
│      sequence: ["plan", "plan-validate", "plan-review", "cook", "code-simplifier", "code-review", "test"],                     │
│      originalPrompt: "Add a dark mode toggle..."                            │
│    })                                                                        │
│    → Saves to .claude/memory/.workflow-state.json                           │
│                                                                              │
│ 6. Generate instructions output:                                             │
│    "## Workflow Detected                                                     │
│    **Intent:** Feature Implementation (100% confidence)                      │
│    **Workflow:** /plan → /plan-validate → /plan-review → /cook → /simplify...                │
│                                                                              │
│    ### Instructions (MUST FOLLOW)                                            │
│    1. ANNOUNCE: Tell the user...                                             │
│    2. EXECUTE: Follow the workflow sequence..."                              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ dev-rules-reminder.cjs                                                       │
│                                                                              │
│ 1. Check if relevant development rules should be injected                   │
│ 2. Based on detected intent, inject relevant guidelines                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3. PreToolUse Hooks - Validation & Context Injection

**What they do**: Validate tool calls before execution and inject domain-specific context.

**Why they help**:
- **Prevention**: Block problematic actions before they happen
- **Guidance**: Inject relevant patterns when editing specific file types
- **Security**: Filter sensitive file access

**Execution Trace** (for Edit tool on a `.cs` file):
```
Claude attempts: Edit(file_path="/src/MyService.cs", ...)
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ todo-enforcement.cjs (matcher: Skill)                                        │
│                                                                              │
│ [Skipped - only triggers for Skill tool, not Edit]                          │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ scout-block.cjs (matcher: Bash|Glob|Grep|Read|Edit|Write)                   │
│                                                                              │
│ 1. Check if running inside /scout skill                                     │
│ 2. If yes and tool is Edit/Write → BLOCK (exit 2)                          │
│    "Scout skills are read-only. Use /cook for modifications."               │
│ 3. If no → Allow (exit 0)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ privacy-block.cjs (matcher: Bash|Glob|Grep|Read|Edit|Write)                 │
│                                                                              │
│ 1. Check file_path against sensitive patterns:                              │
│    - **/.env*, ~/.ssh/**, ~/.aws/**, **/secrets/**                          │
│ 2. If matches → BLOCK (exit 2)                                              │
│    "Access to sensitive file blocked: .env"                                  │
│ 3. If clean → Allow (exit 0)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ backend-csharp-context.cjs (matcher: Edit|Write|MultiEdit)                  │
│                                                                              │
│ 1. Check if file_path ends with .cs:                                        │
│    ✓ /src/MyService.cs matches                                               │
│                                                                              │
│ 2. Inject C# backend patterns:                                               │
│    "## C# Backend Context                                                    │
│                                                                              │
│    **Repository Pattern**: Use IPlatformQueryableRootRepository<T,K>        │
│    **Validation**: Use PlatformValidationResult fluent API                  │
│    **Side Effects**: Put in Entity Event Handlers, not command handlers     │
│    **CQRS**: Command + Result + Handler in ONE file                         │
│                                                                              │
│    Example:                                                                  │
│    ```csharp                                                                 │
│    protected override async Task<PlatformValidationResult<T>>               │
│        ValidateRequestAsync(...) => await v                                  │
│            .AndAsync(r => repo.GetByIdAsync(...))                            │
│    ```"                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
[Tool executes with injected context]
```

**Execution Trace** (for Skill tool - /cook without todos):
```
Claude attempts: Skill(skill="cook", args="add dark mode toggle")
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ skill-enforcement.cjs (matcher: Skill)                                       │
│                                                                              │
│ 1. Parse stdin: { tool_name: "Skill", tool_input: { skill: "cook" } }       │
│                                                                              │
│ 2. Check if skill is META_SKILLS (always allowed):                           │
│    META_SKILLS = ['help', 'memory', 'checkpoint', 'watzup', ...]            │
│    'cook' NOT in set → Continue validation                                   │
│                                                                              │
│ 3. Check CK_QUICK_MODE bypass:                                              │
│    Not set → Continue validation                                             │
│                                                                              │
│ 4. Check workflow + todo state:                                              │
│    workflowActive = true, todosExist = false                                │
│                                                                              │
│ 5. WORKFLOW + NO TODOS → BLOCK (exit 1)                                      │
│    Output:                                                                   │
│    "## Workflow Task Enforcement Block                                        │
│                                                                              │
│    Skill blocked: cook                                                       │
│    Call TaskCreate for EACH workflow step BEFORE executing any skill.        │
│                                                                              │
│    ### Why?                                                                  │
│    Task tracking ensures:                                                    │
│    - No steps are forgotten during implementation                            │
│    - Context preserved if session compacts                                   │
│    - Progress visible to you and the user                                   │
│                                                                              │
│    ### To proceed:                                                           │
│    **Option 1**: Use TodoWrite to create a task list, then retry /cook      │
│    **Option 2**: /cook quick: <args> (bypass, not recommended)"             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4. PostToolUse Hooks - Tracking & Formatting

**What they do**: Track workflow progress and auto-format code after edits.

**Why they help**:
- **Tracking**: Workflow progress is automatically monitored
- **Formatting**: Code is auto-formatted after edits

**Execution Trace** (after successful Skill execution):
```
Skill(/cook) completes successfully
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ todo-tracker.cjs (matcher: TodoWrite)                                        │
│                                                                              │
│ [Skipped - only triggers for TodoWrite tool]                                │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ post-edit-prettier.cjs (matcher: Edit|Write)                                │
│                                                                              │
│ [Skipped - only triggers for Edit/Write tools]                              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ workflow-step-tracker.cjs (matcher: Skill)                                  │
│                                                                              │
│ 1. Load workflow state from .workflow-state.json                            │
│ 2. Check if current skill matches expected step:                            │
│    state.sequence[state.currentStep] === 'cook' ✓                           │
│ 3. Mark step complete:                                                       │
│    state.currentStep++ → 3 (next: 'code-simplifier')                        │
│    state.completedSteps.push('cook')                                        │
│ 4. Save updated state                                                        │
│ 5. Output next step reminder:                                                │
│    "Step completed: /cook. Next: /code-simplifier (4/8)"                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5. PreCompact Hooks - State Preservation

**What they do**: Save session state before context compaction.

**Why they help**:
- **Memory**: Todo and workflow state survive context resets
- **Continuity**: Checkpoints enable session resumption

**Execution Trace** (on context compaction):
```
Context window fills up → Compaction triggered
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ write-compact-marker.cjs (matcher: manual|auto)                             │
│                                                                              │
│ 1. Write timestamp marker:                                                   │
│    → .claude/memory/.compact-marker                                          │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ save-context-memory.cjs (matcher: manual|auto)                              │
│                                                                              │
│ 1. Save current todo list to checkpoint:                                     │
│    → .claude/memory/checkpoints/<session_id>.json                           │
│ 2. Save workflow state                                                       │
│ 3. Save any accumulated context                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Complete Workflow Execution Traces

#### Use Case 1: Feature Implementation Workflow

```
USER: "Add a dark mode toggle to the settings page"

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: DETECTION & ROUTING
═══════════════════════════════════════════════════════════════════════════════

┌─ UserPromptSubmit ──────────────────────────────────────────────────────────┐
│ workflow-router.cjs:                                                         │
│   Input: "Add a dark mode toggle..."                                         │
│   Pattern match: "add" → triggers: ["\\b(implement|add|create)\\b"]         │
│   Detected: Feature Implementation (100% confidence)                         │
│   Workflow: scout → investigate → plan → plan-review → plan-validate → why-review → cook → code-simplifier → review-changes → code-review → changelog → test → docs-update → watzup│
│                                                                              │
│ Output:                                                                      │
│   "## Workflow Detected                                                      │
│    **Intent:** Feature Implementation                                        │
│    **Workflow:** /scout → /investigate → /plan → /plan-review → /plan-validate → /why-review → /cook → /code-simplifier → /review-changes → /code-review → /changelog → /test → /docs-update → /watzup"│
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: PLANNING (/plan)
═══════════════════════════════════════════════════════════════════════════════

┌─ PreToolUse (Skill: plan) ──────────────────────────────────────────────────┐
│ skill-enforcement.cjs:                                                       │
│   'plan' NOT in META_SKILLS → check todos                                    │
│   todosExist = true (created by TaskCreate) → ALLOWED                        │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude executes /plan skill, creates implementation plan]

┌─ PostToolUse ───────────────────────────────────────────────────────────────┐
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: plan (1/6)                                                 │
│   Next step: plan-review                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: IMPLEMENTATION (/cook)
═══════════════════════════════════════════════════════════════════════════════

┌─ PreToolUse (Skill: cook) ──────────────────────────────────────────────────┐
│ skill-enforcement.cjs:                                                       │
│   'cook' NOT in META_SKILLS → check todos                                    │
│   todosExist = true (tasks created earlier) → ALLOWED                        │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude creates/uses todos, then implements dark mode]

┌─ PreToolUse (Edit: settings.component.ts) ──────────────────────────────────┐
│ scout-block.cjs: Not in scout → ALLOWED                                      │
│ privacy-block.cjs: Not sensitive → ALLOWED                                  │
│ frontend-typescript-context.cjs:                                             │
│   File: *.ts → Inject Angular patterns:                                      │
│   "## TypeScript/Angular Context                                             │
│    - Extend AppBaseComponent                                                 │
│    - Use PlatformVmStore for state                                          │
│    - Use .pipe(this.untilDestroyed()) for subscriptions"                    │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude edits TypeScript files with injected context]

┌─ PostToolUse (Edit complete) ───────────────────────────────────────────────┐
│ post-edit-prettier.cjs:                                                      │
│   Run prettier on modified file                                              │
│   npx prettier --write settings.component.ts                                │
└─────────────────────────────────────────────────────────────────────────────┘

[Continues editing, CSS, tests...]

┌─ PostToolUse (Skill: cook complete) ────────────────────────────────────────┐
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: cook (3/6)                                                 │
│   Next step: code-simplifier                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 4: TESTING (/test)
═══════════════════════════════════════════════════════════════════════════════

[Similar flow: PreToolUse validation → execution → PostToolUse tracking]

┌─ PostToolUse (Skill: test complete) ────────────────────────────────────────┐
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: test (6/6)                                                 │
│   Workflow complete!                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 5: CODE REVIEW (/code-review)
═══════════════════════════════════════════════════════════════════════════════

[Similar flow...]

┌─ PostToolUse (Skill: code-review complete) ─────────────────────────────────┐
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: code-review (5/6)                                         │
│   Next step: test                                                            │
│   Output: "Step completed: /code-review. Next: /test (6/6)"                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 6: CONTEXT COMPACTION (if triggered)
═══════════════════════════════════════════════════════════════════════════════

┌─ PreCompact ────────────────────────────────────────────────────────────────┐
│ write-compact-marker.cjs:                                                    │
│   Mark compaction timestamp                                                  │
│                                                                              │
│ save-context-memory.cjs:                                                     │
│   Save todos, workflow state to checkpoint                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Use Case 2: Bug Fix Workflow

```
USER: "Fix the login error on mobile devices"

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: DETECTION & LESSON INJECTION
═══════════════════════════════════════════════════════════════════════════════

┌─ SessionStart (if new session) ─────────────────────────────────────────────┐
│ lessons-injector.cjs:                                                        │
│   Loaded lessons from docs/lessons.md                                    │
│   Injected as system-reminder:                                              │
│   "## Lessons Learned                                                        │
│    - Always verify BEM classes on every template element                    │
│    - Run search-before-code before writing any new code"                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ UserPromptSubmit ──────────────────────────────────────────────────────────┐
│ workflow-router.cjs:                                                         │
│   Pattern match: "fix", "error" → triggers: ["\\b(bug|fix|error)\\b"]       │
│   Detected: Bug Fix (100% confidence)                                        │
│   Workflow: scout → investigate → debug → plan → plan-review → plan-validate → why-review → fix → code-simplifier → review-changes → code-review → changelog → test → watzup│
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: INVESTIGATION (/scout, /investigate, /debug)
═══════════════════════════════════════════════════════════════════════════════

[Scout finds relevant files - requires tasks (created after workflow-start)]
[Investigate analyzes patterns - requires tasks]
[Debug identifies root cause - requires tasks]

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: FIX
═══════════════════════════════════════════════════════════════════════════════

[Claude uses injected lessons from lessons.md]
[Finds the bug: token validation missing on mobile user agent]

[Claude continues debugging and applies fix]
```

---

### Summary: How Hooks Help

| Hook Category | Key Benefits | Impact |
|---------------|--------------|--------|
| **SessionStart** | Environment bootstrap, pattern injection | Every session starts informed |
| **UserPromptSubmit** | Intent detection, workflow guidance | Consistent task execution |
| **PreToolUse** | Validation, context injection | Prevents mistakes, provides guidance |
| **PostToolUse** | Workflow tracking, formatting | Progress monitoring, code quality |
| **PreCompact** | State preservation | Todo/workflow state survives context resets |
| **Notification** | Alert delivery | Never miss important events |

**The Hook System Supports Learning**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   USER TEACHES            SESSION START           TOOL USE                  │
│   ┌───────────┐          ┌───────────┐          ┌───────────┐              │
│   │ /learn    │─────────▶│ Inject    │─────────▶│ Inject    │              │
│   │ command   │          │ Lessons   │          │ Lessons   │              │
│   └───────────┘          └───────────┘          └───────────┘              │
│        │                                                                    │
│        ▼                                                                    │
│   ┌───────────┐                                                             │
│   │ lessons.md│  Append-only log persists across sessions                  │
│   └───────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Learning System Technical Reference

### File Structure

```
docs/
├── lessons.md               # Append-only lesson log
.claude/
├── hooks/
│   ├── pattern-learner.cjs  # Detects /learn commands
│   ├── lessons-injector.cjs # Injects lessons into context
│   └── lib/
│       └── lessons-writer.cjs # appendLesson() utility
```

**Data Flow:**

```
User invokes /learn → pattern-learner.cjs → appendLesson() → lessons.md
                                                                    │
Session starts / tool use ─────────────────────────────────────────▶│
                                                                    │
lessons-injector.cjs reads lessons.md → injects as system-reminder  │
```

---

### Lesson Format

Lessons are stored as simple markdown lines in `docs/lessons.md`:

**Example:**

```markdown
## Behavioral Lessons
- [2026-02-24] INIT: Always verify BEM classes on every template element
- [2026-02-24] INIT: Check base class hierarchy -- extend AppBaseComponent
- [2026-02-24] INIT: Run search-before-code before writing any new code

## Process Improvements
(manually added during retrospectives)
```

---

## Related Documentation

- [Architecture](./architecture.md) - System architecture and planning protocol
- [Troubleshooting](./troubleshooting.md) - Investigation protocol and common issues
- [Backend Patterns](./backend-patterns.md) - CQRS, Repository, Entity patterns
- [Frontend Patterns](./frontend-patterns.md) - Component, Store, Form patterns
- [Decision Trees](./decision-trees.md) - Quick decision guides
- [Skills README](.claude/skills/README.md) - Skill development guide
- [Agent Skills Spec](.claude/skills/agent_skills_spec.md) - Agent specification
